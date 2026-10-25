/** A caption on the stage: words that rise out of a blur one after another, on a ground that darkens the frame's foot. */
import { type Drawer, partOf, show } from '#stage/drawer';
import type { DrawnCaption, Word } from './state.ts';
import './caption.css';

// How far a word rises as it comes, and how blurred it starts; how far it sinks and blurs as it goes
const WORD_RISE = 22;
const WORD_BLUR = 10;
const WORD_SINK = 10;
const WORD_BLUR_LEAVING = 6;

export class CaptionDrawer implements Drawer<DrawnCaption | null> {
	readonly root: HTMLElement;
	readonly ground: HTMLElement;
	readonly words: HTMLElement;
	// The text whose words stand in the markup, so they are laid out anew only when the caption changes
	private standing: string | null = null;

	constructor(root: HTMLElement) {
		this.root = root;
		this.ground = partOf(root, 'ground');
		this.words = partOf(root, 'words');
	}

	draw(caption: DrawnCaption | null): void {
		show(this.root, caption !== null);
		if (caption === null) {
			this.standing = null;
			return;
		}
		if (this.standing !== caption.text) {
			this.standing = caption.text;
			this.words.replaceChildren(...caption.words.map(wordElement));
		}
		this.ground.style.opacity = String(caption.ground);
		for (const [place, word] of caption.words.entries()) {
			const element = this.words.children.item(place);
			if (element instanceof HTMLElement) placeWord(element, word, caption.gone);
		}
	}
}

function wordElement(word: Word): HTMLElement {
	const element = document.createElement('span');
	element.textContent = word.text;
	return element;
}

function placeWord(element: HTMLElement, word: Word, gone: number): void {
	element.style.opacity = String(word.appeared * (1 - gone));
	element.style.transform = `translateY(${(1 - word.appeared) * WORD_RISE - gone * WORD_SINK}px)`;
	element.style.filter = `blur(${(1 - word.appeared) * WORD_BLUR + gone * WORD_BLUR_LEAVING}px)`;
}
