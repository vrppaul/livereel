/**
 * The eye: to a place in the room, where it stands and the spot it looks at, each in pixels of a frame 1080 high from
 * the frame's middle, and the way its top points (`src/domain/eye.ts`), through the places the film names on its way,
 * on the course it names (`src/moves/through.ts`). What stands in the world — the page's window, an object a film shows
 * there — is seen from wherever the eye stands; what stands on the frame, a title or a caption, rides with it. What a
 * place leaves out, where the eye stands, what it looks at or the way its top points, stays as it stands as the move
 * begins, at its end and at every key.
 *
 * The path is worked out once, as the move begins, from where the eye stands then: its places are values of the room,
 * and nothing the eye passes moves under it.
 *
 * The eye flies over the page's window by a move of its own (`src/domain/flight.ts`): from where it stands, along legs
 * to spots over blocks of the page, its gaze turned by keys of its own; or to where it stands square before a block as
 * the eye coming before it would, the leg setting the gaze square there as it ends, so no key of the film's may be
 * reached by it. The blocks are read once, as the move begins,
 * as the camera shows the page in the window then, and the eye rides the window from then on, so a window that leans
 * or travels carries it, until `eye.to` sends it into the room again. Its legs are timed apart where every one names
 * how long it takes: then their times alone pace it, and its share of the step goes on its own time, on no curve.
 *
 * The eye comes before a block of the page by a move of its own, square to it or turned from square, the block filling
 * a share of the frame, its middle at a point of the frame: the block is read once, as the move begins, where the camera
 * shows it in the window then, and the eye rides the window from then on, as a flight leaves it.
 *
 * The eye focuses, and opens as wide as a film names, by a move of its own, which shares a step with one that sends it
 * somewhere (`src/domain/focus.ts`): so far before it; at a spot of the world; on a block of the page; or on an object,
 * where its middle stands. What it focuses on is read once, as the move begins, and placed where it stands as each
 * frame is drawn, so the focus holds on it while the eye, the window and the camera move. Or it focuses under a point
 * of the frame, where it sees the window's plane there as each frame is drawn, so the focus stays under the point
 * while the window leans and turns beneath it.
 */
import {
	AN_EYE_PLACE,
	AN_EYE_PLACE_OR_REST,
	EYE_SPACE,
	type Eye,
	type EyeFraming,
	type EyePlace,
	type EyePlaceOrRest,
	type Focus,
	PACES_BEFORE_A_PLANE,
	type PaceBeforeAPlane,
	type Viewpoint,
	eyeSentTo,
	pacedBeforeAPlane,
	pathThatSees,
	placesThatRollOneWay,
	viewpointBefore,
	viewpointOf
} from '../domain/eye.ts';
import { type Camera, eyeInTheWindow, underTheFrame } from '../domain/camera.ts';
import { pointInTheView } from '../domain/framing.ts';
import { IN_THE_WORLD, ON_ITS_PLANE, ON_THE_PAGE, fromItsMiddle } from '../domain/placement.ts';
import { FilmError } from '../domain/errors.ts';
import {
	AN_OWN_FIGURE,
	EVENLY,
	type Flight,
	type GazeKey,
	JOININGS,
	type Joining,
	type Leg,
	type LegsTimed,
	type OwnFigure,
	type Pace,
	type Way,
	flownAt,
	gazeOf,
	momentBy,
	paceOf,
	pointAtMoment,
	wayOf
} from '../domain/flight.ts';
import { linear } from '../domain/curves.ts';
import { AT_THE_EYE, focusDistanceOf } from '../domain/focus.ts';
import {
	A_POINT_OF_THE_FRAME,
	type Box,
	HALVES,
	MIDDLE_SHARE,
	type Point,
	type Size,
	boxBetween,
	boxOf,
	frameScaleOf,
	middleX,
	middleY,
	pointAt
} from '../domain/geometry.ts';
import {
	A_NAME,
	A_NUMBER,
	A_PIXELS,
	A_SHARE,
	A_SIZE,
	type Form,
	FormByName,
	type Kind,
	ListOf,
	Literal,
	OfForm,
	OneOf,
	Plain,
	assertKind,
	assertWritten,
	described,
	isMoreThanNone,
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import { A_SPOT, type Spot, scaledBy } from '../domain/matrix.ts';
import { NO_KEYS, type Path, type Through, pathOf } from '../domain/path.ts';
import { amountToward } from '../domain/toward.ts';
import { trackOf } from '../domain/track.ts';
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
	shownBox,
	timingOf
} from '../direction/move.ts';
import { type ObjectName, focusOn } from '../props/object.ts';
import { cameraOf, withEye } from '../scene.ts';
import { holdersAsTheyStand, standing } from './object.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/** The places the eye passes on its way to its own, and how its path goes through them. */
export interface EyeToScript extends TimingScript, ThroughScript<EyePlace> {}

/** A spot over the page's window: `height` pixels of a frame 1080 high over the middle of a block of the page. */
export interface Over {
	readonly over: Target;
	readonly height: number;
}

/**
 * How long a leg takes beside the flight's other legs, in proportion to theirs: legs that take 2, 2.5 and 3 split a
 * move of 7.5 s into those seconds. Every leg names it, or none.
 */
interface TimedLeg {
	readonly takes?: number;
}

/** A leg flown straight to a point over the page, or smoothly through it, as the way joins its legs. */
interface LegTo extends TimedLeg {
	readonly to: Over;
}

/**
 * A leg flown on a parabola to a point over the page, arriving heading so many degrees from up the page clockwise, its
 * turn as far before the point as `bend` shares of the leg's chord.
 */
interface LegBending extends LegTo {
	readonly arriving: number;
	readonly bend: number;
}

/** A leg flown straight on along the way's last heading, `ahead` times as long as the leg before. */
interface LegAhead extends TimedLeg {
	readonly ahead: number;
}

/**
 * A leg flown along a figure the film draws in three.js, its points x across, y down and z out in pixels of a frame
 * 1080 high, set off from where the leg starts.
 */
interface LegAlong extends TimedLeg {
	readonly along: OwnFigure;
}

/**
 * How a film frames a block the eye stands before: so near that, seen square, the block fills `fills` of the frame
 * along the side it fills most; its middle at `middleAt` of the frame, in shares of it from its top left corner, the
 * frame's middle where none is named.
 */
interface FramingScript {
	readonly fills: number;
	readonly middleAt?: Point;
}

/** A leg flown to where the eye stands square before a block as the film frames it, as `eye.onto` stands it. */
interface LegOnto extends TimedLeg, FramingScript {
	readonly onto: Target;
}

/** A leg of a flight's way, as a film writes it. */
export type LegScript = LegTo | LegBending | LegAhead | LegAlong | LegOnto;

/**
 * A key of the eye's gaze, reached as the eye reaches the end of its way's leg `by`, from 0 for the first, or past it
 * by a share of the next leg's time: 1.5 half way through leg 2.
 */
interface GazeKeyScript {
	readonly by: number;
}

/** A key of the eye's gaze of so many degrees. */
type DegreesKeyScript = GazeKeyScript & { readonly degrees: number };

/**
 * A heading the eye follows: so many degrees from up the page clockwise; toward a block of the page, wherever it
 * stands; or along the way it flies, `along: 'way'`.
 */
export type HeadingKeyScript =
	DegreesKeyScript | (GazeKeyScript & { readonly toward: Target }) | (GazeKeyScript & { readonly along: 'way' });

/**
 * A tip the eye follows: so many degrees off the page's plane, -90 looking straight down onto it, 0 level; or as far as
 * holds a block `at` a share down the frame wherever it stands, heading toward it.
 */
export type TipKeyScript = DegreesKeyScript | (GazeKeyScript & { readonly holding: Target; readonly at: number });

/**
 * How a flight goes: its legs joined smoothly where none is named, or straight; and its gaze's keys, heading and tip
 * apart, each kept as the eye set off where it names none.
 */
export interface FlyScript extends TimingScript {
	readonly shape?: Joining;
	readonly heading?: readonly HeadingKeyScript[];
	readonly tip?: readonly TipKeyScript[];
}

/**
 * How far a film turns the eye from square before a block, in degrees: `round` the page's upright toward its right,
 * `up` toward its top; none where it names none.
 */
interface TurnedScript {
	readonly round?: number;
	readonly up?: number;
}

/**
 * How the eye stands before a block: framed so, and turned from square about the block's middle as `turned` says,
 * square where it says nothing; and how it goes there, `pace`, by even steps of scale where it names none.
 */
export interface OntoScript extends TimingScript, FramingScript {
	readonly turned?: TurnedScript;
	readonly pace?: PaceBeforeAPlane;
}

/** An object a film focuses the eye on, by its name. */
interface ObjectFocus {
	readonly object: ObjectName;
}

/** A point of the frame a film focuses the eye under, in shares of the frame from its top left corner. */
interface UnderFocus {
	readonly under: Point;
}

/**
 * Where a film focuses the eye: so far before it along where it looks, in pixels of a frame 1080 high; at a spot of the
 * world; on a block of the page, the first a selector matches or a box of the screen, at its middle; on an object,
 * `{ object }` by its name, at its middle; or under a point of the frame, `{ under }`.
 */
export type FocusOn = number | Spot | Target | ObjectFocus | UnderFocus;

/** How wide the eye opens as it focuses, `aperture`, in pixels of a frame 1080 high; left out, as wide as it stands. */
export interface FocusScript extends TimingScript {
	readonly aperture?: number;
}

/** Where a film focuses the eye, told apart by what it writes. */
type FocusAsked =
	| { readonly kind: 'distance'; readonly distance: number }
	| { readonly kind: 'world'; readonly spot: Spot }
	| { readonly kind: 'block'; readonly target: Target }
	| { readonly kind: 'object'; readonly name: ObjectName }
	| { readonly kind: 'under'; readonly share: Point };

const TO_FORM: Form<EyeToScript> = { ...throughFormOf(AN_EYE_PLACE, 'a list of places of the eye'), ...TIMING_FORM };
const FOCUS_FORM: Form<FocusScript> = { aperture: A_PIXELS, ...TIMING_FORM };
const AN_OBJECT_FOCUS = new OfForm<ObjectFocus>({ object: needed(A_NAME) }, 'an object by its name: { object }');
const AN_UNDER_FOCUS = new OfForm<UnderFocus>(
	{ under: needed(A_POINT_OF_THE_FRAME) },
	'under a point of the frame: { under: { left, top } }'
);
const A_TURN_FROM_SQUARE: Kind<number> = new Plain(
	isTurnFromSquare,
	'degrees turned from square, more than -90 and less than 90'
);
const A_SHARE_FILLED = new Plain(
	isMoreThanNone,
	'the share of the frame the block fills along the side it fills most, more than 0'
);
const ONTO_FORM: Form<OntoScript> = {
	fills: needed(A_SHARE_FILLED),
	middleAt: A_POINT_OF_THE_FRAME,
	turned: new OfForm<TurnedScript>(
		{ round: A_TURN_FROM_SQUARE, up: A_TURN_FROM_SQUARE },
		'a turn from square: { round, up }, in degrees'
	),
	pace: new OneOf(PACES_BEFORE_A_PLANE, '"scale" or "even"'),
	...TIMING_FORM
};
const FOCUS_ON_SAID =
	'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; an object, { object }; or under a point of the frame, { under: { left, top } } in shares of it';
const AN_OVER = new OfForm<Over>(
	{ over: needed(A_TARGET), height: needed(A_SIZE) },
	'a spot over the page: { over, height }, a block and how high over it in pixels of a frame 1080 high, more than 0'
);
const A_LEGS_TIME = new Plain(isMoreThanNone, 'how long the leg takes beside the others, more than 0');
const A_LEG_BENDING = new OfForm<LegBending>(
	{
		to: needed(AN_OVER),
		arriving: needed(A_NUMBER),
		bend: needed(new Plain(isMoreThanNone, "a share of the leg's chord, more than 0")),
		takes: A_LEGS_TIME
	},
	'a leg bending: { to, arriving, bend, takes }'
);
const A_LEG: Kind<LegScript> = new FormByName<LegScript>(
	[
		[
			'ahead',
			new OfForm<LegAhead>(
				{
					ahead: needed(new Plain(isMoreThanNone, 'how many times as long as the leg before, more than 0')),
					takes: A_LEGS_TIME
				},
				'a leg ahead: { ahead, takes }'
			)
		],
		[
			'along',
			new OfForm<LegAlong>(
				{ along: needed(AN_OWN_FIGURE), takes: A_LEGS_TIME },
				'a leg along a figure: { along, takes }'
			)
		],
		[
			'onto',
			new OfForm<LegOnto>(
				{ onto: needed(A_TARGET), fills: needed(A_SHARE_FILLED), middleAt: A_POINT_OF_THE_FRAME, takes: A_LEGS_TIME },
				'a leg onto a block: { onto, fills, middleAt, takes }'
			)
		],
		['arriving', A_LEG_BENDING],
		['bend', A_LEG_BENDING]
	],
	new OfForm<LegTo>({ to: needed(AN_OVER), takes: A_LEGS_TIME }, 'a leg: { to, takes }'),
	'a leg: { to }, { to, arriving, bend }, { ahead }, { along } or { onto, fills }, each with how long it takes where the legs are timed'
);
const A_KEYS_PLACE: Kind<number> = new Plain(
	isAtOrPastTheFirstLeg,
	"a leg's end by its number, 0 for the first, or past one by a share of the next leg, 1.5 half way through leg 2"
);
const A_TIP: Kind<number> = new Plain(isTip, 'degrees from -90, looking straight down onto the page, to 90');
const A_HEADING_KEY: Kind<HeadingKeyScript> = new FormByName<HeadingKeyScript>(
	[
		['toward', new OfForm({ by: needed(A_KEYS_PLACE), toward: needed(A_TARGET) }, 'a heading: { by, toward }')],
		['along', new OfForm({ by: needed(A_KEYS_PLACE), along: needed(new Literal('way')) }, 'a heading: { by, along }')]
	],
	new OfForm({ by: needed(A_KEYS_PLACE), degrees: needed(A_NUMBER) }, 'a heading: { by, degrees }'),
	'a heading: { by, degrees }, { by, toward } or { by, along: "way" }'
);
const A_TIP_KEY: Kind<TipKeyScript> = new FormByName<TipKeyScript>(
	[
		[
			'holding',
			new OfForm(
				{ by: needed(A_KEYS_PLACE), holding: needed(A_TARGET), at: needed(A_SHARE) },
				'a tip: { by, holding, at }'
			)
		]
	],
	new OfForm({ by: needed(A_KEYS_PLACE), degrees: needed(A_TIP) }, 'a tip: { by, degrees }'),
	'a tip: { by, degrees } or { by, holding, at }'
);
const A_FLIGHTS_WAY = new ListOf(A_LEG, 'a list of legs');
const FLY_FORM: Form<FlyScript> = {
	shape: new OneOf(JOININGS, '"smooth" or "straight"'),
	heading: new ListOf(A_HEADING_KEY, 'a list of headings'),
	tip: new ListOf(A_TIP_KEY, 'a list of tips'),
	...TIMING_FORM
};
// How a flight's legs join where the film names none; and the gaze's keys where it names none, kept as it set off
const SMOOTH: Joining = 'smooth';
// How the eye goes before a block where the film names no pace: as the camera zooms
const BY_SCALE: PaceBeforeAPlane = 'scale';
const NO_GAZE_KEYS: readonly never[] = [];
// The moment a flight starts, as a share of its move's progress, and the first leg's end, which a gaze key is reached
// at or past; how high over the page a block the gaze turns to stands; and the bounds of a tip, in degrees
const ITS_START = 0;
const THE_FIRST_LEG = 0;
const LEVEL_WITH_THE_PAGE = 0;
const STRAIGHT_DOWN = -90;
const STRAIGHT_UP = 90;
// The gaze of the eye standing square before a block, as `viewpointBefore` stands it: heading up the page, its top
// pointing so, and tipped straight down onto the page
const UP_THE_PAGE = 0;
// How near over a block, on the page's plane, the eye stands to have no heading toward it, in pixels of a frame 1080
// high
const RIGHT_OVER = 1e-6;
// How far the eye stands turned from square where a film names no turn, and the quarter turn it stays within, in
// degrees: turned so far, it would stand on the page's plane
const SQUARE = 0;
const NOT_TURNED: EyeFraming['turned'] = { round: SQUARE, up: SQUARE };
const A_QUARTER_TURN = 90;
// What a refusal names each move by
const EYE_TO = 'eye.to';
const EYE_FLY = 'eye.fly';
const EYE_ONTO = 'eye.onto';
const EYE_FOCUS = 'eye.focus';
// The values of the eye each move sets: where it stands, looks and its top points, and what it stands in, every one of
// them, so the compiler refuses a value of where the eye stands that `eye.to` or `eye.fly` would set unnamed; where it
// focuses, and how wide it is open where the film names it
const SETS_WHERE_IT_STANDS: { readonly [Name in keyof Viewpoint | 'inside']: true } = {
	at: true,
	aim: true,
	up: true,
	inside: true
};
const STANDING = Object.keys(SETS_WHERE_IT_STANDS);
const FOCUSED = ['focusing'] as const satisfies readonly (keyof Eye)[];
const FOCUSED_AND_OPENED = ['focusing', 'aperture'] as const satisfies readonly (keyof Eye)[];

/** Where a film focuses the eye, as it writes it, told apart by its kind, or by the names an object is written with. */
class FocusOnKind implements Kind<FocusOn> {
	is(written: unknown): written is FocusOn {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (typeof written === 'number' && A_SIZE.is(written)) return undefined;
		if (typeof written === 'string') return A_TARGET.faultOf(written, place);
		if (!isObjectOfValues(written)) return `${place} is ${described(written)}: it is ${FOCUS_ON_SAID}`;
		if ('object' in written) return AN_OBJECT_FOCUS.faultOf(written, place);
		if ('under' in written) return AN_UNDER_FOCUS.faultOf(written, place);
		if ('across' in written) return A_SPOT.faultOf(written, place);
		return A_TARGET.faultOf(written, place);
	}
}

const A_FOCUS_ON: Kind<FocusOn> = new FocusOnKind();

/** The eye to a place, or back where it rests, through the places the film names on its way. */
export function to(place: EyePlaceOrRest, script: EyeToScript = {}): Move {
	assertKind(place, AN_EYE_PLACE_OR_REST, `${EYE_TO}'s place`);
	assertWritten(script, TO_FORM, EYE_TO);
	const through = throughWritten(script, EYE_TO);
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: timingOf(script),
		begin: (beginning) => sentAlong(cameraOf(beginning.scene, beginning.format).eye, through, place)
	};
}

/**
 * The eye flown over the page's window along a way of legs, from where it stands, its gaze turned by the keys the film
 * names and set square by each leg onto a block as it ends, riding the window from then on; paced by the move's curve,
 * or by its legs' times where the film names them.
 */
export function fly(way: readonly LegScript[], script: FlyScript = {}): Move {
	assertKind(way, A_FLIGHTS_WAY, `${EYE_FLY}'s way`);
	assertWritten(script, FLY_FORM, EYE_FLY);
	if (way.length === 0) throw new FilmError(`${EYE_FLY}'s way has no leg: name one or more`);
	const heading = script.heading ?? NO_GAZE_KEYS;
	const tip = script.tip ?? NO_GAZE_KEYS;
	refuseKeysOff(heading, way, 'heading');
	refuseKeysOff(tip, way, 'tip');
	const timed = legsTimedOf(way);
	const headingWithStands = keysWithStands(heading, way, UP_THE_PAGE);
	const tipWithStands = keysWithStands(tip, way, STRAIGHT_DOWN);
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: flightsTiming(script, timed),
		begin: (beginning) => flown(beginning, way, script.shape ?? SMOOTH, timed, headingWithStands, tipWithStands)
	};
}

/**
 * The eye brought before a block of the page from where it stands, as the film frames the block there, at the pace it
 * names, riding the window from then on.
 */
export function onto(target: Target, script: OntoScript): Move {
	assertKind(target, A_TARGET, `${EYE_ONTO}'s target`);
	assertWritten(script, ONTO_FORM, EYE_ONTO);
	const framing = framingOf(script, { round: script.turned?.round ?? SQUARE, up: script.turned?.up ?? SQUARE });
	const pace = script.pace ?? BY_SCALE;
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: timingOf(script),
		begin: (beginning) => broughtBefore(beginning, target, framing, pace)
	};
}

/**
 * The eye focused where the film names, from where it focused, and opened as wide as it names on the way, where it
 * names how wide.
 */
export function focus(on: FocusOn, script: FocusScript = {}): Move {
	assertKind(on, A_FOCUS_ON, `${EYE_FOCUS}'s focus`);
	assertWritten(script, FOCUS_FORM, EYE_FOCUS);
	const asked = askedOf(on);
	return {
		part: 'eye',
		valueNames: script.aperture === undefined ? FOCUSED : FOCUSED_AND_OPENED,
		timing: timingOf(script),
		begin: (beginning) => refocused(beginning, asked, script.aperture)
	};
}

/**
 * The eye's focus on its way from where it focused, where its last move took it, to what the film focuses it on, read
 * as the move begins and refused where that stands at the eye or behind it then; and the eye on its way to as wide as
 * the film opens it, where it names how wide.
 */
async function refocused(beginning: Beginning, asked: FocusAsked, aperture: number | undefined): Promise<Change> {
	const from = beginning.scene.eye.focusing.to;
	const to = await focusRead(beginning, asked);
	const camera = cameraOf(beginning.scene, beginning.format);
	if (focusDistanceOf(to, camera, beginning.format.frame) <= AT_THE_EYE) {
		throw new FilmError(
			`${EYE_FOCUS} focuses on what stands behind the eye, which it never sees: focus on what stands before it`
		);
	}
	if (aperture === undefined) return refocusing(from, to);
	return refocusingAndOpening(from, to, beginning.scene.eye.aperture, aperture);
}

/**
 * The eye on its way from where it stands, through the places on its way, to its own, each come to from where it
 * stands; refused where its up turns half round from one to the next, or it could not see anywhere on the way.
 */
function sentAlong(eye: Eye, through: Through<EyePlace>, place: EyePlaceOrRest): Change {
	const setOffFrom = viewpointOf(eye);
	const keys = through.keys.map((key) => eyeSentTo(setOffFrom, key, eye.focalLength));
	const end = eyeSentTo(setOffFrom, place, eye.focalLength);
	placesThatRollOneWay([setOffFrom, ...keys, end], EYE_TO);
	const path = pathOf(setOffFrom, { ...through, keys }, end, EYE_SPACE);
	return travelling(pathThatSees(path, EYE_TO), 'world');
}

/**
 * The eye on its way from where it stands, read riding the window as it stands as the move begins, to before a block
 * as the film frames it, the block read then where the camera shows it in the window, on its straight way at the pace
 * named; refused where its up turns half round on the way, it could not see anywhere on it, or it would go by scale
 * from where it shows the page at none.
 */
async function broughtBefore(
	beginning: Beginning,
	target: Target,
	framing: EyeFraming,
	pace: PaceBeforeAPlane
): Promise<Change> {
	const camera = cameraOf(beginning.scene, beginning.format);
	const setOffFrom = viewpointOf(eyeInTheWindow(camera.eye, camera.view, beginning.format.frame));
	const end = await standBefore(beginning, camera, target, framing, EYE_ONTO);
	placesThatRollOneWay([setOffFrom, end], EYE_ONTO);
	const way = pathThatSees(pathOf(setOffFrom, NO_KEYS, end, EYE_SPACE), EYE_ONTO);
	return travelling(pacedBeforeAPlane(way, setOffFrom, end, pace, EYE_ONTO), 'window');
}

/**
 * Where the eye stands before a block of the page as a film frames it, the block read as the move begins where the
 * camera shows it in the window then: in the window's own pixels of a frame 1080 high, `out` away from its face.
 */
async function standBefore(
	beginning: Beginning,
	camera: Camera,
	target: Target,
	framing: EyeFraming,
	move: string
): Promise<Viewpoint> {
	const frame = beginning.format.frame;
	const block = await shownBox(beginning, target, THE_FIRST, move);
	return viewpointBefore(boxOnTheWindowsPlane(camera, frame, block), framing, camera.eye.focalLength, frame);
}

/** How a film frames a block the eye stands before, turned from square as named: its middle the frame's where unnamed. */
function framingOf(script: FramingScript, turned: EyeFraming['turned']): EyeFraming {
	return { fills: script.fills, middleAt: script.middleAt ?? MIDDLE_SHARE, turned };
}

/**
 * The eye `progress` of the way along its path in what it stands in, the room or the window, where it focuses and how
 * wide it is open kept as they stand.
 */
function travelling(path: Path<Viewpoint>, inside: Eye['inside']): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, ...path.at(progress), inside });
}

/**
 * How a film times a flight's legs: not at all where no leg names how long it takes, apart where every leg does;
 * refused where some legs name it and some do not.
 */
function legsTimedOf(way: readonly LegScript[]): LegsTimed {
	const takes = way.flatMap((leg) => (leg.takes === undefined ? [] : [leg.takes]));
	if (takes.length === 0) return EVENLY;
	if (takes.length === way.length) return { kind: 'apart', takes };
	const untimed = way.findIndex((leg) => leg.takes === undefined);
	throw new FilmError(
		`${EYE_FLY}'s leg ${String(untimed)} names no time it takes, beside legs that do: name takes for every leg, or for none`
	);
}

/**
 * A flight's timing: its share of its step, on the move's curve where its legs are not timed; where they are, on its
 * share's time unbent, as its legs' times pace it from rest to rest, and refused where the film names a curve too.
 */
function flightsTiming(script: FlyScript, timed: LegsTimed): Timing {
	switch (timed.kind) {
		case 'evenly':
			return timingOf(script);
		case 'apart':
			if (script.ease !== undefined) {
				throw new FilmError(
					`${EYE_FLY}'s legs name how long each takes, which paces the flight from rest to rest: leave its ease out`
				);
			}
			return timingOf({ ...script, ease: linear });
	}
}

/**
 * Refuses gaze keys reached past the way's last leg, at the end of a leg onto a block, which sets the gaze there, or
 * no farther along than the key before.
 */
function refuseKeysOff(keys: readonly GazeKeyScript[], way: readonly LegScript[], named: string): void {
	const lastLeg = way.length - 1;
	let legBefore: number | null = null;
	for (const [index, key] of keys.entries()) {
		if (key.by > lastLeg) {
			throw new FilmError(
				`${EYE_FLY}'s ${named} key ${String(index)} is reached by leg ${String(key.by)}, and the way's legs go from 0 to ${String(lastLeg)}`
			);
		}
		// A key past a leg's end by a share stands inside the next leg, short of the end a stand sets the gaze at
		const endingLeg = Number.isInteger(key.by) ? way[key.by] : undefined;
		if (endingLeg !== undefined && 'onto' in endingLeg) {
			throw new FilmError(
				`${EYE_FLY}'s ${named} key ${String(index)} is reached by leg ${String(key.by)}, which stands before a block and sets the gaze at its end: name no key by it`
			);
		}
		if (legBefore !== null && key.by <= legBefore) {
			throw new FilmError(
				`${EYE_FLY}'s ${named} key ${String(index)} is reached by leg ${String(key.by)}, no farther than the key before it: name each by a later leg`
			);
		}
		legBefore = key.by;
	}
}

/**
 * A gaze's keys with one of so many degrees by each leg onto a block, the gaze square before it there, in the order of
 * the legs they are reached by.
 */
function keysWithStands<Key extends GazeKeyScript>(
	keys: readonly Key[],
	way: readonly LegScript[],
	degrees: number
): readonly (Key | DegreesKeyScript)[] {
	const stands = way.flatMap((leg, by) => ('onto' in leg ? [{ by, degrees }] : []));
	return [...keys, ...stands].toSorted((first, second) => first.by - second.by);
}

/**
 * The eye flying from where it stands as the move begins, read riding the window as it stands then: its legs' points
 * over the blocks they name, read off the page then, its way and its pace along it, and its gaze from how it looks then
 * through the rules its keys name, the blocks they name read then too.
 */
async function flown(
	beginning: Beginning,
	way: readonly LegScript[],
	joining: Joining,
	timed: LegsTimed,
	heading: readonly HeadingKeyScript[],
	tip: readonly TipKeyScript[]
): Promise<Change> {
	const camera = cameraOf(beginning.scene, beginning.format);
	const frame = beginning.format.frame;
	const setOff = eyeInTheWindow(camera.eye, camera.view, frame);
	const legs: Leg[] = [];
	for (const leg of way) legs.push(await legRead(beginning, camera, leg));
	const flightsWay = wayOf(setOff.at, legs, joining, EYE_FLY);
	const pace = paceOf(timed, flightsWay);
	const gaze = gazeOf(setOff);
	const headings: GazeKey[] = [];
	for (const [index, key] of heading.entries()) {
		headings.push(await headingRead(beginning, camera, flightsWay, pace, key, index));
	}
	const tips: GazeKey[] = [];
	for (const key of tip) tips.push(await tipRead(beginning, camera, flightsWay, pace, key));
	const flight: Flight = {
		way: flightsWay,
		pace,
		heading: [{ moment: ITS_START, rule: { kind: 'degrees', degrees: gaze.heading } }, ...headings],
		tip: [{ moment: ITS_START, rule: { kind: 'degrees', degrees: gaze.tip } }, ...tips],
		roll: gaze.roll,
		eye: { focalLength: camera.eye.focalLength, frameHeight: frame.height / frameScaleOf(frame) }
	};
	return (scene, progress) => withEye(scene, { ...scene.eye, ...flownAt(flight, progress), inside: 'window' });
}

/**
 * A leg of the way as the film writes it, its point read over the block it names, or where the eye stands square before
 * it as the film frames it.
 */
async function legRead(beginning: Beginning, camera: Camera, leg: LegScript): Promise<Leg> {
	if ('ahead' in leg) return { kind: 'ahead', times: leg.ahead };
	if ('along' in leg) return { kind: 'along', figure: leg.along };
	if ('onto' in leg) {
		const stand = await standBefore(beginning, camera, leg.onto, framingOf(leg, NOT_TURNED), EYE_FLY);
		return { kind: 'to', to: stand.at };
	}
	const to = await spotOver(beginning, camera, leg.to.over, leg.to.height);
	if ('arriving' in leg) return { kind: 'bending', to, arriving: leg.arriving, bend: leg.bend };
	return { kind: 'to', to };
}

/**
 * A heading key at the moment of the flight it is reached at, and its rule: its degrees, along the way, or toward a
 * block, refused where the eye stands right over the block then, where no heading is toward it.
 */
async function headingRead(
	beginning: Beginning,
	camera: Camera,
	way: Way,
	pace: Pace,
	key: HeadingKeyScript,
	index: number
): Promise<GazeKey> {
	const moment = momentBy(way, pace, key.by);
	if ('degrees' in key) return { moment, rule: { kind: 'degrees', degrees: key.degrees } };
	if ('along' in key) return { moment, rule: { kind: 'along' } };
	const spot = await spotOver(beginning, camera, key.toward, LEVEL_WITH_THE_PAGE);
	const standing = pointAtMoment(way, pace, moment);
	if (Math.hypot(spot.across - standing.across, spot.down - standing.down) < RIGHT_OVER) {
		throw new FilmError(
			`${EYE_FLY}'s heading key ${String(index)} turns toward a block the eye stands right over there: turn it toward one ahead of it`
		);
	}
	return { moment, rule: { kind: 'toward', spot } };
}

/**
 * A tip key at the moment of the flight it is reached at, and its rule: its degrees, or as far as holds a block so far
 * down the frame.
 */
async function tipRead(
	beginning: Beginning,
	camera: Camera,
	way: Way,
	pace: Pace,
	key: TipKeyScript
): Promise<GazeKey> {
	const moment = momentBy(way, pace, key.by);
	if ('degrees' in key) return { moment, rule: { kind: 'degrees', degrees: key.degrees } };
	const spot = await spotOver(beginning, camera, key.holding, LEVEL_WITH_THE_PAGE);
	return { moment, rule: { kind: 'holding', spot, downTheFrame: key.at } };
}

/** The spot so high over the middle of a block of the page, read as the move begins, over the window's own plane. */
async function spotOver(beginning: Beginning, camera: Camera, target: Target, height: number): Promise<Spot> {
	const frame = beginning.format.frame;
	const block = await shownBox(beginning, target, THE_FIRST, EYE_FLY);
	return { ...onTheWindowsPlane(camera, frame, { left: middleX(block), top: middleY(block) }), out: height };
}

/** Where a box of the screen stands on the window's own plane, between where its corners stand there. */
function boxOnTheWindowsPlane(camera: Camera, frame: Size, box: Box): Box {
	const topLeft = onTheWindowsPlane(camera, frame, { left: box.left, top: box.top });
	const footRight = onTheWindowsPlane(camera, frame, { left: box.left + box.width, top: box.top + box.height });
	return boxBetween({ left: topLeft.across, top: topLeft.down }, { left: footRight.across, top: footRight.down });
}

/**
 * Where a point of the screen stands on the window's own plane, as the camera shows the page in it: in pixels of a
 * frame 1080 high from the window's middle.
 */
function onTheWindowsPlane(camera: Camera, frame: Size, point: Point): Spot {
	const inTheView = pointInTheView(camera, frame, point);
	return scaledBy(fromItsMiddle(camera.view.box, inTheView), 1 / frameScaleOf(frame));
}

/**
 * What a film focuses the eye on, told apart: a distance, a spot of the world, a block of the page, an object, or a
 * point of the frame it focuses under.
 */
function askedOf(on: FocusOn): FocusAsked {
	if (typeof on === 'number') return { kind: 'distance', distance: on };
	if (typeof on === 'string') return { kind: 'block', target: on };
	if ('object' in on) return { kind: 'object', name: on.object };
	if ('under' in on) return { kind: 'under', share: on.under };
	if ('across' in on) return { kind: 'world', spot: on };
	return { kind: 'block', target: on };
}

/**
 * Where the eye focuses on what a film names, read as the move begins: a distance as it is; a spot of the world, on
 * its plane; a block of the page, at its middle as the page lays it out; an object, at its middle where it stands,
 * refused where none of its name stands; a point of the frame, under it.
 */
async function focusRead(beginning: Beginning, asked: FocusAsked): Promise<Focus> {
	switch (asked.kind) {
		case 'distance':
			return asked;
		case 'world':
			return focusInTheWorld(asked.spot, beginning.format.frame);
		case 'block': {
			const block = await shownBox(beginning, asked.target, THE_FIRST, EYE_FOCUS);
			const point = { left: middleX(block), top: middleY(block) };
			return { kind: 'spot', holder: ON_THE_PAGE, point, depth: ON_ITS_PLANE };
		}
		case 'object':
			return focusOn(standing(beginning, asked.name, EYE_FOCUS), holdersAsTheyStand(beginning), beginning.format.frame);
		case 'under':
			return focusUnder(beginning, asked.share);
	}
}

/**
 * A focus under a point of the frame, written in shares of it, at that point in the frame's pixels: refused where the
 * eye sees past the window's plane there as the move begins, where it would focus on nothing.
 */
function focusUnder(beginning: Beginning, share: Point): Focus {
	const frame = beginning.format.frame;
	const point = pointAt(boxOf(frame), share);
	if (underTheFrame(cameraOf(beginning.scene, beginning.format), frame, point) === null) {
		throw new FilmError(
			`${EYE_FOCUS} focuses under a point of the frame where the eye sees past the window's plane: focus under a point where it sees that plane`
		);
	}
	return { kind: 'under', point };
}

/**
 * A focus at a spot of the room, as the eye's spots are written, in pixels of a frame 1080 high from the frame's
 * middle: on the world's plane, in the frame's pixels from its top left corner, and as far out of it.
 */
function focusInTheWorld(spot: Spot, frame: Size): Focus {
	const inTheFrame = scaledBy(spot, frameScaleOf(frame));
	const point = { left: frame.width / HALVES + inTheFrame.across, top: frame.height / HALVES + inTheFrame.down };
	return { kind: 'spot', holder: IN_THE_WORLD, point, depth: inTheFrame.out };
}

/** The eye's focus `progress` of the way from where it focused to where it focuses. */
function refocusing(from: Focus, to: Focus): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, focusing: trackOf(from, to, progress) });
}

/**
 * The eye's focus `progress` of the way from where it focused to where it focuses, and the eye opened so far of the
 * way from how wide it stood to how wide the film names, held between the two.
 */
function refocusingAndOpening(from: Focus, to: Focus, openedFrom: number, opened: number): Change {
	return (scene, progress) =>
		withEye(scene, {
			...scene.eye,
			focusing: trackOf(from, to, progress),
			aperture: amountToward(openedFrom, opened, progress)
		});
}

function isAtOrPastTheFirstLeg(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= THE_FIRST_LEG;
}

function isTip(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= STRAIGHT_DOWN && written <= STRAIGHT_UP;
}

function isTurnFromSquare(written: unknown): written is number {
	return A_NUMBER.is(written) && Math.abs(written) < A_QUARTER_TURN;
}
