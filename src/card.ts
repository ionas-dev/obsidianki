
export type ParsedCard = {
    front: string,
    back: string,
    firstLine: number,
    lastLine: number,
    id?: number
};

/**
 * Consists of the front, the back and the name of the deck.
 */
export type CardWithDeck = {
    front: string,
    back: string,
    deckName: string,
    id?: number
};

export type NoteJSON = {
    deckName: string,
    modelName: string,
    id?: number,
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

export function convertToNotesJSON(cards: CardWithDeck[]): NoteJSON[] {
    return cards.map((card) => convertToNoteJSON(card));
}

export function convertToNoteJSON(card: CardWithDeck): NoteJSON {
    return {
        deckName: card.deckName,
        modelName: 'Basic',
        id: card.id,
        fields: {
            Front: card.front,
            Back: card.back
        },
        options: {
            allowDuplicate: false,
            duplicateScope: 'deck',
            duplicateScopeOptions: {
                deckName: card.deckName,
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