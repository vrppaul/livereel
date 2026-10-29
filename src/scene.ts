/**
 * What the stage draws on one frame: every prop's state at one moment.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop set, and the
 * take keeps the one standing. `drawn` works out everything the stage needs from it — how far each word of a title, a
 * caption or a callout has come, the terminal's spinner, where a note's line meets the block it names on the frame —
 * so the stage draws numbers and words and decides nothing. A prop that may be absent is `null`; the compiler holds
 * every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/geometry.ts';
import { type Camera, type DrawnCamera, drawnCamera, wholeCamera } from './domain/camera.ts';
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import type { Cursor } from './props/cursor.ts';
import type { Ending } from './props/ending.ts';
import type { Keys } from './props/keys.ts';
import type { Light } from './props/light.ts';
import { type DrawnNote, type Note, drawnNote } from './props/note.ts';
import { type DrawnPins, type Pins, drawnPins } from './props/pins.ts';
import { SCREEN_UP, type Screen } from './props/screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './props/terminal.ts';
import { type DrawnTitle, type Title, drawnTitle } from './props/title.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './props/words.ts';

export interface PropStates {
	camera: Camera;
	screen: Screen;
	light: Light | null;
	callout: Callout | null;
	pins: Pins | null;
	cursor: Cursor | null;
	note: Note | null;
	title: Title | null;
	caption: ShownWords | null;
	keys: Keys | null;
	terminal: Terminal | null;
	ending: Ending | null;
}

export type PropName = keyof PropStates;

export type Scene = { readonly [Name in PropName]: PropStates[Name] };

/** What the stage is handed for each prop: its state, or what is worked out from it to draw. */
interface DrawnProps {
	camera: DrawnCamera;
	screen: Screen;
	light: Light | null;
	callout: DrawnCallout | null;
	pins: DrawnPins | null;
	cursor: Cursor | null;
	note: DrawnNote | null;
	title: DrawnTitle | null;
	caption: DrawnWords | null;
	keys: Keys | null;
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
		pins: null,
		cursor: null,
		note: null,
		title: null,
		caption: null,
		keys: null,
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

/** The scene as the stage draws it at a moment of the film, in the format it is shot in. */
export function drawn(scene: Scene, moment: number, format: Format): DrawnScene {
	return {
		camera: drawnCamera(scene.camera, format),
		screen: scene.screen,
		light: scene.light,
		callout: scene.callout === null ? null : drawnCallout(scene.callout),
		pins: scene.pins === null ? null : drawnPins(scene.pins),
		cursor: scene.cursor,
		note: scene.note === null ? null : drawnNote(scene.note, scene.camera, format.frame),
		title: scene.title === null ? null : drawnTitle(scene.title),
		caption: scene.caption === null ? null : drawnWords(scene.caption),
		keys: scene.keys,
		terminal: scene.terminal === null ? null : drawnTerminal(scene.terminal, moment),
		ending: scene.ending
	};
}
