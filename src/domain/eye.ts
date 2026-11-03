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
 * nor at where it stands, nor pass over the top of what it looks at, where its across would turn back; a move that
 * would take it so anywhere on its way is refused as it begins.
 *
 * The eye sees as a lens does: focused at a point and open so wide. Open none, a pinhole, as every film was seen before
 * it could open, it sees all sharp; open, it draws what stands in the world nearer or farther than its focus the softer
 * the farther it stands off it (`src/domain/focus.ts`). Where it stands and where it focuses are values of their own,
 * so a move of one shares a step with a move of the other.
 */
import { FilmError } from './errors.ts';
import { type Point, type Size, frameScaleOf } from './geometry.ts';
import { type Kind, OfForm } from './handed.ts';
import {
	A_SPOT,
	type Matrix,
	type Spot,
	carriesEveryPointWhereItStands,
	chained,
	crossOf,
	dotOf,
	lengthOf,
	perspective,
	scaledBy,
	unitOf,
	wayBetween
} from './matrix.ts';
import type { Path, PathSpace } from './path.ts';
import { between } from './time.ts';
import { type Track, arrivedAt } from './track.ts';

/** Where the eye stands and the spot it looks at, each in pixels of a frame 1080 high from the frame's middle. */
export interface Viewpoint {
	readonly at: Spot;
	readonly aim: Spot;
}

/**
 * Where the eye focuses, placed where it stands as each frame is drawn: so far before the eye along where it looks, in
 * pixels of a frame 1080 high; at a spot of the world; at a point of the page's window, in its box's pixels from its
 * top left corner; or at a point of the page, in the screen's pixels.
 */
export type Focus =
	| { readonly kind: 'distance'; readonly distance: number }
	| { readonly kind: 'world'; readonly spot: Spot }
	| { readonly kind: 'window'; readonly point: Point }
	| { readonly kind: 'page'; readonly point: Point };

/**
 * The eye: where it stands and looks; where it focuses, on its way from where it focused as its move began, each end
 * placed where it stands as each frame is drawn; and how wide it is open, `aperture`, in pixels of a frame 1080 high,
 * open none seeing all sharp.
 */
export interface Eye extends Viewpoint {
	readonly focusing: Track<Focus>;
	readonly aperture: number;
}

/** Where a film sends the eye: where it stands, the spot it looks at, or both; what it leaves out stays as it stands. */
export interface EyePlace {
	readonly at?: Spot;
	readonly aim?: Spot;
}

/** The line an eye sees a point on: where the eye stands, and the way its sight goes from there. */
export interface Sight {
	readonly from: Spot;
	readonly along: Spot;
}

// How far the eye stands out from the middle of a frame the stage's look was made on, in its pixels: nearer is a
// stronger angle
export const EYE_DISTANCE = 2000;
// The frame's middle, which the eye at rest looks at; the frame's down, which the eye keeps as its own; and a move of
// none
const THE_FRAMES_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
const DOWN: Spot = { across: 0, down: 1, out: 0 };
const NO_MOVE: Spot = { across: 0, down: 0, out: 0 };
// How far the eye's across may be from none, as a share of how far it stands from its aim, before its down is taken to
// be lost: an aim straight down or up from it, or at it
const LOST_WITHIN = 1e-9;
// How many steps of its way a move of the eye checks as it begins, the ends among them, for a down lost on the way: a
// way over the top of the aim turns its across back between two of them
const STEPS_CHECKED = 64;
// Where two ways that point apart stand as one goes along the other: none or less
const POINTING_APART = 0;
// How far an eye standing where another stands has moved from it
const NOT_MOVED = 0;
// The plane of the frame, how far out the window stands where nothing leans it
const THE_FRAMES_PLANE = 0;
// Where the eye focuses until a film moves its focus: on the frame's plane, as far before it as it stands from the
// frame at rest; and how wide a pinhole is open, as the eye is until a film opens it
const ON_THE_FRAMES_PLANE: Focus = { kind: 'distance', distance: EYE_DISTANCE };
export const A_PINHOLE = 0;

/**
 * The eye as it stands until a film moves it: straight out from the frame's middle, looking at it, focused on the
 * frame's plane and open none, so it sees all sharp.
 */
export const THE_EYE_AT_REST: Eye = {
	at: { across: 0, down: 0, out: EYE_DISTANCE },
	aim: THE_FRAMES_MIDDLE,
	focusing: arrivedAt(ON_THE_FRAMES_PLANE),
	aperture: A_PINHOLE
};

/** Where a film sends the eye, as it writes it. */
export const AN_EYE_PLACE: Kind<EyePlace> = new OfForm<EyePlace>(
	{ at: A_SPOT, aim: A_SPOT },
	'a place of the eye: { at, aim }, each a spot { across, down, out } in pixels of a frame 1080 high from its middle'
);

/**
 * How the eye goes on a path: by where it stands and where it looks, a step as long as the two move together, in the
 * eye's own pixels of a frame 1080 high, not in how far what the frame shows moves.
 */
export const EYE_SPACE: PathSpace<Viewpoint> = {
	toward: viewpointToward,
	numbersOf: (eye) => [eye.at.across, eye.at.down, eye.at.out, eye.aim.across, eye.aim.down, eye.aim.out],
	valueOf: viewpointOfNumbers,
	distance: (start, end) => Math.hypot(lengthOf(wayBetween(start.at, end.at)), lengthOf(wayBetween(start.aim, end.aim)))
};

/** Where an eye stands and looks, apart from where it focuses and how wide it is open. */
export function viewpointOf(eye: Viewpoint): Viewpoint {
	return { at: eye.at, aim: eye.aim };
}

/** Where a film sends the eye, from where it stands: what the film leaves out kept as it stands. */
export function eyeSentTo(standing: Viewpoint, place: EyePlace): Viewpoint {
	return { at: place.at ?? standing.at, aim: place.aim ?? standing.aim };
}

/**
 * The eye's path a move sends it on, refused where the eye could not see on it: looking at where it stands, or
 * straight down or up, or passing over the top of what it looks at, its across turned back from where it set off.
 */
export function pathThatSees(path: Path<Viewpoint>, move: string): Path<Viewpoint> {
	const start = path.at(0);
	const setOff = crossOf(DOWN, wayBetween(start.aim, start.at));
	for (let step = 0; step <= STEPS_CHECKED; step++) {
		const eye = path.at(step / STEPS_CHECKED);
		const out = wayBetween(eye.aim, eye.at);
		const across = crossOf(DOWN, out);
		const lost = !(lengthOf(across) > LOST_WITHIN * lengthOf(out));
		if (lost || dotOf(across, setOff) <= POINTING_APART) {
			throw new FilmError(
				`${move} sends the eye to look at where it stands, or straight down or up from it, or over the top of what it looks at, where it has no down to keep: move its aim aside`
			);
		}
	}
	return path;
}

/** Whether an eye stands at rest, where every film was seen from before the eye could move. */
export function isAtRest(eye: Viewpoint): boolean {
	return EYE_SPACE.distance(eye, THE_EYE_AT_REST) === NOT_MOVED;
}

/**
 * Whether an eye looks straight ahead at the frame's plane from before it: moved so, it sees that plane as it is, only
 * nearer, farther or aside, and every point of it on one line of sight.
 */
export function looksStraightAtTheFrame(eye: Viewpoint): boolean {
	return carriesEveryPointWhereItStands(turnOf(eye)) && eye.at.out > THE_FRAMES_PLANE;
}

/**
 * How far before an eye a spot of the room stands, along where it looks, in pixels of a frame 1080 high: none or less
 * at it or behind it.
 */
export function distanceBefore(eye: Viewpoint, spot: Spot): number {
	return dotOf(unitOf(wayBetween(eye.at, eye.aim)), wayBetween(eye.at, spot));
}

/**
 * The matrix that carries a spot of the room, about the frame's middle, to where an eye sees it on a frame of this
 * size: turned and moved as the eye stands, then seen in perspective from its picture plane. At rest, CSS's
 * `perspective()` alone.
 */
export function seenByTheEye(eye: Viewpoint, frame: Size): Matrix {
	return chained([perspective(EYE_DISTANCE * frameScaleOf(frame)), viewFrom(eye, frame)]);
}

/** The eye's turn alone, which carries the room's axes to the eye's own: none at rest. */
export function turnOf(eye: Viewpoint): Matrix {
	const [across, down, out] = axesOf(eye);
	return matrixOf(across, down, out, NO_MOVE);
}

/**
 * The line an eye sees a point of the frame on, on a frame of this size: where the eye stands, in the frame's pixels
 * from its middle, and the way its sight goes through the point, which stands on its picture plane so far across and
 * down from the frame's middle.
 */
export function sightOf(eye: Viewpoint, frame: Size, fromTheMiddle: Point): Sight {
	const scale = frameScaleOf(frame);
	const [across, down, out] = axesOf(eye);
	const toThePlane = -EYE_DISTANCE * scale;
	return {
		from: scaledBy(eye.at, scale),
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
function viewFrom(eye: Viewpoint, frame: Size): Matrix {
	const scale = frameScaleOf(frame);
	const [across, down, out] = axesOf(eye);
	const at = scaledBy(eye.at, scale);
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
function axesOf(eye: Viewpoint): readonly [Spot, Spot, Spot] {
	const out = unitOf(wayBetween(eye.aim, eye.at));
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

function viewpointToward(start: Viewpoint, end: Viewpoint, progress: number): Viewpoint {
	return { at: spotToward(start.at, end.at, progress), aim: spotToward(start.aim, end.aim, progress) };
}

function spotToward(start: Spot, end: Spot, progress: number): Spot {
	return {
		across: between(start.across, end.across, progress),
		down: between(start.down, end.down, progress),
		out: between(start.out, end.out, progress)
	};
}

/** Where the eye stands and looks as six numbers have it on a path: where it stands, then where it looks. */
function viewpointOfNumbers(numbers: readonly number[]): Viewpoint {
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
