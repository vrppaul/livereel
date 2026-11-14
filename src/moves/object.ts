/**
 * The moves of an object (`src/props/object.ts`), alike whatever it shows, written once for every kind that makes
 * one — a title's words, code, the agent's terminal, the ending card, a piece of the page, an outline, a lens, a thing
 * of the film's own: coming up in its box, in its own way or one of livereel's (`src/moves/way.ts`), or sliding in
 * whole from past a side of the frame, pushing the object of its name standing there off past the side across; carried
 * to another place, growing and coming toward the eye on the way, to a box read off the page, or onto a block of the
 * page to lie there; leant and rolled; set apart from what lies under it, ringed and glowing in the accent or a colour
 * of the film's, casting a shadow, blurred, melted toward a side, faded into what lies behind it, each from its first
 * frame where its show names it, grown or brought toward the eye where it stands (`src/props/effects.ts`); taken back
 * to stand as its box places it; put away where it stands, in its own way or one of livereel's, or slid out past a
 * side. A move takes the object a film names `as`, or its kind's own name, so a film shows several of a kind at once,
 * each moved by its name; it takes only an object of its kind, and refuses one that shows another. What differs by
 * what an object shows is handed here by the kind's own module: the curve it comes up on in its own way, how it reads
 * a place, and the box it sets off from as it is carried there.
 *
 * A move that carries an object to a place sets its box and the scale and depth the film names, one that carries it to
 * a box read off the page its box, one that carries it onto a block of the page what it stands in and where it stands
 * there, its box, scale, depth and angle, one that leans it its angle and the point of its box it turns about, one of
 * how it stands out the values the film names, one of what it shows its content, each writing only its own into the
 * object as it stands, so they share a step, each as far along as its own share; a move that brings one sets it whole,
 * standing where it comes up and standing out as the film names at its show, in no way where it names nothing, and one
 * that puts it away sets it whole as it stands. A move of an object that is not on the screen is refused as it begins.
 *
 * An object shown into a group (`src/props/group.ts`) reads its place, or its source, as it would on the frame, and
 * stands in the group where it would stand there, carried into the group's plane however the group stands
 * (`carriedInto`, `src/domain/placement.ts`): its box measured there and its stance the group's taken back. A box any
 * later move of it reads on the frame is measured from the group's corner, so it stands there once the group stands as
 * it was placed. It never slides past the frame's edge, as the group's plane may stand turned from the frame's; it goes
 * in its place, or with its group.
 *
 * An object carried onto a block of the page is held by the page from the moment that move begins, its box measured
 * on the screen as the camera shows it then, so it lands on the block wherever the camera goes; a box any later move of
 * it reads on the frame is measured on the screen so too. One standing on the frame lies on the page, carried there
 * lying flat, face-on and at no depth of its own, while the window faces the frame front on, as only then does a box of
 * the frame stand on the screen as a box; it never slides from there, as the page's plane may stand leant from the
 * frame's: it goes in its place. One standing in the world stands on the page in the world, the page's plane standing
 * there, where it stands, wherever the eye stands and however the window stands, leant from that plane or near the eye
 * as it stood, and comes down onto the block on its way, so it falls as it travels, on a curve of its own where the
 * film names one: what lies in the window is drawn flat on it, and what stands on the page in the world is drawn in
 * the world, so it keeps its body and stands off the page.
 *
 * An object on the frame, or beside a point, which rides with the eye, is handed into the world where the eye sees it
 * as that move begins, at once, square to the eye and as far before it as what it stood on, so it stays there as the
 * eye moves on.
 */
import { boxOnTheScreen, standingAt, viewOf } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { eyeAtRest } from '../domain/eye.ts';
import type { Format } from '../domain/format.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import {
	A_FRAME_SIDE,
	BOX_SPACE,
	type Box,
	type FrameSide,
	type Point,
	type Size,
	boxToward,
	measuredFrom,
	pointAt
} from '../domain/geometry.ts';
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
import {
	AS_PLACED,
	A_SCALE,
	type Stance,
	angleToward,
	depthAsked,
	depthsNamed,
	faceOnNearest,
	liesOnItsPlane
} from '../domain/stance.ts';
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
import { A_CURVE, type Ease } from '../domain/curves.ts';
import { type Path, type Through, pathOf } from '../domain/path.ts';
import { MOVES_WITH_THE_CURVE, type MovingBy, namedToward } from '../domain/toward.ts';
import {
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type Timing,
	type TimingScript,
	objectPart,
	shownPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import {
	EFFECTS_IN_PLACE,
	EFFECTS_IN_PLACE_NAMES,
	type Effects,
	type EffectsInPlace,
	NO_EFFECTS
} from '../props/effects.ts';
import {
	type GroupName,
	type Holder,
	type Holders,
	IN_THE_WINDOW,
	IN_THE_WORLD,
	ON_THE_FRAME,
	ON_THE_PAGE,
	ON_THE_PAGE_IN_THE_WORLD,
	type OnTheFramesPlane,
	type Placement,
	type Ride,
	cameraOnItsPage,
	carriedInto,
	groupNamed,
	handedIntoTheWorld,
	scrolledInAll
} from '../domain/placement.ts';
import { type Group, groupFound } from '../props/group.ts';
import {
	type Content,
	type FrameObject,
	AN_INSIDE,
	type Inside,
	type ObjectName,
	framesPastTheEdge
} from '../props/object.ts';
import { pageShownBy } from '../props/screen.ts';
import { OWN_WAY, type Way } from '../props/way.ts';
import { type Scene, cameraOf, holdersIn, withEye, withLeaving, withObject, withProp } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';
import { cameraFrontOn } from './source.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';
import { ENTER_FORM, type EnterScript, LEAVE_FORM, type LeaveScript, goneIn, wayOf } from './way.ts';

/**
 * A kind of what an object shows, as a film calls its moves, and the name of the object they take where it names none.
 */
export type ShownKind = Content['kind'];

/** What an object of a kind shows. */
type ShownOf<Kind extends ShownKind> = Extract<Content, { readonly kind: Kind }>;

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
 * Which object comes up, and the side of the frame it slides in `from`, past the frame's edge, if any, or the way it
 * comes up in its place.
 */
export interface ShowScript extends TimingScript, NamedScript, EnterScript {
	readonly from?: FrameSide;
}

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

/**
 * Which object is carried onto a block of the page, and the curve it comes down onto the page on, its `fall`, where
 * it stands off the page's plane: its depth and lean, over the move's whole share as its travel is, on the move's own
 * curve where the film names none.
 */
export interface OntoScript extends TakenScript {
	readonly fall?: Ease;
}

/** Which object leans, and how: as the window leans. */
export interface ObjectLeanScript extends LeanScript, NamedScript {}

/**
 * How an object stands out, as a film writes it as the object comes up or as it moves: a `ring` along its edge, a
 * `glow` round it and a `shadow` under it, each from 0 none to 1 whole, how far it is blurred, `blur`, in pixels of a
 * frame 1080 high, the `colour` of its ring and glow in hex, how far in from a side of what it shows it melts into
 * nothing there, `melt`, a share of it, and how far it has faded into what lies behind it, `fade`, from 0 none to 1
 * whole.
 */
interface StandingOutScript {
	readonly ring?: number;
	readonly glow?: number;
	readonly shadow?: number;
	readonly blur?: number;
	readonly colour?: string;
	readonly melt?: MeltScript;
	readonly fade?: number;
}

/**
 * Which object stands out, and how, as `StandingOutScript` has it; how many times as large it stands about its
 * middle, `scale`, and how far out toward the eye, `depth`, in pixels of a frame 1080 high; any left out as it stands.
 */
export interface EffectsScript extends TimingScript, NamedScript, StandingOutScript {
	readonly scale?: number;
	readonly depth?: number;
}

/**
 * How an object comes up standing out, `effects`, so it comes soft or faded from its first frame, as a move of its
 * effects would leave it; in no way where the film names none.
 */
export interface ShownStandingOutScript {
	readonly effects?: StandingOutScript;
}

/** How an object melts, as a film writes it: the side of what it shows it melts toward, and how far in, from 0 to 1. */
interface MeltScript {
	readonly toward: FrameSide;
	readonly share: number;
}

/**
 * A point of a part a film names an object to stand beside, as a move reads it as it begins: of the blocks a selector
 * matches, or a box of the screen, or of an object by its name, in shares of its box.
 */
export type PointAsked =
	| { readonly kind: 'part'; readonly target: Target; readonly share: Point }
	| { readonly kind: 'object'; readonly name: ObjectName; readonly share: Point };

/**
 * What an object comes up showing, and the box it comes up in: of the frame, or, beside a point, in the frame's pixels
 * from the point.
 */
export interface Coming {
	readonly content: Content;
	readonly box: Box;
}

/** What an object comes up showing, and where it stands in what it comes up in. */
interface Arriving {
	readonly content: Content;
	readonly standing: Placement;
}

/**
 * How an object lands on a block of the page: what it stands in on its way and there, where it stands there as it sets
 * off, and how it stands as it lies on the block.
 */
interface Landing {
	readonly holder: Holder;
	readonly from: Placement;
	readonly lying: Stance;
}

/**
 * How an object comes: sliding in whole `from` a side of the frame, if any, the way it comes up in its place, and how
 * it stands out from its first frame.
 */
interface Arrival {
	readonly from: FrameSide | null;
	readonly way: Way;
	readonly effects: Effects;
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
export const SHOW_FORM: Form<ShowScript> = { from: A_FRAME_SIDE, ...ENTER_FORM, ...NAMED_FORM, ...TIMING_FORM };
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
export const HIDE_FORM: Form<HideScript> = { toward: A_FRAME_SIDE, ...LEAVE_FORM, ...TIMING_FORM, ...NAMED_FORM };
export const LEAN_OBJECT_FORM: Form<ObjectLeanScript> = { ...LEAN_FORM, ...NAMED_FORM };
export const TAKEN_FORM: Form<TakenScript> = { ...NAMED_FORM, ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = { fall: A_CURVE, ...TAKEN_FORM };
const STANDING_OUT_FORM: Form<StandingOutScript> = {
	ring: A_SHARE,
	glow: A_SHARE,
	shadow: A_SHARE,
	blur: A_PIXELS,
	colour: A_COLOUR,
	melt: A_MELT,
	fade: A_SHARE
};
const EFFECTS_FORM: Form<EffectsScript> = {
	...STANDING_OUT_FORM,
	scale: A_SCALE,
	depth: A_NUMBER,
	...NAMED_FORM,
	...TIMING_FORM
};
export const SHOWN_STANDING_OUT_FORM: Form<ShownStandingOutScript> = {
	effects: new OfForm(STANDING_OUT_FORM, 'effects: { ring, glow, shadow, blur, colour, melt, fade }')
};
// The values of an object, or of a group, a move that carries it may set, and one that leans it; and of an object, one
// of what it shows; what each writes is held to them. One that carries an object to a place sets its box, and of its
// scale and depth those the film names; one that carries it to a box read off the page, its box alone; one that
// carries it onto a block of the page, or hands it into the world, what it stands in and where it stands there, its
// box and stance, as it reads them anew in the plane of what it then stands in
const CARRIED = ['box', 'scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const PLACED = ['box'] as const satisfies readonly (keyof FrameObject)[];
const HELD_ANEW = ['inside', 'box', 'scale', 'depth', 'angle'] as const satisfies readonly (keyof FrameObject)[];
const SET_WHERE_NAMED = ['scale', 'depth'] as const satisfies readonly (keyof FrameObject & keyof ToScript)[];
export const LEANT = ['angle', 'about'] as const satisfies readonly (keyof FrameObject & keyof Group)[];
const CONTENT = ['content'] as const satisfies readonly (keyof FrameObject)[];
// The values a move that takes an object back sets: where it stands and how it faces, together
const BACK = [...CARRIED, ...LEANT] as const satisfies readonly (keyof FrameObject)[];
// Of the values an object crossing into another holder is carried by, those it travels by, and those it falls by, its
// angle beside them, which stand it off the plane of what it lands in
const TRAVELLED = ['box', 'scale'] as const satisfies readonly (keyof Carried)[];
const FALLEN = ['depth'] as const satisfies readonly (keyof Carried)[];
// A box measured in a group stands as large as on the frame, as the group it is measured for stands as it was placed
const AS_LARGE = 1;
// What stands beside a point stands in no place of the frame: it stands off the point
const OFF_ITS_POINT = null;

/**
 * The curve what a kind shows comes up on in its own way, where the film names none, for a kind whose module reads how
 * far it has come, fading up whole: its step's. One that comes up in a way of livereel's comes on its step's whatever
 * its kind.
 */
export const THE_STEPS_CURVE = null;

/**
 * How what a kind shows goes in its own way: the curve it goes on where the film names none, and what it shows as it
 * goes, read from what it showed as the going begins.
 */
export interface OwnGoing<Kind extends ShownKind> {
	readonly curve: Ease | null;
	readonly shownAsItGoes: ShownAsItGoes<Kind>;
}

/** What a kind shows as it goes, from what it showed: a title's words at the pace the hide names. */
type ShownAsItGoes<Kind extends ShownKind> = (shown: ShownOf<Kind>) => ShownOf<Kind>;

/**
 * The way an object of a kind goes, worked out of the way the film names and of the object as it stands as it sets
 * off, on a frame of a size.
 */
export type WayFor<Kind extends ShownKind> = (named: Way, object: ShowingOf<Kind>, frame: Size) => Way;

/**
 * How a kind whose module reads how far it has gone goes in its own way: showing what it showed, on its step's curve.
 */
export const GOES_AS_IT_STANDS = { curve: THE_STEPS_CURVE, shownAsItGoes: asItShowed } as const;

/**
 * How a pane reads a place, as the page's window reads one — a terminal, a piece of the page, an outline — setting off
 * toward it from its box as it stands, growing or shrinking along the way. Its readings take nothing a kind shows, so
 * it is any kind's reading, as `objectMovesOf` hands it.
 */
const READ_AS_THE_WINDOW = {
	placed: windowPlaced,
	settingOff: fromItsBox
} as const satisfies PlaceReading<ShownKind>;

/**
 * An object's values, or a group's, a move that carries it writes; an object's one that leans it, and one of what it
 * shows.
 */
export type Carried = Pick<FrameObject, (typeof CARRIED)[number]>;
type HeldAnew = Pick<FrameObject, (typeof HELD_ANEW)[number]>;
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
 * if the window's box were the frame; one shown into a `group` stands in it where it would stand on the frame, however
 * the group stands, and never slides. It comes up standing out as the film names, in no way where it names nothing.
 * The script is the kind's own, checked by it. Every move of an object is handed its kind and its own name, as a
 * refusal says it: `terminal.open`.
 */
export function objectShow(
	kind: ShownKind,
	move: string,
	script: ShowScript & NestedScript & ShownStandingOutScript,
	place: Place | null,
	ownCurve: Ease | null,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>
): Move {
	const holder = holderNamed(script, move);
	refusePlacedInside(holder, place, `${move}'s at`);
	if (script.from !== undefined && holder.kind === 'group') {
		throw new FilmError(
			`${move} slides nothing in from a side into a group: an object in a group comes up in its place`
		);
	}
	return objectComing(kind, move, script, place, ownCurve, () => holder, comingAt);
}

/**
 * An object of a kind coming up beside a point of a part, as `objectShow` brings one, standing off that point as the
 * eye sees it on the frame, wherever the part goes: the point read as the move begins, of the block a selector matches
 * as the screen shows it then, or of an object standing, which is refused where none of its name stands, or where it
 * is the object coming up.
 */
export function objectShowBeside(
	kind: ShownKind,
	move: string,
	script: ShowScript & ShownStandingOutScript,
	beside: PointAsked,
	ownCurve: Ease | null,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>
): Move {
	const name = script.as ?? kind;
	if (beside.kind === 'object' && beside.name === name) {
		throw new FilmError(`${move} stands the ${name} beside itself: name another object`);
	}
	return objectComing(
		kind,
		move,
		script,
		OFF_ITS_POINT,
		ownCurve,
		(beginning) => pointHeld(beginning, beside, name, move),
		comingAt
	);
}

/**
 * An object of a kind coming up in the world riding the page its source stands on, a selector's first `every` blocks
 * or a box of the screen, as `objectShow` brings one inside the world: standing on the page in the world from then on
 * as the page it was lifted off lies there, so it goes where the camera, the window, the film's scrolls of any block
 * that carries its source and a fade from that page take the source. One named to stand anywhere but inside the world
 * is refused: what rides the page stands off it in the world.
 */
export function objectShowRiding(
	kind: ShownKind,
	move: string,
	script: ShowScript & NestedScript & ShownStandingOutScript,
	source: Target,
	every: number,
	place: Place | null,
	ownCurve: Ease | null,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>
): Move {
	if (holderNamed(script, move).kind !== IN_THE_WORLD.kind) {
		throw new FilmError(`${move} rides its block inside the world alone: name inside: 'world'`);
	}
	return objectComing(kind, move, script, place, ownCurve, (beginning) => rideHeld(beginning, source, every), comingAt);
}

/**
 * The ride something is placed on as a move begins, over its source: the page the screen shows then, and every block
 * of it whose scroll carries the source, as the page finds them then, from as far as the film has scrolled them in all
 * then.
 */
async function rideHeld(beginning: Beginning, source: Target, every: number): Promise<Holder> {
	const blocks = await beginning.page.blocksHolding(source, every);
	const page = pageShownBy(beginning.scene.screen.shows);
	const ride: Ride = { page, blocks, from: scrolledInAll(beginning.scene.scrolled, blocks) };
	return { kind: 'ride', ride };
}

/**
 * An object of a kind coming up in what `holderAt` names as the move begins, its way, curve and how it stands out as
 * `objectShow` has them.
 */
function objectComing(
	kind: ShownKind,
	move: string,
	script: ShowScript & ShownStandingOutScript,
	place: Place | null,
	ownCurve: Ease | null,
	holderAt: (beginning: Beginning) => Holder | Promise<Holder>,
	comingAt: (beginning: Beginning) => Coming | Promise<Coming>
): Move {
	const name = script.as ?? kind;
	const from = script.from ?? null;
	const way = wayOf(script.enter, script.edge, move);
	if (from !== null && way.kind !== OWN_WAY.kind) {
		throw new FilmError(`${move} comes up in its place in a way, or slides in from a side: not both`);
	}
	const curve = from === null && way.kind === OWN_WAY.kind ? ownCurve : THE_STEPS_CURVE;
	const effects = script.effects === undefined ? NO_EFFECTS : effectsNamed(NO_EFFECTS, script.effects);
	const arrival: Arrival = { from, way, effects };
	return {
		part: objectPart(name),
		timing: timingOf(curve === null ? script : { ease: curve, ...script }),
		places: placesNamed(`${move}'s at`, place),
		begin: async (beginning) => appearingIn(beginning, name, await holderAt(beginning), arrival, comingAt, move)
	};
}

/**
 * The point beside which an object stands, as a move begins: of the block a selector matches, or of a box of the
 * screen, as the screen shows it then, in the screen's pixels; or of an object of a name, which is refused where none
 * stands, and where it stands beside the object coming, straight or through others: each would stand off the other's
 * point, and neither anywhere.
 */
async function pointHeld(beginning: Beginning, asked: PointAsked, coming: ObjectName, move: string): Promise<Holder> {
	switch (asked.kind) {
		case 'part': {
			const part = await shownPart(beginning, asked.target, THE_FIRST, move);
			return { kind: 'point', of: { kind: 'screen', at: pointAt(part, asked.share) } };
		}
		case 'object':
			// Found, or refused where none of its name stands
			standing(beginning, asked.name, move);
			if (standsBesideThrough(beginning.scene.objects, asked.name, coming)) {
				throw new FilmError(
					`${move} stands the ${coming} beside the ${asked.name}, which stands beside the ${coming}, straight or through others: name an object that stands by itself`
				);
			}
			return { kind: 'point', of: { kind: 'object', name: asked.name, share: asked.share } };
	}
}

/**
 * Whether an object of a name stands beside another, off a point of it or of one that stands beside it in turn,
 * through however many.
 */
function standsBesideThrough(
	objects: ReadonlyMap<ObjectName, FrameObject>,
	name: ObjectName,
	another: ObjectName
): boolean {
	let holder = objects.get(name)?.inside;
	while (holder?.kind === 'point' && holder.of.kind === 'object') {
		if (holder.of.name === another) return true;
		holder = objects.get(holder.of.name)?.inside;
	}
	return false;
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
 * The moves an object of a kind takes as every kind does, each named after the kind's own: a kind makes them once,
 * `const THING_MOVES = objectMovesOf(THING, THING_READING)`, exports each it offers under a comment of its own words,
 * `export const to = THING_MOVES.to`, as a film author's editor shows that comment, and writes the rest itself.
 */
export interface ObjectMoves {
	/**
	 * The object carried to another place, through the places between, growing to `scale` and coming `depth` toward the
	 * eye on the way where the film names them.
	 */
	readonly to: (place: Place, script?: ToScript) => Move;
	/** The object leant back by `tilt`, swung by `turn`, rolled by `roll` and turned over by `over`. */
	readonly lean: (script: ObjectLeanScript) => Move;
	/** The object standing out as the film names: ringed, glowing, casting a shadow, blurred, grown or brought near. */
	readonly effects: (script: EffectsScript) => Move;
	/** The object going where it stands, in its own way, or sliding out past a side of the frame; once gone, none. */
	readonly hide: (script?: HideScript) => Move;
	/**
	 * The object, on the frame or beside a part, handed into the world where the eye sees it as the move begins, so the
	 * eye moves past it from then on.
	 */
	readonly intoTheWorld: (script?: TakenScript) => Move;
}

/** The moves every kind takes alike, made for a kind: it reads a place as the window does, unless it hands its own. */
export function objectMovesOf<Kind extends ShownKind>(
	kind: Kind,
	reading: PlaceReading<Kind> = READ_AS_THE_WINDOW
): ObjectMoves {
	return {
		to: (place, script = {}) => objectTo(kind, `${kind}.to`, place, script, reading),
		lean: (script) => objectLean(kind, `${kind}.lean`, script),
		effects: (script) => objectEffects(kind, `${kind}.effects`, script),
		hide: (script = {}) => objectHide(kind, `${kind}.hide`, script, GOES_AS_IT_STANDS),
		intoTheWorld: (script = {}) => objectIntoTheWorld(kind, `${kind}.intoTheWorld`, script)
	};
}

/**
 * An object of a kind carried to a place, read as the kind reads one, through the places the film names on its way,
 * growing to the film's scale and coming to its depth on the way, where it names them.
 */
function objectTo<Kind extends ShownKind>(
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
function objectEffects(kind: ShownKind, move: string, script: EffectsScript): Move {
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
 * An object of a kind going where it stands, in its own way, as what it shows goes, on the kind's own curve unless the
 * film names one, what it shows set off as the kind sets it; or in a way of livereel's the film names, as the kind's
 * move works it out of the object as it sets off, as a piece's wipe crosses a block it emptied and trails a sheen as
 * far across it as it stands; or sliding out past a side of the frame where the film names one; once gone, none.
 */
export function objectHide<Kind extends ShownKind>(
	kind: Kind,
	move: string,
	script: HideScript,
	own: OwnGoing<Kind>,
	wayFor: WayFor<Kind> = asNamed
): Move {
	assertWritten(script, HIDE_FORM, move);
	const name = script.as ?? kind;
	const toward = script.toward ?? null;
	const way = wayOf(script.leave, script.edge, move);
	if (toward !== null && way.kind !== OWN_WAY.kind) {
		throw new FilmError(`${move} goes from its place in a way, or slides out toward a side: not both`);
	}
	const curve = toward === null && way.kind === OWN_WAY.kind ? own.curve : THE_STEPS_CURVE;
	return {
		part: objectPart(name),
		timing: timingOf(curve === null ? script : { ease: curve, ...script }),
		begin: (beginning) =>
			toward === null
				? objectGoing(beginning, name, kind, way, wayFor, own.shownAsItGoes, move)
				: slidingOut(beginning, name, kind, toward, move)
	};
}

/**
 * An object of a kind leant back from its top edge by `tilt`, swung by `turn`, rolled in its own plane by `roll` and
 * turned over round its own width by `over`, about a point of its box.
 */
function objectLean(kind: ShownKind, move: string, script: ObjectLeanScript): Move {
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
 * An object of a kind taken back to stand as its box places it: carried to the box `boxAt` works out of the object as
 * the move begins, what it shows and what it stands in, as large as that box, on its plane, and face-on by its nearest
 * whole turns, so one spun round goes back without spinning back.
 */
export function objectBack<Kind extends ShownKind>(
	kind: Kind,
	move: string,
	script: TakenScript,
	boxAt: (beginning: Beginning, object: ShowingOf<Kind>) => Box
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
 * An object of a kind carried onto a block of the page, to lie on the page in the box of the screen `landedOn` works
 * out of the object as the move begins: from where it stands then, measured on the screen as the camera shows it then,
 * so it lands on the block wherever the camera goes on its way, and keeps that place on the screen after. One standing
 * in the world comes down onto the block as it goes, from as near the eye and as leant as it stood, so it falls as it
 * travels: its travel on the move's curve, its fall on the one the film names, so the fall gathers speed apart from
 * the travel, or on the move's too.
 */
export function objectOnto<Kind extends ShownKind>(
	kind: Kind,
	move: string,
	script: OntoScript,
	landedOn: (beginning: Beginning, object: ShowingOf<Kind>) => Promise<Box>
): Move {
	assertWritten(script, ONTO_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: HELD_ANEW,
		timing: timingOf(script),
		begin: (beginning) => laidOnto(beginning, name, kind, script, landedOn, move)
	};
}

/**
 * An object of a kind on the frame, or beside a point, handed into the world as the move begins, standing where the eye
 * sees it then, square to the eye, as far before it as what it stands on (`handedIntoTheWorld`,
 * `src/domain/placement.ts`), so the eye moves past it from then on: words beside a part stand beside it in the world.
 * What it stands in and where it stands there are written into it at once, so nothing of it moves, and what it shows
 * goes on as it was.
 */
function objectIntoTheWorld(kind: ShownKind, move: string, script: TakenScript): Move {
	assertWritten(script, TAKEN_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: HELD_ANEW,
		timing: timingOf(script),
		begin: (beginning) => handedOver(beginning, name, kind, move)
	};
}

/** What objects stand in as a move begins: the camera as the scene shows it, the groups and the objects standing. */
export function holdersAsTheyStand(beginning: Beginning): Holders {
	return holdersIn(beginning.scene, cameraOf(beginning.scene, beginning.format));
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
 * A move's beginning as what stands in a holder sees it: on the frame, on the page or over it, in a group or beside a
 * point, which read the frame's places, as it is; inside the page's window, its frame the window's box as it stands, so
 * a box in shares of the frame reads as one in shares of the window.
 */
function seenFrom(beginning: Beginning, holder: Holder): Beginning {
	switch (holder.kind) {
		case 'frame':
		case 'world':
		case 'ride':
		case 'page':
		case 'pageInTheWorld':
		case 'group':
		case 'point':
			return beginning;
		case 'window': {
			const box = viewOf(beginning.scene.window).box;
			return { ...beginning, format: { ...beginning.format, frame: { width: box.width, height: box.height } } };
		}
	}
}

/**
 * A move's beginning as what stands in a holder reads the page through the camera: in the world, riding a page there
 * or not, the camera standing where it stands and seen from the eye at rest, the frame's plane then the world's, so a
 * box read there stands over what it was read off wherever the eye stands; anywhere else, on the page in the world
 * too, which reads the page as the page in the window does, as the eye stands. The camera is stood at its pose, as the
 * eye paces a camera's way through keys.
 */
function readFrom(beginning: Beginning, holder: Holder): Beginning {
	switch (holder.kind) {
		case 'world':
		case 'ride': {
			const pose = cameraOf(beginning.scene, beginning.format).pose;
			const atRest = eyeAtRest(beginning.scene.eye.focalLength);
			const asAtRest = withEye(withProp(beginning.scene, 'camera', standingAt(pose)), atRest);
			return { ...beginning, scene: asAtRest };
		}
		case 'frame':
		case 'window':
		case 'page':
		case 'pageInTheWorld':
		case 'group':
		case 'point':
			return beginning;
	}
}

/**
 * A box a move works out as what stands in a holder sees it, as a box in what the holder measures in, for the object
 * of a name: as it is on the frame and inside the window; on the page, in the window or in the world, where the camera
 * shows it on the screen as the move begins, the window facing the frame front on; riding a page, so where the camera
 * shows that page as it lies on the screen then, a box read as from the eye at rest, as one in the world is; in a
 * group, measured from the group's corner, where it stands once the group stands as it was placed. Beside a point, a
 * box is worked out off the point alone, so it stands as it is.
 */
function measuredIn(beginning: Beginning, holder: Holder, box: Box, name: ObjectName, move: string): Box {
	switch (holder.kind) {
		case 'frame':
		case 'world':
		case 'window':
		case 'point':
			return box;
		case 'ride': {
			const atRest = readFrom(beginning, holder);
			const camera = cameraFrontOn(atRest, `${move} measures the ${name} on the page`);
			return boxOnTheScreen(cameraOnItsPage(holder, holdersIn(atRest.scene, camera)), beginning.format.frame, box);
		}
		case 'page':
		case 'pageInTheWorld': {
			const camera = cameraFrontOn(beginning, `${move} measures the ${name} on the page`);
			return boxOnTheScreen(camera, beginning.format.frame, box);
		}
		case 'group':
			return measuredFrom(box, groupNamed(beginning.scene.groups, holder.name).box, AS_LARGE);
	}
}

/**
 * How an object of a name lands on a block of the page from where it stands as a move begins: what it stands in on its
 * way and there, where it sets off, its box in the screen's pixels, and how it stands as it lies on the block. One on
 * the page lies on it, and stays so. One on the frame, lying flat, lies on the page from the start, where the camera
 * shows its box, as it stands; leant or near the eye it is refused, as it would lie flat at once. One in the world,
 * riding a page there or not, stands on the page in the world where it stands, carried onto the page's plane standing
 * there, and comes down onto the block on its way, so it falls as it travels: on it, face-on at its nearest whole
 * turns and rolled as it stood; a ride ends there. One on the page in the world already lands so too. One inside the
 * window, in a group or beside a point is refused, as it goes with what it stands in.
 */
function landingOf(beginning: Beginning, object: FrameObject, name: ObjectName, move: string): Landing {
	switch (object.inside.kind) {
		case 'page':
			return { holder: ON_THE_PAGE, from: object, lying: stanceOf(object) };
		case 'frame': {
			if (!liesOnItsPlane(object)) {
				throw new FilmError(
					`${move} would lay the ${name} flat on the page while it leans or stands near the eye: bring it face-on and to no depth first`
				);
			}
			const lying = stanceOf(object);
			const from = { ...lying, box: measuredIn(beginning, ON_THE_PAGE, object.box, name, move) };
			return { holder: ON_THE_PAGE, from, lying };
		}
		case 'world':
		case 'ride':
		case 'pageInTheWorld': {
			const from = carriedOntoThePageInTheWorld(beginning, object, name, move);
			const lying = { ...from, depth: AS_PLACED.depth, angle: { ...faceOnNearest(from.angle), roll: from.angle.roll } };
			return { holder: ON_THE_PAGE_IN_THE_WORLD, from, lying };
		}
		case 'window':
			throw new FilmError(`${move} would carry the ${name} out of the window onto the page: it stands in the window`);
		case 'group':
			throw new FilmError(`${move} would carry the ${name} out of its group onto the page: it goes with its group`);
		case 'point':
			throw new FilmError(`${move} would carry the ${name} onto the page: it stands beside a part, and goes with it`);
	}
}

/**
 * Where an object of a name standing in the world, riding a page there or not, or on the page in the world, stands on
 * the page in the world as a move begins: carried onto the page's plane standing there, standing off it as it stands;
 * refused where that plane would stretch it, the window standing grown and leant from it at once.
 */
function carriedOntoThePageInTheWorld(
	beginning: Beginning,
	object: FrameObject,
	name: ObjectName,
	move: string
): Placement {
	const holders = holdersAsTheyStand(beginning);
	const there = carriedInto(object, object.inside, ON_THE_PAGE_IN_THE_WORLD, holders, beginning.format.frame);
	if (there === null) {
		throw new FilmError(
			`${move} would stand the ${name} stretched over the page, as the window stands grown and leant from it at once, and a plane grows across and down its own alone: bring the window as large as its box, or the ${name} face-on to it, first`
		);
	}
	return there;
}

/** How an object stands about its box's middle, apart from all else it holds. */
function stanceOf(object: FrameObject): Stance {
	return { scale: object.scale, depth: object.depth, angle: object.angle, about: object.about };
}

/**
 * Refuses a place inside the page's window that is not a box in its shares, where a move names one: every name of a
 * place, and every split, is the frame's; and any place for what stands beside a point, which stands off the point.
 */
function refusePlacedInside(holder: Holder, place: Place | null, where: string): void {
	if (place === null) return;
	if (holder.kind === 'window' && !readsInAnyBox(place)) {
		throw new FilmError(`${where} inside the window is a box in the window's shares, { left, top, width, height }`);
	}
	if (holder.kind === 'point') {
		throw new FilmError(
			`${where} is a place of the frame, and what stands beside a part stands off it: hide it, and show it at the place`
		);
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
 * read the page where it must, and standing where it comes up there.
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
	const coming = await comingAt(readFrom(seenFrom(beginning, holder), holder));
	const standing = arrivingIn(beginning, holder, coming.box, name, move);
	return appearing(beginning, name, holder, { content: coming.content, standing }, arrival, move);
}

/**
 * Where an object comes up standing in a holder, its box read as what stands there sees it: measured there, as placed;
 * in a group, where it would stand on the frame, carried into the group's plane however the group stands, so it stands
 * still as it joins; refused where the group stands grown and leant from the frame at once, which would stretch it.
 */
function arrivingIn(beginning: Beginning, holder: Holder, box: Box, name: ObjectName, move: string): Placement {
	if (holder.kind !== 'group') return { box: measuredIn(beginning, holder, box, name, move), ...AS_PLACED };
	const holders = holdersAsTheyStand(beginning);
	const joining = carriedInto({ box, ...AS_PLACED }, ON_THE_FRAME, holder, holders, beginning.format.frame);
	if (joining === null) {
		throw new FilmError(
			`${move} joins the group "${holder.name}" while it stands grown and leant from the frame at once: what joins it would stand stretched there, as a group grows across and down its own plane alone; join it while the group stands as large as its box, or faces the frame`
		);
	}
	return joining;
}

/**
 * Refuses an object coming up in a group none of stands, and one naming a zIndex in a group that draws by depth, where
 * it would order nothing.
 */
function refuseJoining(beginning: Beginning, holder: Holder, move: string): void {
	if (holder.kind !== 'group') return;
	const group = groupFound(beginning.scene.groups, holder.name, move);
	if (holder.zIndex !== null && group.order === 'depth') {
		throw new FilmError(
			`${move} names a zIndex in the group "${holder.name}", which draws by depth: leave it out, or order the group by zIndex`
		);
	}
}

/**
 * An object coming into its box, standing there as it comes up, in the way it comes up there, or from a frame past it
 * where it slides in, a frame of what it stands in, the window's box inside the window, pushing the one of its name
 * standing: from as many frames past as that one goes, so the two move as one sheet.
 */
function appearing(
	beginning: Beginning,
	name: ObjectName,
	holder: Holder,
	arriving: Arriving,
	arrival: Arrival,
	move: string
): Change {
	const within = seenFrom(beginning, holder).format.frame;
	const push = pushOf(beginning, name, arrival.from, within, move);
	const { box } = arriving.standing;
	const arrived: FrameObject = {
		inside: holder,
		...arriving.standing,
		...arrival.effects,
		shown: WHOLE,
		// Not going: neither gone nor on its way out
		gone: NONE,
		way: arrival.way,
		content: arriving.content
	};
	const frames = framesToComeIn(arrived, arrival.from, push, within, beginning);
	const start = enteringFrom(box, arrival.from, within, frames);
	return (scene, progress) =>
		withLeaving(
			withObject(scene, name, {
				...arrived,
				box: boxToward(start, box, progress),
				shown: shownComing(arrival.from, progress)
			}),
			name,
			pushedAt(push, progress)
		);
}

/**
 * How many frames of what it stands in an object slides in from past its box, for all of it as drawn to stand past the
 * edge there as it sets off, seen as the eye stands, one in the world too; as far as the one it pushes goes where that
 * is farther, so the two move as one sheet. One coming up in its place sets off from none.
 */
function framesToComeIn(
	arrived: FrameObject,
	from: FrameSide | null,
	push: Push | null,
	within: Size,
	beginning: Beginning
): number {
	if (from === null) return ONE_FRAME;
	const own = framesPastTheEdge(arrived, from, within, holdersAsTheyStand(beginning), beginning.format.frame);
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
		...effectsNamed(object, script),
		colour: script.colour ?? from.colour,
		scale: script.scale ?? object.scale,
		depth: depthAsked(script.depth, object.depth, beginning.format.frame)
	};
	refuseNearingInside(object, to.depth, name, move);
	refuseMeltTurned(object, to, name, move);
	return writing(name, (progress) => namedToward(EFFECTS_IN_PLACE, from, to, names, progress));
}

/** How an object stands out with the values a film names, as it writes them, the rest as they stand. */
function effectsNamed(standing: Effects, named: StandingOutScript): Effects {
	return {
		ring: fractionOf(named.ring ?? standing.ring),
		glow: fractionOf(named.glow ?? standing.glow),
		shadow: fractionOf(named.shadow ?? standing.shadow),
		blur: named.blur ?? standing.blur,
		colour: named.colour ?? standing.colour,
		melt: named.melt === undefined ? standing.melt : { ...named.melt, share: fractionOf(named.melt.share) },
		fade: fractionOf(named.fade ?? standing.fade)
	};
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
 * The object's angle on its way from how it faces to the film's, about the point of its box it turns about. Inside the
 * page's window, or on the page in it, it leans as the window does, and a lean of its own would only lie flat on the
 * window's, so a tilt, a turn or a turn over is refused there: it rolls.
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
	const to = leantFrom(object, script, move, name);
	const flat = flatOnTheWindowSaid(object.inside);
	if (flat !== null && (to.angle.tilt !== from.tilt || to.angle.turn !== from.turn || to.angle.over !== from.over)) {
		throw new FilmError(
			`${move} would tilt, turn or turn over the ${name} alone: ${flat}, and leans as it does; it rolls in it`
		);
	}
	return writing(name, (progress): Leant => ({ angle: angleToward(from, to.angle, progress), about: to.about }));
}

/**
 * Where what an object stands in lays it flat on the window's plane, as a refusal says it: inside the window, or on the
 * page in it; none where it stands on the frame, in the world, riding a page there or not, on the page in the world,
 * in a group or beside a point, free to lean and come near.
 */
function flatOnTheWindowSaid(holder: Holder): string | null {
	switch (holder.kind) {
		case 'window':
			return 'it stands inside the window';
		case 'page':
			return 'it lies on the page';
		case 'frame':
		case 'world':
		case 'ride':
		case 'pageInTheWorld':
		case 'group':
		case 'point':
			return null;
	}
}

/**
 * The object of a kind on its way back from how it stands to the box `boxAt` works out of it, as large as its box, on
 * its plane, and face-on by its nearest whole turns.
 */
function goingBack<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	kind: Kind,
	boxAt: (beginning: Beginning, object: ShowingOf<Kind>) => Box,
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const backTo = boxAt(readFrom(beginning, object.inside), object);
	const to: Carried = {
		box: measuredIn(beginning, object.inside, backTo, name, move),
		scale: AS_PLACED.scale,
		depth: AS_PLACED.depth
	};
	const faceOn = faceOnNearest(object.angle);
	return writing(name, (progress): Partial<Carried & Leant> => ({
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
 * The object on its way onto a block of the page, from where it stood as the move began to lying in the box of the
 * screen `landedOn` works out of it: what it lands in written into it at once, its box and how it stands there on their
 * way, travelling on the move's curve and falling on the one the film names, or on the move's; a fall named for one
 * lying flat on the page from the start, where nothing of it falls, is refused.
 */
async function laidOnto<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	kind: Kind,
	script: OntoScript,
	landedOn: (beginning: Beginning, object: ShowingOf<Kind>) => Promise<Box>,
	move: string
): Promise<Change> {
	const object = standingOfKind(beginning, name, move, kind);
	const landing = landingOf(beginning, object, name, move);
	if (script.fall !== undefined && landing.holder.kind === ON_THE_PAGE.kind) {
		throw new FilmError(
			`${move} names a fall for the ${name}, which lies flat on the page from the moment it sets off: nothing of it falls, leave fall out`
		);
	}
	const end = await landedOn(beginning, object);
	return crossing(name, landing.holder, landing.from, { ...landing.lying, box: end }, script.fall);
}

/**
 * The object handed into the world where the eye sees it as the move begins: what it stands in and where it stands
 * there written into it at once; refused where it stands beside a point at the eye or behind it.
 */
function handedOver(beginning: Beginning, name: ObjectName, kind: ShownKind, move: string): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const from = onTheFramesPlane(object.inside, name, move);
	const there = handedIntoTheWorld(object, from, holdersAsTheyStand(beginning), beginning.format.frame);
	if (there === null) {
		throw new FilmError(
			`${move} would stand the ${name} as far before the eye as the point it stands beside, which stands at the eye or behind it: hand it over while the eye sees that point`
		);
	}
	return crossing(name, IN_THE_WORLD, there, there);
}

/**
 * An object crossing into another holder, as `onto` carries it and `intoTheWorld` hands it over: what it stands in
 * written into it at once, and where it stands there carried from one placement to another on its way, its box and
 * scale as far as the move has come, its depth and angle as far as its `fall` has with the share of its time gone,
 * where one is named, else with the box; a move that hands it over at once names the same placement at both ends.
 */
function crossing(name: ObjectName, holder: Holder, from: Placement, to: Placement, fall?: Ease): Change {
	return (scene, progress, timeGone) =>
		written(scene, name, crossedAt(holder, from, to, progress, fall?.(timeGone) ?? progress));
}

/**
 * Where an object crossing into another holder stands, travelled and fallen so far of the way: in the holder, its box
 * and scale travelled, its depth and angle fallen.
 */
function crossedAt(
	holder: Holder,
	from: Placement,
	to: Placement,
	travelled: number,
	fallen: number
): Partial<HeldAnew> {
	return {
		inside: holder,
		...carriedAlong(from, to, TRAVELLED, travelled),
		...carriedAlong(from, to, FALLEN, fallen),
		angle: angleToward(from.angle, to.angle, fallen)
	};
}

/**
 * What an object of a name stands in, where it stands on the frame's own plane, to be handed into the world from: the
 * frame, or a point beside which it stands. One in the world already, riding a page there or not or on the page in
 * the world, is refused, and one inside the window, on the page or in a group, as it goes with its holder.
 */
function onTheFramesPlane(holder: Holder, name: ObjectName, move: string): OnTheFramesPlane {
	switch (holder.kind) {
		case 'frame':
		case 'point':
			return holder;
		case 'world':
		case 'ride':
		case 'pageInTheWorld':
			throw new FilmError(`${move} finds the ${name} in the world already`);
		case 'window':
			throw new FilmError(`${move} would carry the ${name} out of the window into the world: it stands in the window`);
		case 'page':
			throw new FilmError(`${move} would carry the ${name} off the page into the world: it lies on the page`);
		case 'group':
			throw new FilmError(`${move} would carry the ${name} out of its group into the world: it goes with its group`);
	}
}

/**
 * The object going where it stands, in the way `wayFor` works out of the way the film names and of the object as it
 * stands as it sets off, on the film's frame, showing what its kind has it show as it goes; once gone, none.
 */
function objectGoing<Kind extends ShownKind>(
	beginning: Beginning,
	name: ObjectName,
	kind: Kind,
	named: Way,
	wayFor: WayFor<Kind>,
	shownAsItGoes: ShownAsItGoes<Kind>,
	move: string
): Change {
	const object = standingOfKind(beginning, name, move, kind);
	const way = wayFor(named, object, beginning.format.frame);
	const setOff = { ...object, content: shownAsItGoes(object.content) };
	return (scene, progress) => withObject(scene, name, goneIn(setOff, way, progress));
}

/** What a kind shows as it goes where its going changes nothing of it: what it showed. */
function asItShowed<Shown>(shown: Shown): Shown {
	return shown;
}

/** The way a kind goes where its move works out nothing of it: the way the film names. */
function asNamed(named: Way): Way {
	return named;
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
 * box a frame of what the one sliding in stands in past its own on the side across, or farther where it is drawn past
 * its box, until all of it stands past the edge; none where none stands, or nothing slides in. One standing in a group
 * or on the page, which never slides, is refused.
 */
function pushOf(
	beginning: Beginning,
	name: ObjectName,
	from: FrameSide | null,
	within: Size,
	move: string
): Push | null {
	const standingThere = beginning.scene.objects.get(name);
	if (from === null || standingThere === undefined) return null;
	if (standingThere.inside.kind === 'group') {
		throw new FilmError(`${move} would push the ${name} off past the frame's edge from its group: hide it first`);
	}
	if (standingThere.inside.kind === 'page') {
		throw new FilmError(`${move} would push the ${name} off past the frame's edge from the page: hide it first`);
	}
	const toward = acrossFrom(from);
	const holders = holdersAsTheyStand(beginning);
	const frames = framesPastTheEdge(standingThere, toward, within, holders, beginning.format.frame);
	return { object: standingThere, end: pastTheEdge(standingThere.box, toward, within, frames), frames };
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
