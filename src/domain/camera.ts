/**
 * Where the camera looks, where it stands to frame a block of the page, and how far what it shows moves as it goes.
 *
 * Arithmetic on poses and boxes alone, so a film's framing is worked out before a browser is asked anything. A
 * face-on camera is moved as little as it takes to keep the screen filling the frame, no edge of it showing; along
 * a side the screen is too short to fill at that zoom, the screen stands in the frame's middle, as much ground
 * showing on either side of it. What the camera shows where is worked out as the stage draws it (`.camera` in
 * `stage/stage.css`): the screen carried by its focus to the frame's middle, brought close, swung, leant back, and
 * seen from the eye, a nearer point larger.
 */
import {
	type Box,
	type Format,
	type Point,
	type Size,
	cornersOf,
	distanceBetween,
	middleX,
	middleY,
	nearestWithin
} from './geometry.ts';
import { between } from './time.ts';

/**
 * The point of the screen at the frame's middle, how close, and at what angle: `tilt` leans the screen back from its
 * top edge, `turn` swings it about its middle, both in degrees, 0 face-on.
 */
export interface Pose {
	readonly focusX: number;
	readonly focusY: number;
	readonly zoom: number;
	readonly tilt: number;
	readonly turn: number;
}

/** How a block is framed: `air` clear on its every side, the camera no closer than `zoomAtMost`. */
export interface Framing {
	readonly air: number;
	readonly zoomAtMost: number;
}

/**
 * A point of the room the stage moves the screen in, in the frame's pixels: across and down from the frame's middle,
 * and out from the frame toward the eye.
 */
interface Spot {
	readonly across: number;
	readonly down: number;
	readonly out: number;
}

/**
 * How far the eye stands out from the frame's middle, in the frame's pixels: nearer is a stronger angle. The stage's
 * perspective is set to it (`setup` in `stage/stage.js`).
 */
export const EYE_DISTANCE = 2000;
// The middle of a length lies half-way along it, and air stands on both sides of a block
const HALVES = 2;
const SIDES = 2;
// Where the screen faces before the camera angles it: straight out at the eye
const FACING_OUT: Spot = { across: 0, down: 0, out: 1 };
// How far the screen moves on a frame that shows none of it
const NOTHING = 0;
const DEGREES_IN_A_HALF_TURN = 180;

/** Face-on, the whole screen as large as the frame holds it. */
export function wholePose(format: Format): Pose {
	const zoom = Math.min(format.frame.width / format.screen.width, format.frame.height / format.screen.height);
	return facing(format.screen, zoom);
}

/** Face-on at the screen's own size: the pose the page is acted on in, every point of it its own. */
export function flatPose(format: Format): Pose {
	return facing(format.screen, 1);
}

export function isFaceOn(pose: Pose): boolean {
	return pose.tilt === 0 && pose.turn === 0;
}

export function poseToward(start: Pose, end: Pose, progress: number): Pose {
	return {
		focusX: between(start.focusX, end.focusX, progress),
		focusY: between(start.focusY, end.focusY, progress),
		zoom: between(start.zoom, end.zoom, progress),
		tilt: between(start.tilt, end.tilt, progress),
		turn: between(start.turn, end.turn, progress)
	};
}

/** The same angle, looking at another point from another distance. */
export function lookingAt(pose: Pose, focusX: number, focusY: number, zoom: number): Pose {
	return { focusX, focusY, zoom, tilt: pose.tilt, turn: pose.turn };
}

/** The same point and distance, at another angle. */
export function angled(pose: Pose, tilt: number, turn: number): Pose {
	return { focusX: pose.focusX, focusY: pose.focusY, zoom: pose.zoom, tilt, turn };
}

/** The pose that holds a box with its air on every side, at `around`'s angle, no closer than allowed. */
export function onto(box: Box, around: Pose, frame: Size, framing: Framing): Pose {
	const fit = Math.min(
		frame.width / (box.width + SIDES * framing.air),
		frame.height / (box.height + SIDES * framing.air)
	);
	return lookingAt(around, middleX(box), middleY(box), Math.min(fit, framing.zoomAtMost));
}

/**
 * A face-on pose moved as little as it takes for the screen to fill the frame, no edge of it showing; along a side
 * the screen is too short to fill at that zoom, it stands in the frame's middle, as much ground showing either side.
 */
export function covering(pose: Pose, format: Format): Pose {
	const halfWidth = format.frame.width / (HALVES * pose.zoom);
	const halfHeight = format.frame.height / (HALVES * pose.zoom);
	return lookingAt(
		pose,
		keptWithin(pose.focusX, halfWidth, format.screen.width),
		keptWithin(pose.focusY, halfHeight, format.screen.height),
		pose.zoom
	);
}

/**
 * How far the screen moves on the frame from one pose to another, in the frame's pixels: the farthest any point of it
 * goes that a corner of the frame shows at the start, or the point nearest the corner where it shows the ground round
 * the screen; a corner that sees past the screen's plane shows none. Along a pan every point moves alike; as the
 * camera comes closer or angles, a point at a corner moves most.
 */
export function frameShift(start: Pose, end: Pose, format: Format): number {
	const moved = cornersOf(format.frame)
		.map((corner) => underTheFrame(start, format.frame, corner))
		.filter((point) => point !== null)
		.map((point) => nearestWithin(point, format.screen))
		.map((point) => distanceBetween(onTheFrame(start, format.frame, point), onTheFrame(end, format.frame, point)));
	return Math.max(NOTHING, ...moved);
}

function facing(screen: Size, zoom: number): Pose {
	return { focusX: screen.width / HALVES, focusY: screen.height / HALVES, zoom, tilt: 0, turn: 0 };
}

/** A focus moved so that as much as is seen either side of it stays on the screen; the screen's middle where it cannot. */
function keptWithin(focus: number, halfSeen: number, length: number): number {
	if (HALVES * halfSeen > length) return length / HALVES;
	return Math.min(Math.max(focus, halfSeen), length - halfSeen);
}

/** Where a point of the screen stands on the frame from a pose: carried into the room, and seen from the eye. */
export function onTheFrame(pose: Pose, frame: Size, point: Point): Point {
	const spot = angledAs(pose, {
		across: pose.zoom * (point.left - pose.focusX),
		down: pose.zoom * (point.top - pose.focusY),
		out: 0
	});
	const larger = EYE_DISTANCE / (EYE_DISTANCE - spot.out);
	return { left: frame.width / HALVES + spot.across * larger, top: frame.height / HALVES + spot.down * larger };
}

/**
 * The point of the screen's plane a point of the frame shows from a pose: where the eye's line through it meets the
 * plane, which passes through the room's middle facing as the camera angles it, carried back to the screen. None
 * where the line meets the plane behind the eye, or never: the point sees past it.
 */
export function underTheFrame(pose: Pose, frame: Size, point: Point): Point | null {
	const facingNow = angledAs(pose, FACING_OUT);
	const sight = {
		across: point.left - frame.width / HALVES,
		down: point.top - frame.height / HALVES,
		out: -EYE_DISTANCE
	};
	// How far along the sight from the eye the plane is met: at the point itself, where the screen is face-on
	const reach = (-facingNow.out * EYE_DISTANCE) / dotProduct(facingNow, sight);
	if (!(reach > 0 && Number.isFinite(reach))) return null;
	const met = angledBack(pose, {
		across: sight.across * reach,
		down: sight.down * reach,
		out: EYE_DISTANCE + sight.out * reach
	});
	return { left: pose.focusX + met.across / pose.zoom, top: pose.focusY + met.down / pose.zoom };
}

/** A spot of the screen's own, at the pose's angle: swung by its turn, then leant back by its tilt. */
function angledAs(pose: Pose, spot: Spot): Spot {
	return leantBack(swung(spot, pose.turn), pose.tilt);
}

/** A spot of the room taken back from the pose's angle to the screen's own. */
function angledBack(pose: Pose, spot: Spot): Spot {
	return swung(leantBack(spot, -pose.tilt), -pose.turn);
}

/** A spot swung about the line down the frame's middle, as CSS's `rotateY`. */
function swung(spot: Spot, degrees: number): Spot {
	const angle = radians(degrees);
	return {
		across: spot.across * Math.cos(angle) + spot.out * Math.sin(angle),
		down: spot.down,
		out: spot.out * Math.cos(angle) - spot.across * Math.sin(angle)
	};
}

/** A spot leant about the line across the frame's middle, as CSS's `rotateX`: the top goes back for more degrees. */
function leantBack(spot: Spot, degrees: number): Spot {
	const angle = radians(degrees);
	return {
		across: spot.across,
		down: spot.down * Math.cos(angle) - spot.out * Math.sin(angle),
		out: spot.down * Math.sin(angle) + spot.out * Math.cos(angle)
	};
}

function dotProduct(first: Spot, second: Spot): number {
	return first.across * second.across + first.down * second.down + first.out * second.out;
}

function radians(degrees: number): number {
	return (degrees * Math.PI) / DEGREES_IN_A_HALF_TURN;
}
