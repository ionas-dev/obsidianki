// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice } from 'obsidian';

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified'

import { Root, RootContent } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { VFile } from 'vfile';
import { Card } from './card';


export class AnkiParser {
    /** Stores the cards as an array of tuples, where each tuple contains the title and content of a card. */
    private cards: Card[] = [];
    private threshold: number;

    /**
     * Constructs an AnkiParser instance.
     * @param threshold The maximum number of lines that can be skipped between two headers before the card is considered finished.
     */
    constructor(threshold: number) {
        this.threshold = threshold;
    }

    /**
     * Creates Anki cards from the given markdown string.
     * @param markdown Markdown string to parse.
     * @returns The cards as an array of tuples, where each tuple contains the title and content of a card.
     */
    async createAnkiCardsFor(markdown: string): Promise<Card[]> {
        this.cards = [];

        const file = await unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(this.rehypeAnkify, markdown.split('\n').length, this.threshold)
            .use(rehypeStringify)
            .process(markdown);

        this.cards = file.data.cards as Card[];

        return this.cards;
    }

    /**
     * Returns the stored cards.
     * @returns The cards as an array of tuples, where each tuple contains the title and content of a card.
     */
    getCards(): Card[] {
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
            const cards: Card[] = [];
            const headerIndices: (number | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];
            let cardStartIndex: number | undefined = undefined;

            let lineOfLastNode = 0;
            let cardHasTitle = false;
            const cardHasStarted = () => cardStartIndex !== undefined;

            tree.children.forEach((node, index) => {
                const reachedEndOfFile = () => node.position?.start.line !== undefined && node.position?.start.line >= lineCount;
                const skippedLines = () => node.position?.start.line !== undefined && node.position?.start.line - lineOfLastNode > threshold;

                const cardHasEnded = () => cardHasStarted()
                    && (nodeIsHTMLHeader(node)
                        || skippedLines()
                        || reachedEndOfFile());

                if (cardHasEnded()) {
                    const cardTitleTree = headerIndices
                        .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                        .filter(Boolean) as RootContent[];
                    const cardEndIndex = reachedEndOfFile() ? index + 1 : index - 1;
                    // Start index + 1, because rehype adds newlines between header and content
                    const cardContentTree: RootContent[] = tree.children.slice((cardStartIndex as unknown as number) + 1, cardEndIndex);
                    cards.push([toHtml(cardTitleTree), toHtml(cardContentTree)]);

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

                lineOfLastNode = node.position?.start.line || lineOfLastNode;
            });

            if (cardHasStarted()) {
                console.log("end", cardStartIndex, tree.children.length - 1);
                const cardTitleTree = headerIndices
                    .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                    .filter(Boolean) as RootContent[];
                // Start index + 1, because rehype adds newlines between header and content
                const cardContentTree: RootContent[] = tree.children.slice((cardStartIndex as unknown as number) + 1, tree.children.length);
                cards.push([toHtml(cardTitleTree), toHtml(cardContentTree)]);

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