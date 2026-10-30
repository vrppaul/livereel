/**
 * How a frame is exposed: at once, or, where anything on it moves fast, as several exposures along the frame's time,
 * blended into one.
 *
 * A frame shot at once shows what moves sharp, so a fast move jumps from frame to frame. A film camera's shutter is
 * open for part of the frame's time, and what moves while it is open smears across the frame. A film says how much of
 * the time from the frame before its shutter is open for, and the smear is how far anything on the frame moves while
 * it is: the screen as the camera and its window carry it, or an object as it travels, slides or leans. An eye takes
 * copies no further apart than a step of its own as one smooth smear, so a frame is exposed as many times as keep its
 * copies that close, and never more than the film's most: each at the end of one of so many even shares of the
 * shutter's time, the last at the frame's own moment. A smear no longer than the eye's step looks no different from a
 * frame shot at once, so its frame is exposed once; where the shutter is open for less than the whole time, such a
 * frame may still jump further than a step, as a film camera's does. The eye's step is a share of the frame's
 * diagonal, so a move is blurred alike in every format, each watched at the size of the viewer's screen.
 */
import { type Size, diagonalOf } from './geometry.ts';

/**
 * How what moves fast is blurred: how much of the time from the frame before the shutter is open for, a share of it (a
 * film camera's is open for half), and how many exposures a frame is made of at most; the more, the smoother the
 * fastest smears and the longer the shoot. What a film may give is `src/direction/blur.ts`'s to say.
 */
export interface MotionBlur {
	readonly shutter: number;
	readonly exposuresAtMost: number;
}

// How far apart an eye takes two copies on the frame as one smooth move, a share of the frame's diagonal: 6 pixels of
// a 1920 × 1080 frame's 2203, a guess the owner's eye is yet to measure
export const EYE_STEP = 0.0027;
// A frame always has its own exposure, the last
const ITS_OWN = 1;

/**
 * The moments a frame is exposed at besides its own, the smear on a frame of this size while its shutter is open
 * given: each so far back from the frame's own moment, a share of the time from the frame before, at the ends of even
 * shares of the shutter's time, as many as keep the copies an eye's step apart, up to the blur's most; none where the
 * smear is no longer than a step.
 */
export function alsoExposedBack(smear: number, frame: Size, blur: MotionBlur): readonly number[] {
	const exposures = exposuresFor(smear, frame, blur);
	return [...Array(exposures - ITS_OWN).keys()].map(
		(place) => (blur.shutter * (exposures - ITS_OWN - place)) / exposures
	);
}

/** How many exposures a frame is made of at most: the blur's most, or its own alone where the film is not blurred. */
export function mostExposuresOf(blur: MotionBlur | null): number {
	return blur === null ? ITS_OWN : blur.exposuresAtMost;
}

/**
 * How many exposures a smear so long takes: as many as keep its copies an eye's step apart, at most the blur's, and
 * the frame's own at least, where nothing moved.
 */
function exposuresFor(smear: number, frame: Size, blur: MotionBlur): number {
	const keepingCopiesAStepApart = Math.ceil(smear / (EYE_STEP * diagonalOf(frame)));
	return Math.max(ITS_OWN, Math.min(blur.exposuresAtMost, keepingCopiesAStepApart));
}
