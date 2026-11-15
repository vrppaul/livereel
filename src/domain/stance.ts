/**
 * How something stands about its box's middle — how large, how far out toward the eye, which way it faces and the point
 * of its box it turns about — and how the stage draws it so: one matrix (`src/domain/matrix.ts`), which the stage draws
 * with and the engine reads where the thing stands on the frame, so a film turns, rolls, grows or brings near anything
 * placed, an object, a group or the window, by its values alone, with no move of its own for each.
 *
 * It turns about a point of its box, its middle until a lean names another, as a slab leans back on its foot. The point
 * is a share of the box, so it goes with the box as the box travels or grows; it moves nothing while the angle turns
 * nothing, so a lean names another only then, where it cannot jump.
 *
 * The stage is handed a 2D matrix where the thing faces the frame and stands before the eye, and a 3D one only where it
 * leans or stands behind the eye: a 3D transform, even of no angle, costs the graphics card a layer in every exposure,
 * so a frame of 16 exposures would outrun the card's memory and leave objects out of some of them, with no error.
 */
import { Euler, MathUtils } from 'three';
import { FilmError } from './errors.ts';
import { A_POINT, MIDDLE_SHARE, type Point, type Size, frameScaleOf } from './geometry.ts';
import { A_NUMBER, type Kind, NameOrForm, OneOf, Plain } from './handed.ts';
import {
	type FlatMatrix,
	ITS_MIDDLE,
	type Matrix,
	type PlanesWays,
	type Spot,
	carried,
	chained,
	crossOf,
	dotOf,
	facesTheFrame,
	flatOf,
	keepsItsAcross,
	lengthOf,
	rotationX,
	rotationY,
	rotationZ,
	scaling,
	showsItsFront,
	threesMatrixOf,
	translation,
	turnTo,
	unitOf,
	wayBetween,
	waysAlongItsPlane
} from './matrix.ts';
import { between } from './toward.ts';

/**
 * How something faces, in degrees, 0 face-on: leant back from its top edge, `tilt`, swung about its middle, `turn`,
 * rolled clockwise in its own plane, `roll`, and turned over round its own width as it then stands, top away from the
 * eye, `over`, as a slab turned over in the hand.
 */
export interface Angle {
	readonly tilt: number;
	readonly turn: number;
	readonly roll: number;
	readonly over: number;
}

/**
 * How something stands about its box's middle: `scale` times as large, `depth` out toward the eye in the frame's
 * pixels, facing as `angle`, turned `about` a point of its box, in shares of the box across and down from its top left
 * corner, which may lie past it.
 */
export interface Stance {
	readonly scale: number;
	readonly depth: number;
	readonly angle: Angle;
	readonly about: Point;
}

/** The points of a box a film names to turn something about: its middle, or the middle of an edge. */
const ABOUT_NAMES = ['middle', 'top', 'bottom', 'left', 'right'] as const;

type AboutName = (typeof ABOUT_NAMES)[number];

/** A point of a box a film turns something about: by its name, or in shares of the box, `{ left, top }`. */
export type AboutWritten = AboutName | Point;

/** How the stage draws something about its middle: flat, a 2D matrix, or leant, a 3D one. */
export type Transform = FlatTransform | LeantTransform;

interface FlatTransform {
	readonly kind: 'flat';
	readonly matrix: FlatMatrix;
}

interface LeantTransform {
	readonly kind: 'leant';
	readonly matrix: Matrix;
}

/** The side of something the eye sees. */
export type Face = 'front' | 'back';

// As large as its box
const AS_LARGE = 1;
// On the frame's plane, or the window's
const ON_ITS_PLANE = 0;
// A scale of none draws nothing, and one less draws it upside down, a half roll
const NONE = 0;
const DEGREES_IN_A_TURN = 360;
// How far before the eye something's middle is seen from, `m44` of its matrix, where it stands at the eye or behind it
const BEHIND_THE_EYE = 0;
// A refusal says how far the eye stands from the frame to a tenth of a pixel: 2540.5 at 24°
const DIGITS_OF_A_DEPTH = 1;
// The order three reads the turns of an angle with no turn over in: tilted, swung, then rolled, as `angledAs` chains
// them
const TILT_TURN_ROLL = 'XYZ';
const NO_TURN_OVER = 0;
// How far a step across and one down a matrix draws may stand unlike in length, for their length, or off square, as a
// share of their lengths' product, while it still grows what it carries alike: whole turns' arithmetic leaves 2.4e-16
const ALIKE_WITHIN = 1e-9;
// How far off its plane, in the frame's pixels, a stance may bring something while it still lies on it: arithmetic
// carrying a placement from one holder into another leaves under a millionth of a pixel
const ON_ITS_PLANE_WITHIN = 1e-6;

// A box's left or top edge, and its right edge or foot, in shares of it
const NEAR_EDGE = 0;
const FAR_EDGE = 1;
// The points of a box a film names, in shares of it across and down from its top left corner: its middle, and the
// middles of its edges
const POINTS_NAMED: Readonly<Record<AboutName, Point>> = {
	middle: MIDDLE_SHARE,
	top: { left: MIDDLE_SHARE.left, top: NEAR_EDGE },
	bottom: { left: MIDDLE_SHARE.left, top: FAR_EDGE },
	left: { left: NEAR_EDGE, top: MIDDLE_SHARE.top },
	right: { left: FAR_EDGE, top: MIDDLE_SHARE.top }
};

/** How something faces until a move leans it: face-on and upright. */
export const FACE_ON: Angle = { tilt: 0, turn: 0, roll: 0, over: 0 };

/**
 * How something stands until a move changes it: as large as its box, on its plane, face-on and upright, turning about
 * its middle.
 */
export const AS_PLACED: Stance = { scale: AS_LARGE, depth: ON_ITS_PLANE, angle: FACE_ON, about: MIDDLE_SHARE };

/** How large a film grows something: any number of times more than none. */
export const A_SCALE: Kind<number> = new Plain(isScale, 'a scale, more than 0, 1 as large as its place');

/** A point of a box a film turns something about, as it writes it: by its name, or in shares of the box. */
export const A_POINT_TURNED_ABOUT: Kind<AboutWritten> = new NameOrForm(
	new OneOf(ABOUT_NAMES, `one of ${ABOUT_NAMES.join(', ')}`),
	A_POINT,
	`a point of its box: ${ABOUT_NAMES.map((name) => JSON.stringify(name)).join(', ')}, or { left, top } in shares of the box`
);

/** The point of a box a film names to turn something about, in shares of the box. */
export function pointTurnedAbout(written: AboutWritten): Point {
	return typeof written === 'string' ? POINTS_NAMED[written] : written;
}

/**
 * A depth a move brings something to, in film pixels, and the move's value that names it, as a refusal says it:
 * "title.to's depth".
 */
export interface DepthNamed {
	readonly depth: number;
	readonly by: string;
}

/** The depth a move's value names, for the film's eye to be read for: none where the move names none. */
export function depthsNamed(by: string, depth: number | undefined): readonly DepthNamed[] {
	return depth === undefined ? [] : [{ depth, by }];
}

/**
 * The depth a film gives an object, a group or the window, from the film pixels it writes to the frame's own; as it
 * stands where the film gives none.
 */
export function depthAsked(depth: number | undefined, standing: number, frame: Size): number {
	return depth === undefined ? standing : depth * frameScaleOf(frame);
}

/**
 * The depths moves name, each refused where it brings something as near as the eye at rest or nearer, its focal length
 * from the frame, where it is never seen from there.
 */
export function assertNearerThanTheEye(named: readonly DepthNamed[], focalLength: number): void {
	const tooNear = named.find((depth) => depth.depth >= focalLength);
	if (tooNear === undefined) return;
	const restsAt = focalLength.toFixed(DIGITS_OF_A_DEPTH);
	throw new FilmError(
		`${tooNear.by} is ${String(tooNear.depth)}: it brings it as near as the eye at rest or nearer, ${restsAt} from the frame, where it is never seen; bring it less near`
	);
}

/**
 * The matrix of a stance about the middle of its box, a box of this size, before any eye sees it: grown, turned to its
 * angle, then moved as far as `middleMovedBy` moves its middle.
 */
export function stanceMatrix(stance: Stance, box: Size): Matrix {
	return chained([translation(middleMovedBy(stance, box)), angledAs(stance.angle), scaling(stance.scale)]);
}

/**
 * The matrix that takes a spot where a stance carried it back to where it stood about its box's middle: moved back as
 * far as its middle moved, turned back from its angle, then shrunk back from its scale, `stanceMatrix` undone.
 */
export function stanceMatrixBack(stance: Stance, box: Size): Matrix {
	return chained([
		scaling(AS_LARGE / stance.scale),
		angledBack(stance.angle),
		translation(wayBetween(middleMovedBy(stance, box), ITS_MIDDLE))
	]);
}

/**
 * How far a stance moves the middle of its box, a box of this size: out toward the eye by its depth, and, turned about
 * another point of the box, round that point, which stands as far from the middle as the box is grown, so that point
 * stays where it stood as the angle turns. None but the depth about the middle.
 */
export function middleMovedBy(stance: Stance, box: Size): Spot {
	const about = {
		across: (stance.about.left - MIDDLE_SHARE.left) * box.width * stance.scale,
		down: (stance.about.top - MIDDLE_SHARE.top) * box.height * stance.scale,
		out: ON_ITS_PLANE
	};
	const round = wayBetween(carried(angledAs(stance.angle), about), about);
	return { ...round, out: stance.depth + round.out };
}

/**
 * The matrix that carries a spot of what faces as an angle, on its own plane, to that angle: turned over round its
 * own width, rolled in its plane, swung about its middle by its turn, then leant back by its tilt, as CSS's
 * `rotateX() rotateY() rotateZ() rotateX()` would; so it turns over round its width as it stands rolled and swung.
 */
export function angledAs(angle: Angle): Matrix {
	return chained([rotationX(angle.tilt), rotationY(angle.turn), rotationZ(angle.roll), rotationX(angle.over)]);
}

/** The matrix that takes a spot of the room back from an angle to the plane's own: `angledAs` undone. */
export function angledBack(angle: Angle): Matrix {
	return chained([rotationX(-angle.over), rotationZ(-angle.roll), rotationY(-angle.turn), rotationX(-angle.tilt)]);
}

/** An angle `progress` of the way to another. */
export function angleToward(start: Angle, end: Angle, progress: number): Angle {
	return {
		tilt: between(start.tilt, end.tilt, progress),
		turn: between(start.turn, end.turn, progress),
		roll: between(start.roll, end.roll, progress),
		over: between(start.over, end.over, progress)
	};
}

/**
 * The side the stage draws of something its placing carries about its middle in what it is laid in, seen from the eye:
 * its back where the placing shows it mirrored.
 */
export function faceOf(placing: Matrix): Face {
	return showsItsFront(placing) ? 'front' : 'back';
}

/**
 * How the stage draws something its placing carries about its middle: flat where how it stands before the eye,
 * `stood`, leaves it facing the frame and it stands before the eye, in 3D where it leans or stands behind the eye,
 * where the browser cuts away what the eye cannot see, and a flat matrix would draw it whole, turned over.
 */
export function transformOf(stood: Matrix, placing: Matrix): Transform {
	const flat = facesTheFrame(stood) && placing.m44 > BEHIND_THE_EYE;
	return flat ? { kind: 'flat', matrix: flatOf(placing) } : { kind: 'leant', matrix: placing };
}

/**
 * The angle facing the frame nearest to one, upright: each of its tilt, turn, roll and turn over at its nearest whole
 * turn, so something spun round a whole turn goes back without spinning back.
 */
export function faceOnNearest(angle: Angle): Angle {
	return angleNearest(FACE_ON, angle);
}

/** An angle each of whose values is moved by whole turns to stand nearest that value of another angle. */
function angleNearest(angle: Angle, stood: Angle): Angle {
	return {
		tilt: turnNearest(angle.tilt, stood.tilt),
		turn: turnNearest(angle.turn, stood.turn),
		roll: turnNearest(angle.roll, stood.roll),
		over: turnNearest(angle.over, stood.over)
	};
}

/** So many degrees moved by whole turns to stand nearest so many others. */
function turnNearest(degrees: number, stood: number): number {
	return degrees + Math.round((stood - degrees) / DEGREES_IN_A_TURN) * DEGREES_IN_A_TURN;
}

/**
 * How a matrix stands what it carries about the middle of a box of this size, as a stance does (`stanceMatrix`),
 * wherever it carries that middle across and down: as large as it draws a step across, facing as it turns the plane's
 * across and down, with no turn over, each value of the angle at its nearest whole turn to that value of the angle it
 * stood at, so what is carried on from there spins no whole turn back; turned about the point it stood turned about,
 * and as far out as it carries the middle, less how far turning about that point moves it out. None where the matrix
 * draws a step across and one down unlike in length or off square, stretching what it carries, as no stance does.
 */
export function stanceCarriedBy(matrix: Matrix, stood: Stance, box: Size): Stance | null {
	const ways = waysAlongItsPlane(matrix);
	const scale = lengthOf(ways.across);
	if (!growsAlike(ways, scale)) return null;
	const across = unitOf(ways.across);
	const down = unitOf(ways.down);
	const turn = threesMatrixOf(turnTo(across, down, crossOf(across, down)));
	const turned = new Euler().setFromRotationMatrix(turn, TILT_TURN_ROLL);
	const angle = {
		tilt: MathUtils.radToDeg(turned.x),
		turn: MathUtils.radToDeg(turned.y),
		roll: MathUtils.radToDeg(turned.z),
		over: NO_TURN_OVER
	};
	const turning = { scale, depth: ON_ITS_PLANE, angle: angleNearest(angle, stood.angle), about: stood.about };
	return { ...turning, depth: carried(matrix, ITS_MIDDLE).out - middleMovedBy(turning, box).out };
}

/**
 * Whether an angle leaves what faces so facing the frame with its front, upright, as it stood: by whole turns alone,
 * so it turns nothing about any point.
 */
export function isFrontOn(angle: Angle): boolean {
	const angled = angledAs(angle);
	return facesTheFrame(angled) && showsItsFront(angled) && keepsItsAcross(angled);
}

/**
 * Whether a matrix draws a step across its plane and one down it alike in length and square, the step across so long.
 */
function growsAlike(ways: PlanesWays, acrossLength: number): boolean {
	const alikeInLength = Math.abs(lengthOf(ways.down) - acrossLength) <= ALIKE_WITHIN * acrossLength;
	const square = Math.abs(dotOf(ways.across, ways.down)) <= ALIKE_WITHIN * acrossLength * lengthOf(ways.down);
	return alikeInLength && square;
}

/**
 * Whether a stance lays something on the plane it stands on, facing it with its front and at no depth but what
 * arithmetic leaves: grown or rolled in it, it may be.
 */
export function liesOnItsPlane(stance: Stance): boolean {
	const angled = angledAs(stance.angle);
	return facesTheFrame(angled) && showsItsFront(angled) && Math.abs(stance.depth) <= ON_ITS_PLANE_WITHIN;
}

function isScale(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE;
}
