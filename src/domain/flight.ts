/**
 * A flight of the eye over the page's window: its way, legs flown one after another from where the eye stands, and its
 * gaze along the way, apart from the way's shape. Every spot of a flight is the window's own, in pixels of a frame 1080
 * high from the window's middle, `out` how high over its face, so the eye rides the window as it stands
 * (`src/domain/eye.ts`).
 *
 * The way is three.js's curves, flown by its length, so the eye goes as far in each equal share of the flight's own
 * progress, whatever bends the way takes; past either end, as a curve that bounces takes it, it goes straight on along
 * the way there. A leg goes straight to a point; or bends, arriving at its point heading the way the film names, as a
 * parabola does, its turn as far before the point as `bend` shares of the leg's chord; or goes on ahead, straight along
 * the way's last heading, so many times as long as the leg before. A leg after another leaves heading as that one
 * arrived. Where the way is smooth, a leg to a point arrives heading from where it starts toward the next leg's point,
 * as a Catmull-Rom curve does, but never higher or lower than the two points either side of it: where the way sinks to
 * a point and runs on level, it flattens there, as a smooth way that sinks to a point and runs on low dipped under the
 * page (the review of the flight, 2026-11-09). A way that reaches the page's plane anywhere is refused.
 *
 * The gaze is two values apart, as a person flying low over a page turns and tips their head: the heading, which way
 * on the window's plane the eye looks, in degrees from up the page clockwise, and the tip, how far its sight lifts off
 * the plane, from looking straight down onto it at -90 through level at 0. Each follows rules reached by the ends of
 * legs: a value of degrees, a heading toward a spot or along the way, a tip that holds a spot so far down the frame.
 * Each rule is read where the eye stands as it flies, so one that holds a spot holds it all along: between two rules
 * the gaze goes from the one before to the one after, both read where the eye stands, easing in and out by the share of
 * the way between them; past the last it follows the last; a heading turns the short way round. The eye never rolls
 * but as it sets off: a roll it stood with eases away by the end of the first leg.
 */
import { CubicBezierCurve3, type Curve, CurvePath, LineCurve3, Vector3 } from 'three';
import { FilmError } from './errors.ts';
import type { Viewpoint } from './eye.ts';
import { type Spot, radians } from './matrix.ts';
import { between, easeInOutSine } from './time.ts';

/** A leg of a flight, as the way is built from it. */
export type Leg =
	| { readonly kind: 'to'; readonly to: Spot }
	| { readonly kind: 'bending'; readonly to: Spot; readonly arriving: number; readonly bend: number }
	| { readonly kind: 'ahead'; readonly times: number };

/** How legs straight to their points join: at a corner, or smoothly through each point. */
export const JOININGS = ['straight', 'smooth'] as const;

export type Joining = (typeof JOININGS)[number];

/** A rule a gaze follows: so many degrees; a heading toward a spot, or along the way; a tip that holds a spot. */
type GazeRule =
	| { readonly kind: 'degrees'; readonly degrees: number }
	| { readonly kind: 'toward'; readonly spot: Spot }
	| { readonly kind: 'along' }
	| { readonly kind: 'holding'; readonly spot: Spot; readonly downTheFrame: number };

/** A rule of the gaze the eye follows from a share of its way's length on. */
export interface GazeKey {
	readonly share: number;
	readonly rule: GazeRule;
}

/** A gaze's keys: where it set off, at the way's start, then those the film names, each farther along. */
type GazeKeys = readonly [GazeKey, ...GazeKey[]];

/** A flight's way: its curve, and the share of the curve's length each leg ends at. */
export interface Way {
	readonly curve: CurvePath<Vector3>;
	readonly legsEnd: readonly number[];
}

/**
 * How the eye sees as it flies: its focal length, how far ahead of it its aim stands, and how high the frame is in
 * pixels of a frame 1080 high, which a tip that holds a spot reads.
 */
interface FlyingEye {
	readonly focalLength: number;
	readonly frameHeight: number;
}

/** A flight worked out: its way, its gaze's keys, the roll it set off with, and the eye that flies it. */
export interface Flight {
	readonly way: Way;
	readonly heading: GazeKeys;
	readonly tip: GazeKeys;
	readonly roll: number;
	readonly eye: FlyingEye;
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
// (Fritsch and Carlson)
const STEEPEST_AND_MONOTONE = 3;
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

/**
 * A flight's way from where the eye stands, through its legs, joined as named; refused where a leg goes nowhere, goes
 * ahead with no leg before it, or the way reaches the page's plane.
 */
export function wayOf(from: Spot, legs: readonly Leg[], joining: Joining, move: string): Way {
	const curve = new CurvePath<Vector3>();
	let standing = vectorOf(from);
	let arrived: Arrival | null = null;
	for (const [index, leg] of legs.entries()) {
		const next = legs[index + 1];
		const nextPoint = next !== undefined && next.kind === 'to' ? vectorOf(next.to) : null;
		const legsCurve = legCurve(leg, standing, arrived, nextPoint, joining, `${move}'s leg ${String(index)}`);
		const ends = legsCurve.getPoint(ITS_END);
		if (standing.distanceTo(ends) < NOWHERE) {
			throw new FilmError(`${move}'s leg ${String(index)} goes nowhere: send it somewhere the eye does not stand`);
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
 * Where the eye flying stands, looks and its top points, a share of its way's length along, straight on past either
 * end: on its way, its gaze as its rules have it there, rolled as it set off till the first leg's end.
 */
export function flownAt(flight: Flight, share: number): Viewpoint {
	const onTheWay = Math.min(ITS_END, Math.max(ITS_START, share));
	const way = flight.way.curve;
	const at = way.getPointAt(onTheWay).addScaledVector(way.getTangentAt(onTheWay), (share - onTheWay) * way.getLength());
	const heading = valueAt(flight.heading, onTheWay, at, flight);
	const tip = valueAt(flight.tip, onTheWay, at, flight);
	const looking = lookingOf(heading, tip);
	const firstLegsEnd = flight.way.legsEnd[0] ?? ITS_END;
	const roll = flight.roll * (1 - easeInOutSine(Math.min(ITS_END, onTheWay / firstLegsEnd)));
	const top = topOf(heading, tip).applyAxisAngle(looking, radians(roll));
	return {
		at: spotOf(at),
		aim: spotOf(at.clone().addScaledVector(looking, flight.eye.focalLength)),
		up: spotOf(top)
	};
}

/** The heading the way flies at a share of its length, on the page's plane. */
function headingAlong(way: Way, share: number): number {
	const tangent = way.curve.getTangentAt(share);
	return degreesOf(Math.atan2(tangent.x, -tangent.y));
}

/** Where along its way the eye stands at a share of its length. */
export function pointOnTheWay(way: Way, share: number): Spot {
	return spotOf(way.curve.getPointAt(share));
}

/**
 * The value of a gaze's rules at a share of the way, the eye standing there: from the rule before to the rule after,
 * each read there, eased in and out by the share between them; the last rule past it; a heading the short way round.
 */
function valueAt(keys: GazeKeys, share: number, at: Vector3, flight: Flight): number {
	const [first, ...rest] = keys;
	let start = first;
	for (const end of rest) {
		if (share < end.share) {
			const from = ruled(start.rule, share, at, flight);
			const to = ruled(end.rule, share, at, flight);
			const eased = easeInOutSine((share - start.share) / (end.share - start.share));
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
 * A leg's curve from where the way stands: leaving heading as the leg before arrived, where there is one; arriving
 * toward the next leg's point where the way is smooth and the next goes to one; refused, as `where` names it, going
 * ahead with no leg before.
 */
function legCurve(
	leg: Leg,
	start: Vector3,
	arrived: Arrival | null,
	nextPoint: Vector3 | null,
	joining: Joining,
	where: string
): Curve<Vector3> {
	switch (leg.kind) {
		case 'to': {
			const to = vectorOf(leg.to);
			if (joining === 'straight') return new LineCurve3(start, to);
			const leaving = arrived === null ? null : arrived.heading.clone().multiplyScalar(start.distanceTo(to));
			return hermiteLeg(start, to, leaving, nextPoint);
		}
		case 'bending':
			return bendingLeg(start, vectorOf(leg.to), leg.arriving, leg.bend, arrived);
		case 'ahead': {
			if (arrived === null) {
				throw new FilmError(`${where} goes ahead with no leg before it: send the eye somewhere first`);
			}
			return new LineCurve3(start, start.clone().addScaledVector(arrived.heading, leg.times * arrived.length));
		}
	}
}

/**
 * A leg to a point joined smoothly: leaving as named, along its chord where nothing is named; arriving heading from
 * where it starts toward the next point, as a Catmull-Rom curve does, along its chord where there is none; each never
 * rising or sinking past its heights.
 */
function hermiteLeg(start: Vector3, end: Vector3, leaving: Vector3 | null, nextPoint: Vector3 | null): Curve<Vector3> {
	const chord = end.clone().sub(start);
	const rise = chord.z;
	const setOff = monotone(leaving ?? chord, rise, rise);
	const arriving =
		nextPoint === null ? chord : monotone(nextPoint.clone().sub(start).divideScalar(HALVES), rise, nextPoint.z - end.z);
	return new CubicBezierCurve3(
		start,
		start.clone().addScaledVector(setOff, A_HANDLE),
		end.clone().addScaledVector(arriving, -A_HANDLE),
		end
	);
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
