/**
 * Notes: words on the ground across from the page's window, a line drawn from them to a block in it, in place of any
 * note shown, and going. The block is read as the move's share begins, what the screen shows of it, as a callout's
 * is; a note with no window to stand beside is refused there. While it stands, the camera keeps the window where it
 * is (`src/moves/camera.ts`).
 */
import { FilmError } from '../domain/errors.ts';
import { assertKind, assertWritten, A_SELECTOR } from '../domain/handed.ts';
import { besideTheWindowOn } from '../domain/split.ts';
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

// A note names one block: the first a selector matches
const THE_FIRST = 1;

/** A note coming up on the ground across from the window, its line drawn to the block a selector matches, then its words. */
export function show(target: string, text: Wording, script: TimingScript = {}): Move {
	assertKind(target, A_SELECTOR, "note.show's selector");
	assertKind(text, A_WORDING, "note.show's text");
	assertWritten(script, TIMING_FORM, 'note.show');
	const said = saidOf(text);
	return {
		part: 'note',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => naming(beginning, target, said)
	};
}

/** The note on the screen going, its line with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'note.hide');
	return { part: 'note', timing: timingOf(script), begin: (beginning) => going('note', beginning) };
}

async function naming(beginning: Beginning, target: string, said: Said): Promise<Change> {
	const windowSide = beginning.scene.camera.view.side;
	if (windowSide === null) {
		throw new FilmError(
			"note.show's note stands beside the page's window, but the page fills the frame: frame it in a window first, with camera.onto(selector, { side })"
		);
	}
	const box = await shownPart(beginning, target, THE_FIRST, 'note.show');
	const beside = besideTheWindowOn(beginning.format, windowSide);
	return propChange('note', (progress) => ({ ...said, box, beside, shown: progress, gone: 0 }));
}
