/** A drawer for every prop of the scene: a prop without one is refused by the compiler here. */
import { CameraDrawer } from '#props/camera/draw';
import { CaptionDrawer } from '#props/caption/draw';
import { CursorDrawer } from '#props/cursor/draw';
import { EndingDrawer } from '#props/ending/draw';
import { LightDrawer } from '#props/light/draw';
import { ScreenDrawer } from '#props/screen/draw';
import { TerminalDrawer } from '#props/terminal/draw';
import type { DrawnProps, DrawnScene, PropName } from '#scene';
import { type Drawer, propRoot } from './drawer.ts';

export type Drawers = { readonly [Name in PropName]: Drawer<DrawnProps[Name]> };

export function drawersOn(page: Document): Drawers {
	return {
		camera: new CameraDrawer(propRoot(page, 'camera')),
		screen: new ScreenDrawer(propRoot(page, 'screen')),
		light: new LightDrawer(propRoot(page, 'light')),
		cursor: new CursorDrawer(propRoot(page, 'cursor')),
		caption: new CaptionDrawer(propRoot(page, 'caption')),
		terminal: new TerminalDrawer(propRoot(page, 'terminal')),
		ending: new EndingDrawer(propRoot(page, 'ending'))
	};
}

/** Every prop drawn from the scene: one entry a prop, so a prop left out is refused by the compiler too. */
export function drawEvery(drawers: Drawers, scene: DrawnScene): void {
	const drawings: { readonly [Name in PropName]: () => void } = {
		camera: () => drawers.camera.draw(scene.camera),
		screen: () => drawers.screen.draw(scene.screen),
		light: () => drawers.light.draw(scene.light),
		cursor: () => drawers.cursor.draw(scene.cursor),
		caption: () => drawers.caption.draw(scene.caption),
		terminal: () => drawers.terminal.draw(scene.terminal),
		ending: () => drawers.ending.draw(scene.ending)
	};
	for (const drawing of Object.values(drawings)) drawing();
}
