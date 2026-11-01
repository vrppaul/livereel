/**
 * What the moves of words that come up one after another and go do alike: how a film has a title's or a caption's
 * words come up, `words`, in a way by its name (`src/props/words.ts`), or typed by a person whose rhythm is drawn from
 * a seed, spread over the move's share, each key heard; in the theme's way where it names none, read as the words come,
 * as a callout's and a note's always come; and a callout's or a note's words going.
 *
 * Words come up in their way only where the object showing them comes up in its place in its own way: one that slides
 * in or comes up in a way of livereel's brings them whole.
 */
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import type { FrameSide } from '../domain/geometry.ts';
import { A_NUMBER, type Kind, NameOrForm, OfForm, needed } from '../domain/handed.ts';
import { keystrokes } from '../domain/typing.ts';
import { type Beginning, type Change, present, propChange, untilTheEnd } from '../direction/move.ts';
import { A_KEYBOARD, type Cue, type KeyboardSound, keysHeard } from '../direction/sound.ts';
import type { Look } from '../props/look.ts';
import type { WayName } from '../props/way.ts';
import {
	A_WORDS_WAY,
	type ComingUp,
	type Said,
	type WordsWay,
	comingUpIn,
	plainTextOf,
	typedComingUp
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

/** How a film has words come up: in a way by its name, or typed. */
export type WordsScript = WordsWay | TypedScript;

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

/** How a film has words come up, as it hands it. */
export const A_WORDS_SCRIPT: Kind<WordsScript> = new NameOrForm(
	A_WORDS_WAY,
	new OfForm<TypedScript>({ typed: needed(WORDS_TYPED) }, 'words typed: { typed: { seed, keyboard } }'),
	`${A_WORDS_WAY.said}, or typed, { typed: { seed, keyboard } }`
);

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

/** What a film says coming up in the way it names, typed, each key heard, or in the theme's where it names none. */
export function wordsComing(said: Said, script: WordsScript | undefined): WordsComing {
	if (script === undefined) return { chosen: THE_THEMES, sounds: UNHEARD };
	if (typeof script === 'string')
		return { chosen: { kind: 'named', comingUp: comingUpIn(script, said) }, sounds: UNHEARD };
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
