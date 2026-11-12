/**
 * A piece of the page: a part of its screen, the piece's source, lifted onto the frame and drawn from the page's
 * picture as the stage shows it, so it shows what the page shows there as the page changes; or, where the film asks,
 * from a picture of its source alone, held as it was lifted, so it shows what the page showed there then, as the page
 * changes under it. One following the page, drawn larger than livereel's bound has the page's picture taken, is drawn
 * from a picture of its source alone, which the take has the stage hold as close as the frame draws it and takes anew
 * with the page's (`src/studio/take.ts`), so it stays sharp however large it grows. It is what an object shows
 * (`src/props/object.ts`), so it travels, grows, comes near and turns as any object does; what is its own is the part
 * of the screen it shows, drawn as large as its box holds all of it, in the box's middle. Lifted, it may leave a hole
 * where it stood, and draw lines from itself to its source (`src/props/lifted.ts`). The holes other pieces leave in its
 * part of the screen are drawn over it as they stand, as a lens draws them (`src/props/lens.ts`), whichever picture it
 * is drawn from.
 *
 * Standing in the world, it may have a body, fixed as it is lifted: walls of a colour the film names going back from
 * its face as thick as the film names, matte, lit from within as faintly as it names, which the room draws in its one
 * scene (`stage/piece-body.js`). The walls grow back from the face as the piece comes up, as the window's body grows
 * as the screen does, so none comes whole at once, and shrink into it as what it stands in lets less of it show, as a
 * piece on the page in the world does as the screen goes down; standing on the plane it was lifted from, they lie
 * behind it, and come up out of it as the piece stands out toward the eye. Its shadow then lies on that plane, under
 * it, where the room draws it, fading as the face does; the flat stage draws the face and its shadow alone, as it draws
 * no body for the window. Its hole may reach past its edge, a socket the walls come up out of; or be sunk into the page
 * as a pit with walls of the body's colour, which the room draws behind the window's plane, the page cleared over its
 * mouth, going down with the screen, and the flat stage draws as a hole of its colour.
 *
 * It may carry letters, those of a block of its source the film names, measured as it is lifted where the first of
 * them starts and how far one steps, so it lands them on another block's letters (`src/moves/piece.ts`). It may empty a
 * block of the page, which then stands as the page draws it hidden until the piece goes (`src/props/lifted.ts`).
 */
import { type Box, boxOf, measuredFrom, overlapOf, resizedAbout } from '../domain/geometry.ts';
import { type SharperPicture, pictureOfPart } from '../domain/picture.ts';
import { type Fraction, NONE, fractionOf } from '../domain/fraction.ts';
import { ON_ITS_PLANE, type PageOfTheScreen } from '../domain/placement.ts';
import type { Stance } from '../domain/stance.ts';
import { type Effects, unfaded } from './effects.ts';
import type { ObjectName } from './object.ts';
import type { Stroke } from './stroke.ts';

/**
 * A hole sunk into the page as a pit with walls of its own: how deep, in the screen's pixels; its walls' colour, its
 * piece's body's, in hex, darkening from its mouth to its floor; and how strongly a light in their own hue shows in
 * them, a share from 0 none to 1, as a body's does.
 */
export interface Pit {
	readonly depth: number;
	readonly walls: string;
	readonly glow: number;
}

/**
 * What fills the part of the screen a piece was lifted off: a colour, in hex, the line round its edge, if any, how
 * round its corners are, as its piece's, and how far past the piece's edge it reaches each way, its corners as much
 * rounder, in the screen's pixels; and the pit it is sunk into the page as, if any, which the room draws where the flat
 * stage draws its colour.
 */
export interface Hole {
	readonly ground: string;
	readonly line: Stroke | null;
	readonly corner: number;
	readonly reach: number;
	readonly pit: Pit | null;
}

/**
 * A block of the filmed page a piece empties: its box on the screen, in its pixels, as it stood as it was emptied; and
 * the ground the page draws behind it, in hex, which stands over it, as the page draws the block hidden.
 */
export interface Emptied {
	readonly box: Box;
	readonly ground: string;
}

/**
 * A hole as the stage draws it: the name of the piece that left it, the box it fills in what it is drawn on — the
 * screen, in its pixels, or what a piece or a lens shows of it, in the frame's pixels from the figure's top left corner
 * — as far as it reaches, its colour, the line round its edge, if any, how round its corners are, in the pixels its box
 * is in, how far it has come and not gone, as its piece has, and its pit, if any: a figure of the page shows it flat.
 */
export interface DrawnHole extends Omit<Hole, 'reach' | 'pit'> {
	readonly name: ObjectName;
	readonly box: Box;
	readonly shown: number;
	readonly pit: DrawnPit | null;
}

/**
 * A hole's pit as the room draws it: as deep, its walls' colour and glow, and how clear its walls are, as far as the
 * screen it is sunk into has come up, from 0 to 1: nothing lies over its mouth to hide it as the screen goes down.
 */
interface DrawnPit extends Pit {
	readonly clear: Fraction;
}

/** How round each corner of a piece is: a radius, in the pixels its box is in. */
export interface Corners {
	readonly topLeft: number;
	readonly topRight: number;
	readonly bottomRight: number;
	readonly bottomLeft: number;
}

/**
 * What a piece is drawn from: the page's picture as the stage shows it, which follows the page as it changes; or a
 * picture of its source alone, held as it was lifted, which the stage keeps by its number.
 */
export type PiecePicture = { readonly kind: 'following' } | { readonly kind: 'held'; readonly number: number };

/** A piece drawn from the page's picture as the stage shows it. */
export const FOLLOWING_THE_PAGE: PiecePicture = { kind: 'following' };

/**
 * What the stage draws a piece from: the page's picture as it shows it, or a picture of the piece's source alone it
 * holds by its number, the one the piece holds or one sharper than the page's.
 */
export type DrawnPicture = { readonly kind: 'page' } | { readonly kind: 'own'; readonly number: number };

const DRAWN_FROM_THE_PAGE: DrawnPicture = { kind: 'page' };

/**
 * A piece's body: how thick it is, back from its face, in the screen's pixels, as its corners are; the colour of its
 * walls, in hex with no alpha, at its face, darkening toward its back; and how strongly a light in its walls' own hue
 * shows through them, a share from 0 none to 1.
 */
export interface Body {
	readonly thickness: number;
	readonly walls: string;
	readonly glow: number;
}

/**
 * A piece's body as the room draws it: as thick as it shows, in the frame's pixels, its walls' colour and glow; how
 * high its face stands over the plane it was lifted from, in the same pixels, where its shadow lies; how clear its
 * walls are, as far as the piece has not faded, from 0 to 1, as the stylesheet draws its face; and how strong the
 * shadow it casts there is, from 0 to 1, as strong as the piece's shadow and as far as the piece is clear, as the
 * stylesheet fades the face and the shadow it drops for one with no body, none while its face stands on that plane.
 */
export interface DrawnBody extends Body {
	readonly height: number;
	readonly clear: Fraction;
	readonly shadow: Fraction;
}

/**
 * A piece of the page: the part of the screen it shows, in the screen's pixels, and the page the screen showed as it
 * was lifted off it, which its hole belongs to; how round each of its corners is, in the same pixels — as the film
 * names for a rounded block, and as the window where the corner stands on a corner of what the window shows — the hole
 * it leaves there, if any, the line the lines from it to its source are drawn in, if it draws any, the picture it is
 * drawn from, its body, if it has one, where it carries letters, which it lands on a block's letters, the box their
 * first letter takes, as wide as a letter of theirs steps, in the screen's pixels as its source; and the block of the
 * page it empties, if any.
 */
export interface Piece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly liftedOff: PageOfTheScreen;
	readonly corners: Corners;
	readonly hole: Hole | null;
	readonly lines: Stroke | null;
	readonly picture: PiecePicture;
	readonly body: Body | null;
	readonly firstLetter: Box | null;
	readonly emptied: Emptied | null;
}

/**
 * A piece as the stage draws it: its source, how many of the frame's pixels a screen's pixel takes in its box, the part
 * of its box the source is drawn in, in the frame's pixels from the box's top left corner, how round each of its
 * corners is, in the same pixels, the holes it shows there, how far it has come up and not gone in its own way, fading
 * whole, from 0 to 1, the picture it is drawn from, and its body, none where it has none or none of it shows.
 */
export interface DrawnPiece {
	readonly kind: 'piece';
	readonly source: Box;
	readonly fit: number;
	readonly figure: Box;
	readonly corners: Corners;
	readonly holes: readonly DrawnHole[];
	readonly shown: number;
	readonly picture: DrawnPicture;
	readonly body: DrawnBody | null;
}

/** How large a piece stands and how far out toward the eye, how far it has faded, and how strong its shadow is. */
type Standing = Pick<Stance, 'scale' | 'depth'> & Pick<Effects, 'fade' | 'shadow'>;

// A body of no thickness, which is none; and a hole a figure of the page shows, with no pit sunk under it
const NO_THICKNESS = 0;
const SHOWN_FLAT = null;

/**
 * A piece as the stage draws it in a box, standing as large and as far out as it stands and as faded, as far as it has
 * come up and not gone, and as much of it as what it stands in lets show, showing those of the holes on the screen in
 * its source, drawn from the picture it holds, or from one of its source the stage holds sharper than the page's where
 * it is drawn from the page's.
 */
export function drawnPiece(
	piece: Piece,
	box: Box,
	standing: Standing,
	shown: number,
	held: number,
	holes: readonly DrawnHole[],
	sharper: readonly SharperPicture[]
): DrawnPiece {
	const source = piece.source;
	const fit = fitIn(source, box);
	return {
		kind: 'piece',
		source,
		fit,
		figure: figureIn(source, box),
		corners: cornersAt(piece.corners, fit),
		holes: holesShown(holes, source, fit),
		shown,
		picture: drawnPictureOf(piece, sharper),
		body: piece.body === null ? null : drawnBody(piece.body, fit, standing, shown, held)
	};
}

/**
 * A piece's body as the room draws it: as thick as the piece's fit and scale show its thickness, as the walls stand
 * back along the eye's way, which a scale does not stretch, and as far as the piece shows, come up and let show by
 * what it stands in, as the window's body is as thick as the screen has come up; its face as high as it stands out;
 * its walls as clear as the piece has not faded; its shadow as strong as the piece's, as far as it is let show and has
 * not faded, where its face stands out of its plane. None, where that leaves it no thickness.
 */
function drawnBody(body: Body, fit: number, standing: Standing, shown: number, held: number): DrawnBody | null {
	const thickness = body.thickness * fit * standing.scale * (shown * held);
	if (thickness <= NO_THICKNESS) return null;
	const clear = unfaded(standing);
	const shadow = standing.depth > ON_ITS_PLANE ? fractionOf(standing.shadow * (held * clear)) : NONE;
	return { thickness, walls: body.walls, glow: body.glow, height: standing.depth, clear, shadow };
}

/**
 * What the stage draws a piece from: the picture it holds; else a picture of its source the stage holds sharper than
 * the page's, where there is one; else the page's.
 */
function drawnPictureOf(piece: Piece, sharper: readonly SharperPicture[]): DrawnPicture {
	switch (piece.picture.kind) {
		case 'held':
			return { kind: 'own', number: piece.picture.number };
		case 'following': {
			const sharp = pictureOfPart(sharper, piece.source);
			return sharp === undefined ? DRAWN_FROM_THE_PAGE : { kind: 'own', number: sharp.number };
		}
	}
}

/**
 * How many of the frame's pixels a screen's pixel of the page's picture takes in a piece laid in a box: as large as the
 * box holds its source, where it is drawn from the page's picture; none where it is drawn from a picture it holds.
 */
export function pageFitOfPiece(piece: Piece, box: Box): number | null {
	switch (piece.picture.kind) {
		case 'following':
			return fitIn(piece.source, box);
		case 'held':
			return null;
	}
}

/** Corners as round as a figure drawn at a fit shows them. */
function cornersAt(corners: Corners, fit: number): Corners {
	return {
		topLeft: corners.topLeft * fit,
		topRight: corners.topRight * fit,
		bottomRight: corners.bottomRight * fit,
		bottomLeft: corners.bottomLeft * fit
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
 * shows them, flat, as a picture of the page shows a pit; none where it lies outside.
 */
function holeShown(hole: DrawnHole, source: Box, fit: number): readonly DrawnHole[] {
	const shown = overlapOf(hole.box, source);
	if (shown === null) return [];
	return [{ ...hole, box: measuredFrom(shown, source, fit), corner: hole.corner * fit, pit: SHOWN_FLAT }];
}

/** How many of the frame's pixels a screen's pixel takes in a box that holds all of a source, as large as it can. */
function fitIn(source: Box, box: Box): number {
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
