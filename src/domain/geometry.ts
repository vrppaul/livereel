/**
 * Sizes, points and boxes, in the page's own CSS pixels.
 *
 * The frame is what a film is shot at, the screen what its page is laid out on; a box is where a block of the page
 * stands on that screen, with no camera applied. Every other measure of a film is read off these.
 */
import { between } from './time.ts';

export interface Size {
	readonly width: number;
	readonly height: number;
}

/** What a film is shot at, its frame, and what its page is laid out on, its screen. */
export interface Format {
	readonly frame: Size;
	readonly screen: Size;
}

/** A point of the screen: how far from its left edge, and how far down from its top. */
export interface Point {
	readonly left: number;
	readonly top: number;
}

/** Where a block of the page stands on the screen: its left and top edges, and how big it is. */
export interface Box {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

/** A curve from a start to an end, drawn toward its bend: a quadratic Bézier. */
export interface Arc {
	readonly start: Point;
	readonly bend: Point;
	readonly end: Point;
}

// The middle of a length lies half-way along it
const HALVES = 2;

export function middleX(box: Box): number {
	return box.left + box.width / HALVES;
}

export function middleY(box: Box): number {
	return box.top + box.height / HALVES;
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
