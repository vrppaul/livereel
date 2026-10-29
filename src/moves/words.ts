/**
 * What the moves of what comes up one after another and goes, a caption's, a title's, a callout's and a note's words
 * and the lines of code, do alike; and what the moves of a title and code in a place do alike as they travel: to
 * another place, in from past a side of the frame, pushing what stands off past the side across, out past one.
 */
import { A_FRAME_SIDE, type Box, type FrameSide, type Size, boxToward } from '../domain/geometry.ts';
import { type Form } from '../domain/handed.ts';
import { acrossFrom, pastTheEdge } from '../domain/place.ts';
import {
	type Beginning,
	type Change,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	untilTheEnd
} from '../direction/move.ts';
import type { PropStates } from '../scene.ts';

/** The props that come up one after another, words or lines of code (`src/props/words.ts`, `src/props/code.ts`). */
type ComingUpProp = 'caption' | 'title' | 'callout' | 'note' | 'code';

/** The props that stand in a place and travel (`src/domain/place.ts`). */
type PlacedProp = 'title' | 'code';

/** Words that stand in a place, or over the whole frame where they have none. */
interface Placed {
	readonly box: Box | null;
}

/** Words pushed off past the frame's edge: as they stood, and the way their box goes. */
interface Push<Words extends Placed> {
	readonly words: Words;
	readonly start: Box;
	readonly end: Box;
}

/** The side what goes slides out `toward`, past the frame's edge, rather than going where it stands. */
export interface SlideOutScript extends TimingScript {
	readonly toward?: FrameSide;
}

export const SLIDE_OUT_FORM: Form<SlideOutScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM };
// Words not going: neither gone nor on their way out
export const NOT_GONE = 0;
// What slides in from a side, words or the card, comes whole at once
export const SHOWN_WHOLE = 1;

/** What comes up one after another on the scene going; once gone, there is none. */
export function going(prop: ComingUpProp, beginning: Beginning): Change {
	const shown = present(beginning, prop, `${prop}.hide() hides what is not on the screen`);
	return propChange(prop, (progress) => untilTheEnd(progress, { ...shown, gone: progress }));
}

/**
 * How far words coming into a place have come up, `progress` of the way: whole from the start where they slide in
 * from a side, so they travel as one piece, as far as their move where they come up in place.
 */
export function shownComing(from: FrameSide | null, progress: number): number {
	return from === null ? progress : SHOWN_WHOLE;
}

/** A placed prop travelling from one box to another, its state made at each box and progress. */
export function travelling<Name extends PlacedProp>(
	prop: Name,
	stateAt: (box: Box, progress: number) => PropStates[Name],
	start: Box,
	end: Box
): Change {
	return propChange(prop, (progress) => stateAt(boxToward(start, end, progress), progress));
}

/**
 * What words sliding in from a side push off: the words standing in a place, whole as they stand, and the way from
 * their box to a frame past it on the side across, so the two move as one sheet; none where nothing stands in a place,
 * or nothing slides in.
 */
export function pushOf<Words extends Placed>(
	standing: Words | null,
	from: FrameSide | null,
	frame: Size
): Push<Words> | null {
	if (from === null || standing === null || standing.box === null) return null;
	return { words: standing, start: standing.box, end: pastTheEdge(standing.box, acrossFrom(from), frame) };
}

/** The words pushed off, `progress` of their way; once past the edge, none. */
export function pushedAt<Words extends Placed>(push: Push<Words> | null, progress: number): Words | null {
	if (push === null) return null;
	return untilTheEnd(progress, { ...push.words, box: boxToward(push.start, push.end, progress) });
}

/** A placed prop travelling from its box past a side of the frame, whole; once there, none. */
export function leavingToward<Name extends PlacedProp>(
	prop: Name,
	stateAt: (box: Box) => PropStates[Name],
	box: Box,
	toward: FrameSide,
	beginning: Beginning
): Change {
	const end = pastTheEdge(box, toward, beginning.format.frame);
	return propChange(prop, (progress) => untilTheEnd(progress, stateAt(boxToward(box, end, progress))));
}
