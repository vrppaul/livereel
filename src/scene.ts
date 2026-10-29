/**
 * What the stage draws on one frame: every prop's state at one moment.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop set, and the
 * take keeps the one standing. The film's look is a prop too, changed by moves as any other. `drawn` works out
 * everything the stage needs from it — how far each word of a title, a caption or a callout and each line of code has
 * come, the terminal's spinner, where a note's line meets the block it names on the frame — so the stage draws numbers
 * and words and decides nothing. What the camera shows is worked out from what it aims at and the window that stands
 * (`cameraOf`), so a camera moving and a window moving in one step make the same frame whichever is set first; a
 * frame is drawn by such a camera, or by one the take hands it, along the camera's way or for an act. A prop that may
 * be absent is `null`; the compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/geometry.ts';
import {
	type Aiming,
	type Camera,
	type DrawnCamera,
	type Placing,
	type View,
	drawnCamera,
	placedIn,
	seenThrough,
	standingAt,
	wholePose,
	wholeView
} from './domain/camera.ts';
import { type Code, type DrawnCode, drawnCode } from './props/code.ts';
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import { type DrawnCaption, drawnCaption } from './props/caption.ts';
import type { Cursor } from './props/cursor.ts';
import type { Ending } from './props/ending.ts';
import { type DrawnKeys, type Keys, drawnKeys } from './props/keys.ts';
import type { Light } from './props/light.ts';
import type { Look } from './props/look.ts';
import { type DrawnNote, type Note, drawnNote } from './props/note.ts';
import { type DrawnPins, type Pins, drawnPins } from './props/pins.ts';
import { SCREEN_UP, type Screen } from './props/screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './props/terminal.ts';
import { type DrawnTitle, type Title, drawnTitle } from './props/title.ts';
import type { ShownWords } from './props/words.ts';

export interface PropStates {
	look: Look;
	camera: Aiming;
	window: Placing;
	screen: Screen;
	light: Light | null;
	callout: Callout | null;
	pins: Pins | null;
	cursor: Cursor | null;
	note: Note | null;
	title: Title | null;
	code: Code | null;
	caption: ShownWords | null;
	keys: Keys | null;
	terminal: Terminal | null;
	ending: Ending | null;
}

export type PropName = keyof PropStates;

export type Scene = { readonly [Name in PropName]: PropStates[Name] };

/** What the stage is handed for each prop: its state, or what is worked out from it to draw. */
interface DrawnProps {
	look: Look;
	camera: DrawnCamera;
	window: View;
	screen: Screen;
	light: Light | null;
	callout: DrawnCallout | null;
	pins: DrawnPins | null;
	cursor: Cursor | null;
	note: DrawnNote | null;
	title: DrawnTitle | null;
	code: DrawnCode | null;
	caption: DrawnCaption | null;
	keys: DrawnKeys | null;
	terminal: DrawnTerminal | null;
	ending: Ending | null;
}

export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] };

/** The scene a film opens on, in its look: the whole screen, face-on, up, in the whole frame; nothing over it. */
export function openingScene(format: Format, look: Look): Scene {
	return {
		look,
		camera: standingAt(wholePose(format)),
		window: placedIn(wholeView(format.frame)),
		screen: SCREEN_UP,
		light: null,
		callout: null,
		pins: null,
		cursor: null,
		note: null,
		title: null,
		code: null,
		caption: null,
		keys: null,
		terminal: null,
		ending: null
	};
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The camera as the scene shows it: what it aims at, come to in the window where it stands so far. */
export function cameraOf(scene: Scene, format: Format): Camera {
	return seenThrough(scene.camera, scene.window, format);
}

/**
 * The scene as the stage draws it at a moment of the film, in the format it is shot in, seen by a camera: the scene's
 * own, one along its way there, or the flat one an act is done in.
 */
export function drawn(scene: Scene, camera: Camera, moment: number, format: Format): DrawnScene {
	const caption = scene.caption === null ? null : drawnCaption(scene.caption, format);
	return {
		look: scene.look,
		camera: drawnCamera(camera, format),
		window: camera.view,
		screen: scene.screen,
		light: scene.light,
		callout: scene.callout === null ? null : drawnCallout(scene.callout),
		pins: scene.pins === null ? null : drawnPins(scene.pins, camera, format.frame),
		cursor: scene.cursor,
		note: scene.note === null ? null : drawnNote(scene.note, camera, format.frame),
		title: scene.title === null ? null : drawnTitle(scene.title),
		code: scene.code === null ? null : drawnCode(scene.code),
		caption,
		keys: scene.keys === null ? null : drawnKeys(scene.keys, caption),
		terminal: scene.terminal === null ? null : drawnTerminal(scene.terminal, moment),
		ending: scene.ending
	};
}
