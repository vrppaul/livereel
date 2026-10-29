/**
 * A title: words that stand over the whole frame, on the film's ground, which comes up under them and covers what was
 * there; or words on a side of the frame, beside the page's window on the side across, standing on the ground round
 * the window, so they bring no ground of their own.
 */
import type { Beside } from '../domain/split.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** A title's words, and where they stand beside a window: none, over the whole frame. */
export interface Title extends ShownWords {
	readonly beside: Beside | null;
}

export interface DrawnTitle extends DrawnWords {
	readonly beside: Beside | null;
}

// Words beside a window bring no ground of their own
const NO_GROUND = 0;

export function drawnTitle(title: Title): DrawnTitle {
	const words = drawnWords(title);
	return { ...words, ground: title.beside === null ? words.ground : NO_GROUND, beside: title.beside };
}
