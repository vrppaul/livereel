/**
 * What the moves of words that come up one after another and go do alike: how a film has a title's or a caption's
 * words come up, `words`, in a way by its name (`src/props/words.ts`), word by word with as many on their way at once
 * as it names, or typed by a person whose rhythm is drawn from a seed, spread over the move's share, each key heard; in
 * the theme's way where it names none, read as the words come, as a callout's and a note's always come; how a title's
 * or a caption's words go, at the pace a hide names or the one they came at; and a callout's or a note's words going.
 *
 * Words come up in their way only where the object showing them comes up in its place in its own way: one that slides
 * in or comes up in a way of livereel's brings them whole, and one that slides out or goes in a way takes them whole.
 */
import { linear } from '../domain/curves.ts';
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import type { FrameSide } from '../domain/geometry.ts';
import { A_NUMBER, FormByName, type Kind, NameOrForm, OfForm, needed } from '../domain/handed.ts';
import { keystrokes } from '../domain/typing.ts';
import { type Beginning, type Change, present, propChange, untilTheEnd } from '../direction/move.ts';
import { A_KEYBOARD, type Cue, type KeyboardSound, keysHeard } from '../direction/sound.ts';
import type { Look } from '../props/look.ts';
import type { WayName } from '../props/way.ts';
import {
	AN_AT_ONCE,
	A_WORDS_WAY,
	A_WORD_BY_WORD_WAY,
	type ComingUp,
	type Said,
	type WordByWordWay,
	type WordsWay,
	comingUpIn,
	plainTextOf,
	typedComingUp,
	wordByWordAt
} from '../props/words.ts';

/** The props whose words come up one after another (`src/props/words.ts`). */
type ComingUpProp = 'callout' | 'note';

/**
 * How words are typed as they come up: the seed the typist's rhythm is drawn from, and the keyboard the keys are heard
 * on where it is not the film's.
 */
interface WordsTypedScript {
	readonly seed: number;
	readonly keyboard?: KeyboardSound;
}

/** Words typed as they come up, and how. */
interface TypedScript {
	readonly typed: WordsTypedScript;
}

/** Words coming up word by word in a way by its name, so many of them on their way at once. */
interface PacedScript {
	readonly way: WordByWordWay;
	readonly atOnce: number;
}

/** How a film has words come up: in a way by its name, word by word at a pace, or typed. */
export type WordsScript = WordsWay | PacedScript | TypedScript;

/** How words go, as a hide names it: how many of them are on their way at once. */
export interface WordsGoingScript {
	readonly atOnce: number;
}

/** What shows words and holds how they came up, which is how they go. */
interface WordsShown {
	readonly comingUp: ComingUp;
}

/** How words go as a hide names it, and what would take them whole: a slide, a way of livereel's. */
interface WordsTakenWhole {
	readonly words?: WordsGoingScript;
	readonly toward?: FrameSide;
	readonly leave?: WayName;
}

/** How words come up as a show names it, and what would bring them whole: a slide, a way of livereel's. */
interface WordsBroughtWhole {
	readonly words?: WordsScript;
	readonly from?: FrameSide;
	readonly enter?: WayName;
}

/** How words come up as a show names it: in the way the film names, worked out as the move is made, or the theme's. */
type WaysChosen = { readonly kind: 'named'; readonly comingUp: ComingUp } | { readonly kind: 'theme' };

/**
 * How words come up, the theme's way read as they come where the film names none; and the key heard for every stroke
 * where they are typed, none heard where they are not.
 */
export interface WordsComing {
	readonly chosen: WaysChosen;
	readonly sounds: readonly Cue[];
}

const WORDS_TYPED: Kind<WordsTypedScript> = new OfForm<WordsTypedScript>(
	{ seed: needed(A_NUMBER), keyboard: A_KEYBOARD },
	'how its words are typed: { seed, keyboard }'
);

// How a refusal says every form of words a film may hand
const WORDS_SAID = `${A_WORDS_WAY.said}, or typed, { typed: { seed, keyboard } }, or word by word at a pace, { way, atOnce }`;

/** How a film has words come up, as it hands it: an object naming `typed` is typed, any other paced. */
export const A_WORDS_SCRIPT: Kind<WordsScript> = new NameOrForm(
	A_WORDS_WAY,
	new FormByName<PacedScript | TypedScript>(
		[['typed', new OfForm<TypedScript>({ typed: needed(WORDS_TYPED) }, 'words typed: { typed: { seed, keyboard } }')]],
		new OfForm<PacedScript>(
			{ way: needed(A_WORD_BY_WORD_WAY), atOnce: needed(AN_AT_ONCE) },
			'words word by word at a pace: { way, atOnce }'
		),
		WORDS_SAID
	),
	WORDS_SAID
);

/** How a film has words go, as it hands it. */
export const A_WORDS_GOING: Kind<WordsGoingScript> = new OfForm<WordsGoingScript>(
	{ atOnce: needed(AN_AT_ONCE) },
	'how its words go: { atOnce }'
);

/**
 * The curve a title's or a caption's words come up and go on in their own way where the film names none: one after
 * another at an even pace.
 */
export const WORDS_COME_AND_GO_ON = linear;

// Words that come up of themselves make no sound; and words a film names no way for come up in the theme's, read as
// they come
const UNHEARD: readonly Cue[] = [];
const THE_THEMES: WaysChosen = { kind: 'theme' };

/**
 * Refuses words named to come up in a way where the object showing them comes whole: sliding in from a side, or in a
 * way of livereel's.
 */
export function refuseWordsBroughtWhole(script: WordsBroughtWhole, move: string): void {
	if (script.words === undefined) return;
	if (script.from !== undefined) {
		throw new FilmError(`${move} slides in whole from a side, its words with it: it names no way for its words`);
	}
	if (script.enter !== undefined) {
		throw new FilmError(`${move} comes up whole in a way, its words with it: it names no way for its words`);
	}
}

/**
 * Refuses a pace named for words to go at where the object showing them goes whole: sliding out toward a side, or in a
 * way of livereel's.
 */
export function refuseWordsTakenWhole(script: WordsTakenWhole, move: string): void {
	if (script.words === undefined) return;
	if (script.toward !== undefined) {
		throw new FilmError(`${move} slides out whole toward a side, its words with it: it names no pace for its words`);
	}
	if (script.leave !== undefined) {
		throw new FilmError(`${move} goes whole in a way, its words with it: it names no pace for its words`);
	}
}

/**
 * What shows words as it sets off going, a title or a caption: as it stood, its words going at the pace the hide
 * names, or the one they came at.
 */
export function setOffGoing<Shown extends WordsShown>(
	shown: Shown,
	script: WordsGoingScript | undefined,
	move: string
): Shown {
	return { ...shown, comingUp: wordsGoingAt(shown.comingUp, script, move) };
}

/**
 * How words that stand go, read as their going begins: word by word at the pace the hide names, or at the one they
 * came at where it names none; words laid out by letters go together, and a pace named for them is refused.
 */
function wordsGoingAt(comingUp: ComingUp, script: WordsGoingScript | undefined, move: string): ComingUp {
	if (script === undefined) return comingUp;
	switch (comingUp.kind) {
		case 'word by word':
			return wordByWordAt(comingUp.way, script.atOnce);
		case 'letters':
		case 'scramble':
		case 'typed':
			throw new FilmError(`${move} names a pace for words that came letter by letter: they go together`);
	}
}

/**
 * What a film says coming up in the way it names, word by word at the pace it names, typed, each key heard, or in the
 * theme's where it names none.
 */
export function wordsComing(said: Said, script: WordsScript | undefined): WordsComing {
	if (script === undefined) return { chosen: THE_THEMES, sounds: UNHEARD };
	if (typeof script === 'string')
		return { chosen: { kind: 'named', comingUp: comingUpIn(script, said) }, sounds: UNHEARD };
	if ('way' in script)
		return { chosen: { kind: 'named', comingUp: wordByWordAt(script.way, script.atOnce) }, sounds: UNHEARD };
	const strokes = keystrokes(plainTextOf(said), { seed: script.typed.seed });
	const comingUp = typedComingUp(said, strokes);
	return { chosen: { kind: 'named', comingUp }, sounds: keysHeard(strokes, script.typed.keyboard) };
}

/** How words come up as they come, in the look they come in: as the film named, or the theme's. */
export function comingUpAt(coming: WordsComing, said: Said, look: Look): ComingUp {
	switch (coming.chosen.kind) {
		case 'named':
			return coming.chosen.comingUp;
		case 'theme':
			return comingUpIn(look.words, said);
	}
}

/** Words on the scene going; once gone, there are none. */
export function going(prop: ComingUpProp, beginning: Beginning): Change {
	const shown = present(beginning, prop, `${prop}.hide() hides what is not on the screen`);
	return propChange(prop, (progress) => untilTheEnd(progress, { ...shown, gone: fractionOf(progress) }));
}
