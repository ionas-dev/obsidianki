
import { expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { ParsedCard } from '../src/card';
import { AnkiParser } from '../src/parsing';

const CARDS: ParsedCard[] = [
    {
        "front": "<h1>Oberkarte test</h1>",
        "back": "<p>Inhalt\nInhalt\nInhalt</p>\n<p>Inhalt</p>\n",
        "firstLine": 1,
        "lastLine": 6
    },
    {
        "front": "<h1>Oberkarte test</h1><h2>Unterkarte test</h2>",
        "back": "<p>Inhalt</p>\n",
        "firstLine": 11,
        "lastLine": 13
    },
    {
        "front": "<h1>Alte Karte</h1>",
        "back": "<p>Inhalt</p>",
        "firstLine": 16,
        "lastLine": 17,
        "id": 1744293265237
    },
    {
        "front": "<h1>Neue Karte</h1>",
        "back": "<p><strong>Fetter Inhalt</strong></p>\n",
        "firstLine": 21,
        "lastLine": 22
    },
    {
        "front": "<h1>Letzte Karte</h1>",
        "back": "<p>Inhalt</p>",
        "firstLine": 25,
        "lastLine": 26
    }
]

test('parse file', async () => {
    const ankiParser = new AnkiParser(2);
    const markdown = readFileSync('tests/res/testfile.md', 'utf-8');
    console.log(markdown);
    const cards = await ankiParser.parseAnkiCardsFor(markdown);
    cards.forEach((card, index) => expect(card).toEqual(CARDS[index]))
});