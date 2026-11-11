/**
 * How a page of the film's own stands at a moment, as the screen works it out from the page's run, what the film
 * typed into it and the blocks of it the film blinks (`src/props/screen.ts`). It is one value for all who need it: an
 * exposure draws the page so, and the take stands the copy of it moves read so as a move begins, so a block is
 * measured, and a part pictured, where the frame of that moment draws it.
 */
import type { Fraction } from './fraction.ts';
import type { TypedText } from './typing.ts';

/** A block of a page of the film's own the film blinks, by its CSS selector, and how clear it stands, 0 to 1. */
export interface BlockBlinking {
	readonly into: string;
	readonly clear: Fraction;
}

/**
 * A page of the film's own, by its key, as it stands: how far down its scroll the film has run it, in its pixels,
 * what stands typed in it, and how clear each block the film blinks stands.
 */
export interface OwnPageStanding {
	readonly key: string;
	readonly scrolled: number;
	readonly typed: readonly TypedText[];
	readonly blinking: readonly BlockBlinking[];
}
