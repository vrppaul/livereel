/**
 * How sharp the eye sees what stands before it. Open `aperture` wide and focused so far before it, the eye draws a point
 * that far sharp, and one nearer or farther as a disc `aperture × focal length × |1/focus − 1/distance|` across on a
 * frame 1080 high, whose plane stands the eye's focal length before it: a thin lens's circle of confusion, as After
 * Effects reckons its camera's depth of field, the aperture in pixels, so a longer lens blurs more. The disc is blurred
 * as a Gaussian of its own spread.
 *
 * The flat stage blurs what stands in the world by one number each — the page's window, with all that lies in it, and
 * each object in the world — as soft as its point nearest the focus: what the eye focuses on is drawn sharp wherever it
 * stands on its plane, and a plane that leans away is as sharp at its far edge as at its near. A plane's distance from
 * the eye goes evenly across it, so its corners bound how near and far it stands. The room blurs each pixel by how far
 * what it shows stands from the focus, by this law read off its own depth (`stage/lens.js`): it is handed how the eye
 * sees (`Sharpness`), and of the window only its softest point the frame shows, which bounds how far past the frame's
 * edge its blur gathers.
 * The window is blurred on the frame, round its cut, so out of focus on the ground it spreads past its edge, and the
 * page past the frame's edge blurs into the frame (probed 2026-11-03: a blur on the view itself, under its cut, kept the
 * window's edge hard). An object is blurred on its own element, which Chrome blurs before its matrix carries it, so its
 * number is handed in the object's own pixels, over how long the matrix draws it along its longest way at its middle: a
 * blur of 4 under a matrix that draws it twice as large spread 7.8 on the frame, flat or in 3D, software or the card. What
 * stands on the frame, or in a group on it, rides with the eye and stays sharp, as words laid over a film do.
 *
 * Where the eye focuses is placed as each frame is drawn (`Focus` in `src/domain/eye.ts`), at both ends of its way: a
 * spot of the frame, the world, the window or the page placed on that holder's plane as the window, the camera and the
 * eye stand then, as anything placed there is (`src/domain/placement.ts`), so a focus holds on what it was put on while
 * they move. A focus going from one to another goes evenly in the reciprocal of its distance, as a lens's ring turns,
 * so what it leaves softer softens evenly; it goes no farther than as far as can be, where a spot it was put on stands
 * behind the eye.
 */
import type { Camera } from './camera.ts';
import { type Placed, type Placement, fromItsMiddle, lastingPlaneOf, placed } from './placement.ts';
import { A_PINHOLE, type Focus } from './eye.ts';
import { type Box, type Point, type Size, boxOf, cornersOf, frameScaleOf, middleX, middleY } from './geometry.ts';
import {
	ITS_MIDDLE,
	type Matrix,
	type Spot,
	carried,
	longestScaleAtItsMiddle,
	nearnessOfItsPlane,
	seenFromOf,
	seenWithin
} from './matrix.ts';
import { AS_PLACED } from './stance.ts';
import { between } from './toward.ts';

/**
 * How the eye sees as a frame is drawn: how far before it it sees sharp, and its focal length, in pixels of a frame 1080
 * high, and how wide it is open.
 */
export interface Sharpness {
	readonly focusedAt: number;
	readonly focalLength: number;
	readonly aperture: number;
}

/**
 * How soft the eye draws each point of the frame a plane is seen at, in pixels of a frame 1080 high: at a point of the
 * frame, in its own pixels from its top left corner, the size of `atTheCorner + across × left + down × top`, held to
 * `farthest`. The number goes evenly across the frame, as how near the plane stands does: none where the plane stands
 * at the focus, less than none nearer, more farther, and `farthest` where it stands as far as can be, at its horizon.
 */
interface BlurAcrossTheFrame {
	readonly atTheCorner: number;
	readonly across: number;
	readonly down: number;
	readonly farthest: number;
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
// How many points of the frame show a plane that is not seen
const NONE_SEEN = 0;
// How wide and tall a box is that stands for a point
const NO_SIZE = 0;

/**
 * How the eye of a camera sees as a frame of this size is drawn: where it sees sharp, its focal length, and how wide it
 * is open.
 */
export function sharpnessOf(camera: Camera, frame: Size): Sharpness {
	return { focusedAt: focusedAt(camera, frame), focalLength: camera.eye.focalLength, aperture: camera.eye.aperture };
}

/**
 * How far before the eye of a camera a focus stands as a frame of this size is drawn, in pixels of a frame 1080 high:
 * none or less behind the eye.
 */
export function focusDistanceOf(focus: Focus, camera: Camera, frame: Size): number {
	switch (focus.kind) {
		case 'distance':
			return focus.distance;
		case 'spot': {
			const plane = lastingPlaneOf(focus.holder, camera, frame);
			return distanceOfItsMiddle(placed(placementAt(focus.point, focus.depth), plane, frame), frame);
		}
	}
}

/**
 * How far before the eye the middle of something placed stands along where the eye looks, on a frame of this size, in
 * pixels of a frame 1080 high: none or less at the eye or behind it. In the eye's own space it looks against `out`.
 */
export function distanceOfItsMiddle(standing: Placed, frame: Size): number {
	return -carried(standing.inTheEyesSpace, ITS_MIDDLE).out / frameScaleOf(frame);
}

/** A point of a plane, brought out of it toward the eye by a depth, as a placement there: a box of no size at it. */
function placementAt(point: Point, depth: number): Placement {
	return { box: { ...point, width: NO_SIZE, height: NO_SIZE }, ...AS_PLACED, depth };
}

/**
 * How soft the eye draws what a matrix carries about its middle, laid in a box of this size, on the frame, in pixels of
 * a frame 1080 high: the disc its point nearest the focus is drawn as, spread as a Gaussian. None where that spreads too
 * little to show, the eye is open none, or it all stands at the eye or behind it, where nothing of it is seen.
 */
export function outOfFocusOnTheFrame(placing: Matrix, laid: Size, sharpness: Sharpness, frame: Size): number | null {
	if (sharpness.aperture === A_PINHOLE) return null;
	const distance = distanceNearest(placing, laid, sharpness);
	if (distance <= AT_THE_EYE) return null;
	const disc = sharpness.aperture * sharpness.focalLength * Math.abs(1 / sharpness.focusedAt - 1 / distance);
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
 * How soft the eye draws the softest point the frame shows of what a matrix carries about the middle of a box on the
 * frame, what it shows standing in another box of its plane, in pixels of a frame 1080 high: a disc as wide as the eye
 * is open times how far apart the plane's nearness there and the focus's stand, as `aperture × focal length × |1/focus
 * − 1/distance|` is, spread as a Gaussian, softest at a corner of what the frame shows. None where the eye is open none,
 * sees the plane edge-on, the frame shows none of what it shows, or no point of it the frame shows spreads enough to
 * show.
 */
export function softestOutOfFocusSeen(
	placing: Matrix,
	laid: Box,
	shows: Box,
	sharpness: Sharpness,
	frame: Size
): number | null {
	if (sharpness.aperture === A_PINHOLE) return null;
	const nearness = nearnessOfItsPlane(placing);
	if (nearness === null) return null;
	const seen = seenWithin(placing, laid, shows, boxOf(frame));
	if (seen.length === NONE_SEEN) return null;
	const spread = sharpness.aperture / A_DISCS_WIDTH_IN_SPREADS;
	const nearnessInFocus = sharpness.focalLength / sharpness.focusedAt;
	const across = -spread * nearness.across;
	const down = -spread * nearness.down;
	const blur: BlurAcrossTheFrame = {
		atTheCorner: spread * (nearnessInFocus - nearness.atTheMiddle) - across * middleX(laid) - down * middleY(laid),
		across,
		down,
		farthest: spread * nearnessInFocus
	};
	// The blur goes evenly across what the frame shows but where it is held to its farthest, so it is softest at a
	// corner of it
	const softest = Math.max(...seen.map((point) => blurAt(blur, point)));
	return softest * frameScaleOf(frame) <= SHARP_WITHIN ? null : softest;
}

/** How soft the eye draws a point of the frame: the size of the blur's even number there, held to its farthest. */
function blurAt(blur: BlurAcrossTheFrame, point: Point): number {
	return Math.abs(Math.min(blur.atTheCorner + blur.across * point.left + blur.down * point.top, blur.farthest));
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
 * How far before the eye the point of what a matrix carries, laid in a box of this size about its middle, nearest where
 * it sees sharp stands: there where the plane reaches across it, else its nearer or farther corner's.
 */
function distanceNearest(placing: Matrix, laid: Size, sharpness: Sharpness): number {
	const corners = cornersOf({ left: ITS_CORNER, top: ITS_CORNER, width: laid.width, height: laid.height });
	const distances = corners.map((corner) => distanceAt(placing, fromItsMiddle(laid, corner), sharpness.focalLength));
	return Math.min(Math.max(sharpness.focusedAt, Math.min(...distances)), Math.max(...distances));
}

/**
 * How far before an eye of a focal length a spot of what a matrix carries stands, once carried to where the eye sees
 * it, in pixels of a frame 1080 high: the matrix sees from as far as the focal length at the frame's plane.
 */
function distanceAt(placing: Matrix, spot: Spot, focalLength: number): number {
	return seenFromOf(placing, spot) * focalLength;
}
