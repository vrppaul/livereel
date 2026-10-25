/** The ending on the stage: the name, what it is, and the command that starts it, rising into place. */
import { type Drawer, partOf, show } from '#stage/drawer';
import type { Ending } from './state.ts';
import './ending.css';

// How far the ending's lines rise as it comes
const RISE = 24;

export class EndingDrawer implements Drawer<Ending | null> {
	readonly root: HTMLElement;
	readonly name: HTMLElement;
	readonly what: HTMLElement;
	readonly command: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
		this.name = partOf(root, 'name');
		this.what = partOf(root, 'what');
		this.command = partOf(root, 'command');
	}

	draw(ending: Ending | null): void {
		show(this.root, ending !== null);
		if (ending === null) return;
		this.root.style.opacity = String(ending.shown);
		this.name.textContent = ending.card.name;
		this.what.textContent = ending.card.line;
		this.command.textContent = ending.card.command;
		for (const line of this.root.children) {
			if (line instanceof HTMLElement) line.style.transform = `translateY(${(1 - ending.shown) * RISE}px)`;
		}
	}
}
