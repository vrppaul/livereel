/** The screen on the stage, as far as it has come up out of the ground. */
import type { Drawer } from '#stage/drawer';
import type { Screen } from './state.ts';
import './screen.css';

export class ScreenDrawer implements Drawer<Screen> {
	readonly root: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
	}

	draw(screen: Screen): void {
		this.root.style.opacity = String(screen.shown);
	}
}
