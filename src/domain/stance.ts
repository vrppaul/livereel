/**
 * How something stands about its box's middle — how large, how far out toward the eye, which way it faces — and how the
 * stage draws it so: one matrix (`src/domain/matrix.ts`), which the stage draws with and the engine reads where the
 * thing stands on the frame, so a film turns, rolls, grows or brings near anything that stands so by its values alone,
 * with no move of its own for each. An object stands so (`src/props/object.ts`); the window, which leans and never
 * grows, has an angle alone (`src/domain/camera.ts`), and is drawn by the matrix of its lean as flat or leant alike
 * (`src/props/window.ts`).
 *
 * The stage is handed a flat 2D matrix where the thing faces the frame, at any size, depth or roll, and a 3D one only
 * where it leans: a 3D transform, of no angle too, costs the graphics card a layer in every exposure of a frame, and a
 * frame of 16 exposures then outran the card's memory the stage asks for, and drew objects in some of them not at
 * all, with no error (README film, `--renderer gpu`, 2026-10-30). Which side of an object faces the eye is read off
 * the matrix, so the stage draws the back of one that has turned away, never what it shows mirrored; the window has no
 * back of its own, and turned half round shows the page mirrored.
 */
import { type Angle, FACE_ON, angleToward, angledAs } from './camera.ts';
import { FilmError } from './errors.ts';
import { A_NUMBER, type Kind, Plain } from './handed.ts';
import {
	type FlatMatrix,
	type Matrix,
	chained,
	facesTheFrame,
	flatOf,
	rotationZ,
	scaling,
	showsItsFront,
	translation
} from './matrix.ts';
import { between } from './time.ts';

/** How something faces: leant back and swung as the window is, and rolled clockwise in its own plane, `roll`. */
export interface Orientation extends Angle {
	readonly roll: number;
}

/**
 * How something stands about its box's middle: `scale` times as large, `depth` out toward the eye in the frame's
 * pixels, facing as `angle`.
 */
export interface Stance {
	readonly scale: number;
	readonly depth: number;
	readonly angle: Orientation;
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
type Face = 'front' | 'back';

/** Something as the stage draws it about its middle: its transform, and the side of it the eye sees. */
export interface DrawnStance {
	readonly transform: Transform;
	readonly face: Face;
}

// As large as its box
const AS_LARGE = 1;
// On the frame's plane, or the window's
const ON_ITS_PLANE = 0;
// Rolled none
const UPRIGHT = 0;
// Moved neither across nor down: something grows, turns and comes near about its own middle
const UNMOVED = 0;
// A scale of none draws nothing, and one less draws it upside down, a half roll
const NONE = 0;
const DEGREES_IN_A_TURN = 360;
// How far before the eye something's middle is seen from, `m44` of its matrix, where it stands at the eye or behind it
const BEHIND_THE_EYE = 0;
// A refusal says how far the eye stands from the frame to a tenth of a pixel: 2540.5 at 24°
const DIGITS_OF_A_DEPTH = 1;

/** How something stands until a move changes it: as large as its box, on its plane, face-on and upright. */
export const AS_PLACED: Stance = { scale: AS_LARGE, depth: ON_ITS_PLANE, angle: { ...FACE_ON, roll: UPRIGHT } };

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
 * The matrix of a stance about the middle of its box, before any eye sees it: grown, rolled, turned and leant, then
 * brought out toward the eye.
 */
export function stanceMatrix(stance: Stance): Matrix {
	return chained([
		translation({ across: UNMOVED, down: UNMOVED, out: stance.depth }),
		angledAs(stance.angle),
		rotationZ(stance.angle.roll),
		scaling(stance.scale)
	]);
}

/**
 * Something as the stage draws it, carried about its middle by its placing — how it stands, seen from the eye where it
 * stands on the frame —: its transform, and the side of it the eye sees.
 */
export function drawnStance(stood: Matrix, placing: Matrix): DrawnStance {
	return { transform: transformOf(stood, placing), face: showsItsFront(placing) ? 'front' : 'back' };
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
 * The orientation facing the frame nearest to one, upright: each of its tilt, turn and roll at its nearest whole turn,
 * so something spun round a whole turn goes back without spinning back.
 */
export function faceOnNearest(angle: Orientation): Orientation {
	return { tilt: nearestWholeTurn(angle.tilt), turn: nearestWholeTurn(angle.turn), roll: nearestWholeTurn(angle.roll) };
}

/** An orientation `progress` of the way to another. */
export function orientationToward(start: Orientation, end: Orientation, progress: number): Orientation {
	return { ...angleToward(start, end, progress), roll: between(start.roll, end.roll, progress) };
}

function nearestWholeTurn(degrees: number): number {
	return Math.round(degrees / DEGREES_IN_A_TURN) * DEGREES_IN_A_TURN;
}

function isScale(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE;
}
