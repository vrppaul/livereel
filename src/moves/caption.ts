/**
 * Captions, shown by an object (`src/moves/object.ts`) over the whole frame: words that come up one after another at
 * the frame's foot, or its top where the format puts them there, in place of any on the screen, and go. A caption is
 * the object named `caption`, one alone, standing where it comes up: it takes no name and never slides, so keys always
 * know where it stands.
 */
import { boxOf } from '../domain/geometry.ts';
import { assertKind, assertWritten } from '../domain/handed.ts';
import { type Move, TIMING_FORM, type TimingScript } from '../direction/move.ts';
import { captionOf } from '../props/caption.ts';
import { A_WORDING, type Wording, saidOf } from '../props/words.ts';
import { type ObjectKind, objectHide, objectShow } from './object.ts';

const CAPTION: ObjectKind = 'caption';

/** A caption coming up word by word; its words come up at an even pace unless the film names a curve. */
export function show(text: Wording, script: TimingScript = {}): Move {
	assertKind(text, A_WORDING, "caption.show's text");
	assertWritten(script, TIMING_FORM, 'caption.show');
	const said = saidOf(text);
	return objectShow(CAPTION, 'caption.show', script, null, (beginning) => ({
		content: captionOf(said, beginning.format),
		box: boxOf(beginning.format.frame)
	}));
}

/** The caption on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'caption.hide');
	return objectHide(CAPTION, 'caption.hide', script);
}
