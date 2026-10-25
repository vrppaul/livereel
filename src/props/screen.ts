/** The screen the page is shown on, and how far it has come up out of the ground. */

/** How far the screen has come up, from 0 to 1: a film may open on the ground alone. */
export interface Screen {
	readonly shown: number;
}

export const SCREEN_UP: Screen = { shown: 1 };
export const SCREEN_DOWN: Screen = { shown: 0 };
