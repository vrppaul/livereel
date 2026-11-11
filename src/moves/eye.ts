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
 * to spots over blocks of the page, its gaze turned by keys of its own. The blocks are read once, as the move begins,
 * as the camera shows the page in the window then, and the eye rides the window from then on, so a window that leans
 * or travels carries it, until `eye.to` sends it into the room again.
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
	type Viewpoint,
	eyeSentTo,
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
	type Flight,
	type GazeKey,
	JOININGS,
	type Joining,
	type Leg,
	type OwnFigure,
	type Way,
	flownAt,
	gazeOf,
	pointOnTheWay,
	wayOf
} from '../domain/flight.ts';
import { AT_THE_EYE, focusDistanceOf } from '../domain/focus.ts';
import {
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

/** A leg flown straight to a point over the page, or smoothly through it, as the way joins its legs. */
interface LegTo {
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
interface LegAhead {
	readonly ahead: number;
}

/**
 * A leg flown along a figure the film draws in three.js, its points x across, y down and z out in pixels of a frame
 * 1080 high, set off from where the leg starts.
 */
interface LegAlong {
	readonly along: OwnFigure;
}

/** A leg of a flight's way, as a film writes it. */
export type LegScript = LegTo | LegBending | LegAhead | LegAlong;

/** A key of the eye's gaze, reached as the eye reaches the end of its way's leg `by`, from 0 for the first. */
interface GazeKeyScript {
	readonly by: number;
}

/**
 * A heading the eye follows: so many degrees from up the page clockwise; toward a block of the page, wherever it
 * stands; or along the way it flies, `along: 'way'`.
 */
export type HeadingKeyScript =
	| (GazeKeyScript & { readonly degrees: number })
	| (GazeKeyScript & { readonly toward: Target })
	| (GazeKeyScript & { readonly along: 'way' });

/**
 * A tip the eye follows: so many degrees off the page's plane, -90 looking straight down onto it, 0 level; or as far as
 * holds a block `at` a share down the frame wherever it stands, heading toward it.
 */
export type TipKeyScript =
	(GazeKeyScript & { readonly degrees: number }) | (GazeKeyScript & { readonly holding: Target; readonly at: number });

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
 * How the eye stands before a block: so near that, seen square, the block fills `fills` of the frame along the side it
 * fills most; its middle at `middleAt` of the frame, in shares of it from its top left corner, the frame's middle where
 * none is named; and turned from square about that middle as `turned` says, square where it says nothing.
 */
export interface OntoScript extends TimingScript {
	readonly fills: number;
	readonly middleAt?: Point;
	readonly turned?: TurnedScript;
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
const A_POINT_OF_THE_FRAME = new OfForm<Point>(
	{ left: needed(A_SHARE), top: needed(A_SHARE) },
	'a point of the frame: { left, top }, each a share of it'
);
const AN_UNDER_FOCUS = new OfForm<UnderFocus>(
	{ under: needed(A_POINT_OF_THE_FRAME) },
	'under a point of the frame: { under: { left, top } }'
);
const A_TURN_FROM_SQUARE: Kind<number> = new Plain(
	isTurnFromSquare,
	'degrees turned from square, more than -90 and less than 90'
);
const ONTO_FORM: Form<OntoScript> = {
	fills: needed(
		new Plain(isMoreThanNone, 'the share of the frame the block fills along the side it fills most, more than 0')
	),
	middleAt: A_POINT_OF_THE_FRAME,
	turned: new OfForm<TurnedScript>(
		{ round: A_TURN_FROM_SQUARE, up: A_TURN_FROM_SQUARE },
		'a turn from square: { round, up }, in degrees'
	),
	...TIMING_FORM
};
const FOCUS_ON_SAID =
	'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; an object, { object }; or under a point of the frame, { under: { left, top } } in shares of it';
const AN_OVER = new OfForm<Over>(
	{ over: needed(A_TARGET), height: needed(A_SIZE) },
	'a spot over the page: { over, height }, a block and how high over it in pixels of a frame 1080 high, more than 0'
);
const A_LEG_BENDING = new OfForm<LegBending>(
	{
		to: needed(AN_OVER),
		arriving: needed(A_NUMBER),
		bend: needed(new Plain(isMoreThanNone, "a share of the leg's chord, more than 0"))
	},
	'a leg bending: { to, arriving, bend }'
);
const A_LEG: Kind<LegScript> = new FormByName<LegScript>(
	[
		[
			'ahead',
			new OfForm<LegAhead>(
				{ ahead: needed(new Plain(isMoreThanNone, 'how many times as long as the leg before, more than 0')) },
				'a leg ahead: { ahead }'
			)
		],
		['along', new OfForm<LegAlong>({ along: needed(AN_OWN_FIGURE) }, 'a leg along a figure: { along }')],
		['arriving', A_LEG_BENDING],
		['bend', A_LEG_BENDING]
	],
	new OfForm<LegTo>({ to: needed(AN_OVER) }, 'a leg: { to }'),
	'a leg: { to }, { to, arriving, bend }, { ahead } or { along }'
);
const A_LEG_NUMBER: Kind<number> = new Plain(isLegNumber, "a leg's number, 0 for the first");
const A_TIP: Kind<number> = new Plain(isTip, 'degrees from -90, looking straight down onto the page, to 90');
const A_HEADING_KEY: Kind<HeadingKeyScript> = new FormByName<HeadingKeyScript>(
	[
		['toward', new OfForm({ by: needed(A_LEG_NUMBER), toward: needed(A_TARGET) }, 'a heading: { by, toward }')],
		['along', new OfForm({ by: needed(A_LEG_NUMBER), along: needed(new Literal('way')) }, 'a heading: { by, along }')]
	],
	new OfForm({ by: needed(A_LEG_NUMBER), degrees: needed(A_NUMBER) }, 'a heading: { by, degrees }'),
	'a heading: { by, degrees }, { by, toward } or { by, along: "way" }'
);
const A_TIP_KEY: Kind<TipKeyScript> = new FormByName<TipKeyScript>(
	[
		[
			'holding',
			new OfForm(
				{ by: needed(A_LEG_NUMBER), holding: needed(A_TARGET), at: needed(A_SHARE) },
				'a tip: { by, holding, at }'
			)
		]
	],
	new OfForm({ by: needed(A_LEG_NUMBER), degrees: needed(A_TIP) }, 'a tip: { by, degrees }'),
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
const NO_GAZE_KEYS: readonly never[] = [];
// Where a flight's way starts, as a share of its length; how high over the page a block the gaze turns to stands;
// and the bounds of a tip, in degrees
const ITS_START = 0;
const THE_FIRST_LEG = 0;
const LEVEL_WITH_THE_PAGE = 0;
const STRAIGHT_DOWN = -90;
const STRAIGHT_UP = 90;
// How near over a block, on the page's plane, the eye stands to have no heading toward it, in pixels of a frame 1080
// high
const RIGHT_OVER = 1e-6;
// How far the eye stands turned from square where a film names no turn, and the quarter turn it stays within, in
// degrees: turned so far, it would stand on the page's plane
const SQUARE = 0;
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
 * names, riding the window from then on.
 */
export function fly(way: readonly LegScript[], script: FlyScript = {}): Move {
	assertKind(way, A_FLIGHTS_WAY, `${EYE_FLY}'s way`);
	assertWritten(script, FLY_FORM, EYE_FLY);
	if (way.length === 0) throw new FilmError(`${EYE_FLY}'s way has no leg: name one or more`);
	const heading = script.heading ?? NO_GAZE_KEYS;
	const tip = script.tip ?? NO_GAZE_KEYS;
	refuseKeysOff(heading, way, 'heading');
	refuseKeysOff(tip, way, 'tip');
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: timingOf(script),
		begin: (beginning) => flown(beginning, way, script.shape ?? SMOOTH, heading, tip)
	};
}

/**
 * The eye brought before a block of the page from where it stands, as the film frames the block there, riding the
 * window from then on.
 */
export function onto(target: Target, script: OntoScript): Move {
	assertKind(target, A_TARGET, `${EYE_ONTO}'s target`);
	assertWritten(script, ONTO_FORM, EYE_ONTO);
	const framing: EyeFraming = {
		fills: script.fills,
		middleAt: script.middleAt ?? MIDDLE_SHARE,
		turned: { round: script.turned?.round ?? SQUARE, up: script.turned?.up ?? SQUARE }
	};
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: timingOf(script),
		begin: (beginning) => broughtBefore(beginning, target, framing)
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
 * as the film frames it, the block read then where the camera shows it in the window; refused where its up turns half
 * round on the way, or it could not see anywhere on it.
 */
async function broughtBefore(beginning: Beginning, target: Target, framing: EyeFraming): Promise<Change> {
	const camera = cameraOf(beginning.scene, beginning.format);
	const frame = beginning.format.frame;
	const setOffFrom = viewpointOf(eyeInTheWindow(camera.eye, camera.view, frame));
	const block = await shownBox(beginning, target, THE_FIRST, EYE_ONTO);
	const end = viewpointBefore(boxOnTheWindowsPlane(camera, frame, block), framing, camera.eye.focalLength, frame);
	placesThatRollOneWay([setOffFrom, end], EYE_ONTO);
	return travelling(pathThatSees(pathOf(setOffFrom, NO_KEYS, end, EYE_SPACE), EYE_ONTO), 'window');
}

/**
 * The eye `progress` of the way along its path in what it stands in, the room or the window, where it focuses and how
 * wide it is open kept as they stand.
 */
function travelling(path: Path<Viewpoint>, inside: Eye['inside']): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, ...path.at(progress), inside });
}

/** Refuses gaze keys that name no leg of the way, or a leg no farther along than the key before. */
function refuseKeysOff(keys: readonly GazeKeyScript[], way: readonly LegScript[], named: string): void {
	let legBefore: number | null = null;
	for (const [index, key] of keys.entries()) {
		if (key.by >= way.length) {
			throw new FilmError(
				`${EYE_FLY}'s ${named} key ${String(index)} is reached by leg ${String(key.by)}, and the way's legs go from 0 to ${String(way.length - 1)}`
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
 * The eye flying from where it stands as the move begins, read riding the window as it stands then: its legs' points
 * over the blocks they name, read off the page then, its way, and its gaze from how it looks then through the rules its
 * keys name, the blocks they name read then too.
 */
async function flown(
	beginning: Beginning,
	way: readonly LegScript[],
	joining: Joining,
	heading: readonly HeadingKeyScript[],
	tip: readonly TipKeyScript[]
): Promise<Change> {
	const camera = cameraOf(beginning.scene, beginning.format);
	const frame = beginning.format.frame;
	const setOff = eyeInTheWindow(camera.eye, camera.view, frame);
	const legs: Leg[] = [];
	for (const leg of way) legs.push(await legRead(beginning, camera, leg));
	const flightsWay = wayOf(setOff.at, legs, joining, EYE_FLY);
	const gaze = gazeOf(setOff);
	const headings: GazeKey[] = [];
	for (const [index, key] of heading.entries()) {
		headings.push(await headingRead(beginning, camera, flightsWay, key, index));
	}
	const tips: GazeKey[] = [];
	for (const key of tip) tips.push(await tipRead(beginning, camera, flightsWay, key));
	const flight: Flight = {
		way: flightsWay,
		heading: [{ share: ITS_START, rule: { kind: 'degrees', degrees: gaze.heading } }, ...headings],
		tip: [{ share: ITS_START, rule: { kind: 'degrees', degrees: gaze.tip } }, ...tips],
		roll: gaze.roll,
		eye: { focalLength: camera.eye.focalLength, frameHeight: frame.height / frameScaleOf(frame) }
	};
	return (scene, progress) => withEye(scene, { ...scene.eye, ...flownAt(flight, progress), inside: 'window' });
}

/** A leg of the way as the film writes it, its point read over the block it names. */
async function legRead(beginning: Beginning, camera: Camera, leg: LegScript): Promise<Leg> {
	if ('ahead' in leg) return { kind: 'ahead', times: leg.ahead };
	if ('along' in leg) return { kind: 'along', figure: leg.along };
	const to = await spotOver(beginning, camera, leg.to.over, leg.to.height);
	if ('arriving' in leg) return { kind: 'bending', to, arriving: leg.arriving, bend: leg.bend };
	return { kind: 'to', to };
}

/**
 * A heading key's rule: its degrees, along the way, or toward a block, refused where the eye stands right over the
 * block as it reaches the key, where no heading is toward it.
 */
async function headingRead(
	beginning: Beginning,
	camera: Camera,
	way: Way,
	key: HeadingKeyScript,
	index: number
): Promise<GazeKey> {
	const share = shareOf(way, key.by);
	if ('degrees' in key) return { share, rule: { kind: 'degrees', degrees: key.degrees } };
	if ('along' in key) return { share, rule: { kind: 'along' } };
	const spot = await spotOver(beginning, camera, key.toward, LEVEL_WITH_THE_PAGE);
	const standing = pointOnTheWay(way, share);
	if (Math.hypot(spot.across - standing.across, spot.down - standing.down) < RIGHT_OVER) {
		throw new FilmError(
			`${EYE_FLY}'s heading key ${String(index)} turns toward a block the eye stands right over there: turn it toward one ahead of it`
		);
	}
	return { share, rule: { kind: 'toward', spot } };
}

/** A tip key's rule: its degrees, or as far as holds a block so far down the frame. */
async function tipRead(beginning: Beginning, camera: Camera, way: Way, key: TipKeyScript): Promise<GazeKey> {
	const share = shareOf(way, key.by);
	if ('degrees' in key) return { share, rule: { kind: 'degrees', degrees: key.degrees } };
	const spot = await spotOver(beginning, camera, key.holding, LEVEL_WITH_THE_PAGE);
	return { share, rule: { kind: 'holding', spot, downTheFrame: key.at } };
}

/** The share of a way's length a leg ends at. */
function shareOf(way: Way, leg: number): number {
	const share = way.legsEnd[leg];
	if (share === undefined) throw new Error(`a flight's way has no leg ${String(leg)}: its keys are refused first`);
	return share;
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

function isLegNumber(written: unknown): written is number {
	return Number.isInteger(written) && A_NUMBER.is(written) && written >= THE_FIRST_LEG;
}

function isTip(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= STRAIGHT_DOWN && written <= STRAIGHT_UP;
}

function isTurnFromSquare(written: unknown): written is number {
	return A_NUMBER.is(written) && Math.abs(written) < A_QUARTER_TURN;
}
