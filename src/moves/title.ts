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
import { A_FRAME_SIDE, boxOf } from '../domain/geometry.ts';
import { A_SIZE, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { AN_ALIGNMENT, A_PLACE, type Alignment, type Place, alignmentIn } from '../domain/place.ts';
import { type Beginning, type Move, TIMING_FORM } from '../direction/move.ts';
import type { TitleWords } from '../props/title.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import {
	type Coming,
	type HideScript,
	NAMED_FORM,
	type ObjectKind,
	type ObjectLeanScript,
	type ShowScript,
	type ToScript,
	objectHide,
	objectLean,
	objectShow,
	objectTo,
	placedFor
} from './object.ts';

/**
 * Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named; how it
 * reads there, `align`, the place's own way where none is named; how large its letters are, `size`, in pixels of a
 * frame 1080 on its shorter side, over the whole frame and in a place alike, where none is named the look's
 * `titleSize`, and in a place a share of it no larger than its width lets a long word stand; the side it slides in
 * `from`, past the frame's edge, rather than coming up in its place; and which title it is, `as`.
 */
export interface TitleScript extends ShowScript {
	readonly at?: Place;
	readonly align?: Alignment;
	readonly size?: number;
}

/**
 * A title's words as `show` reads them: what they say, their place, none over the whole frame, how they read, none for
 * the place's own way, and their own size, none for the look's.
 */
interface Setting {
	readonly said: Said;
	readonly place: Place | null;
	readonly align: Alignment | null;
	readonly size: number | null;
}

const TITLE: ObjectKind = 'title';
const TITLE_FORM: Form<TitleScript> = {
	at: A_PLACE,
	align: AN_ALIGNMENT,
	size: A_SIZE,
	from: A_FRAME_SIDE,
	...NAMED_FORM,
	...TIMING_FORM
};
// Words over the whole frame on their ground stand centred
const OVER_THE_WHOLE: Alignment = 'center';

/**
 * A title coming up word by word, over the whole frame its ground first, or in its place, from past a side of the
 * frame where the film names one; words that come up in place come up at an even pace unless the film names a curve.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	const setting: Setting = {
		said: saidOf(text),
		place: script.at ?? null,
		align: script.align ?? null,
		size: script.size ?? null
	};
	return objectShow(TITLE, 'title.show', script, setting.place, (beginning) => comingUp(setting, beginning));
}

/** The title carried to another place, through the boxes between, reading as it did. */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(TITLE, 'title.to', place, script);
}

/** The title going, and its ground with it, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(TITLE, 'title.hide', script);
}

/** The title leant back from its top edge by `tilt` and swung about its middle by `turn`, its ground with it. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(TITLE, 'title.lean', script);
}

/**
 * A title's words and their box as their move begins: over the whole frame on their ground, or in their place, read as
 * the film says or in the way of the place, a format's own read as the place it names.
 */
function comingUp(setting: Setting, beginning: Beginning): Coming {
	const { said, place, size } = setting;
	const format = beginning.format;
	if (place === null) {
		const card: TitleWords = { kind: 'words', ...said, align: setting.align ?? OVER_THE_WHOLE, size, onGround: true };
		return { content: card, box: boxOf(format.frame) };
	}
	const align = setting.align ?? alignmentIn(format, place);
	const placed: TitleWords = { kind: 'words', ...said, align, size, onGround: false };
	return { content: placed, box: placedFor(placed.kind, format, place) };
}
