/**
 * A piece of the page: a part of its screen, the piece's source, lifted onto the frame and drawn from the page's
 * picture as the stage shows it, so it shows what the page shows there as the page changes. It is what an object shows
 * (`src/props/object.ts`), so it travels, grows, comes near and turns as any object does; what is its own is the part
 * of the screen it shows, drawn as large as its box holds all of it, in the box's middle.
 */
import type { Box } from '../domain/geometry.ts';

/** A piece of the page: the part of the screen it shows, in the screen's pixels. */
export interface Piece {
	readonly kind: 'piece';
	readonly source: Box;
}

/**
 * A piece as the stage draws it: its source, how many of the frame's pixels a screen's pixel takes in its box, and how
 * far it has come up and not gone in its own way, fading whole, from 0 to 1.
 */
export interface DrawnPiece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly fit: number;
	readonly shown: number;
}

/** A piece as the stage draws it in a box, as far as it has come up and not gone. */
export function drawnPiece(piece: Piece, box: Box, shown: number): DrawnPiece {
	return { kind: 'piece', source: piece.source, fit: fitIn(piece.source, box), shown };
}

/** How many of the frame's pixels a screen's pixel takes in a box that holds all of a source, as large as it can. */
export function fitIn(source: Box, box: Box): number {
	return Math.min(box.width / source.width, box.height / source.height);
}
