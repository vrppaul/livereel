/**
 * The last card, or the first, what an object shows (`src/props/object.ts`): a name, a line on what it is, and the
 * command that starts it, on the film's ground over the object's box, painted as the frame's own ground where the box
 * stands, so the card covers what is under it with no edge, and slides with it.
 */
import { A_STRING, type Kind, OfForm, needed } from '../domain/handed.ts';

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

/** The ending card as the stage draws it, and how much of it stands, from 0 to 1. */
export interface DrawnEnding extends Ending {
	readonly shown: number;
}

/** The card as the stage draws it, the object showing it standing `shown` of the way. */
export function drawnEnding(ending: Ending, shown: number): DrawnEnding {
	return { ...ending, shown };
}
