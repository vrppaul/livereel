/**
 * Pictures of parts of the page's screen, apart from the page's own picture: a part asked as close as a camera at a
 * zoom shows it, and a picture of one the stage holds by its number. A piece drawn from the page's picture past
 * livereel's bound is drawn from one (`src/props/piece.ts`), which the take keeps for as long as it serves
 * (`src/studio/take.ts`); both build on what is said here, as neither builds on the other.
 */
import { type Box, sameBox } from './geometry.ts';

/** A part of the screen asked for as close as a camera at a zoom shows it. */
export interface PartAsked {
	readonly part: Box;
	readonly zoom: number;
}

/**
 * A picture of a part of the screen the stage holds sharper than the page's picture, as the page stood when it was
 * taken: the part, how close it holds it, and its number.
 */
export interface SharperPicture extends PartAsked {
	readonly number: number;
}

/** Each part asked once, as close as it is asked at the most. */
export function closestOf(asked: readonly PartAsked[]): readonly PartAsked[] {
	return asked
		.filter((wanted, place) => asked.findIndex((other) => sameBox(other.part, wanted.part)) === place)
		.map((wanted) => ({ part: wanted.part, zoom: Math.max(...zoomsAskedOf(asked, wanted.part)) }));
}

/** Every zoom a part is asked at. */
function zoomsAskedOf(asked: readonly PartAsked[], part: Box): readonly number[] {
	return asked.filter((other) => sameBox(other.part, part)).map((other) => other.zoom);
}

/** Whether a picture holds a part as close as it is asked. */
export function serves(picture: SharperPicture, asked: PartAsked): boolean {
	return sameBox(picture.part, asked.part) && picture.zoom >= asked.zoom;
}

/** The picture of a part among those held, where one is. */
export function pictureOfPart(pictures: readonly SharperPicture[], part: Box): SharperPicture | undefined {
	return pictures.find((picture) => sameBox(picture.part, part));
}
