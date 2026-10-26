/**
 * How a film's fast camera is blurred, as its author writes it: turned off, or livereel's blur with any of its values
 * the film gives in their place.
 *
 * livereel opens the shutter for the camera's whole way from the frame before: a film camera's half smears too faintly
 * for the eye to see in a film of a page. A shutter open for more than that way is refused, as the camera's way before
 * the frame before is not known; so is a blur of fewer than two exposures, which is the frame alone.
 */
import { FilmError } from '../domain/errors.ts';
import type { MotionBlur } from '../domain/shutter.ts';

/** A film's blur as it writes it: `{ enabled: false }` for none, or livereel's with any value given in its place. */
export type MotionBlurScript =
	{ readonly enabled: false } | { readonly enabled?: true; readonly shutter?: number; readonly exposures?: number };

// livereel's blur: the shutter open for the camera's whole way, of exposures close enough to run together
const RECOMMENDED: MotionBlur = { shutter: 1, exposures: 8 };
const WIDEST_SHUTTER = 1;
const FEWEST_EXPOSURES = 2;

/** The blur a film is shot with: none where it is turned off; one that cannot be shot is refused. */
export function motionBlurOf(written: MotionBlurScript): MotionBlur | null {
	if (written.enabled === false) return null;
	const blur = {
		shutter: written.shutter ?? RECOMMENDED.shutter,
		exposures: written.exposures ?? RECOMMENDED.exposures
	};
	if (!(blur.shutter > 0 && blur.shutter <= WIDEST_SHUTTER)) {
		throw new FilmError(
			`the motion blur's shutter is ${blur.shutter}: it is more than 0, and ${WIDEST_SHUTTER} at most, the camera's whole way from the frame before`
		);
	}
	if (!(Number.isInteger(blur.exposures) && blur.exposures >= FEWEST_EXPOSURES)) {
		throw new FilmError(
			`the motion blur's exposures are ${blur.exposures}: a whole count, ${FEWEST_EXPOSURES} or more`
		);
	}
	return blur;
}
