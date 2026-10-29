/**
 * What the stage draws on one frame: every prop's state at one moment.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop set, and the
 * take keeps the one standing. `drawn` works out everything the stage needs from it — how far each word of a title, a
 * caption or a callout has come, the terminal's spinner — so the stage draws numbers and words and decides nothing. A
 * prop that may be absent is `null`; the compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/geometry.ts';
import { type Camera, wholeCamera } from './domain/camera.ts';
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import type { Cursor } from './props/cursor.ts';
import type { Ending } from './props/ending.ts';
import type { Light } from './props/light.ts';
import { SCREEN_UP, type Screen } from './props/screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './props/terminal.ts';
import { type DrawnTitle, type Title, drawnTitle } from './props/title.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './props/words.ts';

export interface PropStates {
	camera: Camera;
	screen: Screen;
	light: Light | null;
	callout: Callout | null;
	cursor: Cursor | null;
	title: Title | null;
	caption: ShownWords | null;
	terminal: Terminal | null;
	ending: Ending | null;
}

export type PropName = keyof PropStates;

export type Scene = { readonly [Name in PropName]: PropStates[Name] };

/** What the stage is handed for each prop: its state, or what is worked out from it to draw. */
interface DrawnProps {
	camera: Camera;
	screen: Screen;
	light: Light | null;
	callout: DrawnCallout | null;
	cursor: Cursor | null;
	title: DrawnTitle | null;
	caption: DrawnWords | null;
	terminal: DrawnTerminal | null;
	ending: Ending | null;
}

export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] };

/** The scene a film opens on: the whole screen, face-on, up, in the whole frame; nothing over it. */
export function openingScene(format: Format): Scene {
	return {
		camera: wholeCamera(format),
		screen: SCREEN_UP,
		light: null,
		callout: null,
		cursor: null,
		title: null,
		caption: null,
		terminal: null,
		ending: null
	};
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The same scene seen by another camera. */
export function posed(scene: Scene, camera: Camera): Scene {
	return withProp(scene, 'camera', camera);
}

/** The scene as the stage draws it at a moment of the film. */
export function drawn(scene: Scene, moment: number): DrawnScene {
	return {
		camera: scene.camera,
		screen: scene.screen,
		light: scene.light,
		callout: scene.callout === null ? null : drawnCallout(scene.callout),
		cursor: scene.cursor,
		title: scene.title === null ? null : drawnTitle(scene.title),
		caption: scene.caption === null ? null : drawnWords(scene.caption),
		terminal: scene.terminal === null ? null : drawnTerminal(scene.terminal, moment),
		ending: scene.ending
	};
}
