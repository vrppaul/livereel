/**
 * How a film's fast camera is blurred, as its author writes it: turned off, or livereel's blur with any of its values
 * the film gives in their place.
 *
 * livereel opens the shutter for the camera's whole way from the frame before: a film camera's half smears too faintly
 * for the eye to see in a film of a page. A shutter open for more than that way is refused, as the camera's way before
 * the frame before is not known; so is a blur of fewer than two exposures at most, which is the frame alone.
 */
import { FilmError } from '../domain/errors.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import type { TurnedOff } from './turned-off.ts';

/** A film's blur as it writes it: `{ enabled: false }` for none, or livereel's with any value given in its place. */
export type MotionBlurScript =
	TurnedOff | { readonly enabled?: true; readonly shutter?: number; readonly exposuresAtMost?: number };

// livereel's blur: the shutter open for the camera's whole way, and at most eight exposures a frame, which keep copies a
// step apart up to eight steps a frame and bound the cost of faster ones
const RECOMMENDED: MotionBlur = { shutter: 1, exposuresAtMost: 8 };
const WIDEST_SHUTTER = 1;
const FEWEST_EXPOSURES = 2;

/** The blur a film is shot with: none where it is turned off; one that cannot be shot is refused. */
export function motionBlurOf(written: MotionBlurScript): MotionBlur | null {
	if (written.enabled === false) return null;
	const blur = {
		shutter: written.shutter ?? RECOMMENDED.shutter,
		exposuresAtMost: written.exposuresAtMost ?? RECOMMENDED.exposuresAtMost
	};
	if (!(blur.shutter > 0 && blur.shutter <= WIDEST_SHUTTER)) {
		throw new FilmError(
			`the motion blur's shutter is ${blur.shutter}: it is more than 0, and ${WIDEST_SHUTTER} at most, the camera's whole way from the frame before`
		);
	}
	if (!(Number.isInteger(blur.exposuresAtMost) && blur.exposuresAtMost >= FEWEST_EXPOSURES)) {
		throw new FilmError(
			`the motion blur's exposures at most are ${blur.exposuresAtMost}: a whole count, ${FEWEST_EXPOSURES} or more`
		);
	}
	return blur;
}
