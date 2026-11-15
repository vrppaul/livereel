/**
 * How a film writes a typing, into the page or into the terminal, as both moves take it: its timing, and the keyboard
 * its keys are heard on where it is not the film's. A slip is not theirs to make: what is typed is what the film says,
 * letter for letter; and how fast it is typed is the move's.
 */
import { type Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';
import { A_KEYBOARD, type KeyboardSound } from '../direction/sound.ts';

/** A typing's timing, and the keyboard its keys are heard on where it is not the film's. */
export interface TypingScript extends TimingScript {
	/**
	 * The keyboard the typing's keys are heard on whatever the film says of its keys, even where the film turns its
	 * sounds off, so one film may be heard on several keyboards; the film's where none is named.
	 */
	readonly keyboard?: KeyboardSound;
}

export const TYPING_FORM: Form<TypingScript> = { keyboard: A_KEYBOARD, ...TIMING_FORM };
