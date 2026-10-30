/**
 * What slides whole past a side of the frame, a whole frame, so what slides the other way in the same step moves with
 * it as one sheet: how a film names the side it comes from or goes toward, and the slide of what holds a shift from
 * its place, the ending card and the agent's terminal, written once for both. Words and code in a place slide by
 * their boxes (`src/moves/words.ts`).
 */
import { A_FRAME_SIDE, type FrameSide, IN_PLACE, type Point, pointToward } from '../domain/geometry.ts';
import type { Form } from '../domain/handed.ts';
import { frameToward } from '../domain/place.ts';
import {
	type Beginning,
	type Change,
	TIMING_FORM,
	type TimingScript,
	propChange,
	untilTheEnd
} from '../direction/move.ts';
import type { PropStates } from '../scene.ts';

/** The side what goes slides out `toward`, past the frame's edge, rather than going where it stands. */
export interface SlideOutScript extends TimingScript {
	readonly toward?: FrameSide;
}

export const SLIDE_OUT_FORM: Form<SlideOutScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM };

/** The side what comes slides in `from`, past the frame's edge, rather than coming up in place. */
export interface SlideInScript extends TimingScript {
	readonly from?: FrameSide;
}

export const SLIDE_IN_FORM: Form<SlideInScript> = { from: A_FRAME_SIDE, ...TIMING_FORM };
// What slides in from a side, words, the card or the terminal, comes whole at once
export const SHOWN_WHOLE = 1;

/** The props that slide whole by a shift from their place (`src/props/ending.ts`, `src/props/terminal.ts`). */
type ShiftedProp = 'ending' | 'terminal';

/** A prop sliding in whole from a frame past its place on a side, its state made at each shift. */
export function slidingIn<Name extends ShiftedProp>(
	prop: Name,
	stateAt: (shift: Point) => PropStates[Name],
	from: FrameSide,
	beginning: Beginning
): Change {
	const start = frameToward(from, beginning.format.frame);
	return propChange(prop, (progress) => stateAt(pointToward(start, IN_PLACE, progress)));
}

/** A prop sliding out whole from its shift to a frame past its place on a side; once there, none. */
export function slidingOut<Name extends ShiftedProp>(
	prop: Name,
	stateAt: (shift: Point) => PropStates[Name],
	shift: Point,
	toward: FrameSide,
	beginning: Beginning
): Change {
	const end = frameToward(toward, beginning.format.frame);
	return propChange(prop, (progress) => untilTheEnd(progress, stateAt(pointToward(shift, end, progress))));
}
