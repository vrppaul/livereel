/**
 * How a frame is split between words and the page: the words on one side of it, the page's window on the other.
 *
 * The words take a share of the frame along the split, the window the whole room across from them, inside the frame's
 * margin, whatever the screen's shape: it shows the part of the page the camera frames, the screen filling it
 * (`keptOnTheScreen` in `src/domain/camera.ts`), so it stands whole on the frame and no ground shows inside it. The
 * share and the margins are the format's own, so a
 * square may give its words less than a wide frame does, and livereel's for what a format leaves out. Lengths are in
 * the frame's pixels, drawn as on a frame the stage's look was made on and scaled to the frame shot, and whole, so the
 * window's edges fall on pixels.
 */
import { type Box, type Format, type Split, frameScaleOf } from './geometry.ts';
import { OneOf } from './handed.ts';

/** The sides of the frame: where words stand, or the page's window across from them. */
const FRAME_SIDES = ['left', 'right', 'top', 'bottom'] as const;

export type FrameSide = (typeof FRAME_SIDES)[number];

export const A_FRAME_SIDE = new OneOf(FRAME_SIDES, 'a side of the frame: "left", "right", "top" or "bottom"');

/** Where words beside a window stand: the side of the frame, and their box there, in the frame's pixels. */
export interface Beside {
	readonly side: FrameSide;
	readonly box: Box;
}

// livereel's split: the words take a little over a third of the frame from the edge they stand on, and the window
// stands in from the frame's edges less far than the words do, which keep a gap from it
const LIVEREELS_SPLIT: Required<Split> = { wordsShare: 0.36, windowMargin: 72, wordsMargin: 96, wordsGap: 48 };
const HALVES = 2;
// The side of the frame across from each: where words stand beside a window on it
const ACROSS: Readonly<Record<FrameSide, FrameSide>> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

/** Where words stand beside a window on the side of the frame across from them. */
export function besideOn(format: Format, side: FrameSide): Beside {
	return { side, box: wordsOn(format, side) };
}

/** Where words about the page stand beside a window on a side of the frame: on the side across. */
export function besideTheWindowOn(format: Format, windowSide: FrameSide): Beside {
	return besideOn(format, ACROSS[windowSide]);
}

/** Where the page's window stands on the frame on a side of it, the words on the side across: its whole room. */
export function windowOn(format: Format, side: FrameSide): Box {
	return wholePixels(roomOn(format, side));
}

/** Where words stand on a side of the frame, beside the window on the side across. */
export function wordsOn(format: Format, side: FrameSide): Box {
	const { frame } = format;
	const split = splitOf(format);
	const scale = frameScaleOf(frame);
	const margin = split.wordsMargin * scale;
	const gap = split.wordsGap * scale;
	switch (side) {
		case 'left':
		case 'right': {
			const width = frame.width * split.wordsShare - margin - gap;
			const left = side === 'left' ? margin : frame.width - margin - width;
			return wholePixels({ left, top: margin, width, height: frame.height - HALVES * margin });
		}
		case 'top':
		case 'bottom': {
			const height = frame.height * split.wordsShare - margin - gap;
			const top = side === 'top' ? margin : frame.height - margin - height;
			return wholePixels({ left: margin, top, width: frame.width - HALVES * margin, height });
		}
	}
}

/** Whether a format's split leaves the words and the window room on every side of its frame. */
export function leavesRoom(format: Format): boolean {
	return FRAME_SIDES.every((side) => hasArea(wordsOn(format, side)) && hasArea(roomOn(format, side)));
}

/** A format's split, livereel's for every value it leaves out. */
function splitOf(format: Format): Required<Split> {
	return {
		wordsShare: format.split?.wordsShare ?? LIVEREELS_SPLIT.wordsShare,
		windowMargin: format.split?.windowMargin ?? LIVEREELS_SPLIT.windowMargin,
		wordsMargin: format.split?.wordsMargin ?? LIVEREELS_SPLIT.wordsMargin,
		wordsGap: format.split?.wordsGap ?? LIVEREELS_SPLIT.wordsGap
	};
}

/** The room a window on a side of the frame may take: across from the words' share, inside the frame's margin. */
function roomOn(format: Format, side: FrameSide): Box {
	const { frame } = format;
	const split = splitOf(format);
	const margin = split.windowMargin * frameScaleOf(frame);
	const wordsAcross = frame.width * split.wordsShare;
	const wordsDown = frame.height * split.wordsShare;
	const tall = frame.height - HALVES * margin;
	const wide = frame.width - HALVES * margin;
	switch (side) {
		case 'left':
			return { left: margin, top: margin, width: frame.width - wordsAcross - margin, height: tall };
		case 'right':
			return { left: wordsAcross, top: margin, width: frame.width - wordsAcross - margin, height: tall };
		case 'top':
			return { left: margin, top: margin, width: wide, height: frame.height - wordsDown - margin };
		case 'bottom':
			return { left: margin, top: wordsDown, width: wide, height: frame.height - wordsDown - margin };
	}
}

function hasArea(box: Box): boolean {
	return box.width > 0 && box.height > 0;
}

function wholePixels(box: Box): Box {
	return {
		left: Math.round(box.left),
		top: Math.round(box.top),
		width: Math.round(box.width),
		height: Math.round(box.height)
	};
}
