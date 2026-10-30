/**
 * How a film writes a typing, into the page or into the terminal, as both moves take it: its timing, and the keyboard
 * its keys are heard on where it is not the film's; and how it has a title's or a caption's words typed as they come
 * up, by a person whose rhythm is drawn from a seed, spread over the move's share, each key heard. A slip is not
 * theirs to make: words typed are what the film says, letter for letter; and how fast they are typed is the move's.
 */
import { A_NUMBER, type Form, type Kind, OfForm, needed } from '../domain/handed.ts';
import { keystrokes } from '../domain/typing.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';
import { A_KEYBOARD, type Cue, type KeyboardSound, keysHeard } from '../direction/sound.ts';
import { type ComingUp, type Said, WORD_BY_WORD, plainTextOf, typedComingUp } from '../props/words.ts';

/** A typing's timing, and the keyboard its keys are heard on where it is not the film's. */
export interface TypingScript extends TimingScript {
	readonly keyboard?: KeyboardSound;
}

/**
 * How words are typed as they come up: the seed the typist's rhythm is drawn from, and the keyboard the keys are heard
 * on where it is not the film's.
 */
export interface WordsTypedScript {
	readonly seed: number;
	readonly keyboard?: KeyboardSound;
}

/** How words come up, and the key heard for every stroke where they are typed; none heard where they rise. */
export interface WordsComing {
	readonly comingUp: ComingUp;
	readonly sounds: readonly Cue[];
}

export const TYPING_FORM: Form<TypingScript> = { keyboard: A_KEYBOARD, ...TIMING_FORM };

/** How a film has words typed, as it hands it. */
export const WORDS_TYPED: Kind<WordsTypedScript> = new OfForm<WordsTypedScript>(
	{ seed: needed(A_NUMBER), keyboard: A_KEYBOARD },
	'how its words are typed: { seed, keyboard }'
);

// Words that come up word by word make no sound
const UNHEARD: readonly Cue[] = [];

/** What a film says coming up typed as the film has it typed, each key heard; word by word where it has none typed. */
export function wordsComing(said: Said, script: WordsTypedScript | undefined): WordsComing {
	if (script === undefined) return { comingUp: WORD_BY_WORD, sounds: UNHEARD };
	const strokes = keystrokes(plainTextOf(said), { seed: script.seed });
	return { comingUp: typedComingUp(said, strokes), sounds: keysHeard(strokes, script.keyboard) };
}
