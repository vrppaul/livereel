/**
 * How a frame is split between words and the page: the words on one side of it, the page's window on the other.
 *
 * The words take the narrower share of the frame along the split, the window the room across from them, inside the
 * frame's margin. The window keeps the screen's shape, as large as its room holds it and in its middle, so it always
 * stands whole on the frame and a block framed at its middle shows. Lengths are in the frame's pixels, drawn as on a
 * frame the stage's look was made on and scaled to the frame shot, and whole, so the window's edges fall on pixels.
 */
import { type Box, type Format, type Size, frameScaleOf } from './geometry.ts';
import { OneOf } from './handed.ts';

/** The sides of the frame: where words stand, or the page's window across from them. */
const FRAME_SIDES = ['left', 'right', 'top', 'bottom'] as const;

export type FrameSide = (typeof FRAME_SIDES)[number];

export const A_FRAME_SIDE = new OneOf(FRAME_SIDES, 'a side of the frame: "left", "right", "top" or "bottom"');

// The share of the frame the words take along the split, from the edge they stand on
const WORDS_SHARE = 0.36;
// How far the window stands in from the frame's edges, and the words from the edges and from the window
const WINDOW_MARGIN = 72;
const WORDS_MARGIN = 96;
const WORDS_GAP = 48;
const HALVES = 2;

/** Where the page's window stands on the frame on a side of it, the words on the side across. */
export function windowOn(format: Format, side: FrameSide): Box {
	return wholePixels(fittedIn(roomOn(format.frame, side), format.screen));
}

/** Where words stand on a side of the frame, beside the window on the side across. */
export function wordsOn(frame: Size, side: FrameSide): Box {
	const scale = frameScaleOf(frame);
	const margin = WORDS_MARGIN * scale;
	const gap = WORDS_GAP * scale;
	switch (side) {
		case 'left':
		case 'right': {
			const width = frame.width * WORDS_SHARE - margin - gap;
			const left = side === 'left' ? margin : frame.width - margin - width;
			return wholePixels({ left, top: margin, width, height: frame.height - HALVES * margin });
		}
		case 'top':
		case 'bottom': {
			const height = frame.height * WORDS_SHARE - margin - gap;
			const top = side === 'top' ? margin : frame.height - margin - height;
			return wholePixels({ left: margin, top, width: frame.width - HALVES * margin, height });
		}
	}
}

/** The room a window on a side of the frame may take: across from the words' share, inside the frame's margin. */
function roomOn(frame: Size, side: FrameSide): Box {
	const margin = WINDOW_MARGIN * frameScaleOf(frame);
	const wordsAcross = frame.width * WORDS_SHARE;
	const wordsDown = frame.height * WORDS_SHARE;
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

/** The largest box of a screen's shape a room holds, in the room's middle. */
function fittedIn(room: Box, screen: Size): Box {
	const shape = screen.width / screen.height;
	const width = Math.min(room.width, room.height * shape);
	const height = width / shape;
	return {
		left: room.left + (room.width - width) / HALVES,
		top: room.top + (room.height - height) / HALVES,
		width,
		height
	};
}

function wholePixels(box: Box): Box {
	return {
		left: Math.round(box.left),
		top: Math.round(box.top),
		width: Math.round(box.width),
		height: Math.round(box.height)
	};
}
