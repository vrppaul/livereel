/** What the moves of words that come up and go, a caption's, a title's, a callout's and a note's, do alike. */
import { type Beginning, type Change, present, propChange, untilTheEnd } from '../direction/move.ts';

/** The props that are words coming up one after another (`src/props/words.ts`). */
type WordsProp = 'caption' | 'title' | 'callout' | 'note';

/** The words on the scene going; once gone, there are none. */
export function going(prop: WordsProp, beginning: Beginning): Change {
	const shown = present(beginning, prop, `a ${prop} is hidden, but none is on the screen`);
	return propChange(prop, (progress) => untilTheEnd(progress, { ...shown, gone: progress }));
}
