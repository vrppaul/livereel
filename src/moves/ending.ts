/**
 * The ending card coming up over the frame, with livereel's ending sound as it begins, or sliding in whole with its
 * ground from past a side of the frame; and going, or sliding out past a side: a film may open on the card as well,
 * its name and line, and go on to the page once it has gone. A slide moves a whole frame, as words and the window do,
 * so the card and what slides with it move as one sheet.
 */
import { type FrameSide, IN_PLACE } from '../domain/geometry.ts';
import { assertKind, assertWritten } from '../domain/handed.ts';
import {
	type Beginning,
	type Change,
	type Move,
	present,
	propChange,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { heardAsItBegins, livereelSound } from '../direction/sound.ts';
import { A_CARD, type EndingCard } from '../props/ending.ts';
import {
	SHOWN_WHOLE,
	SLIDE_IN_FORM,
	SLIDE_OUT_FORM,
	type SlideInScript,
	type SlideOutScript,
	slidingIn,
	slidingOut
} from './slide.ts';

// What hiding a card that is not there is refused with
const NOT_THERE = 'ending.hide() hides what is not on the screen';

/** The card coming up in place, or sliding in whole from past a side of the frame. */
export function show(card: EndingCard, script: SlideInScript = {}): Move {
	assertKind(card, A_CARD, "ending.show's card");
	assertWritten(script, SLIDE_IN_FORM, 'ending.show');
	const from = script.from ?? null;
	return {
		part: 'ending',
		timing: timingOf(script),
		sounds: [heardAsItBegins(livereelSound('ending'))],
		begin: (beginning) =>
			from === null
				? coming(card)
				: slidingIn('ending', (shift) => ({ card, shown: SHOWN_WHOLE, shift }), from, beginning)
	};
}

/** The card on the screen going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: SlideOutScript = {}): Move {
	assertWritten(script, SLIDE_OUT_FORM, 'ending.hide');
	const toward = script.toward ?? null;
	return {
		part: 'ending',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going(beginning) : slidOut(beginning, toward))
	};
}

function coming(card: EndingCard): Change {
	return propChange('ending', (progress) => ({ card, shown: progress, shift: IN_PLACE }));
}

function going(beginning: Beginning): Change {
	const ending = present(beginning, 'ending', NOT_THERE);
	return propChange('ending', (progress) => untilTheEnd(progress, { ...ending, shown: 1 - progress }));
}

/** The card on the screen sliding out whole past a side of the frame. */
function slidOut(beginning: Beginning, toward: FrameSide): Change {
	const ending = present(beginning, 'ending', NOT_THERE);
	return slidingOut('ending', (shift) => ({ ...ending, shift }), ending.shift, toward, beginning);
}
