/**
 * Captions, shown by an object (`src/moves/object.ts`) over the whole frame: words that come up one after another at
 * the frame's foot, or its top where the format puts them there, in place of any on the screen, and go; or come up and
 * go whole, in a way of livereel's. A caption is the object named `caption`, one alone, standing where it comes up: it
 * takes no name and never slides, so keys always know where it stands.
 */
import { boxOf } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import type { Move } from '../direction/move.ts';
import { captionOf } from '../props/caption.ts';
import { A_WORDING, type Wording, saidOf } from '../props/words.ts';
import {
	IN_PLACE_HIDE_FORM,
	IN_PLACE_SHOW_FORM,
	type InPlaceHideScript,
	type InPlaceShowScript,
	type ObjectKind,
	objectHide,
	objectShow
} from './object.ts';
import { A_WORDS_SCRIPT, type WordsScript, comingUpAt, refuseWordsBroughtWhole, wordsComing } from './words.ts';

/** How a caption comes up: its timing, the way it comes up, and how its `words` come up, the theme's where none is named. */
export interface CaptionScript extends InPlaceShowScript {
	readonly words?: WordsScript;
}

const CAPTION: ObjectKind = 'caption';
const CAPTION_FORM: Form<CaptionScript> = { words: A_WORDS_SCRIPT, ...IN_PLACE_SHOW_FORM };

/**
 * A caption coming up, its words in the way the film names, typed by a person where it has them typed, each key heard,
 * or in the theme's; or whole in a way of livereel's; its words come up at an even pace unless the film names a curve.
 */
export function show(text: Wording, script: CaptionScript = {}): Move {
	assertKind(text, A_WORDING, "caption.show's text");
	assertWritten(script, CAPTION_FORM, 'caption.show');
	refuseWordsBroughtWhole(script, 'caption.show');
	const said = saidOf(text);
	const coming = wordsComing(said, script.words);
	const showing = objectShow(CAPTION, 'caption.show', script, null, (beginning) => ({
		content: captionOf(said, comingUpAt(coming, said, beginning.scene.look), beginning.format),
		box: boxOf(beginning.format.frame)
	}));
	return { ...showing, sounds: coming.sounds };
}

/** The caption on the screen going, as its words go or in a way of livereel's; once gone, there is none. */
export function hide(script: InPlaceHideScript = {}): Move {
	assertWritten(script, IN_PLACE_HIDE_FORM, 'caption.hide');
	return objectHide(CAPTION, 'caption.hide', script);
}
