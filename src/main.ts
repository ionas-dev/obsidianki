import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from './settings';
import { GENERATE_CARDS_FILE } from './plugin.constants';
import { assert } from 'console';
import { Root } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'

import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify';


export default class Obsidianki extends Plugin {
	settings: Settings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingTab(this.app, this));
		this.addFileMenuItemBy(GENERATE_CARDS_FILE.ID);
		this.addCommandBy(GENERATE_CARDS_FILE.ID);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	addFileMenuItemBy(id: string) {
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				switch (id) {
					case GENERATE_CARDS_FILE.ID:
						menu.addItem((item) => {
							item
								.setTitle(GENERATE_CARDS_FILE.NAME)
								.setIcon('package')
								.onClick((evt: MouseEvent | KeyboardEvent) => this.generateCardsFor(file as TFile));
						});
						break;
					default: assert(false, `Unknown command id: ${id}`);
				}
			}));
	}

	addCommandBy(id: string) {
		switch (id) {
			case GENERATE_CARDS_FILE.ID:
				this.addCommand({
					id: GENERATE_CARDS_FILE.ID,
					name: GENERATE_CARDS_FILE.NAME,
					editorCallback: (editor: Editor, view: MarkdownView) => this.generateCardsFor(view.file)
				});
				break;
			default: assert(false, `Unknown command id: ${id}`);
		}
	}

	async generateCardsFor(file: TFile | null) {
		if (file === null) {
			new Notice('No file is currently open');
			return;
		}
		new Notice('Generating Anki cards for file ' + file.path);
		// TODO: When file is opened in editor use vault.cachedRead to get the content
		const content = await this.app.vault.read(file)

		new Notice('Card test');

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const modifiedFileForAnki = await unified()
			.use(remarkParse)
			.use(parseCards)
			.use(remarkRehype)
			.use(rehypeStringify)
			.process(content);

		new Notice(modifiedFileForAnki.toString());
	}
}

function parseCards() {
	return function (tree: Root) {
		const header: { [depth: number]: number | undefined } = {};
		const maxDepth = 6;
		let cardStart: number | undefined = undefined;
		let lastLine = 0;
		/// header indices, card content start index, card content end index (exclusive)
		const cards: [number[], number, number][] = [];

		tree.children.forEach((node, index) => {
			lastLine = node.position?.start.line || lastLine;
			new Notice(node.type + " " + index);

			if (cardStart !== undefined && (node.type === 'heading' || (node.position?.start.line !== undefined && node.position?.start.line > lastLine + 2))) {
				const cardTitle: number[] = [];
				for (let i = 1; i < maxDepth; i++) {
					if (header[i] !== undefined) {
						cardTitle.push(header[i] as number);
					}
				}
				cards.push([cardTitle, cardStart, index]);
				cardStart = undefined;
				new Notice("card end " + index);
			}

			if (node.type === 'heading') {
				for (let i = node.depth; i < maxDepth; i++) {
					header[i] = undefined;
				}
				header[node.depth] = index;
			} else {
				if (cardStart === undefined) {
					cardStart = index;
					new Notice("card start " + cardStart);
				}
			}
		});


		cards.forEach(([cardTitle, cardStart, cardEnd]) => {
			cardTitle.forEach((headerIndex) => {
				new Notice("header " + headerIndex);
			});
			new Notice("card start " + cardStart + " card end " + cardEnd);
		});
	}
}