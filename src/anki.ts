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

        let lastErrors = new Set<string>();
        // TODO: Als erstes canAddNotesWithErrorDetail und dann teil direkt adden und bei anderem teil Fehler behandeln
        // Fehler können fehlendes Deck sein oder doppelte Notizen die vielleicht aber auch einfach geupdaten werden mïussen wenn das Deck stimmt
        let response = await this.add(notes);
        let errors = new Set(response.error);

        let i = 0;
        while (response.error !== null && this.errorsChanged(errors, lastErrors) && i++ < 3) {
            console.log('while');

            for (const error of errors) {
                if (this.isErrorOfType(error, ErrorType.DeckNotFound)) {
                    const deckName = this.getMissingDeckName(error);
                    await this.createDeck(deckName);
                } else if (this.isErrorOfType(error, ErrorType.DuplicateNote)) {
                    // TODO: Handle duplicate notes

                }
            }

            lastErrors = errors;
            response = await this.add(notes);
            errors = new Set(response.error);
        }
        if (response.error !== null) {
            throw new Error("Something went wrong updating Anki: " + response.error);
        }
    }

    private async createDeck(deckName: string): Promise<Response> {
        console.log('Creating deck:', deckName);
        const response = await (await this.post('createDeck', { deck: deckName })).json<Response>();
        this.log(response);
        return response;
    }

    private async add(notes: NoteJSON[]): Promise<NotesResponse> {
        console.log('Adding notes:', notes);
        const responseBroken = await (await this.post('addNotes', { notes: notes })).json<NotesResponseBroken>();
        const reponse = fixResponse(responseBroken);
        this.log(reponse);
        return reponse;
    }

    private async findNotesWithExactFront(query: string): Promise<Response> {
        return this.findNotes('front:' + query);
    }

    private async findNotes(query: string): Promise<NotesResponse> {
        console.log('Find notes by quer:', query);
        const response = await (await this.post('findNotes', { query: query })).json<NotesResponseBroken>();
        const responseFixed = fixResponse(response);
        this.log(responseFixed);
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

    private log(response: Response) {
        if (response.error !== null) {
            console.error('Anki error:', response.error);
        }
        if (response.result !== null) {
            console.log('Anki result:', response.result);
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

function fixResponse(notesResponseBroken: NotesResponseBroken): NotesResponse {
    return {
        result: notesResponseBroken.result,
        error: notesResponseBroken.error === null ? null : JSON.parse(notesResponseBroken.error.replace(/'/g, '"')),
    }
}