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
 * The eye focuses, and opens as wide as a film names, by a move of its own, which shares a step with one that sends it
 * somewhere (`src/domain/focus.ts`): so far before it; at a spot of the world; on a block of the page; or on an object,
 * where its middle stands. What it focuses on is read once, as the move begins, and placed where it stands as each
 * frame is drawn, so the focus holds on it while the eye, the window and the camera move.
 */
import {
	AN_EYE_PLACE,
	AN_EYE_PLACE_OR_REST,
	EYE_SPACE,
	type Eye,
	type EyePlace,
	type EyePlaceOrRest,
	type Focus,
	type Viewpoint,
	eyeSentTo,
	pathThatSees,
	placesThatRollOneWay,
	viewpointOf
} from '../domain/eye.ts';
import { type Camera, eyeInTheWindow, fromItsMiddle, pointInTheView } from '../domain/camera.ts';
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
import { frameScaleOf, middleX, middleY } from '../domain/geometry.ts';
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
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import { A_SPOT, type Spot, scaledBy } from '../domain/matrix.ts';
import { type Path, type Through, pathOf } from '../domain/path.ts';
import { pixelsToward } from '../domain/toward.ts';
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
import { standing } from './object.ts';
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

/** An object a film focuses the eye on, by its name. */
interface ObjectFocus {
	readonly object: ObjectName;
}

/**
 * Where a film focuses the eye: so far before it along where it looks, in pixels of a frame 1080 high; at a spot of the
 * world; on a block of the page, the first a selector matches or a box of the screen, at its middle; or on an object,
 * `{ object }` by its name, at its middle.
 */
export type FocusOn = number | Spot | Target | ObjectFocus;

/** How wide the eye opens as it focuses, `aperture`, in pixels of a frame 1080 high; left out, as wide as it stands. */
export interface FocusScript extends TimingScript {
	readonly aperture?: number;
}

/** Where a film focuses the eye, told apart by what it writes. */
type FocusAsked =
	| { readonly kind: 'distance'; readonly distance: number }
	| { readonly kind: 'world'; readonly spot: Spot }
	| { readonly kind: 'block'; readonly target: Target }
	| { readonly kind: 'object'; readonly name: ObjectName };

const TO_FORM: Form<EyeToScript> = { ...throughFormOf(AN_EYE_PLACE, 'a list of places of the eye'), ...TIMING_FORM };
const FOCUS_FORM: Form<FocusScript> = { aperture: A_PIXELS, ...TIMING_FORM };
const AN_OBJECT_FOCUS = new OfForm<ObjectFocus>({ object: needed(A_NAME) }, 'an object by its name: { object }');
const FOCUS_ON_SAID =
	'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; or an object, { object }';
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
const NO_KEYS: readonly never[] = [];
// Where a flight's way starts, as a share of its length; how high over the page a block the gaze turns to stands;
// and the bounds of a tip, in degrees
const ITS_START = 0;
const THE_FIRST_LEG = 0;
const ON_THE_PAGE = 0;
const STRAIGHT_DOWN = -90;
const STRAIGHT_UP = 90;
// How near over a block, on the page's plane, the eye stands to have no heading toward it, in pixels of a frame 1080
// high; and a number of none
const RIGHT_OVER = 1e-6;
const NONE = 0;
// What a refusal names each move by
const EYE_TO = 'eye.to';
const EYE_FLY = 'eye.fly';
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
	const heading = script.heading ?? NO_KEYS;
	const tip = script.tip ?? NO_KEYS;
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
	return travelling(pathThatSees(path, EYE_TO));
}

/**
 * The eye `progress` of the way along its path in the room, where it focuses and how wide it is open kept as they
 * stand.
 */
function travelling(path: Path<Viewpoint>): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, ...path.at(progress), inside: 'world' });
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
	const spot = await spotOver(beginning, camera, key.toward, ON_THE_PAGE);
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
	const spot = await spotOver(beginning, camera, key.holding, ON_THE_PAGE);
	return { share, rule: { kind: 'holding', spot, downTheFrame: key.at } };
}

/** The share of a way's length a leg ends at. */
function shareOf(way: Way, leg: number): number {
	const share = way.legsEnd[leg];
	if (share === undefined) throw new Error(`a flight's way has no leg ${String(leg)}: its keys are refused first`);
	return share;
}

/**
 * The spot so high over the middle of a block of the page, read as the move begins, on the window's own plane: in
 * pixels of a frame 1080 high from the window's middle, as the camera shows the page in it.
 */
async function spotOver(beginning: Beginning, camera: Camera, target: Target, height: number): Promise<Spot> {
	const frame = beginning.format.frame;
	const block = await shownBox(beginning, target, THE_FIRST, EYE_FLY);
	const inTheView = pointInTheView(camera, frame, { left: middleX(block), top: middleY(block) });
	const onThePlane = scaledBy(fromItsMiddle(camera.view.box, inTheView), 1 / frameScaleOf(frame));
	return { ...onThePlane, out: height };
}

/** What a film focuses the eye on, told apart: a distance, a spot of the world, a block of the page, an object. */
function askedOf(on: FocusOn): FocusAsked {
	if (typeof on === 'number') return { kind: 'distance', distance: on };
	if (typeof on === 'string') return { kind: 'block', target: on };
	if ('object' in on) return { kind: 'object', name: on.object };
	if ('across' in on) return { kind: 'world', spot: on };
	return { kind: 'block', target: on };
}

/**
 * Where the eye focuses on what a film names, read as the move begins: a distance, or a spot of the world, as it is; a
 * block of the page, at its middle as the page lays it out; an object, at its middle where it stands, refused where none
 * of its name stands.
 */
async function focusRead(beginning: Beginning, asked: FocusAsked): Promise<Focus> {
	switch (asked.kind) {
		case 'distance':
		case 'world':
			return asked;
		case 'block': {
			const block = await shownBox(beginning, asked.target, THE_FIRST, EYE_FOCUS);
			return { kind: 'page', point: { left: middleX(block), top: middleY(block) } };
		}
		case 'object': {
			const holders = { camera: cameraOf(beginning.scene, beginning.format), groups: beginning.scene.groups };
			return focusOn(standing(beginning, asked.name, EYE_FOCUS), holders, beginning.format.frame);
		}
	}
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
			aperture: pixelsToward(openedFrom, opened, progress)
		});
}

function isLegNumber(written: unknown): written is number {
	return Number.isInteger(written) && A_NUMBER.is(written) && written >= THE_FIRST_LEG;
}

function isMoreThanNone(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE;
}

function isTip(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= STRAIGHT_DOWN && written <= STRAIGHT_UP;
}
