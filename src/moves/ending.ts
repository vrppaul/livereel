/**
 * The ending card coming up over the frame, with livereel's ending sound as it begins, or sliding in whole with its
 * ground from past a side of the frame; and going, or sliding out past a side: a film may open on the card as well,
 * its name and line, and go on to the page once it has gone. A slide moves a whole frame, as words and the window do,
 * so the card and what slides with it move as one sheet.
 */
import { type FrameSide, IN_PLACE, pointToward } from '../domain/geometry.ts';
import { assertKind, assertWritten } from '../domain/handed.ts';
import { frameToward } from '../domain/place.ts';
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
import { SHOWN_WHOLE, SLIDE_IN_FORM, SLIDE_OUT_FORM, type SlideInScript, type SlideOutScript } from './words.ts';

/** The card coming up in place, or sliding in whole from past a side of the frame. */
export function show(card: EndingCard, script: SlideInScript = {}): Move {
	assertKind(card, A_CARD, "ending.show's card");
	assertWritten(script, SLIDE_IN_FORM, 'ending.show');
	const from = script.from ?? null;
	return {
		part: 'ending',
		timing: timingOf(script),
		sounds: [heardAsItBegins(livereelSound('ending'))],
		begin: (beginning) => (from === null ? coming(card) : slidingIn(card, from, beginning))
	};
}

/** The card on the screen going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: SlideOutScript = {}): Move {
	assertWritten(script, SLIDE_OUT_FORM, 'ending.hide');
	const toward = script.toward ?? null;
	return {
		part: 'ending',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going(beginning) : slidingOut(beginning, toward))
	};
}

function coming(card: EndingCard): Change {
	return propChange('ending', (progress) => ({ card, shown: progress, shift: IN_PLACE }));
}

/** The card sliding in whole from a frame past its place on a side. */
function slidingIn(card: EndingCard, from: FrameSide, beginning: Beginning): Change {
	const start = frameToward(from, beginning.format.frame);
	return propChange('ending', (progress) => ({
		card,
		shown: SHOWN_WHOLE,
		shift: pointToward(start, IN_PLACE, progress)
	}));
}

function going(beginning: Beginning): Change {
	const ending = present(beginning, 'ending', 'ending.hide() hides what is not on the screen');
	return propChange('ending', (progress) => untilTheEnd(progress, { ...ending, shown: 1 - progress }));
}

/** The card sliding out whole to a frame past its place on a side; once there, none. */
function slidingOut(beginning: Beginning, toward: FrameSide): Change {
	const ending = present(beginning, 'ending', 'ending.hide() hides what is not on the screen');
	const end = frameToward(toward, beginning.format.frame);
	return propChange('ending', (progress) =>
		untilTheEnd(progress, { ...ending, shift: pointToward(ending.shift, end, progress) })
	);
}
