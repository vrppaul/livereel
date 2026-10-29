/**
 * How a frame is split between words and the page: the words on one side of it, the page's window on the other.
 *
 * The words take a share of the frame along the split, the window the whole room across from them, inside the frame's
 * margin, whatever the screen's shape: it shows the part of the page the camera frames, the screen filling it
 * (`keptOnTheScreen` in `src/domain/camera.ts`), so it stands whole on the frame and no ground shows inside it. The
 * share and the margins are the format's own, so a square may give its words less than a wide frame does, and
 * livereel's for what a format leaves out. Lengths are in the frame's pixels, drawn as on a frame the stage's look was
 * made on and scaled to the frame shot, and whole, so the window's edges fall on pixels.
 */
import { type Box, type Format, type Split, frameScaleOf, wholePixels } from './geometry.ts';
import { OneOf } from './handed.ts';

/** The sides of the frame: where words stand, or the page's window across from them. */
export const FRAME_SIDES = ['left', 'right', 'top', 'bottom'] as const;

export type FrameSide = (typeof FRAME_SIDES)[number];

export const A_FRAME_SIDE = new OneOf(FRAME_SIDES, 'a side of the frame: "left", "right", "top" or "bottom"');

// livereel's split: the words take a little over a third of the frame from the edge they stand on, and the window
// stands in from the frame's edges less far than the words do, which keep a gap from it
const LIVEREELS_SPLIT: Required<Split> = { wordsShare: 0.36, windowMargin: 72, wordsMargin: 96, wordsGap: 48 };
const HALVES = 2;

/** Where the page's window stands on the frame on a side of it, the words on the side across: its whole room. */
export function windowOn(format: Format, side: FrameSide): Box {
	return wholePixels(roomOn(format, side));
}

/** Where words stand on a side of the frame, beside the window on the side across. */
export function wordsOn(format: Format, side: FrameSide): Box {
	const { frame } = format;
	const split = splitOf(format);
	const whole = wordsWholeOn(format);
	const margin = whole.left;
	const gap = split.wordsGap * frameScaleOf(frame);
	switch (side) {
		case 'left':
		case 'right': {
			const width = frame.width * split.wordsShare - margin - gap;
			const left = side === 'left' ? margin : frame.width - margin - width;
			return wholePixels({ left, top: whole.top, width, height: whole.height });
		}
		case 'top':
		case 'bottom': {
			const height = frame.height * split.wordsShare - margin - gap;
			const top = side === 'top' ? margin : frame.height - margin - height;
			return wholePixels({ left: whole.left, top, width: whole.width, height });
		}
	}
}

/** The frame inside the margin words keep from its edges, in the frame's pixels. */
export function wordsWholeOn(format: Format): Box {
	const { frame } = format;
	const margin = splitOf(format).wordsMargin * frameScaleOf(frame);
	return { left: margin, top: margin, width: frame.width - HALVES * margin, height: frame.height - HALVES * margin };
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

/**
 * The room across from the words' share on a side of the frame, inside the frame's margin, as it falls: the window,
 * before it is set on whole pixels; and what must hold some of the frame for a split to leave the window room.
 */
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
