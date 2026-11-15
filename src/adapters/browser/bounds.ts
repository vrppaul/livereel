/**
 * How large a picture of the page Chrome takes whole where it draws, and the memory it is told of for the largest.
 *
 * CDP's capture draws a picture as one surface at its scale, and one too large for where it draws comes out with no
 * error, but wrong. On the graphics card it is drawn no larger than the card's largest texture on a side, as WebGL
 * reports it, and past that shows the page from elsewhere in its place. Chrome draws a picture only as far as the
 * memory it holds for drawing, and leaves the rest blank, drawing as little as 0.84 of the bytes it is told: told none,
 * it drew 116 million pixels whole, and told 1.25 times a picture's bytes, it drew that picture whole. It refuses a
 * picture of more than 2 GiB outright, "Unable to capture screenshot". And a JPEG holds no picture taller or wider than
 * 65,500 px: the stage cannot decode one Chrome took larger.
 *
 * The memory Chrome is told of is sized before the browser starts, before the card's largest texture can be read, so on
 * a card it may be more than the pictures take.
 */
import type { Page } from 'playwright-core';
import { ZOOM_AT_MOST } from '../../domain/camera.ts';
import type { Size } from '../../domain/geometry.ts';
import type { PageKind } from '../../direction/film.ts';

/** What a picture is held to: the most pixels on its longer side, or in all; and what says why, to the person. */
export interface PictureBound {
	readonly kind: 'side' | 'pixels';
	readonly most: number;
	readonly says: string;
}

/** The scale a picture is taken at, a picture's pixels to the page's, and the bound that held it short of the asked. */
export interface ScaleTaken {
	readonly scale: number;
	readonly heldBy: PictureBound | null;
}

export const BYTES_A_PIXEL = 4;
export const BYTES_A_MEGABYTE = 1_048_576;
export const NO_MEMORY = 0;
// The most pixels a JPEG holds on a side, as libjpeg has it
const JPEG_SIDE = 65_500;
const A_JPEGS_SIDE: PictureBound = {
	kind: 'side',
	most: JPEG_SIDE,
	says: `a JPEG holds no more than ${JPEG_SIDE} px on a side`
};
// The most bytes Chrome takes a picture of, 2 GiB, and so the most pixels
const PICTURE_BYTES_AT_MOST = 2_147_483_648;
const A_PICTURES_BYTES: PictureBound = {
	kind: 'pixels',
	most: PICTURE_BYTES_AT_MOST / BYTES_A_PIXEL,
	says: 'Chrome takes no picture of more than 2 GiB'
};
// The most pixels of a picture Chrome was seen to draw whole in the memory it holds by itself; and the bytes of memory
// it is told of for each byte of a larger picture, past the least it drew of what it was told
const PIXELS_DRAWN_BY_ITSELF = 116_000_000;
const MEMORY_FOR_A_PICTURE_BYTE = 1.25;
// A page framed live has no picture taken of it
const NO_PICTURES = 0;
const A_MILLION = 1_000_000;

/**
 * The most pixels a picture of a page of this kind is taken with: as many as the screen's own at livereel's closest,
 * within a JPEG's side and 2 GiB, or as many as Chrome draws whole by itself where that is more; none for a page framed
 * live.
 */
export function picturePixelsAtMost(page: PageKind, screen: Size, pixelsAtZoomOne: number): number {
	switch (page) {
		case 'static': {
			const closest = scaleWithin(screen, pixelsAtZoomOne * ZOOM_AT_MOST, [A_JPEGS_SIDE, A_PICTURES_BYTES]).scale;
			return Math.max(PIXELS_DRAWN_BY_ITSELF, screen.width * screen.height * closest * closest);
		}
		case 'dynamic':
			return NO_PICTURES;
	}
}

/**
 * The GPU memory Chrome is told of for pictures of so many pixels, in megabytes: none where it draws them by itself.
 */
export function picturesMemoryOf(pixels: number): number {
	if (pixels <= PIXELS_DRAWN_BY_ITSELF) return NO_MEMORY;
	return Math.ceil((MEMORY_FOR_A_PICTURE_BYTE * pixels * BYTES_A_PIXEL) / BYTES_A_MEGABYTE);
}

/**
 * The bounds a picture is taken within: a JPEG's side, 2 GiB, the pixels Chrome has memory for, and, where it draws on
 * a graphics card whose largest texture is known, that on a side; none of the card's elsewhere.
 */
export function boundsOf(pixels: number, cardSide: number | null): readonly PictureBound[] {
	const drawn: PictureBound = {
		kind: 'pixels',
		most: pixels,
		says: `Chrome draws no picture of more than ${Math.floor(pixels / A_MILLION)} million px whole in the memory it has`
	};
	if (cardSide === null) return [A_JPEGS_SIDE, A_PICTURES_BYTES, drawn];
	const card: PictureBound = {
		kind: 'side',
		most: cardSide,
		says: `on this graphics card Chrome takes no picture larger than ${cardSide} px on a side`
	};
	return [A_JPEGS_SIDE, A_PICTURES_BYTES, drawn, card];
}

/** A picture of a part of this size taken as close as asked where it fits every bound, else as the tightest lets it. */
export function scaleWithin(part: Size, asked: number, bounds: readonly PictureBound[]): ScaleTaken {
	let taken: ScaleTaken = { scale: asked, heldBy: null };
	for (const bound of bounds) {
		const most = mostWithin(part, bound);
		if (most < taken.scale) taken = { scale: most, heldBy: bound };
	}
	return taken;
}

/** The largest scale a picture of a part of this size is taken at within a bound. */
function mostWithin(part: Size, bound: PictureBound): number {
	switch (bound.kind) {
		case 'side':
			return bound.most / Math.max(part.width, part.height);
		case 'pixels':
			return Math.sqrt(bound.most / (part.width * part.height));
	}
}

/** The largest texture of the graphics card a page draws on, as WebGL reports it there; none where it has no WebGL. */
export function cardSideOf(page: Page): Promise<number | null> {
	return page.evaluate(largestTexture);
}

// What follows runs in the page, handed over alone

function largestTexture(): number | null {
	const context = document.createElement('canvas').getContext('webgl');
	if (context === null) return null;
	const largest: unknown = context.getParameter(context.MAX_TEXTURE_SIZE);
	return typeof largest === 'number' ? largest : null;
}
