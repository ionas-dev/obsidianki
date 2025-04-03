import ky from "ky";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Card, convertToNotesJSON, NoteJSON } from "./card";

// TODO: Awaits durchgehen, teilweise wird unnötig gewartet
export class Anki {

    readonly ipAddress: string;

    constructor(ipAddress: string) {
        this.ipAddress = ipAddress;
    }

    public async update(cards: Card[]) {
        // TODO: Include deck name in the card
        const notes = convertToNotesJSON(cards, ['obsidianki', 'obsidianki2', 'obsidianki::subsidianki']);

        let lastError: string[] = [];
        let response = await this.add(notes);

        let i = 0;
        while (response.error !== null && lastError !== response.error && i++ < 3) {
            const uniqueError = [...new Set(response.error)];
            for (const error of uniqueError) {
                if (deckWasNotFound(error)) {
                    const deckName = missingDeck(error);
                    await this.createDeck(deckName);
                }
            }

            lastError = response.error;
            response = await this.add(notes);
        }
    }

    private async createDeck(deckName: string): Promise<Response> {
        console.log('Creating deck', deckName);
        const response = await ky.post(this.ipAddress, {
            json: {
                action: 'createDeck',
                version: 6,
                params: {
                    deck: deckName
                }
            }
        }).json<Response>();

        this.log(response);
        return response;
    }

    private async add(notes: NoteJSON[]): Promise<AddNotesResponse> {
        console.log('Adding notes', notes);

        const responseBroken = await ky.post(this.ipAddress, {
            json: {
                action: 'addNotes',
                version: 6,
                params: {
                    notes: notes
                }
            }
        }).json<AddNotesResponseBroken>();

        const reponse = fixResponse(responseBroken);
        this.log(reponse);

        return reponse;
    }

    private log(response: Response) {
        if (response.error !== null) {
            console.error('Anki error:', response.error);
        }
        if (response.result !== null) {
            console.log('Anki result:', response.result);
        }
    }
}

function deckWasNotFound(error: string): boolean {
    return error.startsWith('deck was not found: ');
}

function missingDeck(error: string): string {
    return error.replace('deck was not found: ', '');
}

interface Response {
    result: null | unknown
    error: null | unknown
}

interface AddNotesResponseBroken extends Response {
    result: null | number[],
    error: null | string
}

interface AddNotesResponse extends Response {
    result: null | number[],
    error: null | string[]
}

function fixResponse(addNotesResponseBroken: AddNotesResponseBroken): AddNotesResponse {
    return {
        result: addNotesResponseBroken.result,
        error: addNotesResponseBroken.error === null ? null : JSON.parse(addNotesResponseBroken.error.replace(/'/g, '"')),
    }
}