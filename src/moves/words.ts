/**
 * What the moves of what comes up one after another and goes, a caption's, a title's, a callout's and a note's words
 * and the lines of code, do alike; and what the moves of a title and code in a place do alike as they travel: to
 * another place, in from past a side of the frame, out past one.
 */
import { type Box, boxToward } from '../domain/geometry.ts';
import { type Form } from '../domain/handed.ts';
import { pastTheEdge } from '../domain/place.ts';
import { A_FRAME_SIDE, type FrameSide } from '../domain/split.ts';
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

/** The side words slide out `toward`, past the frame's edge, rather than going where they stand. */
export interface WordsHideScript extends TimingScript {
	readonly toward?: FrameSide;
}

export const WORDS_HIDE_FORM: Form<WordsHideScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM };
// Words not going: neither gone nor on their way out
export const NOT_GONE = 0;
// Words come up whole at once where they slide in from a side
const SHOWN_WHOLE = 1;

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
