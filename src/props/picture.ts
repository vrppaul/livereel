/**
 * A film's own picture: an image file the film names, a mark or a logo, shown by an object (`src/props/object.ts`).
 * What is its own is the file it shows, how wide it stands against how tall, as the browser decoded it, and how many of
 * the frame's pixels across its file holds: it is drawn as large as its box holds all of it, in the box's middle, as a
 * piece of the page is (`src/props/piece.ts`). The stage draws it from the file as it holds it (`layPictures` in
 * `stage/stage.js`), at the frame's density on the frame and in the window, and in the world as densely as the eye
 * magnifies it (`DrawnObject.magnified`), as all markup there, but no denser than its file's pixels: past them a denser
 * drawing holds the same pixels stretched.
 */
import { type Box, boxOf } from '../domain/geometry.ts';
import type { PictureDecoded } from '../domain/picture.ts';
import { figureIn } from './piece.ts';

/** A picture of the film's: its file, by the path the film names from its own file, and as it decoded. */
export interface FilmPicture extends PictureDecoded {
	readonly kind: 'picture';
	readonly file: string;
}

/** A picture as the stage draws it. */
export interface DrawnFilmPicture {
	readonly kind: 'picture';
	readonly file: string;
	/** The part of its box it is drawn in, in the frame's pixels from the box's top left corner. */
	readonly figure: Box;
	/** How far it has come up and not gone in its own way, fading whole, from 0 to 1. */
	readonly shown: number;
}

// A picture's height, which its width is a share of
const ITS_HEIGHT = 1;

/** A picture as the stage draws it in a box, as far as it has come up and not gone. */
export function drawnFilmPicture(picture: FilmPicture, box: Box, shown: number): DrawnFilmPicture {
	const proportions = boxOf({ width: picture.aspect, height: ITS_HEIGHT });
	return { kind: 'picture', file: picture.file, figure: figureIn(proportions, box), shown };
}

/**
 * How many times the eye may magnify a picture as the stage draws it before a denser drawing holds no more of its file:
 * the frame's pixels across its file holds, for each of its figure's.
 */
export function magnifiedAtMostOfFilmPicture(picture: FilmPicture, drawn: DrawnFilmPicture): number {
	return picture.sharpAcross / drawn.figure.width;
}
