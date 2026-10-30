/**
 * Words that come up one after another over a ground, and go: a caption's, at the frame's foot, a title's, over the
 * frame or a half of it, and a callout's, on its card.
 *
 * A film writes what is said as plain words, or as runs of them, each set its own way: italic, underlined, struck
 * through, in an ink or on a marker of its own colour. The words are worked out once, as their move is made, with a
 * key the stage knows them by: a word is a list of pieces, each the part of one run within it, after the space before
 * it, a piece of its own, set as the run it was written in sets it, so an underline or a marker runs on under the
 * space between two words of one run and stops where the run does; the browser drops a space that ends a line, and
 * its underline or marker with it. The space comes up with the word after it. Each word comes up over the share of
 * the whole that `WORDS_AT_ONCE` words take, so several are on their way at a time; or the words are typed, letter by
 * letter, as a person types them (`src/domain/typing.ts`): every word stands laid out from the start, so no line
 * breaks anew as they are typed, each letter shown once its key has come, the space before a word its first, and a
 * caret after the last letter typed until every one is. Every piece's letters are worked out with its words, so the
 * stage lays a word typed out one letter to an element as it is handed them, and the letters typed on a frame are the
 * keys struck by then. The ground under them comes up twice as fast as they do. The stage is handed every word's
 * progress, and of words typed, how many of its letters stand.
 */
import { A_COLOUR, A_STRING, type Kind, ListOf, OfForm, Plain, needed } from '../domain/handed.ts';
import { easeOutCubic } from '../domain/time.ts';
import { type Keystroke, keysStruckAlong, lettersOf } from '../domain/typing.ts';

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

/**
 * A part of a word set one way, or a space between two words: its text, and its letters, each what one key gives, as
 * a person types them; its styles by name, its ink and marker.
 */
export interface Piece {
	readonly text: string;
	readonly letters: readonly string[];
	readonly styles: readonly Style[];
	readonly ink: string | null;
	readonly marker: string | null;
}

/** A word as it is set: the space before it, where a word comes before, and its pieces. */
interface Word {
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

/**
 * How words come up: word by word, each rising; or typed, by the strokes of a person typing them, laid out letter by
 * letter, so the stage knows them by a key of their own.
 */
export type ComingUp = WordByWord | Typed;

interface WordByWord {
	readonly kind: 'word by word';
}

interface Typed {
	readonly kind: 'typed';
	readonly strokes: readonly Keystroke[];
	readonly key: string;
}

/** Words that come up word by word. */
export const WORD_BY_WORD: ComingUp = { kind: 'word by word' };

/** A word as the stage draws it: rising, how far it has come up, eased, from 0 to 1. */
interface RisingWord extends Word {
	readonly kind: 'word by word';
	readonly appeared: number;
}

/**
 * A word typed as the stage draws it: standing whole, how many of its letters stand typed, the space before it first,
 * and whether the caret follows the last of them.
 */
interface TypedWord extends Word {
	readonly kind: 'typed';
	readonly appeared: number;
	readonly letters: number;
	readonly caret: boolean;
}

type DrawnWord = RisingWord | TypedWord;

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
// A word typed stands whole, its letters shown one by one; and words typed are laid out apart from the same words
// coming up word by word, one letter to an element, so the stage knows them by a key of their own, this before theirs
const STANDS_WHOLE = 1;
const TYPED_KEY = 'typed ';
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

/** What a film says coming up typed by a person's strokes, each a letter of it. */
export function typedComingUp(said: Said, strokes: readonly Keystroke[]): ComingUp {
	return { kind: 'typed', strokes, key: TYPED_KEY + said.key };
}

/** What a film says as plain text, its words with one space between each two: what a person types of it. */
export function plainTextOf(said: Said): string {
	return said.words.map(textOfWord).join('');
}

/** Words as the stage draws them, coming up as they do. */
export function drawnWords(shown: ShownWords, comingUp: ComingUp): DrawnWords {
	const ground = groundOf(shown.shown, shown.gone);
	switch (comingUp.kind) {
		case 'word by word':
			return { words: risingWords(shown.words, shown.shown), key: shown.key, ground, gone: shown.gone };
		case 'typed': {
			const words = typedWords(shown.words, keysStruckAlong(comingUp.strokes, shown.shown));
			return { words, key: comingUp.key, ground, gone: shown.gone };
		}
	}
}

/** Words rising one after another, the whole `shown` of the way. */
function risingWords(words: readonly Word[], shown: number): readonly DrawnWord[] {
	return words.map((word, place): DrawnWord => ({
		...word,
		kind: 'word by word',
		appeared: appearedOf(shown, place, words.length)
	}));
}

/**
 * Words typed so far as so many letters of them stand, a key struck for each: each word whole, as many of its letters
 * as fall to it, and the caret after the last letter typed, until every letter is.
 */
function typedWords(words: readonly Word[], lettersTyped: number): readonly DrawnWord[] {
	const counted = words.map((word) => ({ word, letters: lettersInWord(word) }));
	const lettersInAll = counted.reduce((letters, inWord) => letters + inWord.letters, 0);
	const typing = lettersTyped < lettersInAll;
	const drawn: DrawnWord[] = [];
	let firstLetter = 0;
	for (const { word, letters } of counted) {
		const standing = Math.min(letters, Math.max(0, lettersTyped - firstLetter));
		const caret = typing && lettersTyped > firstLetter && lettersTyped <= firstLetter + letters;
		drawn.push({ ...word, kind: 'typed', appeared: STANDS_WHOLE, letters: standing, caret });
		firstLetter += letters;
	}
	return drawn;
}

/** How many letters a word is typed in: those of the space before it, where it has one, and of its pieces. */
function lettersInWord(word: Word): number {
	return typedPiecesOf(word).reduce((letters, piece) => letters + piece.letters.length, 0);
}

/** A word's text as typed: the space before it, where it has one, and its pieces' text. */
function textOfWord(word: Word): string {
	return typedPiecesOf(word)
		.map((piece) => piece.text)
		.join('');
}

/** A word's pieces in the order they are typed: the space before it first, where it has one. */
function typedPiecesOf(word: Word): readonly Piece[] {
	return word.spaceBefore === null ? word.pieces : [word.spaceBefore, ...word.pieces];
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
		letters: lettersOf(text),
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
