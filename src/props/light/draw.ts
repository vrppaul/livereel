/** The light on the stage: the block stays as it is, everything round it sinks into the dark. */
import { type Drawer, show } from '#stage/drawer';
import type { Light } from './state.ts';
import './light.css';

// Both edges of a block are padded alike
const SIDES = 2;

export class LightDrawer implements Drawer<Light | null> {
	readonly root: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
	}

	draw(light: Light | null): void {
		show(this.root, light !== null && light.strength > 0);
		if (light === null) return;
		Object.assign(this.root.style, {
			left: `${light.box.left - light.pad}px`,
			top: `${light.box.top - light.pad}px`,
			width: `${light.box.width + SIDES * light.pad}px`,
			height: `${light.box.height + SIDES * light.pad}px`
		});
		this.root.style.setProperty('--dim', String(light.dim * light.strength));
	}
}
