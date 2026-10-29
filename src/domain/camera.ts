/**
 * Where the camera looks, where it stands to frame a block of the page, and how far what it shows moves as it goes.
 *
 * Arithmetic on poses and boxes alone, so a film's framing is worked out before a browser is asked anything. The
 * camera's picture shows in a view, the page's window: the whole frame, edge to edge, or a window standing on the
 * film's ground. The window moves apart from the camera, so the camera holds what it aims at — a pose, or a block
 * framed with air round it — and comes to it in whatever window stands as each frame is drawn: a block it frames
 * stays framed as the window travels or grows, in the part of the window on the frame where it runs off the frame's
 * edge. An angle leans the view, the screen in it face-on to it. In a window
 * the camera comes as close as it takes for the screen to fill it, so the window shows part of the page and no ground,
 * and moves as little as it takes to keep it so at any angle. In the whole frame face-on it moves as little as it
 * takes to show no edge of the screen; along a side the screen is too short to fill at that zoom, the screen stands in
 * the frame's middle, as much ground showing on either side of it. An angled camera in the whole frame stands where
 * the film puts it. What the camera shows where is worked out as the stage draws it (`.view` and `.camera` in
 * `stage/stage.css`): the screen carried by its focus to the view's middle and brought close, the view swung and leant
 * back about its middle, and seen from the eye before the frame's middle, a nearer point larger.
 */
import {
	type Box,
	type Format,
	type Point,
	type Size,
	boxOf,
	boxToward,
	cornersOf,
	distanceBetween,
	frameScaleOf,
	isTheWholeOf,
	liesOutside,
	middleX,
	middleY,
	nearestWithin,
	partWithin
} from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, assertKind, needed } from './handed.ts';
import { between } from './time.ts';

/** How the screen leans back from its top edge, `tilt`, and swings about its middle, `turn`: degrees, 0 face-on. */
export interface Angle {
	readonly tilt: number;
	readonly turn: number;
}

/**
 * The point of the screen at the frame's middle, how close, and at what angle. `zoom` is the frame's pixels a page's
 * pixel takes on a frame the stage's look was made on, and in proportion on any other, so a pose shows as much of the
 * page on a frame of any size.
 */
export interface Pose extends Angle {
	readonly focusX: number;
	readonly focusY: number;
	readonly zoom: number;
}

/**
 * Where on the frame the camera's picture shows, in the frame's pixels, and how far it stands off the film's ground:
 * at 0 it is the frame itself, edge to edge; at 1 a window, its corners rounded, its edge and shadow on the ground.
 */
export interface View {
	readonly box: Box;
	readonly lift: number;
}

/**
 * What the camera aims at: a pose the film gives, or a block of the page, as the screen showed it, framed with air
 * round it at an angle, which comes to a pose only in the view it is framed in.
 */
export type Aim = PoseAim | BlockAim;

interface PoseAim {
	readonly kind: 'pose';
	readonly pose: Pose;
}

interface BlockAim {
	readonly kind: 'block';
	readonly box: Box;
	readonly framing: Framing;
	readonly angle: Angle;
}

/**
 * The camera as a scene holds it: on its way from the pose it stood at, as its move began, to what it aims at,
 * `progress` of the way; at 1, there.
 */
export interface Aiming {
	readonly from: Pose;
	readonly aim: Aim;
	readonly progress: number;
}

/**
 * The window as a scene holds it: on its way from the view it stood in, as its move began, to the one it goes to,
 * `progress` of the way; at 1, there. What stands beside the window reads where it goes.
 */
export interface Placing {
	readonly from: View;
	readonly to: View;
	readonly progress: number;
}

/** The camera as a frame shows it: how it looks at the screen, and where on the frame its picture shows. */
export interface Camera {
	readonly pose: Pose;
	readonly view: View;
}

/**
 * Where the camera's picture is cut, in from each edge of its view, in the frame's pixels; past the edge, less than
 * none. Flat on the frame, the cut stands at the screen's edges where they reach past the view's, so an angled screen
 * shows past the frame's own edges; as the view lifts into a window, the cut closes in on its edges. On a side where
 * the view stands in from the frame's edge, as a flat view sliding in or out does, the cut stands at the view's edge,
 * so nothing of the picture shows past it there.
 */
export interface Cut {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

/** The camera as the stage draws it: where it looks, and where its picture is cut in its view. */
export interface DrawnCamera {
	readonly pose: Pose;
	readonly cut: Cut;
}

/** How a block is framed: `air` clear on its every side, in the page's pixels; the camera no closer than `zoomAtMost`. */
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

// How far the eye stands out from the middle of a frame the stage's look was made on, in its pixels: nearer is a
// stronger angle
const EYE_DISTANCE = 2000;
// The middle of a length lies half-way along it, and air stands on both sides of a block
const HALVES = 2;
const SIDES = 2;
// Where the screen faces before the camera angles it: straight out at the eye
const FACING_OUT: Spot = { across: 0, down: 0, out: 1 };
// How far the screen moves on a frame that shows none of it
const NOTHING = 0;
// Where the frame's left and top edges stand, in its own pixels
const FRAMES_EDGE = 0;
const DEGREES_IN_A_HALF_TURN = 180;
// How far a view stands off the ground: the frame itself, or a window
const FLAT = 0;
const LIFTED = 1;
// A camera that has come all the way to its aim
const ARRIVED = 1;

/** The whole frame as the camera's view, edge to edge. */
export function wholeView(frame: Size): View {
	return { box: boxOf(frame), lift: FLAT };
}

/** A window as the camera's view, standing on the film's ground. */
export function windowView(box: Box): View {
	return { box, lift: LIFTED };
}

/** The camera's view over a box of the frame: the frame itself, flat, where the box is the whole of it; else a window. */
export function viewOver(box: Box, frame: Size): View {
	return isTheWholeOf(box, frame) ? wholeView(frame) : windowView(box);
}

/** The window standing in a view: there already. */
export function placedIn(view: View): Placing {
	return { from: view, to: view, progress: ARRIVED };
}

/** Where the window stands, so far on its way. */
export function viewOf(placing: Placing): View {
	return viewToward(placing.from, placing.to, placing.progress);
}

/** The camera standing at a pose: there already, aiming at it. */
export function standingAt(pose: Pose): Aiming {
	return { from: pose, aim: { kind: 'pose', pose }, progress: ARRIVED };
}

/**
 * The camera as a frame shows it through a view: so far on its way from where it stood to its aim, the aim come to
 * in that view and kept off the screen's edge there.
 */
export function seenThrough(aiming: Aiming, view: View, format: Format): Camera {
	return { pose: poseToward(aiming.from, aimedIn(aiming.aim, view, format), aiming.progress), view };
}

/** The camera an act is done in: face-on at the screen's own size, on a frame the screen's size. */
export function flatCamera(format: Format): Camera {
	return { pose: flatPose(format), view: wholeView(format.screen) };
}

/** A view `progress` of the way to another: its box moved and resized, and lifted or laid down as far. */
function viewToward(start: View, end: View, progress: number): View {
	return { box: boxToward(start.box, end.box, progress), lift: between(start.lift, end.lift, progress) };
}

/** A camera `progress` of the way from one to another: its pose, and its view. */
export function cameraToward(start: Camera, end: Camera, progress: number): Camera {
	return { pose: poseToward(start.pose, end.pose, progress), view: viewToward(start.view, end.view, progress) };
}

/** The camera as the stage draws it, its cut worked out from where the screen stands in its view. */
export function drawnCamera(camera: Camera, format: Format): DrawnCamera {
	const view = camera.view.box;
	const frameZoom = frameZoomOf(camera.pose, format.frame);
	const screenLeft = view.width / HALVES - camera.pose.focusX * frameZoom;
	const screenTop = view.height / HALVES - camera.pose.focusY * frameZoom;
	const screenRight = screenLeft + format.screen.width * frameZoom;
	const screenBottom = screenTop + format.screen.height * frameZoom;
	// How much of the way from the screen's edges to the view's the cut still stands out
	const open = LIFTED - camera.view.lift;
	const { frame } = format;
	return {
		pose: camera.pose,
		cut: {
			top: cutPast(screenTop, view.top > FRAMES_EDGE, open),
			right: cutPast(view.width - screenRight, view.left + view.width < frame.width, open),
			bottom: cutPast(view.height - screenBottom, view.top + view.height < frame.height, open),
			left: cutPast(screenLeft, view.left > FRAMES_EDGE, open)
		}
	};
}

/**
 * Where the picture is cut on one side of its view: as far past the view's edge as the screen reaches, so much of the
 * way as the cut still stands out, where the view meets the frame's edge there; at the view's edge where it stands in
 * from the frame's.
 */
function cutPast(screenPast: number, standsIn: boolean, open: number): number {
	return standsIn ? NOTHING : open * Math.min(NOTHING, screenPast);
}

/**
 * A pose kept off the screen's edge: in a window at any angle, which the angle leans with the screen in it, as close
 * as it takes for the screen to fill the window; in the whole frame face-on, as far back as the film puts it. An
 * angled screen in the whole frame leans off the frame's plane and shows ground round it wherever the camera stands,
 * so it stands where the film puts it.
 */
export function keptOnTheScreen(pose: Pose, format: Format, view: View): Pose {
	if (view.lift > FLAT) return covering(filling(pose, format, view.box), format, view.box);
	const faceOn = pose.tilt === 0 && pose.turn === 0;
	return faceOn ? covering(pose, format, view.box) : pose;
}

/** The pose an aim comes to in a view, kept off the screen's edge there: the film's own, or a block framed there. */
function aimedIn(aim: Aim, view: View, format: Format): Pose {
	switch (aim.kind) {
		case 'pose':
			return keptOnTheScreen(aim.pose, format, view);
		case 'block':
			return keptOnTheScreen(framedIn(aim, view, format), format, view);
	}
}

/**
 * The pose that frames a block in the part of a view on the frame, its middle at that part's middle, worked out
 * face-on: a window running off the frame's edge frames it in what shows of the window; a view all on the frame, or
 * all off it, in the whole view.
 */
function framedIn(aim: BlockAim, view: View, format: Format): Pose {
	const shown = liesOutside(view.box, format.frame) ? view.box : partWithin(view.box, format.frame);
	const pose = onto(aim.box, aim.angle, shown, format.frame, aim.framing);
	const frameZoom = frameZoomOf(pose, format.frame);
	return focusedAt(
		pose,
		pose.focusX - (middleX(shown) - middleX(view.box)) / frameZoom,
		pose.focusY - (middleY(shown) - middleY(view.box)) / frameZoom,
		pose.zoom
	);
}

/** A pose as close, at least, as it takes for the screen to fill a view of this size along both its sides. */
function filling(pose: Pose, format: Format, view: Size): Pose {
	const fills = Math.max(view.width / format.screen.width, view.height / format.screen.height);
	return focusedAt(pose, pose.focusX, pose.focusY, Math.max(pose.zoom, poseZoomFor(fills, format.frame)));
}

/** Face-on, the whole screen as large as the frame holds it. */
export function wholePose(format: Format): Pose {
	const held = Math.min(format.frame.width / format.screen.width, format.frame.height / format.screen.height);
	return facing(format.screen, poseZoomFor(held, format.frame));
}

/**
 * Face-on at the screen's own size, on a frame the screen's size: the pose the page is acted on in, every point of it
 * its own.
 */
function flatPose(format: Format): Pose {
	return facing(format.screen, poseZoomFor(1, format.screen));
}

function poseToward(start: Pose, end: Pose, progress: number): Pose {
	return {
		focusX: between(start.focusX, end.focusX, progress),
		focusY: between(start.focusY, end.focusY, progress),
		zoom: between(start.zoom, end.zoom, progress),
		tilt: between(start.tilt, end.tilt, progress),
		turn: between(start.turn, end.turn, progress)
	};
}

/** A pose as a film hands it, made by livereel or written out whole. */
export const A_POSE: Kind<Pose> = new OfForm<Pose>(
	{
		focusX: needed(A_NUMBER),
		focusY: needed(A_NUMBER),
		zoom: needed(A_NUMBER),
		tilt: needed(A_NUMBER),
		turn: needed(A_NUMBER)
	},
	'a pose: { focusX, focusY, zoom, tilt, turn }, as steps is handed or lookingAt gives'
);

/** The same angle, looking at another point from another distance, as a film asks for it: what it hands is checked. */
export function lookingAt(pose: Pose, focusX: number, focusY: number, zoom: number): Pose {
	assertKind(pose, A_POSE, "lookingAt's pose");
	assertKind(focusX, A_NUMBER, "lookingAt's focusX");
	assertKind(focusY, A_NUMBER, "lookingAt's focusY");
	assertKind(zoom, A_NUMBER, "lookingAt's zoom");
	return focusedAt(pose, focusX, focusY, zoom);
}

/** At an angle, looking at a point from a distance. */
function focusedAt(angle: Angle, focusX: number, focusY: number, zoom: number): Pose {
	return { focusX, focusY, zoom, tilt: angle.tilt, turn: angle.turn };
}

/**
 * The pose that holds a box with its air on every side in a view of this size, its middle at the view's middle, at
 * `around`'s angle, no closer than allowed: worked out face-on.
 */
export function onto(box: Box, around: Angle, view: Size, frame: Size, framing: Framing): Pose {
	const fit = Math.min(
		view.width / (box.width + SIDES * framing.air),
		view.height / (box.height + SIDES * framing.air)
	);
	return focusedAt(around, middleX(box), middleY(box), Math.min(poseZoomFor(fit, frame), framing.zoomAtMost));
}

/**
 * A pose moved as little as it takes for the screen to fill a view of this size, no edge of it showing there;
 * along a side the screen is too short to fill at that zoom, it stands in the view's middle, as much ground showing
 * either side.
 */
export function covering(pose: Pose, format: Format, view: Size): Pose {
	const frameZoom = frameZoomOf(pose, format.frame);
	return focusedAt(
		pose,
		keptWithin(pose.focusX, view.width / (HALVES * frameZoom), format.screen.width),
		keptWithin(pose.focusY, view.height / (HALVES * frameZoom), format.screen.height),
		pose.zoom
	);
}

/**
 * How far the screen moves on the frame from one camera to another, in the frame's pixels: the farthest any point of
 * it goes that a corner of the view shows at the start, or the point nearest the corner where it shows the ground
 * round the screen; a corner that sees past the screen's plane shows none. Along a pan every point moves alike; as the
 * camera comes closer or angles, a point at a corner moves most.
 */
export function frameShift(start: Camera, end: Camera, format: Format): number {
	const moved = cornersOf(start.view.box)
		.map((corner) => underTheFrame(start, format.frame, corner))
		.filter((point) => point !== null)
		.map((point) => nearestWithin(point, format.screen))
		.map((point) => distanceBetween(onTheFrame(start, format.frame, point), onTheFrame(end, format.frame, point)));
	return Math.max(NOTHING, ...moved);
}

function facing(screen: Size, zoom: number): Pose {
	return { focusX: screen.width / HALVES, focusY: screen.height / HALVES, zoom, tilt: 0, turn: 0 };
}

/** Where a view's middle stands in the room: across and down from the frame's middle, on the frame's plane. */
function viewMiddle(view: View, frame: Size): Spot {
	return { across: middleX(view.box) - frame.width / HALVES, down: middleY(view.box) - frame.height / HALVES, out: 0 };
}

/** A focus moved so that as much as is seen either side of it stays on the screen; the screen's middle where it cannot. */
function keptWithin(focus: number, halfSeen: number, length: number): number {
	if (HALVES * halfSeen > length) return length / HALVES;
	return Math.min(Math.max(focus, halfSeen), length - halfSeen);
}

/**
 * Where a point of the screen stands on the frame from a camera: carried into the room about its view's middle, the
 * view set where it stands, and seen from the eye.
 */
export function onTheFrame(camera: Camera, frame: Size, point: Point): Point {
	const pose = camera.pose;
	const frameZoom = frameZoomOf(pose, frame);
	const spot = angledAs(pose, {
		across: frameZoom * (point.left - pose.focusX),
		down: frameZoom * (point.top - pose.focusY),
		out: 0
	});
	const middle = viewMiddle(camera.view, frame);
	const eyeDistance = eyeDistanceOf(frame);
	const larger = eyeDistance / (eyeDistance - spot.out);
	return {
		left: frame.width / HALVES + (middle.across + spot.across) * larger,
		top: frame.height / HALVES + (middle.down + spot.down) * larger
	};
}

/**
 * The point of the screen's plane a point of the frame shows from a camera: where the eye's line through it meets the
 * plane, which passes through the view's middle facing as the camera angles it, carried back to the screen. None
 * where the line meets the plane behind the eye, or never: the point sees past it.
 */
export function underTheFrame(camera: Camera, frame: Size, point: Point): Point | null {
	const pose = camera.pose;
	const facingNow = angledAs(pose, FACING_OUT);
	const middle = viewMiddle(camera.view, frame);
	const eyeDistance = eyeDistanceOf(frame);
	const sight = {
		across: point.left - frame.width / HALVES,
		down: point.top - frame.height / HALVES,
		out: -eyeDistance
	};
	// How far along the sight from the eye the plane is met: at the point itself, where the screen is face-on
	const reach = (dotProduct(facingNow, middle) - facingNow.out * eyeDistance) / dotProduct(facingNow, sight);
	if (!(reach > 0 && Number.isFinite(reach))) return null;
	const met = angledBack(pose, {
		across: sight.across * reach - middle.across,
		down: sight.down * reach - middle.down,
		out: eyeDistance + sight.out * reach
	});
	const frameZoom = frameZoomOf(pose, frame);
	return { left: pose.focusX + met.across / frameZoom, top: pose.focusY + met.down / frameZoom };
}

/** The frame's own pixels a page's pixel takes in a pose, on a frame of this size. */
function frameZoomOf(pose: Pose, frame: Size): number {
	return pose.zoom * frameScaleOf(frame);
}

/** The zoom of a pose in which a page's pixel takes so many of the frame's own pixels, on a frame of this size. */
function poseZoomFor(frameZoom: number, frame: Size): number {
	return frameZoom / frameScaleOf(frame);
}

/**
 * How far the eye stands out from a frame's middle, in its pixels: as far, for its size, as from a frame the stage's
 * look was made on, so an angle leans as steeply on any frame. The stage's perspective is set to it (`setup` in
 * `stage/stage.js`).
 */
export function eyeDistanceOf(frame: Size): number {
	return EYE_DISTANCE * frameScaleOf(frame);
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
