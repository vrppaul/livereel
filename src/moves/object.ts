/**
 * The moves of an object (`src/props/object.ts`), alike whatever it shows, written once for every kind that makes
 * one — a title's words, code, the agent's terminal, the ending card, a caption, keys, a piece of the page, an outline,
 * a lens, a thing of the film's own: coming up in its box, in its own way or one of livereel's (`src/props/way.ts`), or
 * sliding in whole from past a side of the frame, pushing the object of its name standing there off past the side
 * across; carried to another
 * place, growing and coming toward the eye on the way, to a box read off the page, or onto a block of the page to lie
 * there; leant and rolled; set apart from what lies under it, ringed and glowing in the accent or a colour of the
 * film's, casting a shadow, blurred, melted toward a side, grown or brought toward the eye where it stands
 * (`src/props/effects.ts`); taken back to stand as its box places it; put away where it stands, in its own way or one
 * of livereel's, or slid out past a side. A move takes the object a film names `as`, or its kind's own name, so a film
 * shows several of a kind at once, each moved by its name; it takes only an object of its kind, and refuses one that
 * shows another. What differs by what an object shows is handed here by the kind's own module: the curve it comes up
 * on in its own way, how it reads a place, and the box it sets off from as it is carried there.
 *
 * A move that carries an object to a place sets its box and the scale and depth the film names, one that carries it to
 * a box read off the page its box, one that carries it onto a block of the page what it stands in and its box, one
 * that leans it its angle, one of how it stands out the values the film names, one of what it shows its content, each
 * writing only its own into the object as it stands, so they share a step, each as far along as its own share; a move
 * that brings one sets it whole, standing as its box places it and standing out in no way, and one that puts it away
 * sets it whole as it stands. A move of an object that is not on the screen is refused as it begins.
 *
 * An object shown into a group (`src/props/group.ts`) reads its place, or its source, as it would on the frame, and
 * stands in the group where that is measured from the group's corner, the group standing as it was placed; a box any
 * later move of it reads on the frame is measured so too, so it stands there once the group stands so again. It never
 * slides past the frame's edge, as the group's plane may stand turned from the frame's; it goes in its place, or with
 * its group.
 *
 * An object carried onto a block of the page lies on the page from the moment that move begins, its box measured on
 * the screen as the camera shows it then, so it lands on the block wherever the camera goes; a box any later move of
 * it reads on the frame is measured on the screen so too. Only one standing on the frame is carried there, lying flat,
 * face-on and at no depth of its own, as it lies flat on the page as one inside the window stands flat on it, and while
 * the window faces the frame front on, as only then does a box of the frame stand on the screen as a box. It never
 * slides from there, as the page's plane may stand leant from the frame's: it goes in its place.
 */
import { boxOnTheScreen, standingAt, viewOf } from '../domain/camera.ts';
import { facesTheFrame, showsItsFront } from '../domain/matrix.ts';
import { FilmError } from '../domain/errors.ts';
import { eyeAtRest } from '../domain/eye.ts';
import type { Format } from '../domain/format.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import { A_FRAME_SIDE, BOX_SPACE, type Box, type FrameSide, boxToward, measuredFrom } from '../domain/geometry.ts';
import {
	A_COLOUR,
	A_NAME,
	A_NUMBER,
	A_PIXELS,
	A_SHARE,
	type Form,
	OfForm,
	assertKind,
	assertWritten,
	namesGiven,
	namesSetBy,
	needed
} from '../domain/handed.ts';
import { AS_PLACED, A_SCALE, angleToward, angledAs, depthAsked, depthsNamed, faceOnNearest } from '../domain/stance.ts';
import {
	A_PLACE,
	type Place,
	type PlaceNamed,
	acrossFrom,
	ONE_FRAME,
	enteringFrom,
	pastTheEdge,
	placesNamed,
	readsInAnyBox,
	windowPlaced
} from '../domain/place.ts';
import type { Ease } from '../domain/curves.ts';
import { type Path, type Through, pathOf } from '../domain/path.ts';
import { MOVES_WITH_THE_CURVE, type MovingBy, namedToward } from '../domain/toward.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type Timing,
	type TimingScript,
	objectPart,
	shownBox,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { EFFECTS_IN_PLACE, EFFECTS_IN_PLACE_NAMES, type EffectsInPlace, NO_EFFECTS } from '../props/effects.ts';
import {
	type GroupName,
	type Holder,
	type Holders,
	IN_THE_WINDOW,
	IN_THE_WORLD,
	ON_THE_FRAME,
	ON_THE_PAGE,
	groupNamed
} from '../domain/placement.ts';
import { type Group, groupFound, standsAsPlaced } from '../props/group.ts';
import {
	type Content,
	type FrameObject,
	AN_INSIDE,
	type Inside,
	type ObjectName,
	framesPastTheEdge
} from '../props/object.ts';
import { A_WAY, OWN_WAY, type Way, type WayName, comesFromAnEdge, wayNamed } from '../props/way.ts';
import { type Scene, cameraOf, withEye, withLeaving, withObject, withProp } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';
import { cameraFrontOn } from './source.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/** A kind of what an object shows, as a film calls its moves, and the name of the object they take where it names none. */
export type ShownKind = Content['kind'];

/** What an object of a kind shows. */
export type ShownOf<Kind extends ShownKind> = Extract<Content, { readonly kind: Kind }>;

/** An object showing what one of a kind shows. */
export type ShowingOf<Kind extends ShownKind> = FrameObject & { readonly content: ShownOf<Kind> };

/**
 * How a kind reads a place into a box in a format, and the box it sets off from, carried from where it stands toward
 * the box a place gives it. Each is handed what the object shows, for a kind whose reading turns on it.
 */
export interface PlaceReading<Kind extends ShownKind> {
	readonly placed: (format: Format, place: Place, shown: ShownOf<Kind>) => Box;
	readonly settingOff: (standing: Box, end: Box, shown: ShownOf<Kind>) => Box;
}

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

/**
 * The `group` of objects an object comes up standing in, if any, and its `zIndex` there, how high it is drawn among the
 * others of the group: the higher over the lower, and as they came where it is alike, as where the film names none.
 */
export interface GroupedScript {
	readonly group?: GroupName;
	readonly zIndex?: number;
}

/**
 * What an object comes up standing in: `inside` the page's window or the world, which the eye moves through, or in a
 * `group`; neither, the frame, which rides with the eye.
 */
export interface NestedScript extends GroupedScript {
	readonly inside?: Inside;
}

/**
 * Which object is carried to another place, the places it passes `through` on its way and how its way goes through
 * them, and how large it stands there, `scale`, and how far out toward the eye, `depth`, in pixels of a frame 1080
 * high; either left out as it stands.
 */
export interface ToScript extends TimingScript, NamedScript, ThroughScript<Place> {
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

/** Which object leans, and how: as the window leans. */
export interface ObjectLeanScript extends LeanScript, NamedScript {}

/**
 * Which object stands out, and how: a `ring` along its edge, a `glow` round it and a `shadow` under it, each from 0
 * none to 1 whole, how far it is blurred, `blur`, the `colour` of its ring and glow in hex, how far in from a side of
 * what it shows it melts into nothing there, `melt`, a share of it, how many times as large it stands about its
 * middle, `scale`, and how far out toward the eye, `depth`, a blur and a depth in pixels of a frame 1080 high; any left
 * out as it stands.
 */
export interface EffectsScript extends TimingScript, NamedScript {
	readonly ring?: number;
	readonly glow?: number;
	readonly shadow?: number;
	readonly blur?: number;
	readonly colour?: string;
	readonly melt?: MeltScript;
	readonly scale?: number;
	readonly depth?: number;
}

/** How an object melts, as a film writes it: the side of what it shows it melts toward, and how far in, from 0 to 1. */
interface MeltScript {
	readonly toward: FrameSide;
	readonly share: number;
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
export const GROUPED_FORM: Form<GroupedScript> = { group: A_NAME, zIndex: A_NUMBER };
export const NESTED_FORM: Form<NestedScript> = { inside: AN_INSIDE, ...GROUPED_FORM };
// What an object stands in that a film shows inside what it names
const HOLDER_INSIDE: { readonly [Name in Inside]: Holder } = { window: IN_THE_WINDOW, world: IN_THE_WORLD };
const A_MELT = new OfForm<MeltScript>(
	{ toward: needed(A_FRAME_SIDE), share: needed(A_SHARE) },
	'a melt: { toward, share }, a side of what an object shows and how far in from it it melts, from 0 to 1'
);
export const TO_FORM: Form<ToScript> = {
	scale: A_SCALE,
	depth: A_NUMBER,
	...throughFormOf(A_PLACE, 'a list of places'),
	...NAMED_FORM,
	...TIMING_FORM
};
const HIDE_FORM: Form<HideScript> = { toward: A_FRAME_SIDE, ...LEAVE_FORM, ...TIMING_FORM, ...NAMED_FORM };
export const LEAN_OBJECT_FORM: Form<ObjectLeanScript> = { ...LEAN_FORM, ...NAMED_FORM };
const TAKEN_FORM: Form<TakenScript> = { ...NAMED_FORM, ...TIMING_FORM };
const EFFECTS_FORM: Form<EffectsScript> = {
	ring: A_SHARE,
	glow: A_SHARE,
	shadow: A_SHARE,
	blur: A_PIXELS,
	colour: A_COLOUR,
	melt: A_MELT,
	scale: A_SCALE,
	depth: A_NUMBER,
	...NAMED_FORM,
	...TIMING_FORM
};
// The values of an object, or of a group, a move that carries it may set, and one that leans it; and of an object, one
// of what it shows; what each writes is held to them. One that carries an object to a place sets its box, and of its
// scale and depth those the film names; one that carries it to a box read off the page, its box alone; one that
// carries it onto a block of the page, what it stands in and its box
const CARRIED = ['box', 'scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const PLACED = ['box'] as const satisfies readonly (keyof FrameObject)[];
const LAID_ONTO = ['inside', 'box'] as const satisfies readonly (keyof FrameObject)[];
const SET_WHERE_NAMED = ['scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof ToScript)[];
export const LEANT = ['angle'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const CONTENT = ['content'] as const satisfies readonly (keyof FrameObject)[];
// The values a move that takes an object back sets: where it stands and how it faces, together
const BACK = [...CARRIED, ...LEANT] as const satisfies readonly (keyof FrameObject)[];
// A box measured in a group stands as large as on the frame, as the group it is measured for stands as it was placed
const AS_LARGE = 1;

/**
 * The curve what a kind shows comes up on in its own way, where the film names none, for a kind whose module reads how
 * far it has come, fading up whole: its step's. One that comes up in a way of livereel's comes on its step's whatever
 * its kind.
 */
export const THE_STEPS_CURVE = null;

/**
 * How a pane reads a place, as the page's window reads one — a terminal, a piece of the page, an outline — setting off
 * toward it from its box as it stands, growing or shrinking along the way.
 */
export const READ_AS_THE_WINDOW: PlaceReading<ShownKind> = { placed: windowPlaced, settingOff: fromItsBox };

/**
 * An object's values, or a group's, a move that carries it writes; an object's one that leans it, and one of what it
 * shows.
 */
export type Carried = Pick<FrameObject, (typeof CARRIED)[number]>;
type Lying = Pick<FrameObject, (typeof LAID_ONTO)[number]>;
type Leant = Pick<FrameObject, (typeof LEANT)[number]>;
type Shows = Pick<FrameObject, (typeof CONTENT)[number]>;

/**
 * What a move that carries an object, or a group, to a place knows as it is made: the place, the places it passes on
 * its way and its path's course through them, the scale and depth the film names, and the values it sets.
 */
export interface Carrying {
	readonly place: Place;
	readonly through: Through<Place>;
	readonly script: ToScript;
	readonly names: readonly (keyof Carried)[];
}

// How each value a move that carries something sets moves: its box, scale and depth, each passing its ends with its
// curve, as a place
const CARRYING: MovingBy<Carried> = {
	box: { toward: boxToward },
	scale: MOVES_WITH_THE_CURVE,
	depth: MOVES_WITH_THE_CURVE
};

/**
 * An object of a kind coming up, face-on, showing what `comingAt` makes of the scene as the move begins: in place of
 * any of its name, in its own way, on the kind's own curve unless the film names one, or in a way of livereel's the
 * film names; or sliding in whole from past a side of the frame where the film names one, pushing the one of its name
 * standing off past the side across, so the two move as one sheet. `place` is the place the film names, none where it
 * names none. An object shown `inside` the page's window reads its place, a box in the window's shares, and slides as
 * if the window's box were the frame; one shown into a `group` stands in it where it would stand on the frame, and
 * never slides. The script is the kind's own, checked by it. Every move of an object is handed its kind and its own
 * name, as a refusal says it: `terminal.open`.
 */
export function objectShow(
	kind: ShownKind,
	move: string,
	script: ShowScript & NestedScript,
	place: Place | null,
	ownCurve: Ease | null,
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
	const curve = from === null && way.kind === OWN_WAY.kind ? ownCurve : THE_STEPS_CURVE;
	return {
		part: objectPart(name),
		timing: timingOf(curve === null ? script : { ease: curve, ...script }),
		places: placesNamed(`${move}'s at`, place),
		begin: (beginning) => appearingIn(beginning, name, holder, { from, way }, comingAt, move)
	};
}

/**
 * What a film names an object to come up standing in: the page's window, the world, a group, at its zIndex there,
 * or, naming none, the frame. A zIndex outside a group is refused, as it orders nothing there.
 */
function holderNamed(script: NestedScript, move: string): Holder {
	if (script.inside !== undefined && script.group !== undefined) {
		throw new FilmError(`${move} stands an object inside the window or the world, or in a group: not both`);
	}
	if (script.zIndex !== undefined && script.group === undefined) {
		throw new FilmError(`${move} orders an object by its zIndex only in a group: name its group`);
	}
	if (script.inside !== undefined) return HOLDER_INSIDE[script.inside];
	if (script.group !== undefined) return { kind: 'group', name: script.group, zIndex: script.zIndex ?? null };
	return ON_THE_FRAME;
}

/**
 * An object of a kind carried to a place, read as the kind reads one, through the places the film names on its way,
 * growing to the film's scale and coming to its depth on the way, where it names them.
 */
export function objectTo<Kind extends ShownKind>(
	kind: Kind,
	move: string,
	place: Place,
	script: ToScript,
	reading: PlaceReading<Kind>
): Move {
	assertKind(place, A_PLACE, `${move}'s place`);
	assertWritten(script, TO_FORM, move);
	const carrying = carryingWritten(place, script, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: carrying.names,
		timing: timingOf(script),
		places: placesOnTheWay(move, carrying),
		depths: depthsNamed(`${move}'s depth`, script.depth),
		begin: (beginning) => carried(beginning, name, kind, carrying, reading, move)
	};
}

/** A move's carrying as the film writes it, its keys and course refused where the script names them wrongly. */
export function carryingWritten(place: Place, script: ToScript, move: string): Carrying {
	return { place, through: throughWritten(script, move), script, names: carriedNamed(script) };
}

/** The places a move that carries something names: where it goes, and those it passes on its way. */
export function placesOnTheWay(move: string, carrying: Carrying): readonly PlaceNamed[] {
	return [
		...placesNamed(`${move}'s place`, carrying.place),
		...carrying.through.keys.flatMap((key) => placesNamed(`${move}'s through`, key))
	];
}

/**
 * The values a move that carries an object, or a group, to a place sets: its box, and of its scale and depth those
 * named.
 */
function carriedNamed(script: ToScript): readonly (keyof Carried)[] {
	return [...PLACED, ...namesGiven(script, SET_WHERE_NAMED)];
}

/**
 * An object of a kind standing out as the film names, with a ring, a glow, a shadow or a blur, a colour of its ring
 * and glow, a melt toward a side, or larger or nearer the eye where it stands; it sets those alone, so it shares a step
 * with a move that carries it, one that leans it, or another of how it stands out naming others.
 */
export function objectEffects(kind: ShownKind, move: string, script: EffectsScript): Move {
	assertWritten(script, EFFECTS_FORM, move);
	const names = namesSetBy(script, EFFECTS_IN_PLACE_NAMES, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: names,
		timing: timingOf(script),
		depths: depthsNamed(`${move}'s depth`, script.depth),
		begin: (beginning) => standingOut(beginning, name, kind, script, names, move)
	};
}

/**
 * An object of a kind going where it stands, in its own way, as what it shows goes, or in a way of livereel's the film
 * names; or sliding out past a side of the frame where the film names one; once gone, there is none.
 */
export function objectHide(kind: ShownKind, move: string, script: HideScript): Move {
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
			toward === null ? going(beginning, name, kind, way, move) : slidingOut(beginning, name, kind, toward, move)
	};
}

/**
 * An object of a kind leant back from its top edge by `tilt`, swung about its middle by `turn`, rolled in its own plane
 * by `roll` and turned over round its own width by `over`.
 */
export function objectLean(kind: ShownKind, move: string, script: ObjectLeanScript): Move {
	assertWritten(script, LEAN_OBJECT_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, name, kind, script, move)
	};
}

/**
 * An object of a kind taken back to stand as its box places it: carried to the box `boxAt` works out of what it shows
 * as the move begins, as large as that box, on its plane, and face-on by its nearest whole turns, so one spun round
 * goes back without spinning back.
 */
export function objectBack<Kind extends ShownKind>(
	kind: Kind,
	move: string,
	script: TakenScript,
	boxAt: (beginning: Beginning, shown: ShownOf<Kind>) => Box
): Move {
	assertWritten(script, TAKEN_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: BACK,
		timing: timingOf(script),
		begin: (beginning) => goingBack(beginning, name, kind, boxAt, move)
	};
}

/**
 * An object of a kind carried to the box `boxAt` works out of the object as the move begins, as large and as near as it
 * stands: one read off the page, as a block where the camera shows it.
 */
export function objectCarriedTo(
	kind: ShownKind,
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
		begin: (beginning) => carriedToBox(beginning, name, kind, boxAt, move)
	};
}

/**
 * An object of a kind carried onto the first block a selector matches, or a box of the screen, to lie on the page as
 * large as the block: from where it stands as the move begins, measured on the screen as the camera shows it then, so
 * it lands on the block wherever the camera goes on its way, and keeps that place on the screen after.
 */
export function objectOnto(kind: ShownKind, move: string, target: Target, script: TakenScript): Move {
	assertKind(target, A_TARGET, `${move}'s target`);
	assertWritten(script, TAKEN_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: LAID_ONTO,
		timing: timingOf(script),
		begin: (beginning) => laidOnto(beginning, name, kind, target, move)
	};
}

/** What objects stand in as a move begins: the camera as the scene shows it, and the groups standing. */
export function holdersAsTheyStand(beginning: Beginning): Holders {
	return { camera: cameraOf(beginning.scene, beginning.format), groups: beginning.scene.groups };
}

/** An object as a move finds it as it begins, whatever it shows; one not on the screen is refused, the move named. */
export function standing(beginning: Beginning, name: ObjectName, move: string): FrameObject {
	const object = beginning.scene.objects.get(name);
	if (object === undefined) throw new FilmError(`${move} finds no ${name} on the screen`);
	return object;
}

/** An object of a kind as a move of that kind finds it as it begins; refused where none stands, or it shows another. */
export function standingOfKind<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	move: string,
	kind: Kind
): ShowingOf<Kind> {
	const object = standing(beginning, name, move);
	if (!shows(object, kind)) {
		throw new FilmError(`${move} finds the ${name} showing ${object.content.kind}, not ${kind}`);
	}
	return object;
}

/** Whether an object shows what one of a kind shows. */
function shows<Kind extends ShownKind>(object: FrameObject, kind: Kind): object is ShowingOf<Kind> {
	return object.content.kind === kind;
}

/**
 * A move's beginning as what stands in a holder sees it: on the frame, on the page or in a group, which read the
 * frame's places, as it is; inside the page's window, its frame the window's box as it stands, so a box in shares of
 * the frame reads as one in shares of the window.
 */
function seenFrom(beginning: Beginning, holder: Holder): Beginning {
	switch (holder.kind) {
		case 'frame':
		case 'world':
		case 'page':
		case 'group':
			return beginning;
		case 'window': {
			const box = viewOf(beginning.scene.window).box;
			return { ...beginning, format: { ...beginning.format, frame: { width: box.width, height: box.height } } };
		}
	}
}

/**
 * A move's beginning as what stands in a holder reads the page through the camera: in the world, the camera standing
 * where it stands and seen from the eye at rest, the frame's plane then the world's, so a box read there stands over
 * what it was read off wherever the eye stands; anywhere else, as the eye stands. The camera is stood at its pose, as
 * the eye paces a camera's way through keys.
 */
function readFrom(beginning: Beginning, holder: Holder): Beginning {
	switch (holder.kind) {
		case 'world': {
			const pose = cameraOf(beginning.scene, beginning.format).pose;
			const atRest = eyeAtRest(beginning.scene.eye.focalLength);
			const asAtRest = withEye(withProp(beginning.scene, 'camera', standingAt(pose)), atRest);
			return { ...beginning, scene: asAtRest };
		}
		case 'frame':
		case 'window':
		case 'page':
		case 'group':
			return beginning;
	}
}

/**
 * A box a move works out as what stands in a holder sees it, as a box in what the holder measures in, for the object
 * of a name: as it is on the frame and inside the window; on the page, where the camera shows it on the screen as the
 * move begins, the window facing the frame front on; in a group, measured from the group's corner, where it stands once
 * the group stands as it was placed.
 */
function measuredIn(beginning: Beginning, holder: Holder, box: Box, name: ObjectName, move: string): Box {
	switch (holder.kind) {
		case 'frame':
		case 'world':
		case 'window':
			return box;
		case 'page': {
			const camera = cameraFrontOn(beginning, `${move} measures the ${name} on the page`);
			return boxOnTheScreen(camera, beginning.format.frame, box);
		}
		case 'group':
			return measuredFrom(box, groupNamed(beginning.scene.groups, holder.name).box, AS_LARGE);
	}
}

/**
 * Where an object of a name stands on the screen as a move begins: where it lies on the page, or, standing on the frame
 * and lying flat, where the camera shows its box; one leant or near the eye on the frame is refused, as it would lie
 * flat at once, and one inside the window or in a group, as it goes with what it stands in.
 */
function onThePage(beginning: Beginning, object: FrameObject, name: ObjectName, move: string): Box {
	switch (object.inside.kind) {
		case 'page':
			return object.box;
		case 'frame':
			if (!liesFlat(object)) {
				throw new FilmError(
					`${move} would lay the ${name} flat on the page while it leans or stands near the eye: bring it face-on and to no depth first`
				);
			}
			return measuredIn(beginning, ON_THE_PAGE, object.box, name, move);
		case 'window':
			throw new FilmError(`${move} would carry the ${name} out of the window onto the page: it stands in the window`);
		case 'world':
			throw new FilmError(`${move} would carry the ${name} out of the world onto the page: show it on the frame`);
		case 'group':
			throw new FilmError(`${move} would carry the ${name} out of its group onto the page: it goes with its group`);
	}
}

/**
 * Whether an object lies flat on its plane: facing the frame with its front, at no depth of its own, as its matrix
 * says, so every value of its angle counts; it may be grown, or rolled in its plane.
 */
function liesFlat(object: FrameObject): boolean {
	const angled = angledAs(object.angle);
	return facesTheFrame(angled) && showsItsFront(angled) && object.depth === AS_PLACED.depth;
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

/** A move of what an object of a name shows, which sets that alone, so it shares a step with one that carries it. */
export function contentMove(
	name: ObjectName,
	timing: Timing,
	begin: (beginning: Beginning) => Change | Promise<Change>
): Move {
	return { part: objectPart(name), valueNames: CONTENT, timing, begin };
}

/** What a kind sets off from toward a place: its box as it stands, growing or shrinking along the way. */
export function fromItsBox(standing: Box): Box {
	return standing;
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
	refuseJoining(beginning, holder, move);
	const within = seenFrom(beginning, holder);
	const coming = await comingAt(readFrom(within, holder));
	const measured = { ...coming, box: measuredIn(beginning, holder, coming.box, name, move) };
	return appearing(within, name, holder, measured, arrival, move);
}

/**
 * Refuses an object coming up in a group none of stands, or one that does not stand as it was placed, as only then is
 * where the object would stand on the frame where it stands in the group; and one naming a zIndex in a group that
 * draws by depth, where it would order nothing.
 */
function refuseJoining(beginning: Beginning, holder: Holder, move: string): void {
	if (holder.kind !== 'group') return;
	const group = groupFound(beginning.scene.groups, holder.name, move);
	if (!standsAsPlaced(group)) {
		throw new FilmError(
			`${move} joins the group "${holder.name}" only while it stands as it was placed: face-on by whole turns, as large as its box, on the frame's plane`
		);
	}
	if (holder.zIndex !== null && group.order === 'depth') {
		throw new FilmError(
			`${move} names a zIndex in the group "${holder.name}", which draws by depth: leave it out, or order the group by zIndex`
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
	const push = pushOf(beginning, name, arrival.from, move);
	const arrived: FrameObject = {
		inside: holder,
		box: coming.box,
		...AS_PLACED,
		...NO_EFFECTS,
		shown: WHOLE,
		// Not going: neither gone nor on its way out
		gone: NONE,
		way: arrival.way,
		content: coming.content
	};
	const start = enteringFrom(coming.box, arrival.from, frame, framesToComeIn(arrived, arrival.from, push, beginning));
	return (scene, progress) =>
		withLeaving(
			withObject(scene, name, {
				...arrived,
				box: boxToward(start, coming.box, progress),
				shown: shownComing(arrival.from, progress)
			}),
			name,
			pushedAt(push, progress)
		);
}

/**
 * How many frames past its box an object slides in from, for all of it as drawn to stand past the edge as it sets off,
 * seen as the eye stands, one in the world too; as far as the one it pushes goes where that is farther, so the two
 * move as one sheet. One coming up in its place sets off from none.
 */
function framesToComeIn(arrived: FrameObject, from: FrameSide | null, push: Push | null, beginning: Beginning): number {
	if (from === null) return ONE_FRAME;
	const frame = beginning.format.frame;
	const own = framesPastTheEdge(arrived, from, frame, holdersAsTheyStand(beginning), frame);
	return Math.max(own, push?.frames ?? ONE_FRAME);
}

/**
 * The object of a kind on its way to a place, read as its kind reads one, from the box its kind sets off from, and to
 * the film's scale and depth from its own where it names them, a depth given in pixels of a frame 1080 high: the values
 * named written into it.
 */
function carried<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	kind: Kind,
	carrying: Carrying,
	reading: PlaceReading<Kind>,
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const { place, through, script } = carrying;
	refusePlacedInside(object.inside, place, `${move}'s place`);
	through.keys.forEach((key) => refusePlacedInside(object.inside, key, `${move}'s through`));
	const end = placedBoxOf(beginning, object, place, reading, name, move);
	const from: Carried = {
		box: reading.settingOff(object.box, end, object.content),
		scale: object.scale,
		depth: object.depth
	};
	const to: Carried = {
		box: end,
		scale: script.scale ?? object.scale,
		depth: depthAsked(script.depth, object.depth, beginning.format.frame)
	};
	refuseNearingInside(object, to.depth, name, move);
	// Each box on the way set off as the first is, so words stand as large as where they go all the way
	const keys = through.keys.map((key) =>
		reading.settingOff(placedBoxOf(beginning, object, key, reading, name, move), end, object.content)
	);
	const boxPath = pathOf(from.box, { ...through, keys }, end, BOX_SPACE);
	return writing(name, (progress) => carriedOnPath(boxPath, from, to, carrying, progress));
}

/**
 * The box a place gives an object of a name, read as its kind reads a place in what it stands in, and measured there
 * as the move begins.
 */
function placedBoxOf<Kind extends ShownKind>(
	beginning: Beginning,
	object: ShowingOf<Kind>,
	place: Place,
	reading: PlaceReading<Kind>,
	name: ObjectName,
	move: string
): Box {
	const placed = reading.placed(seenFrom(beginning, object.inside).format, place, object.content);
	return measuredIn(beginning, object.inside, placed, name, move);
}

/** Where something carried stands `progress` of the way from one box, scale and depth to another: the values named. */
function carriedAlong(
	from: Carried,
	to: Carried,
	names: readonly (keyof Carried)[],
	progress: number
): Partial<Carried> {
	return namedToward(CARRYING, from, to, names, progress);
}

/**
 * Where something carried to a place stands `progress` of the way, the values its move sets: its box on its path, and
 * of its scale and depth those the film names, straight from where they stood.
 */
export function carriedOnPath(
	boxPath: Path<Box>,
	from: Carried,
	to: Carried,
	carrying: Carrying,
	progress: number
): Partial<Carried> {
	const scaled = namesGiven(carrying.script, SET_WHERE_NAMED);
	return { ...namedToward(CARRYING, from, to, scaled, progress), box: boxPath.at(progress) };
}

/**
 * The object on its way from how it stands out to the film's, those values it names written into it, a blur and a
 * depth given in pixels of a frame 1080 high.
 */
function standingOut(
	beginning: Beginning,
	name: ObjectName,
	kind: ShownKind,
	script: EffectsScript,
	names: readonly (keyof EffectsInPlace)[],
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const from: EffectsInPlace = { ...object, colour: colourSeenIn(object, script.colour, beginning.scene.look.accent) };
	const to: EffectsInPlace = {
		ring: fractionOf(script.ring ?? object.ring),
		glow: fractionOf(script.glow ?? object.glow),
		shadow: fractionOf(script.shadow ?? object.shadow),
		blur: script.blur ?? object.blur,
		colour: script.colour ?? from.colour,
		melt: script.melt === undefined ? object.melt : { ...script.melt, share: fractionOf(script.melt.share) },
		scale: script.scale ?? object.scale,
		depth: depthAsked(script.depth, object.depth, beginning.format.frame)
	};
	refuseNearingInside(object, to.depth, name, move);
	refuseMeltTurned(object, to, name, move);
	return writing(name, (progress) => namedToward(EFFECTS_IN_PLACE, from, to, names, progress));
}

/** Refuses a melt turned to another side while the object melts, which would jump there at once. */
function refuseMeltTurned(object: FrameObject, to: EffectsInPlace, name: ObjectName, move: string): void {
	if (object.melt.share > NONE && to.melt.toward !== object.melt.toward) {
		throw new FilmError(`${move} turns the ${name} to melt toward another side while it melts: melt it to none first`);
	}
}

/**
 * The colour an object's ring and glow set off from toward one a film names: the one they are seen in, their own or
 * the look's accent as it stands as the move begins; where neither shows, the one named, as no other was seen.
 */
function colourSeenIn(object: FrameObject, named: string | undefined, accent: string): string {
	const standing = object.colour ?? accent;
	const seen = object.ring > NONE || object.glow > NONE;
	return seen ? standing : (named ?? standing);
}

/**
 * Refuses an object brought to a depth of its own inside the page's window or on the page in it, where it stands flat
 * on the window's plane.
 */
function refuseNearingInside(object: FrameObject, depth: number, name: ObjectName, move: string): void {
	const flat = flatOnTheWindowSaid(object.inside);
	if (flat !== null && depth !== object.depth) {
		throw new FilmError(`${move} would bring the ${name} toward the eye alone: ${flat}, flat on it`);
	}
}

/**
 * The object's angle on its way from how it faces to the film's. Inside the page's window, or on the page in it, it
 * leans as the window does, and a lean of its own would only lie flat on the window's, so a tilt, a turn or a turn
 * over is refused there: it rolls.
 */
function leaning(
	beginning: Beginning,
	name: ObjectName,
	kind: ShownKind,
	script: ObjectLeanScript,
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const from = object.angle;
	const to = leantFrom(from, script);
	const flat = flatOnTheWindowSaid(object.inside);
	if (flat !== null && (to.tilt !== from.tilt || to.turn !== from.turn || to.over !== from.over)) {
		throw new FilmError(
			`${move} would tilt, turn or turn over the ${name} alone: ${flat}, and leans as it does; it rolls in it`
		);
	}
	return writing(name, (progress): Leant => ({ angle: angleToward(from, to, progress) }));
}

/**
 * Where what an object stands in lays it flat on the window's plane, as a refusal says it: inside the window, or on the
 * page in it; none where it stands on the frame or in a group, free to lean and come near.
 */
function flatOnTheWindowSaid(holder: Holder): string | null {
	switch (holder.kind) {
		case 'window':
			return 'it stands inside the window';
		case 'page':
			return 'it lies on the page';
		case 'frame':
		case 'world':
		case 'group':
			return null;
	}
}

/**
 * The object of a kind on its way back from how it stands to the box `boxAt` works out of what it shows, as large as
 * its box, on its plane, and face-on by its nearest whole turns.
 */
function goingBack<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	kind: Kind,
	boxAt: (beginning: Beginning, shown: ShownOf<Kind>) => Box,
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const backTo = boxAt(readFrom(beginning, object.inside), object.content);
	const to: Carried = {
		box: measuredIn(beginning, object.inside, backTo, name, move),
		scale: AS_PLACED.scale,
		depth: AS_PLACED.depth
	};
	const faceOn = faceOnNearest(object.angle);
	return writing(name, (progress): Partial<Carried> & Leant => ({
		...carriedAlong(object, to, CARRIED, progress),
		angle: angleToward(object.angle, faceOn, progress)
	}));
}

/** The object on its way to the box `boxAt` works out of it, its box written into it alone. */
async function carriedToBox(
	beginning: Beginning,
	name: ObjectName,
	kind: ShownKind,
	boxAt: (beginning: Beginning, object: FrameObject) => Promise<Box>,
	move: string
): Promise<Change> {
	const object = standingOfKind(beginning, name, move, kind);
	const end = measuredIn(beginning, object.inside, await boxAt(beginning, object), name, move);
	const to: Carried = { box: end, scale: object.scale, depth: object.depth };
	return writing(name, (progress) => carriedAlong(object, to, PLACED, progress));
}

/**
 * The object on its way onto a block of the page, lying on the page from where it stood on the screen as the move
 * began: what it stands in and its box written into it.
 */
async function laidOnto(
	beginning: Beginning,
	name: ObjectName,
	kind: ShownKind,
	target: Target,
	move: string
): Promise<Change> {
	const object = standingOfKind(beginning, name, move, kind);
	const start = onThePage(beginning, object, name, move);
	const end = await shownBox(beginning, target, THE_FIRST, move);
	return writing(name, (progress): Lying => ({ inside: ON_THE_PAGE, box: boxToward(start, end, progress) }));
}

/** The object going where it stands, in the way it goes; once gone, none. */
function going(beginning: Beginning, name: ObjectName, kind: ShownKind, way: Way, move: string): Change {
	const object = standingOfKind(beginning, name, move, kind);
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
function slidingOut(beginning: Beginning, name: ObjectName, kind: ShownKind, toward: FrameSide, move: string): Change {
	const object = standingOfKind(beginning, name, move, kind);
	if (object.inside.kind === 'group') {
		throw new FilmError(
			`${move} would slide the ${name} out toward a side from its group: it goes in its place, or with its group`
		);
	}
	if (object.inside.kind === 'page') {
		throw new FilmError(`${move} would slide the ${name} out toward a side from the page: it goes in its place`);
	}
	const within = seenFrom(beginning, object.inside).format.frame;
	const frames = framesPastTheEdge(object, toward, within, holdersAsTheyStand(beginning), beginning.format.frame);
	const end = pastTheEdge(object.box, toward, within, frames);
	return (scene, progress) =>
		withObject(scene, name, untilTheEnd(progress, { ...object, box: boxToward(object.box, end, progress) }));
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
 * the edge; none where none stands, or nothing slides in. One standing in a group or on the page, which never slides,
 * is refused.
 */
function pushOf(beginning: Beginning, name: ObjectName, from: FrameSide | null, move: string): Push | null {
	const standingThere = beginning.scene.objects.get(name);
	const frame = beginning.format.frame;
	if (from === null || standingThere === undefined) return null;
	if (standingThere.inside.kind === 'group') {
		throw new FilmError(`${move} would push the ${name} off past the frame's edge from its group: hide it first`);
	}
	if (standingThere.inside.kind === 'page') {
		throw new FilmError(`${move} would push the ${name} off past the frame's edge from the page: hide it first`);
	}
	const toward = acrossFrom(from);
	const frames = framesPastTheEdge(standingThere, toward, frame, holdersAsTheyStand(beginning), frame);
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
