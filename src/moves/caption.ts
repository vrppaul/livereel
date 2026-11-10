/**
 * Captions (`src/props/caption.ts`): words that come up one after another at the frame's foot, or its top where the
 * format puts them there, in place of any on the screen, and go; or come up and go whole, in a way of livereel's
 * (`src/moves/way.ts`). A caption is one alone, over the frame: it takes no name and never slides, so keys always know
 * where it stands.
 */
import { linear } from '../domain/curves.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { type Beginning, type Change, type Move, present, propChange, timingOf } from '../direction/move.ts';
import { captionPlaceIn } from '../props/caption.ts';
import { OWN_WAY, type Way } from '../props/way.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import {
	IN_PLACE_HIDE_FORM,
	IN_PLACE_SHOW_FORM,
	type InPlaceHideScript,
	type InPlaceShowScript,
	comingIn,
	goneIn,
	wayOf
} from './way.ts';
import {
	A_WORDS_SCRIPT,
	type WordsComing,
	type WordsScript,
	comingUpAt,
	refuseWordsBroughtWhole,
	wordsComing
} from './words.ts';

/** How a caption comes up: its timing, the way it comes up, and how its `words` come up, the theme's where none is named. */
export interface CaptionScript extends InPlaceShowScript {
	readonly words?: WordsScript;
}

const CAPTION_FORM: Form<CaptionScript> = { words: A_WORDS_SCRIPT, ...IN_PLACE_SHOW_FORM };
// A caption's words come up one after another at an even pace in their own way, where the film names no curve
const WORDS_COME_UP_ON = linear;

/**
 * A caption coming up, its words in the way the film names, typed by a person where it has them typed, each key heard,
 * or in the theme's, at an even pace unless the film names a curve; or whole in a way of livereel's.
 */
export function show(text: Wording, script: CaptionScript = {}): Move {
	assertKind(text, A_WORDING, "caption.show's text");
	assertWritten(script, CAPTION_FORM, 'caption.show');
	refuseWordsBroughtWhole(script, 'caption.show');
	const said = saidOf(text);
	const coming = wordsComing(said, script.words);
	const way = wayOf(script.enter, script.edge, 'caption.show');
	return {
		part: 'caption',
		timing: timingOf(way.kind === OWN_WAY.kind ? { ease: WORDS_COME_UP_ON, ...script } : script),
		sounds: coming.sounds,
		begin: (beginning) => captionComing(beginning, said, coming, way)
	};
}

/** The caption on the screen going, as its words go or in a way of livereel's; once gone, there is none. */
export function hide(script: InPlaceHideScript = {}): Move {
	assertWritten(script, IN_PLACE_HIDE_FORM, 'caption.hide');
	const way = wayOf(script.leave, script.edge, 'caption.hide');
	return {
		part: 'caption',
		timing: timingOf(script),
		begin: (beginning) => captionGoing(beginning, way)
	};
}

/** A caption coming up where its format puts it, in place of any standing, its words as the look stands now. */
function captionComing(beginning: Beginning, said: Said, coming: WordsComing, way: Way): Change {
	const at = captionPlaceIn(beginning.format);
	const comingUp = comingUpAt(coming, said, beginning.scene.look);
	return propChange('caption', (progress) => ({ ...said, at, comingUp, ...comingIn(way, progress) }));
}

/** The caption standing going in a way; one not on the screen is refused. */
function captionGoing(beginning: Beginning, way: Way): Change {
	const standing = present(beginning, 'caption', 'caption.hide finds no caption on the screen');
	return propChange('caption', (progress) => goneIn(standing, way, progress));
}
