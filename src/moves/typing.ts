/**
 * How a film writes a typing, into the page or into the terminal, as both moves take it: its timing, and the keyboard
 * its keys are heard on where it is not the film's.
 */
import type { Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript } from '../direction/move.ts';
import { A_KEYBOARD, type KeyboardSound } from '../direction/sound.ts';

/** A typing's timing, and the keyboard its keys are heard on where it is not the film's. */
export interface TypingScript extends TimingScript {
	readonly keyboard?: KeyboardSound;
}

export const TYPING_FORM: Form<TypingScript> = { keyboard: A_KEYBOARD, ...TIMING_FORM };
