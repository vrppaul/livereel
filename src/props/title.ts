/**
 * A title's words, what an object shows (`src/props/object.ts`): on the film's ground, which comes up under them over
 * the object's whole box and covers what was there, a title card; or on the ground round them, in a place the film
 * names (`src/domain/place.ts`), beside the page's window or alone, so they bring no ground of their own. They come up
 * word by word, or typed by a person.
 */
import type { Alignment } from '../domain/place.ts';
import { type ComingUp, type DrawnWords, type Said, drawnWords } from './words.ts';

/**
 * A title's words: what they say, how they read in their box, how large their letters are, in pixels of a frame 1080
 * on its shorter side — none, as the look has a title's — whether they stand on a ground of their own, and how they
 * come up, word by word or typed.
 */
export interface TitleWords extends Said {
	readonly kind: 'words';
	readonly align: Alignment;
	readonly size: number | null;
	readonly onGround: boolean;
	readonly comingUp: ComingUp;
}

export interface DrawnTitleWords extends DrawnWords {
	readonly kind: 'words';
	readonly align: Alignment;
	readonly size: number | null;
	readonly onGround: boolean;
}

// Words in a place bring no ground of their own
const NO_GROUND = 0;

/** A title's words as the stage draws them, the object showing them come up `shown` and gone `gone` so far. */
export function drawnTitleWords(title: TitleWords, shown: number, gone: number): DrawnTitleWords {
	const words = drawnWords({ ...title, shown, gone }, title.comingUp);
	return {
		...words,
		kind: title.kind,
		ground: title.onGround ? words.ground : NO_GROUND,
		align: title.align,
		size: title.size,
		onGround: title.onGround
	};
}
