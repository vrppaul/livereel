/**
 * How a film leans what stands on the frame, the page's window or an object: back from its top edge by `tilt` and
 * swung about its middle by `turn`, written once for both.
 */
import type { Angle } from '../domain/camera.ts';
import { A_NUMBER, type Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';

/** How a move leans: `tilt` and `turn` in degrees, 0 face-on; one left out stays as it stands. */
export interface LeanScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
}

export const LEAN_FORM: Form<LeanScript> = { tilt: A_NUMBER, turn: A_NUMBER, ...TIMING_FORM };

/** The angle a lean goes to from how it stands: the film's, each side it leaves out as it stood. */
export function leantFrom(standing: Angle, script: LeanScript): Angle {
	return { tilt: script.tilt ?? standing.tilt, turn: script.turn ?? standing.turn };
}
