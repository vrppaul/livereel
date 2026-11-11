/**
 * A picture of the film's own: an image file the film names, a mark or a logo, shown by an object
 * (`src/props/object.ts`), so it travels, grows, comes near, turns, stands out, comes up and goes as any object does.
 * What is its own is the file it shows and how wide it stands against how tall, as the browser decoded it: it is
 * drawn as large as its box holds all of it, in the box's middle, as a piece of the page is (`src/props/piece.ts`).
 * The stage draws it from the file as it holds it (`layPictures` in `stage/stage.js`), at the frame's density on the
 * frame and in the window, and in the world as densely as the eye magnifies it (`DrawnObject.magnified`), as all
 * markup there.
 */
import { type Box, boxOf } from '../domain/geometry.ts';
import { figureIn } from './piece.ts';

/** A picture of the film's: its file, by the path the film names from its own file, and its width over its height. */
export interface FilmPicture {
	readonly kind: 'picture';
	readonly file: string;
	readonly aspect: number;
}

/**
 * A picture as the stage draws it: its file, the part of its box it is drawn in, in the frame's pixels from the box's
 * top left corner, and how far it has come up and not gone in its own way, fading whole, from 0 to 1.
 */
export interface DrawnFilmPicture {
	readonly kind: 'picture';
	readonly file: string;
	readonly figure: Box;
	readonly shown: number;
}

// A picture's height, which its width is a share of
const ITS_HEIGHT = 1;

/** A picture as the stage draws it in a box, as far as it has come up and not gone. */
export function drawnFilmPicture(picture: FilmPicture, box: Box, shown: number): DrawnFilmPicture {
	const proportions = boxOf({ width: picture.aspect, height: ITS_HEIGHT });
	return { kind: 'picture', file: picture.file, figure: figureIn(proportions, box), shown };
}
