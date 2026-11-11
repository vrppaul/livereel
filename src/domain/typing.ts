/**
 * Typing: a person's keys at uneven times, a breath now and then, a wrong key rubbed out; or keys at an even pace.
 *
 * Typing at an even pace reads as a machine, so a person's rhythm is livereel's way; a film keeps the even pace for a
 * cut that types on a beat, as the claude-review promo types its command at twelve letters a second. A person's times
 * are drawn from a seed by a generator of livereel's own (`src/domain/chance.ts`, its gaps lognormal by Box–Muller), so
 * a film typed twice is typed the same on any Node.
 */
import { Chance } from './chance.ts';
import {
	A_NUMBER,
	A_STRING,
	FormByName,
	type Kind,
	ListOf,
	OfForm,
	Plain,
	assertKind,
	isMoreThanNone,
	needed
} from './handed.ts';

/** A moment of the typing, in seconds from its start, and what then stands typed. */
export interface Keystroke {
	readonly at: number;
	readonly typed: string;
}

/**
 * Text typed into a block of a page of the film's own, as the stage writes it and a page is measured with it: the
 * block's selector, and the text.
 */
export interface TypedText {
	readonly into: string;
	readonly text: string;
}

/** How a text is typed: by a person, or evenly. */
export type Typist = Person | EvenTypist;

/** A person typing: the seed their rhythm is drawn from, a slip on one letter, and how slowly (1 is usual). */
interface Person {
	readonly seed: number;
	readonly slipAt?: number;
	readonly pace?: number;
}

/** Keys struck evenly, so many letters a second, the first that long after the typing starts. */
interface EvenTypist {
	readonly lettersPerSecond: number;
}

/** Keystrokes as a film hands them to what types them, made by `keystrokes` or written out. */
export const A_STROKES: Kind<readonly Keystroke[]> = new ListOf(
	new OfForm<Keystroke>({ at: needed(A_NUMBER), typed: needed(A_STRING) }, 'a keystroke: { at, typed }'),
	'keystrokes, as keystrokes() gives them'
);
// How a film says who types: evenly where it names letters a second, a person otherwise
const EVENLY = 'lettersPerSecond';
const A_TYPIST: Kind<Typist> = new FormByName<Typist>(
	[
		[
			EVENLY,
			new OfForm<EvenTypist>(
				{ lettersPerSecond: needed(new Plain(isMoreThanNone, 'letters a second, more than 0')) },
				'an even typist: { lettersPerSecond }'
			)
		]
	],
	new OfForm<Person>({ seed: needed(A_NUMBER), slipAt: A_NUMBER, pace: A_NUMBER }, 'a person: { seed, slipAt, pace }'),
	'a typist: a person, { seed, slipAt, pace }, or an even one, { lettersPerSecond }'
);

// The usual time between two keys, how unevenly they come, the start of a word a little slower, a longer breath now
// and then, and how long a wrong key stands before it is rubbed out
const KEY_SECONDS = 0.085;
const KEY_SPREAD = 0.45;
const WORD_START_SLOWER = 1.6;
const BREATH_CHANCE = 0.08;
const BREATH_SECONDS = 0.22;
const SLIP_STANDS_SECONDS = 0.3;
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const SPACE = ' ';
// Box–Muller: a normal draw is the square root of minus twice the log of one uniform draw, turned by another
const BOX_MULLER_SCALE = -2;
const HALF_TURNS = 2;
const FULL_TURN = HALF_TURNS * Math.PI;
// A letter as a person types it: what one key gives, an accented letter or an emoji whole
const LETTERS = new Intl.Segmenter();
// The last of a list, counted from its end
const LAST = -1;
// An even typist's first letter is the first struck, a count from one where a list's places count from none
const FIRST_STRUCK = 1;
// The progress a typing begins at
const AS_IT_BEGINS = 0;

/** The text typed by a person, with `slipAt` a slip on that letter rubbed out; or evenly, so many letters a second. */
export function keystrokes(text: string, typist: Typist): readonly Keystroke[] {
	assertKind(text, A_STRING, "keystrokes's text");
	assertKind(typist, A_TYPIST, 'keystrokes');
	const letters = lettersOf(text);
	return EVENLY in typist ? evenStrokes(letters, typist.lettersPerSecond) : personsStrokes(letters, typist);
}

/** Letters struck one at each share of a second, so many a second, the first a share after the typing starts. */
function evenStrokes(letters: readonly string[], lettersPerSecond: number): readonly Keystroke[] {
	return letters.map((_letter, index) => ({
		at: (index + FIRST_STRUCK) / lettersPerSecond,
		typed: letters.slice(0, index + FIRST_STRUCK).join('')
	}));
}

/** Letters struck by a person: at the times their rhythm draws, a slip on one letter rubbed out. */
function personsStrokes(letters: readonly string[], typist: Person): readonly Keystroke[] {
	const rhythm = new Rhythm(typist.seed);
	const pace = typist.pace ?? 1;
	const strokes: Keystroke[] = [];
	let moment = 0;
	let typed = '';
	for (const [index, letter] of letters.entries()) {
		const gap = rhythm.gap(letters[index - 1] === SPACE) * pace;
		// A letter on no row of the keyboard has no key beside it to slip to
		const slip = beside(letter);
		if (index === typist.slipAt && slip !== letter) {
			moment += gap;
			strokes.push({ at: moment, typed: typed + slip });
			moment += SLIP_STANDS_SECONDS;
			strokes.push({ at: moment, typed });
		}
		moment += gap;
		typed += letter;
		strokes.push({ at: moment, typed });
	}
	return strokes;
}

/** A text's letters as a person types them, each what one key gives: an accented letter or an emoji whole. */
export function lettersOf(text: string): readonly string[] {
	return Array.from(LETTERS.segment(text), (part) => part.segment);
}

/** What stands typed at a moment of the typing. */
export function typedBy(strokes: readonly Keystroke[], moment: number): string {
	return strokes.findLast((stroke) => stroke.at <= moment)?.typed ?? '';
}

/** How long the typing takes: until its last key. */
export function typingSeconds(strokes: readonly Keystroke[]): number {
	return strokes.at(LAST)?.at ?? 0;
}

/** What stands typed `progress` of the way through the typing, from 0 to 1. */
export function typedAlong(strokes: readonly Keystroke[], progress: number): string {
	return typedBy(strokes, progress * typingSeconds(strokes));
}

/** Every text that stands typed at some point of the typing, each once: what stands as it begins, then each key's. */
export function textsTypedAlong(strokes: readonly Keystroke[]): readonly string[] {
	return [...new Set([typedAlong(strokes, AS_IT_BEGINS), ...strokes.map((stroke) => stroke.typed)])];
}

/** How many keys are struck `progress` of the way through the typing, from 0 to 1. */
export function keysStruckAlong(strokes: readonly Keystroke[], progress: number): number {
	const moment = progress * typingSeconds(strokes);
	return strokes.filter((stroke) => stroke.at <= moment).length;
}

/** The key beside a letter, where a finger slips to, in the letter's case; a key on no row slips nowhere. */
function beside(letter: string): string {
	const key = letter.toLowerCase();
	const row = KEYBOARD_ROWS.find((keys) => keys.includes(key));
	if (row === undefined) return letter;
	const slipped = row.charAt((row.indexOf(key) + 1) % row.length);
	return letter === key ? slipped : slipped.toUpperCase();
}

/** The seeded draws a typing's rhythm is made of. */
class Rhythm {
	private readonly chance: Chance;

	constructor(seed: number) {
		this.chance = new Chance(seed);
	}

	/** The time before a key: the usual one, more or less, slower at a word's start, now and then a breath. */
	gap(startsAWord: boolean): number {
		const usual = KEY_SECONDS * Math.exp(KEY_SPREAD * this.normal());
		const atItsPace = startsAWord ? usual * WORD_START_SLOWER : usual;
		return this.chance.uniform() < BREATH_CHANCE ? atItsPace + BREATH_SECONDS : atItsPace;
	}

	private normal(): number {
		const first = 1 - this.chance.uniform();
		return Math.sqrt(BOX_MULLER_SCALE * Math.log(first)) * Math.cos(FULL_TURN * this.chance.uniform());
	}
}
