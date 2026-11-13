/**
 * The part of the screen the shade's blur leaves sharp, read off the page as the film named it. The take reads it where
 * a film names a part and again wherever the page may have changed since (`src/studio/take.ts`), so the part stays on
 * its blocks while an act narrows the column they stand in: read once as the shade began, it stayed where the page had
 * stood, and the claude-review promo's line kept the wrong row sharp while its diff narrowed over the eye's dive.
 */
import type { Box } from '../domain/geometry.ts';
import type { SharpNamed, SharpStretch } from '../props/window.ts';
import { type PageReading, THE_FIRST, shownPart } from './move.ts';

// The part kept sharp, as a refusal names it
export const SHARP_MOVE = "window.shade's sharp";
// The blocks of a selector a stretch kept sharp reads: every one it matches
const EVERY_BLOCK = Number.POSITIVE_INFINITY;

/**
 * What the screen shows of the part the film named: the first block a selector matches, a box, or a stretch of blocks;
 * refused as a move refuses a block it goes to, hidden or off the screen.
 */
export async function sharpPartRead(reading: PageReading, named: SharpNamed): Promise<Box> {
	if (typeof named !== 'string' && 'blocks' in named) return stretchShown(reading, named);
	return shownPart(reading, named, THE_FIRST, SHARP_MOVE);
}

/** What the screen shows of a stretch of blocks: its blocks together, as wide across as its `across` where named. */
async function stretchShown(reading: PageReading, stretch: SharpStretch): Promise<Box> {
	const blocks = await shownPart(reading, stretch.blocks, EVERY_BLOCK, SHARP_MOVE);
	if (stretch.across === undefined) return blocks;
	const across = await shownPart(reading, stretch.across, EVERY_BLOCK, SHARP_MOVE);
	return { left: across.left, top: blocks.top, width: across.width, height: blocks.height };
}
