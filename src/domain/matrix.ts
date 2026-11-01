/**
 * A matrix that carries a point of something drawn to where it is seen, as CSS's `matrix3d()` does, and the few that
 * make one: moved, seen in perspective, rotated about each axis, grown.
 *
 * Where anything that leans, grows or turns stands on the frame is worked out here once, and the stage is handed the
 * numbers it draws with (`src/domain/stance.ts`), so the two never tell it apart. The entries are named as a DOMMatrix
 * and CSS name them, and `matrix3d()` takes them in that order, `m11` to `m44`: a point is carried as a column of
 * across, down, out toward the eye and 1, `m41`, `m42` and `m43` move it, `m34` sees it in perspective, and the
 * entry `m<column><row>` stands in that column and row. A chain of them reads as a CSS transform list does: the last
 * carries a point first.
 */

/** A matrix of four rows and four columns, its entries named by their column, then their row. */
export interface Matrix {
	readonly m11: number;
	readonly m12: number;
	readonly m13: number;
	readonly m14: number;
	readonly m21: number;
	readonly m22: number;
	readonly m23: number;
	readonly m24: number;
	readonly m31: number;
	readonly m32: number;
	readonly m33: number;
	readonly m34: number;
	readonly m41: number;
	readonly m42: number;
	readonly m43: number;
	readonly m44: number;
}

/**
 * The entries of a matrix that carries a plane flat onto another, as CSS's 2D `matrix()` takes them, `a` to `f`:
 * across and down for each of the plane's own two, and how far it is moved.
 */
export type FlatMatrix = Pick<Matrix, 'm11' | 'm12' | 'm21' | 'm22' | 'm41' | 'm42'>;

/**
 * A point of a room, in pixels: across and down from where the room is seen from in front, and out from it toward the
 * eye.
 */
export interface Spot {
	readonly across: number;
	readonly down: number;
	readonly out: number;
}

const DEGREES_IN_A_HALF_TURN = 180;
// How far either axis of a plane may reach out of the frame's plane, for its length, while the plane is still taken
// to face the frame: a lean so slight moves the far corner of a frame 4096 pixels wide by less than a millionth of a
// pixel, where a whole turn's arithmetic leaves 2.4e-16
const FACING_WITHIN = 1e-9;
// Where a plane carried stands edge-on to the eye, between showing its front and its back
const EDGE_ON = 0;
// How a point is seen from nearer as it comes out toward the eye: by all it comes out, for the eye's distance
const NEARER_BY_ITS_OUT = -1;

/** A matrix that carries every point where it stands. */
export const IDENTITY: Matrix = {
	m11: 1,
	m12: 0,
	m13: 0,
	m14: 0,
	m21: 0,
	m22: 1,
	m23: 0,
	m24: 0,
	m31: 0,
	m32: 0,
	m33: 1,
	m34: 0,
	m41: 0,
	m42: 0,
	m43: 0,
	m44: 1
};

/** A point moved across, down and out by a spot's own, as CSS's `translate3d()`. */
export function translation(by: Spot): Matrix {
	return { ...IDENTITY, m41: by.across, m42: by.down, m43: by.out };
}

/** A point seen from an eye standing out from the room's plane, as CSS's `perspective()`: a nearer one farther out. */
export function perspective(eyeDistance: number): Matrix {
	return { ...IDENTITY, m34: NEARER_BY_ITS_OUT / eyeDistance };
}

/** A point rotated about the line across the room's middle, as CSS's `rotateX()`: the top goes back for more degrees. */
export function rotationX(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m22: cosine, m23: sine, m32: -sine, m33: cosine };
}

/** A point rotated about the line down the room's middle, as CSS's `rotateY()`: the right side goes back. */
export function rotationY(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m11: cosine, m13: -sine, m31: sine, m33: cosine };
}

/** A point rotated in the room's own plane, as CSS's `rotate()`: clockwise for more degrees. */
export function rotationZ(degrees: number): Matrix {
	const cosine = Math.cos(radians(degrees));
	const sine = Math.sin(radians(degrees));
	return { ...IDENTITY, m11: cosine, m12: sine, m21: -sine, m22: cosine };
}

/** A point carried out from the middle across and down, as CSS's `scale()`: so many times as far. */
export function scaling(factor: number): Matrix {
	return { ...IDENTITY, m11: factor, m22: factor };
}

/** Matrices one after another, as a CSS transform list reads them: the last carries a point first. */
export function chained(matrices: readonly Matrix[]): Matrix {
	return matrices.reduce(product, IDENTITY);
}

/** Where a matrix carries a spot, seen from its eye where it sees in perspective. */
export function carried(matrix: Matrix, spot: Spot): Spot {
	const seenFrom = matrix.m14 * spot.across + matrix.m24 * spot.down + matrix.m34 * spot.out + matrix.m44;
	return {
		across: (matrix.m11 * spot.across + matrix.m21 * spot.down + matrix.m31 * spot.out + matrix.m41) / seenFrom,
		down: (matrix.m12 * spot.across + matrix.m22 * spot.down + matrix.m32 * spot.out + matrix.m42) / seenFrom,
		out: (matrix.m13 * spot.across + matrix.m23 * spot.down + matrix.m33 * spot.out + matrix.m43) / seenFrom
	};
}

/**
 * Whether a matrix that sees nothing in perspective carries the room's plane onto one facing the frame, near or far,
 * grown or rolled: neither of the plane's axes reaches out of it.
 */
export function facesTheFrame(matrix: Matrix): boolean {
	return (
		Math.abs(matrix.m13) <= FACING_WITHIN * Math.hypot(matrix.m11, matrix.m12, matrix.m13) &&
		Math.abs(matrix.m23) <= FACING_WITHIN * Math.hypot(matrix.m21, matrix.m22, matrix.m23)
	);
}

/**
 * A matrix that carries the room's plane onto one facing the frame, written as it carries that plane: flat, every
 * point of it seen from one distance.
 */
export function flatOf(matrix: Matrix): FlatMatrix {
	const seenFrom = matrix.m44;
	return {
		m11: matrix.m11 / seenFrom,
		m12: matrix.m12 / seenFrom,
		m21: matrix.m21 / seenFrom,
		m22: matrix.m22 / seenFrom,
		m41: matrix.m41 / seenFrom,
		m42: matrix.m42 / seenFrom
	};
}

/**
 * Whether the room's plane, carried by a matrix and seen from its eye, shows the side it faced the eye with: drawn as
 * from in front, not mirrored. The determinant of what the matrix does to the plane is more than none where it does.
 */
export function showsItsFront(matrix: Matrix): boolean {
	const orientation =
		matrix.m11 * (matrix.m22 * matrix.m44 - matrix.m42 * matrix.m24) -
		matrix.m21 * (matrix.m12 * matrix.m44 - matrix.m42 * matrix.m14) +
		matrix.m41 * (matrix.m12 * matrix.m24 - matrix.m22 * matrix.m14);
	return orientation > EDGE_ON;
}

/**
 * One matrix after another, as CSS chains two: the inner carries a point first. Each entry is the row of the outer it
 * stands in across the column of the inner: `m<column><row>` sums `outer.m<k><row> × inner.m<column><k>`.
 */
function product(outer: Matrix, inner: Matrix): Matrix {
	return {
		m11: outer.m11 * inner.m11 + outer.m21 * inner.m12 + outer.m31 * inner.m13 + outer.m41 * inner.m14,
		m12: outer.m12 * inner.m11 + outer.m22 * inner.m12 + outer.m32 * inner.m13 + outer.m42 * inner.m14,
		m13: outer.m13 * inner.m11 + outer.m23 * inner.m12 + outer.m33 * inner.m13 + outer.m43 * inner.m14,
		m14: outer.m14 * inner.m11 + outer.m24 * inner.m12 + outer.m34 * inner.m13 + outer.m44 * inner.m14,
		m21: outer.m11 * inner.m21 + outer.m21 * inner.m22 + outer.m31 * inner.m23 + outer.m41 * inner.m24,
		m22: outer.m12 * inner.m21 + outer.m22 * inner.m22 + outer.m32 * inner.m23 + outer.m42 * inner.m24,
		m23: outer.m13 * inner.m21 + outer.m23 * inner.m22 + outer.m33 * inner.m23 + outer.m43 * inner.m24,
		m24: outer.m14 * inner.m21 + outer.m24 * inner.m22 + outer.m34 * inner.m23 + outer.m44 * inner.m24,
		m31: outer.m11 * inner.m31 + outer.m21 * inner.m32 + outer.m31 * inner.m33 + outer.m41 * inner.m34,
		m32: outer.m12 * inner.m31 + outer.m22 * inner.m32 + outer.m32 * inner.m33 + outer.m42 * inner.m34,
		m33: outer.m13 * inner.m31 + outer.m23 * inner.m32 + outer.m33 * inner.m33 + outer.m43 * inner.m34,
		m34: outer.m14 * inner.m31 + outer.m24 * inner.m32 + outer.m34 * inner.m33 + outer.m44 * inner.m34,
		m41: outer.m11 * inner.m41 + outer.m21 * inner.m42 + outer.m31 * inner.m43 + outer.m41 * inner.m44,
		m42: outer.m12 * inner.m41 + outer.m22 * inner.m42 + outer.m32 * inner.m43 + outer.m42 * inner.m44,
		m43: outer.m13 * inner.m41 + outer.m23 * inner.m42 + outer.m33 * inner.m43 + outer.m43 * inner.m44,
		m44: outer.m14 * inner.m41 + outer.m24 * inner.m42 + outer.m34 * inner.m43 + outer.m44 * inner.m44
	};
}

function radians(degrees: number): number {
	return (degrees * Math.PI) / DEGREES_IN_A_HALF_TURN;
}
