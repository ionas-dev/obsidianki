// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice } from 'obsidian';

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified'

import { Root, RootContent, Element, Text } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { VFile } from 'vfile';
import { ParsedCard } from './card';



export class AnkiParser {
    /** Stores the cards as an array of tuples, where each tuple contains the title and content of a card. */
    private cards: ParsedCard[] = [];
    private threshold: number;

    /**
     * Constructs an AnkiParser instance.
     * @param threshold The maximum number of lines that can be skipped between two headers before the card is considered finished.
     */
    constructor(threshold: number) {
        this.threshold = threshold;
    }

    /**
     * Parses Anki cards from the given markdown string.
     * @param markdown Markdown string to parse.
     * @returns The cards as an array of tuples, where each tuple contains the title and content of a card.
     */
    async parseAnkiCardsFor(markdown: string): Promise<ParsedCard[]> {
        this.cards = [];

        const file = await unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(this.rehypeAnkify, markdown.split('\n').length, this.threshold)
            .use(rehypeStringify)
            .process(markdown);

        this.cards = file.data.cards as ParsedCard[];

        return this.cards;
    }

    /**
     * Returns the stored cards.
     * @returns The cards as an array of tuples, where each tuple contains the title and content of a card.
     */
    getCards(): ParsedCard[] {
        return this.cards;
    }

    /**
     * Rehype plugin to process the hypertext AST and split the nodes into cards consisting of title and content.
     * The cards are saved within the file to use within other plugins. The file gets returned by the unified processer.
     * @returns A function that processes the hast and generates Anki cards.
     * @param lineCount The number of lines in the markdown file.
     */
    private rehypeAnkify(lineCount: number, threshold: number) {
        return (tree: Root, file: VFile) => {
            // Cards also contains two numbers, which are the line of the start and end of the card
            const cards: ParsedCard[] = [];
            const headerIndices: (number | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];
            let cardStartIndex: number | undefined = undefined;

            let lineOfLastNode = 0;
            let cardHasTitle = false;
            const cardHasStarted = () => cardStartIndex !== undefined;

            tree.children.forEach((node, index) => {
                if (node.position === undefined) {
                    return;
                }

                const reachedEndOfFile = () => node.position?.end.line !== undefined && node.position?.end.line >= lineCount;
                const skippedLines = () => node.position?.end.line !== undefined && node.position?.end.line - lineOfLastNode > threshold;

                const cardHasEnded = () => cardHasStarted()
                    && (nodeIsHTMLHeader(node)
                        || skippedLines()
                        || reachedEndOfFile());

                if (nodeIsAnkiID(node)) {
                    const cardTitleTree = headerIndices
                        .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                        .filter(Boolean) as RootContent[];
                    const ankiID = getAnkiID(node);
                    const paragraphContainsAnkiID = ankiID !== undefined && ((node as unknown as Element).children.last() as unknown as Text).value.split('\n').length > 1;


                    // TODO: Ist nur richtig wenn anki id teil des letzten paragraphen ist
                    // Wenn die id ein eigener paragraph ist, kann der idnex anders gelegt sein
                    const cardEndIndex = paragraphContainsAnkiID ? index + 1 : index;
                    cardStartIndex = cardStartIndex !== undefined ? cardStartIndex : index;
                    const cardContentTree: RootContent[] = tree.children.slice(cardStartIndex, cardEndIndex);
                    let endLine = (cardContentTree.last() as RootContent).position?.end.line;
                    endLine = endLine !== undefined && paragraphContainsAnkiID ? endLine - 1 : endLine;
                    if (paragraphContainsAnkiID) {
                        const lines = ((cardContentTree.last() as unknown as Element).children.last() as unknown as Text).value.split('\n');
                        lines.pop();
                        ((cardContentTree.last() as unknown as Element).children.last() as unknown as Text).value = lines.join('\n');
                    }

                    cards.push({
                        front: toHtml(cardTitleTree),
                        back: toHtml(cardContentTree),
                        firstLine: (cardTitleTree.last() as RootContent).position?.start.line ?? 0,
                        lastLine: endLine ?? 0,
                        id: ankiID
                    });

                    cardStartIndex = undefined;
                    cardHasTitle = false;
                } else if (cardHasEnded()) {
                    const cardTitleTree = headerIndices
                        .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                        .filter(Boolean) as RootContent[];
                    const ankiID = getAnkiID(node);
                    const paragraphContainsAnkiID = ankiID !== undefined && ((node as unknown as Element).children[0] as unknown as Text).value.split('\n').length > 1;


                    // TODO: Ist nur richtig wenn anki id teil des letzten paragraphen ist
                    // Wenn die id ein eigener paragraph ist, kann der idnex anders gelegt sein
                    const cardEndIndex = (reachedEndOfFile() && !nodeIsHTMLHeader(node)) || paragraphContainsAnkiID ? index + 1 : index;
                    // Start index + 1, because rehype adds newlines between header and content
                    const cardContentTree: RootContent[] = tree.children.slice((cardStartIndex as unknown as number), cardEndIndex);
                    // let endLine = (cardContentTree.last() as RootContent).position?.end.line;
                    // endLine = endLine !== undefined && paragraphContainsAnkiID ? endLine - 1 : endLine;
                    if (paragraphContainsAnkiID) {
                        const lines = ((cardContentTree.last() as unknown as Element).children[0] as unknown as Text).value.split('\n');
                        lines.pop();
                        ((cardContentTree.last() as unknown as Element).children[0] as unknown as Text).value = lines.join('\n');
                    }

                    cards.push({
                        front: toHtml(cardTitleTree),
                        back: toHtml(cardContentTree),
                        firstLine: (cardTitleTree.last() as RootContent).position?.start.line ?? 0,
                        lastLine: lineOfLastNode,
                        id: ankiID
                    });

                    cardStartIndex = undefined;
                    cardHasTitle = false;
                }

                if (nodeIsHTMLHeader(node)) {
                    const nodeDepth = parseInt((node as unknown as Element).tagName[1]);
                    headerIndices.fill(undefined, nodeDepth);
                    headerIndices[nodeDepth] = index;

                    cardHasTitle = true;
                } else if (!cardHasStarted() && cardHasTitle) {
                    cardStartIndex = index;
                }

                lineOfLastNode = node.position?.end.line || lineOfLastNode;
            });

            if (cardHasStarted()) {
                const cardTitleTree = headerIndices
                    .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                    .filter(Boolean) as RootContent[];
                // Start index + 1, because rehype adds newlines between header and content 
                const cardContentTree: RootContent[] = tree.children.slice((cardStartIndex as unknown as number), tree.children.length);
                cards.push({
                    front: toHtml(cardTitleTree),
                    back: toHtml(cardContentTree),
                    firstLine: (cardTitleTree.last() as RootContent).position?.start.line ?? 0,
                    lastLine: (cardContentTree.last() as RootContent).position?.end.line ?? 0
                });

                cardStartIndex = undefined;
                cardHasTitle = false;
            }

            file.data.cards = cards;
        }
    }
}

function nodeIsHTMLHeader(node: RootContent): boolean {
    return (node.type === 'element' && /h[1-6]/.test(node.tagName));
}

function getAnkiID(node: RootContent): number | undefined {
    if (node.type !== 'element' || node.tagName !== 'p') {
        return undefined;
    }

    const child = node.children.last();
    if (child === undefined || child.type !== 'text') {
        return undefined;
    }
    const lastLine = child.value.split('\n').last();
    if (lastLine !== undefined && /^\^\d+$/.test(lastLine)) {
        return parseInt(lastLine.substring(1));
    }
}

function nodeIsAnkiID(node: RootContent): boolean {
    return getAnkiID(node) !== undefined;
}