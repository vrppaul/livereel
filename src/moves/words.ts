/**
 * What the moves of words that come up one after another and go, a callout's and a note's, do alike.
 */
import { type Beginning, type Change, present, propChange, untilTheEnd } from '../direction/move.ts';

/** The props whose words come up one after another (`src/props/words.ts`). */
type ComingUpProp = 'callout' | 'note';

/** Words on the scene going; once gone, there are none. */
export function going(prop: ComingUpProp, beginning: Beginning): Change {
	const shown = present(beginning, prop, `${prop}.hide() hides what is not on the screen`);
	return propChange(prop, (progress) => untilTheEnd(progress, { ...shown, gone: progress }));
}
