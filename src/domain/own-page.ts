/**
 * How a page of the film's own stands at a moment, as the screen works it out from the page's run and what the film
 * typed into it (`src/props/screen.ts`). It is one value for all who need it: an exposure draws the page so, and the
 * stage stands the copy of it moves read so as a move begins, so a block is measured where the frame of that moment
 * draws it.
 */
import type { TypedText } from './typing.ts';

/**
 * A page of the film's own, by its key, as it stands: how far down its scroll the film has run it, in its pixels, and
 * what stands typed in it.
 */
export interface OwnPageStanding {
	readonly key: string;
	readonly scrolled: number;
	readonly typed: readonly TypedText[];
}
