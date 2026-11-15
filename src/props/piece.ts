/**
 * A piece of the page: a part of its screen, its source, lifted onto the frame and drawn from the page's picture as the
 * stage shows it, so it shows what the page shows there as the page changes; or, lifted `picture: 'held'`, from a
 * picture of its source alone, so it shows what the page showed there as it was lifted. Where one following the page is
 * drawn larger than livereel's bound for the page's picture, it is drawn from a picture of its source alone, held as
 * close as the frame draws it and taken anew with the page's (`src/studio/take.ts`), so it stays sharp however large it
 * grows, while it does not lean.
 *
 * It is what an object shows (`src/props/object.ts`). Its own are the part of the screen it shows, the hole it leaves
 * and the lines it draws to its source (`src/props/lifted.ts`), and, standing in the world, a body: walls going back
 * from its face, which the room draws in its one scene (`stage/piece-body.js`) and the flat stage does not.
 */
import { ZOOM_AT_MOST } from '../domain/camera.ts';
import {
	type Box,
	type Corners,
	boxOf,
	cornersTimes,
	measuredFrom,
	overlapOf,
	resizedAbout
} from '../domain/geometry.ts';
import { type SharperPicture, pictureOfPart } from '../domain/picture.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
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
 * round each of its corners is, as its piece's block draws them, and how far past the piece's edge it reaches each way,
 * its corners as much rounder, in the screen's pixels; and the pit it is sunk into the page as, if any, which the room
 * draws where the flat stage draws its colour.
 */
export interface Hole {
	readonly ground: string;
	readonly line: Stroke | null;
	readonly corners: Corners;
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

/** A hole as the stage draws it. */
export interface DrawnHole extends Omit<Hole, 'reach' | 'pit'> {
	/** The name of the piece that left it. */
	readonly name: ObjectName;
	/**
	 * The box it fills in what it is drawn on, as far as it reaches: the screen, in its pixels, or what a piece or a lens
	 * shows of it, in the frame's pixels from the figure's top left corner; its `corners` are in those same pixels.
	 */
	readonly box: Box;
	/** How far it has come and not gone, as its piece has. */
	readonly shown: number;
	/** Its pit; none where it has none, and in a figure of the page, which shows it flat. */
	readonly pit: DrawnPit | null;
}

/**
 * How a hole's pit stands as the room draws it: how clear its walls are, as far as the screen it is sunk into has come
 * up, from 0 to 1: nothing lies over its mouth to hide it as the screen goes down; and how far the window's shade
 * reaches it, from 0 to 1, wholly where its piece stands in the shade, as it is a hole in the page, none where its
 * piece stands in no shade.
 */
export interface PitStanding {
	readonly clear: Fraction;
	readonly shaded: Fraction | null;
}

/** A hole's pit as the room draws it: as deep, its walls' colour and glow, standing as it does. */
type DrawnPit = Pit & PitStanding;

/**
 * How a piece lifted into the world stands in the window's shade: reached by it as the page is while its face lies on
 * the page's plane, the less the farther it stands out toward the eye, and none from a height on, in the frame's own
 * pixels as its depth is, so a part lifted off a soft and faded page stays as soft and as faded as the page as far as
 * it has not risen.
 */
export interface InTheShade {
	readonly clearAt: number;
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

/**
 * What the stage draws a piece from, and how close that picture holds the piece's source, as a pose's zoom has it, past
 * which a denser drawing of the piece holds no more of it.
 */
export interface DrawnFrom {
	readonly picture: DrawnPicture;
	readonly zoom: number;
}

// The page's picture, taken no closer than livereel's bound (`zoomPicturedFor`)
const DRAWN_FROM_THE_PAGE: DrawnFrom = { picture: { kind: 'page' }, zoom: ZOOM_AT_MOST };

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

/** A piece's body as the room draws it: as thick as it shows, in the frame's pixels, and its walls' colour and glow. */
export interface DrawnBody extends Body {
	/** How high its face stands over the plane it was lifted from, in the frame's pixels, where its shadow lies. */
	readonly height: number;
	/** How clear its walls are, as far as the piece has not faded, from 0 to 1, as the stylesheet draws its face. */
	readonly clear: Fraction;
	/**
	 * How strong the shadow it casts there is, from 0 to 1: as strong as the piece's shadow and as far as the piece is
	 * clear, as the stylesheet fades the face and the shadow it drops for one with no body; none while its face stands on
	 * that plane.
	 */
	readonly shadow: Fraction;
}

/** A piece of the page, as an object shows it. */
export interface Piece {
	readonly kind: 'piece';
	/** The part of the screen it shows, in the screen's pixels. */
	readonly source: Box;
	/** The page the screen showed as it was lifted off it, which its hole belongs to. */
	readonly liftedOff: PageOfTheScreen;
	/**
	 * How round each of its corners is, in the screen's pixels: as the film names for a rounded block, and as the window
	 * where the corner stands on a corner of what the window shows.
	 */
	readonly corners: Corners;
	readonly hole: Hole | null;
	/** The line its lines to its source are drawn in; none where it draws none. */
	readonly lines: Stroke | null;
	readonly picture: PiecePicture;
	readonly body: Body | null;
	/**
	 * The box the first letter it carries takes, as wide as one of its letters steps, in the screen's pixels; none where
	 * it carries no letters to land on a block's.
	 */
	readonly firstLetter: Box | null;
	readonly emptied: Emptied | null;
	/** How it stands in the window's shade; none where the film lifts it into no shade. */
	readonly inTheShade: InTheShade | null;
}

/** A piece as the stage draws it. */
export interface DrawnPiece {
	readonly kind: 'piece';
	readonly source: Box;
	/** How many of the frame's pixels a screen's pixel takes in its box. */
	readonly fit: number;
	/** The part of its box the source is drawn in, in the frame's pixels from the box's top left corner. */
	readonly figure: Box;
	/** How round each of its corners is, in the frame's pixels, as `figure` is. */
	readonly corners: Corners;
	/**
	 * The holes other pieces leave in its source as they stand now, whichever picture it is drawn from, in the frame's
	 * pixels from its figure's corner.
	 */
	readonly holes: readonly DrawnHole[];
	/** How far it has come up and not gone in its own way, fading whole, from 0 to 1. */
	readonly shown: number;
	readonly picture: DrawnPicture;
	/** Its body; none where it has none, or none of it shows. */
	readonly body: DrawnBody | null;
	/**
	 * How far the window's shade reaches it, from 0 to 1, which the stage shades it by as the window's shade stands; none
	 * where it stands in no shade.
	 */
	readonly shaded: Fraction | null;
}

/** How large a piece stands and how far out toward the eye, how far it has faded, and how strong its shadow is. */
type Standing = Pick<Stance, 'scale' | 'depth'> & Pick<Effects, 'fade' | 'shadow'>;

// A body of no thickness, which is none; and a hole a figure of the page shows, with no pit sunk under it
const NO_THICKNESS = 0;
const SHOWN_FLAT = null;
// A piece, and its pit, the window's shade reaches not at all, where the film lifts it into no shade
const IN_NO_SHADE = null;

/**
 * A piece as the stage draws it in a box, standing as large and as far out as it stands and as faded, as far as it has
 * come up and not gone, and as much of it as what it stands in lets show, showing those of the holes on the screen in
 * its source, drawn from a picture (`drawnFromOf`).
 */
export function drawnPiece(
	piece: Piece,
	box: Box,
	standing: Standing,
	shown: number,
	held: number,
	holes: readonly DrawnHole[],
	picture: DrawnPicture
): DrawnPiece {
	const source = piece.source;
	const fit = fitIn(source, box);
	return {
		kind: 'piece',
		source,
		fit,
		figure: figureIn(source, box),
		corners: cornersTimes(piece.corners, fit),
		holes: holesShown(holes, source, fit),
		shown,
		picture,
		body: piece.body === null ? null : drawnBody(piece.body, fit, standing, shown, held),
		shaded: shadedAt(piece.inTheShade, standing.depth)
	};
}

/**
 * How far the window's shade reaches a piece whose face stands so far out of the plane it was lifted from: whole on
 * that plane, none from the height it clears the shade at, evenly between; not at all where the film lifts it into no
 * shade, so it and its pit stand as the room draws what stands clear of the shade.
 */
function shadedAt(inTheShade: InTheShade | null, depth: number): Fraction | null {
	if (inTheShade === null) return IN_NO_SHADE;
	return fractionOf(WHOLE - Math.max(depth, ON_ITS_PLANE) / inTheShade.clearAt);
}

/**
 * A piece's body as the room draws it: as thick as the piece's fit and scale show its thickness, as the walls stand
 * back along the eye's way, which a scale does not stretch, and as far as the piece shows, come up and let show by what
 * it stands in, as the window's body is as thick as the screen has come up; its face as high as it stands out; its
 * walls as clear as the piece has not faded; its shadow as strong as the piece's, as far as it is let show and has not
 * faded, where its face stands out of its plane. None, where that leaves it no thickness.
 */
function drawnBody(body: Body, fit: number, standing: Standing, shown: number, held: number): DrawnBody | null {
	const thickness = body.thickness * fit * standing.scale * (shown * held);
	if (thickness <= NO_THICKNESS) return null;
	const clear = unfaded(standing);
	const shadow = standing.depth > ON_ITS_PLANE ? fractionOf(standing.shadow * (held * clear)) : NONE;
	return { thickness, walls: body.walls, glow: body.glow, height: standing.depth, clear, shadow };
}

/**
 * What the stage draws a piece from, among the pictures of parts of the screen it holds sharper than the page's: the
 * picture the piece holds, as close as livereel's bound (`src/studio/pictures.ts`); else one of its source held
 * sharper, as close as it was asked; else the page's. A picture Chrome's bounds take softer than asked
 * (`src/adapters/browser/bounds.ts`) holds less than its zoom says.
 */
export function drawnFromOf(piece: Piece, sharper: readonly SharperPicture[]): DrawnFrom {
	switch (piece.picture.kind) {
		case 'held':
			return { picture: { kind: 'own', number: piece.picture.number }, zoom: ZOOM_AT_MOST };
		case 'following': {
			const sharp = pictureOfPart(sharper, piece.source);
			if (sharp === undefined) return DRAWN_FROM_THE_PAGE;
			return { picture: { kind: 'own', number: sharp.number }, zoom: sharp.zoom };
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

/**
 * The holes on the screen a figure drawn from a source at a fit shows, each cut to the source and laid where it stands
 * in the figure, in the frame's pixels from its top left corner; none of those outside it.
 */
export function holesShown(holes: readonly DrawnHole[], source: Box, fit: number): readonly DrawnHole[] {
	return holes.flatMap((hole) => holeShown(hole, source, fit));
}

/**
 * A hole as a figure drawn from a source at a fit shows it, cut to the source, its corners as round as the figure shows
 * them, flat, as a picture of the page shows a pit; none where it lies outside.
 */
function holeShown(hole: DrawnHole, source: Box, fit: number): readonly DrawnHole[] {
	const shown = overlapOf(hole.box, source);
	if (shown === null) return [];
	return [
		{ ...hole, box: measuredFrom(shown, source, fit), corners: cornersTimes(hole.corners, fit), pit: SHOWN_FLAT }
	];
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
