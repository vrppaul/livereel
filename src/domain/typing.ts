/**
 * A person typing: keys at uneven times, a breath now and then, a wrong key rubbed out.
 *
 * Typing at an even pace reads as a machine. The times are drawn from a seed by a generator of livereel's own
 * (`src/domain/chance.ts`, its gaps lognormal by Box–Muller), so a film typed twice is typed the same on any Node.
 */
import { Chance } from './chance.ts';
import {
	A_NUMBER,
	A_STRING,
	type Form,
	type Kind,
	ListOf,
	OfForm,
	assertKind,
	assertWritten,
	needed
} from './handed.ts';

/** A moment of the typing, in seconds from its start, and what then stands typed. */
export interface Keystroke {
	readonly at: number;
	readonly typed: string;
}

/** How a text is typed: the seed its rhythm is drawn from, a slip on one letter, and how slowly (1 is usual). */
export interface Typist {
	readonly seed: number;
	readonly slipAt?: number;
	readonly pace?: number;
}

/** Keystrokes as a film hands them to what types them, made by `keystrokes` or written out. */
export const A_STROKES: Kind<readonly Keystroke[]> = new ListOf(
	new OfForm<Keystroke>({ at: needed(A_NUMBER), typed: needed(A_STRING) }, 'a keystroke: { at, typed }'),
	'keystrokes, as keystrokes() gives them'
);
const TYPIST_FORM: Form<Typist> = { seed: needed(A_NUMBER), slipAt: A_NUMBER, pace: A_NUMBER };

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

/** The text typed by a person; with `slipAt`, a slip on that letter, rubbed out. */
export function keystrokes(text: string, typist: Typist): readonly Keystroke[] {
	assertKind(text, A_STRING, "keystrokes's text");
	assertWritten(typist, TYPIST_FORM, 'keystrokes');
	const rhythm = new Rhythm(typist.seed);
	const pace = typist.pace ?? 1;
	const strokes: Keystroke[] = [];
	let moment = 0;
	let typed = '';
	const letters = lettersOf(text);
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
