/**
 * A piece of the page: a part of its screen, the piece's source, lifted onto the frame and drawn from the page's
 * picture as the stage shows it, so it shows what the page shows there as the page changes. It is what an object shows
 * (`src/props/object.ts`), so it travels, grows, comes near and turns as any object does; what is its own is the part
 * of the screen it shows, drawn as large as its box holds all of it, in the box's middle. Lifted, it may leave a hole
 * where it stood, and draw lines from itself to its source (`src/props/lifted.ts`).
 */
import { type Box, boxOf, resizedAbout } from '../domain/geometry.ts';
import type { Stroke } from './stroke.ts';

/** What fills the part of the screen a piece was lifted off: a colour, in hex, and the line round its edge, if any. */
export interface Hole {
	readonly ground: string;
	readonly line: Stroke | null;
}

/**
 * A piece of the page: the part of the screen it shows, in the screen's pixels, the hole it leaves there, if any, and
 * the line the lines from it to its source are drawn in, if it draws any.
 */
export interface Piece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly hole: Hole | null;
	readonly lines: Stroke | null;
}

/**
 * A piece as the stage draws it: its source, how many of the frame's pixels a screen's pixel takes in its box, the part
 * of its box the source is drawn in, in the frame's pixels from the box's top left corner, and how far it has come up
 * and not gone in its own way, fading whole, from 0 to 1.
 */
export interface DrawnPiece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly fit: number;
	readonly figure: Box;
	readonly shown: number;
}

/** A piece as the stage draws it in a box, as far as it has come up and not gone. */
export function drawnPiece(piece: Piece, box: Box, shown: number): DrawnPiece {
	const source = piece.source;
	return { kind: 'piece', source, fit: fitIn(source, box), figure: figureIn(source, box), shown };
}

/** How many of the frame's pixels a screen's pixel takes in a box that holds all of a source, as large as it can. */
export function fitIn(source: Box, box: Box): number {
	return Math.min(box.width / source.width, box.height / source.height);
}

/**
 * The part of a box a source is drawn in, as large as the box holds all of it, in the box's middle: in the frame's
 * pixels from the box's top left corner.
 */
export function figureIn(source: Box, box: Box): Box {
	const fit = fitIn(source, box);
	return resizedAbout(boxOf(box), { width: source.width * fit, height: source.height * fit });
}
