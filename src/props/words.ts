/**
 * Words that come up one after another over a ground, and go: a caption's, at the frame's foot, a title's, over the
 * frame or a half of it, and a callout's, on its card.
 *
 * A film writes what is said as plain words, or as runs of them, each set its own way: italic, underlined, struck
 * through, in an ink or on a marker of its own colour. The words are worked out once, as their move is made, with a
 * key the stage knows them by: a word is a list of pieces, each the part of one run within it, after the space before
 * it, a piece of its own, set as the run it was written in sets it, so an underline or a marker runs on under the
 * space between two words of one run and stops where the run does; the browser drops a space that ends a line, and
 * its underline or marker with it. The space comes up with the word after it. Each word comes up over the share of the whole that `WORDS_AT_ONCE` words take, so
 * several are on their way at a time; the ground under them comes up twice as fast as they do. The stage is handed
 * every word's progress.
 */
import { A_COLOUR, A_STRING, type Kind, ListOf, OfForm, Plain, needed } from '../domain/handed.ts';
import { easeOutCubic } from '../domain/time.ts';

/** A run of words as a film writes it: its text, and each way it is set, on where the film names it. */
export interface Run {
	readonly text: string;
	readonly italic?: true;
	readonly underline?: true;
	readonly strike?: true;
	/** The colour of its letters, in hex. */
	readonly ink?: string;
	/** The colour of a marker drawn behind it, in hex. */
	readonly marker?: string;
}

/** What a film says: plain words, or a list of plain words and runs, read one after another. */
export type Wording = string | readonly (string | Run)[];

/** The ways a run is set that the stage names a piece by, each a look of its own in the stage's styles. */
const STYLES = ['italic', 'underline', 'strike'] as const;

type Style = (typeof STYLES)[number];

/** A part of a word set one way, or a space between two words: its text, its styles by name, its ink and marker. */
export interface Piece {
	readonly text: string;
	readonly styles: readonly Style[];
	readonly ink: string | null;
	readonly marker: string | null;
}

/** A word as it is set: the space before it, where a word comes before, and its pieces. */
export interface Word {
	readonly spaceBefore: Piece | null;
	readonly pieces: readonly Piece[];
}

/** What a film says, worked out once: its words, and the key the stage knows them by, to lay them out anew. */
export interface Said {
	readonly words: readonly Word[];
	readonly key: string;
}

/** Words over the frame: what they are, how far they have come up, and how far they have gone, each from 0 to 1. */
export interface ShownWords extends Said {
	readonly shown: number;
	readonly gone: number;
}

/** A word as the stage draws it, and how far it has come up, eased, from 0 to 1. */
interface DrawnWord extends Word {
	readonly appeared: number;
}

/** Words as the stage draws them: each word's progress, how far their ground has come up, how far they went. */
export interface DrawnWords {
	readonly words: readonly DrawnWord[];
	readonly key: string;
	readonly ground: number;
	readonly gone: number;
}

/** A part of a run's text: a word's, or the space between two words. */
interface Stretch {
	readonly piece: Piece;
	readonly between: boolean;
}

// How many words are on their way up at once, and how much faster than the words their ground comes up
const WORDS_AT_ONCE = 3;
const GROUND_COMES_FASTER = 2;
// Where a run's text breaks between words, the break kept, and the space a break is set as, however it was written
const BETWEEN_WORDS = /(\s+)/;
const SPACE = ' ';
const A_STYLE_ON = new Plain(isOn, 'true, or left out');
const A_RUN: Kind<Run> = new OfForm<Run>(
	{
		text: needed(A_STRING),
		italic: A_STYLE_ON,
		underline: A_STYLE_ON,
		strike: A_STYLE_ON,
		ink: A_COLOUR,
		marker: A_COLOUR
	},
	'words: a string, or a run of them set its own way, { text, italic, underline, strike, ink, marker }'
);

/** A kind whose values are strings, or of another kind, whose fault is the one said where a value is neither. */
class StringOr<Value> implements Kind<string | Value> {
	readonly other: Kind<Value>;

	constructor(other: Kind<Value>) {
		this.other = other;
	}

	is(written: unknown): written is string | Value {
		return typeof written === 'string' || this.other.is(written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return typeof written === 'string' ? undefined : this.other.faultOf(written, place);
	}
}

/** What a film says, as it hands it: a string, or a list of strings and runs, a fault named down to the value. */
export const A_WORDING: Kind<Wording> = new StringOr(
	new ListOf(new StringOr(A_RUN), 'words: a string, or a list of strings and runs')
);

/** What a film says, worked out once as its move is made: its words, and the key the stage knows them by. */
export function saidOf(wording: Wording): Said {
	const words = wordsOf(wording);
	return { words, key: JSON.stringify(words) };
}

/** The words a film says, each a list of pieces after the space before it, set as the run it was written in. */
function wordsOf(wording: Wording): readonly Word[] {
	const words: Word[] = [];
	let spaceBefore: Piece | null = null;
	let pieces: Piece[] = [];
	let spaceAfter: Piece | null = null;
	for (const stretch of stretchesOf(wording)) {
		if (stretch.between) {
			// The first space after a word is the one between it and the next; a space before any word is none
			if (spaceAfter === null && pieces.length > 0) spaceAfter = stretch.piece;
			continue;
		}
		if (spaceAfter !== null) {
			words.push({ spaceBefore, pieces });
			spaceBefore = spaceAfter;
			pieces = [];
			spaceAfter = null;
		}
		pieces.push(stretch.piece);
	}
	return pieces.length > 0 ? [...words, { spaceBefore, pieces }] : words;
}

export function drawnWords(shown: ShownWords): DrawnWords {
	const count = shown.words.length;
	const words = shown.words.map((word, place) => ({ ...word, appeared: appearedOf(shown.shown, place, count) }));
	return { words, key: shown.key, ground: groundOf(shown.shown, shown.gone), gone: shown.gone };
}

/**
 * How far one of `count` things that come up one after another, words or lines of code, has come up, eased, the whole
 * `shown` of the way: each over the share of the whole that `WORDS_AT_ONCE` take, so several are on their way at once.
 */
export function appearedOf(shown: number, place: number, count: number): number {
	const share = WORDS_AT_ONCE / (count + WORDS_AT_ONCE - 1);
	return easeOutCubic(shareOf(shown, (place / count) * (1 - share), share));
}

/** How far the ground under what comes up one after another has come: twice as fast as it does, going as it goes. */
export function groundOf(shown: number, gone: number): number {
	return Math.min(1, shown * GROUND_COMES_FASTER) * (1 - gone);
}

/** Every run's text, in order, broken into words and the spaces between them, each part set as its run is. */
function stretchesOf(wording: Wording): Stretch[] {
	const runs = typeof wording === 'string' ? [wording] : wording;
	return runs.flatMap((run) => stretchesOfRun(typeof run === 'string' ? { text: run } : run));
}

function stretchesOfRun(run: Run): Stretch[] {
	return run.text
		.split(BETWEEN_WORDS)
		.filter((part) => part !== '')
		.map((part) => stretchOf(run, part));
}

function stretchOf(run: Run, part: string): Stretch {
	const between = part.trim() === '';
	return { piece: pieceOf(run, between ? SPACE : part), between };
}

function pieceOf(run: Run, text: string): Piece {
	return {
		text,
		styles: STYLES.filter((style) => run[style] === true),
		ink: run.ink ?? null,
		marker: run.marker ?? null
	};
}

/** How far along a part of a whole is, the whole `progress` along: none before the part's start, all after it. */
function shareOf(progress: number, start: number, length: number): number {
	return Math.min(1, Math.max(0, (progress - start) / length));
}

function isOn(written: unknown): written is true {
	return written === true;
}
