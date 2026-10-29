/**
 * Pins: a numbered mark laid on a block of the page, after any laid before, and all of them taken away together. The
 * block is read as the move's share begins, what the screen shows of it, as a callout's is.
 */
import { A_SELECTOR, A_STRING, assertKind, assertWritten } from '../domain/handed.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	shownPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { keyOf } from '../props/pins.ts';

// A pin marks one block: the first a selector matches
const THE_FIRST = 1;

/** A pin coming up on the block a selector matches, numbered after those laid before, with its label. */
export function show(target: string, label: string, script: TimingScript = {}): Move {
	assertKind(target, A_SELECTOR, "pin.show's selector");
	assertKind(label, A_STRING, "pin.show's label");
	assertWritten(script, TIMING_FORM, 'pin.show');
	return { part: 'pins', timing: timingOf(script), begin: (beginning) => laying(beginning, target, label) };
}

/** Every pin laid going together; once gone, there are none. */
export function clear(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'pin.clear');
	return { part: 'pins', timing: timingOf(script), begin: clearing };
}

async function laying(beginning: Beginning, target: string, label: string): Promise<Change> {
	const box = await shownPart(beginning, target, THE_FIRST, 'pin.show');
	const before = beginning.scene.pins?.pins ?? [];
	const key = keyOf([...before.map((pin) => pin.label), label]);
	return propChange('pins', (progress) => ({ pins: [...before, { box, label, shown: progress }], key, gone: 0 }));
}

function clearing(beginning: Beginning): Change {
	const pins = present(beginning, 'pins', 'the pins are cleared, but none are laid');
	return propChange('pins', (progress) => untilTheEnd(progress, { ...pins, gone: progress }));
}
