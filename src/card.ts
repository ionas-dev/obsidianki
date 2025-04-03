import { assert } from "console";

export type Card = [string, string];

export type NoteJSON = {
    deckName: string,
    modelName: string,
    fields: {
        Front: string;
        Back: string;
    },
    options: {
        allowDuplicate: boolean,
        duplicateScope: string,
        duplicateScopeOptions: {
            deckName: string;
            checkChildren: boolean;
            checkAllModels: boolean;
        }
    },
    tags: string[],
    audio: {
        url: string,
        filename: string,
        skipHash: boolean,
        fields: string[]
    }[],
    video: {
        url: string,
        filename: string,
        skipHash: boolean,
        fields: string[]
    }[],
    picture: {
        url: string,
        filename: string,
        skipHash: boolean,
        fields: string[]
    }[]
}

export function convertToNotesJSON(cards: Card[], deckNames: string[]): NoteJSON[] {
    assert(cards.length === deckNames.length, 'Cards and deck names must have the same length');
    return cards.map((card, index) => convertToNoteJSON(card, deckNames[index]));
}

export function convertToNoteJSON(card: Card, deckName: string): NoteJSON {
    return {
        deckName: deckName,
        modelName: 'Basic',
        fields: {
            Front: card[0],
            Back: card[1]
        },
        options: {
            allowDuplicate: false,
            duplicateScope: 'deck',
            duplicateScopeOptions: {
                deckName: deckName,
                checkChildren: false,
                checkAllModels: false
            }
        },
        tags: [],
        audio: [],
        video: [],
        picture: []
    };
}