/**
 * A note: words on the film's ground beside the page's window, and a line drawn from them to a block in it, so they
 * name the block without covering the page. The block is read once, as the note comes, as a callout's is; where it
 * stands on the frame is worked out every frame from the camera, so the line keeps to the block as the window moves.
 * The line is drawn first, from the block out, as the words' ground would come up, and the words come up at its end.
 */
import { type Camera, onTheFrame } from '../domain/camera.ts';
import { type Box, type Point, type Size, frameScaleOf, middleX, middleY } from '../domain/geometry.ts';
import type { FrameSide } from '../domain/split.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** A note's words, the block it names, as the screen showed it, and the side of the window it stands on. */
export interface Note extends ShownWords {
	readonly box: Box;
	readonly side: FrameSide;
}

/** The ways words run across the frame from where they start. */
type Run = 'left' | 'right';

/**
 * A note as the stage draws it: where its line starts at the block's edge and where it meets the words, on the frame,
 * how long it is and its angle in degrees, and which way the words run from it: away from the window beside it, and
 * above or below it toward the frame's middle, so they stay on the frame.
 */
export interface DrawnNote extends DrawnWords {
	readonly side: FrameSide;
	readonly from: Point;
	readonly to: Point;
	readonly length: number;
	readonly angle: number;
	readonly runs: Run;
}

// How far the words stand out from the window's edge, in pixels of a frame the stage's look was made on
const NOTE_GAP = 56;
const HALVES = 2;
const DEGREES_IN_A_HALF_TURN = 180;

export function drawnNote(note: Note, camera: Camera, frame: Size): DrawnNote {
	const from = onTheFrame(camera, frame, edgeFacing(note.box, note.side));
	const to = outside(camera.view.box, from, note.side, NOTE_GAP * frameScaleOf(frame));
	const across = to.left - from.left;
	const down = to.top - from.top;
	return {
		...drawnWords(note),
		side: note.side,
		from,
		to,
		length: Math.hypot(across, down),
		angle: (Math.atan2(down, across) * DEGREES_IN_A_HALF_TURN) / Math.PI,
		runs: runsFrom(to, note.side, frame)
	};
}

function runsFrom(start: Point, side: FrameSide, frame: Size): Run {
	switch (side) {
		case 'left':
		case 'right':
			return side;
		case 'top':
		case 'bottom':
			return start.left > frame.width / HALVES ? 'left' : 'right';
	}
}

/** The middle of a block's edge that faces a side. */
function edgeFacing(box: Box, side: FrameSide): Point {
	switch (side) {
		case 'left':
			return { left: box.left, top: middleY(box) };
		case 'right':
			return { left: box.left + box.width, top: middleY(box) };
		case 'top':
			return { left: middleX(box), top: box.top };
		case 'bottom':
			return { left: middleX(box), top: box.top + box.height };
	}
}

/** The point a gap out from a view's edge on a side, level with a point on the frame. */
function outside(view: Box, level: Point, side: FrameSide, gap: number): Point {
	switch (side) {
		case 'left':
			return { left: view.left - gap, top: level.top };
		case 'right':
			return { left: view.left + view.width + gap, top: level.top };
		case 'top':
			return { left: level.left, top: view.top - gap };
		case 'bottom':
			return { left: level.left, top: view.top + view.height + gap };
	}
}
