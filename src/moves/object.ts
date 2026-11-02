/**
 * The moves of an object (`src/props/object.ts`), alike whatever it shows, written once for every kind that makes
 * one — a title's words, code, the agent's terminal, the ending card, a caption, keys, a piece of the page, an outline,
 * a lens: coming up in its box, in its own way or one of livereel's (`src/props/way.ts`), or sliding in whole from past
 * a side of the frame, pushing the object of its name standing there off past the side across; carried to another
 * place, growing and coming toward the eye on the way, or to a box read off the page; leant and rolled; set apart from
 * what lies under it, ringed, glowing, casting a shadow, blurred, grown or brought toward the eye where it stands
 * (`src/props/effects.ts`); taken back to stand as its box places it; put away where it stands, in its own way or one
 * of livereel's, or slid out past a side. A move takes the object a film names `as`, or its kind's own name, so a film
 * shows several of a kind at once, each moved by its name. What differs by what an object shows is told here, kind by
 * kind: the curve it comes up on in its own way, whether it is ever carried or leant, how it reads a place, and the box
 * it sets off from as it is carried.
 *
 * A move that carries an object to a place sets its box and the scale and depth the film names, one that carries it to
 * a box read off the page its box, one that leans it its angle, one of how it stands out the values the film names,
 * one of what it shows its content, each writing only its own into the object as it stands, so they share a step, each
 * as far along as its own share; a move that brings one sets it whole, standing as its box places it and standing out
 * in no way, and one that puts it away sets it whole as it stands. A move of an object that is not on the screen is
 * refused as it begins.
 *
 * An object shown into a group (`src/props/group.ts`) reads its place, or its source, as it would on the frame, and
 * stands in the group where that is measured from the group's corner, the group standing as it was placed; a box any
 * later move of it reads on the frame is measured so too, so it stands there once the group stands so again. It never
 * slides past the frame's edge, as the group's plane may stand turned from the frame's; it goes in its place, or with
 * its group.
 */
import { viewOf } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import {
	A_FRAME_SIDE,
	type Box,
	type FrameSide,
	type Size,
	boxToward,
	frameScaleOf,
	measuredFrom
} from '../domain/geometry.ts';
import {
	A_NAME,
	A_NUMBER,
	A_PIXELS,
	A_SHARE,
	type Form,
	assertKind,
	assertWritten,
	namesGiven,
	namesSetBy
} from '../domain/handed.ts';
import { AS_PLACED, A_DEPTH, A_SCALE, type Orientation, faceOnNearest, orientationToward } from '../domain/stance.ts';
import {
	A_PLACE,
	type Place,
	acrossFrom,
	ONE_FRAME,
	enteringFrom,
	pastTheEdge,
	placesNamed,
	readsInAnyBox,
	windowPlaced,
	wordsPlaced,
	wordsResized
} from '../domain/place.ts';
import { type Ease, linear } from '../domain/time.ts';
import { MOVES_WITH_THE_CURVE, type MovingBy, namedToward } from '../domain/toward.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type Timing,
	type TimingScript,
	objectPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { EFFECTS_IN_PLACE, EFFECTS_IN_PLACE_NAMES, type EffectsInPlace, NO_EFFECTS } from '../props/effects.ts';
import { type Group, type GroupName, cornerOf, groupFound, groupNamed, standsAsPlaced } from '../props/group.ts';
import {
	type Content,
	type FrameObject,
	type Holder,
	INSIDE_THE_WINDOW,
	IN_THE_WINDOW,
	type Inside,
	ON_THE_FRAME,
	type ObjectName,
	framesPastTheEdge
} from '../props/object.ts';
import { A_WAY, OWN_WAY, type Way, type WayName, comesFromAnEdge, wayNamed } from '../props/way.ts';
import { type Scene, withLeaving, withObject } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';

/** A kind of object, as a film calls its moves, and the name of the object they take where the film names none. */
export type ObjectKind = 'title' | 'code' | 'terminal' | 'ending' | 'caption' | 'keys' | 'piece' | 'outline' | 'lens';

/** The object a move takes: the one a film names `as`, or its kind's own. */
export interface NamedScript {
	readonly as?: ObjectName;
}

/**
 * The way an object comes up in its place, `enter`, one of livereel's, where it does not come up in its own; for a
 * mask or a wipe, the `edge` of its box it comes from, the way's own where none is named.
 */
interface EnterScript {
	readonly enter?: WayName;
	readonly edge?: FrameSide;
}

/** The way an object goes from its place, `leave`, and the `edge` a mask or a wipe goes back to, as it would enter. */
interface LeaveScript {
	readonly leave?: WayName;
	readonly edge?: FrameSide;
}

/**
 * Which object comes up, and the side of the frame it slides in `from`, past the frame's edge, if any, or the way it
 * comes up in its place.
 */
export interface ShowScript extends TimingScript, NamedScript, EnterScript {
	readonly from?: FrameSide;
}

/**
 * How an object that stands where it comes up, never sliding in, comes up: a caption and keys, the one of their kind,
 * and a piece of the page, over its source.
 */
export interface InPlaceShowScript extends TimingScript, EnterScript {}

/** How an object that stands where it comes up goes. */
export interface InPlaceHideScript extends TimingScript, LeaveScript {}

/** The `group` of objects an object comes up standing in, if any. */
export interface GroupedScript {
	readonly group?: GroupName;
}

/** What an object comes up standing in: `inside` the page's window, or in a `group`; neither, the frame. */
export interface NestedScript extends GroupedScript {
	readonly inside?: Inside;
}

/**
 * Which object is carried to another place, and how large it stands there, `scale`, and how far out toward the eye,
 * `depth`, in pixels of a frame 1080 high; either left out as it stands.
 */
export interface ToScript extends TimingScript, NamedScript {
	readonly scale?: number;
	readonly depth?: number;
}

/**
 * Which object is put away, and the side of the frame it slides out `toward`, past the frame's edge, if any, or the
 * way it goes from its place.
 */
export interface HideScript extends TimingScript, NamedScript, LeaveScript {
	readonly toward?: FrameSide;
}

/** Which object a move takes to a box the move works out: back where its box places it, or to a block of the page. */
export interface TakenScript extends TimingScript, NamedScript {}

/** Which object leans, and how: as the window leans, and rolled clockwise in its own plane by `roll`, in degrees. */
export interface ObjectLeanScript extends LeanScript, NamedScript {
	readonly roll?: number;
}

/**
 * Which object stands out, and how: a `ring` along its edge, a `glow` round it and a `shadow` under it, each from 0
 * none to 1 whole, how far it is blurred, `blur`, how many times as large it stands about its middle, `scale`, and how
 * far out toward the eye, `depth`, a blur and a depth in pixels of a frame 1080 high; any left out as it stands.
 */
export interface EffectsScript extends TimingScript, NamedScript {
	readonly ring?: number;
	readonly glow?: number;
	readonly shadow?: number;
	readonly blur?: number;
	readonly scale?: number;
	readonly depth?: number;
}

/** What an object comes up showing, and the box of the frame it comes up in. */
export interface Coming {
	readonly content: Content;
	readonly box: Box;
}

/** How an object comes: sliding in whole `from` a side of the frame, if any, and the way it comes up in its place. */
interface Arrival {
	readonly from: FrameSide | null;
	readonly way: Way;
}

/**
 * An object pushed off past the frame's edge: as it stood, the box it goes to there, and how many frames away that is,
 * which the one pushing it comes from.
 */
interface Push {
	readonly object: FrameObject;
	readonly end: Box;
	readonly frames: number;
}

export const NAMED_FORM: Form<NamedScript> = { as: A_NAME };
const ENTER_FORM: Form<EnterScript> = { enter: A_WAY, edge: A_FRAME_SIDE };
const LEAVE_FORM: Form<LeaveScript> = { leave: A_WAY, edge: A_FRAME_SIDE };
export const SHOW_FORM: Form<ShowScript> = { from: A_FRAME_SIDE, ...ENTER_FORM, ...NAMED_FORM, ...TIMING_FORM };
export const IN_PLACE_SHOW_FORM: Form<InPlaceShowScript> = { ...ENTER_FORM, ...TIMING_FORM };
export const IN_PLACE_HIDE_FORM: Form<InPlaceHideScript> = { ...LEAVE_FORM, ...TIMING_FORM };
export const GROUPED_FORM: Form<GroupedScript> = { group: A_NAME };
export const NESTED_FORM: Form<NestedScript> = { inside: INSIDE_THE_WINDOW, ...GROUPED_FORM };
export const TO_FORM: Form<ToScript> = { scale: A_SCALE, depth: A_DEPTH, ...NAMED_FORM, ...TIMING_FORM };
const HIDE_FORM: Form<HideScript> = { toward: A_FRAME_SIDE, ...LEAVE_FORM, ...TIMING_FORM, ...NAMED_FORM };
export const LEAN_OBJECT_FORM: Form<ObjectLeanScript> = { roll: A_NUMBER, ...LEAN_FORM, ...NAMED_FORM };
const TAKEN_FORM: Form<TakenScript> = { ...NAMED_FORM, ...TIMING_FORM };
const EFFECTS_FORM: Form<EffectsScript> = {
	ring: A_SHARE,
	glow: A_SHARE,
	shadow: A_SHARE,
	blur: A_PIXELS,
	scale: A_SCALE,
	depth: A_DEPTH,
	...NAMED_FORM,
	...TIMING_FORM
};
// The values of an object, or of a group, a move that carries it may set, and one that leans it; and of an object, one
// of what it shows; what each writes is held to them. One that carries an object to a place sets its box, and of its
// scale and depth those the film names; one that carries it to a box read off the page, its box alone
const CARRIED = ['box', 'scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const PLACED = ['box'] as const satisfies readonly (keyof FrameObject)[];
const SET_WHERE_NAMED = ['scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof ToScript)[];
export const LEANT = ['angle'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const CONTENT = ['content'] as const satisfies readonly (keyof FrameObject)[];
// The values a move that takes an object back sets: where it stands and how it faces, together
const BACK = [...CARRIED, ...LEANT] as const satisfies readonly (keyof FrameObject)[];
// A box measured in a group stands as large as on the frame, as the group it is measured for stands as it was placed
const AS_LARGE = 1;
// The curve what an object of each kind shows comes up on in its own way where the film names none: words and lines of
// code, one after another, at an even pace; the terminal, the card, keys, a piece of the page, an outline and a lens,
// fading up whole, on their step's. One that comes up in a way of livereel's comes on its step's
const COMES_UP_ON: { readonly [Kind in ObjectKind]: Ease | null } = {
	title: linear,
	code: linear,
	terminal: null,
	ending: null,
	caption: linear,
	keys: null,
	piece: null,
	outline: null,
	lens: null
};
// What stands over the whole frame on the frame's own terms, never carried or leant: the card, on the frame's own
// ground painted where its box stands; a caption, darkening the frame's edge; keys at the frame's foot, rising clear of
// a caption there
const OVER_THE_WHOLE_FRAME = ['ending', 'caption', 'keys'] as const satisfies readonly Content['kind'][];

/**
 * An object's values, or a group's, a move that carries it writes; an object's one that leans it, and one of what it
 * shows.
 */
export type Carried = Pick<FrameObject, (typeof CARRIED)[number]>;
type Leant = Pick<FrameObject, (typeof LEANT)[number]>;
type Shows = Pick<FrameObject, (typeof CONTENT)[number]>;

// How each value a move that carries something sets moves: its box, scale and depth, each passing its ends with its
// curve, as a place
const CARRYING: MovingBy<Carried> = {
	box: { toward: boxToward },
	scale: MOVES_WITH_THE_CURVE,
	depth: MOVES_WITH_THE_CURVE
};

/** What an object shows that is carried and leant: any but what stands over the whole frame. */
type MovableContent = Exclude<Content, { readonly kind: (typeof OVER_THE_WHOLE_FRAME)[number] }>;

/** An object that is carried and leant, by what it shows. */
interface MovableObject extends FrameObject {
	readonly content: MovableContent;
}

/**
 * An object of a kind coming up, face-on, showing what `comingAt` makes of the scene as the move begins: in place of
 * any of its name, in its own way, on its kind's curve unless the film names one, or in a way of livereel's the film
 * names; or sliding in whole from past a side of the frame where the film names one, pushing the one of its name
 * standing off past the side across, so the two move as one sheet. `place` is the place the film names, none where it
 * names none. An object shown `inside` the page's window reads its place, a box in the window's shares, and slides as
 * if the window's box were the frame; one shown into a `group` stands in it where it would stand on the frame, and
 * never slides. The script is the kind's own, checked by it. Every move of an object is handed its kind and its own
 * name, as a refusal says it: `terminal.open`.
 */
export function objectShow(
	kind: ObjectKind,
	move: string,
	script: ShowScript & NestedScript,
	place: Place | null,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>
): Move {
	const name = script.as ?? kind;
	const holder = holderNamed(script, move);
	refusePlacedInside(holder, place, `${move}'s at`);
	const from = script.from ?? null;
	const way = wayOf(script.enter, script.edge, move);
	if (from !== null && way.kind !== OWN_WAY.kind) {
		throw new FilmError(`${move} comes up in its place in a way, or slides in from a side: not both`);
	}
	if (from !== null && holder.kind === 'group') {
		throw new FilmError(
			`${move} slides nothing in from a side into a group: an object in a group comes up in its place`
		);
	}
	const curve = from === null && way.kind === OWN_WAY.kind ? COMES_UP_ON[kind] : null;
	return {
		part: objectPart(name),
		timing: timingOf(curve === null ? script : { ease: curve, ...script }),
		places: placesNamed(`${move}'s at`, place),
		begin: (beginning) => appearingIn(beginning, name, holder, { from, way }, comingAt, move)
	};
}

/** What a film names an object to come up standing in: the page's window, a group, or, naming neither, the frame. */
function holderNamed(script: NestedScript, move: string): Holder {
	if (script.inside !== undefined && script.group !== undefined) {
		throw new FilmError(`${move} stands an object inside the window or in a group: not both`);
	}
	if (script.inside !== undefined) return IN_THE_WINDOW;
	if (script.group !== undefined) return { kind: 'group', name: script.group };
	return ON_THE_FRAME;
}

/**
 * An object of a kind carried to a place, through the boxes between, growing to the film's scale and coming to its
 * depth on the way, where it names them.
 */
export function objectTo(kind: ObjectKind, move: string, place: Place, script: ToScript): Move {
	assertKind(place, A_PLACE, `${move}'s place`);
	assertWritten(script, TO_FORM, move);
	const name = script.as ?? kind;
	const names = carriedNamed(script);
	return {
		part: objectPart(name),
		valueNames: names,
		timing: timingOf(script),
		places: placesNamed(`${move}'s place`, place),
		begin: (beginning) => carried(beginning, name, place, script, names, move)
	};
}

/**
 * The values a move that carries an object, or a group, to a place sets: its box, and of its scale and depth those
 * named.
 */
export function carriedNamed(script: ToScript): readonly (keyof Carried)[] {
	return [...PLACED, ...namesGiven(script, SET_WHERE_NAMED)];
}

/**
 * An object of a kind standing out as the film names, with a ring, a glow, a shadow or a blur, or larger or nearer the
 * eye where it stands; it sets those alone, so it shares a step with a move that carries it, one that leans it, or
 * another of how it stands out naming others.
 */
export function objectEffects(kind: ObjectKind, move: string, script: EffectsScript): Move {
	assertWritten(script, EFFECTS_FORM, move);
	const names = namesSetBy(script, EFFECTS_IN_PLACE_NAMES, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: names,
		timing: timingOf(script),
		begin: (beginning) => standingOut(beginning, name, script, names, move)
	};
}

/**
 * An object of a kind going where it stands, in its own way, as what it shows goes, or in a way of livereel's the film
 * names; or sliding out past a side of the frame where the film names one; once gone, there is none.
 */
export function objectHide(kind: ObjectKind, move: string, script: HideScript): Move {
	assertWritten(script, HIDE_FORM, move);
	const name = script.as ?? kind;
	const toward = script.toward ?? null;
	const way = wayOf(script.leave, script.edge, move);
	if (toward !== null && way.kind !== OWN_WAY.kind) {
		throw new FilmError(`${move} goes from its place in a way, or slides out toward a side: not both`);
	}
	return {
		part: objectPart(name),
		timing: timingOf(script),
		begin: (beginning) =>
			toward === null ? going(beginning, name, way, move) : slidingOut(beginning, name, toward, move)
	};
}

/**
 * An object of a kind leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled in its own
 * plane by `roll`.
 */
export function objectLean(kind: ObjectKind, move: string, script: ObjectLeanScript): Move {
	assertWritten(script, LEAN_OBJECT_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, name, script, move)
	};
}

/**
 * An object of a kind taken back to stand as its box places it: carried to the box `boxAt` works out as the move
 * begins, as large as that box, on its plane, and face-on by its nearest whole turns, so one spun round goes back
 * without spinning back.
 */
export function objectBack(
	kind: ObjectKind,
	move: string,
	script: TakenScript,
	boxAt: (beginning: Beginning, name: ObjectName) => Box
): Move {
	assertWritten(script, TAKEN_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: BACK,
		timing: timingOf(script),
		begin: (beginning) => goingBack(beginning, name, boxAt, move)
	};
}

/**
 * An object of a kind carried to the box `boxAt` works out of the object as the move begins, as large and as near as it
 * stands: one read off the page, as a block where the camera shows it.
 */
export function objectCarriedTo(
	kind: ObjectKind,
	move: string,
	script: TakenScript,
	boxAt: (beginning: Beginning, object: FrameObject) => Promise<Box>
): Move {
	assertWritten(script, TAKEN_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: PLACED,
		timing: timingOf(script),
		begin: (beginning) => carriedToBox(beginning, name, boxAt, move)
	};
}

/** An object as a move finds it as it begins; one not on the screen is refused, the move named. */
function standing(beginning: Beginning, name: ObjectName, move: string): FrameObject {
	const object = beginning.scene.objects.get(name);
	if (object === undefined) throw new FilmError(`${move} finds no ${name} on the screen`);
	return object;
}

/**
 * A move's beginning as what stands in a holder sees it: on the frame, or in a group, which reads the frame's places,
 * as it is; inside the page's window, its frame the window's box as it stands, so a box in shares of the frame reads as
 * one in shares of the window.
 */
function seenFrom(beginning: Beginning, holder: Holder): Beginning {
	switch (holder.kind) {
		case 'frame':
		case 'group':
			return beginning;
		case 'window': {
			const box = viewOf(beginning.scene.window).box;
			return { ...beginning, format: { ...beginning.format, frame: { width: box.width, height: box.height } } };
		}
	}
}

/**
 * A box a move works out as what stands in a holder sees it, as a box in what the holder measures in: as it is on the
 * frame and inside the window; in a group, measured from the group's corner, where it stands once the group stands as
 * it was placed.
 */
function measuredIn(scene: Scene, holder: Holder, box: Box): Box {
	switch (holder.kind) {
		case 'frame':
		case 'window':
			return box;
		case 'group':
			return measuredFrom(box, cornerOf(groupNamed(scene.groups, holder.name)), AS_LARGE);
	}
}

/**
 * Refuses a place inside the page's window that is not a box in its shares, where a move names one: every name of a
 * place, and every split, is the frame's.
 */
function refusePlacedInside(holder: Holder, place: Place | null, where: string): void {
	if (holder.kind === 'window' && place !== null && !readsInAnyBox(place)) {
		throw new FilmError(`${where} inside the window is a box in the window's shares, { left, top, width, height }`);
	}
}

/** An object a move carries or leans as it begins; refused where none stands, or it shows what is never moved so. */
function movable(beginning: Beginning, name: ObjectName, move: string): MovableObject {
	const object = standing(beginning, name, move);
	if (!isMovable(object)) {
		throw new FilmError(`${move} would move the ${name} object: what it shows stands over the whole frame alone`);
	}
	return object;
}

function isMovable(object: FrameObject): object is MovableObject {
	return !OVER_THE_WHOLE_FRAME.some((kind) => kind === object.content.kind);
}

/** A move of what an object of a name shows, which sets that alone, so it shares a step with one that carries it. */
export function contentMove(
	name: ObjectName,
	timing: Timing,
	begin: (beginning: Beginning) => Change | Promise<Change>
): Move {
	return { part: objectPart(name), valueNames: CONTENT, timing, begin };
}

/** What an object shows as a move finds it as it begins; refused where none stands, or it shows another kind. */
export function contentOf<Kind extends Content['kind']>(
	beginning: Beginning,
	name: ObjectName,
	move: string,
	kind: Kind
): Extract<Content, { readonly kind: Kind }> {
	const content = standing(beginning, name, move).content;
	if (!isOfKind(content, kind)) throw new FilmError(`${move} finds the ${name} showing ${content.kind}, not ${kind}`);
	return content;
}

/**
 * Where an object stands in a place: words and code read it as words do, the terminal and a piece of the page as the
 * window does.
 */
export function placedFor(kind: MovableContent['kind'], format: Format, place: Place): Box {
	switch (kind) {
		case 'words':
		case 'code':
			return wordsPlaced(format, place);
		case 'terminal':
		case 'piece':
		case 'outline':
		case 'lens':
			return windowPlaced(format, place);
	}
}

/** What an object shows, written into it as it stands at each progress. */
export function showing(name: ObjectName, contentAt: (progress: number) => Content): Change {
	return writing(name, (progress): Shows => ({ content: contentAt(progress) }));
}

/**
 * An object coming up in what it stands in, showing what `comingAt` makes of the scene as seen from there, once it has
 * read the page where it must; in a group, only while the group stands as it was placed.
 */
async function appearingIn(
	beginning: Beginning,
	name: ObjectName,
	holder: Holder,
	arrival: Arrival,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>,
	move: string
): Promise<Change> {
	refuseJoiningUnplaced(beginning, holder, move);
	const within = seenFrom(beginning, holder);
	const coming = await comingAt(within);
	const measured = { ...coming, box: measuredIn(beginning.scene, holder, coming.box) };
	return appearing(within, name, holder, measured, arrival, move);
}

/**
 * Refuses an object coming up in a group none of stands, or one that does not stand as it was placed, as only then is
 * where the object would stand on the frame where it stands in the group.
 */
function refuseJoiningUnplaced(beginning: Beginning, holder: Holder, move: string): void {
	if (holder.kind !== 'group') return;
	if (!standsAsPlaced(groupFound(beginning.scene.groups, holder.name, move))) {
		throw new FilmError(
			`${move} joins the group "${holder.name}" only while it stands as it was placed: face-on by whole turns, as large as its box, on the frame's plane`
		);
	}
}

/**
 * An object coming into its box in the way it comes up there, or from a frame past it where it slides in, pushing the
 * one of its name standing: from as many frames past as that one goes, so the two move as one sheet.
 */
function appearing(
	beginning: Beginning,
	name: ObjectName,
	holder: Holder,
	coming: Coming,
	arrival: Arrival,
	move: string
): Change {
	const frame = beginning.format.frame;
	const push = pushOf(beginning.scene, name, arrival.from, frame, move);
	const start = enteringFrom(coming.box, arrival.from, frame, push?.frames ?? ONE_FRAME);
	return (scene, progress) =>
		withLeaving(
			withObject(scene, name, {
				inside: holder,
				box: boxToward(start, coming.box, progress),
				...AS_PLACED,
				...NO_EFFECTS,
				shown: shownComing(arrival.from, progress),
				// Not going: neither gone nor on its way out
				gone: NONE,
				way: arrival.way,
				content: coming.content
			}),
			name,
			pushedAt(push, progress)
		);
}

/**
 * The object on its way to a place, from the box what it shows sets off from, and to the film's scale and depth from
 * its own where it names them, a depth given in pixels of a frame 1080 high: the values named written into it.
 */
function carried(
	beginning: Beginning,
	name: ObjectName,
	place: Place,
	script: ToScript,
	names: readonly (keyof Carried)[],
	move: string
): Change {
	const object = movable(beginning, name, move);
	refusePlacedInside(object.inside, place, `${move}'s place`);
	const placed = placedFor(object.content.kind, seenFrom(beginning, object.inside).format, place);
	const end = measuredIn(beginning.scene, object.inside, placed);
	const from: Carried = { box: settingOff(object.content, object.box, end), scale: object.scale, depth: object.depth };
	const to: Carried = {
		box: end,
		scale: script.scale ?? object.scale,
		depth: depthAsked(script.depth, object.depth, beginning.format.frame)
	};
	refuseNearingInside(object, to.depth, name, move);
	return writing(name, (progress) => carriedAlong(from, to, names, progress));
}

/** Where something carried stands `progress` of the way from one box, scale and depth to another: the values named. */
export function carriedAlong(
	from: Carried,
	to: Carried,
	names: readonly (keyof Carried)[],
	progress: number
): Partial<Carried> {
	return namedToward(CARRYING, from, to, names, progress);
}

/**
 * The object on its way from how it stands out to the film's, those values it names written into it, a blur and a
 * depth given in pixels of a frame 1080 high.
 */
function standingOut(
	beginning: Beginning,
	name: ObjectName,
	script: EffectsScript,
	names: readonly (keyof EffectsInPlace)[],
	move: string
): Change {
	const object = movable(beginning, name, move);
	const to: EffectsInPlace = {
		ring: fractionOf(script.ring ?? object.ring),
		glow: fractionOf(script.glow ?? object.glow),
		shadow: fractionOf(script.shadow ?? object.shadow),
		blur: script.blur ?? object.blur,
		scale: script.scale ?? object.scale,
		depth: depthAsked(script.depth, object.depth, beginning.format.frame)
	};
	refuseNearingInside(object, to.depth, name, move);
	return writing(name, (progress) => namedToward(EFFECTS_IN_PLACE, object, to, names, progress));
}

/**
 * Refuses an object brought to a depth of its own inside the page's window, where it stands flat on the window's
 * plane.
 */
function refuseNearingInside(object: FrameObject, depth: number, name: ObjectName, move: string): void {
	if (object.inside.kind === 'window' && depth !== object.depth) {
		throw new FilmError(
			`${move} would bring the ${name} toward the eye alone: it stands inside the window, flat on it`
		);
	}
}

/**
 * The object's orientation on its way from how it faces to the film's. Inside the page's window it leans as the window
 * does, and a lean of its own would only lie flat on the window's, so a tilt or a turn is refused there: it rolls.
 */
function leaning(beginning: Beginning, name: ObjectName, script: ObjectLeanScript, move: string): Change {
	const object = movable(beginning, name, move);
	const from = object.angle;
	const to = orientedFrom(from, script);
	if (object.inside.kind === 'window' && (to.tilt !== from.tilt || to.turn !== from.turn)) {
		throw new FilmError(
			`${move} would tilt or turn the ${name} alone: it stands inside the window, and leans as it does; it rolls in it`
		);
	}
	return writing(name, (progress): Leant => ({ angle: orientationToward(from, to, progress) }));
}

/**
 * The orientation a lean goes to from how an object, or a group, faces: the film's, each value it leaves out as it
 * stood.
 */
export function orientedFrom(standing: Orientation, script: ObjectLeanScript): Orientation {
	return { ...leantFrom(standing, script), roll: script.roll ?? standing.roll };
}

/**
 * The depth a film gives an object, or a group, in pixels of a frame 1080 high, as the frame's own pixels; as it
 * stands, where the film gives none.
 */
export function depthAsked(depth: number | undefined, standing: number, frame: Size): number {
	return depth === undefined ? standing : depth * frameScaleOf(frame);
}

/**
 * The object on its way back from how it stands to the box `boxAt` works out, as large as its box, on its plane, and
 * face-on by its nearest whole turns.
 */
function goingBack(
	beginning: Beginning,
	name: ObjectName,
	boxAt: (beginning: Beginning, name: ObjectName) => Box,
	move: string
): Change {
	const object = movable(beginning, name, move);
	const to: Carried = {
		box: measuredIn(beginning.scene, object.inside, boxAt(beginning, name)),
		scale: AS_PLACED.scale,
		depth: AS_PLACED.depth
	};
	const faceOn = faceOnNearest(object.angle);
	return writing(name, (progress): Partial<Carried> & Leant => ({
		...carriedAlong(object, to, CARRIED, progress),
		angle: orientationToward(object.angle, faceOn, progress)
	}));
}

/** The object on its way to the box `boxAt` works out of it, its box written into it alone. */
async function carriedToBox(
	beginning: Beginning,
	name: ObjectName,
	boxAt: (beginning: Beginning, object: FrameObject) => Promise<Box>,
	move: string
): Promise<Change> {
	const object = movable(beginning, name, move);
	const end = measuredIn(beginning.scene, object.inside, await boxAt(beginning, object));
	const to: Carried = { box: end, scale: object.scale, depth: object.depth };
	return writing(name, (progress) => carriedAlong(object, to, PLACED, progress));
}

/** The object going where it stands, in the way it goes; once gone, none. */
function going(beginning: Beginning, name: ObjectName, way: Way, move: string): Change {
	const object = standing(beginning, name, move);
	return (scene, progress) =>
		withObject(scene, name, untilTheEnd(progress, { ...object, way, gone: fractionOf(progress) }));
}

/**
 * The way a film names an object to come up or go, from the edge it names; its own way where it names none. An edge is
 * refused for a way that comes from none, and named for no way at all.
 */
function wayOf(name: WayName | undefined, edge: FrameSide | undefined, move: string): Way {
	if (edge !== undefined && (name === undefined || !comesFromAnEdge(name))) {
		throw new FilmError(`${move} names an edge, which goes only with a mask or a wipe`);
	}
	return wayNamed(name ?? null, edge ?? null);
}

/**
 * The object sliding out whole past a side of the frame, a frame away, or farther where it is drawn past its box, until
 * all of it stands past the edge; once there, none.
 */
function slidingOut(beginning: Beginning, name: ObjectName, toward: FrameSide, move: string): Change {
	const object = standing(beginning, name, move);
	if (object.inside.kind === 'group') {
		throw new FilmError(
			`${move} would slide the ${name} out toward a side from its group: it goes in its place, or with its group`
		);
	}
	const frame = seenFrom(beginning, object.inside).format.frame;
	const frames = framesPastTheEdge(object, toward, frame);
	const end = pastTheEdge(object.box, toward, frame, frames);
	return (scene, progress) =>
		withObject(scene, name, untilTheEnd(progress, { ...object, box: boxToward(object.box, end, progress) }));
}

/**
 * Where what an object shows sets off from, carried to a box: words in a place at the size of the box they go to,
 * keeping where they read from, so their lines change once, where they would break anew on every frame of the way;
 * anything else from its box, growing or shrinking along the way.
 */
function settingOff(content: MovableContent, box: Box, end: Box): Box {
	switch (content.kind) {
		case 'words':
			return content.onGround ? box : wordsResized(box, end, content.align);
		case 'code':
		case 'terminal':
		case 'piece':
		case 'outline':
		case 'lens':
			return box;
	}
}

/** Whether what an object shows is of a kind. */
function isOfKind<Kind extends Content['kind']>(
	content: Content,
	kind: Kind
): content is Extract<Content, { readonly kind: Kind }> {
	return content.kind === kind;
}

/**
 * How far an object coming into its box has come up, `progress` of the way: whole from the start where it slides in
 * from a side, so it travels as one piece, as far as its move where it comes up in place.
 */
function shownComing(from: FrameSide | null, progress: number): Fraction {
	return from === null ? fractionOf(progress) : WHOLE;
}

/**
 * What an object of a name sliding in from a side pushes off: the one of its name standing, whole as it stands, and the
 * box a frame past its own on the side across, or farther where it is drawn past its box, until all of it stands past
 * the edge; none where none stands, or nothing slides in. One standing in a group, which never slides, is refused.
 */
function pushOf(scene: Scene, name: ObjectName, from: FrameSide | null, frame: Size, move: string): Push | null {
	const standingThere = scene.objects.get(name);
	if (from === null || standingThere === undefined) return null;
	if (standingThere.inside.kind === 'group') {
		throw new FilmError(`${move} would push the ${name} off past the frame's edge from its group: hide it first`);
	}
	const toward = acrossFrom(from);
	const frames = framesPastTheEdge(standingThere, toward, frame);
	return { object: standingThere, end: pastTheEdge(standingThere.box, toward, frame, frames), frames };
}

/** The object pushed off, `progress` of its way; once past the edge, none. */
function pushedAt(push: Push | null, progress: number): FrameObject | null {
	if (push === null) return null;
	return untilTheEnd(progress, { ...push.object, box: boxToward(push.object.box, push.end, progress) });
}

/** A change that writes some of an object's values into it as it stands, leaving the rest as other moves set them. */
function writing(name: ObjectName, valuesAt: (progress: number) => Partial<FrameObject>): Change {
	return (scene, progress) => written(scene, name, valuesAt(progress));
}

/**
 * A scene with some of an object's values written into it as it stands, for a move that found it standing as it began:
 * only a move that sets it whole puts it away, and none does while another of its moves runs, but a group put away
 * takes what stands in it, so an object gone so is left gone.
 */
function written(scene: Scene, name: ObjectName, values: Partial<FrameObject>): Scene {
	const object = scene.objects.get(name);
	return object === undefined ? scene : withObject(scene, name, { ...object, ...values });
}
