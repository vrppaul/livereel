/**
 * How a film leans what stands on the frame, the page's window or an object: back from its top edge by `tilt`, swung
 * about its middle by `turn`, rolled in its plane by `roll` and turned over round its own width by `over`, written once
 * for both.
 */
import type { Angle } from '../domain/camera.ts';
import { A_NUMBER, type Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';

/** How a move leans: `tilt`, `turn`, `roll` and `over` in degrees, 0 face-on; one left out stays as it stands. */
export interface LeanScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
	readonly roll?: number;
	readonly over?: number;
}

export const LEAN_FORM: Form<LeanScript> = {
	tilt: A_NUMBER,
	turn: A_NUMBER,
	roll: A_NUMBER,
	over: A_NUMBER,
	...TIMING_FORM
};

/** The angle a lean goes to from how it stands: the film's, each value it leaves out as it stood. */
export function leantFrom(standing: Angle, script: LeanScript): Angle {
	return {
		tilt: script.tilt ?? standing.tilt,
		turn: script.turn ?? standing.turn,
		roll: script.roll ?? standing.roll,
		over: script.over ?? standing.over
	};
}
