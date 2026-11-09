/**
 * The eye the room is seen from: where it stands, the spot it looks at and the way its top points, in pixels of a frame
 * 1080 high from the frame's middle, `out` toward whoever watches the film. Until a film moves it, it stands straight
 * out from the frame's middle as far as its focal length, looks at that middle, its top up the frame: its matrix is
 * CSS's `perspective()` alone, worked out with no arithmetic that could leave a trace on it, so it sees the frame's
 * plane as it is drawn.
 *
 * What stands in the world — the page's window, an object a film puts there — is seen from wherever the eye stands;
 * what stands on the frame, a title or a caption, rides with the eye and is seen as from where it rests
 * (`src/props/object.ts`). The eye sees as from a picture plane its focal length before it: the longer, the narrower
 * the angle it sees across the frame's shorter side, and the less what comes toward it grows. It keeps its top where
 * the film points it, up the frame until a film turns it: it cannot look near along it, where its across turns round
 * too fast or is lost, nor at where it stands, nor flip over, its across turned back between two steps of its way, as
 * an eye passing over the top of what it looks at with its top kept up would; a move that would take it so anywhere on
 * its way is refused as it begins.
 *
 * The eye stands in the room, or rides the page's window as a flight over the page leaves it (`src/domain/flight.ts`):
 * then where it stands, looks and its top points are the window's own, from the window's middle on its plane, `out`
 * away from its face, and carried into the room as the window stands as each frame is drawn
 * (`src/domain/camera.ts`), so a window that leans or travels in the same step carries the eye with it whichever is set
 * first.
 *
 * The eye sees as a lens does: focused at a point and open so wide. Open none, a pinhole, as every film was seen before
 * it could open, it sees all sharp; open, it draws what stands in the world nearer or farther than its focus the softer
 * the farther it stands off it (`src/domain/focus.ts`). Where it stands and where it focuses are values of their own,
 * so a move of one shares a step with a move of the other.
 */
import { FilmError } from './errors.ts';
import { Quaternion, Vector3 } from 'three';
import { HALVES, LOOK_MADE_ON, type Point, type Size, frameScaleOf } from './geometry.ts';
import { A_NUMBER, type Kind, Literal, NameOrForm, OfForm, Plain } from './handed.ts';
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
	radians,
	scaledBy,
	translation,
	unitOf,
	wayBetween
} from './matrix.ts';
import type { Path, PathSpace } from './path.ts';
import { between } from './toward.ts';
import { type Track, arrivedAt } from './track.ts';

/**
 * Where the eye stands and the spot it looks at, each in pixels of a frame 1080 high from the frame's middle, and the
 * way its top points: as long as one where a film sends it, any length on the way, where only its direction counts.
 */
export interface Viewpoint {
	readonly at: Spot;
	readonly aim: Spot;
	readonly up: Spot;
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

/** What the eye's place is read in: the room, or the page's window as it stands. */
type EyeHolder = 'world' | 'window';

/**
 * The eye: where it stands and looks, in what it stands in; how far before it its picture plane stands, `focalLength`, in pixels of a frame
 * 1080 high, as far as it stands from the frame at rest; where it focuses, on its way from where it focused as its move
 * began, each end placed where it stands as each frame is drawn; and how wide it is open, `aperture`, in pixels of a
 * frame 1080 high, open none seeing all sharp.
 */
export interface Eye extends Viewpoint {
	readonly inside: EyeHolder;
	readonly focalLength: number;
	readonly focusing: Track<Focus>;
	readonly aperture: number;
}

/**
 * Where a film sends the eye: where it stands, the spot it looks at, the way its top points, or any of them; what it
 * leaves out stays as it stands.
 */
export interface EyePlace {
	readonly at?: Spot;
	readonly aim?: Spot;
	readonly up?: Spot;
}

/** Where a film sends the eye: a place, or `'rest'`, back where it rests for its focal length, exactly. */
export type EyePlaceOrRest = EyePlace | 'rest';

/** The line an eye sees a point on: where the eye stands, and the way its sight goes from there. */
export interface Sight {
	readonly from: Spot;
	readonly along: Spot;
}

// The frame's middle, which the eye at rest looks at; the frame's up, the way its top points; and a move of none
const THE_FRAMES_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
const UP_THE_FRAME: Spot = { across: 0, down: -1, out: 0 };
const NO_MOVE: Spot = { across: 0, down: 0, out: 0 };
// The bounds of the angles of view the eye may take, in degrees
const NO_ANGLE = 0;
const A_HALF_TURN = 180;
// How near the eye's sight may come to the line its up points along, in degrees, at any step of its way: nearer, the
// eye's across turns round faster than an eye can follow as its sight sweeps past, as one that passes beside the top
// of what it looks at with its up kept does (a pass 60 pixels of a frame 1080 high beside it, 2000 above, turned the
// picture 152° in two frames of a move of two seconds, review of the eye's up, 2026-11-09)
const SIGHT_OFF_ITS_UP_AT_LEAST = 5;
// How many steps of its way a move of the eye checks as it begins, the ends among them, for a sight too near its up
// on the way or an across turned back between two of them, as an eye flips passing over the top of its aim
const STEPS_CHECKED = 64;
// How far the eye's up may turn in one stretch of its way, in degrees: half round, or so near it, which way it rolls
// is not said by where it sets off and arrives alone
const UP_TURNED_AT_MOST = 179;
// Where two ways that point apart stand as one goes along the other: none or less
const POINTING_APART = 0;
// How far an eye standing where another stands has moved from it
const NOT_MOVED = 0;
// How long a way of none is
const NO_LENGTH = 0;
// The numbers an eye stands for on a path, three for each spot, and where each spot's first stands among them
const A_SPOTS_NUMBERS = 3;
const AT_FIRST = 0;
const AIM_FIRST = AT_FIRST + A_SPOTS_NUMBERS;
const UP_FIRST = AIM_FIRST + A_SPOTS_NUMBERS;
const A_VIEWPOINTS_NUMBERS = UP_FIRST + A_SPOTS_NUMBERS;
// What a film names to send the eye back where it rests
const AT_REST = 'rest' as const;
// The plane of the frame, how far out the window stands where nothing leans it
const THE_FRAMES_PLANE = 0;
// How wide a pinhole is open, as the eye is until a film opens it
export const A_PINHOLE = 0;

/** How many degrees the eye sees across the frame's shorter side, as a film writes it. */
export const AN_ANGLE_OF_VIEW: Kind<number> = new Plain(
	isAngleOfView,
	"degrees the eye sees across the frame's shorter side, more than 0 and less than 180"
);

/** A direction, as a film writes one: a spot that is not the room's middle, so it points somewhere. */
const A_DIRECTION: Kind<Spot> = new Plain(isDirection, 'a direction: { across, down, out }, not all 0');

/** Where a film sends the eye, as it writes it, the place it names. */
export const AN_EYE_PLACE: OfForm<EyePlace> = new OfForm<EyePlace>(
	{ at: A_SPOT, aim: A_SPOT, up: A_DIRECTION },
	'a place of the eye: { at, aim, up }, each a spot { across, down, out } in pixels of a frame 1080 high from its middle'
);

/** Where a film sends the eye, as it writes it: a place, or back where it rests. */
export const AN_EYE_PLACE_OR_REST: Kind<EyePlaceOrRest> = new NameOrForm(
	new Literal(AT_REST),
	AN_EYE_PLACE,
	`"${AT_REST}", where the eye rests, or a place of the eye: { at, aim, up }`
);

/**
 * How the eye goes on a path: by where it stands, where it looks and the way its top points, a step as long as the
 * three move together, in the eye's own pixels of a frame 1080 high, not in how far what the frame shows moves; a turn
 * of its top as long as the arc it swings at as far as the eye stands from its aim, on the mean of its two ends.
 */
export const EYE_SPACE: PathSpace<Viewpoint> = {
	toward: viewpointToward,
	numbersOf: (eye) => [
		eye.at.across,
		eye.at.down,
		eye.at.out,
		eye.aim.across,
		eye.aim.down,
		eye.aim.out,
		eye.up.across,
		eye.up.down,
		eye.up.out
	],
	valueOf: viewpointOfNumbers,
	distance: (start, end) =>
		Math.hypot(
			lengthOf(wayBetween(start.at, end.at)),
			lengthOf(wayBetween(start.aim, end.aim)),
			(vectorOf(start.up).angleTo(vectorOf(end.up)) *
				(lengthOf(wayBetween(start.at, start.aim)) + lengthOf(wayBetween(end.at, end.aim)))) /
				HALVES
		)
};

/**
 * How far before the eye its picture plane stands, in pixels of a frame 1080 high, for it to see so many degrees across
 * the frame's shorter side.
 */
export function focalLengthOf(angleOfView: number): number {
	return LOOK_MADE_ON / HALVES / Math.tan(radians(angleOfView) / HALVES);
}

/**
 * The eye as it stands until a film moves it, of a focal length: straight out from the frame's middle as far, looking
 * at it, its top up the frame, focused on the frame's plane and open none, so it sees all sharp.
 */
export function eyeAtRest(focalLength: number): Eye {
	return {
		at: { across: 0, down: 0, out: focalLength },
		aim: THE_FRAMES_MIDDLE,
		up: UP_THE_FRAME,
		inside: 'world',
		focalLength,
		focusing: arrivedAt({ kind: 'distance', distance: focalLength }),
		aperture: A_PINHOLE
	};
}

/** Where an eye stands and looks, apart from its lens: its focal length, where it focuses and how wide it is open. */
export function viewpointOf(eye: Viewpoint): Viewpoint {
	return { at: eye.at, aim: eye.aim, up: eye.up };
}

/**
 * Where a film sends the eye, from where it stands, an eye of this focal length: where it rests, or a place, what the
 * film leaves out kept as it stands, the way its top points made as long as one.
 */
export function eyeSentTo(standing: Viewpoint, place: EyePlaceOrRest, focalLength: number): Viewpoint {
	if (place === AT_REST) return viewpointOf(eyeAtRest(focalLength));
	return {
		at: place.at ?? standing.at,
		aim: place.aim ?? standing.aim,
		up: place.up === undefined ? standing.up : unitOf(place.up)
	};
}

/**
 * The places of the eye a move sends it through, refused where its up turns half round, or nearly, from one to the
 * next, as which way it would roll is not said.
 */
export function placesThatRollOneWay(places: readonly Viewpoint[], move: string): readonly Viewpoint[] {
	let upBefore: Vector3 | null = null;
	for (const place of places) {
		const up = vectorOf(place.up);
		if (upBefore !== null && upBefore.angleTo(up) > radians(UP_TURNED_AT_MOST)) {
			throw new FilmError(
				`${move} turns the eye's up half round, or nearly, from one place to the next, where which way it rolls is not said: turn it through a place between`
			);
		}
		upBefore = up;
	}
	return places;
}

/**
 * The eye's path a move sends it on, refused where the eye could not see on it: looking at where it stands, or within a
 * few degrees of along its up, or flipping over, its across turned back between two steps of its way.
 */
export function pathThatSees(path: Path<Viewpoint>, move: string): Path<Viewpoint> {
	let acrossBefore: Spot | null = null;
	for (let step = 0; step <= STEPS_CHECKED; step++) {
		const across = acrossOf(path.at(step / STEPS_CHECKED));
		if (across === null || (acrossBefore !== null && dotOf(across, acrossBefore) <= POINTING_APART)) {
			throw new FilmError(
				`${move} sends the eye to look at where it stands, or within ${String(SIGHT_OFF_ITS_UP_AT_LEAST)}° of along its up, as over the top of what it looks at, where the picture would spin round: move its aim aside, or turn its up with it`
			);
		}
		acrossBefore = across;
	}
	return path;
}

/** Whether an eye stands at rest for its focal length, where every film was seen from before the eye could move. */
export function isAtRest(eye: Eye): boolean {
	return EYE_SPACE.distance(eye, eyeAtRest(eye.focalLength)) === NOT_MOVED;
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
 * size: carried into the eye's own space, moved back to where the eye at rest stands before the frame, then seen in
 * perspective from its picture plane. At rest, CSS's `perspective()` alone.
 */
export function seenByTheEye(eye: Eye, frame: Size): Matrix {
	const eyeDistance = eye.focalLength * frameScaleOf(frame);
	return chained([perspective(eyeDistance), translation({ ...NO_MOVE, out: eyeDistance }), inTheEyesSpace(eye, frame)]);
}

/**
 * The matrix that carries a spot of the room, about the frame's middle, into the eye's own space, in the frame's
 * pixels: turned and moved as the eye stands, so the eye stands at its middle, across and down run as the eye's own,
 * and what it looks at stands out of it the other way. A film's own three objects and the window that parts them stand
 * there, as three's camera space is.
 */
export function inTheEyesSpace(eye: Eye, frame: Size): Matrix {
	const [across, down, out] = axesOf(eye);
	const at = scaledBy(eye.at, frameScaleOf(frame));
	return matrixOf(across, down, out, { across: -dotOf(across, at), down: -dotOf(down, at), out: -dotOf(out, at) });
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
export function sightOf(eye: Eye, frame: Size, fromTheMiddle: Point): Sight {
	const scale = frameScaleOf(frame);
	const [across, down, out] = axesOf(eye);
	const toThePlane = -eye.focalLength * scale;
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
 * The eye's own axes in the room: across to its right, down away from where its top points, and out from what it looks
 * at toward it.
 */
function axesOf(eye: Viewpoint): readonly [Spot, Spot, Spot] {
	const out = unitOf(wayBetween(eye.aim, eye.at));
	const across = unitOf(crossOf(out, eye.up));
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

/**
 * The eye's across, the way to its right as it sees: none where it looks at where it stands, or its sight comes within
 * `SIGHT_OFF_ITS_UP_AT_LEAST` of the line its up points along, where its across turns round too fast or is lost.
 */
function acrossOf(eye: Viewpoint): Spot | null {
	const out = wayBetween(eye.aim, eye.at);
	const across = crossOf(out, eye.up);
	const offItsUp = lengthOf(across) / (lengthOf(out) * lengthOf(eye.up));
	return offItsUp > Math.sin(radians(SIGHT_OFF_ITS_UP_AT_LEAST)) ? across : null;
}

function isAngleOfView(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NO_ANGLE && written < A_HALF_TURN;
}

function isDirection(written: unknown): written is Spot {
	return A_SPOT.is(written) && lengthOf(written) > NO_LENGTH;
}

/**
 * An eye `progress` of the way to another: where it stands and looks, each evenly, and the way its top points turned
 * evenly round from one to the other.
 */
function viewpointToward(start: Viewpoint, end: Viewpoint, progress: number): Viewpoint {
	const turn = new Quaternion().setFromUnitVectors(vectorOf(start.up), vectorOf(end.up));
	const up = vectorOf(start.up).applyQuaternion(new Quaternion().slerpQuaternions(new Quaternion(), turn, progress));
	return {
		at: spotToward(start.at, end.at, progress),
		aim: spotToward(start.aim, end.aim, progress),
		up: { across: up.x, down: up.y, out: up.z }
	};
}

/** A direction as three.js holds one, as long as one: across, down and out as its x, y and z. */
function vectorOf(direction: Spot): Vector3 {
	return new Vector3(direction.across, direction.down, direction.out).normalize();
}

function spotToward(start: Spot, end: Spot, progress: number): Spot {
	return {
		across: between(start.across, end.across, progress),
		down: between(start.down, end.down, progress),
		out: between(start.out, end.out, progress)
	};
}

/**
 * Where the eye stands and looks as nine numbers have it on a path: where it stands, where it looks, then the way its
 * top points.
 */
function viewpointOfNumbers(numbers: readonly number[]): Viewpoint {
	if (numbers.length !== A_VIEWPOINTS_NUMBERS) {
		throw new Error(`an eye on a path stands for ${A_VIEWPOINTS_NUMBERS} numbers, not ${numbers.length}`);
	}
	return {
		at: spotOfNumbers(numbers, AT_FIRST),
		aim: spotOfNumbers(numbers, AIM_FIRST),
		up: spotOfNumbers(numbers, UP_FIRST)
	};
}

/** The spot three numbers have, the first of them so many in. */
function spotOfNumbers(numbers: readonly number[], first: number): Spot {
	const [across, down, out] = numbers.slice(first, first + A_SPOTS_NUMBERS);
	if (across === undefined || down === undefined || out === undefined) {
		throw new Error(`a spot on a path stands for ${A_SPOTS_NUMBERS} numbers from the ${first}th`);
	}
	return { across, down, out };
}
