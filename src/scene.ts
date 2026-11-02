/**
 * What a film's moves set, at one moment: what the stage draws on one frame — every prop's state and the objects on
 * the frame — and the speed the take runs the page's own time at, which the stage draws nothing of.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop or object set,
 * and the take keeps the one standing. The film's look is a prop too, changed by moves as any other. A prop is one of
 * livereel's, each in a slot of its own; an object (`src/props/object.ts`) is the film's, known by a name it gives or
 * its kind's own, so several of a kind stand at once, drawn on the layer what each shows sets and, within it, in the
 * order they first came, the last over the rest: one shown again in place of itself keeps its place. One pushed off by
 * another of its name sliding in is held apart while it goes, so the two stand at once, and drawn over every object
 * standing on its layer. A group of objects (`src/props/group.ts`) is known by a name of its own, and holds no more
 * than how the objects in it stand together; they go with it. `drawn` works out everything the stage needs from it —
 * how far each word of a title, a caption or a callout and each line of code has come, the terminal's spinner, how far
 * keys rise clear of a caption, where a note's line meets the block it names on the frame, the hole a piece of the page
 * leaves and the lines it draws to its source, the part of the screen under a lens, where an object in a group is
 * drawn and in what order — so the stage draws numbers and words and decides nothing, and draws no group of its own.
 * What the camera shows is worked out from what it aims at and the window that stands (`cameraOf`), so a
 * camera moving and a window moving in one step make the same frame whichever is set first; a frame is drawn by such a
 * camera, or by the flat one an act is done in. A prop that may be absent is `null`; the
 * compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/format.ts';
import type { Size } from './domain/geometry.ts';
import {
	type Aiming,
	type Camera,
	type DrawnCamera,
	type Placing,
	type View,
	drawnCamera,
	frameShift,
	placedIn,
	seenThrough,
	standingAt,
	wholePose,
	wholeView
} from './domain/camera.ts';
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import type { Cursor } from './props/cursor.ts';
import type { Group, GroupName, Groups } from './props/group.ts';
import { type DrawnLines, drawnHoles, drawnLines } from './props/lifted.ts';
import type { Light } from './props/light.ts';
import type { Look } from './props/look.ts';
import { type DrawnNote, type Note, drawnNote } from './props/note.ts';
import {
	type DrawnObject,
	type FrameObject,
	type Holders,
	type ObjectName,
	type Objects,
	type Surroundings,
	captionAmong,
	drawnObject,
	frameShiftOf,
	holdersSeenBy,
	inDrawingOrder,
	pictureZoomOf,
	standsIn
} from './props/object.ts';
import type { DrawnHole } from './props/piece.ts';
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
	/** Groups of objects, by their own names, each holding how the objects in it stand together. */
	readonly groups: Groups;
	/**
	 * How many of the page's own seconds a second of the film runs: the film's own speed, 1, where it sets none. The
	 * take runs the page's time by it; the stage draws nothing of it.
	 */
	readonly pageSpeed: number;
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

/**
 * What the stage is handed of a scene: each prop as drawn, the objects standing and pushed off, and what the pieces of
 * the page among them leave on the page and draw to it, holes on the screen and lines on the frame.
 */
export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] } & {
	readonly objects: readonly DrawnObject[];
	readonly leaving: readonly DrawnObject[];
	readonly holes: readonly DrawnHole[];
	readonly lines: readonly DrawnLines[];
};

// The page's own time running a second for each of the film's
const THE_FILMS_OWN_SPEED = 1;

/**
 * The scene a film opens on, in its look: the whole screen, face-on, up, in the whole frame; nothing over it; the
 * page's time at the film's own speed.
 */
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
		leaving: new Map(),
		groups: new Map(),
		pageSpeed: THE_FILMS_OWN_SPEED
	};
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The scene with the page's own time running at a speed. */
export function withPageSpeed(scene: Scene, pageSpeed: number): Scene {
	return { ...scene, pageSpeed };
}

/**
 * The scene with an object of a name set where it stands, or coming last where none of its name stood; none, gone. One
 * set in a group gone is gone with it, as a group takes what stands in it: a move of it running on as its group goes,
 * or one bringing it into a group going, sets nothing once the group is gone, whichever move began first.
 */
export function withObject(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	const held = object === null || itsHolderStands(scene, object) ? object : null;
	return { ...scene, objects: withNamed(scene.objects, name, held) };
}

/** Whether what an object stands in stands in a scene: the frame and the window always, a group while it stands. */
function itsHolderStands(scene: Scene, object: FrameObject): boolean {
	return object.inside.kind !== 'group' || scene.groups.has(object.inside.name);
}

/** The scene with the object pushed off by one of its name set as it goes; none, once it is past the edge. */
export function withLeaving(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	return { ...scene, leaving: withNamed(scene.leaving, name, object) };
}

/** The scene with a group of a name set where it stands; none, gone with every object standing in it. */
export function withGroup(scene: Scene, name: GroupName, group: Group | null): Scene {
	const groups = withNamed(scene.groups, name, group);
	if (group !== null) return { ...scene, groups };
	return { ...scene, groups, objects: new Map([...scene.objects].filter(([, object]) => !standsIn(object, name))) };
}

function withNamed<Value>(values: ReadonlyMap<string, Value>, name: string, value: Value | null): Map<string, Value> {
	const named = new Map(values);
	if (value === null) named.delete(name);
	else named.set(name, value);
	return named;
}

/** The camera as the scene shows it: what it aims at, come to in the window where it stands so far. */
export function cameraOf(scene: Scene, format: Format): Camera {
	return seenThrough(scene.camera, scene.window, format);
}

/**
 * How close each piece of the page or lens in a scene shows it, as a pose's zoom has it, standing or pushed off, the
 * page seen by the camera that shows the scene on a frame of a size, so the picture it is drawn from is taken as sharp.
 */
export function pictureZoomsIn(scene: Scene, camera: Camera, frame: Size): readonly number[] {
	return [...scene.objects.values(), ...scene.leaving.values()]
		.map((object) => pictureZoomOf(object, camera, frame, scene.groups))
		.filter((zoom) => zoom !== null);
}

/**
 * How far anything on the frame moves from one scene to another, in the frame's pixels: the farthest the screen goes as
 * their cameras show it, or a corner of an object of one name in both, standing or pushed off, as what it stands in
 * carries it; one that comes or goes between them moves nowhere.
 */
export function frameShiftBetween(start: Scene, end: Scene, format: Format): number {
	const startCamera = cameraOf(start, format);
	const endCamera = cameraOf(end, format);
	const startHolders = holdersSeenBy(startCamera, start.groups);
	const endHolders = holdersSeenBy(endCamera, end.groups);
	return Math.max(
		frameShift(startCamera, endCamera, format),
		...objectShifts(start.objects, end.objects, startHolders, endHolders, format.frame),
		...objectShifts(start.leaving, end.leaving, startHolders, endHolders, format.frame)
	);
}

/**
 * How far each object of one name in both moves on the frame from one to the other, what objects stand in then and now
 * given.
 */
function objectShifts(
	start: Objects,
	end: Objects,
	startHolders: Holders,
	endHolders: Holders,
	frame: Size
): readonly number[] {
	const shifts: number[] = [];
	for (const [name, object] of end) {
		const before = start.get(name);
		if (before !== undefined) shifts.push(frameShiftOf(before, object, startHolders, endHolders, frame));
	}
	return shifts;
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
 * own, or the flat one an act is done in.
 */
export function drawn(scene: Scene, camera: Camera, moment: number, format: Format): DrawnScene {
	const everyObject = [...scene.objects, ...scene.leaving];
	const holes = drawnHoles(everyObject);
	const around: Surroundings = {
		caption: captionAmong(scene.objects),
		screen: scene.screen,
		frame: format.frame,
		camera,
		groups: scene.groups,
		holes
	};
	return {
		look: scene.look,
		camera: drawnCamera(camera, format),
		window: camera.view,
		screen: scene.screen,
		light: scene.light,
		callout: scene.callout === null ? null : drawnCallout(scene.callout, moment),
		pins: scene.pins === null ? null : drawnPins(scene.pins, camera, format.frame),
		cursor: scene.cursor,
		note: scene.note === null ? null : drawnNote(scene.note, camera, format.frame, moment),
		objects: drawnObjects(scene.objects, moment, around),
		leaving: drawnObjects(scene.leaving, moment, around),
		holes,
		lines: drawnLines(everyObject, camera, scene.groups, format.frame)
	};
}

/** Objects as the stage draws them, in the order it draws them, among what stands round them in the scene. */
function drawnObjects(objects: Objects, moment: number, around: Surroundings): readonly DrawnObject[] {
	return inDrawingOrder(objects, around.groups).map(([name, object]) => drawnObject(name, object, moment, around));
}
