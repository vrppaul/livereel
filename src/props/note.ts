/**
 * A note: words on the film's ground beside the page's window, and a line drawn from a dot at a block's edge in the
 * window out to them, so they name the block without covering the page. The block is read once, as the note comes, as
 * a callout's is, and where the words stand with it: in a place beyond the window on one side of it, which stays while
 * the note does, as the window does. Where the block stands on the frame is worked out every frame from the camera, so
 * the line keeps to the block as the page moves in the window; the words keep to their place, level with the block as
 * far as it lets. The line is drawn first, as the words' ground would come up, and the words come up at its end.
 */
import { type Camera, onTheFrame } from '../domain/camera.ts';
import { type Box, type FrameSide, type Point, type Size, middleX, middleY } from '../domain/geometry.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** Where a note's words stand: the side of the window they stand beyond, and their box, in the frame's pixels. */
export interface Beside {
	readonly side: FrameSide;
	readonly box: Box;
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

export function drawnNote(note: Note, camera: Camera, frame: Size): DrawnNote {
	const { side, box: place } = note.beside;
	const from = onTheFrame(camera, frame, edgeFacing(note.box, side));
	const to = meeting(place, from, side);
	const across = to.left - from.left;
	const down = to.top - from.top;
	return {
		...drawnWords(note),
		side,
		place,
		from,
		to,
		length: Math.hypot(across, down),
		angle: (Math.atan2(down, across) * DEGREES_IN_A_HALF_TURN) / Math.PI
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
