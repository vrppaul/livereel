/**
 * How a frame is exposed: at once, or, where the camera crosses it fast, as several exposures along the camera's way
 * there, blended into one.
 *
 * A frame shot at once shows a moving camera's view sharp, so a fast move jumps from frame to frame. A film camera's
 * shutter is open for part of the frame's time, and what moves while it is open smears across the frame. A film says
 * how much of the camera's way from the frame before its shutter is open for, and how many exposures a frame the
 * camera crosses fast is made of: each is taken at the end of one of so many even shares of that much of the way, the
 * last at the frame's own pose. A frame the camera crosses slowly shows no jump to the eye, and is exposed once.
 * The way between two frames is a thirtieth of a second, short enough to be taken as straight. How fast is fast is
 * a share of the frame's diagonal, so a move is blurred alike in every format, each watched at the size of the
 * viewer's screen.
 */
import { type Pose, frameShift, poseToward } from './camera.ts';
import { type Format, diagonalOf } from './geometry.ts';

/**
 * How a fast camera is blurred: how much of its way from the frame before the shutter is open for, a share of it (a
 * film camera's is open for half), and how many exposures a frame it crosses fast is made of; the more, the smoother
 * the smear and the longer the shoot. What a film may give is `src/direction/blur.ts`'s to say.
 */
export interface MotionBlur {
	readonly shutter: number;
	readonly exposures: number;
}

// How far the screen may move on the frame from the frame before, as a share of the frame's diagonal, before a frame
// shot at once jumps to the eye: 6 pixels of a 1920 × 1080 frame's 2203, a guess the owner's eye is yet to measure
const FAST = 0.0027;

/**
 * The poses a frame is exposed at besides its own, the camera's pose on the frame before given: along the share of
 * its way the shutter is open for where it crossed the frame fast, so many that with its own they are the blur's
 * exposures; none where it crossed slowly, or where the film is not blurred.
 */
export function alsoExposedAt(before: Pose, now: Pose, format: Format, blur: MotionBlur | null): readonly Pose[] {
	if (blur === null || frameShift(before, now, format) <= FAST * diagonalOf(format.frame)) return [];
	return [...Array(blur.exposures - 1).keys()].map((place) =>
		poseToward(now, before, (blur.shutter * (blur.exposures - 1 - place)) / blur.exposures)
	);
}
