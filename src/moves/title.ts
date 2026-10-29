/**
 * Titles: words that come up one after another over the whole frame, on the film's ground, or in a place the film
 * names (`src/domain/place.ts`), beside the page's window or alone, in place of any title on the screen, and go. A
 * title in a place moves to another, comes in from past a side of the frame, or leaves past one; a title over the
 * whole frame has no place to move from, and is refused there.
 */
import { FilmError } from '../domain/errors.ts';
import { type Box, boxToward } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	AN_ALIGNMENT,
	A_PLACE,
	type Alignment,
	type Place,
	alignmentIn,
	enteringFrom,
	pastTheEdge,
	shownComing,
	wordsPlaced
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
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import type { Title } from '../props/title.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import { going } from './words.ts';

/**
 * Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named; how it
 * reads there, `align`, the place's own way where none is named; and the side it slides in `from`, past the frame's
 * edge, rather than coming up in its place.
 */
export interface TitleScript extends TimingScript {
	readonly at?: Place;
	readonly align?: Alignment;
	readonly from?: FrameSide;
}

/** The side a title slides out `toward`, past the frame's edge, rather than going where it stands. */
export interface TitleHideScript extends TimingScript {
	readonly toward?: FrameSide;
}

const TITLE_FORM: Form<TitleScript> = { at: A_PLACE, align: AN_ALIGNMENT, from: A_FRAME_SIDE, ...TIMING_FORM };
const TITLE_HIDE_FORM: Form<TitleHideScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM };
// Words over the whole frame on their ground stand centred
const OVER_THE_WHOLE: Alignment = 'center';
// Words travelling past the frame's edge stay whole, neither gone nor going
const NOT_GONE = 0;

/**
 * A title coming up word by word, over the whole frame its ground first, or in its place, from past a side of the
 * frame where the film names one; its words come up at an even pace unless the film names a curve.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, 'title.show');
	const said = saidOf(text);
	const place = script.at ?? null;
	const from = script.from ?? null;
	if (place === null && from !== null) {
		throw new FilmError(`title.show comes in from the ${from} only to a place: name it, as { at: 'left', from }`);
	}
	const align = script.align ?? (place === null ? OVER_THE_WHOLE : alignmentIn(place));
	return {
		part: 'title',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => (place === null ? showing(said, null, align) : arriving(said, beginning, place, from, align))
	};
}

/** The title in a place moving to another, through the boxes between. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "title.to's place");
	assertWritten(script, TIMING_FORM, 'title.to');
	return { part: 'title', timing: timingOf(script), begin: (beginning) => moving(beginning, place) };
}

/**
 * The title on the screen going, and its ground with it, or leaving past a side of the frame where the film names one;
 * once gone, there is none.
 */
export function hide(script: TitleHideScript = {}): Move {
	assertWritten(script, TITLE_HIDE_FORM, 'title.hide');
	const toward = script.toward ?? null;
	return {
		part: 'title',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going('title', beginning) : leaving(beginning, toward))
	};
}

function showing(said: Said, box: Box | null, align: Alignment): Change {
	return propChange('title', (progress) => ({ ...said, box, align, shown: progress, gone: NOT_GONE }));
}

/** A title coming up in its place, travelling in from past a side of the frame where one is named. */
function arriving(said: Said, beginning: Beginning, place: Place, from: FrameSide | null, align: Alignment): Change {
	const box = wordsPlaced(beginning.format, place);
	const start = enteringFrom(box, from, beginning.format.frame);
	return propChange('title', (progress) => ({
		...said,
		box: boxToward(start, box, progress),
		align,
		shown: shownComing(from, progress),
		gone: NOT_GONE
	}));
}

/** The title in its place travelling to another, whole. */
function moving(beginning: Beginning, place: Place): Change {
	const { title, box } = placedTitle(beginning, 'title.to');
	const end = wordsPlaced(beginning.format, place);
	return propChange('title', (progress) => ({ ...title, box: boxToward(box, end, progress) }));
}

/** The title in its place travelling past a side of the frame, whole; once there, none. */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const { title, box } = placedTitle(beginning, 'title.hide');
	const end = pastTheEdge(box, toward, beginning.format.frame);
	return propChange('title', (progress) => untilTheEnd(progress, { ...title, box: boxToward(box, end, progress) }));
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
