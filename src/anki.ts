import ky, { KyResponse } from "ky";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, convertToNotesJSON, NoteJSON } from "./card";
export class Anki {

    readonly ipAddress: string;

    constructor(ipAddress: string) {
        this.ipAddress = ipAddress;
    }

    public async update(cards: Card[]) {
        // TODO: Include deck name in the card
        const notes = convertToNotesJSON(cards, ['obsidianki', 'obsidianki2', 'obsidianki::subsidianki']);

        let response = await this.canAddNotes(notes);

        if (response.error !== null) {
            throw new Error("Something went wrong updating Anki: " + response.error);
        }

        const cannotAddAllNotes = () => response.result.reduce((previousValue, currentValue) => previousValue || currentValue.canAdd === false, false);
        let i = 0;
        while (cannotAddAllNotes() && i++ < 3) {
            const resultsWithIndex: [CanNotAddNotesResult, number][] = response.result
                .map((result, index) => [result, index] as [CannAddNotesResult, number])
                .filter(([result, _]) => result.canAdd === false)
                .map(([result, index]) => [result, index] as [CanNotAddNotesResult, number]);
            for (const [result, index] of resultsWithIndex) {
                if (this.isErrorOfType(result.error, ErrorType.DeckNotFound)) {
                    const deckName = this.getMissingDeckName(result.error);
                    await this.createDeck(deckName);
                } else if (this.isErrorOfType(result.error, ErrorType.DuplicateNote)) {
                    // TODO: Handle duplicate notes
                    console.log('Duplicate note:', notes[index]);
                }
            }
            response = await this.canAddNotes(notes);
        }

        if (response.error !== null || cannotAddAllNotes()) {
            throw new Error("Something went wrong updating Anki: " + response.error);
        }
    }

    private async canAddNotes(notes: NoteJSON[]): Promise<CanAddNotesResponse> {
        console.log('Can add notes request:', notes);
        const responseBroken = await (await this.post('canAddNotesWithErrorDetail', { notes: notes })).json<CanAddNotesResponseBroken>();
        const response = fixCanAddNotesReponse(responseBroken);
        this.log('Can add notes', response);
        return response;
    }

    private async createDeck(deckName: string): Promise<Response> {
        console.log('Create deck request:', deckName);
        const response = await (await this.post('createDeck', { deck: deckName })).json<Response>();
        this.log('Create deck', response);
        return response;
    }

    private async add(notes: NoteJSON[]): Promise<NotesResponse> {
        console.log('Add notes request:', notes);
        const responseBroken = await (await this.post('addNotes', { notes: notes })).json<NotesResponseBroken>();
        const reponse = fixNotesResponse(responseBroken);
        this.log('Add notes', reponse);
        return reponse;
    }

    private async findNotesWithExactFront(query: string): Promise<Response> {
        return this.findNotes('front:' + query);
    }

    private async findNotes(query: string): Promise<NotesResponse> {
        console.log('Find notes request:', query);
        const response = await (await this.post('findNotes', { query: query })).json<NotesResponseBroken>();
        const responseFixed = fixNotesResponse(response);
        this.log('Find notes', responseFixed);
        return responseFixed;
    }

    private async post(action: string, params: unknown): Promise<KyResponse> {
        try {
            return await ky.post(this.ipAddress, {
                timeout: 3000,
                json: {
                    action: action,
                    version: 6,
                    params: params
                }
            });
        } catch (error) {
            if (this.isErrorOfType(error.message, ErrorType.FailedToFetch)) {
                throw new FetchError();
            } else {
                throw error;
            }
        }
    }

    private log(action: string, response: Response) {
        if (response.error !== null) {
            console.error(action + " error :", response.error);
        }
        if (response.result !== null) {
            console.log(action + " result :", response.result);
        }
    }

    private isErrorOfType(error: string, errorType: ErrorType): boolean {
        return error.startsWith(errorType);
    }

    private getMissingDeckName(error: string): string {
        return error.replace('deck was not found: ', '');
    }

    private errorsChanged(errors: Set<string>, lastErrors: Set<string>): boolean {
        const sizeChanged = errors.size !== lastErrors.size;
        if (sizeChanged) {
            return true;
        }

        for (const error of errors) {
            if (!lastErrors.has(error)) {
                return true;
            }
        }

        return false;
    }
}

enum ErrorType {
    DeckNotFound = 'deck was not found: ',
    DuplicateNote = 'cannot create note because it is a duplicate',
    FailedToFetch = 'Failed to fetch'
}

export class FetchError extends Error {
    constructor() {
        super("Anki is probably not running.");
    }
}

interface Response {
    result: null | unknown
    error: null | unknown
}

interface NotesResponseBroken extends Response {
    result: null | number[],
    error: null | string
}
interface NotesResponse extends Response {
    result: null | number[],
    error: null | string[]
}

type CanNotAddNotesResult = {
    canAdd: false,
    error: string
}

type CannAddNotesResult = CanNotAddNotesResult | {
    canAdd: true,
}

interface CanAddNotesResponseBroken extends Response {
    result: CannAddNotesResult[],
    error: null | string
}

interface CanAddNotesResponse extends Response {
    result: CannAddNotesResult[],
    error: null | string[]
}

function fixNotesResponse(notesResponseBroken: NotesResponseBroken): NotesResponse {
    return {
        result: notesResponseBroken.result,
        error: notesResponseBroken.error === null ? null : JSON.parse(notesResponseBroken.error.replace(/'/g, '"')),
    }
}

function fixCanAddNotesReponse(canAddNotesResponseBroken: CanAddNotesResponseBroken): CanAddNotesResponse {
    return {
        result: canAddNotesResponseBroken.result,
        error: canAddNotesResponseBroken.error === null ? null : JSON.parse(canAddNotesResponseBroken.error.replace(/'/g, '"')),
    }
}