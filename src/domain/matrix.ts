/**
 * A matrix that carries a point of something drawn to where it is seen, as CSS's `matrix3d()` does, and the few that
 * make one: moved, seen in perspective, rotated about each axis, grown, and undone, by three's own arithmetic.
 *
 * Where anything that leans, grows or turns stands on the frame is worked out here once, and the stage is handed the
 * numbers it draws with (`src/domain/stance.ts`), so the two never tell it apart. The entries are named as a DOMMatrix
 * and CSS name them, and `matrix3d()` takes them in that order, `m11` to `m44`: a point is carried as a column of
 * across, down, out toward the eye and 1, `m41`, `m42` and `m43` move it, `m34` sees it in perspective, and the
 * entry `m<column><row>` stands in that column and row. A chain of them reads as a CSS transform list does: the last
 * carries a point first.
 */
import { Matrix4 } from 'three';
import { type Box, type Point, cornersAround, middleX, middleY } from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, needed } from './handed.ts';
import { between } from './toward.ts';

/** A matrix of four rows and four columns, its entries named by their column, then their row. */
export interface Matrix {
	readonly m11: number;
	readonly m12: number;
	readonly m13: number;
	readonly m14: number;
	readonly m21: number;
	readonly m22: number;
	readonly m23: number;
	readonly m24: number;
	readonly m31: number;
	readonly m32: number;
	readonly m33: number;
	readonly m34: number;
	readonly m41: number;
	readonly m42: number;
	readonly m43: number;
	readonly m44: number;
}

/**
 * The entries of a matrix that carries a plane flat onto another, as CSS's 2D `matrix()` takes them, `a` to `f`:
 * across and down for each of the plane's own two, and how far it is moved.
 */
export type FlatMatrix = Pick<Matrix, 'm11' | 'm12' | 'm21' | 'm22' | 'm41' | 'm42'>;

/**
 * A point of a room, in pixels: across and down from where the room is seen from in front, and out from it toward the
 * eye.
 */
export interface Spot {
	readonly across: number;
	readonly down: number;
	readonly out: number;
}

/**
 * How near the eye a plane stands at each point of the frame it is seen at, in times as near as the frame's own plane:
 * at the middle the plane is carried about, and more for each of the frame's pixels across and down from there, as a
 * plane's nearness goes evenly across the frame.
 */
export interface Nearness {
	readonly atTheMiddle: number;
	readonly across: number;
	readonly down: number;
}

/**
 * A point of a plane as a matrix carries it before it is seen: how far across and down from the middle it is carried
 * about, each times how far it is seen from, and how far it is seen from (`seenFromOf`), so a cut keeps or leaves it
 * before it is divided.
 */
interface CarriedPoint {
	readonly across: number;
	readonly down: number;
	readonly seenFrom: number;
}

/**
 * An edge a polygon of carried points is cut at: of a box of the frame, a cut through the eye, or a distance from it:
 * how far inside it a carried point stands, none on it, less than none past it, is so much of its across, its down
 * and how far it is seen from, and so much more, none for an edge through the eye.
 */
interface Edge {
	readonly across: number;
	readonly down: number;
	readonly seenFrom: number;
	readonly beyond: number;
}

/**
 * A part of a plane a matrix carries, by how far the eye sees it from: what stands farther than the part before it
 * reaches, the eye for the first, and no farther than it reaches itself, Infinity for the last; and how many times
 * the matrix draws it as long at most, where a box of the frame shows it, never fewer than once.
 */
export interface MagnifiedPart {
	readonly reaches: number;
	readonly times: number;
}

/** A way or a place across and down the frame, from the middle a matrix carries about. */
interface Way {
	readonly across: number;
	readonly down: number;
}

/**
 * The ways a matrix carries a step across and a step down the plane it carries, from its middle, as long as it draws
 * them.
 */
export interface PlanesWays {
	readonly across: Spot;
	readonly down: Spot;
}

/** A spot of the room as a film writes it, every one of its three numbers given. */
export const A_SPOT: Kind<Spot> = new OfForm<Spot>(
	{ across: needed(A_NUMBER), down: needed(A_NUMBER), out: needed(A_NUMBER) },
	'a spot: { across, down, out }'
);

/** The middle of what a matrix carries about its middle, as the matrix takes it: no way from there. */
export const ITS_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
// A step across a plane and one down it from its middle
const A_STEP_ACROSS: Spot = { across: 1, down: 0, out: 0 };
const A_STEP_DOWN: Spot = { across: 0, down: 1, out: 0 };

/** The way from one spot to another. */
export function wayBetween(start: Spot, end: Spot): Spot {
	return { across: end.across - start.across, down: end.down - start.down, out: end.out - start.out };
}

/** A spot moved along a way so many times its length. */
export function movedAlong(start: Spot, way: Spot, times: number): Spot {
	return {
		across: start.across + way.across * times,
		down: start.down + way.down * times,
		out: start.out + way.out * times
	};
}

/** A spot so many times as far from the room's middle. */
export function scaledBy(spot: Spot, times: number): Spot {
	return { across: spot.across * times, down: spot.down * times, out: spot.out * times };
}

/** How far two ways go together: their lengths times how near one points along the other. */
export function dotOf(first: Spot, second: Spot): number {
	return first.across * second.across + first.down * second.down + first.out * second.out;
}

/** The way square to two others, as long as the area they span, turning from the first to the second. */
export function crossOf(first: Spot, second: Spot): Spot {
	return {
		across: first.down * second.out - first.out * second.down,
		down: first.out * second.across - first.across * second.out,
		out: first.across * second.down - first.down * second.across
	};
}

export function lengthOf(way: Spot): number {
	return Math.hypot(way.across, way.down, way.out);
}

/** A way as long as one, pointing as it does: divided by its length, so a way along an axis comes out exact. */
export function unitOf(way: Spot): Spot {
	const length = lengthOf(way);
	return { across: way.across / length, down: way.down / length, out: way.out / length };
}

const DEGREES_IN_A_HALF_TURN = 180;
// Half of a sum of two lengths is their mean
const HALVES = 2;
// How far either axis of a plane may reach out of the frame's plane, for its length, while the plane is still taken
// to face the frame: a lean so slight moves the far corner of a frame 4096 pixels wide by less than a millionth of a
// pixel, where a whole turn's arithmetic leaves 2.4e-16
const FACING_WITHIN = 1e-9;
// Where a plane carried stands edge-on to the eye, between showing its front and its back
const EDGE_ON = 0;
// How far inside an edge of the frame a point on it stands; and the place in a polygon of the point after one
const ON_THE_EDGE = 0;
const ONE_AFTER = 1;
// The way into a box from each of its edges, across and down the frame
const FROM_THE_LEFT: Way = { across: 1, down: 0 };
const FROM_THE_TOP: Way = { across: 0, down: 1 };
const FROM_THE_RIGHT: Way = { across: -1, down: 0 };
const FROM_THE_BOTTOM: Way = { across: 0, down: -1 };
// How a point is seen from nearer as it comes out toward the eye: by all it comes out, for the eye's distance
const NEARER_BY_ITS_OUT = -1;
// The middle a matrix carries a plane about, as a point of that plane; and how many points of the frame show a plane
// that is not seen
const FROM_ITS_MIDDLE: Way = { across: 0, down: 0 };
const NONE_SEEN = 0;
// An edge of the frame cuts through the eye, standing no distance from it; an edge at a distance from the eye takes
// none of a point's across and down, and all of how far it is seen from
const THROUGH_THE_EYE = 0;
const NONE_OF_IT = 0;
const ALL_OF_IT = 1;
// How much farther each part of a plane magnified part by part reaches than the one before; and a part drawn no
// larger than it stands
const TWICE_AS_FAR = 2;
const AS_LARGE_AS_IT_STANDS = 1;

/** A plane the eye sees no larger than it stands, all of it: one part, drawn as large as it stands. */
export const UNMAGNIFIED: readonly MagnifiedPart[] = [{ reaches: Infinity, times: AS_LARGE_AS_IT_STANDS }];

// How far an entry of a matrix may stand from the one that carries every point where it stands, while it is still
// taken to: whole turns leave 2.4e-16, a pixel moved leaves 1
const UNMOVED_WITHIN = 1e-9;

/** A matrix that carries every point where it stands. */
const IDENTITY: Matrix = {
	m11: 1,
	m12: 0,
	m13: 0,
	m14: 0,
	m21: 0,
	m22: 1,
	m23: 0,
	m24: 0,
	m31: 0,
	m32: 0,
	m33: 1,
	m34: 0,
	m41: 0,
	m42: 0,
	m43: 0,
	m44: 1
};
// A point's down turned up, as three's y runs up the frame, against the frame's down
const DOWN_TURNED_UP: Matrix = { ...IDENTITY, m22: -1 };
// Every entry of a matrix, by its name
const ENTRIES = [
	'm11',
	'm12',
	'm13',
	'm14',
	'm21',
	'm22',
	'm23',
	'm24',
	'm31',
	'm32',
	'm33',
	'm34',
	'm41',
	'm42',
	'm43',
	'm44'
] as const satisfies readonly (keyof Matrix)[];

/** Whether a matrix carries every point where it stands, but for what whole turns leave of arithmetic. */
export function carriesEveryPointWhereItStands(matrix: Matrix): boolean {
	return ENTRIES.every((entry) => Math.abs(matrix[entry] - IDENTITY[entry]) <= UNMOVED_WITHIN);
}

/** A point moved across, down and out by a spot's own, as CSS's `translate3d()`. */
export function translation(by: Spot): Matrix {
	return { ...IDENTITY, m41: by.across, m42: by.down, m43: by.out };
}

/** A point seen from an eye standing out from the room's plane, as CSS's `perspective()`: a nearer one farther out. */
export function perspective(eyeDistance: number): Matrix {
	return { ...IDENTITY, m34: NEARER_BY_ITS_OUT / eyeDistance };
}

/**
 * A point rotated about the line across the room's middle, as CSS's `rotateX()`: the top goes back for more degrees.
 */
export function rotationX(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m22: cosine, m23: sine, m32: -sine, m33: cosine };
}

/** A point rotated about the line down the room's middle, as CSS's `rotateY()`: the right side goes back. */
export function rotationY(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m11: cosine, m13: -sine, m31: sine, m33: cosine };
}

/** A point rotated in the room's own plane, as CSS's `rotate()`: clockwise for more degrees. */
export function rotationZ(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m11: cosine, m12: sine, m21: -sine, m22: cosine };
}

/** A point carried out from the middle across and down, as CSS's `scale()`: so many times as far. */
export function scaling(factor: number): Matrix {
	return { ...IDENTITY, m11: factor, m22: factor };
}

/**
 * A point carried from the middle so many times as far along each way, as CSS's `scale3d()`; less than none turns it.
 */
export function scalingAlong(across: number, down: number, out: number): Matrix {
	return { ...IDENTITY, m11: across, m22: down, m33: out };
}

/** Matrices one after another, as a CSS transform list reads them: the last carries a point first. */
export function chained(matrices: readonly Matrix[]): Matrix {
	return matrices.reduce(product, IDENTITY);
}

/**
 * A matrix of the frame's axes written in three's, where a film's own three objects stand: down turned up on both of
 * its sides, so what it carries keeps its handedness and a face turns as three's do.
 */
export function inThreesAxes(matrix: Matrix): Matrix {
	return chained([DOWN_TURNED_UP, matrix, DOWN_TURNED_UP]);
}

/** Where a matrix carries a spot, seen from its eye where it sees in perspective. */
export function carried(matrix: Matrix, spot: Spot): Spot {
	const seenFrom = seenFromOf(matrix, spot);
	return {
		across: (matrix.m11 * spot.across + matrix.m21 * spot.down + matrix.m31 * spot.out + matrix.m41) / seenFrom,
		down: (matrix.m12 * spot.across + matrix.m22 * spot.down + matrix.m32 * spot.out + matrix.m42) / seenFrom,
		out: (matrix.m13 * spot.across + matrix.m23 * spot.down + matrix.m33 * spot.out + matrix.m43) / seenFrom
	};
}

/**
 * How far from its eye a matrix sees a spot, for how far its eye stands from the plane it sees at its own size: what
 * it divides the spot by; less than none behind the eye, and 1 for a matrix that sees nothing in perspective.
 */
export function seenFromOf(matrix: Matrix, spot: Spot): number {
	return matrix.m14 * spot.across + matrix.m24 * spot.down + matrix.m34 * spot.out + matrix.m44;
}

/** The ways a matrix carries a step across and a step down the plane it carries, from its middle. */
export function waysAlongItsPlane(matrix: Matrix): PlanesWays {
	const middle = carried(matrix, ITS_MIDDLE);
	return {
		across: wayBetween(middle, carried(matrix, A_STEP_ACROSS)),
		down: wayBetween(middle, carried(matrix, A_STEP_DOWN))
	};
}

/** The matrix that carries each point back to where a matrix carried it from: the matrix undone. */
export function inverseOf(matrix: Matrix): Matrix {
	const [m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44] =
		threesMatrixOf(matrix).invert().elements;
	return { m11, m12, m13, m14, m21, m22, m23, m24, m31, m32, m33, m34, m41, m42, m43, m44 };
}

/**
 * A matrix as three.js holds one, for three's own arithmetic on it: its entries column after column, as
 * `matrix3d()` takes them.
 */
export function threesMatrixOf(matrix: Matrix): Matrix4 {
	return new Matrix4().fromArray(ENTRIES.map((entry) => matrix[entry]));
}

/**
 * The matrix that turns the room's across, down and out to three ways, each as long as one and square to the others.
 */
export function turnTo(across: Spot, down: Spot, out: Spot): Matrix {
	return {
		...IDENTITY,
		m11: across.across,
		m12: across.down,
		m13: across.out,
		m21: down.across,
		m22: down.down,
		m23: down.out,
		m31: out.across,
		m32: out.down,
		m33: out.out
	};
}

/**
 * How many times as long a matrix draws, at its middle, what it carries about its middle, along the way it draws it
 * longest: a plane grown or brought near as large as it is drawn, and one leant toward edge-on as long as along its
 * side the eye still sees whole, never shrinking to none.
 */
export function longestScaleAtItsMiddle(matrix: Matrix): number {
	return longestScaleAt(matrix, carriedPointOf(matrix, FROM_ITS_MIDDLE));
}

/**
 * How many times as long a matrix draws a box of the plane it carries about the middle of another box of it, along the
 * way it draws it longest, where it draws it largest of all the part a box of the frame shows: a plane brought near or
 * leant toward the eye as large as its nearest part the frame shows. It is read at the corners of that part, past which
 * no point is drawn larger (no point inside drew larger in 2,703 random stances seen, 2026-11-11). None where the frame
 * shows none of the box, or the matrix sees the plane edge-on, through the eye, where a point is seen from no distance.
 */
export function longestScaleSeen(matrix: Matrix, laid: Box, part: Box, within: Box): number | null {
	if (nearnessOfItsPlane(matrix) === null) return null;
	const seen = carriedWithin(matrix, { left: middleX(laid), top: middleY(laid) }, part, within);
	if (seen.length === NONE_SEEN) return null;
	return Math.max(...seen.map((point) => longestScaleAt(matrix, point)));
}

/**
 * How many times a matrix draws a box of the plane it carries about the middle of another box of it as long, part by
 * part by how far the eye sees each part from, where a box of the frame shows it (`longestScaleSeen`): from the
 * nearest point shown, each part reaching twice as far as the one before, till one the matrix draws no larger, or the
 * farthest point shown, which reaches on past all; one part, drawn as large as it stands, where the frame shows none of
 * the box or the matrix sees it edge-on. The plane is drawn about as many times smaller as it is seen from farther, so
 * a part as dense as the eye magnifies its nearest point is about twice as dense as the eye needs at most. One density
 * for all of a plane the eye skims, its nearest point's, asked the graphics card for more than it holds: two plates of
 * the promo's dive asked 1.5 and 1.9 GB at 11.98 s, and the card lost the room's canvas (2026-11-12).
 */
export function magnifiedByDistance(matrix: Matrix, laid: Box, part: Box, within: Box): readonly MagnifiedPart[] {
	const seen =
		nearnessOfItsPlane(matrix) === null
			? []
			: carriedWithin(matrix, { left: middleX(laid), top: middleY(laid) }, part, within);
	if (seen.length === NONE_SEEN) return UNMAGNIFIED;
	return partsFrom(matrix, seen, Math.min(...seen.map((point) => point.seenFrom)));
}

/**
 * Parts of a plane magnified as many times at most as what is drawn on it holds, and never fewer than once: drawn
 * denser than its own pixels, a picture holds the same picture stretched. Neighbouring parts left alike are one,
 * reaching as far as the farther, so no part is painted and drawn apart at a density another has.
 */
export function magnifiedNoFurtherThan(parts: readonly MagnifiedPart[], atMost: number): readonly MagnifiedPart[] {
	const bounded = parts.map((part) => ({
		reaches: part.reaches,
		times: Math.max(AS_LARGE_AS_IT_STANDS, Math.min(part.times, atMost))
	}));
	return bounded.filter((part, place) => part.times !== bounded[place + ONE_AFTER]?.times);
}

/**
 * The parts of a polygon of carried points that stand no nearer than a distance, each reaching twice as far as the
 * one before, as `magnifiedByDistance` parts them.
 */
function partsFrom(matrix: Matrix, seen: readonly CarriedPoint[], from: number): readonly MagnifiedPart[] {
	const reaches = from * TWICE_AS_FAR;
	const times = largestOf(matrix, cutAt(seen, nearerThan(reaches)));
	const farther = cutAt(seen, fartherThan(reaches));
	if (farther.length === NONE_SEEN || times === AS_LARGE_AS_IT_STANDS) {
		return [{ reaches: Infinity, times: largestOf(matrix, seen) }];
	}
	return [{ reaches, times }, ...partsFrom(matrix, farther, reaches)];
}

/** How many times a matrix draws a polygon of carried points as long at most, never fewer than once. */
function largestOf(matrix: Matrix, points: readonly CarriedPoint[]): number {
	return Math.max(AS_LARGE_AS_IT_STANDS, ...points.map((point) => longestScaleAt(matrix, point)));
}

/** The edge that keeps what is seen from no farther than a distance. */
function nearerThan(distance: number): Edge {
	return { across: NONE_OF_IT, down: NONE_OF_IT, seenFrom: -ALL_OF_IT, beyond: distance };
}

/** The edge that keeps what is seen from no nearer than a distance. */
function fartherThan(distance: number): Edge {
	return { across: NONE_OF_IT, down: NONE_OF_IT, seenFrom: ALL_OF_IT, beyond: -distance };
}

/**
 * How many times as long a matrix draws, at a point of the plane it carries, what it carries there, along the way it
 * draws it longest: how far the point seen moves for a step across and a step down the plane, the point and its
 * neighbour each divided by how far it is seen from.
 */
function longestScaleAt(matrix: Matrix, point: CarriedPoint): number {
	const seenFromSquared = point.seenFrom * point.seenFrom;
	const acrossOfAcross = (matrix.m11 * point.seenFrom - point.across * matrix.m14) / seenFromSquared;
	const acrossOfDown = (matrix.m21 * point.seenFrom - point.across * matrix.m24) / seenFromSquared;
	const downOfAcross = (matrix.m12 * point.seenFrom - point.down * matrix.m14) / seenFromSquared;
	const downOfDown = (matrix.m22 * point.seenFrom - point.down * matrix.m24) / seenFromSquared;
	// The longer half-axis of the ellipse those four entries draw a circle of radius one as, by the two halves of the
	// drawing that turn and that mirror it
	const turning = Math.hypot(acrossOfAcross + downOfDown, downOfAcross - acrossOfDown);
	const mirroring = Math.hypot(acrossOfAcross - downOfDown, downOfAcross + acrossOfDown);
	return (turning + mirroring) / HALVES;
}

/**
 * How near the eye a matrix sees the plane it carries about its middle, out none, at each point of the frame it carries
 * the plane to (`Nearness`): the reciprocal of what the matrix divides the point by (`seenFromOf`); none where it
 * carries the plane onto a line, edge-on to the eye. A point of the plane is carried by its across, its down and the
 * matrix's own move, so a point of the frame seen back through those three columns comes to the point of the plane it
 * shows, scaled by how near it stands there: the last row of their inverse, its cofactors over their determinant.
 */
export function nearnessOfItsPlane(matrix: Matrix): Nearness | null {
	const across = matrix.m12 * matrix.m24 - matrix.m22 * matrix.m14;
	const down = matrix.m21 * matrix.m14 - matrix.m11 * matrix.m24;
	const atTheMiddle = matrix.m11 * matrix.m22 - matrix.m21 * matrix.m12;
	const determinant = matrix.m41 * across + matrix.m42 * down + matrix.m44 * atTheMiddle;
	if (determinant === EDGE_ON) return null;
	return { atTheMiddle: atTheMiddle / determinant, across: across / determinant, down: down / determinant };
}

/**
 * The points of the frame a matrix shows of a box of the plane it carries about the middle of another box of it, out
 * none: as much of the box as stands within a box of the frame, a polygon going round it, in the frame's pixels; none
 * where none of it does. The box is cut before its points are divided by how far each is seen from, as the browser cuts
 * a layer, so a side passing behind the eye is cut away, not drawn turned over past it: the edges of a box of the frame
 * cut through the eye, and keep only what stands before it. A plane the matrix sees edge-on, through the eye, it shows
 * as no polygon (`nearnessOfItsPlane`).
 */
export function seenWithin(matrix: Matrix, laid: Box, part: Box, within: Box): readonly Point[] {
	const middle = { left: middleX(laid), top: middleY(laid) };
	return carriedWithin(matrix, middle, part, within).map((point) => ({
		left: middle.left + point.across / point.seenFrom,
		top: middle.top + point.down / point.seenFrom
	}));
}

/**
 * The points of a box of a plane a matrix carries about a middle of that plane, out none, that stand within a box of
 * the frame, as the matrix carries them before they are seen: a polygon going round, cut through the eye at the box's
 * edges (`seenWithin`).
 */
function carriedWithin(matrix: Matrix, middle: Point, part: Box, within: Box): readonly CarriedPoint[] {
	const corners = cornersAround(part).map((corner) =>
		carriedPointOf(matrix, { across: corner.left - middle.left, down: corner.top - middle.top })
	);
	return edgesOf(within, middle).reduce(cutAt, corners);
}

/**
 * Whether a matrix that sees nothing in perspective carries the room's plane onto one facing the frame, near or far,
 * grown or rolled: neither of the plane's axes reaches out of it.
 */
export function facesTheFrame(matrix: Matrix): boolean {
	return (
		Math.abs(matrix.m13) <= FACING_WITHIN * Math.hypot(matrix.m11, matrix.m12, matrix.m13) &&
		Math.abs(matrix.m23) <= FACING_WITHIN * Math.hypot(matrix.m21, matrix.m22, matrix.m23)
	);
}

/**
 * Whether a matrix leaves the room's across where it stood, unrolled: it carries no share of across down the frame,
 * nor turns it back on itself.
 */
export function keepsItsAcross(matrix: Matrix): boolean {
	return Math.abs(matrix.m12) <= FACING_WITHIN * Math.hypot(matrix.m11, matrix.m12, matrix.m13) && matrix.m11 > EDGE_ON;
}

/**
 * A matrix that carries the room's plane onto one facing the frame, written as it carries that plane: flat, every
 * point of it seen from one distance.
 */
export function flatOf(matrix: Matrix): FlatMatrix {
	const seenFrom = matrix.m44;
	return {
		m11: matrix.m11 / seenFrom,
		m12: matrix.m12 / seenFrom,
		m21: matrix.m21 / seenFrom,
		m22: matrix.m22 / seenFrom,
		m41: matrix.m41 / seenFrom,
		m42: matrix.m42 / seenFrom
	};
}

/**
 * Whether the room's plane, carried by a matrix and seen from its eye, shows the side it faced the eye with: drawn as
 * from in front, not mirrored. The determinant of what the matrix does to the plane is more than none where it does.
 */
export function showsItsFront(matrix: Matrix): boolean {
	const orientation =
		matrix.m11 * (matrix.m22 * matrix.m44 - matrix.m42 * matrix.m24) -
		matrix.m21 * (matrix.m12 * matrix.m44 - matrix.m42 * matrix.m14) +
		matrix.m41 * (matrix.m12 * matrix.m24 - matrix.m22 * matrix.m14);
	return orientation > EDGE_ON;
}

/**
 * One matrix after another, as CSS chains two: the inner carries a point first. Each entry is the row of the outer it
 * stands in across the column of the inner: `m<column><row>` sums `outer.m<k><row> × inner.m<column><k>`.
 */
function product(outer: Matrix, inner: Matrix): Matrix {
	return {
		m11: outer.m11 * inner.m11 + outer.m21 * inner.m12 + outer.m31 * inner.m13 + outer.m41 * inner.m14,
		m12: outer.m12 * inner.m11 + outer.m22 * inner.m12 + outer.m32 * inner.m13 + outer.m42 * inner.m14,
		m13: outer.m13 * inner.m11 + outer.m23 * inner.m12 + outer.m33 * inner.m13 + outer.m43 * inner.m14,
		m14: outer.m14 * inner.m11 + outer.m24 * inner.m12 + outer.m34 * inner.m13 + outer.m44 * inner.m14,
		m21: outer.m11 * inner.m21 + outer.m21 * inner.m22 + outer.m31 * inner.m23 + outer.m41 * inner.m24,
		m22: outer.m12 * inner.m21 + outer.m22 * inner.m22 + outer.m32 * inner.m23 + outer.m42 * inner.m24,
		m23: outer.m13 * inner.m21 + outer.m23 * inner.m22 + outer.m33 * inner.m23 + outer.m43 * inner.m24,
		m24: outer.m14 * inner.m21 + outer.m24 * inner.m22 + outer.m34 * inner.m23 + outer.m44 * inner.m24,
		m31: outer.m11 * inner.m31 + outer.m21 * inner.m32 + outer.m31 * inner.m33 + outer.m41 * inner.m34,
		m32: outer.m12 * inner.m31 + outer.m22 * inner.m32 + outer.m32 * inner.m33 + outer.m42 * inner.m34,
		m33: outer.m13 * inner.m31 + outer.m23 * inner.m32 + outer.m33 * inner.m33 + outer.m43 * inner.m34,
		m34: outer.m14 * inner.m31 + outer.m24 * inner.m32 + outer.m34 * inner.m33 + outer.m44 * inner.m34,
		m41: outer.m11 * inner.m41 + outer.m21 * inner.m42 + outer.m31 * inner.m43 + outer.m41 * inner.m44,
		m42: outer.m12 * inner.m41 + outer.m22 * inner.m42 + outer.m32 * inner.m43 + outer.m42 * inner.m44,
		m43: outer.m13 * inner.m41 + outer.m23 * inner.m42 + outer.m33 * inner.m43 + outer.m43 * inner.m44,
		m44: outer.m14 * inner.m41 + outer.m24 * inner.m42 + outer.m34 * inner.m43 + outer.m44 * inner.m44
	};
}

/** An angle in degrees, in radians. */
export function radians(degrees: number): number {
	return (degrees * Math.PI) / DEGREES_IN_A_HALF_TURN;
}

/** A point of a plane, out none, as a matrix carries it before it is seen. */
function carriedPointOf(matrix: Matrix, point: Way): CarriedPoint {
	return {
		across: matrix.m11 * point.across + matrix.m21 * point.down + matrix.m41,
		down: matrix.m12 * point.across + matrix.m22 * point.down + matrix.m42,
		seenFrom: matrix.m14 * point.across + matrix.m24 * point.down + matrix.m44
	};
}

/** The edges of a box of the frame, from the middle a matrix carries about, as cuts through the eye. */
function edgesOf(within: Box, middle: Point): readonly Edge[] {
	const topLeft = { across: within.left - middle.left, down: within.top - middle.top };
	const bottomRight = { across: topLeft.across + within.width, down: topLeft.down + within.height };
	return [
		edgeThrough(FROM_THE_LEFT, topLeft),
		edgeThrough(FROM_THE_TOP, topLeft),
		edgeThrough(FROM_THE_RIGHT, bottomRight),
		edgeThrough(FROM_THE_BOTTOM, bottomRight)
	];
}

/** The edge through a place of the frame that keeps what stands a way from it, as a cut through the eye. */
function edgeThrough(inward: Way, place: Way): Edge {
	return {
		across: inward.across,
		down: inward.down,
		seenFrom: -(inward.across * place.across + inward.down * place.down),
		beyond: THROUGH_THE_EYE
	};
}

/**
 * A polygon of carried points going round cut at an edge: each point inside it kept, and where a side crosses it, the
 * point it crosses at, so what is kept goes round too.
 */
function cutAt(points: readonly CarriedPoint[], edge: Edge): readonly CarriedPoint[] {
	const kept: CarriedPoint[] = [];
	for (const [place, point] of points.entries()) {
		const next = nextAround(points, place);
		const inside = insideOf(edge, point);
		const nextInside = insideOf(edge, next);
		const isKept = inside >= ON_THE_EDGE;
		if (isKept) kept.push(point);
		if (isKept !== nextInside >= ON_THE_EDGE) kept.push(carriedBetween(point, next, inside / (inside - nextInside)));
	}
	return kept;
}

/** How far inside an edge a carried point stands: none on it, less than none past it. */
function insideOf(edge: Edge, point: CarriedPoint): number {
	return edge.across * point.across + edge.down * point.down + edge.seenFrom * point.seenFrom + edge.beyond;
}

/** The point after one of a polygon going round it, the first after the last. */
function nextAround(points: readonly CarriedPoint[], place: number): CarriedPoint {
	const next = points[(place + ONE_AFTER) % points.length];
	if (next === undefined) throw new Error(`a polygon of ${points.length} points has none after point ${place}`);
	return next;
}

/** A carried point a share of the way from one to another, as a side between them is cut. */
function carriedBetween(start: CarriedPoint, end: CarriedPoint, share: number): CarriedPoint {
	return {
		across: between(start.across, end.across, share),
		down: between(start.down, end.down, share),
		seenFrom: between(start.seenFrom, end.seenFrom, share)
	};
}
