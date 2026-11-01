/** The cursor a person moves over the page. */
import type { Fraction } from '../domain/fraction.ts';

/** The pointer's tip on the screen; `press` is how far it is pressed in. */
export interface Cursor {
	readonly left: number;
	readonly top: number;
	readonly press: Fraction;
}
