/** The last card: a name, a line on what it is, and the command that starts it. */
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

/** The ending card, and how far it has come up, from 0 to 1. */
export interface Ending {
	readonly card: EndingCard;
	readonly shown: number;
}
