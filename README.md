# Obsidianki
[![GitHub issues](https://img.shields.io/github/issues/ionas-dev/obsidianki)](https://github.com/ionas-dev/obsidianki/issues)
[![GitHub stars](https://img.shields.io/github/stars/ionas-dev/obsidianki)](https://github.com/ionas-dev/obsidianki/stargazers)
[![License](https://img.shields.io/badge/License-0BSD-blue)](LICENSE)


Obsidianki is an Obsidian plugin to manage Anki flashcards, designed with one core principle:  **Write and structure your knowledge in Obsidian naturally** 

Yout Obsidian notes are the _single source of truth_ and Obsidianki acts as a tool to generate flashcards from that information, aiding memorization without dictating how you structure your primary notes.

## Features

* **Header-Based Card Creation:** Use Markdown headers (`#`, `##`, `###`, etc.) to define the front of your Anki cards. Content following headers becomes the back.
* **Folder-Based Deck Mapping:** The folder structure in your Obsidian vault determines the target Anki deck (e.g., `/Subject/Topic/Note.md` creates cards in the `Subject::Topic` deck).
* **Multiple Cards per Note:** Generate multiple distinct cards from a single note (see examples).
* **Obsidian as Single Source of Truth:**
	* **Add Cards to Anki:** Processes the active note, generates cards, and adds them to Anki.
	* **Update Cards in Anki:** Processes the active note, recognizes changed card structures, and updates them in Anki.
	* **Delete Cards in Anki:** Detects removed card structures in the active Obsidian note and handles deletion in Anki.

## Requirements

* **Obsidian:** Latest version recommended.
* **Anki:** The desktop application must be running.
* **AnkiConnect:** [AnkiConnect Add-on]([https://git.sr.ht/~foosoft/anki-connect]) must be installed and configured in Anki. Please ensure AnkiConnect is configured to allow connections from Obsidian (check its settings regarding web CORS policies if you encounter issues, often by adding `"http://localhost"` or `"app://obsidian.md"` to the `webCorsOriginList`).

## Installation

### From Obsidian Community Plugins (Recommended)

1.  Open Obsidian's **Settings**.
2.  Go to **Community Plugins**.
3.  Ensure **Restricted Mode** is **off**.
4.  Click **Browse** community plugins.
5.  Search for `Obsidianki`.
6.  Click **Install**.
7.  Once installed, click **Enable**.

## How to Use

The plugin scans your notes for specific header structures to define Anki cards.

* **Decks:** The folder path containing the note translates directly into the Anki deck, using `::` as a sub-deck separator. For example, a note at `MyVault/Science/Physics/Kinetics.md` will generate cards in the `Science::Physics` deck in Anki.
* **Card Front:** The hierarchy of Markdown headers defines the card's front.
* **Card Back:** The content directly following a header (up until the next header of the same or higher level, or the end of the note) becomes the card's back.


### Example: Multiple Sub-Headers (Multiple Cards)

Consider this structure in a note named Programming/Python/Basics.md:
```Markdown
# Python Basics

## Data Types
Covers integers, floats, strings, booleans, lists, tuples, dictionaries.
- **int:** Whole numbers (e.g., `10`)
- **str:** Sequences of characters (e.g., `"Hello"`)
- **list:** Ordered, mutable sequences (e.g., `[1, 2, 3]`)

## Control Flow
How programs make decisions and repeat actions.
- **if/elif/else:** Conditional execution.
- **for loop:** Iterating over sequences.
- **while loop:** Repeating actions based on a condition.
```
Resulting Anki Cards:
- **Deck:** `Programming::Python`

- **Card 1:**
	- **Front:** `Python Basics > Data Types`
	- **Back:**
		```Markdown 
		Covers integers, floats, strings, booleans, lists, tuples, dictionaries.
		- **int:** Whole numbers (e.g., `10`)
		- **str:** Sequences of characters (e.g., `"Hello"`)
		- **list:** Ordered, mutable sequences (e.g., `[1, 2, 3]`)
  		```

- **Card 2:**
	- **Front:** `Python Basics > Control Flow`
	- **Back:**
 		```Markdown
		How programs make decisions and repeat actions.
		- **if/elif/else:** Conditional execution.
		- **for loop:** Iterating over sequences.
		- **while loop:** Repeating actions based on a condition.
		```
   
## Future Plans / Roadmap
Planned features include:
- [ ] **Image Support:** Include images from your Obsidian notes on Anki cards.
- [ ] **LaTeX Support:** Properly render LaTeX (MathJax) formulas on Anki cards.
- [ ] **Pseudocode (Algorithmicx Package):** Support for pseudocode blocks.
- [ ] **Manual Card Definitions:** An alternative way to explicitly define cards within your notes using a tag (e.g., #Card)

_This Readme was written by Gemini 2.5 Pro (Experimental)_
