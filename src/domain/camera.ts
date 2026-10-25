/**
 * Where the camera looks, and where it stands to frame a block of the page.
 *
 * Arithmetic on poses and boxes alone, so a film's framing is worked out before a browser is asked anything. A
 * face-on camera never shows the screen's edge: it is moved as little as it takes to keep the screen filling the
 * frame.
 */
import { type Box, type Format, type Size, middleX, middleY } from './geometry.ts';
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

// The middle of a length lies half-way along it, and air stands on both sides of a block
const HALVES = 2;
const SIDES = 2;

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
 * the screen is too short to fill at that zoom, the pose stays as it is.
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

function facing(screen: Size, zoom: number): Pose {
	return { focusX: screen.width / HALVES, focusY: screen.height / HALVES, zoom, tilt: 0, turn: 0 };
}

/** A focus moved so that as much as is seen either side of it stays on the screen, where it can. */
function keptWithin(focus: number, halfSeen: number, length: number): number {
	if (HALVES * halfSeen > length) return focus;
	return Math.min(Math.max(focus, halfSeen), length - halfSeen);
}
