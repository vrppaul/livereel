/** The ending card coming up over the frame, with livereel's ending sound as it begins. */
import { type Change, type Move, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { heardAsItBegins, livereelSound } from '../direction/sound.ts';
import type { EndingCard } from '../props/ending.ts';

export function show(card: EndingCard, script: TimingScript = {}): Move {
	return {
		part: 'ending',
		timing: timingOf(script),
		sounds: [heardAsItBegins(livereelSound('ending'))],
		begin: () => coming(card)
	};
}

function coming(card: EndingCard): Change {
	return propChange('ending', (progress) => ({ card, shown: progress }));
}
