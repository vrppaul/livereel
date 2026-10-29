/** Keys: the caps of a shortcut coming up at the frame's foot as it is pressed, in place of any shown, and going. */
import { assertKind, assertWritten } from '../domain/handed.ts';
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
import { A_CAPS } from '../props/keys.ts';

/** The caps of a shortcut coming up, named as they are written on the keys. */
export function show(caps: readonly string[], script: TimingScript = {}): Move {
	assertKind(caps, A_CAPS, "keys.show's caps");
	assertWritten(script, TIMING_FORM, 'keys.show');
	const key = JSON.stringify(caps);
	return {
		part: 'keys',
		timing: timingOf(script),
		begin: () => propChange('keys', (progress) => ({ caps, key, shown: progress }))
	};
}

/** The caps on the screen going; once gone, there are none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'keys.hide');
	return { part: 'keys', timing: timingOf(script), begin: going };
}

function going(beginning: Beginning): Change {
	const keys = present(beginning, 'keys', 'keys are hidden, but none are on the screen');
	return propChange('keys', (progress) => untilTheEnd(progress, { ...keys, shown: 1 - progress }));
}
