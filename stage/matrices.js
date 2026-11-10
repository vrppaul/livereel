// @ts-check
/**
 * The engine's matrices as three takes them: the engine hands a matrix by its entries as CSS names them, a column at a
 * time (`src/domain/matrix.ts`), and three keeps a 4 × 4 matrix's elements a column at a time too, so the one list of
 * names carries every matrix the room, the film's things and the window's body are placed by. And the projection the
 * room sees what it places in the eye's own space through, as the engine hands no camera, only how far the eye stands.
 */
import { Matrix4 } from 'three';
/** @import { Matrix } from '../src/domain/matrix.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */

// How near the eye the nearest depth a layer keeps stands, in the frame's pixels; and how many times as far past the
// frame as the eye stands before it the farthest stands
const NEAREST = 1;
const FARTHEST_IN_EYE_DISTANCES = 100;
// A box's middle stands half way across and down it
const HALVES = 2;

// The entries of the engine's matrix a column at a time, as CSS names them and WebGL takes them
/** @type {readonly (keyof Matrix)[]} */
const ENTRIES = [
	'm11',
	'm12',
	'm13',
	'm14',
	'm21',
	'm22',
	'm23',
	'm24',
	'm31',
	'm32',
	'm33',
	'm34',
	'm41',
	'm42',
	'm43',
	'm44'
];

/** An engine's matrix as three's. @param {Matrix} matrix */
export function matrixOf(matrix) {
	return new Matrix4().fromArray(ENTRIES.map((entry) => matrix[entry]));
}

/**
 * The projection that sees the eye's own space in perspective from the eye onto a layer holding a box of the frame:
 * the frame's middle straight before the eye, its picture plane as far before it as the eye stands, and a depth kept
 * from a pixel before the eye to far past the frame.
 * @param {Box} drawn @param {Box} frame @param {number} eyeDistance
 */
export function projectionOnto(drawn, frame, eyeDistance) {
	const toTheNearest = NEAREST / eyeDistance;
	const leftOfTheMiddle = drawn.left - (frame.left + frame.width / HALVES);
	const topOverTheMiddle = frame.top + frame.height / HALVES - drawn.top;
	return new Matrix4().makePerspective(
		leftOfTheMiddle * toTheNearest,
		(leftOfTheMiddle + drawn.width) * toTheNearest,
		topOverTheMiddle * toTheNearest,
		(topOverTheMiddle - drawn.height) * toTheNearest,
		NEAREST,
		eyeDistance * FARTHEST_IN_EYE_DISTANCES
	);
}
