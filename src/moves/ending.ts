/**
 * The ending card, shown by an object (`src/moves/object.ts`) over the whole frame: coming up with livereel's ending
 * sound as it begins, or sliding in whole with its ground from past a side of the frame; and going, or sliding out past
 * a side: a film may open on the card as well, its name and line, and go on to the page once it has gone. A slide moves
 * a whole frame, as words and the window do, so the card and what slides with it move as one sheet.
 */
import { A_FRAME_SIDE, boxOf } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { type Move, TIMING_FORM } from '../direction/move.ts';
import { heardAsItBegins, livereelSound } from '../direction/sound.ts';
import { A_CARD, type EndingCard } from '../props/ending.ts';
import { type HideScript, NAMED_FORM, type ObjectKind, type ShowScript, objectHide, objectShow } from './object.ts';

const ENDING: ObjectKind = 'ending';
const ENDING_FORM: Form<ShowScript> = { from: A_FRAME_SIDE, ...NAMED_FORM, ...TIMING_FORM };

/** The card coming up over the whole frame, or sliding in whole from past a side of it. */
export function show(card: EndingCard, script: ShowScript = {}): Move {
	assertKind(card, A_CARD, "ending.show's card");
	assertWritten(script, ENDING_FORM, 'ending.show');
	return {
		...objectShow(ENDING, 'ending.show', script, null, (beginning) => ({
			content: { kind: 'ending', card },
			box: boxOf(beginning.format.frame)
		})),
		sounds: [heardAsItBegins(livereelSound('ending'))]
	};
}

/** The card on the screen going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(ENDING, 'ending.hide', script);
}
