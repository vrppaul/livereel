/** The last card: a name, a line on what it is, and the command that starts it. */

/** What the ending card says. */
export interface EndingCard {
	readonly name: string;
	readonly line: string;
	readonly command: string;
}

/** The ending card, and how far it has come up, from 0 to 1. */
export interface Ending {
	readonly card: EndingCard;
	readonly shown: number;
}
