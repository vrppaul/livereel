/**
 * How something stands about its box's middle — how large, how far out toward the eye, which way it faces — and how the
 * stage draws it so: one matrix (`src/domain/matrix.ts`), which the stage draws with and the engine reads where the
 * thing stands on the frame, so a film turns, rolls, grows or brings near anything that stands so by its values alone,
 * with no move of its own for each. An object stands so (`src/props/object.ts`), and the page's window
 * (`src/props/window.ts`), drawn by the one matrix as flat or leant alike. A matrix is read back into a stance too
 * (`stanceCarriedBy`), where something carried into another holder stands there as it stood.
 *
 * The stage is handed a flat 2D matrix where the thing faces the frame, at any size, depth or roll, and a 3D one only
 * where it leans: a 3D transform, of no angle too, costs the graphics card a layer in every exposure of a frame, and a
 * frame of 16 exposures then outran the card's memory the stage asks for, and drew objects in some of them not at
 * all, with no error (README film, `--renderer gpu`, 2026-10-30). Which side of an object faces the eye is read off
 * the matrix, so the stage draws the back of one that has turned away, never what it shows mirrored; the window turned
 * half round shows the page mirrored, or a page of the film's own on its back (`Back` in `src/props/screen.ts`).
 */
import { Euler, MathUtils } from 'three';
import { FilmError } from './errors.ts';
import { type Size, frameScaleOf } from './geometry.ts';
import { A_NUMBER, type Kind, Plain } from './handed.ts';
import {
	type FlatMatrix,
	ITS_MIDDLE,
	type Matrix,
	type PlanesWays,
	carried,
	chained,
	crossOf,
	dotOf,
	facesTheFrame,
	flatOf,
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
 * pixels, facing as `angle`.
 */
export interface Stance {
	readonly scale: number;
	readonly depth: number;
	readonly angle: Angle;
}

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
// Moved neither across nor down: something grows, turns and comes near about its own middle
const UNMOVED = 0;
// A scale of none draws nothing, and one less draws it upside down, a half roll
const NONE = 0;
const DEGREES_IN_A_TURN = 360;
// How far before the eye something's middle is seen from, `m44` of its matrix, where it stands at the eye or behind it
const BEHIND_THE_EYE = 0;
// A refusal says how far the eye stands from the frame to a tenth of a pixel: 2540.5 at 24°
const DIGITS_OF_A_DEPTH = 1;
// The order three reads the turns of an angle with no turn over in: tilted, swung, then rolled, as `angledAs` chains them
const TILT_TURN_ROLL = 'XYZ';
const NO_TURN_OVER = 0;
// How far a step across and one down a matrix draws may stand unlike in length, for their length, or off square, as a
// share of their lengths' product, while it still grows what it carries alike: whole turns' arithmetic leaves 2.4e-16
const ALIKE_WITHIN = 1e-9;
// How far off its plane, in the frame's pixels, a stance may bring something while it still lies on it: arithmetic
// carrying a placement from one holder into another leaves under a millionth of a pixel
const ON_ITS_PLANE_WITHIN = 1e-6;

/** How something faces until a move leans it: face-on and upright. */
export const FACE_ON: Angle = { tilt: 0, turn: 0, roll: 0, over: 0 };

/** How something stands until a move changes it: as large as its box, on its plane, face-on and upright. */
export const AS_PLACED: Stance = { scale: AS_LARGE, depth: ON_ITS_PLANE, angle: FACE_ON };

/** How large a film grows something: any number of times more than none. */
export const A_SCALE: Kind<number> = new Plain(isScale, 'a scale, more than 0, 1 as large as its place');

/**
 * A depth a move brings something to, in pixels of a frame 1080 high, and the move's value that names it, as a
 * refusal says it: "title.to's depth".
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
 * The depth a film gives an object, a group or the window, in pixels of a frame 1080 high, as the frame's own pixels;
 * as it stands, where the film gives none.
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
 * The matrix of a stance about the middle of its box, before any eye sees it: grown, turned to its angle, then brought
 * out toward the eye.
 */
export function stanceMatrix(stance: Stance): Matrix {
	return chained([
		translation({ across: UNMOVED, down: UNMOVED, out: stance.depth }),
		angledAs(stance.angle),
		scaling(stance.scale)
	]);
}

/**
 * The matrix that takes a spot where a stance carried it back to where it stood about its box's middle: brought back
 * from its depth, turned back from its angle, then shrunk back from its scale, `stanceMatrix` undone.
 */
export function stanceMatrixBack(stance: Stance): Matrix {
	return chained([
		scaling(AS_LARGE / stance.scale),
		angledBack(stance.angle),
		translation({ across: UNMOVED, down: UNMOVED, out: -stance.depth })
	]);
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
 * How a matrix stands what it carries about its middle, as a stance does (`stanceMatrix`), wherever it carries that
 * middle across and down: as large as it draws a step across, as far out as it carries the middle, and facing as it
 * turns the plane's across and down, with no turn over, each value of the angle at its nearest whole turn to that value
 * of the angle it stood at, so what is carried on from there spins no whole turn back. None where the matrix draws a
 * step across and one down unlike in length or off square, stretching what it carries, as no stance does.
 */
export function stanceCarriedBy(matrix: Matrix, stood: Angle): Stance | null {
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
	return { scale, depth: carried(matrix, ITS_MIDDLE).out, angle: angleNearest(angle, stood) };
}

/** Whether a matrix draws a step across its plane and one down it alike in length and square, the step across so long. */
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
