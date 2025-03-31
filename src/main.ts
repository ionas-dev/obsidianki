import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from './settings';
import { GENERATE_CARDS_FILE } from './plugin.constants';
import { assert } from 'console';
import { AnkiParser } from './parsing';


export default class Obsidianki extends Plugin {
	settings: Settings;
	ankiParser: AnkiParser;

	async onload() {
		await this.loadSettings();
		// Threshold should be configurable in the settings
		this.ankiParser = new AnkiParser(2);
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
		const cards = await this.ankiParser.createAnkiCardsFor(content);

		new Notice(cards.length + ' Anki cards generated');
	}
}