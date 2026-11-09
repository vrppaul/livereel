// @ts-check
/**
 * The engine's matrices as three takes them: the engine hands a matrix by its entries as CSS names them, a column at a
 * time (`src/domain/matrix.ts`), and three keeps a 4 × 4 matrix's elements a column at a time too, so the one list of
 * names carries every matrix the room and the film's things are placed by.
 */
import { Matrix4 } from 'three';
/** @import { Matrix } from '../src/domain/matrix.ts' */

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
