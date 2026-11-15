/**
 * The eye the room is seen from: where it stands, the spot it looks at and the way its top points, in film pixels from
 * the frame's middle, `out` toward whoever watches. At rest it stands its focal length straight out from the frame's
 * middle and looks at it, so its matrix is CSS's `perspective()` alone, with no arithmetic to leave a trace, and it
 * sees the frame's plane as it is drawn.
 *
 * What stands in the world is seen from wherever the eye stands; what stands on the frame, a title or a caption, rides
 * with the eye (`src/props/object.ts`). The eye stands in the room, or rides the page's window once a flight or a move
 * before a block leaves it there (`src/moves/eye.ts`): its spots are then the window's own, so a window that leans or
 * travels in the same step carries it, whichever move is set first.
 *
 * Where it stands and where it focuses (`focusing`) are values of their own, so a move of one shares a step with a move
 * of the other; how sharp it sees is `src/domain/focus.ts`'s.
 */
import { FilmError } from './errors.ts';
import { Quaternion, Vector3 } from 'three';
import {
	type Box,
	HALVES,
	MIDDLE_SHARE,
	type Point,
	SHORTER_SIDE_IN_FILM_PIXELS,
	type Size,
	frameScaleOf,
	middleX,
	middleY
} from './geometry.ts';
import { A_NUMBER, type Kind, Literal, NameOrForm, OfForm, Plain } from './handed.ts';
import {
	A_SPOT,
	type Matrix,
	type Spot,
	carried,
	carriesEveryPointWhereItStands,
	chained,
	crossOf,
	dotOf,
	inThreesAxes,
	lengthOf,
	movedAlong,
	perspective,
	radians,
	rotationX,
	rotationY,
	scaledBy,
	translation,
	unitOf,
	wayBetween
} from './matrix.ts';
import type { LensLaw } from './focus.ts';
import type { Path, PathSpace } from './path.ts';
import type { LastingHolder } from './placement.ts';
import { between, shareByScale } from './toward.ts';
import { type Track, arrivedAt } from './track.ts';

/**
 * Where the eye stands and the spot it looks at, each in film pixels from the frame's middle, and the way its top
 * points: as long as one where a film sends it, any length on the way, where only its direction counts.
 */
export interface Viewpoint {
	readonly at: Spot;
	readonly aim: Spot;
	readonly up: Spot;
}

/**
 * Where the eye focuses: so far before it along where it looks, in film pixels; or at a spot of something that holds a
 * placement and lasts the whole film, the frame, the world, the page's window or the page, a point of its plane in its
 * pixels from its top left corner (`src/domain/placement.ts`) and how far out of that plane toward the eye, in the
 * frame's pixels, as a placement's depth: placed where it stands as each frame is drawn, as anything placed there is;
 * or under a point of the frame, in its pixels from its top left corner, where the eye sees the page's window's plane
 * there as each frame is drawn, so it stays under that point as the window moves under it.
 */
export type Focus =
	| { readonly kind: 'distance'; readonly distance: number }
	| { readonly kind: 'spot'; readonly holder: LastingHolder; readonly point: Point; readonly depth: number }
	| { readonly kind: 'under'; readonly point: Point };

/** What the eye's place is read in: the room, or the page's window as it stands. */
type EyeHolder = 'world' | 'window';

/**
 * The eye: where it stands and looks, in what it stands in; how far before it its picture plane stands, `focalLength`,
 * in film pixels, as far as it stands from the frame at rest; where it focuses, on its way from where it focused as its
 * move began, each end placed where it stands as each frame is drawn; and how wide it is open, `aperture`, in film
 * pixels, open none seeing all sharp.
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

/**
 * The eye as the stage draws a scene by it, once a scene: how far before the frame it stands at rest, its focal length
 * in the frame's pixels, which the room sees the world in perspective from; the matrices that carry the room, about the
 * frame's middle in its pixels, into the eye's own space and into the resting eye's, in three's axes, where the world's
 * lights stand for what stands in the world and for what rides with the eye (`src/props/lighting.ts`); and its lens's
 * law, which the room's lens blurs the world by (`stage/lens.js`), none where it is open none.
 */
export interface DrawnEye {
	readonly distance: number;
	readonly roomInTheEyesSpace: Matrix;
	readonly roomInTheRestingEyesSpace: Matrix;
	readonly lens: LensLaw | null;
}

/**
 * How far the eye is turned from square before a plane, in degrees, each less than a quarter round either way: `round`
 * the plane's upright toward its right, then `up` toward its top, as a soft box stands round the room
 * (`src/props/lighting.ts`).
 */
interface Turned {
	readonly round: number;
	readonly up: number;
}

/**
 * How the eye stands before a box of a plane: so far from the box's middle that, seen square, the box fills `fills` of
 * the frame along the side it fills most; turned from square about that middle, looking at it, as `turned` says; and
 * moved along its own picture plane till the middle shows at `middleAt` of the frame, in shares of it from its top left
 * corner.
 */
export interface EyeFraming {
	readonly fills: number;
	readonly middleAt: Point;
	readonly turned: Turned;
}

/**
 * How the eye goes along its straight way before a plane: `'scale'`, by even steps of the scale it shows the plane at,
 * so the plane grows or shrinks on the frame by the same ratio in each equal share of the move, as the camera zooms; or
 * `'even'`, as far along the way in each equal share.
 */
export const PACES_BEFORE_A_PLANE = ['scale', 'even'] as const;

export type PaceBeforeAPlane = (typeof PACES_BEFORE_A_PLANE)[number];

/** The line an eye sees a point on: where the eye stands, and the way its sight goes from there. */
export interface Sight {
	readonly from: Spot;
	readonly along: Spot;
}

// The frame's middle, which the eye at rest looks at; the frame's up, the way its top points, as a plane's up is in its
// own axes; the way out of a plane's face; and a move of none
const THE_FRAMES_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
const UP_THE_FRAME: Spot = { across: 0, down: -1, out: 0 };
const OUT_OF_ITS_FACE: Spot = { across: 0, down: 0, out: 1 };
const NO_MOVE: Spot = { across: 0, down: 0, out: 0 };
// The bounds of the angles of view the eye may take, in degrees
const NO_ANGLE = 0;
const A_HALF_TURN = 180;
// How near the eye's sight may come to the line its up points along, in degrees, at any step of its way: nearer, the
// eye's across turns round faster than an eye can follow as its sight sweeps past, as one that passes beside the top of
// what it looks at with its up kept does: a pass 60 pixels beside it turned the picture 152° in two frames
const SIGHT_OFF_ITS_UP_AT_LEAST = 5;
// How many steps of its way a move of the eye checks as it begins, the ends among them, for a sight too near its up on
// the way or an across turned back between two of them, as an eye flips passing over the top of its aim
const STEPS_CHECKED = 64;
// How far the eye's up may turn in one stretch of its way, in degrees: half round, or so near it, which way it rolls is
// not said by where it sets off and arrives alone
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
// How far out of a plane a spot of it stands: the frame's, where the window stands where nothing leans it
const ON_ITS_PLANE = 0;
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
	'a place of the eye: { at, aim, up }, each a spot { across, down, out } in film pixels from its middle'
);

/** Where a film sends the eye, as it writes it: a place, or back where it rests. */
export const AN_EYE_PLACE_OR_REST: Kind<EyePlaceOrRest> = new NameOrForm(
	new Literal(AT_REST),
	AN_EYE_PLACE,
	`"${AT_REST}", where the eye rests, or a place of the eye: { at, aim, up }`
);

/**
 * How the eye goes on a path: by where it stands, where it looks and the way its top points, a step as long as the
 * three move together, in film pixels the eye itself goes, not in how far what the frame shows moves; a turn of its top
 * as long as the arc it swings at as far as the eye stands from its aim, on the mean of its two ends.
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
 * How far before the eye its picture plane stands, in film pixels, for it to see so many degrees across the frame's
 * shorter side.
 */
export function focalLengthOf(angleOfView: number): number {
	return SHORTER_SIDE_IN_FILM_PIXELS / HALVES / Math.tan(radians(angleOfView) / HALVES);
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

/** Whether an eye stands at rest for its focal length. */
export function isAtRest(eye: Eye): boolean {
	return EYE_SPACE.distance(eye, eyeAtRest(eye.focalLength)) === NOT_MOVED;
}

/**
 * Whether an eye looks straight ahead at the frame's plane from before it: moved so, it sees that plane as it is, only
 * nearer, farther or aside, and every point of it on one line of sight.
 */
export function looksStraightAtTheFrame(eye: Viewpoint): boolean {
	return carriesEveryPointWhereItStands(turnOf(eye)) && eye.at.out > ON_ITS_PLANE;
}

/**
 * Where the eye stands to see a box of a plane as a framing says, an eye of this focal length on a frame of this size:
 * the box, and the places of the eye, in film pixels on the plane, `out` away from its face; its top up the plane.
 */
export function viewpointBefore(box: Box, framing: EyeFraming, focalLength: number, frame: Size): Viewpoint {
	const frameScale = frameScaleOf(frame);
	const seen = { width: frame.width / frameScale, height: frame.height / frameScale };
	const distance = (focalLength * Math.max(box.width / seen.width, box.height / seen.height)) / framing.fills;
	const facing = carried(chained([rotationY(framing.turned.round), rotationX(framing.turned.up)]), OUT_OF_ITS_FACE);
	const [across, down] = axesAlong(facing, UP_THE_FRAME);
	// How far the eye moves along its own picture plane to see the middle move a pixel the other way on the frame
	const movedPerPixel = distance / focalLength;
	const middle = { across: middleX(box), down: middleY(box), out: ON_ITS_PLANE };
	const aim = movedAlong(
		movedAlong(middle, across, (MIDDLE_SHARE.left - framing.middleAt.left) * seen.width * movedPerPixel),
		down,
		(MIDDLE_SHARE.top - framing.middleAt.top) * seen.height * movedPerPixel
	);
	return { at: movedAlong(aim, facing, distance), aim, up: UP_THE_FRAME };
}

/**
 * The eye's straight way to a place before a plane, its places in the plane's own axes, `out` away from its face, gone
 * at the pace named: evenly, as the way goes; or by even steps of the scale the eye shows the plane at, the reciprocal
 * of how far out of it the eye stands, refused where it sets off at or behind the plane, where it shows the plane at no
 * scale.
 */
export function pacedBeforeAPlane(
	way: Path<Viewpoint>,
	from: Viewpoint,
	to: Viewpoint,
	pace: PaceBeforeAPlane,
	move: string
): Path<Viewpoint> {
	switch (pace) {
		case 'even':
			return way;
		case 'scale':
			if (from.at.out <= ON_ITS_PLANE) {
				throw new FilmError(
					`${move} goes by steps of scale, and the eye stands at or behind the page's plane as it begins, where it shows the page at no scale: bring it before the page first, or name pace: 'even'`
				);
			}
			return new ByScale(way, from, to);
	}
}

/**
 * The eye's straight way before a plane gone by even steps of the scale it shows the plane at, which goes as the
 * reciprocal of how far out of the plane it stands: on past either end too, where the scale goes on growing or
 * shrinking, so the eye never reaches the plane.
 */
class ByScale implements Path<Viewpoint> {
	readonly way: Path<Viewpoint>;
	readonly startScale: number;
	readonly endScale: number;

	constructor(way: Path<Viewpoint>, from: Viewpoint, to: Viewpoint) {
		this.way = way;
		this.startScale = 1 / from.at.out;
		this.endScale = 1 / to.at.out;
	}

	at(progress: number): Viewpoint {
		return this.way.at(shareByScale(this.startScale, this.endScale, progress));
	}
}

/**
 * The matrix that carries a spot of the room, about the frame's middle, to where an eye sees it on a frame of this
 * size: carried into the eye's own space, moved back to where the eye at rest stands before the frame, then seen in
 * perspective from its picture plane. At rest, CSS's `perspective()` alone.
 */
export function seenByTheEye(eye: Eye, frame: Size): Matrix {
	const eyeDistance = eyeDistanceOn(eye, frame);
	return chained([perspective(eyeDistance), translation({ ...NO_MOVE, out: eyeDistance }), inTheEyesSpace(eye, frame)]);
}

/** How far before a frame of this size an eye stands at rest, its focal length, in the frame's own pixels. */
function eyeDistanceOn(eye: Eye, frame: Size): number {
	return eye.focalLength * frameScaleOf(frame);
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

/** The eye as the stage draws a scene by it on a frame of this size, its lens's law as its focus has it then. */
export function drawnEye(eye: Eye, frame: Size, lens: LensLaw | null): DrawnEye {
	return {
		distance: eyeDistanceOn(eye, frame),
		roomInTheEyesSpace: inThreesAxes(inTheEyesSpace(eye, frame)),
		roomInTheRestingEyesSpace: inThreesAxes(inTheEyesSpace(eyeAtRest(eye.focalLength), frame)),
		lens
	};
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
	const toThePlane = -eyeDistanceOn(eye, frame);
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
	return axesAlong(unitOf(wayBetween(eye.aim, eye.at)), eye.up);
}

/**
 * The axes of an eye whose sight comes back toward it along `out`, as long as one, its top pointing `up`: across to its
 * right, down away from where its top points, and out.
 */
function axesAlong(out: Spot, up: Spot): readonly [Spot, Spot, Spot] {
	const across = unitOf(crossOf(out, up));
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
