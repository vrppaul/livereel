/**
 * What the moves of what comes up one after another and goes, a caption's, a title's, a callout's and a note's words
 * and the lines of code, do alike.
 */
import { type Beginning, type Change, present, propChange, untilTheEnd } from '../direction/move.ts';

/** The props that come up one after another, words or lines of code (`src/props/words.ts`, `src/props/code.ts`). */
type ComingUpProp = 'caption' | 'title' | 'callout' | 'note' | 'code';

/** What comes up one after another on the scene going; once gone, there is none. */
export function going(prop: ComingUpProp, beginning: Beginning): Change {
	const shown = present(beginning, prop, `${prop}.hide() hides what is not on the screen`);
	return propChange(prop, (progress) => untilTheEnd(progress, { ...shown, gone: progress }));
}
