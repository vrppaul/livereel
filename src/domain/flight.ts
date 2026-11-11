/**
 * A flight of the eye over the page's window: its way, legs flown one after another from where the eye stands, and its
 * gaze along the way, apart from the way's shape. Every spot of a flight is the window's own, in pixels of a frame 1080
 * high from the window's middle, `out` how high over its face, so the eye rides the window as it stands
 * (`src/domain/eye.ts`).
 *
 * The way is three.js's curves, flown by its length, so the eye goes as far in each equal share of the flight's own
 * progress, whatever bends the way takes; past either end, as a curve that bounces takes it, it goes straight on along
 * the way there. Or the film times its legs apart, each taking its share of the move's time, as the promo's run to the
 * Story button flies legs of 2, 2.5 and 3 s (`to-the-story.js`): the eye passes each leg's end as its share ends, on a
 * cubic Hermite curve of the way's length over the time through those knots, from rest to rest, as fast through each
 * knot as from the knot before to the knot after but never running past the next and back. A leg goes straight to a
 * point; or bends, arriving at its point heading the way the film names, as a parabola does, its turn as far before
 * the point as `bend` shares of the leg's chord; or goes on ahead, straight along the way's last heading, so many
 * times as long as the leg before; or goes along a figure the film draws itself in three.js, its points across, down
 * and out, set off from where the leg starts wherever the film drew it, for a shape no leg of livereel's draws. A leg
 * after another leaves heading as that one arrived, but a figure, which leaves as the film drew it. Where the way is
 * smooth, a leg to a point arrives heading the way a figure after it leaves, or from where it starts toward the next
 * leg's point, as a Catmull-Rom curve does, but never higher or lower than the two points either side of it: where
 * the way sinks to a point and runs on level, it flattens there, as a smooth way that sinks to a point and runs on low
 * dipped under the page (the review of the flight, 2026-11-09). A way that reaches the page's plane anywhere is
 * refused.
 *
 * The gaze is two values apart, as a person flying low over a page turns and tips their head: the heading, which way
 * on the window's plane the eye looks, in degrees from up the page clockwise, and the tip, how far its sight lifts off
 * the plane, from looking straight down onto it at -90 through level at 0. Each follows rules reached at moments of
 * the flight, at a leg's end or past it by a share of the next leg: a value of degrees, a heading toward a spot or
 * along the way, a tip that holds a spot so far down the frame. Each rule is read where the eye stands as it flies, so
 * one that holds a spot holds it all along: between two rules the gaze goes from the one before to the one after, both
 * read where the eye stands, easing in and out over the flight's time between them; past the last it follows the
 * last; a heading turns the short way round. The flight's time is its legs' where the film times them apart, so the
 * promo's eye turns to the Story button over its first leg's 2 s however its pace sets off from rest
 * (`to-the-story.js`), where easing by the way, which the pace eases already, turned it late; on an even pace the time
 * and the way go together. The eye never rolls but as it sets off: a roll it stood with eases away by the end of the
 * first leg.
 *
 * Between two keys heading and tip ease each apart, as the promo's run to the Story button turns toward it over its
 * sinking and tips its gaze over the rise. Or the film turns the view whole, as the promo's dive turns the eye from how
 * it looked to looking level along the gap in one rotation (`ending.js`, three's quaternions slerped): from how the eye
 * looks at one moment a key or the first leg's end names to how it looks at the next, each read where it stands, the
 * roll it set off with among it. A turn of heading alone, or of tip alone, goes the same either way; one of both apart
 * sweeps the heading round at a pace of its own, and from looking down the dive's lines turned up to 8° ahead of the
 * cut's.
 */
import { CubicBezierCurve3, Curve, CurvePath, LineCurve3, Matrix4, Quaternion, Vector3, type Vector3Like } from 'three';
import { FilmError } from './errors.ts';
import type { Viewpoint } from './eye.ts';
import { type Kind, Plain, isObjectOfValues } from './handed.ts';
import { type Spot, radians } from './matrix.ts';
import { easeInOutSine, hermiteBetween } from './curves.ts';
import { between } from './toward.ts';

/**
 * A figure a film draws itself in three.js, as a curve of three's: its point at a share of its own parameter, x across,
 * y down and z out in pixels of a frame 1080 high, as a film writes a spot. It is the film's own, of whatever copy of
 * three the film imports, so it is read by its points alone.
 */
export interface OwnFigure {
	readonly getPoint: (share: number) => Vector3Like;
}

/** A leg of a flight, as the way is built from it. */
export type Leg =
	| { readonly kind: 'to'; readonly to: Spot }
	| { readonly kind: 'bending'; readonly to: Spot; readonly arriving: number; readonly bend: number }
	| { readonly kind: 'ahead'; readonly times: number }
	| { readonly kind: 'along'; readonly figure: OwnFigure };

/** A film's own figure as it hands one: any object that gives its points, as every curve of three's does. */
export const AN_OWN_FIGURE: Kind<OwnFigure> = new Plain(
	isOwnFigure,
	'a figure, a curve of three.js whose points are x across, y down and z out in pixels of a frame 1080 high'
);

/**
 * How the way goes on past a leg's end, which a smooth leg to a point arrives heading by: toward the next leg's point,
 * as a Catmull-Rom curve does, or the way a figure of the film's leaves; along its chord where it goes on neither way.
 */
type Onward =
	| { readonly kind: 'toward'; readonly point: Vector3 }
	| { readonly kind: 'leaving'; readonly heading: Vector3 }
	| { readonly kind: 'chord' };

/** How legs straight to their points join: at a corner, or smoothly through each point. */
export const JOININGS = ['straight', 'smooth'] as const;

export type Joining = (typeof JOININGS)[number];

/** A rule a gaze follows: so many degrees; a heading toward a spot, or along the way; a tip that holds a spot. */
type GazeRule =
	| { readonly kind: 'degrees'; readonly degrees: number }
	| { readonly kind: 'toward'; readonly spot: Spot }
	| { readonly kind: 'along' }
	| { readonly kind: 'holding'; readonly spot: Spot; readonly downTheFrame: number };

/** A rule of the gaze the eye follows from a moment of its flight on, a share of its move's progress. */
export interface GazeKey {
	readonly moment: number;
	readonly rule: GazeRule;
}

/** A gaze's keys: where it set off, at the flight's start, then those the film names, each later. */
type GazeKeys = readonly [GazeKey, ...GazeKey[]];

/** How a flight's view turns between its gaze's keys: heading and tip each apart, or whole, as one rotation. */
export const TURNINGS = ['apart', 'whole'] as const;

export type Turning = (typeof TURNINGS)[number];

/**
 * How a flight's view turns, worked out: apart; or whole, through the moments it turns between after its start, each
 * later.
 */
type Turned = { readonly kind: 'apart' } | { readonly kind: 'whole'; readonly turns: readonly number[] };

/** A flight's way: its curve, and the share of the curve's length each leg ends at. */
export interface Way {
	readonly curve: CurvePath<Vector3>;
	readonly legsEnd: readonly number[];
}

/** A flight whose legs a film does not time: the eye goes as far along its way in each equal share of the move. */
export const EVENLY = { kind: 'evenly' } as const;

/** How a film times a flight's legs: not at all, or each leg's time apart, in proportion to the others'. */
export type LegsTimed = typeof EVENLY | { readonly kind: 'apart'; readonly takes: readonly number[] };

/** Where a leg of a flight timed apart ends, or the flight starts: a share of the move's time and of the way's length. */
interface PaceMark {
	readonly time: number;
	readonly way: number;
}

/** A mark of a flight timed apart, and how fast the eye goes through it: shares of the way a share of the time. */
interface PaceKnot extends PaceMark {
	readonly speed: number;
}

/**
 * How a flight goes along its way as its move goes on: as far in each equal share of the move; or through the knots of
 * its legs timed apart, from rest to rest.
 */
export type Pace = typeof EVENLY | { readonly kind: 'apart'; readonly knots: readonly PaceKnot[] };

/**
 * How the eye sees as it flies: its focal length, how far ahead of it its aim stands, and how high the frame is in
 * pixels of a frame 1080 high, which a tip that holds a spot reads.
 */
interface FlyingEye {
	readonly focalLength: number;
	readonly frameHeight: number;
}

/**
 * A flight worked out: its way, its pace along it, its gaze's keys and how its view turns between them, the roll it
 * set off with, the eye that flies it.
 */
export interface Flight {
	readonly way: Way;
	readonly pace: Pace;
	readonly heading: GazeKeys;
	readonly tip: GazeKeys;
	readonly turned: Turned;
	readonly roll: number;
	readonly eye: FlyingEye;
}

/** The way an eye looks and the way its top points, each as long as one. */
interface View {
	readonly looking: Vector3;
	readonly top: Vector3;
}

/** How the leg before arrived where the next leaves: heading which way, as long as one, and how long it was. */
interface Arrival {
	readonly heading: Vector3;
	readonly length: number;
}

/** The gaze of an eye standing in the window: its heading, its tip, and how far it is rolled about its sight. */
export interface Gaze {
	readonly heading: number;
	readonly tip: number;
	readonly roll: number;
}

// The degrees of a whole turn, and of a half, which a heading turns no farther than
const A_TURN = 360;
const A_HALF_TURN = 180;
// A curve's end, by its own parameter; and the share of a way past which it goes on straight
const ITS_START = 0;
const ITS_END = 1;
// A cubic Bézier curve's handle stands a third of the tangent there from its end, so it runs as a Hermite curve of
// that tangent does; a parabola's tangent at an end is twice the way to its turn
const THIRDS = 3;
const A_HANDLE = 1 / THIRDS;
// A share of a way said as a person reads it, in hundredths
const PERCENT = 100;
const A_PARABOLAS_TANGENT = 2;
// A Catmull-Rom curve's tangent at a point is half the way from the point before it to the point after it
const HALVES = 2;
// A Hermite curve between two heights stays between them while its tangents are no steeper than three times the rise
// (Fritsch and Carlson); so too a pace between two knots
const STEEPEST_AND_MONOTONE = 3;
// How fast a flight timed by its legs goes as it sets off and as it comes to rest
const AT_REST = 0;
// The first leg, whose end a roll the eye set off with is gone by; and how many knots of a pace stand before the first
// leg's end: the flight's start
const THE_FIRST_LEG = 0;
const KNOTS_BEFORE_THE_LEGS = 1;
// How short a leg is to go nowhere, in pixels of a frame 1080 high
const NOWHERE = 1e-6;
// How many steps of a way are checked for a point on the page's plane or under it, its ends among them
const STEPS_CHECKED = 256;
// The page's plane, which the way flies over
const THE_PAGES_PLANE = 0;
// How near the eye's sight comes to straight down or up, in degrees, before its heading is read off its top
const NEAR_STRAIGHT_DOWN = 1;
// The way out of the window's face, which a tip lifts the eye's sight toward
const OUT_OF_THE_PAGE = new Vector3(0, 0, 1);
// The way behind an eye and the way its top points in its own frame, as three's cameras stand: it looks against its z,
// its top up its y
const ITS_OWN_BACK = new Vector3(0, 0, 1);
const ITS_OWN_TOP = new Vector3(0, 1, 0);

/**
 * A flight's way from where the eye stands, through its legs, joined as named; refused where a leg goes nowhere, goes
 * ahead with no leg before it, or the way reaches the page's plane.
 */
export function wayOf(from: Spot, legs: readonly Leg[], joining: Joining, move: string): Way {
	const curve = new CurvePath<Vector3>();
	let standing = vectorOf(from);
	let arrived: Arrival | null = null;
	for (const [index, leg] of legs.entries()) {
		const where = `${move}'s leg ${String(index)}`;
		const legsCurve = legCurve(leg, standing, arrived, onwardAfter(legs[index + 1]), joining, where);
		const ends = legsCurve.getPoint(ITS_END);
		if (goesNowhere(leg, legsCurve, standing)) {
			throw new FilmError(`${where} goes nowhere: send it somewhere the eye does not stand`);
		}
		curve.add(legsCurve);
		standing = ends;
		arrived = { heading: legsCurve.getTangent(ITS_END), length: legsCurve.getLength() };
	}
	refuseUnderThePage(curve, move);
	const whole = curve.getLength();
	return { curve, legsEnd: curve.getCurveLengths().map((length) => length / whole) };
}

/**
 * The gaze of an eye standing in the window: its tip, its heading read off its sight on the page's plane, or off its
 * top where it looks near straight down or up, and how far its top is rolled about its sight from where a flight keeps
 * it.
 */
export function gazeOf(eye: Viewpoint): Gaze {
	const looking = vectorOf(eye.aim).sub(vectorOf(eye.at)).normalize();
	const tip = Math.asin(looking.z);
	const top = vectorOf(eye.up);
	const nearStraight = Math.abs(Math.cos(tip)) < Math.sin(radians(NEAR_STRAIGHT_DOWN));
	// Looking straight down, the top of an eye that never rolls points along its heading; straight up, against it
	const along = nearStraight ? top.clone().multiplyScalar(-Math.sign(tip)) : looking;
	const heading = degreesOf(Math.atan2(along.x, -along.y));
	const kept = topOf(heading, degreesOf(tip));
	const square = top.clone().addScaledVector(looking, -top.dot(looking)).normalize();
	const roll = Math.atan2(kept.clone().cross(square).dot(looking), kept.dot(square));
	return { heading, tip: degreesOf(tip), roll: degreesOf(roll) };
}

/**
 * A flight's pace along its way as a film times its legs: evenly; or through a knot where each leg ends, at the share of
 * the move's time it and the legs before it take.
 */
export function paceOf(timed: LegsTimed, way: Way): Pace {
	switch (timed.kind) {
		case 'evenly':
			return EVENLY;
		case 'apart':
			return { kind: 'apart', knots: knotsOf(timed.takes, way.legsEnd) };
	}
}

/**
 * The knots of legs timed apart: the flight's start, and each leg's end at the share of the time it and the legs before
 * it take, beside the way's share it ends at; and how fast the eye goes through each.
 */
function knotsOf(takes: readonly number[], legsEnd: readonly number[]): readonly PaceKnot[] {
	const whole = sumOf(takes);
	const marks: readonly PaceMark[] = [
		{ time: ITS_START, way: ITS_START },
		...legsEnd.map((way, leg) => ({ time: sumOf(takes.slice(0, leg + 1)) / whole, way }))
	];
	return marks.map((mark, index) => ({ ...mark, speed: speedThrough(marks[index - 1], mark, marks[index + 1]) }));
}

/**
 * How fast the eye goes through a mark of its pace, in shares of the way a share of the time: at rest at either end,
 * where no mark stands before or after it; between, as fast as from the mark before to the mark after, as a Catmull-Rom
 * curve goes, but no faster than three times the slower of the two legs either side, so it never runs past the next
 * mark and back (Fritsch and Carlson).
 */
function speedThrough(before: PaceMark | undefined, mark: PaceMark, after: PaceMark | undefined): number {
	if (before === undefined || after === undefined) return AT_REST;
	const steepest = STEEPEST_AND_MONOTONE * Math.min(slopeBetween(before, mark), slopeBetween(mark, after));
	return Math.min(slopeBetween(before, after), steepest);
}

/** How fast the eye goes from one mark of its pace to another, on average: shares of the way a share of the time. */
function slopeBetween(start: PaceMark, end: PaceMark): number {
	return (end.way - start.way) / (end.time - start.time);
}

/**
 * The share of its way's length a flight has flown `progress` of its move along: as much on an even pace; through the
 * knots of legs timed apart, on the cubic Hermite curve from the knot before to the knot after, at the end once past it.
 */
function wayFlown(pace: Pace, progress: number): number {
	switch (pace.kind) {
		case 'evenly':
			return progress;
		case 'apart':
			return wayThroughKnots(pace.knots, progress);
	}
}

/** The share of its way flown through the knots of legs timed apart, `progress` of its move along. */
function wayThroughKnots(knots: readonly PaceKnot[], progress: number): number {
	for (const [index, end] of knots.entries()) {
		const start = knots[index - 1];
		if (start !== undefined && progress <= end.time) {
			const span = end.time - start.time;
			const setOff = { value: start.way, speed: start.speed * span };
			const arriving = { value: end.way, speed: end.speed * span };
			return hermiteBetween(setOff, arriving, (progress - start.time) / span);
		}
	}
	return ITS_END;
}

function sumOf(numbers: readonly number[]): number {
	return numbers.reduce((sum, number) => sum + number, 0);
}

/**
 * The moment of a flight, a share of its move's progress, the eye reaches `by` at: the end of leg `by`, or past it by
 * a share of the next leg's time, 1.5 half way through leg 2.
 */
export function momentBy(way: Way, pace: Pace, by: number): number {
	const leg = Math.floor(by);
	const ended = legsEndMoment(way, pace, leg);
	const past = by - leg;
	// The last leg's end has no leg after it to go a share into
	if (past === 0) return ended;
	return between(ended, legsEndMoment(way, pace, leg + 1), past);
}

/**
 * The moment of a flight the eye passes a leg's end at: on an even pace, the share of the way it ends at; where the
 * legs are timed apart, the share of the time it and the legs before it take.
 */
function legsEndMoment(way: Way, pace: Pace, leg: number): number {
	switch (pace.kind) {
		case 'evenly':
			return knownLegsEnd(way.legsEnd[leg], leg);
		case 'apart':
			return knownLegsEnd(pace.knots[leg + KNOTS_BEFORE_THE_LEGS]?.time, leg);
	}
}

/** A leg's end, of a leg the way has; a key past the way's legs is refused before its moment is read. */
function knownLegsEnd(moment: number | undefined, leg: number): number {
	if (moment === undefined) throw new Error(`a flight's way has no leg ${String(leg)}: its keys are refused first`);
	return moment;
}

/**
 * How a flight's view turns as the film names it: apart; or whole, between the moments its gaze's keys are reached at
 * and the first leg's end, by which the roll it set off with is gone, each once.
 */
export function turnedOf(turning: Turning, way: Way, pace: Pace, keys: readonly GazeKey[]): Turned {
	switch (turning) {
		case 'apart':
			return { kind: 'apart' };
		case 'whole': {
			const moments = new Set([legsEndMoment(way, pace, THE_FIRST_LEG), ...keys.map((key) => key.moment)]);
			return { kind: 'whole', turns: [...moments].toSorted((before, after) => before - after) };
		}
	}
}

/**
 * Where the eye flying stands, looks and its top points, `progress` of its move along, straight on past either end of
 * its way: on its way as far as its pace has it then, its view as its gaze's rules have it then and there, turned as
 * the film names.
 */
export function flownAt(flight: Flight, progress: number): Viewpoint {
	const share = wayFlown(flight.pace, progress);
	const onTheWay = Math.min(ITS_END, Math.max(ITS_START, share));
	const moment = Math.min(ITS_END, Math.max(ITS_START, progress));
	const way = flight.way.curve;
	const at = way.getPointAt(onTheWay).addScaledVector(way.getTangentAt(onTheWay), (share - onTheWay) * way.getLength());
	const view = viewAt(flight, moment, onTheWay, at);
	return {
		at: spotOf(at),
		aim: spotOf(at.clone().addScaledVector(view.looking, flight.eye.focalLength)),
		up: spotOf(view.top)
	};
}

/** How the eye flying looks at a moment, standing a share of its way along: its gaze apart, or turned whole. */
function viewAt(flight: Flight, moment: number, share: number, at: Vector3): View {
	switch (flight.turned.kind) {
		case 'apart':
			return viewOf(gazeAt(flight, moment, share, at));
		case 'whole':
			return turnedWhole(flight, flight.turned.turns, moment, share, at);
	}
}

/**
 * The view turned whole at a moment: from how the eye looks at the turn before to how it looks at the turn after, each
 * read where it stands now, by one rotation eased in and out over the time between; past the last, as there.
 */
function turnedWhole(flight: Flight, turns: readonly number[], moment: number, share: number, at: Vector3): View {
	let start = ITS_START;
	for (const end of turns) {
		if (moment < end) {
			const from = turnOf(viewOf(gazeAt(flight, start, share, at)));
			const to = turnOf(viewOf(gazeAt(flight, end, share, at)));
			const turned = from.slerp(to, easeInOutSine((moment - start) / (end - start)));
			return {
				looking: ITS_OWN_BACK.clone().applyQuaternion(turned).negate(),
				top: ITS_OWN_TOP.clone().applyQuaternion(turned)
			};
		}
		start = end;
	}
	return viewOf(gazeAt(flight, moment, share, at));
}

/**
 * The eye's gaze at a moment of its flight, its rules read where it stands a share of its way along: the heading and
 * the tip they give then, and the roll it set off with as far as it has not yet eased away by the first leg's end.
 */
function gazeAt(flight: Flight, moment: number, share: number, at: Vector3): Gaze {
	const firstLegsEnd = legsEndMoment(flight.way, flight.pace, THE_FIRST_LEG);
	return {
		heading: valueAt(flight.heading, moment, share, at, flight),
		tip: valueAt(flight.tip, moment, share, at, flight),
		roll: flight.roll * (1 - easeInOutSine(Math.min(ITS_END, moment / firstLegsEnd)))
	};
}

/** How an eye with a gaze looks and its top points: along its heading, tipped, rolled about its sight. */
function viewOf(gaze: Gaze): View {
	const looking = lookingOf(gaze.heading, gaze.tip);
	return { looking, top: topOf(gaze.heading, gaze.tip).applyAxisAngle(looking, radians(gaze.roll)) };
}

/** The rotation that turns an eye's own frame to a view, as three turns a camera. */
function turnOf(view: View): Quaternion {
	const right = view.looking.clone().cross(view.top);
	const back = view.looking.clone().negate();
	return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, view.top, back));
}

/** The heading the way flies at a share of its length, on the page's plane. */
function headingAlong(way: Way, share: number): number {
	const tangent = way.curve.getTangentAt(share);
	return degreesOf(Math.atan2(tangent.x, -tangent.y));
}

/** Where the eye flying stands at a moment of its flight, on its way as far as its pace has it then. */
export function pointAtMoment(way: Way, pace: Pace, moment: number): Spot {
	return spotOf(way.curve.getPointAt(wayFlown(pace, moment)));
}

/**
 * The value of a gaze's rules at a moment of the flight, the eye standing a share of its way along: from the rule
 * before to the rule after, each read there, eased in and out over the time between them; the last rule past it; a
 * heading the short way round.
 */
function valueAt(keys: GazeKeys, moment: number, share: number, at: Vector3, flight: Flight): number {
	const [first, ...rest] = keys;
	let start = first;
	for (const end of rest) {
		if (moment < end.moment) {
			const from = ruled(start.rule, share, at, flight);
			const to = ruled(end.rule, share, at, flight);
			const eased = easeInOutSine((moment - start.moment) / (end.moment - start.moment));
			return between(from, from + shortWay(from, to), eased);
		}
		start = end;
	}
	return ruled(start.rule, share, at, flight);
}

/** What a rule of the gaze gives the eye standing at a spot, a share of its way along. */
function ruled(rule: GazeRule, share: number, at: Vector3, flight: Flight): number {
	switch (rule.kind) {
		case 'degrees':
			return rule.degrees;
		case 'toward':
			return degreesOf(Math.atan2(rule.spot.across - at.x, -(rule.spot.down - at.y)));
		case 'along':
			return headingAlong(flight.way, share);
		case 'holding':
			return tipHolding(at, rule.spot, rule.downTheFrame, flight.eye);
	}
}

/**
 * The tip that holds a spot of the window at a share down the frame for an eye standing at another, heading toward
 * it: its sight lifted so far that the spot stands that far below the frame's middle.
 */
function tipHolding(at: Vector3, spot: Spot, downTheFrame: number, eye: FlyingEye): number {
	const along = Math.hypot(spot.across - at.x, spot.down - at.y);
	const below = Math.atan2(at.z - spot.out, along);
	const belowTheMiddle = Math.atan(((downTheFrame * HALVES - 1) * eye.frameHeight) / HALVES / eye.focalLength);
	return degreesOf(belowTheMiddle - below);
}

/** How far a heading turns to another the short way round, in degrees: no more than a half turn either way. */
function shortWay(from: number, to: number): number {
	return ((((to - from) % A_TURN) + A_TURN + A_HALF_TURN) % A_TURN) - A_HALF_TURN;
}

/** Refuses a way that reaches the page's plane, or passes under it, at any step checked. */
function refuseUnderThePage(curve: CurvePath<Vector3>, move: string): void {
	for (let step = 0; step <= STEPS_CHECKED; step++) {
		if (curve.getPoint(step / STEPS_CHECKED).z <= THE_PAGES_PLANE) {
			throw new FilmError(
				`${move}'s way reaches the page about ${String(Math.round((step / STEPS_CHECKED) * PERCENT))}% along: fly it higher, or join its legs straight`
			);
		}
	}
}

/**
 * A leg's curve from where the way stands: leaving heading as the leg before arrived, where there is one, but a figure,
 * which leaves as the film drew it; arriving as the way goes on past it where the way is smooth; refused, as `where`
 * names it, going ahead with no leg before, or along a figure that gives a point of no numbers.
 */
function legCurve(
	leg: Leg,
	start: Vector3,
	arrived: Arrival | null,
	onward: Onward,
	joining: Joining,
	where: string
): Curve<Vector3> {
	switch (leg.kind) {
		case 'to': {
			const to = vectorOf(leg.to);
			if (joining === 'straight') return new LineCurve3(start, to);
			const leaving = arrived === null ? null : arrived.heading.clone().multiplyScalar(start.distanceTo(to));
			return hermiteLeg(start, to, leaving, onward);
		}
		case 'bending':
			return bendingLeg(start, vectorOf(leg.to), leg.arriving, leg.bend, arrived);
		case 'ahead': {
			if (arrived === null) {
				throw new FilmError(`${where} goes ahead with no leg before it: send the eye somewhere first`);
			}
			return new LineCurve3(start, start.clone().addScaledVector(arrived.heading, leg.times * arrived.length));
		}
		case 'along': {
			const figure = new CarriedFigure(leg.figure, start);
			// A point of no numbers anywhere along it, a flat figure's missing out among them, leaves it no length
			if (!Number.isFinite(figure.getLength())) {
				throw new FilmError(
					`${where}'s figure gives a point of no numbers: draw it in three dimensions, through numbers, x across, y down and z out`
				);
			}
			return figure;
		}
	}
}

/**
 * Whether a leg goes nowhere: a leg ends where it starts, but a figure, which may close on itself, only where it has no
 * length.
 */
function goesNowhere(leg: Leg, legsCurve: Curve<Vector3>, start: Vector3): boolean {
	if (leg.kind === 'along') return legsCurve.getLength() < NOWHERE;
	return start.distanceTo(legsCurve.getPoint(ITS_END)) < NOWHERE;
}

/** How the way goes on past a leg, as the next leg sets off: toward its point, the way its figure leaves, or neither. */
function onwardAfter(next: Leg | undefined): Onward {
	switch (next?.kind) {
		case 'to':
			return { kind: 'toward', point: vectorOf(next.to) };
		case 'along':
			return { kind: 'leaving', heading: new CarriedFigure(next.figure, new Vector3()).getTangent(ITS_START) };
		case 'bending':
		case 'ahead':
		case undefined:
			return { kind: 'chord' };
	}
}

/**
 * A film's own figure carried from where it was drawn to where its leg starts: each of its points carried as far as
 * takes its start there, so a film draws it wherever it likes.
 */
class CarriedFigure extends Curve<Vector3> {
	readonly figure: OwnFigure;
	readonly carriedBy: Vector3;

	constructor(figure: OwnFigure, start: Vector3) {
		super();
		this.figure = figure;
		this.carriedBy = start.clone().sub(figure.getPoint(ITS_START));
	}

	override getPoint(share: number, target = new Vector3()): Vector3 {
		return target.copy(this.figure.getPoint(share)).add(this.carriedBy);
	}
}

function isOwnFigure(written: unknown): written is OwnFigure {
	return isObjectOfValues(written) && typeof written.getPoint === 'function';
}

/**
 * A leg to a point joined smoothly: leaving as named, along its chord where nothing is named; arriving as the way goes
 * on past it; each never rising or sinking past its heights.
 */
function hermiteLeg(start: Vector3, end: Vector3, leaving: Vector3 | null, onward: Onward): Curve<Vector3> {
	const chord = end.clone().sub(start);
	const rise = chord.z;
	const setOff = monotone(leaving ?? chord, rise, rise);
	const arriving = arrivingAs(onward, start, end, chord);
	return new CubicBezierCurve3(
		start,
		start.clone().addScaledVector(setOff, A_HANDLE),
		end.clone().addScaledVector(arriving, -A_HANDLE),
		end
	);
}

/**
 * The tangent a smooth leg to a point arrives with: from where it starts toward the next point, halved, as a
 * Catmull-Rom curve's; along the way a figure leaves, as long as the leg's chord; or along its chord; never rising or
 * sinking past its heights.
 */
function arrivingAs(onward: Onward, start: Vector3, end: Vector3, chord: Vector3): Vector3 {
	switch (onward.kind) {
		case 'toward':
			return monotone(onward.point.clone().sub(start).divideScalar(HALVES), chord.z, onward.point.z - end.z);
		case 'leaving':
			return monotone(onward.heading.clone().multiplyScalar(chord.length()), chord.z, onward.heading.z);
		case 'chord':
			return chord;
	}
}

/**
 * A tangent made to keep a height between its points: none up or down where the height turns there, from rising to
 * sinking or the other way, or stands still on one side; else no steeper than keeps it so (Fritsch and Carlson).
 */
function monotone(tangent: Vector3, riseBefore: number, riseAfter: number): Vector3 {
	const kept = tangent.clone();
	if (riseBefore * riseAfter <= 0 || tangent.z * riseBefore <= 0) return kept.setZ(0);
	const steepest = STEEPEST_AND_MONOTONE * Math.min(Math.abs(riseBefore), Math.abs(riseAfter));
	return kept.setZ(Math.sign(tangent.z) * Math.min(Math.abs(tangent.z), steepest));
}

/**
 * A leg that bends to its point, arriving heading so many degrees from up the page, as a parabola whose turn stands
 * `bend` shares of the chord before the point; leaving heading as the leg before arrived, where there is one, as fast
 * as the parabola leaves.
 */
function bendingLeg(
	start: Vector3,
	to: Vector3,
	arriving: number,
	bend: number,
	arrived: Arrival | null
): Curve<Vector3> {
	const arrivingWay = onThePlaneHeading(arriving);
	const turn = to.clone().addScaledVector(arrivingWay, -bend * start.distanceTo(to));
	const parabolasLeaving = turn.clone().sub(start).multiplyScalar(A_PARABOLAS_TANGENT);
	const leaving =
		arrived === null ? parabolasLeaving : arrived.heading.clone().multiplyScalar(parabolasLeaving.length());
	const arrivingTangent = to.clone().sub(turn).multiplyScalar(A_PARABOLAS_TANGENT);
	return new CubicBezierCurve3(
		start,
		start.clone().addScaledVector(leaving, A_HANDLE),
		to.clone().addScaledVector(arrivingTangent, -A_HANDLE),
		to
	);
}

/** The way an eye that never rolls looks, heading and tipped so many degrees. */
function lookingOf(heading: number, tip: number): Vector3 {
	return onThePlaneHeading(heading)
		.multiplyScalar(Math.cos(radians(tip)))
		.addScaledVector(OUT_OF_THE_PAGE, Math.sin(radians(tip)));
}

/** The way the top of an eye that never rolls points, heading and tipped so many degrees: along its heading, lifted. */
function topOf(heading: number, tip: number): Vector3 {
	return onThePlaneHeading(heading)
		.multiplyScalar(-Math.sin(radians(tip)))
		.addScaledVector(OUT_OF_THE_PAGE, Math.cos(radians(tip)));
}

/** The way a heading points on the window's plane, as long as one. */
function onThePlaneHeading(heading: number): Vector3 {
	return new Vector3(Math.sin(radians(heading)), -Math.cos(radians(heading)), 0);
}

function vectorOf(spot: Spot): Vector3 {
	return new Vector3(spot.across, spot.down, spot.out);
}

function spotOf(vector: Vector3): Spot {
	return { across: vector.x, down: vector.y, out: vector.z };
}

function degreesOf(angle: number): number {
	return (angle * A_HALF_TURN) / Math.PI;
}
