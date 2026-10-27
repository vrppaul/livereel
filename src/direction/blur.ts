/**
 * How a film's fast camera is blurred, as its author writes it: left out for livereel's blur, turned off, or livereel's
 * blur with any of its values the film gives in their place.
 *
 * livereel opens the shutter for the camera's whole way from the frame before: a film camera's half smears too faintly
 * for the eye to see in a film of a page. A shutter open for more than that way is refused, as the camera's way before
 * the frame before is not known; so is a blur of fewer than two exposures at most, which is the frame alone.
 */
import { FilmError } from '../domain/errors.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import { described, isObjectOfValues, refuseNamesBeyond } from '../domain/handed.ts';
import { type TurnedOff, turnedOffBy } from './turned-off.ts';

/** A film's blur as it writes it: `{ enabled: false }` for none, or livereel's with any value given in its place. */
export type MotionBlurScript =
	TurnedOff | { readonly enabled?: true; readonly shutter?: number; readonly exposuresAtMost?: number };

// livereel's blur: the shutter open for the camera's whole way, and at most eight exposures a frame, which keep copies a
// step apart up to eight steps a frame and bound the cost of faster ones
const RECOMMENDED: MotionBlur = { shutter: 1, exposuresAtMost: 8 };
const WIDEST_SHUTTER = 1;
const FEWEST_EXPOSURES = 2;
// Where a film writes its blur, and the names it writes it with
const BLUR = 'motionBlur';
const BLUR_FORM = ['enabled', 'shutter', 'exposuresAtMost'];
const BLUR_FORMS = 'it is { enabled: false } to turn it off, or an object of shutter, exposuresAtMost, either or both';

/**
 * The blur a film is shot with, read as a film whose types nobody checked may hand it: livereel's where the film says
 * nothing, none where it is turned off, livereel's with the values the film gives in their place otherwise. Anything
 * but an object, a name a blur has not, or a value that cannot be shot is refused by where it stands.
 */
export function motionBlurOf(written: unknown): MotionBlur | null {
	if (written === undefined) return RECOMMENDED;
	if (!isObjectOfValues(written)) throw new FilmError(`the film's ${BLUR} is ${described(written)}: ${BLUR_FORMS}`);
	refuseNamesBeyond(written, BLUR_FORM, `the film's ${BLUR}`);
	if (turnedOffBy(written, BLUR)) return null;
	return { shutter: shutterOf(written.shutter), exposuresAtMost: exposuresAtMostOf(written.exposuresAtMost) };
}

/** The share of the camera's way from the frame before the shutter is open for: livereel's where the film gives none. */
function shutterOf(written: unknown): number {
	if (written === undefined) return RECOMMENDED.shutter;
	if (typeof written === 'number' && written > 0 && written <= WIDEST_SHUTTER) return written;
	throw new FilmError(
		`the film's ${BLUR}.shutter is ${described(written)}: it is a number more than 0, and ${WIDEST_SHUTTER} at most, the camera's whole way from the frame before`
	);
}

/** How many exposures the fastest frame is blended from: livereel's count where the film gives none. */
function exposuresAtMostOf(written: unknown): number {
	if (written === undefined) return RECOMMENDED.exposuresAtMost;
	if (typeof written === 'number' && Number.isInteger(written) && written >= FEWEST_EXPOSURES) return written;
	throw new FilmError(
		`the film's ${BLUR}.exposuresAtMost is ${described(written)}: it is a whole count, ${FEWEST_EXPOSURES} or more`
	);
}
