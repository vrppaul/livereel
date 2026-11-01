/** The screen the page is shown on, and how far it has come up out of the ground. */
import { type Fraction, NONE, WHOLE } from '../domain/fraction.ts';

/** How far the screen has come up: a film may open on the ground alone. */
export interface Screen {
	readonly shown: Fraction;
}

export const SCREEN_UP: Screen = { shown: WHOLE };
export const SCREEN_DOWN: Screen = { shown: NONE };
