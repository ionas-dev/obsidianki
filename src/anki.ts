import ky, { KyResponse } from "ky";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CardWithDeck, convertToNoteJSON, convertToNotesJSON, NoteJSON } from "./card";
export class Anki {

    readonly ipAddress: string;

    constructor(ipAddress: string) {
        this.ipAddress = ipAddress;
    }

    public async update(cards: CardWithDeck[]): Promise<number[]> {
        console.log('Update Anki with Cards:', cards);

        const existingCards = cards.filter(card => card.id !== undefined);
        const existingNotes = [];
        for (const card of existingCards) {
            existingNotes.push(await this.updateRequest(convertToNoteJSON(card)));
        }

        let addedNotes: number[] = [];
        const newCards = cards.filter(card => card.id === undefined);
        if (newCards.length > 0) {
            addedNotes = await this.add(newCards);
        }

        const noteIDs: number[] = [];
        for (let i = 0, j = 0; i < existingNotes.length || j < addedNotes.length;) {
            if (cards[i + j].id !== undefined) {
                noteIDs.push(cards[i + j].id as number);
                i += 1;
            } else {
                noteIDs.push(addedNotes[j]);
                j += 1;
            }
        }

        console.log('Update Anki Result:', noteIDs);
        return noteIDs;
    }

    private async add(cards: CardWithDeck[]): Promise<number[]> {
        const notes = convertToNotesJSON(cards);
        let results = await this.canAddNotesRequest(notes);

        const cannotAddAllNotes = () => results.reduce((previousValue, currentValue) => previousValue || currentValue.canAdd === false, false);
        let i = 0;
        while (cannotAddAllNotes() && i++ < 3) {
            const notHandledErrors = (await Promise.all(results
                .map((result, index) => [result, index] as [CanAddNotesResult, number])
                .filter(([result,]) => result.canAdd === false)
                .map(([result, index]) => [(result as CanNotAddNotesResult).error, notes[index]] as [string, NoteJSON])
                .map(async ([error, note]) => await this.handleError(error, note))))
                .filter((result) => (result) !== undefined);

            if (notHandledErrors.length > 0) {
                throw new Error('Some errors could not be handled: ' + notHandledErrors);
            }

            results = await this.canAddNotesRequest(notes);
        }

        // TODO: In Zukunft teilweise adden
        if (cannotAddAllNotes()) {
            console.error('Cannot add all notes:', results);
            throw new Error('Cannot add all notes:' + results.filter(result => !result.canAdd).map((result) => result.error));
        }

        return this.addRequest(notes);
    }

    // TODO : Doppelte Fehler bahndlung unnötig
    private async handleError(error: string, note: NoteJSON): Promise<string | undefined> {
        if (this.isErrorOfType(error, ErrorType.DeckNotFound)) {
            const deckName = this.getMissingDeckName(error);
            await this.createDeckRequest(deckName);
        } else if (this.isErrorOfType(error, ErrorType.DuplicateNote)) {
            // TODO: Handle duplicate notes
            console.log('Duplicate note:', note);
        }
        return undefined;
    }

    private async canAddNotesRequest(notes: NoteJSON[]): Promise<CanAddNotesResult[]> {
        console.log('Can add notes request:', notes);
        const responseBroken = await (await this.post('canAddNotesWithErrorDetail', { notes: notes })).json<CanAddNotesResponseBroken>();
        const response = fixCanAddNotesReponse(responseBroken);
        this.log('Can add notes', response);

        if (response.error !== null) {
            throw new Error("Something went wrong checking if notes can be added: " + response.error);
        }

        return response.result;
    }

    private async createDeckRequest(deckName: string): Promise<Response> {
        console.log('Create deck request:', deckName);
        const response = await (await this.post('createDeck', { deck: deckName })).json<Response>();
        this.log('Create deck', response);
        return response;
    }

    private async updateRequest(note: NoteJSON): Promise<NoteResponse> {
        console.log('Update note model request:', note);
        const response = await (await this.post('updateNoteModel', { note: note })).json<NoteResponse>();
        this.log('Update notes', response);
        return response;
    }

    private async addRequest(notes: NoteJSON[]): Promise<number[]> {
        console.log('Add notes request:', notes);
        const responseBroken = await (await this.post('addNotes', { notes: notes })).json<NotesResponseBroken>();
        const response = fixNotesResponse(responseBroken);
        this.log('Add notes', response);
        if (response.error !== null || response.result === null) {
            throw new Error("Something went wrong adding notes: " + response.error);
        }
        return response.result as number[];
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

const enum ErrorType {
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

interface NoteResponse extends Response {
    result: null | string
    error: null | string
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

type CanAddNotesResult = CanNotAddNotesResult | {
    canAdd: true,
}

interface CanAddNotesResponseBroken extends Response {
    result: CanAddNotesResult[],
    error: null | string
}

interface CanAddNotesResponse extends Response {
    result: CanAddNotesResult[],
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