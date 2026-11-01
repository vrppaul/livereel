/**
 * Words that come up one after another over a ground, and go: a caption's, at the frame's foot, a title's, over the
 * frame or a half of it, a callout's, on its card, and a note's.
 *
 * A film writes what is said as plain words, or as runs of them, each set its own way: italic, underlined, struck
 * through, in an ink or on a marker of its own colour. The words are worked out once, as their move is made, with a
 * key the stage knows them by: a word is a list of pieces, each the part of one run within it, after the space before
 * it, a piece of its own, set as the run it was written in sets it, so an underline or a marker runs on under the
 * space between two words of one run and stops where the run does; the browser drops a space that ends a line, and
 * its underline or marker with it. The space comes up with the word after it.
 *
 * Words come up in a way the film names, or the theme's (`WORDS_WAYS`). Word by word, each word comes up over the share
 * of the whole that `WORDS_AT_ONCE` words take, so several are on their way at a time, and the stage draws its way by
 * name. Letter by letter, every word stands laid out from the start, so no line breaks anew as they come: the letters
 * fade up one after another at an even pace; or stand as signs drawn by chance, which settle into the letters a few
 * behind those coming (`src/domain/chance.ts`); or are typed as a person types them (`src/domain/typing.ts`), each
 * shown once its key has come, a caret after the last letter typed until every one is. The space before a word is its
 * first letter. Every piece's letters are worked out with its words, so the stage lays such a word out one letter to
 * an element as it is handed them. The ground under the words comes up twice as fast as they do. The stage is handed
 * every word's progress, and of a word laid out by letters, how many of its letters stand and the sign each stands as.
 */
import { Chance, seedOf } from '../domain/chance.ts';
import { A_COLOUR, A_STRING, type Kind, ListOf, OfForm, OneOf, Plain, needed } from '../domain/handed.ts';
import { FRAMES_PER_SECOND, easeOutCubic } from '../domain/time.ts';
import { type Keystroke, keysStruckAlong, lettersOf } from '../domain/typing.ts';
import type { Presences } from './way.ts';

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
 * The ways words come up and go, as a film names them: word by word, each rising out of a blur, rising sharp, fading
 * up where it stands, coming clear out of a blur there, or rising from under its own line, as from under a mask; or
 * letter by letter, each fading up, or each standing as a sign drawn by chance until it settles into its own.
 */
const WORDS_WAYS = ['rise', 'sharp', 'fade', 'blur', 'mask', 'letters', 'scramble'] as const;

export type WordsWay = (typeof WORDS_WAYS)[number];

export const A_WORDS_WAY: OneOf<WordsWay> = new OneOf(
	WORDS_WAYS,
	'how words come up: "rise", "sharp", "fade", "blur", "mask", "letters" or "scramble"'
);

/** A way words come up word by word, each word whole, which the stage draws by its name. */
type WordByWordWay = Exclude<WordsWay, LetterByLetterWay>;

/** A way words come up letter by letter, laid out one letter to an element. */
type LetterByLetterWay = Extract<WordsWay, 'letters' | 'scramble'>;

/**
 * How words come up: word by word in a way the stage draws by its name; letter by letter, at an even pace, or out of
 * signs; or typed, by the strokes of a person typing them. Words that come up letter by letter are laid out so, so the
 * stage knows them by a key of their own.
 */
export type ComingUp = WordByWord | LetterByLetter | Typed;

interface WordByWord {
	readonly kind: 'word by word';
	readonly way: WordByWordWay;
}

interface LetterByLetter {
	readonly kind: LetterByLetterWay;
	readonly key: string;
}

interface Typed {
	readonly kind: 'typed';
	readonly strokes: readonly Keystroke[];
	readonly key: string;
}

/** A word as the stage draws it: rising, how far it has come up, eased, from 0 to 1. */
interface RisingWord extends Word {
	readonly kind: 'word by word';
	readonly appeared: number;
}

/**
 * A word laid out letter by letter as the stage draws it: standing whole, how many of its letters stand, the space
 * before it first, whether the caret follows the last of them, and the sign each letter stands as before it settles
 * into its own, by its place in the word, none where it stands as itself.
 */
interface LetteredWord extends Word {
	readonly kind: 'lettered';
	readonly appeared: number;
	readonly letters: number;
	readonly caret: boolean;
	readonly signs: readonly (string | null)[];
}

type DrawnWord = RisingWord | LetteredWord;

/**
 * Words as the stage draws them: each word's progress, the way they come up, which the stage draws by its name, how
 * far their ground has come up, how far they went.
 */
export interface DrawnWords {
	readonly words: readonly DrawnWord[];
	readonly key: string;
	readonly way: WordsWay | Typed['kind'];
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
// A word laid out letter by letter stands whole, its letters shown one by one; and such words are laid out apart from
// the same words coming up word by word, one letter to an element, so the stage knows them by a key of their own, this
// before theirs
const STANDS_WHOLE = 1;
const LETTERED_KEY = 'lettered ';
// Typed words show a caret after the last letter typed; letters that come up of themselves show none
const CARET_FOLLOWS = true;
const NO_CARET = false;
// Scrambled letters: how many stand as signs ahead of the last settled, how many frames each sign stands before another
// is drawn, the signs one may be, and the odd number a letter's place is mixed by, so each letter draws signs of its own
const SIGNS_AHEAD = 6;
const FRAMES_A_SIGN_STANDS = 2;
const SIGNS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?';
const SIGN_MIXING_ODD = 0x9e3779b1;
// No sign: a letter standing as itself
const AS_ITSELF = null;
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
	return { kind: 'typed', strokes, key: LETTERED_KEY + said.key };
}

/** What a film says coming up in a way it names. */
export function comingUpIn(way: WordsWay, said: Said): ComingUp {
	switch (way) {
		case 'letters':
		case 'scramble':
			return { kind: way, key: LETTERED_KEY + said.key };
		case 'rise':
		case 'sharp':
		case 'fade':
		case 'blur':
		case 'mask':
			return { kind: 'word by word', way };
	}
}

/** What a film says as plain text, its words with one space between each two: what a person types of it. */
export function plainTextOf(said: Said): string {
	return said.words.map(textOfWord).join('');
}

/**
 * Words on a ground of their own as the stage draws them at a moment of the film, an object showing them: the words as
 * far as its figure has come, their ground as far as its ground has, which comes in its own way whatever way the words
 * come.
 */
export function drawnWordsOnGround(said: Said, comingUp: ComingUp, presences: Presences, moment: number): DrawnWords {
	const figure = presences.figure;
	const ground = presences.ground;
	return {
		...drawnWords({ ...said, shown: figure.shown, gone: figure.gone }, comingUp, moment),
		ground: groundOf(ground.shown, ground.gone)
	};
}

/** Words as the stage draws them at a moment of the film, coming up as they do. */
export function drawnWords(shown: ShownWords, comingUp: ComingUp, moment: number): DrawnWords {
	const ground = groundOf(shown.shown, shown.gone);
	const gone = shown.gone;
	switch (comingUp.kind) {
		case 'word by word': {
			const words = risingWords(shown.words, shown.shown);
			return { words, key: shown.key, way: comingUp.way, ground, gone };
		}
		case 'letters': {
			const words = letteredWords(shown.words, shown.shown * lettersIn(shown.words), NO_CARET, standingAsItself);
			return { words, key: comingUp.key, way: comingUp.kind, ground, gone };
		}
		case 'scramble': {
			const words = scrambledWords(shown, shown.shown, moment);
			return { words, key: comingUp.key, way: comingUp.kind, ground, gone };
		}
		case 'typed': {
			const typed = keysStruckAlong(comingUp.strokes, shown.shown);
			const words = letteredWords(shown.words, typed, CARET_FOLLOWS, standingAsItself);
			return { words, key: comingUp.key, way: comingUp.kind, ground, gone };
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
 * Words laid out letter by letter as so many of their letters stand, counted from the first: each word whole, as many
 * of its letters as fall to it, the caret after the last letter standing where one follows, until every letter stands,
 * and the sign each letter stands as, by `signOf` its place among all and the letter.
 */
function letteredWords(
	words: readonly Word[],
	standing: number,
	caretFollows: boolean,
	signOf: (place: number, letter: string) => string | null
): readonly DrawnWord[] {
	const coming = standing < lettersIn(words);
	const drawn: DrawnWord[] = [];
	let firstLetter = 0;
	for (const word of words) {
		const letters = lettersOfWord(word);
		const stands = Math.min(letters.length, Math.max(0, standing - firstLetter));
		const caret = caretFollows && coming && standing > firstLetter && standing <= firstLetter + letters.length;
		const signs = letters.map((letter, place) => signOf(firstLetter + place, letter));
		drawn.push({ ...word, kind: 'lettered', appeared: STANDS_WHOLE, letters: stands, caret, signs });
		firstLetter += letters.length;
	}
	return drawn;
}

/**
 * Words scrambled, the whole `shown` of the way, at a moment of the film: their letters come up one after another, each
 * standing as a sign drawn by chance, a new one every `FRAMES_A_SIGN_STANDS` frames, and settle into their own
 * `SIGNS_AHEAD` letters behind, so the last settles as the way ends. The words' key seeds the signs, so other words
 * draw signs of their own.
 */
function scrambledWords(said: Said, shown: number, moment: number): readonly DrawnWord[] {
	const standing = shown * (lettersIn(said.words) + SIGNS_AHEAD);
	const settled = standing - SIGNS_AHEAD;
	const draw = Math.floor(Math.round(moment * FRAMES_PER_SECOND) / FRAMES_A_SIGN_STANDS) + seedOf(said.key);
	return letteredWords(said.words, standing, NO_CARET, (place, letter) => signAt(place, letter, settled, draw));
}

/**
 * The sign a scrambled letter stands as, at its place among all, on a draw: none once so many letters have settled,
 * nor for a space, which stands as itself.
 */
function signAt(place: number, letter: string, settled: number, draw: number): string | null {
	if (place < settled || letter.trim() === '') return AS_ITSELF;
	const chance = new Chance(Math.imul(place, SIGN_MIXING_ODD) + draw);
	return SIGNS.charAt(Math.floor(chance.uniform() * SIGNS.length));
}

/** A letter that stands as itself, as every letter typed or coming up by letters does. */
function standingAsItself(): string | null {
	return AS_ITSELF;
}

/** How many letters words are laid out in. */
function lettersIn(words: readonly Word[]): number {
	return words.reduce((letters, word) => letters + lettersOfWord(word).length, 0);
}

/** A word's letters, as typed: those of the space before it, where it has one, and of its pieces. */
function lettersOfWord(word: Word): readonly string[] {
	return typedPiecesOf(word).flatMap((piece) => piece.letters);
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
