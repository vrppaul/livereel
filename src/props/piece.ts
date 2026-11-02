/**
 * A piece of the page: a part of its screen, the piece's source, lifted onto the frame and drawn from the page's
 * picture as the stage shows it, so it shows what the page shows there as the page changes. It is what an object shows
 * (`src/props/object.ts`), so it travels, grows, comes near and turns as any object does; what is its own is the part
 * of the screen it shows, drawn as large as its box holds all of it, in the box's middle. Lifted, it may leave a hole
 * where it stood, and draw lines from itself to its source (`src/props/lifted.ts`). It shows the page as it stands, so
 * the holes other pieces leave in its part of the screen with it, as a lens does (`src/props/lens.ts`).
 */
import { type Box, boxOf, measuredFrom, overlapOf, resizedAbout } from '../domain/geometry.ts';
import type { ObjectName } from './object.ts';
import type { Stroke } from './stroke.ts';

/**
 * What fills the part of the screen a piece was lifted off: a colour, in hex, the line round its edge, if any, and how
 * round its corners are, as its piece's, in the screen's pixels.
 */
export interface Hole {
	readonly ground: string;
	readonly line: Stroke | null;
	readonly corner: number;
}

/**
 * A hole as the stage draws it: the name of the piece that left it, the box it fills in what it is drawn on — the
 * screen, in its pixels, or what a piece or a lens shows of it, in the frame's pixels from the figure's top left corner
 * — its colour, the line round its edge, if any, how round its corners are, in the pixels its box is in, and how far
 * it has come and not gone, as its piece has.
 */
export interface DrawnHole extends Hole {
	readonly name: ObjectName;
	readonly box: Box;
	readonly shown: number;
}

/**
 * A piece of the page: the part of the screen it shows, in the screen's pixels, how round its corners are, as the film
 * names them for a rounded block, in the same pixels, the hole it leaves there, if any, and the line the lines from it
 * to its source are drawn in, if it draws any.
 */
export interface Piece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly corner: number;
	readonly hole: Hole | null;
	readonly lines: Stroke | null;
}

/**
 * A piece as the stage draws it: its source, how many of the frame's pixels a screen's pixel takes in its box, the part
 * of its box the source is drawn in, in the frame's pixels from the box's top left corner, how round its corners are,
 * in the same pixels, the holes it shows there, and how far it has come up and not gone in its own way, fading whole,
 * from 0 to 1.
 */
export interface DrawnPiece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly fit: number;
	readonly figure: Box;
	readonly corner: number;
	readonly holes: readonly DrawnHole[];
	readonly shown: number;
}

/**
 * A piece as the stage draws it in a box, as far as it has come up and not gone, showing those of the holes on the
 * screen in its source.
 */
export function drawnPiece(piece: Piece, box: Box, shown: number, holes: readonly DrawnHole[]): DrawnPiece {
	const source = piece.source;
	const fit = fitIn(source, box);
	return {
		kind: 'piece',
		source,
		fit,
		figure: figureIn(source, box),
		corner: piece.corner * fit,
		holes: holesShown(holes, source, fit),
		shown
	};
}

/**
 * The holes on the screen a figure drawn from a source at a fit shows, each cut to the source and laid where it stands
 * in the figure, in the frame's pixels from its top left corner; none of those outside it.
 */
export function holesShown(holes: readonly DrawnHole[], source: Box, fit: number): readonly DrawnHole[] {
	return holes.flatMap((hole) => holeShown(hole, source, fit));
}

/**
 * A hole as a figure drawn from a source at a fit shows it, cut to the source, its corners as round as the figure
 * shows them; none where it lies outside.
 */
function holeShown(hole: DrawnHole, source: Box, fit: number): readonly DrawnHole[] {
	const shown = overlapOf(hole.box, source);
	return shown === null ? [] : [{ ...hole, box: measuredFrom(shown, source, fit), corner: hole.corner * fit }];
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
