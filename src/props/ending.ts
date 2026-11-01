/**
 * The last card, or the first, what an object shows (`src/props/object.ts`): a name, a line on what it is, and the
 * command that starts it, on the film's ground over the object's box, painted as the frame's own ground where the box
 * stands, so the card covers what is under it with no edge, and slides with it.
 */
import { A_STRING, type Kind, OfForm, needed } from '../domain/handed.ts';
import { OWN_WAY, type Presence, type Way, presentShare } from './way.ts';
import { groundOf } from './words.ts';

/** What the ending card says. */
export interface EndingCard {
	readonly name: string;
	readonly line: string;
	readonly command: string;
}

export const A_CARD: Kind<EndingCard> = new OfForm<EndingCard>(
	{ name: needed(A_STRING), line: needed(A_STRING), command: needed(A_STRING) },
	'an ending card: { name, line, command }, each a string'
);

/** The ending card as an object shows it. */
export interface Ending {
	readonly kind: 'ending';
	readonly card: EndingCard;
}

/**
 * The ending card as the stage draws it: how much of it stands, its ground and its lines one sheet, and how much of its
 * ground stands on that sheet, under its lines, each from 0 to 1.
 */
export interface DrawnEnding extends Ending {
	readonly shown: number;
	readonly grounded: number;
}

// The sheet standing whole, in a way of livereel's; and its ground on it, in its own way
const WHOLE = 1;

/**
 * The card as the stage draws it, the object showing it as far as `presence` along. In its own way the card comes up
 * and goes whole, its ground and its lines one sheet, where a title card's ground and words come apart in their own
 * way too, as `presencesIn` has them; in a way of livereel's its lines stand whole, for the way to bring, and its
 * ground comes up and goes on the sheet as a title card's does, twice as fast as the way, so the lines stand on it.
 */
export function drawnEnding(ending: Ending, way: Way, presence: Presence): DrawnEnding {
	return way.kind === OWN_WAY.kind
		? { ...ending, shown: presentShare(presence), grounded: WHOLE }
		: { ...ending, shown: WHOLE, grounded: groundOf(presence.shown, presence.gone) };
}
