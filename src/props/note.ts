/**
 * A note: words on the film's ground beside the page's window, and a line drawn from a dot at a block's edge in the
 * window out to them, so they name the block without covering the page. The block is read once, as the note comes, as
 * a callout's is, and where the words stand with it: in a place beyond the window on one side of it. Their place is
 * the window's, kept beside it: as the window moves, the words move as far as the middle of its edge facing them does,
 * and never lean with it, as they stand on the ground. Where the block stands on the frame is worked out every frame
 * from the camera, so the line keeps to the block as the page moves in the window; the words meet it level with the
 * block as far as their place lets. The line is drawn first, as the words' ground would come up, and the words come up
 * at its end.
 */
import { type Camera, onTheFrame } from '../domain/camera.ts';
import { type Box, type FrameSide, type Point, type Size, middleX, middleY } from '../domain/geometry.ts';
import { type DrawnWords, type ShownWords, WORD_BY_WORD, drawnWords } from './words.ts';

/**
 * Where a note's words stand: the side of the window they stand beyond, their box, and the window's box they were
 * placed beside, each in the frame's pixels.
 */
export interface Beside {
	readonly side: FrameSide;
	readonly box: Box;
	readonly window: Box;
}

/** A note's words, the block it names, as the screen showed it, and where its words stand beside the window. */
export interface Note extends ShownWords {
	readonly box: Box;
	readonly beside: Beside;
}

/**
 * A note as the stage draws it: the words' box on the frame, where the line starts at the block's edge and where it
 * meets the words, how long it is and its angle in degrees.
 */
export interface DrawnNote extends DrawnWords {
	readonly side: FrameSide;
	readonly place: Box;
	readonly from: Point;
	readonly to: Point;
	readonly length: number;
	readonly angle: number;
}

const DEGREES_IN_A_HALF_TURN = 180;

/** A note as the stage draws it, seen by a camera, beside the window that camera shows the page in. */
export function drawnNote(note: Note, camera: Camera, frame: Size): DrawnNote {
	const side = note.beside.side;
	const place = besideTheWindow(note.beside, camera.view.box);
	const from = onTheFrame(camera, frame, edgeFacing(note.box, side));
	const to = meeting(place, from, side);
	const across = to.left - from.left;
	const down = to.top - from.top;
	return {
		...drawnWords(note, WORD_BY_WORD),
		side,
		place,
		from,
		to,
		length: Math.hypot(across, down),
		angle: (Math.atan2(down, across) * DEGREES_IN_A_HALF_TURN) / Math.PI
	};
}

/**
 * Where a note's words stand beside the window as it stands now: moved as far as the middle of the window's edge
 * facing them has moved since they were placed beside it.
 */
export function besideTheWindow(beside: Beside, window: Box): Box {
	const placedBy = edgeFacing(beside.window, beside.side);
	const standingBy = edgeFacing(window, beside.side);
	return {
		...beside.box,
		left: beside.box.left + standingBy.left - placedBy.left,
		top: beside.box.top + standingBy.top - placedBy.top
	};
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

/** Where the line meets the words' box: on its edge toward the window, level with the block as far as the box lets. */
function meeting(place: Box, level: Point, side: FrameSide): Point {
	const across = Math.min(Math.max(level.left, place.left), place.left + place.width);
	const down = Math.min(Math.max(level.top, place.top), place.top + place.height);
	switch (side) {
		case 'left':
			return { left: place.left + place.width, top: down };
		case 'right':
			return { left: place.left, top: down };
		case 'top':
			return { left: across, top: place.top + place.height };
		case 'bottom':
			return { left: across, top: place.top };
	}
}
