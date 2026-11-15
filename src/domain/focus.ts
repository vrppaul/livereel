/**
 * How sharp the eye sees what stands before it, as a thin lens does: open `aperture` film pixels and focused so far
 * before it, it draws a point at a distance as a disc `aperture × focal length × |1/focus − 1/distance|` film pixels
 * across, blurred as a Gaussian whose deviation is a quarter of that. The aperture is in pixels, as After Effects takes
 * it, so a longer lens blurs more.
 *
 * The flat stage blurs each plane in the world, the window with all in it and each object, by one number: as soft as
 * its point nearest the focus, so what the eye focuses on stays sharp across its plane. The room blurs each pixel by
 * its own depth (`stage/lens.js`) and is handed the law itself (`LensLaw`). Chrome blurs an object's element before its
 * matrix grows it, so the number is divided by how far the matrix stretches it. What rides with the eye on the frame
 * stays sharp.
 *
 * A focus is placed anew on each frame (`Focus` in `src/domain/eye.ts`), so it holds on what it was put on while the
 * window, the camera and the eye move. From one focus to the next it goes evenly in the reciprocal of the distance, as
 * a lens's ring turns, so what it leaves softens evenly.
 */
import { type Camera, underTheFrame } from './camera.ts';
import {
	ON_ITS_PLANE,
	ON_THE_PAGE,
	type Placed,
	type Placement,
	fromItsMiddle,
	lastingPlaneOf,
	placed
} from './placement.ts';
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
 * How the eye sees as a frame is drawn: how far before it it sees sharp, and its focal length, in film pixels, and how
 * wide it is open.
 */
export interface Sharpness {
	readonly focusedAt: number;
	readonly focalLength: number;
	readonly aperture: number;
}

/**
 * The eye's lens as the room's lens reads it off each pixel's depth: a point whose nearness, one over how far before
 * the eye it stands in film pixels, is `nearness` spreads `perNearness × |inFocus − nearness|` film pixels, as a
 * Gaussian's deviation, and stands nearer than the focus where its nearness passes `inFocus`.
 */
export interface LensLaw {
	readonly perNearness: number;
	readonly inFocus: number;
}

/**
 * How soft the eye draws each point of the frame a plane is seen at, in film pixels: at a point of the frame, in its
 * own pixels from its top left corner, the size of `atTheCorner + across × left + down × top`, held to `farthest`. The
 * number goes evenly across the frame, as how near the plane stands does: none where the plane stands at the focus,
 * less than none nearer, more farther, and `farthest` where it stands as far as can be, at its horizon.
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
// stage draws a frame at twice its pixels at most; a filter of any blur redraws text apart from none, so what spreads
// less is handed as sharp, with no filter at all
const SHARP_WITHIN = 0.1;
// The reciprocal of a focus's distance as far as can be: a focus goes no farther
const AS_FAR_AS_CAN_BE = 0;
// How far a focus stands under a point of the frame where the eye sees past the window's plane there: as far as can
// be, where the point the sight meets the plane at runs off to as the plane turns to lie along the sight
const ENDLESSLY_FAR = Number.POSITIVE_INFINITY;
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
 * How far before the eye of a camera a focus stands as a frame of this size is drawn, in film pixels: none or less
 * behind the eye. A focus under a point of the frame stands where a focus on the point of the page the frame shows
 * there does, and as far as can be where the eye sees past the window's plane there.
 */
export function focusDistanceOf(focus: Focus, camera: Camera, frame: Size): number {
	switch (focus.kind) {
		case 'distance':
			return focus.distance;
		case 'spot': {
			const plane = lastingPlaneOf(focus.holder, camera, frame);
			return distanceOfItsMiddle(placed(placementAt(focus.point, focus.depth), plane, frame), frame);
		}
		case 'under': {
			const onThePage = underTheFrame(camera, frame, focus.point);
			if (onThePage === null) return ENDLESSLY_FAR;
			return focusDistanceOf(
				{ kind: 'spot', holder: ON_THE_PAGE, point: onThePage, depth: ON_ITS_PLANE },
				camera,
				frame
			);
		}
	}
}

/**
 * How far before the eye the middle of something placed stands along where the eye looks, on a frame of this size, in
 * film pixels: none or less at the eye or behind it. In the eye's own space it looks against `out`.
 */
export function distanceOfItsMiddle(standing: Placed, frame: Size): number {
	return -carried(standing.inTheEyesSpace, ITS_MIDDLE).out / frameScaleOf(frame);
}

/** A point of a plane, brought out of it toward the eye by a depth, as a placement there: a box of no size at it. */
function placementAt(point: Point, depth: number): Placement {
	return { box: { ...point, width: NO_SIZE, height: NO_SIZE }, ...AS_PLACED, depth };
}

/**
 * How soft the eye draws what a matrix carries about its middle, laid in a box of this size, on the frame, in film
 * pixels: the disc its point nearest the focus is drawn as, spread as a Gaussian. None where that spreads too little to
 * show, the eye is open none, or it all stands at the eye or behind it, where nothing of it is seen.
 */
export function outOfFocusOnTheFrame(placing: Matrix, laid: Size, sharpness: Sharpness, frame: Size): number | null {
	if (sharpness.aperture === A_PINHOLE) return null;
	const distance = distanceNearest(placing, laid, sharpness);
	if (distance <= AT_THE_EYE) return null;
	const spread = outOfFocusAt(sharpness, distance);
	return spread * frameScaleOf(frame) <= SHARP_WITHIN ? null : spread;
}

/**
 * How soft the eye draws a point so far before it, in film pixels: the disc it is drawn as, spread as a Gaussian.
 */
export function outOfFocusAt(sharpness: Sharpness, distance: number): number {
	const law = lawOf(sharpness);
	return law.perNearness * Math.abs(law.inFocus - 1 / distance);
}

/**
 * The eye's lens as the room's lens reads it, of an eye that sees so: none where it is open none and draws all sharp.
 */
export function lensLawOf(sharpness: Sharpness): LensLaw | null {
	return sharpness.aperture === A_PINHOLE ? null : lawOf(sharpness);
}

/**
 * The law an eye that sees so spreads a point by: a disc `aperture × focal length × |1/focus − 1/distance|` across,
 * spread as a Gaussian of a quarter of that.
 */
function lawOf(sharpness: Sharpness): LensLaw {
	return {
		perNearness: (sharpness.aperture * sharpness.focalLength) / A_DISCS_WIDTH_IN_SPREADS,
		inFocus: 1 / sharpness.focusedAt
	};
}

/**
 * How soft the eye draws what a matrix carries about its middle, laid in a box of this size, in film pixels of that box
 * before the matrix: as soft as on the frame, over how long the matrix draws it at its middle along its longest way, so
 * a plane turned toward edge-on is as soft along the side the eye still sees whole.
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
 * frame, what it shows standing in another box of its plane, in film pixels: a disc as wide as the eye is open times
 * how far apart the plane's nearness there and the focus's stand, as `aperture × focal length × |1/focus − 1/distance|`
 * is, spread as a Gaussian, softest at a corner of what the frame shows. None where the eye is open none, sees the
 * plane edge-on, the frame shows none of what it shows, or no point of it the frame shows spreads enough to show.
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
 * How far before the eye of a camera it sees sharp as a frame of this size is drawn, in film pixels: on its way from
 * where it focused to where it focuses, each placed now, evenly in the reciprocal, and as far as can be at most.
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
 * it, in film pixels: the matrix sees from as far as the focal length at the frame's plane.
 */
function distanceAt(placing: Matrix, spot: Spot, focalLength: number): number {
	return seenFromOf(placing, spot) * focalLength;
}
