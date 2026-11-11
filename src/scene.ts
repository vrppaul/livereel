/**
 * What a film's moves set, at one moment: what the stage draws on one frame — every prop's state and the objects on
 * the frame — and the speed the take runs the page's own time at, which the stage draws nothing of.
 *
 * A scene is plain values, never changed in place, but for the curve a fade of the screen goes on, a function the film
 * names, which the stage is never handed: a move's change hands back a scene with its own prop or object set, and the
 * take keeps the one standing. The film's look and the world's are props too, changed by moves as any other. A
 * prop is one of livereel's, each in a slot of its own; an object (`src/props/object.ts`) is the film's, known by a
 * name it gives or its kind's own, so several of a kind stand at once, drawn in the order they first came, the last
 * over the rest: one shown again in place of itself keeps its place. One pushed off by another of its name sliding in
 * is held apart while it goes, so the two stand at once, and drawn over every object standing. A caption and keys lie
 * over every object, keys over the caption. A group of objects (`src/props/group.ts`) is known by a name of its own,
 * and holds no more than how the objects in it stand together; they go with it. `drawn` works out everything the stage
 * needs from it — how far each word of a title, a caption or a callout and each line of code has come, the terminal's
 * spinner, how far keys rise clear of a caption, where a note's line meets the block it names on the frame, the hole a
 * piece of the page leaves and the lines it draws to its source, the part of the screen under a lens, where a band of
 * light sweeping the screen stands across what the window shows of it, how far down a page of the film's own on the
 * screen the film has run it, where an object in a group, or on the page as
 * the camera frames it then, is drawn and in what order, how soft the eye's focus draws the window and each object in
 * the world, where the world's lights stand in the room and how the eye that sees each thing sees the room — so the
 * stage draws numbers and words and decides nothing, and draws no group of its own. What the camera shows is worked out
 * from what it aims at and the window that stands (`cameraOf`), so a camera moving and a window moving in one step make
 * the same frame whichever is set first; a frame is drawn by such a camera, or by the flat one an act is done in. A
 * prop that may be absent is `null`; the compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import { type DrawnEye, type Eye, drawnEye, eyeAtRest } from './domain/eye.ts';
import { lensLawOf, sharpnessOf } from './domain/focus.ts';
import type { Format } from './domain/format.ts';
import type { Size } from './domain/geometry.ts';
import type { OwnPageStanding } from './domain/own-page.ts';
import {
	type Aiming,
	type Camera,
	type DrawnCamera,
	type SeenBetween,
	drawnCamera,
	frameShift,
	placedIn,
	screenBoxShift,
	screenPointShift,
	seenThrough,
	standingAt,
	viewShift,
	wholePose,
	wholeView
} from './domain/camera.ts';
import { namesOf } from './domain/toward.ts';
import { LIVEREELS_SLAB } from './props/body.ts';
import { type Callout, type DrawnCallout, drawnCallout } from './props/callout.ts';
import { type Caption, type DrawnCaption, drawnCaption } from './props/caption.ts';
import type { Cursor } from './props/cursor.ts';
import {
	type BlockKey,
	type GroupName,
	type Holders,
	type Placed,
	type Scrolled,
	laidFartherFirst
} from './domain/placement.ts';
import type { Group, Groups } from './props/group.ts';
import { type DrawnKeys, type Keys, drawnKeys } from './props/keys.ts';
import { type DrawnLines, drawnHoles, drawnLines } from './props/lifted.ts';
import type { Light } from './props/light.ts';
import type { Look } from './props/look.ts';
import { type DrawnNote, type Note, drawnNote, noteShift } from './props/note.ts';
import {
	type DrawnObject,
	type FrameObject,
	type ObjectName,
	type ObjectThen,
	type Objects,
	type Surroundings,
	drawnObject,
	frameShiftOf,
	inDrawingOrder,
	partAskedSharper,
	pictureHeldBy,
	pictureZoomOf,
	standingInTheWorld,
	standsBeside,
	standsInGroup
} from './props/object.ts';
import type { PartAsked, SharperPicture } from './domain/picture.ts';
import type { DrawnHole } from './props/piece.ts';
import { type DrawnPins, type Pins, drawnPins } from './props/pins.ts';
import {
	type DrawnScreen,
	type MomentsBetween,
	NOTHING_TYPED,
	SCREEN_UP,
	type Screen,
	THE_FILMED_PAGE,
	drawnScreen,
	ownPageStanding,
	pageShownOn,
	pastTheScreen,
	picturesHeldOn,
	runShift,
	sweepShift
} from './props/screen.ts';
import { figureShiftOver } from './props/way.ts';
import {
	type DrawnWindow,
	LIVEREELS_BLUR_SEEN,
	LIVEREELS_REACH,
	type PageWindow,
	UNSHADED,
	drawnWindow
} from './props/window.ts';
import { type DrawnWorld, type WorldLook, drawnWorld } from './props/world.ts';

export interface PropStates {
	look: Look;
	world: WorldLook;
	camera: Aiming;
	window: PageWindow;
	screen: Screen;
	light: Light | null;
	callout: Callout | null;
	pins: Pins | null;
	cursor: Cursor | null;
	note: Note | null;
	caption: Caption | null;
	keys: Keys | null;
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
	/**
	 * How far the film's own scrolls have scrolled each block of the page, by the key the page knows it by
	 * (`src/domain/placement.ts`): what carries a piece riding its block, as far as the blocks that carry its source have
	 * scrolled. The page holds the scroll itself; the stage draws nothing of this.
	 */
	readonly scrolled: Scrolled;
	/**
	 * Where the eye stands and what it looks at, where it focuses and how wide it is open (`src/domain/eye.ts`): the
	 * world, the window in it, is seen from it and as sharp as it sees, the frame rides with it. The stage draws nothing
	 * of it but the matrices and the blurs it is handed.
	 */
	readonly eye: Eye;
};

/** What the stage is handed for each prop: its state, or what is worked out from it to draw. */
interface DrawnProps {
	look: Look;
	world: DrawnWorld;
	camera: DrawnCamera;
	window: DrawnWindow;
	screen: DrawnScreen;
	light: Light | null;
	callout: DrawnCallout | null;
	pins: DrawnPins | null;
	cursor: Cursor | null;
	note: DrawnNote | null;
	caption: DrawnCaption | null;
	keys: DrawnKeys | null;
}

/** The scene's lists of objects: those standing, and those pushed off while they go. */
export type ObjectList = 'objects' | 'leaving';

/** An object of a list of the scene's, by its name. */
interface ListedObject {
	readonly list: ObjectList;
	readonly name: ObjectName;
}

/** An object of a list of the scene's standing in the world, and where it stands there as the frame is drawn. */
interface StandingListed extends ListedObject {
	readonly standing: Placed;
}

/**
 * What the stage is handed of a scene: each prop as drawn, the objects standing and pushed off, those of them standing
 * in the world in the order the room lays them one over the other (`laidFartherFirst` in `src/domain/placement.ts`),
 * whether anything lies over the page in the window but the screen's own — the page the screen fades from, a callout,
 * pins, an object standing inside the window — which the room lays over the page apart; what the pieces of the page
 * among them leave on the page and draw to it, holes on the screen and lines on the frame, and the eye as the room sees
 * the world and the frame by it and blurs each pixel of the world by its lens, once a scene.
 */
export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] } & {
	readonly objects: readonly DrawnObject[];
	readonly leaving: readonly DrawnObject[];
	readonly laidInTheWorld: readonly ListedObject[];
	readonly overThePage: boolean;
	readonly holes: readonly DrawnHole[];
	readonly lines: readonly DrawnLines[];
	readonly eye: DrawnEye;
};

// The page's own time running a second for each of the film's
const THE_FILMS_OWN_SPEED = 1;

/**
 * The scene a film opens on, in its look and its world's: the whole screen, face-on, up, unshaded, in the whole frame,
 * the shade reaching the page alone, its blur as wide as written on the page, the window's body livereel's, none;
 * nothing over it; the page's time at the film's own speed; the eye of its focal length at rest.
 */
export function openingScene(format: Format, look: Look, world: WorldLook, focalLength: number): Scene {
	return {
		look,
		world,
		camera: standingAt(wholePose(format)),
		window: {
			...placedIn(wholeView(format.frame)),
			...UNSHADED,
			sharp: null,
			reaching: LIVEREELS_REACH,
			blurSeen: LIVEREELS_BLUR_SEEN,
			body: LIVEREELS_SLAB
		},
		screen: SCREEN_UP,
		light: null,
		callout: null,
		pins: null,
		cursor: null,
		note: null,
		caption: null,
		keys: null,
		objects: new Map(),
		leaving: new Map(),
		groups: new Map(),
		pageSpeed: THE_FILMS_OWN_SPEED,
		scrolled: new Map(),
		eye: eyeAtRest(focalLength)
	};
}

/** The scene with the eye standing where it is sent. */
export function withEye(scene: Scene, eye: Eye): Scene {
	return { ...scene, eye };
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The scene with its screen showing the filmed page, whatever page it shows, as an act on the page has it shown. */
export function showingTheFilmedPage(scene: Scene): Scene {
	return withProp(scene, 'screen', { ...scene.screen, shows: THE_FILMED_PAGE });
}

/**
 * The scene with pages of the film's own laid on its screen, by their keys, as the stage lays each: nothing typed in
 * it, and as far as it then scrolls at most.
 */
export function withPagesLaid(scene: Scene, scrollLengths: ReadonlyMap<string, number>): Scene {
	const laid = [...scrollLengths].map(([key, scrollLength]) => [key, { typed: NOTHING_TYPED, scrollLength }] as const);
	return withProp(scene, 'screen', { ...scene.screen, documents: new Map([...scene.screen.documents, ...laid]) });
}

/** A page of the film's own the stage laid, by its key, as it stands in the scene at a moment. */
export function ownPageStandingIn(scene: Scene, key: string, moment: number): OwnPageStanding {
	return ownPageStanding(scene.screen, key, moment);
}

/** The scene with the page's own time running at a speed. */
export function withPageSpeed(scene: Scene, pageSpeed: number): Scene {
	return { ...scene, pageSpeed };
}

/** The scene with a block of the page, by the key the page knows it by, scrolled so far by the film's scrolls. */
export function withScrolled(scene: Scene, block: BlockKey, scrolledSoFar: number): Scene {
	return { ...scene, scrolled: new Map([...scene.scrolled, [block, scrolledSoFar]]) };
}

/**
 * The scene with an object of a name set where it stands, or coming last where none of its name stood; none, gone,
 * and what stands beside it gone with it. One set in a group gone, or beside an object gone, is gone with it, as a
 * group takes what stands in it: a move of it running on as its group goes, or one bringing it into a group going,
 * sets nothing once the group is gone, whichever move began first.
 */
export function withObject(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	const held = object === null || itsHolderStands(scene, object) ? object : null;
	const set = { ...scene, objects: withNamed(scene.objects, name, held) };
	return held === null ? withoutWhatStandsBeside(set, name) : set;
}

/** The scene with every object standing beside an object of a name gone, and what stands beside each of those. */
function withoutWhatStandsBeside(scene: Scene, name: ObjectName): Scene {
	return [...scene.objects]
		.filter(([, object]) => standsBeside(object, name))
		.reduce((without, [besideName]) => withObject(without, besideName, null), scene);
}

/**
 * Whether what an object stands in stands in a scene: the frame, the world, the window, the page and over it, a
 * block's scroll and a point of the screen always, a group while it stands, a point of an object while the object does.
 */
function itsHolderStands(scene: Scene, object: FrameObject): boolean {
	const holder = object.inside;
	switch (holder.kind) {
		case 'group':
			return scene.groups.has(holder.name);
		case 'point':
			return holder.of.kind === 'screen' || scene.objects.has(holder.of.name);
		case 'frame':
		case 'world':
		case 'window':
		case 'page':
		case 'pageInTheWorld':
		case 'scroll':
			return true;
	}
}

/** The scene with the object pushed off by one of its name set as it goes; none, once it is past the edge. */
export function withLeaving(scene: Scene, name: ObjectName, object: FrameObject | null): Scene {
	return { ...scene, leaving: withNamed(scene.leaving, name, object) };
}

/** The scene with a group of a name set where it stands; none, gone with every object standing in it. */
export function withGroup(scene: Scene, name: GroupName, group: Group | null): Scene {
	const groups = withNamed(scene.groups, name, group);
	if (group !== null) return { ...scene, groups };
	const groupGone: Scene = { ...scene, groups };
	return [...scene.objects]
		.filter(([, object]) => standsInGroup(object, name))
		.reduce((without, [inIt]) => withObject(without, inIt, null), groupGone);
}

function withNamed<Value>(values: ReadonlyMap<string, Value>, name: string, value: Value | null): Map<string, Value> {
	const named = new Map(values);
	if (value === null) named.delete(name);
	else named.set(name, value);
	return named;
}

/**
 * The camera as the scene shows it: what it aims at, come to in the window where it stands so far, seen from the eye
 * where it stands.
 */
export function cameraOf(scene: Scene, format: Format): Camera {
	return seenThrough(scene.camera, scene.window, scene.eye, format);
}

/**
 * How close each piece drawn from the page's picture, or lens, in a scene shows the page, as a pose's zoom has it,
 * standing or pushed off, the page seen by the camera that shows the scene on a frame of a size, so the page's picture
 * is taken as sharp.
 */
export function pictureZoomsIn(scene: Scene, camera: Camera, frame: Size): readonly number[] {
	const holders = holdersIn(scene, camera);
	return [...scene.objects.values(), ...scene.leaving.values()]
		.map((object) => pictureZoomOf(object, holders, frame))
		.filter((zoom) => zoom !== null);
}

/**
 * The parts of the screen the pieces in a scene drawn from the page's picture show closer than livereel's bound has it
 * taken, standing or pushed off, each as close as its piece shows it, the page seen by the camera that shows the scene
 * on a frame of a size.
 */
export function partsAskedSharperIn(scene: Scene, camera: Camera, frame: Size): readonly PartAsked[] {
	const holders = holdersIn(scene, camera);
	return [...scene.objects.values(), ...scene.leaving.values()].flatMap((object) =>
		partAskedSharper(object, holders, frame)
	);
}

/**
 * What the objects of a scene stand in, seen by a camera: it, the groups standing, the objects standing and how far the
 * film has scrolled each block it scrolls.
 */
export function holdersIn(scene: Scene, camera: Camera): Holders {
	return { camera, groups: scene.groups, objects: scene.objects, scrolled: scene.scrolled };
}

/**
 * The numbers of the pictures a scene holds at a moment, as a frame drawn then or later may draw them: those the pieces
 * in it hold, standing or pushed off, and those its screen holds.
 */
export function picturesHeldIn(scene: Scene, moment: number): readonly number[] {
	return [
		...[...scene.objects.values(), ...scene.leaving.values()].flatMap((object) => pictureHeldBy(object)),
		...picturesHeldOn(scene.screen, moment)
	];
}

/**
 * A scene as it stands at a moment of the film: what is worked out from the moment, as a terminal's spinner, is worked
 * out at that one.
 */
export interface SceneAt {
	readonly scene: Scene;
	readonly moment: number;
}

/** A scene at a moment of a frame's time, and the camera that shows it then. */
export interface SceneSeen extends SceneAt {
	readonly camera: Camera;
}

/**
 * Two moments of a frame's time a move on the frame is measured between: the scenes then, their cameras, and the
 * moments themselves.
 */
interface Between {
	readonly start: Scene;
	readonly end: Scene;
	readonly seen: SeenBetween;
	readonly moments: MomentsBetween;
	readonly format: Format;
}

// How far anything moves on the frame where nothing does
const NOTHING_MOVES = 0;
// How far what each prop draws moves on the frame between two moments, the compiler holding every prop to one: the
// screen as the camera shows it, the window's edge, the band of light sweeping the screen and a page of the film's own
// running on it, the light's box and the cursor's tip on the screen, a note's words beside the window and its line's
// end at its block, and the figure of a caption and of keys as a way of livereel's shifts, grows and cuts it over the
// whole frame, each where it stands at both, a prop that comes or goes between them moving nowhere. The screen comes up
// in its place, and a callout and pins lie on the screen, moving only as far as it carries them, which the camera's
// measures. The look's colours and ground change in place; the sizes it sets, of letters and margins, move words too,
// which is not counted; the world's light and glow change only how what stands is lit
const FRAME_SHIFT_OF: { readonly [Name in PropName]: (between: Between) => number } = {
	look: () => NOTHING_MOVES,
	world: () => NOTHING_MOVES,
	camera: ({ seen, format }) => frameShift(seen.start, seen.end, format),
	window: ({ seen }) => viewShift(seen),
	screen: ({ start, end, seen, moments, format }) =>
		Math.max(
			shiftOfBoth(start.screen.sweep, end.screen.sweep, (from, to) => sweepShift(seen, format, from, to)),
			runShift(seen.end, format, start.screen, end.screen, moments)
		),
	light: ({ start, end, seen }) =>
		shiftOfBoth(start.light, end.light, (from, to) => screenBoxShift(seen, from.box, to.box)),
	callout: () => NOTHING_MOVES,
	pins: () => NOTHING_MOVES,
	cursor: ({ start, end, seen }) =>
		shiftOfBoth(start.cursor, end.cursor, (from, to) => screenPointShift(seen, from, to)),
	note: ({ start, end, seen }) => shiftOfBoth(start.note, end.note, (from, to) => noteShift(from, to, seen)),
	caption: ({ start, end, format }) =>
		shiftOfBoth(start.caption, end.caption, (from, to) => figureShiftOver(from, to, format.frame)),
	keys: ({ start, end, format }) =>
		shiftOfBoth(start.keys, end.keys, (from, to) => figureShiftOver(from, to, format.frame))
};
const PROP_NAMES = namesOf(FRAME_SHIFT_OF);

/**
 * How far anything on the frame moves from one scene at its moment to another at its, in the frame's pixels: the
 * farthest what any prop draws goes as their cameras show it, or an object of one name in both, standing or pushed off,
 * as what it stands in carries it; one that comes or goes between them moves nowhere.
 */
export function frameShiftBetween(start: SceneAt, end: SceneAt, format: Format): number {
	return shiftBetween(seenIn(start, format), seenIn(end, format), format);
}

/** A scene at its moment, and the camera that shows it. */
export function seenIn(at: SceneAt, format: Format): SceneSeen {
	return { ...at, camera: cameraOf(at.scene, format) };
}

function shiftBetween(start: SceneSeen, end: SceneSeen, format: Format): number {
	const between: Between = {
		start: start.scene,
		end: end.scene,
		seen: { start: start.camera, end: end.camera, frame: format.frame },
		moments: { start: start.moment, end: end.moment },
		format
	};
	return Math.max(
		...PROP_NAMES.map((name) => FRAME_SHIFT_OF[name](between)),
		...objectShifts(start, end, (scene) => scene.objects, format.frame),
		...objectShifts(start, end, (scene) => scene.leaving, format.frame)
	);
}

/** How far a prop moves between two moments, by where it stands at both; nowhere where it is absent at either. */
function shiftOfBoth<State>(
	start: State | null,
	end: State | null,
	shift: (start: State, end: State) => number
): number {
	return start === null || end === null ? NOTHING_MOVES : shift(start, end);
}

/** How far each object of one name in both of a list a scene keeps moves on the frame from one moment to the other. */
function objectShifts(
	start: SceneSeen,
	end: SceneSeen,
	listed: (scene: Scene) => Objects,
	frame: Size
): readonly number[] {
	const shifts: number[] = [];
	for (const [name, object] of listed(end.scene)) {
		const before = listed(start.scene).get(name);
		if (before !== undefined) shifts.push(frameShiftOf(objectThen(before, start), objectThen(object, end), frame));
	}
	return shifts;
}

/** An object as it stood at a moment of a frame's time, in the scene then. */
function objectThen(object: FrameObject, seen: SceneSeen): ObjectThen {
	return { object, holders: holdersIn(seen.scene, seen.camera), look: seen.scene.look };
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
 * own, or the flat one an act is done in; each piece drawn from the page's picture past livereel's bound drawn from the
 * picture of its source the stage holds sharper, of those named.
 */
export function drawn(
	scene: Scene,
	camera: Camera,
	moment: number,
	format: Format,
	sharper: readonly SharperPicture[]
): DrawnScene {
	const everyObject = [...scene.objects, ...scene.leaving];
	const holes = drawnHoles(everyObject, scene.scrolled, scene.screen);
	const sharpness = sharpnessOf(camera, format.frame);
	const around: Surroundings = {
		screen: scene.screen,
		frame: format.frame,
		camera,
		groups: scene.groups,
		objects: scene.objects,
		scrolled: scene.scrolled,
		holes,
		sharpness,
		sharper
	};
	const past = pastTheScreen(scene.screen, camera, format, moment);
	const shown = drawnCamera(camera, format, pageShownOn(format, past));
	const objects = drawnObjects(scene.objects, moment, around);
	const leaving = drawnObjects(scene.leaving, moment, around);
	const window = drawnWindow(camera.view, shown.cut, scene.window, {
		eye: camera.eye,
		frame: format.frame,
		sharpness,
		look: scene.look,
		world: scene.world,
		screen: scene.screen
	});
	const screen = drawnScreen(scene.screen, camera, format, window.facingTheEye, scene.look.paneCorner, moment, past);
	return {
		look: scene.look,
		world: drawnWorld(scene.world, format.frame),
		camera: shown,
		window,
		screen,
		light: scene.light,
		callout: scene.callout === null ? null : drawnCallout(scene.callout, moment),
		pins: scene.pins === null ? null : drawnPins(scene.pins, camera, format.frame),
		cursor: scene.cursor,
		note: scene.note === null ? null : drawnNote(scene.note, camera, format.frame, moment),
		caption: scene.caption === null ? null : drawnCaption(scene.caption, moment),
		keys: scene.keys === null ? null : drawnKeys(scene.keys, scene.caption),
		objects,
		leaving,
		laidInTheWorld: laidInTheWorldOf(scene, around),
		overThePage:
			screen.fade !== null ||
			scene.callout !== null ||
			scene.pins !== null ||
			[...objects, ...leaving].some((object) => object.standsIn === 'window'),
		holes,
		lines: drawnLines(everyObject, around, format.frame),
		eye: drawnEye(camera.eye, format.frame, lensLawOf(sharpness))
	};
}

/**
 * The objects of a scene standing in the world, standing and pushed off, in the order the room lays them one over the
 * other: as the stage draws them, the later over the earlier, where they stand on one plane; the farther first where
 * they stand apart.
 */
function laidInTheWorldOf(scene: Scene, around: Surroundings): readonly ListedObject[] {
	const standing = [
		...standingInTheWorldOf('objects', scene.objects, around),
		...standingInTheWorldOf('leaving', scene.leaving, around)
	];
	return standing
		.toSorted((first, second) => laidFartherFirst(first.standing, second.standing))
		.map(({ list, name }) => ({ list, name }));
}

/**
 * The objects of a list of the scene's standing in the world, in the order the stage draws them, and where each
 * stands.
 */
function standingInTheWorldOf(list: ObjectList, objects: Objects, around: Surroundings): readonly StandingListed[] {
	return inDrawingOrder(objects, around)
		.map(([name, object]) => ({ list, name, standing: standingInTheWorld(object, around, around.frame) }))
		.filter(isInTheWorld);
}

/** Whether a listed object stands in the world. */
function isInTheWorld(listed: ListedObject & { readonly standing: Placed | null }): listed is StandingListed {
	return listed.standing !== null;
}

/** Objects as the stage draws them, in the order it draws them, among what stands round them in the scene. */
function drawnObjects(objects: Objects, moment: number, around: Surroundings): readonly DrawnObject[] {
	return inDrawingOrder(objects, around).map(([name, object]) => drawnObject(name, object, moment, around));
}
