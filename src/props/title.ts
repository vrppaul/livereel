/**
 * A title: words that stand over the whole frame, on the film's ground, which comes up under them and covers what was
 * there; or words in a place on the frame the film names (`src/domain/place.ts`), beside the page's window or alone,
 * standing on the ground round them, so they bring no ground of their own. A title sliding in from a side pushes the
 * one standing in a place off past the side across, and holds it while it goes, so the stage draws both.
 */
import type { Box } from '../domain/geometry.ts';
import type { Alignment } from '../domain/place.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/**
 * A title's words, the place they stand in, in the frame's pixels — none, over the whole frame on its ground — how
 * they read there, and how large their letters are, in pixels of a frame 1080 on its shorter side: none, as the look
 * has a title's.
 */
interface TitleWords extends ShownWords {
	readonly box: Box | null;
	readonly align: Alignment;
	readonly size: number | null;
}

/** A title, and the title it pushes off as it slides in, while it does; none else. */
export interface Title extends TitleWords {
	readonly pushedOff: TitleWords | null;
}

export interface DrawnTitleWords extends DrawnWords {
	readonly box: Box | null;
	readonly align: Alignment;
	readonly size: number | null;
}

export interface DrawnTitle extends DrawnTitleWords {
	readonly pushedOff: DrawnTitleWords | null;
}

// Words in a place bring no ground of their own
const NO_GROUND = 0;

export function drawnTitle(title: Title): DrawnTitle {
	return {
		...drawnTitleWords(title),
		pushedOff: title.pushedOff === null ? null : drawnTitleWords(title.pushedOff)
	};
}

function drawnTitleWords(title: TitleWords): DrawnTitleWords {
	const words = drawnWords(title);
	return {
		...words,
		ground: title.box === null ? words.ground : NO_GROUND,
		box: title.box,
		align: title.align,
		size: title.size
	};
}
