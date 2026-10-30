/**
 * Notes: words on the ground beside the page's window, a line drawn from them to a block in it, in place of any note
 * shown, and going. The block is read as the move's share begins, what the screen shows of it, as a callout's is, and
 * the words' place with it: the film's, or the words' share on the side of the frame clearest of the window. The
 * words stand beyond the window on one side of it, where the line meets them; a note beside a window off the frame,
 * or whose words would stand over the window, as they do while the page fills the frame, is refused there. While it
 * stands the window may move: the words keep beside it (`src/props/note.ts`).
 */
import { FilmError } from '../domain/errors.ts';
import { liesOutside } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, placesNamed, sideBeyond, sideClearestOf, wordsPlaced } from '../domain/place.ts';
import { linear } from '../domain/time.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type Target,
	type TimingScript,
	propChange,
	shownPart,
	timingOf
} from '../direction/move.ts';
import type { Beside } from '../props/note.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/** A note's words stand `at` a place beyond the window, or in the words' share clearest of it where none is named. */
export interface NoteScript extends TimingScript {
	readonly at?: Place;
}

const NOTE_FORM: Form<NoteScript> = { at: A_PLACE, ...TIMING_FORM };
// A note names one block: the first a selector matches
const THE_FIRST = 1;

/**
 * A note coming up on the ground beside the window, its line drawn to the block a selector matches, or a box of the
 * screen, then its words.
 */
export function show(target: Target, text: Wording, script: NoteScript = {}): Move {
	assertKind(target, A_TARGET, "note.show's target");
	assertKind(text, A_WORDING, "note.show's text");
	assertWritten(script, NOTE_FORM, 'note.show');
	const said = saidOf(text);
	const at = script.at ?? null;
	return {
		part: 'note',
		timing: timingOf({ ease: linear, ...script }),
		places: placesNamed("note.show's at", at),
		begin: (beginning) => naming(beginning, target, said, at)
	};
}

/** The note on the screen going, its line with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'note.hide');
	return { part: 'note', timing: timingOf(script), begin: (beginning) => going('note', beginning) };
}

async function naming(beginning: Beginning, target: Target, said: Said, at: Place | null): Promise<Change> {
	const beside = besideTheWindow(beginning, at);
	const box = await shownPart(beginning, target, THE_FIRST, 'note.show');
	return propChange('note', (progress) => ({ ...said, box, beside, shown: progress, gone: 0 }));
}

/**
 * Where the words stand beside the window: at the film's place, or in the words' share clearest of the window; refused
 * where they would stand over it.
 */
function besideTheWindow(beginning: Beginning, at: Place | null): Beside {
	// Where the window stands, or goes while it moves
	const window = beginning.scene.window.box.to;
	if (liesOutside(window, beginning.format.frame)) {
		throw new FilmError(
			"note.show's note stands beside the page's window, but the window is off the frame: bring it in first, with window.show({ at, from })"
		);
	}
	const box = wordsPlaced(beginning.format, at ?? sideClearestOf(beginning.format, window));
	const side = sideBeyond(box, window);
	if (side === null) {
		throw new FilmError(
			"note.show's words stand over the page's window: move the page into a window beside them first, with window.to(place), or name a place clear of it, with { at }"
		);
	}
	return { side, box, window };
}
