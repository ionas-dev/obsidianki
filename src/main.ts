import { Editor, MarkdownView, Plugin, TAbstractFile } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from './settings';
import { GENERATE_CARDS_FILE } from './plugin.constants';
import { assert } from 'console';

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
								.onClick((evt: MouseEvent | KeyboardEvent) => this.generateCardsFor(file));
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

	generateCardsFor(file: TAbstractFile | null) {

	}
}

