/**
 * The screen coming up out of the ground, or going down into it to come up later, from wherever it stands: at once in
 * a cut, so a film may open on the ground alone, or over a move's share in a play. The window's shadow and edge come
 * and go with it.
 */
import { assertWritten } from '../domain/handed.ts';
import { between } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	timingOf
} from '../direction/move.ts';
import { SCREEN_DOWN, SCREEN_UP, type Screen } from '../props/screen.ts';

export function rise(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.rise');
	return { part: 'screen', timing: timingOf(script), begin: (beginning) => shownToward(beginning, SCREEN_UP) };
}

export function lower(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.lower');
	return { part: 'screen', timing: timingOf(script), begin: (beginning) => shownToward(beginning, SCREEN_DOWN) };
}

/** The screen on its way from where it stands to up or down. */
function shownToward(beginning: Beginning, end: Screen): Change {
	const start = beginning.scene.screen.shown;
	return propChange('screen', (progress) => ({ shown: between(start, end.shown, progress) }));
}
