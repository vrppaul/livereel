/**
 * Titles: words that come up one after another over the whole frame, on the film's ground, or in a place the film
 * names (`src/domain/place.ts`), beside the page's window or alone, in place of any title on the screen, and go. A
 * title in a place moves to another, keeping how it reads, comes in from past a side of the frame, pushing the title
 * standing in a place off past the side across, or leaves past one; a title over the whole frame has no place to
 * move from, and is refused there. A title may set its letters' own size, in place of the look's. In a place its words
 * wrap and take their size by the width of their place, no larger than its own, so a title moving to a place of
 * another size takes that size as it sets off, where it reads from, and travels whole: its lines change once, where
 * they would break anew on every frame of the way.
 */
import { FilmError } from '../domain/errors.ts';
import type { Box } from '../domain/geometry.ts';
import { A_SIZE, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	AN_ALIGNMENT,
	A_PLACE,
	type Alignment,
	type Place,
	alignmentIn,
	enteringFrom,
	wordsPlaced,
	wordsResized
} from '../domain/place.ts';
import { A_FRAME_SIDE, type FrameSide } from '../domain/split.ts';
import { linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import type { Title } from '../props/title.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import {
	NOT_GONE,
	SLIDE_OUT_FORM,
	type SlideOutScript,
	going,
	leavingToward,
	pushOf,
	pushedAt,
	shownComing,
	travelling
} from './words.ts';

/**
 * Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named; how it
 * reads there, `align`, the place's own way where none is named; how large its letters are, `size`, in pixels of a
 * frame 1080 on its shorter side, in place of the look's `titleSize`, and in a place at most, so a long word still
 * stands on a line of its own; and the side it slides in `from`, past the frame's edge, rather than coming up in its
 * place.
 */
export interface TitleScript extends TimingScript {
	readonly at?: Place;
	readonly align?: Alignment;
	readonly size?: number;
	readonly from?: FrameSide;
}

/** A title's words as the film sets them: what they say, how they read, and their own size, none as the look's. */
interface Setting extends Said {
	readonly align: Alignment;
	readonly size: number | null;
}

const TITLE_FORM: Form<TitleScript> = {
	at: A_PLACE,
	align: AN_ALIGNMENT,
	size: A_SIZE,
	from: A_FRAME_SIDE,
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
	const place = script.at ?? null;
	const from = script.from ?? null;
	if (place === null && from !== null) {
		throw new FilmError(`title.show comes in from the ${from} only to a place: name it, as { at: 'left', from }`);
	}
	const setting: Setting = {
		...saidOf(text),
		align: script.align ?? (place === null ? OVER_THE_WHOLE : alignmentIn(place)),
		size: script.size ?? null
	};
	const evenly = from === null ? { ease: linear } : {};
	return {
		part: 'title',
		timing: timingOf({ ...evenly, ...script }),
		begin: (beginning) => (place === null ? overTheWhole(setting) : arriving(setting, beginning, place, from))
	};
}

/** The title in a place moving to another, through the boxes between, reading as it did. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "title.to's place");
	assertWritten(script, TIMING_FORM, 'title.to');
	return { part: 'title', timing: timingOf(script), begin: (beginning) => moving(beginning, place) };
}

/**
 * The title on the screen going, and its ground with it, or sliding out past a side of the frame where the film names
 * one; once gone, there is none.
 */
export function hide(script: SlideOutScript = {}): Move {
	assertWritten(script, SLIDE_OUT_FORM, 'title.hide');
	const toward = script.toward ?? null;
	return {
		part: 'title',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going('title', beginning) : leaving(beginning, toward))
	};
}

/** A title coming up over the whole frame, its ground first. */
function overTheWhole(setting: Setting): Change {
	return propChange('title', (progress) => ({
		...setting,
		box: null,
		shown: progress,
		gone: NOT_GONE,
		pushedOff: null
	}));
}

/**
 * A title coming up in its place, travelling in whole from past a side of the frame where one is named, and pushing
 * the title standing in a place off past the side across as it does.
 */
function arriving(setting: Setting, beginning: Beginning, place: Place, from: FrameSide | null): Change {
	const box = wordsPlaced(beginning.format, place);
	const start = enteringFrom(box, from, beginning.format.frame);
	const push = pushOf(beginning.scene.title, from, beginning.format.frame);
	return travelling(
		'title',
		(at, progress) => ({
			...setting,
			box: at,
			shown: shownComing(from, progress),
			gone: NOT_GONE,
			pushedOff: pushedAt(push, progress)
		}),
		start,
		box
	);
}

/** The title in its place travelling to another, whole, at the size of the place it goes to. */
function moving(beginning: Beginning, place: Place): Change {
	const { title, box } = placedTitle(beginning, 'title.to');
	const end = wordsPlaced(beginning.format, place);
	return travelling('title', (at) => ({ ...title, box: at }), wordsResized(box, end, title.align), end);
}

/** The title in its place sliding out past a side of the frame, whole; once there, none. */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const { title, box } = placedTitle(beginning, 'title.hide');
	return leavingToward('title', (at) => ({ ...title, box: at }), box, toward, beginning);
}

/** The title on the screen and its place; refused where none stands, or one stands over the whole frame. */
function placedTitle(beginning: Beginning, move: string): { readonly title: Title; readonly box: Box } {
	const title = present(beginning, 'title', `${move} moves a title, but none is on the screen`);
	if (title.box === null) {
		throw new FilmError(
			`${move} moves a title in a place, but this one stands over the whole frame: show it at a place`
		);
	}
	return { title, box: title.box };
}
