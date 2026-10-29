/**
 * Notes: words on the ground beside the page's window, a line drawn from them to a block in it, in place of any note
 * shown, and going. The block is read as the move's share begins, what the screen shows of it, as a callout's is.
 */
import { A_SELECTOR, type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_FRAME_SIDE, type FrameSide } from '../domain/split.ts';
import { linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	shownPart,
	timingOf
} from '../direction/move.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** The side of the page's window a note stands on. */
export interface NoteScript extends TimingScript {
	readonly side: FrameSide;
}

const NOTE_FORM: Form<NoteScript> = { side: needed(A_FRAME_SIDE), ...TIMING_FORM };
// A note names one block: the first a selector matches
const THE_FIRST = 1;

/** A note coming up beside the window on its side, its line drawn to the block a selector matches, then its words. */
export function show(target: string, text: Wording, script: NoteScript): Move {
	assertKind(target, A_SELECTOR, "note.show's selector");
	assertKind(text, A_WORDING, "note.show's text");
	assertWritten(script, NOTE_FORM, 'note.show');
	const said = saidOf(text);
	return {
		part: 'note',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => naming(beginning, target, said, script.side)
	};
}

/** The note on the screen going, its line with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'note.hide');
	return { part: 'note', timing: timingOf(script), begin: (beginning) => going('note', beginning) };
}

async function naming(beginning: Beginning, target: string, said: Said, side: FrameSide): Promise<Change> {
	const box = await shownPart(beginning, target, THE_FIRST, 'note.show');
	return propChange('note', (progress) => ({ ...said, box, side, shown: progress, gone: 0 }));
}
