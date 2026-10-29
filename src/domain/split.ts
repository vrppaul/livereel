/**
 * How a frame is split between words and the page: the words on one side of it, the page's window on the other.
 *
 * The words take the narrower share of the frame along the split, the window the rest. The window keeps the screen's
 * shape and is as wide as its share allows: beside the words it stands whole, in its share's middle; below or above
 * them, a window taller than its share reaches past the frame's far edge. Lengths are in the frame's pixels, drawn as
 * on a frame the stage's look was made on and scaled to the frame shot.
 */
import { type Box, type Format, type Size, frameScaleOf } from './geometry.ts';
import { OneOf } from './handed.ts';

/** The sides of the frame words stand on, the page's window standing on the side across from them. */
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
	const scale = frameScaleOf(format.frame);
	const margin = WINDOW_MARGIN * scale;
	const shape = format.screen.width / format.screen.height;
	const frame = format.frame;
	switch (side) {
		case 'left':
		case 'right': {
			const wordsLength = frame.width * WORDS_SHARE;
			const room = { width: frame.width - wordsLength - margin, height: frame.height - HALVES * margin };
			const width = Math.min(room.width, room.height * shape);
			const height = width / shape;
			const roomLeft = side === 'right' ? wordsLength : margin;
			return {
				left: roomLeft + (room.width - width) / HALVES,
				top: (frame.height - height) / HALVES,
				width,
				height
			};
		}
		case 'top':
		case 'bottom': {
			const wordsLength = frame.height * WORDS_SHARE;
			const width = frame.width - HALVES * margin;
			const height = width / shape;
			const room = frame.height - wordsLength - margin;
			const inRoom = Math.max(0, (room - height) / HALVES);
			const top = side === 'bottom' ? wordsLength + inRoom : frame.height - wordsLength - inRoom - height;
			return { left: margin, top, width, height };
		}
	}
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
			return { left, top: margin, width, height: frame.height - HALVES * margin };
		}
		case 'top':
		case 'bottom': {
			const height = frame.height * WORDS_SHARE - margin - gap;
			const top = side === 'top' ? margin : frame.height - margin - height;
			return { left: margin, top, width: frame.width - HALVES * margin, height };
		}
	}
}
