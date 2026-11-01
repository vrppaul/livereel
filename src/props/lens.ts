/**
 * A lens: a round glass over the page that shows the part of the screen under its middle magnified past what the camera
 * shows there, wherever it stands, so it shows another part as it travels or as the camera moves under it. Drawn from
 * the page's picture, as a piece of the page is (`src/props/piece.ts`), filling its box; it is what an object shows
 * (`src/props/object.ts`), and comes up, travels and goes as one.
 */
import { type Camera, frameZoomOf, underTheFrame } from '../domain/camera.ts';
import { type Box, type Point, type Size, boxCentredOn, boxOf } from '../domain/geometry.ts';
import { A_NUMBER, type Kind, Plain } from '../domain/handed.ts';

/** A lens: how many times larger it shows the page than the camera does. */
export interface Lens {
	readonly kind: 'lens';
	readonly magnification: number;
}

/** How many times larger a film has a lens show the page than the camera does: any number more than none. */
export const A_MAGNIFICATION: Kind<number> = new Plain(
	isMagnification,
	'a magnification, more than 0, 2 showing the page twice as large as the camera'
);

// A magnification of nothing, which shows no page
const NO_MAGNIFICATION = 0;

/**
 * A lens as the stage draws it: the part of the screen it shows, none where its middle sees past the screen's plane,
 * how many of the frame's pixels a screen's pixel takes in it, the part of its box that shows it, all of it, in the
 * frame's pixels from its top left corner, and how far it has come up and not gone in its own way, fading whole.
 */
export interface DrawnLens {
	readonly kind: 'lens';
	readonly source: Box | null;
	readonly fit: number;
	readonly figure: Box;
	readonly shown: number;
}

/**
 * A lens as the stage draws it in its box, its middle drawn at a point of the frame, over the page as a camera shows it
 * on a frame of a size, as far as it has come up and not gone.
 */
export function drawnLens(lens: Lens, box: Box, middle: Point, camera: Camera, frame: Size, shown: number): DrawnLens {
	const fit = lensFit(lens, camera, frame);
	const under = underTheFrame(camera, frame, middle);
	const source = under === null ? null : boxCentredOn(under, { width: box.width / fit, height: box.height / fit });
	return { kind: 'lens', source, fit, figure: boxOf(box), shown };
}

/** How many of the frame's pixels a screen's pixel takes in a lens: as many as the camera shows it at, magnified. */
export function lensFit(lens: Lens, camera: Camera, frame: Size): number {
	return lens.magnification * frameZoomOf(camera.pose, frame);
}

function isMagnification(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NO_MAGNIFICATION;
}
