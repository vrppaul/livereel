/**
 * What the stage draws on one frame: every prop's state at one moment, and the objects on the frame.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop or object set,
 * and the take keeps the one standing. The film's look is a prop too, changed by moves as any other. A prop is one of
 * livereel's, each in a slot of its own; an object (`src/props/object.ts`) is the film's, known by a name it gives or
 * its kind's own, so several of a kind stand at once, drawn on the layer what each shows sets and, within it, in the
 * order they first came, the last over the rest: one shown again in place of itself keeps its place. One pushed off by
 * another of its name sliding in is held apart while it goes, so the two stand at once, and drawn over every object
 * standing on its layer. `drawn` works out everything the stage needs from it — how far each word of a title, a
 * caption or a callout and each line of code has come, the terminal's spinner, how far keys rise clear of a caption,
 * where a note's line meets the block it names on the frame — so the stage draws numbers and words and decides
 * nothing. What the camera shows is worked out from what it aims at and the window that stands (`cameraOf`), so a
 * camera moving and a window moving in one step make the same frame whichever is set first; a frame is drawn by such a
 * camera, or by one the take hands it, along the camera's way or for an act. A prop that may be absent is `null`; the
 * compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/format.ts';
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
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import type { Cursor } from './props/cursor.ts';
import type { Light } from './props/light.ts';
import type { Look } from './props/look.ts';
import { type DrawnNote, type Note, drawnNote } from './props/note.ts';
import { type DrawnObject, type FrameObject, type ObjectName, type Objects, drawnObject } from './props/object.ts';
import { type DrawnPins, type Pins, drawnPins } from './props/pins.ts';
import { SCREEN_UP, type Screen } from './props/screen.ts';

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
}

export type PropName = keyof PropStates;

export type Scene = { readonly [Name in PropName]: PropStates[Name] } & {
	readonly objects: Objects;
	/** Objects pushed off past the frame's edge by one of their name sliding in, while they go. */
	readonly leaving: Objects;
};

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
}

export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] } & {
	readonly objects: readonly DrawnObject[];
	readonly leaving: readonly DrawnObject[];
};

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
		objects: new Map(),
		leaving: new Map()
	};
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The scene with an object of a name set where it stands, or coming last where none of its name stood; none, gone. */
export function withObject(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	return { ...scene, objects: withNamed(scene.objects, name, object) };
}

/** The scene with the object pushed off by one of its name set as it goes; none, once it is past the edge. */
export function withLeaving(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	return { ...scene, leaving: withNamed(scene.leaving, name, object) };
}

function withNamed(objects: Objects, name: ObjectName, object: FrameObject | null): Objects {
	const named = new Map(objects);
	if (object === null) named.delete(name);
	else named.set(name, object);
	return named;
}

/** The camera as the scene shows it: what it aims at, come to in the window where it stands so far. */
export function cameraOf(scene: Scene, format: Format): Camera {
	return seenThrough(scene.camera, scene.window, format);
}

/**
 * A frame's drawn scenes, each an exposure of it, said whole as one line, alike for two only where the stage draws
 * them alike: a scene is plain values, so what it says is all the stage is handed. Two scenes alike made by moves that
 * wrote their values in another order say them apart, and are drawn both: the cost of a frame, never a wrong one.
 */
export function drawingOf(exposures: readonly DrawnScene[]): string {
	return JSON.stringify(exposures);
}

/**
 * The scene as the stage draws it at a moment of the film, in the format it is shot in, seen by a camera: the scene's
 * own, one along its way there, or the flat one an act is done in.
 */
export function drawn(scene: Scene, camera: Camera, moment: number, format: Format): DrawnScene {
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
		objects: drawnObjects(scene.objects, moment, scene),
		leaving: drawnObjects(scene.leaving, moment, scene)
	};
}

/** Objects as the stage draws them, among what stands round them in the scene. */
function drawnObjects(objects: Objects, moment: number, scene: Scene): readonly DrawnObject[] {
	const around = { standing: scene.objects, screen: scene.screen };
	return [...objects].map(([name, object]) => drawnObject(name, object, moment, around));
}
