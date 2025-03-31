// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice } from 'obsidian';

import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify';
import { unified } from 'unified'

import { Root, RootContent } from 'hast'
import { toHtml } from 'hast-util-to-html'
import { VFile } from 'vfile';


export class AnkiParser {
    /** Stores the cards as an array of tuples, where each tuple contains the title and content of a card. */
    private cards: [string, string][] = [];
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
    async createAnkiCardsFor(markdown: string): Promise<[string, string][]> {
        this.cards = [];

        const file = await unified()
            .use(remarkParse)
            .use(remarkRehype)
            .use(this.rehypeAnkify)
            .use(rehypeStringify)
            .process(markdown);

        this.cards = file.data.cards as [string, string][];

        return this.cards;
    }

    /**
     * Returns the stored cards.
     * @returns The cards as an array of tuples, where each tuple contains the title and content of a card.
     */
    getCards(): [string, string][] {
        return this.cards;
    }

    /**
     * Rehype plugin to process the hypertext AST and generate Anki cards.
     * @returns A function that processes the hast and generates Anki cards.
     */
    private rehypeAnkify() {
        return (tree: Root, file: VFile) => {
            const cards: [string, string][] = [];
            const headerIndices: (number | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];
            let cardStartIndex: number | undefined = undefined;
            let lineOfLastNode = 0;
            let cardHasTitle = false;

            tree.children.forEach((node, index) => {
                const cardHasStarted = () => cardStartIndex !== undefined;
                const cardHasEnded = () => cardHasStarted()
                    && (isHTMLHeader(node) || skippedLines(node, lineOfLastNode, this.threshold));

                if (cardHasEnded()) {
                    const cardTitleTree = headerIndices
                        .map(i => (i !== undefined && i < tree.children.length ? tree.children[i] : null))
                        .filter(Boolean) as RootContent[];
                    const cardContentTree: RootContent[] = tree.children.slice(cardStartIndex, index);
                    cards.push([toHtml(cardTitleTree), toHtml(cardContentTree)]);

                    cardStartIndex = undefined;
                    cardHasTitle = false;
                }

                if (isHTMLHeader(node)) {
                    const nodeDepth = parseInt((node as unknown as Element).tagName[1]);
                    headerIndices.fill(undefined, nodeDepth);
                    headerIndices[nodeDepth] = index;

                    cardHasTitle = true;
                } else if (!cardHasStarted() && cardHasTitle) {
                    cardStartIndex = index;
                }

                lineOfLastNode = node.position?.start.line || lineOfLastNode;
            });

            file.data.cards = cards;
        }
    }
}

function isHTMLHeader(node: RootContent): boolean {
    return (node.type === 'element' && /h[1-6]/.test(node.tagName));
}

function skippedLines(node: RootContent, lineOfLastNode: number, threshold: number): boolean {
    return node.position?.start.line !== undefined && node.position?.start.line - lineOfLastNode > threshold;
}