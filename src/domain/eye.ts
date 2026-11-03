/**
 * The eye the room is seen from: where it stands, and the spot it looks at, in pixels of a frame 1080 high from the
 * frame's middle, `out` toward whoever watches the film. Until a film moves it, it stands straight out from the frame's
 * middle at `EYE_DISTANCE` and looks at that middle, the eye every film was seen from before the eye could move: its
 * matrix is CSS's `perspective()` alone, worked out with no arithmetic that could leave a trace on it.
 *
 * What stands in the world — the page's window, an object a film puts there — is seen from wherever the eye stands;
 * what stands on the frame, a title or a caption, rides with the eye and is seen as from where it rests
 * (`src/props/object.ts`). The eye sees as from a picture plane `EYE_DISTANCE` before it, the frame's own perspective,
 * and keeps the frame's down as its own, so it never rolls: it cannot look straight down or up, where its down is lost,
 * nor at where it stands.
 */
import { FilmError } from './errors.ts';
import { type Point, type Size, frameScaleOf } from './geometry.ts';
import { type Kind, OfForm } from './handed.ts';
import { A_SPOT, type Matrix, type Spot, carriesEveryPointWhereItStands, chained, perspective } from './matrix.ts';
import type { PathSpace } from './path.ts';
import { between } from './time.ts';

/** Where the eye stands and the spot it looks at, each in pixels of a frame 1080 high from the frame's middle. */
export interface Eye {
	readonly at: Spot;
	readonly aim: Spot;
}

/** Where a film sends the eye: where it stands, the spot it looks at, or both; what it leaves out stays as it stands. */
export interface EyePlace {
	readonly at?: Spot;
	readonly aim?: Spot;
}

// How far the eye stands out from the middle of a frame the stage's look was made on, in its pixels: nearer is a
// stronger angle
export const EYE_DISTANCE = 2000;
// The frame's middle, which the eye at rest looks at, and the frame's down, which the eye keeps as its own
const THE_FRAMES_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
const DOWN: Spot = { across: 0, down: 1, out: 0 };
// How far an axis of the eye's turn may be from none, for its length, before the eye is taken to have lost it: an aim
// straight down or up from the eye, or at it
const LOST_WITHIN = 1e-9;
// How far an eye standing where another stands has moved from it
const NOT_MOVED = 0;

/** The eye as it stands until a film moves it: straight out from the frame's middle, looking at it. */
export const THE_EYE_AT_REST: Eye = { at: { across: 0, down: 0, out: EYE_DISTANCE }, aim: THE_FRAMES_MIDDLE };

/** Where a film sends the eye, as it writes it. */
export const AN_EYE_PLACE: Kind<EyePlace> = new OfForm<EyePlace>(
	{ at: A_SPOT, aim: A_SPOT },
	'a place of the eye: { at, aim }, each a spot { across, down, out } in pixels of a frame 1080 high from its middle'
);

/**
 * How the eye goes on a path: by where it stands and where it looks, a step as long as the two move together, in
 * pixels of a frame 1080 high.
 */
export const EYE_SPACE: PathSpace<Eye> = {
	toward: eyeToward,
	numbersOf: (eye) => [eye.at.across, eye.at.down, eye.at.out, eye.aim.across, eye.aim.down, eye.aim.out],
	valueOf: eyeOfNumbers,
	distance: (start, end) => Math.hypot(lengthOf(wayBetween(start.at, end.at)), lengthOf(wayBetween(start.aim, end.aim)))
};

/** The eye a film sends somewhere, from where it stands: what the film leaves out kept as it stands. */
export function eyeSentTo(standing: Eye, place: EyePlace): Eye {
	return { at: place.at ?? standing.at, aim: place.aim ?? standing.aim };
}

/**
 * An eye a film sends somewhere, refused where it could not see: looking at where it stands, or straight down or up,
 * where it would lose its down.
 */
export function eyeThatSees(eye: Eye, move: string): Eye {
	const facing = lengthOf(crossOf(DOWN, outOf(eye)));
	if (!(facing > LOST_WITHIN)) {
		throw new FilmError(
			`${move} sends the eye to look at where it stands, or straight down or up from it, where it has no down to keep: move its aim aside`
		);
	}
	return eye;
}

/** Whether an eye stands at rest, where every film was seen from before the eye could move. */
export function isAtRest(eye: Eye): boolean {
	return EYE_SPACE.distance(eye, THE_EYE_AT_REST) === NOT_MOVED;
}

/**
 * The matrix that carries a spot of the room, about the frame's middle, to where an eye sees it on a frame of this
 * size: turned and moved as the eye stands, then seen in perspective from its picture plane. At rest, CSS's
 * `perspective()` alone.
 */
export function seenByTheEye(eye: Eye, frame: Size): Matrix {
	return chained([perspective(EYE_DISTANCE * frameScaleOf(frame)), viewFrom(eye, frame)]);
}

/**
 * Whether an eye looks straight ahead, along the way the eye at rest looks: moved, it sees the frame's plane as it is,
 * only nearer, farther or aside.
 */
export function looksStraightAhead(eye: Eye): boolean {
	return carriesEveryPointWhereItStands(turnOf(eye));
}

/** The eye's turn alone, which carries the room's axes to the eye's own: none at rest. */
export function turnOf(eye: Eye): Matrix {
	const [across, down, out] = axesOf(eye);
	return matrixOf(across, down, out, THE_FRAMES_MIDDLE);
}

/**
 * The line an eye sees a point of the frame on, on a frame of this size: where the eye stands, in the frame's pixels
 * from its middle, and the way its sight goes through the point, which stands on its picture plane so far across and
 * down from the frame's middle.
 */
export function sightOf(eye: Eye, frame: Size, fromTheMiddle: Point): { readonly from: Spot; readonly along: Spot } {
	const scale = frameScaleOf(frame);
	const [across, down, out] = axesOf(eye);
	const toThePlane = -EYE_DISTANCE * scale;
	return {
		from: scaled(eye.at, scale),
		along: {
			across: across.across * fromTheMiddle.left + down.across * fromTheMiddle.top + out.across * toThePlane,
			down: across.down * fromTheMiddle.left + down.down * fromTheMiddle.top + out.down * toThePlane,
			out: across.out * fromTheMiddle.left + down.out * fromTheMiddle.top + out.out * toThePlane
		}
	};
}

/**
 * The matrix that turns and moves the room as the eye stands, so the eye stands at rest before it: the room's spot the
 * eye stands at carried where the eye at rest stands, in one matrix, so the eye at rest moves nothing at all.
 */
function viewFrom(eye: Eye, frame: Size): Matrix {
	const scale = frameScaleOf(frame);
	const [across, down, out] = axesOf(eye);
	const at = scaled(eye.at, scale);
	const moved = {
		across: -dotOf(across, at),
		down: -dotOf(down, at),
		out: EYE_DISTANCE * scale - dotOf(out, at)
	};
	return matrixOf(across, down, out, moved);
}

/**
 * The eye's own axes in the room: across to its right, down as the frame's down stays, and out from what it looks at
 * toward it.
 */
function axesOf(eye: Eye): readonly [Spot, Spot, Spot] {
	const out = unitOf(outOf(eye));
	const across = unitOf(crossOf(DOWN, out));
	return [across, crossOf(out, across), out];
}

/** A matrix whose rows are three axes, then a move: a spot carried onto the axes, then moved. */
function matrixOf(across: Spot, down: Spot, out: Spot, moved: Spot): Matrix {
	return {
		m11: across.across,
		m21: across.down,
		m31: across.out,
		m41: moved.across,
		m12: down.across,
		m22: down.down,
		m32: down.out,
		m42: moved.down,
		m13: out.across,
		m23: out.down,
		m33: out.out,
		m43: moved.out,
		m14: 0,
		m24: 0,
		m34: 0,
		m44: 1
	};
}

/** The way from what an eye looks at to where it stands. */
function outOf(eye: Eye): Spot {
	return wayBetween(eye.aim, eye.at);
}

/** The way from one spot to another. */
function wayBetween(start: Spot, end: Spot): Spot {
	return { across: end.across - start.across, down: end.down - start.down, out: end.out - start.out };
}

function eyeToward(start: Eye, end: Eye, progress: number): Eye {
	return { at: spotToward(start.at, end.at, progress), aim: spotToward(start.aim, end.aim, progress) };
}

function spotToward(start: Spot, end: Spot, progress: number): Spot {
	return {
		across: between(start.across, end.across, progress),
		down: between(start.down, end.down, progress),
		out: between(start.out, end.out, progress)
	};
}

/** The eye six numbers stand for on a path: where it stands, then where it looks, each across, down and out. */
function eyeOfNumbers(numbers: readonly number[]): Eye {
	const [atAcross, atDown, atOut, aimAcross, aimDown, aimOut] = numbers;
	if (
		atAcross === undefined ||
		atDown === undefined ||
		atOut === undefined ||
		aimAcross === undefined ||
		aimDown === undefined ||
		aimOut === undefined
	) {
		throw new Error(`an eye on a path stands for six numbers, not ${numbers.length}`);
	}
	return {
		at: { across: atAcross, down: atDown, out: atOut },
		aim: { across: aimAcross, down: aimDown, out: aimOut }
	};
}

function scaled(spot: Spot, scale: number): Spot {
	return { across: spot.across * scale, down: spot.down * scale, out: spot.out * scale };
}

function crossOf(first: Spot, second: Spot): Spot {
	return {
		across: first.down * second.out - first.out * second.down,
		down: first.out * second.across - first.across * second.out,
		out: first.across * second.down - first.down * second.across
	};
}

function dotOf(first: Spot, second: Spot): number {
	return first.across * second.across + first.down * second.down + first.out * second.out;
}

function lengthOf(spot: Spot): number {
	return Math.hypot(spot.across, spot.down, spot.out);
}

function unitOf(spot: Spot): Spot {
	const length = lengthOf(spot);
	return { across: spot.across / length, down: spot.down / length, out: spot.out / length };
}
