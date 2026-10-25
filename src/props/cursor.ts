/** The cursor a person moves over the page. */

/** The pointer's tip on the screen; `press` is how far it is pressed in, from 0 to 1. */
export interface Cursor {
	readonly left: number;
	readonly top: number;
	readonly press: number;
}
