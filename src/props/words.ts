/**
 * Words that come up one after another over a ground, and go: a caption's, at the frame's foot, a title's, over the
 * frame or a half of it, a callout's, on its card, and a note's.
 *
 * A film writes what is said as plain words, or as runs of them, each set its own way: italic, underlined, struck
 * through, in an ink or on a marker of its own colour. The words are worked out once, as their move is made, with a
 * key the stage knows them by: a word is a list of pieces, each the part of one run within it, after the space before
 * it, a piece of its own, set as the run it was written in sets it, so an underline or a marker runs on under the
 * space between two words of one run and stops where the run does; the browser drops a space that ends a line, and
 * its underline or marker with it. The space comes up with the word after it. A line break the film writes between two
 * words, in whichever run, stands in place of that space, as many as it writes, and the stage breaks the line there.
 *
 * Words come up in a way the film names, or the theme's (`WORDS_WAYS`). Word by word, so many words are on their way at
 * once as the film names, or `ON_THEIR_WAY_AT_ONCE`: each comes up over the share of the whole that many take, setting
 * off as the one that many before it arrives, so the last arrives as the whole does; and the stage draws its way by
 * name. They go so too, the first first, each as it came run back. Letter by letter, every word stands laid out from
 * the start, so no line breaks anew as they come: the letters fade up one after another at an even pace; or stand as
 * signs drawn by chance, which settle into the letters a few behind those coming (`src/domain/chance.ts`); or are typed
 * as a person types them (`src/domain/typing.ts`), each shown once its key has come, a caret after the last letter
 * typed until every one is; and such words go together. The space before a word is its first letter. Every piece's
 * letters are worked out with its words, so the stage lays such a word out one letter to an element as it is handed
 * them. The ground under the words comes up twice as fast as they do. The stage is handed every word's progress and how
 * far it has gone, and of a word laid out by letters, how many of its letters stand and the sign each stands as.
 */
import { Chance, seedOf } from '../domain/chance.ts';
import type { Fraction } from '../domain/fraction.ts';
import {
	A_COLOUR,
	A_STRING,
	type Kind,
	ListOf,
	OfForm,
	OneOf,
	Plain,
	isMoreThanNone,
	needed
} from '../domain/handed.ts';
import { easeOutCubic } from '../domain/curves.ts';
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

/** Words over the frame: what they are, how far they have come up, and how far they have gone. */
export interface ShownWords extends Said {
	readonly shown: Fraction;
	readonly gone: Fraction;
}

/**
 * The ways words come up word by word, each word whole, which the stage draws by its name: each rising out of a blur,
 * rising sharp, fading up where it stands, coming clear out of a blur there, or rising from under its own line, as
 * from under a mask.
 */
const WORD_BY_WORD_WAYS = ['rise', 'sharp', 'fade', 'blur', 'mask'] as const;

export type WordByWordWay = (typeof WORD_BY_WORD_WAYS)[number];

/**
 * The ways words come up and go, as a film names them: word by word; or letter by letter, each fading up, or each
 * standing as a sign drawn by chance until it settles into its own.
 */
const WORDS_WAYS = [...WORD_BY_WORD_WAYS, 'letters', 'scramble'] as const;

export type WordsWay = (typeof WORDS_WAYS)[number];

export const A_WORDS_WAY: OneOf<WordsWay> = new OneOf(
	WORDS_WAYS,
	'how words come up: "rise", "sharp", "fade", "blur", "mask", "letters" or "scramble"'
);

export const A_WORD_BY_WORD_WAY: OneOf<WordByWordWay> = new OneOf(
	WORD_BY_WORD_WAYS,
	'how words come up word by word: "rise", "sharp", "fade", "blur" or "mask"'
);

/** How many words are on their way at once, as a film names it: more than none, a share of one as well, as 6.25. */
export const AN_AT_ONCE: Kind<number> = new Plain(
	isMoreThanNone,
	'how many words are on their way at once, more than 0'
);

/** A way words come up letter by letter, laid out one letter to an element. */
type LetterByLetterWay = Exclude<WordsWay, WordByWordWay>;

/**
 * How words come up: word by word in a way the stage draws by its name, so many on their way at once; letter by
 * letter, at an even pace, or out of signs; or typed, by the strokes of a person typing them. Words that come up letter
 * by letter are laid out so, so the stage knows them by a key of their own.
 */
export type ComingUp = WordByWord | LetterByLetter | Typed;

interface WordByWord {
	readonly kind: 'word by word';
	readonly way: WordByWordWay;
	readonly atOnce: number;
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

/** A word as the stage draws it: rising, how far it has come up and how far it has gone, each eased, from 0 to 1. */
interface RisingWord extends Word {
	readonly kind: 'word by word';
	readonly appeared: number;
	readonly gone: number;
}

/**
 * A word laid out letter by letter as the stage draws it: standing whole, how many of its letters stand, the space
 * before it first, whether the caret follows the last of them, and the sign each letter stands as before it settles
 * into its own, by its place in the word, none where it stands as itself; and how far it has gone, as all its words
 * have.
 */
interface LetteredWord extends Word {
	readonly kind: 'lettered';
	readonly appeared: number;
	readonly letters: number;
	readonly caret: boolean;
	readonly signs: readonly (string | null)[];
	readonly gone: number;
}

type DrawnWord = RisingWord | LetteredWord;

/**
 * Words as the stage draws them: each word's progress, the way they come up, which the stage draws by its name, and how
 * far their ground has come up.
 */
export interface DrawnWords {
	readonly words: readonly DrawnWord[];
	readonly key: string;
	readonly way: WordsWay | Typed['kind'];
	readonly ground: number;
}

/** A part of a run's text: a word's, or the space between two words. */
interface Stretch {
	readonly piece: Piece;
	readonly between: boolean;
}

/** How many words are on their way at once where a film names no pace, and lines of code always. */
export const ON_THEIR_WAY_AT_ONCE = 3;

// How much faster than the words their ground comes up
const GROUND_COMES_FASTER = 2;
// The whole of a word's own way, from which what is left of it is counted, to run its coming up back as it goes
const WHOLE_WAY = 1;
// Places among things that come one after another count from none, so the last's stands one short of their count
const ONE_SHORT = 1;
// A word laid out letter by letter stands whole, its letters shown one by one; and such words are laid out apart from
// the same words coming up word by word, one letter to an element, so the stage knows them by a key of their own, this
// before theirs
const STANDS_WHOLE = 1;
const LETTERED_KEY = 'lettered ';
// Typed words show a caret after the last letter typed; letters that come up of themselves show none
const CARET_FOLLOWS = true;
const NO_CARET = false;
// Scrambled letters: how many stand as signs ahead of the last settled, how many signs are drawn a second, whatever the
// film's rate, the signs one may be, and the odd number a letter's place is mixed by, so each letter draws signs of its
// own; and how far short of a whole draw a moment carried in floating point may land and still count as it
const SIGNS_AHEAD = 6;
const SIGNS_A_SECOND = 15;
const A_HAIR_SHORT = 1e-9;
const SIGNS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+=?';
const SIGN_MIXING_ODD = 0x9e3779b1;
// No sign: a letter standing as itself
const AS_ITSELF = null;
// Where a run's text breaks between words, the break kept; what of a break is not a line break the film wrote; and the
// space a break holding none is set as, however it was written
const BETWEEN_WORDS = /(\s+)/;
const NOT_A_LINE_BREAK = /[^\n]/g;
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
			// A space before any word is none
			if (pieces.length > 0) spaceAfter = spaceBetween(spaceAfter, stretch.piece);
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

/** What a film says coming up in a way it names, word by word at the pace a film names none. */
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
			return wordByWordAt(way, ON_THEIR_WAY_AT_ONCE);
	}
}

/** Words coming up word by word in a way, so many on their way at once. */
export function wordByWordAt(way: WordByWordWay, atOnce: number): ComingUp {
	return { kind: 'word by word', way, atOnce };
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

/** Words as the stage draws them at a moment of the film, coming up and going as they do. */
export function drawnWords(shown: ShownWords, comingUp: ComingUp, moment: number): DrawnWords {
	const ground = groundOf(shown.shown, shown.gone);
	switch (comingUp.kind) {
		case 'word by word': {
			const words = risingWords(shown, comingUp.atOnce);
			return { words, key: shown.key, way: comingUp.way, ground };
		}
		case 'letters': {
			const words = letteredWords(shown, shown.shown * lettersIn(shown.words), NO_CARET, standingAsItself);
			return { words, key: comingUp.key, way: comingUp.kind, ground };
		}
		case 'scramble': {
			const words = scrambledWords(shown, moment);
			return { words, key: comingUp.key, way: comingUp.kind, ground };
		}
		case 'typed': {
			const typed = keysStruckAlong(comingUp.strokes, shown.shown);
			const words = letteredWords(shown, typed, CARET_FOLLOWS, standingAsItself);
			return { words, key: comingUp.key, way: comingUp.kind, ground };
		}
	}
}

/** Words rising one after another and going so, as far as they have come up and gone, `atOnce` on their way at once. */
function risingWords(shown: ShownWords, atOnce: number): readonly DrawnWord[] {
	const count = shown.words.length;
	return shown.words.map((word, place): DrawnWord => ({
		...word,
		kind: 'word by word',
		appeared: appearedOf(shown.shown, place, count, atOnce),
		gone: goneOf(shown.gone, place, count, atOnce)
	}));
}

/**
 * Words laid out letter by letter as so many of their letters stand, counted from the first: each word whole, as many
 * of its letters as fall to it, the caret after the last letter standing where one follows, until every letter stands,
 * and the sign each letter stands as, by `signOf` its place among all and the letter; every word gone as far as all
 * have.
 */
function letteredWords(
	shown: ShownWords,
	standing: number,
	caretFollows: boolean,
	signOf: (place: number, letter: string) => string | null
): readonly DrawnWord[] {
	const coming = standing < lettersIn(shown.words);
	const gone = shown.gone;
	const drawn: DrawnWord[] = [];
	let firstLetter = 0;
	for (const word of shown.words) {
		const letters = lettersOfWord(word);
		const stands = Math.min(letters.length, Math.max(0, standing - firstLetter));
		const caret = caretFollows && coming && standing > firstLetter && standing <= firstLetter + letters.length;
		const signs = letters.map((letter, place) => signOf(firstLetter + place, letter));
		drawn.push({ ...word, kind: 'lettered', appeared: STANDS_WHOLE, letters: stands, caret, signs, gone });
		firstLetter += letters.length;
	}
	return drawn;
}

/**
 * Words scrambled, as far as they have come up, at a moment of the film: their letters come up one after another, each
 * standing as a sign drawn by chance, `SIGNS_A_SECOND` new ones a second, and settle into their own
 * `SIGNS_AHEAD` letters behind, so the last settles as the way ends. The words' key seeds the signs, so other words
 * draw signs of their own.
 */
function scrambledWords(shown: ShownWords, moment: number): readonly DrawnWord[] {
	const standing = shown.shown * (lettersIn(shown.words) + SIGNS_AHEAD);
	const settled = standing - SIGNS_AHEAD;
	const draw = Math.floor(moment * SIGNS_A_SECOND + A_HAIR_SHORT) + seedOf(shown.key);
	return letteredWords(shown, standing, NO_CARET, (place, letter) => signAt(place, letter, settled, draw));
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
 * `shown` of the way, `atOnce` of them on their way at once.
 */
export function appearedOf(shown: number, place: number, count: number, atOnce: number): number {
	return easeOutCubic(alongItsOwnWay(shown, place, count, atOnce));
}

/**
 * How far one of `count` words that go one after another has gone, the whole `gone` of the way, `atOnce` of them on
 * their way at once: as it came up, run back.
 */
function goneOf(gone: number, place: number, count: number, atOnce: number): number {
	return WHOLE_WAY - easeOutCubic(WHOLE_WAY - alongItsOwnWay(gone, place, count, atOnce));
}

/**
 * How far along its own way one of `count` things that come or go one after another is, the whole `progress` along:
 * each sets off a step after the one before and takes `atOnce` steps, so it sets off as the one `atOnce` before it
 * arrives, the first sets off as the whole does and the last arrives as it does.
 */
function alongItsOwnWay(progress: number, place: number, count: number, atOnce: number): number {
	const steps = count - ONE_SHORT + atOnce;
	return shareOf(progress, place / steps, atOnce / steps);
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
	return { piece: pieceOf(run, between ? spaceSetFor(part) : part), between };
}

/** What a break between words is set as: the line breaks the film wrote in it, as many as it wrote, or a space. */
function spaceSetFor(written: string): string {
	const lineBreaks = written.replace(NOT_A_LINE_BREAK, '');
	return lineBreaks === '' ? SPACE : lineBreaks;
}

/**
 * Of two spaces written one after the other between two words, in two runs, the one set between them: the first,
 * unless the later breaks the line where the first does not.
 */
function spaceBetween(first: Piece | null, later: Piece): Piece {
	return first === null || (breaksTheLine(later) && !breaksTheLine(first)) ? later : first;
}

function breaksTheLine(space: Piece): boolean {
	return space.text !== SPACE;
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
