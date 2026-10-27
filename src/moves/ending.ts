/** The ending card coming up over the frame, with livereel's ending sound as it begins. */
import { assertKind, assertWritten } from '../domain/handed.ts';
import { type Change, type Move, TIMING_FORM, type TimingScript, propChange, timingOf } from '../direction/move.ts';
import { heardAsItBegins, livereelSound } from '../direction/sound.ts';
import { A_CARD, type EndingCard } from '../props/ending.ts';

export function show(card: EndingCard, script: TimingScript = {}): Move {
	assertKind(card, A_CARD, "ending.show's card");
	assertWritten(script, TIMING_FORM, 'ending.show');
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
