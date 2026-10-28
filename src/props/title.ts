/**
 * A title: words that stand over the whole frame, or over a half of it, on the film's ground, which comes up under
 * them and covers what was there. Over a half, the ground covers that half alone, fading out across the middle, so the
 * screen beside it shows as a pane on the same ground.
 */
import type { FrameHalf } from '../domain/geometry.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** A title's words, and the half they stand over: none, for the whole frame. */
export interface Title extends ShownWords {
	readonly half: FrameHalf | null;
}

export interface DrawnTitle extends DrawnWords {
	readonly half: FrameHalf | null;
}

export function drawnTitle(title: Title): DrawnTitle {
	return { ...drawnWords(title), half: title.half };
}
