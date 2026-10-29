/**
 * The ending card coming up over the frame, with livereel's ending sound as it begins, and going: a film may open on
 * the card as well, its name and line, and go on to the page once it has gone.
 */
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

/** The card on the screen going; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'ending.hide');
	return { part: 'ending', timing: timingOf(script), begin: going };
}

function coming(card: EndingCard): Change {
	return propChange('ending', (progress) => ({ card, shown: progress }));
}

function going(beginning: Beginning): Change {
	const ending = present(beginning, 'ending', 'ending.hide() hides what is not on the screen');
	return propChange('ending', (progress) => untilTheEnd(progress, { ...ending, shown: 1 - progress }));
}
