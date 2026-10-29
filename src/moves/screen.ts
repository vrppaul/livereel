/**
 * The screen coming up out of the ground, or going down into it to come up later, from wherever it stands: at once in
 * a cut, so a film may open on the ground alone, or over a move's share in a play. The window's shadow and edge come
 * and go with it. A screen raised that is up, or lowered that is down, has nothing to move from, and is refused as its
 * move begins.
 */
import { FilmError } from '../domain/errors.ts';
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

// What a move of the screen that has nothing to move from says
const UP_ALREADY = 'screen.rise raises a screen already up: lower it first, with cut(screen.lower())';
const DOWN_ALREADY = 'screen.lower lowers a screen already down';

/** The screen coming up out of the ground. */
export function rise(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.rise');
	return {
		part: 'screen',
		timing: timingOf(script),
		begin: (beginning) => shownToward(beginning, SCREEN_UP, UP_ALREADY)
	};
}

/** The screen going down into the ground. */
export function lower(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.lower');
	return {
		part: 'screen',
		timing: timingOf(script),
		begin: (beginning) => shownToward(beginning, SCREEN_DOWN, DOWN_ALREADY)
	};
}

/** The screen on its way from where it stands to up or down; refused where it stands there already. */
function shownToward(beginning: Beginning, end: Screen, refusal: string): Change {
	const start = beginning.scene.screen.shown;
	if (start === end.shown) throw new FilmError(refusal);
	return propChange('screen', (progress) => ({ shown: between(start, end.shown, progress) }));
}
