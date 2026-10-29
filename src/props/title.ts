/**
 * A title: words that stand over the whole frame, on the film's ground, which comes up under them and covers what was
 * there; or words in a place on the frame the film names (`src/domain/place.ts`), beside the page's window or alone,
 * standing on the ground round them, so they bring no ground of their own.
 */
import type { Box } from '../domain/geometry.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** A title's words, and the place they stand in, in the frame's pixels: none, over the whole frame on its ground. */
export interface Title extends ShownWords {
	readonly box: Box | null;
}

export interface DrawnTitle extends DrawnWords {
	readonly box: Box | null;
}

// Words in a place bring no ground of their own
const NO_GROUND = 0;

export function drawnTitle(title: Title): DrawnTitle {
	const words = drawnWords(title);
	return { ...words, ground: title.box === null ? words.ground : NO_GROUND, box: title.box };
}
