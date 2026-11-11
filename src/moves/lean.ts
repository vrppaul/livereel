/**
 * How a film leans what stands on the frame, the page's window or an object: back from its top edge by `tilt`, swung
 * about its middle by `turn`, rolled in its plane by `roll` and turned over round its own width by `over`, about a point
 * of its box, `about`, written once for both.
 */
import { FilmError } from '../domain/errors.ts';
import { samePoint } from '../domain/geometry.ts';
import {
	A_POINT_TURNED_ABOUT,
	type AboutWritten,
	type Angle,
	type Stance,
	isFrontOn,
	pointTurnedAbout
} from '../domain/stance.ts';
import { A_NUMBER, type Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';

/**
 * How a move leans: `tilt`, `turn`, `roll` and `over` in degrees, 0 face-on, and the point of its box it turns `about`;
 * one left out stays as it stands.
 */
export interface LeanScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
	readonly roll?: number;
	readonly over?: number;
	readonly about?: AboutWritten;
}

/** How something leans: its angle, and the point of its box it turns about. */
type Leaning = Pick<Stance, 'angle' | 'about'>;

export const LEAN_FORM: Form<LeanScript> = {
	tilt: A_NUMBER,
	turn: A_NUMBER,
	roll: A_NUMBER,
	over: A_NUMBER,
	about: A_POINT_TURNED_ABOUT,
	...TIMING_FORM
};

/**
 * How a lean leaves something from how it stands: the angle it goes to, each value it leaves out as it stood, and the
 * point it turns about, as it stood where it names none. Refused where it names another point while what it leans is
 * turned from face-on, as turning about another point would move it at once; `name` says what it leans, as `move`'s
 * refusal says it.
 */
export function leantFrom(standing: Leaning, script: LeanScript, move: string, name: string): Leaning {
	const about = script.about === undefined ? standing.about : pointTurnedAbout(script.about);
	if (!samePoint(about, standing.about) && !isFrontOn(standing.angle)) {
		throw new FilmError(
			`${move} would turn the ${name} about another point of its box while it is turned from face-on, where it would jump: lean it face-on first, or on about the point it turns about`
		);
	}
	return { angle: angleLeantFrom(standing.angle, script), about };
}

/** The angle a lean goes to from how it stands: the film's, each value it leaves out as it stood. */
function angleLeantFrom(standing: Angle, script: LeanScript): Angle {
	return {
		tilt: script.tilt ?? standing.tilt,
		turn: script.turn ?? standing.turn,
		roll: script.roll ?? standing.roll,
		over: script.over ?? standing.over
	};
}
