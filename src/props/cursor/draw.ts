/** The cursor on the stage: its tip where the scene has it, a little smaller as it is pressed in. */
import { type Drawer, show } from '#stage/drawer';
import type { Cursor } from './state.ts';
import './cursor.css';

// How far the cursor shrinks pressed all the way in, and where its tip is in its own drawing
const PRESS_SHRINK = 0.18;
const TIP = 3;

export class CursorDrawer implements Drawer<Cursor | null> {
	readonly root: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
	}

	draw(cursor: Cursor | null): void {
		show(this.root, cursor !== null);
		if (cursor === null) return;
		const tip = `translate(${cursor.left - TIP}px, ${cursor.top - TIP}px)`;
		this.root.style.transform = `${tip} scale(${1 - PRESS_SHRINK * cursor.press})`;
	}
}
