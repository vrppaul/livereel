/** The screen coming up out of the ground, or down in it to come up later: a film may open on the ground alone. */
import { assertWritten } from '../domain/handed.ts';
import { type Change, type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { SCREEN_DOWN } from '../props/screen.ts';

const RISING: Change = propChange('screen', (progress) => ({ shown: progress }));
const LOWERED: Change = propChange('screen', () => SCREEN_DOWN);

export function rise(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.rise');
	return { part: 'screen', timing: timingOf(script), begin: () => RISING };
}

export function lower(): Move {
	return { part: 'screen', timing: timingOf({}), begin: () => LOWERED };
}
