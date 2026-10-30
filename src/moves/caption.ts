/**
 * Captions, shown by an object (`src/moves/object.ts`) over the whole frame: words that come up one after another at
 * the frame's foot, or its top where the format puts them there, in place of any on the screen, and go. A caption is
 * the object named `caption`, one alone, standing where it comes up: it takes no name and never slides, so keys always
 * know where it stands.
 */
import { boxOf } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { type Move, TIMING_FORM, type TimingScript } from '../direction/move.ts';
import { captionOf } from '../props/caption.ts';
import { A_WORDING, type Wording, saidOf } from '../props/words.ts';
import { type ObjectKind, objectHide, objectShow } from './object.ts';
import { WORDS_TYPED, type WordsTypedScript, wordsComing } from './typing.ts';

/** How a caption comes up: its timing, and whether its words are `typed` as they come up, and how. */
export interface CaptionScript extends TimingScript {
	readonly typed?: WordsTypedScript;
}

const CAPTION: ObjectKind = 'caption';
const CAPTION_FORM: Form<CaptionScript> = { typed: WORDS_TYPED, ...TIMING_FORM };

/**
 * A caption coming up word by word, or typed by a person where the film has it typed, each key heard; its words come
 * up at an even pace unless the film names a curve.
 */
export function show(text: Wording, script: CaptionScript = {}): Move {
	assertKind(text, A_WORDING, "caption.show's text");
	assertWritten(script, CAPTION_FORM, 'caption.show');
	const said = saidOf(text);
	const coming = wordsComing(said, script.typed);
	const showing = objectShow(CAPTION, 'caption.show', script, null, (beginning) => ({
		content: captionOf(said, coming.comingUp, beginning.format),
		box: boxOf(beginning.format.frame)
	}));
	return { ...showing, sounds: coming.sounds };
}

/** The caption on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'caption.hide');
	return objectHide(CAPTION, 'caption.hide', script);
}
