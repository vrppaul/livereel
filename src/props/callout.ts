/**
 * A callout: words on a card of their own beside a block of the page, pointing at it, laid on the screen as the light
 * and the cursor are, so the camera carries it with the page. Its card comes up first and its words one after another
 * on it (`src/props/words.ts`), in the theme's way as it comes; where it stands is read once, as it comes, as the
 * light's box is.
 */
import type { Box } from '../domain/geometry.ts';
import { OneOf } from '../domain/handed.ts';
import { type ComingUp, type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** The sides of a block a callout stands on. */
const BLOCK_SIDES = ['above', 'below', 'left', 'right'] as const;

export type BlockSide = (typeof BLOCK_SIDES)[number];

export const A_BLOCK_SIDE = new OneOf(BLOCK_SIDES, 'a side of the block: "above", "below", "left" or "right"');

/**
 * A callout's words and how they come up, the block it points at, as the screen showed it, and the side of it the
 * callout stands on.
 */
export interface Callout extends ShownWords {
	readonly comingUp: ComingUp;
	readonly box: Box;
	readonly side: BlockSide;
}

export interface DrawnCallout extends DrawnWords {
	readonly box: Box;
	readonly side: BlockSide;
}

/** A callout as the stage draws it at a moment of the film. */
export function drawnCallout(callout: Callout, moment: number): DrawnCallout {
	return { ...drawnWords(callout, callout.comingUp, moment), box: callout.box, side: callout.side };
}
