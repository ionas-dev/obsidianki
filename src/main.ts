import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from './settings';
import { GENERATE_CARDS_FILE } from './plugin.constants';
import { assert } from 'console';
import { AnkiParser } from './parsing';
import { Anki, FetchError } from './anki';


export default class Obsidianki extends Plugin {
	settings: Settings;
	ankiParser: AnkiParser;
	anki: Anki;

	async onload() {
		console.log('loading the plugin');
		await this.loadSettings();
		// Threshold should be configurable in the settings
		this.ankiParser = new AnkiParser(2);
		this.anki = new Anki('http://127.0.0.1:8765');
		this.addSettingTab(new SettingTab(this.app, this));
		this.addFileMenuItemBy(GENERATE_CARDS_FILE.ID);
		this.addCommandBy(GENERATE_CARDS_FILE.ID);
	}

	onunload() { }

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
		const content = await this.app.vault.read(file);
		const cards = await this.ankiParser.parseAnkiCardsFor(content);
		console.log('Parsed cards:', cards);

		try {
			const deckName = file.path.replace(/\//g, '::').replace(`::${file.name}`, '');
			const ankiIDs = await this.anki.update(cards.map(card => { return { front: card.front, back: card.back, deckName: deckName, id: card.id } }));

			const lines = content.split('\n');

			let addedLines = 0;
			cards.forEach((card, index) => {
				if (card.id === undefined) {
					lines.splice(card.lastLine + addedLines++, 0, `^${ankiIDs[index]}`);
				}
			});

			await this.app.vault.modify(file, lines.join('\n'));

			new Notice(`Updated Anki with ${ankiIDs.length} cards`);

		} catch (error) {
			if (error instanceof FetchError) {
				new Notice('Anki is probably not running. Please start Anki and try again.');
			}
			console.error(error);
		}
	}


}