/**
 * How sharp the eye sees what stands before it. Open `aperture` wide and focused so far before it, the eye draws a point
 * that far sharp, and one nearer or farther as a disc `aperture × EYE_DISTANCE × |1/focus − 1/distance|` across on a
 * frame 1080 high, whose plane stands `EYE_DISTANCE` before it: a thin lens's circle of confusion, as After Effects
 * reckons its camera's depth of field, the aperture in pixels. The disc is blurred as a Gaussian of its own spread.
 *
 * The flat stage blurs what stands in the world by one number each — the page's window, with all that lies in it, and
 * each object in the world — as soft as its point nearest the focus: what the eye focuses on is drawn sharp wherever it
 * stands on its plane, and a plane that leans away is as sharp at its far edge as at its near; the room will blur each
 * point of it. A plane's distance from the eye goes evenly across it, so its corners bound how near and far it stands.
 * The window is blurred on the frame, round its cut, so out of focus on the ground it spreads past its edge, and the
 * page past the frame's edge blurs into the frame (probed 2026-11-03: a blur on the view itself, under its cut, kept the
 * window's edge hard). An object is blurred on its own element, which Chrome blurs before its matrix carries it, so its
 * number is handed in the object's own pixels, over how long the matrix draws it along its longest way at its middle: a
 * blur of 4 under a matrix that draws it twice as large spread 7.8 on the frame, flat or in 3D, software or the card. What
 * stands on the frame, or in a group on it, rides with the eye and stays sharp, as words laid over a film do.
 *
 * Where the eye focuses is placed as each frame is drawn (`Focus` in `src/domain/eye.ts`), at both ends of its way: a
 * spot of the world from where the eye stands then, a point of the window or of the page as the window, the camera and
 * the eye stand, so a focus holds on what it was put on while they move. A focus going from one to another goes evenly
 * in the reciprocal of its distance, as a lens's ring turns, so what it leaves softer softens evenly; it goes no farther
 * than as far as can be, where a spot it was put on stands behind the eye.
 */
import { type Camera, fromItsMiddle, leaningOnTheFrame, pointInTheView } from './camera.ts';
import { A_PINHOLE, EYE_DISTANCE, type Focus, distanceBefore } from './eye.ts';
import { type Point, type Size, cornersOf, frameScaleOf } from './geometry.ts';
import { ITS_MIDDLE, type Matrix, type Spot, longestScaleAtItsMiddle, seenFromOf } from './matrix.ts';
import { between } from './time.ts';

/**
 * How the eye sees as a frame is drawn: how far before it it sees sharp, in pixels of a frame 1080 high, and how wide it
 * is open.
 */
export interface Sharpness {
	readonly focusedAt: number;
	readonly aperture: number;
}

/** How far before the eye stands what stands at it, or behind it at none or less. */
export const AT_THE_EYE = 0;
// A disc's spread along each axis, which a Gaussian blurs as its deviation, is a quarter of the disc's width
const A_DISCS_WIDTH_IN_SPREADS = 4;
// How far a blur may spread, in the frame's own pixels, and be handed as none: a filter spreading 0.2 of a device pixel
// or less drew the same to the byte as one of 1e-12, software and on the card, where 0.3 did not on the card, and the
// stage draws a frame at twice its pixels at most; a filter of any blur redraws text apart from none, SSIM 0.994
// (probed 2026-11-03), so what spreads less is handed as sharp, with no filter at all
const SHARP_WITHIN = 0.1;
// The reciprocal of a focus's distance as far as can be: a focus goes no farther
const AS_FAR_AS_CAN_BE = 0;
// A box's top left corner, in its own pixels
const ITS_CORNER = 0;

/** How the eye of a camera sees as a frame of this size is drawn: where it sees sharp, and how wide it is open. */
export function sharpnessOf(camera: Camera, frame: Size): Sharpness {
	return { focusedAt: focusedAt(camera, frame), aperture: camera.eye.aperture };
}

/**
 * How far before the eye of a camera a focus stands as a frame of this size is drawn, in pixels of a frame 1080 high:
 * none or less behind the eye.
 */
export function focusDistanceOf(focus: Focus, camera: Camera, frame: Size): number {
	switch (focus.kind) {
		case 'distance':
			return focus.distance;
		case 'world':
			return distanceBefore(camera.eye, focus.spot);
		case 'window':
			return distanceOnTheWindow(camera, frame, focus.point);
		case 'page':
			return distanceOnTheWindow(camera, frame, pointInTheView(camera, frame, focus.point));
	}
}

/**
 * How far before the eye the middle of what a matrix carries about its middle, to where the eye sees it, stands along
 * where the eye looks, in pixels of a frame 1080 high: none or less at the eye or behind it.
 */
export function distanceOfItsMiddle(placing: Matrix): number {
	return distanceAt(placing, ITS_MIDDLE);
}

/**
 * How soft the eye draws what a matrix carries about its middle, laid in a box of this size, on the frame, in pixels of
 * a frame 1080 high: the disc its point nearest the focus is drawn as, spread as a Gaussian. None where that spreads too
 * little to show, the eye is open none, or it all stands at the eye or behind it, where nothing of it is seen.
 */
export function outOfFocusOnTheFrame(placing: Matrix, laid: Size, sharpness: Sharpness, frame: Size): number | null {
	if (sharpness.aperture === A_PINHOLE) return null;
	const distance = distanceNearest(placing, laid, sharpness.focusedAt);
	if (distance <= AT_THE_EYE) return null;
	const disc = sharpness.aperture * EYE_DISTANCE * Math.abs(1 / sharpness.focusedAt - 1 / distance);
	const spread = disc / A_DISCS_WIDTH_IN_SPREADS;
	return spread * frameScaleOf(frame) <= SHARP_WITHIN ? null : spread;
}

/**
 * How soft the eye draws what a matrix carries about its middle, laid in a box of this size, in pixels of a frame 1080
 * high of that box before the matrix: as soft as on the frame, over how long the matrix draws it at its middle along its
 * longest way, so a plane turned toward edge-on is as soft along the side the eye still sees whole.
 */
export function outOfFocusBeforeItsMatrix(
	placing: Matrix,
	laid: Size,
	sharpness: Sharpness,
	frame: Size
): number | null {
	const onTheFrame = outOfFocusOnTheFrame(placing, laid, sharpness, frame);
	return onTheFrame === null ? null : onTheFrame / longestScaleAtItsMiddle(placing);
}

/**
 * How far before the eye of a camera it sees sharp as a frame of this size is drawn, in pixels of a frame 1080 high: on
 * its way from where it focused to where it focuses, each placed now, evenly in the reciprocal, and as far as can be at
 * most.
 */
function focusedAt(camera: Camera, frame: Size): number {
	const focusing = camera.eye.focusing;
	const reciprocal = between(
		1 / focusDistanceOf(focusing.from, camera, frame),
		1 / focusDistanceOf(focusing.to, camera, frame),
		focusing.progress
	);
	return 1 / Math.max(reciprocal, AS_FAR_AS_CAN_BE);
}

/**
 * How far before the eye the point of what a matrix carries, laid in a box of this size about its middle, nearest a
 * distance stands: that distance where the plane reaches across it, else its nearer or farther corner's.
 */
function distanceNearest(placing: Matrix, laid: Size, distance: number): number {
	const corners = cornersOf({ left: ITS_CORNER, top: ITS_CORNER, width: laid.width, height: laid.height });
	const distances = corners.map((corner) => distanceAt(placing, fromItsMiddle(laid, corner)));
	return Math.min(Math.max(distance, Math.min(...distances)), Math.max(...distances));
}

/** How far before the eye a point of the page's window stands, in its box's pixels, as the window leans and is seen. */
function distanceOnTheWindow(camera: Camera, frame: Size, point: Point): number {
	return distanceAt(leaningOnTheFrame(camera.view, camera.eye, frame), fromItsMiddle(camera.view.box, point));
}

/**
 * How far before the eye a spot of what a matrix carries stands, once carried to where the eye sees it, in pixels of a
 * frame 1080 high: the matrix sees from the eye's distance at the frame's plane.
 */
function distanceAt(placing: Matrix, spot: Spot): number {
	return seenFromOf(placing, spot) * EYE_DISTANCE;
}
