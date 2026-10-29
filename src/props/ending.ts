/**
 * The last card, or the first: a name, a line on what it is, and the command that starts it, on the film's ground
 * over the whole frame, which slides with it where it comes in from a side or leaves toward one.
 */
import type { Point } from '../domain/geometry.ts';
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

/**
 * The ending card, how far it has come up, from 0 to 1, and how far it stands from its place, across and down, in the
 * frame's pixels, as it slides.
 */
export interface Ending {
	readonly card: EndingCard;
	readonly shown: number;
	readonly shift: Point;
}

// A card in its place, slid nowhere
export const IN_PLACE: Point = { left: 0, top: 0 };
