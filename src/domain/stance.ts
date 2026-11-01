/**
 * How something stands about its box's middle — how large, how far out toward the eye, which way it faces — and how the
 * stage draws it so: one matrix (`src/domain/matrix.ts`), which the stage draws with and the engine reads where the
 * thing stands on the frame, so a film turns, rolls, grows or brings near anything that stands so by its values alone,
 * with no move of its own for each. An object stands so (`src/props/object.ts`); the window, which leans and never
 * grows, has an angle alone (`src/domain/camera.ts`).
 *
 * The stage is handed a flat 2D matrix where the thing faces the frame, at any size, depth or roll, and a 3D one only
 * where it leans: a 3D transform, of no angle too, costs the graphics card a layer in every exposure of a frame, and a
 * frame of 16 exposures then outran the card's memory the stage asks for, and drew objects in some of them not at
 * all, with no error (README film, `--renderer gpu`, 2026-10-30). Which side faces the eye is read off the matrix,
 * so the stage draws the back of what has turned away, never what it shows mirrored.
 */
import { type Angle, EYE_DISTANCE, FACE_ON, angleToward, angledAs, isFaceOn } from './camera.ts';
import { A_NUMBER, type Kind, Plain } from './handed.ts';
import {
	type FlatMatrix,
	type Matrix,
	chained,
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

/** How something stands until a move changes it: as large as its box, on its plane, face-on and upright. */
export const AS_PLACED: Stance = { scale: AS_LARGE, depth: ON_ITS_PLANE, angle: { ...FACE_ON, roll: UPRIGHT } };

/** How large a film grows something: any number of times more than none. */
export const A_SCALE: Kind<number> = new Plain(isScale, 'a scale, more than 0, 1 as large as its place');

/**
 * How far a film brings something toward the eye, in pixels of a frame 1080 high, the frame's own once shot: nearer
 * than the eye, as nothing past it is seen. Less than none takes it away.
 */
export const A_DEPTH: Kind<number> = new Plain(
	isNearerThanTheEye,
	`a number of pixels of a frame 1080 high toward the eye, less than the eye's ${EYE_DISTANCE}`
);

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
 * Something as the stage draws it, carried about its middle by its placing — its stance, seen from the eye where it
 * stands on the frame — flat where its angle leaves it facing the frame, at any size, depth or roll.
 */
export function drawnStance(angle: Angle, placing: Matrix): DrawnStance {
	const transform: Transform = isFaceOn(angle)
		? { kind: 'flat', matrix: flatOf(placing) }
		: { kind: 'leant', matrix: placing };
	return { transform, face: showsItsFront(placing) ? 'front' : 'back' };
}

/** An orientation `progress` of the way to another. */
export function orientationToward(start: Orientation, end: Orientation, progress: number): Orientation {
	return { ...angleToward(start, end, progress), roll: between(start.roll, end.roll, progress) };
}

function isScale(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE;
}

function isNearerThanTheEye(written: unknown): written is number {
	return A_NUMBER.is(written) && written < EYE_DISTANCE;
}
