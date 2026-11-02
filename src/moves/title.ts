/**
 * Titles: words that come up one after another, shown by an object (`src/moves/object.ts`): over the whole frame on
 * the film's ground, a title card, or in a place the film names (`src/domain/place.ts`), beside the page's window or
 * alone, in place of the title of its name on the screen, and go. A title is the object named `title`, or one the
 * film names `as`, so several stand at once. Any title slides in from past a side of the frame, pushing the one of its
 * name standing off past the side across, moves to a place, leans, or leaves past a side, its ground with it where it
 * has one. A title may set its letters' own size, in place of the look's; one that sets none takes, in a place, its
 * size by the width of the place, and its words wrap by it there, so a title moving to a place of another size takes
 * that size as it sets off, where it reads from, and travels whole: its lines change once, where they would break
 * anew on every frame of the way.
 */
import { boxOf } from '../domain/geometry.ts';
import { A_SIZE, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { AN_ALIGNMENT, A_PLACE, type Alignment, type Place, alignmentIn } from '../domain/place.ts';
import type { Beginning, Move } from '../direction/move.ts';
import type { TitleWords } from '../props/title.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import {
	type Coming,
	type EffectsScript,
	type HideScript,
	NESTED_FORM,
	type NestedScript,
	type ObjectKind,
	type ObjectLeanScript,
	SHOW_FORM,
	type ShowScript,
	type ToScript,
	objectEffects,
	objectHide,
	objectLean,
	objectShow,
	objectTo,
	placedFor
} from './object.ts';
import {
	A_WORDS_SCRIPT,
	type WordsComing,
	type WordsScript,
	comingUpAt,
	refuseWordsBroughtWhole,
	wordsComing
} from './words.ts';

/**
 * Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named; how it
 * reads there, `align`, the place's own way where none is named; how large its letters are, `size`, in pixels of a
 * frame 1080 on its shorter side, over the whole frame and in a place alike, where none is named the look's
 * `titleSize`, and in a place a share of it no larger than its width lets a long word stand; the side it slides in
 * `from`, past the frame's edge, rather than coming up in its place, or the way it comes up there, `enter`; how its
 * words come up there, `words`, the theme's way where none is named; which title it is, `as`; and what it stands
 * `inside`, the page's window, its place then a box in the window's shares, or the `group` it stands in.
 */
export interface TitleScript extends ShowScript, NestedScript {
	readonly at?: Place;
	readonly align?: Alignment;
	readonly size?: number;
	readonly words?: WordsScript;
}

/**
 * A title's words as `show` reads them: what they say, their place, none over the whole frame, how they read, none for
 * the place's own way, their own size, none for the look's, and how they come up.
 */
interface Setting {
	readonly said: Said;
	readonly place: Place | null;
	readonly align: Alignment | null;
	readonly size: number | null;
	readonly coming: WordsComing;
}

const TITLE: ObjectKind = 'title';
const TITLE_FORM: Form<TitleScript> = {
	at: A_PLACE,
	align: AN_ALIGNMENT,
	size: A_SIZE,
	words: A_WORDS_SCRIPT,
	...SHOW_FORM,
	...NESTED_FORM
};
// Words over the whole frame on their ground stand centred
const OVER_THE_WHOLE: Alignment = 'center';

/**
 * A title coming up, its words in the way the film names, typed by a person where it has them typed, each key heard,
 * or in the theme's; over the whole frame its ground first, or in its place; or whole, in a way of livereel's or from
 * past a side of the frame where the film names one, naming no way for its words; words that come up in place come up
 * at an even pace unless the film names a curve.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	refuseWordsBroughtWhole(script, 'title.show');
	const said = saidOf(text);
	const coming = wordsComing(said, script.words);
	const setting: Setting = {
		said,
		place: script.at ?? null,
		align: script.align ?? null,
		size: script.size ?? null,
		coming
	};
	const showing = objectShow(TITLE, 'title.show', script, setting.place, (beginning) =>
		titleComing(setting, beginning)
	);
	return { ...showing, sounds: coming.sounds };
}

/**
 * The title carried to another place, through the boxes between, reading as it did, growing to `scale` and coming
 * `depth` toward the eye on the way where the film names them.
 */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(TITLE, 'title.to', place, script);
}

/** The title going, and its ground with it, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(TITLE, 'title.hide', script);
}

/**
 * The title leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled in its own plane by
 * `roll`, its ground with it.
 */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(TITLE, 'title.lean', script);
}

/**
 * The title standing out as the film names, its ground with it: ringed, glowing, casting a shadow, blurred, grown or
 * brought toward the eye where it stands.
 */
export function effects(script: EffectsScript): Move {
	return objectEffects(TITLE, 'title.effects', script);
}

/**
 * A title's words and their box as their move begins: over the whole frame on their ground, or in their place, read as
 * the film says or in the way of the place, a format's own read as the place it names.
 */
function titleComing(setting: Setting, beginning: Beginning): Coming {
	const { said, place, size } = setting;
	const comingUp = comingUpAt(setting.coming, said, beginning.scene.look);
	const format = beginning.format;
	if (place === null) {
		const align = setting.align ?? OVER_THE_WHOLE;
		const card: TitleWords = { kind: 'words', ...said, align, size, onGround: true, comingUp };
		return { content: card, box: boxOf(format.frame) };
	}
	const align = setting.align ?? alignmentIn(format, place);
	const placed: TitleWords = { kind: 'words', ...said, align, size, onGround: false, comingUp };
	return { content: placed, box: placedFor(placed.kind, format, place) };
}
