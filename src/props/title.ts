/**
 * A title's words, what an object shows (`src/props/object.ts`): on the film's ground, which comes up under them over
 * the object's whole box and covers what was there, a title card; or on the ground round them, in a place the film
 * names (`src/domain/place.ts`), beside the page's window or alone, or beside a part, so they bring no ground of their
 * own. They come up word by word, or typed by a person.
 */
import type { Alignment } from '../domain/place.ts';
import type { Presences } from './way.ts';
import { type ComingUp, type DrawnWords, type Said, drawnWordsOnGround } from './words.ts';

/**
 * A title's words: what they say, how they read in their box, where they stand down it, how large their letters are, in
 * film pixels, how far apart its letters and its lines stand, in times its letters' size — each none, as the look has a
 * title's — whether they stand on a ground of their own, and how they come up, word by word or typed.
 */
export interface TitleWords extends Said, TitleType {
	readonly kind: 'title';
	readonly align: Alignment;
	readonly down: WordsDown;
	readonly onGround: boolean;
	readonly comingUp: ComingUp;
}

/**
 * Where a title's words stand down their box: their middle at its middle, as in a place; or their foot at its foot, as
 * words over a part stand.
 */
export type WordsDown = 'middle' | 'foot';

/** How a title sets its letters where it sets them its own way, each none where the look's stands. */
export interface TitleType {
	readonly size: number | null;
	readonly letterSpacing: number | null;
	readonly lineHeight: number | null;
}

export interface DrawnTitleWords extends DrawnWords, TitleType {
	readonly kind: 'title';
	readonly align: Alignment;
	readonly down: WordsDown;
	readonly onGround: boolean;
}

// Words in a place bring no ground of their own
const NO_GROUND = 0;

/** A title's words as the stage draws them at a moment of the film, as far as the object showing them stands. */
export function drawnTitleWords(title: TitleWords, presences: Presences, moment: number): DrawnTitleWords {
	const words = drawnWordsOnGround(title, title.comingUp, presences, moment);
	return {
		...words,
		kind: title.kind,
		ground: title.onGround ? words.ground : NO_GROUND,
		align: title.align,
		down: title.down,
		size: title.size,
		letterSpacing: title.letterSpacing,
		lineHeight: title.lineHeight,
		onGround: title.onGround
	};
}
