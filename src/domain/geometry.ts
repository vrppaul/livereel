/**
 * Sizes, points and boxes, in the page's own CSS pixels.
 *
 * The frame is what a film is shot at, the screen what its page is laid out on; a box is where a block of the page
 * stands on that screen, with no camera applied, or a part of the frame, as the page's window on it. Every other
 * measure of a film is read off these.
 */
import { A_NUMBER, A_PIXELS, type Kind, OfForm, OneOf, needed } from './handed.ts';
import { between } from './time.ts';

export interface Size {
	readonly width: number;
	readonly height: number;
}

/** A point of the screen, or of the frame: how far from its left edge, and how far down from its top. */
export interface Point {
	readonly left: number;
	readonly top: number;
}

/** The sides of the frame: where words stand, the page's window across from them, and what slides in or out. */
export const FRAME_SIDES = ['left', 'right', 'top', 'bottom'] as const;

export type FrameSide = (typeof FRAME_SIDES)[number];

export const A_FRAME_SIDE = new OneOf(FRAME_SIDES, 'a side of the frame: "left", "right", "top" or "bottom"');

export const A_POINT: Kind<Point> = new OfForm<Point>(
	{ left: needed(A_NUMBER), top: needed(A_NUMBER) },
	'a point: { left, top }, each a number'
);

/** Where a block of the page stands on the screen, or a part of the frame: its left and top edges, and how big it is. */
export interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

/** A box as a film hands it: its left and top edges, anywhere, and how big it is, in pixels, none at least. */
export const A_BOX: OfForm<Box> = new OfForm<Box>(
	{ left: needed(A_NUMBER), top: needed(A_NUMBER), width: needed(A_PIXELS), height: needed(A_PIXELS) },
	"a box of the page's screen: { left, top, width, height }, in its pixels"
);

/** A curve from a start to an end, drawn toward its bend: a quadratic Bézier. */
export interface Arc {
	readonly start: Point;
	readonly bend: Point;
	readonly end: Point;
}

// The middle of a length lies half-way along it
const HALVES = 2;
// The shorter side of the frames the stage's look was made on, 1920 × 1080 and 1080 × 1080: what it draws in the
// frame's own pixels is drawn as on such a frame, and scaled to the frame shot
const LOOK_MADE_ON = 1080;

/** How large the stage draws on a frame, against the frames its look was made on: by the frame's shorter side. */
export function frameScaleOf(frame: Size): number {
	return Math.min(frame.width, frame.height) / LOOK_MADE_ON;
}

export function middleX(box: Box): number {
	return box.left + box.width / HALVES;
}

export function middleY(box: Box): number {
	return box.top + box.height / HALVES;
}

/** A box of a size standing about another box's middle. */
export function resizedAbout(box: Box, size: Size): Box {
	return {
		left: middleX(box) - size.width / HALVES,
		top: middleY(box) - size.height / HALVES,
		width: size.width,
		height: size.height
	};
}

/** The corners of a box: top left, top right, bottom left, bottom right. */
export function cornersOf(box: Box): readonly Point[] {
	const right = box.left + box.width;
	const bottom = box.top + box.height;
	return [
		{ left: box.left, top: box.top },
		{ left: right, top: box.top },
		{ left: box.left, top: bottom },
		{ left: right, top: bottom }
	];
}

/** A size laid from the top left: the whole of a frame or a screen as a box. */
export function boxOf(size: Size): Box {
	return { left: 0, top: 0, width: size.width, height: size.height };
}

/** How far a size's corner stands from the corner across from it. */
export function diagonalOf(size: Size): number {
	return Math.hypot(size.width, size.height);
}

export function distanceBetween(first: Point, second: Point): number {
	return Math.hypot(first.left - second.left, first.top - second.top);
}

/** The point of a size laid from its top left nearest to a point: the point itself, where it lies within. */
export function nearestWithin(point: Point, size: Size): Point {
	return {
		left: Math.min(Math.max(point.left, 0), size.width),
		top: Math.min(Math.max(point.top, 0), size.height)
	};
}

/** Whether a box is the whole of a size laid from its top left, edge to edge. */
export function isTheWholeOf(box: Box, size: Size): boolean {
	return box.left === 0 && box.top === 0 && box.width === size.width && box.height === size.height;
}

/** Whether a box lies wholly outside a size laid from its top left: no part of it within. */
export function liesOutside(box: Box, size: Size): boolean {
	return liesAboveOrBelow(box, size) || box.left + box.width <= 0 || box.left >= size.width;
}

/** Whether a box lies wholly above a size laid from its top left, or wholly below it. */
export function liesAboveOrBelow(box: Box, size: Size): boolean {
	return box.top + box.height <= 0 || box.top >= size.height;
}

/** The part of a box within a size laid from its top left, for a box that does not lie wholly outside it. */
export function partWithin(box: Box, size: Size): Box {
	const left = Math.max(box.left, 0);
	const top = Math.max(box.top, 0);
	const right = Math.min(box.left + box.width, size.width);
	const bottom = Math.min(box.top + box.height, size.height);
	return { left, top, width: right - left, height: bottom - top };
}

/** A box of the frame on whole pixels, so its edges fall on pixels. */
export function wholePixels(box: Box): Box {
	return {
		left: Math.round(box.left),
		top: Math.round(box.top),
		width: Math.round(box.width),
		height: Math.round(box.height)
	};
}

/** The smallest box that holds every one of these. */
export function boxAround(boxes: readonly [Box, ...Box[]]): Box {
	const left = Math.min(...boxes.map((box) => box.left));
	const top = Math.min(...boxes.map((box) => box.top));
	const right = Math.max(...boxes.map((box) => box.left + box.width));
	const bottom = Math.max(...boxes.map((box) => box.top + box.height));
	return { left, top, width: right - left, height: bottom - top };
}

/** A box moved and resized `progress` of the way to another. */
export function boxToward(start: Box, end: Box, progress: number): Box {
	return {
		left: between(start.left, end.left, progress),
		top: between(start.top, end.top, progress),
		width: between(start.width, end.width, progress),
		height: between(start.height, end.height, progress)
	};
}

/** The arc from start to end that bends to one side by `bow` of its length. */
export function bowedArc(start: Point, end: Point, bow: number): Arc {
	const middle = { left: (start.left + end.left) / HALVES, top: (start.top + end.top) / HALVES };
	const across = end.left - start.left;
	const down = end.top - start.top;
	return { start, bend: { left: middle.left - down * bow, top: middle.top + across * bow }, end };
}

export function pointAlong(arc: Arc, progress: number): Point {
	const rest = 1 - progress;
	const pull = HALVES * rest * progress;
	return {
		left: rest ** HALVES * arc.start.left + pull * arc.bend.left + progress ** HALVES * arc.end.left,
		top: rest ** HALVES * arc.start.top + pull * arc.bend.top + progress ** HALVES * arc.end.top
	};
}
