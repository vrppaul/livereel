/** The ending card coming up over the frame. */
import { type Change, type Move, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import type { EndingCard } from '../props/ending.ts';

export function show(card: EndingCard, script: TimingScript = {}): Move {
	return { part: 'ending', timing: timingOf(script), begin: () => coming(card) };
}

function coming(card: EndingCard): Change {
	return propChange('ending', (progress) => ({ card, shown: progress }));
}
