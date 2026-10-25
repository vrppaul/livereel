/** The screen coming up out of the ground, or down in it to come up later: a film may open on the ground alone. */
import { type Change, type Move, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { SCREEN_DOWN } from '../props/screen.ts';

const RISING: Change = propChange('screen', (progress) => ({ shown: progress }));
const LOWERED: Change = propChange('screen', () => SCREEN_DOWN);

export function rise(script: TimingScript = {}): Move {
	return { part: 'screen', timing: timingOf(script), begin: () => RISING };
}

export function lower(): Move {
	return { part: 'screen', timing: timingOf({}), begin: () => LOWERED };
}
