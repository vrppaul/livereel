/**
 * Where the camera looks, where it stands to frame a block of the page, and how far what it shows moves as it goes.
 *
 * Arithmetic on poses and boxes alone, so a film's framing is worked out before a browser is asked anything. The
 * camera's picture shows in a view, the page's window: the whole frame, edge to edge, or a window standing on the
 * film's ground. The window moves apart from the camera, so the camera holds what it aims at — a pose, or a block
 * framed with air round it — and comes to it in whatever window stands as each frame is drawn: a block it frames
 * stays framed as the window travels or grows, in the part of the window on the frame where it runs off the frame's
 * edge. The window leans, not the camera: its angle is its own, the screen in it face-on to it, so a window travels
 * and leans by moves of their own, and the camera frames a block alike at any angle. In a window the camera comes as
 * close as it takes for the screen to fill it, so the window shows part of the page and no ground, and moves as
 * little as it takes to keep it so; in the whole frame it moves as little as it takes to show no edge of the screen
 * face-on, along a side the screen is too short to fill at that zoom the screen standing in the frame's middle, as much
 * ground showing on either side of it. It stands so leant or not, so a lean never moves what it frames; a view leant
 * far over the whole frame may show ground at its far corners. What the camera shows where is worked out as the stage draws it (`.view` and
 * `.camera` in `stage/stage.css`): the screen carried by its focus to the view's middle and brought close, the view
 * swung and leant back about its middle, and seen from the eye before the frame's middle, a nearer point larger.
 */
import type { Format } from './format.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from './fraction.ts';
import {
	type Box,
	type Point,
	type Size,
	boxBetween,
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
	overlapOf,
	partWithin
} from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, needed } from './handed.ts';
import {
	type Matrix,
	type Spot,
	carried,
	chained,
	facesTheFrame,
	perspective,
	rotationX,
	rotationY,
	showsItsFront,
	translation
} from './matrix.ts';
import { between } from './time.ts';
import { ARRIVED, type Track, alongTrack, arrivedAt } from './track.ts';

/** How the screen leans back from its top edge, `tilt`, and swings about its middle, `turn`: degrees, 0 face-on. */
export interface Angle {
	readonly tilt: number;
	readonly turn: number;
}

/**
 * The point of the screen at the view's middle, and how close. `zoom` is the frame's pixels a page's pixel takes on a
 * frame the stage's look was made on, and in proportion on any other, so a pose shows as much of the page on a frame
 * of any size.
 */
export interface Pose {
	readonly focusX: number;
	readonly focusY: number;
	readonly zoom: number;
}

/**
 * Where on the frame the camera's picture shows, in the frame's pixels; how far it stands off the film's ground: at 0
 * it is the frame itself, edge to edge, at 1 a window, its corners rounded, its edge and shadow on the ground; and how
 * it leans, swung and leant back about its middle.
 */
export interface View extends Leaning {
	readonly lift: Fraction;
}

/** What leans on the frame as the window does: its box, in the frame's pixels, and how it leans about its middle. */
export interface Leaning {
	readonly box: Box;
	readonly angle: Angle;
}

/**
 * What the camera aims at: a pose the film gives, or a block of the page, as the screen showed it, framed with air
 * round it, which comes to a pose only in the view it is framed in.
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
 * The window as a scene holds it: its box, its lift and its angle, each on its own way, so a move that carries the
 * window and one that leans it share a step, each as far along as its own share. What comes up beside the window is
 * placed beside where its box goes.
 */
export interface Placing {
	readonly box: Track<Box>;
	readonly lift: Track<number>;
	readonly angle: Track<Angle>;
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

/** How close the camera comes to a block it frames where a film names no bound, as a pose's zoom has it. */
export const ZOOM_AT_MOST = 2.2;

// How far the eye stands out from the middle of a frame the stage's look was made on, in its pixels: nearer is a
// stronger angle
export const EYE_DISTANCE = 2000;
// The middle of a length lies half-way along it, and air stands on both sides of a block
const HALVES = 2;
const SIDES = 2;
// Where the screen faces before the window leans it: straight out at the eye
const FACING_OUT: Spot = { across: 0, down: 0, out: 1 };
// How far out of its own plane a point of what leans stands
const ON_ITS_PLANE = 0;
// How far the screen moves on a frame that shows none of it
const NOTHING = 0;
// Where the frame's left and top edges stand, in its own pixels
const FRAMES_EDGE = 0;
// How far a view stands off the ground: the frame itself, or a window
const FLAT: Fraction = NONE;
const LIFTED: Fraction = WHOLE;
// A view, or anything on the frame, as it stands until a move leans it
export const FACE_ON: Angle = { tilt: 0, turn: 0 };
// The whole of a view, in shares of it
const WHOLE_SHARE: Box = { left: 0, top: 0, width: 1, height: 1 };

/** The whole frame as the camera's view, edge to edge, face-on. */
export function wholeView(frame: Size): View {
	return { box: boxOf(frame), lift: FLAT, angle: FACE_ON };
}

/** A window as the camera's view, standing on the film's ground, face-on. */
export function windowView(box: Box): View {
	return { box, lift: LIFTED, angle: FACE_ON };
}

/** The camera's view over a box of the frame: the frame itself, flat, where the box is the whole of it; else a window. */
export function viewOver(box: Box, frame: Size): View {
	return isTheWholeOf(box, frame) ? wholeView(frame) : windowView(box);
}

/** The window standing in a view: there already, its box, lift and angle each. */
export function placedIn(view: View): Placing {
	return { box: arrivedAt(view.box), lift: arrivedAt(view.lift), angle: arrivedAt(view.angle) };
}

/** Where the window stands, so far on its way: its box, lift and angle, each as far along as its own move. */
export function viewOf(placing: Placing): View {
	return {
		box: alongTrack(placing.box, boxToward),
		lift: fractionOf(alongTrack(placing.lift, between)),
		angle: alongTrack(placing.angle, angleToward)
	};
}

/** The camera standing at a pose: there already, aiming at it. */
export function standingAt(pose: Pose): Aiming {
	return { from: pose, aim: { kind: 'pose', pose }, progress: ARRIVED };
}

/**
 * The camera as a frame shows it through the window where it stands so far: on its way from where it stood to its
 * aim, the aim come to in that view and kept off the screen's edge there. A block is framed in the part of the window
 * on the frame, its share of the window going from where the window stood to where it goes as the window does, so a
 * window sliding whole carries the page with it.
 */
export function seenThrough(aiming: Aiming, window: Placing, format: Format): Camera {
	const view = viewOf(window);
	const shownFrom = shownShareOf(window.box.from, format.frame);
	const shownTo = shownShareOf(window.box.to, format.frame);
	// A window sliding in from off the frame, or out off it, keeps the share it has on the frame at the other end
	const shown = boxToward(
		shownFrom ?? shownTo ?? WHOLE_SHARE,
		shownTo ?? shownFrom ?? WHOLE_SHARE,
		window.box.progress
	);
	return { pose: poseToward(aiming.from, aimedIn(aiming.aim, view, shown, format), aiming.progress), view };
}

/** The part of a view's box on the frame, in shares of the box; none where it is all off the frame. */
function shownShareOf(box: Box, frame: Size): Box | null {
	if (liesOutside(box, frame)) return null;
	const part = partWithin(box, frame);
	return {
		left: (part.left - box.left) / box.width,
		top: (part.top - box.top) / box.height,
		width: part.width / box.width,
		height: part.height / box.height
	};
}

/** The camera an act is done in: face-on at the screen's own size, on a frame the screen's size. */
export function flatCamera(format: Format): Camera {
	return { pose: flatPose(format), view: wholeView(format.screen) };
}

/** An angle `progress` of the way to another. */
export function angleToward(start: Angle, end: Angle, progress: number): Angle {
	return { tilt: between(start.tilt, end.tilt, progress), turn: between(start.turn, end.turn, progress) };
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
 * A pose kept off the screen's edge as a face-on view shows it: in a window as close as it takes for the screen to fill
 * it, in the whole frame as far back as the film puts it. Alike at any angle, the angle being the view's, so a lean
 * begun once the camera has come to its aim moves nothing the camera chose; leant far, the view's far corners may
 * show ground.
 */
export function keptOnTheScreen(pose: Pose, format: Format, view: View): Pose {
	const near = view.lift > FLAT ? filling(pose, format, view.box) : pose;
	return covering(near, format, view.box);
}

/**
 * How close a picture of the page must hold it, as a pose's zoom has it, for a frame's cameras and pieces of the page to
 * show it as sharp as it stands: its own camera, those along its way it is also exposed at, and how close each piece
 * shows it. Face-on, a camera shows a page's pixel as large anywhere on the frame, so the picture holds it as close as
 * the closest of them comes. A camera in a leant view shows the nearer part of the screen larger than its zoom, so the
 * picture holds it at livereel's bound, `ZOOM_AT_MOST`; no picture holds it closer than that.
 */
export function zoomPicturedFor(own: Camera, along: readonly Camera[], pieces: readonly number[]): number {
	const cameras = [own, ...along];
	if (!cameras.every((camera) => isFaceOn(camera.view.angle))) return ZOOM_AT_MOST;
	return Math.min(ZOOM_AT_MOST, Math.max(...cameras.map((camera) => camera.pose.zoom), ...pieces));
}

/**
 * Whether an angle leaves what leans in a plane facing the frame: neither tilted nor turned, or by whole or half turns
 * alone, which show its front or its back.
 */
export function isFaceOn(angle: Angle): boolean {
	return facesTheFrame(angledAs(angle));
}

/** Whether an angle leaves what leans facing the frame with its front, as it stood: by whole turns alone. */
export function isFrontOn(angle: Angle): boolean {
	const angled = angledAs(angle);
	return facesTheFrame(angled) && showsItsFront(angled);
}

/** The pose an aim comes to in a view, kept off the screen's edge there: the film's own, or a block framed there. */
function aimedIn(aim: Aim, view: View, shownShare: Box, format: Format): Pose {
	switch (aim.kind) {
		case 'pose':
			return keptOnTheScreen(aim.pose, format, view);
		case 'block':
			return keptOnTheScreen(framedIn(aim, view, shownShare, format), format, view);
	}
}

/**
 * The pose that frames a block in a share of a view, the part of it on the frame, its middle at that part's middle,
 * worked out face-on.
 */
function framedIn(aim: BlockAim, view: View, shownShare: Box, format: Format): Pose {
	const shown = {
		left: view.box.left + shownShare.left * view.box.width,
		top: view.box.top + shownShare.top * view.box.height,
		width: shownShare.width * view.box.width,
		height: shownShare.height * view.box.height
	};
	const pose = onto(aim.box, shown, format.frame, aim.framing);
	const frameZoom = frameZoomOf(pose, format.frame);
	return {
		focusX: pose.focusX - (middleX(shown) - middleX(view.box)) / frameZoom,
		focusY: pose.focusY - (middleY(shown) - middleY(view.box)) / frameZoom,
		zoom: pose.zoom
	};
}

/** A pose as close, at least, as it takes for the screen to fill a view of this size along both its sides. */
function filling(pose: Pose, format: Format, view: Size): Pose {
	const fills = Math.max(view.width / format.screen.width, view.height / format.screen.height);
	return { ...pose, zoom: Math.max(pose.zoom, poseZoomFor(fills, format.frame)) };
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
		zoom: between(start.zoom, end.zoom, progress)
	};
}

/** A pose as a film hands it, made by livereel or written out whole. */
export const A_POSE: Kind<Pose> = new OfForm<Pose>(
	{ focusX: needed(A_NUMBER), focusY: needed(A_NUMBER), zoom: needed(A_NUMBER) },
	'a pose: { focusX, focusY, zoom }, as steps is handed'
);

/**
 * The pose that holds a box with its air on every side in a view of this size, its middle at the view's middle, no
 * closer than allowed: worked out face-on.
 */
export function onto(box: Box, view: Size, frame: Size, framing: Framing): Pose {
	const fit = Math.min(
		view.width / (box.width + SIDES * framing.air),
		view.height / (box.height + SIDES * framing.air)
	);
	return {
		focusX: middleX(box),
		focusY: middleY(box),
		zoom: Math.min(poseZoomFor(fit, frame), framing.zoomAtMost)
	};
}

/**
 * A pose moved as little as it takes for the screen to fill a view of this size, no edge of it showing there;
 * along a side the screen is too short to fill at that zoom, it stands in the view's middle, as much ground showing
 * either side.
 */
export function covering(pose: Pose, format: Format, view: Size): Pose {
	const frameZoom = frameZoomOf(pose, format.frame);
	return {
		focusX: keptWithin(pose.focusX, view.width / (HALVES * frameZoom), format.screen.width),
		focusY: keptWithin(pose.focusY, view.height / (HALVES * frameZoom), format.screen.height),
		zoom: pose.zoom
	};
}

/**
 * How far the screen moves on the frame from one camera to another, in the frame's pixels: the farthest any point of
 * it goes that a corner of the view shows at the start, or the point nearest the corner where it shows the ground
 * round the screen; a corner that sees past the screen's plane shows none. Along a pan every point moves alike; as the
 * camera comes closer or the view leans, a point at a corner moves most.
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
	return { focusX: screen.width / HALVES, focusY: screen.height / HALVES, zoom };
}

/** Where the middle of a box on the frame stands in the room: across and down from the frame's middle, on its plane. */
function middleInTheRoom(box: Box, frame: Size): Spot {
	return {
		across: middleX(box) - frame.width / HALVES,
		down: middleY(box) - frame.height / HALVES,
		out: ON_ITS_PLANE
	};
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
	return aboutItsMiddle(leaningOnTheFrame(camera.view, frame), camera.view.box, {
		across: frameZoom * (point.left - pose.focusX),
		down: frameZoom * (point.top - pose.focusY),
		out: ON_ITS_PLANE
	});
}

/**
 * Where a box of the screen stands on the frame as a camera shows it through a view that faces the frame: between where
 * its top left and bottom right corners stand.
 */
export function boxOnTheFrame(camera: Camera, frame: Size, box: Box): Box {
	return boxBetween(
		onTheFrame(camera, frame, { left: box.left, top: box.top }),
		onTheFrame(camera, frame, { left: box.left + box.width, top: box.top + box.height })
	);
}

/**
 * The part of the screen a camera shows through a view that faces the frame, in the screen's pixels: what the part of
 * its view on the frame sees there; none where it shows nothing of the screen.
 */
export function screenShownBy(camera: Camera, format: Format): Box | null {
	const viewShown = overlapOf(camera.view.box, boxOf(format.frame));
	if (viewShown === null) return null;
	const seen = boxBetween(
		seenOnTheScreen(camera, format.frame, { left: viewShown.left, top: viewShown.top }),
		seenOnTheScreen(camera, format.frame, {
			left: viewShown.left + viewShown.width,
			top: viewShown.top + viewShown.height
		})
	);
	return overlapOf(seen, boxOf(format.screen));
}

/** The point of the screen a camera facing the frame sees at a point of the frame, which it sees the screen's plane at. */
function seenOnTheScreen(camera: Camera, frame: Size, point: Point): Point {
	const seen = underTheFrame(camera, frame, point);
	if (seen === null) throw new Error('a camera facing the frame sees the plane of its screen at every point');
	return seen;
}

/**
 * Where a point of what leans stands on the frame, the point in its box's own pixels from the top left corner: carried
 * into the room about the box's middle as it leans, and seen from the eye, as the stage draws the window.
 */
export function leantOnTheFrame(leaning: Leaning, frame: Size, point: Point): Point {
	return carriedAboutItsMiddle(leaningOnTheFrame(leaning, frame), leaning.box, point);
}

/**
 * Where a point of a box, in its pixels from the box's top left corner, stands once a matrix carries it about the box's
 * middle, as CSS carries an element about its middle: in the pixels the box is placed in.
 */
export function carriedAboutItsMiddle(matrix: Matrix, box: Box, point: Point): Point {
	return aboutItsMiddle(matrix, box, {
		across: point.left - box.width / HALVES,
		down: point.top - box.height / HALVES,
		out: ON_ITS_PLANE
	});
}

/**
 * The matrix that carries what stands in a box on the frame, about the box's middle, to where the eye sees it: from
 * before the frame's middle, a nearer spot larger and farther from that middle.
 */
export function seenFromTheEye(box: Box, frame: Size): Matrix {
	const middle = middleInTheRoom(box, frame);
	return chained([
		translation({ across: -middle.across, down: -middle.down, out: ON_ITS_PLANE }),
		perspective(eyeDistanceOf(frame)),
		translation(middle)
	]);
}

/** The matrix of what leans on the frame as the window does, about its box's middle: leant as it is, seen from the eye. */
function leaningOnTheFrame(leaning: Leaning, frame: Size): Matrix {
	return chained([seenFromTheEye(leaning.box, frame), angledAs(leaning.angle)]);
}

/** Where a spot of a box, from its middle, stands once a matrix carries it about that middle: in the box's pixels. */
function aboutItsMiddle(matrix: Matrix, box: Box, fromItsMiddle: Spot): Point {
	const spot = carried(matrix, fromItsMiddle);
	return { left: middleX(box) + spot.across, top: middleY(box) + spot.down };
}

/**
 * The point of the screen's plane a point of the frame shows from a camera: where the eye's line through it meets the
 * plane, which passes through the view's middle facing as the view leans, carried back to the screen. None
 * where the line meets the plane behind the eye, or never: the point sees past it.
 */
export function underTheFrame(camera: Camera, frame: Size, point: Point): Point | null {
	const pose = camera.pose;
	const facingNow = carried(angledAs(camera.view.angle), FACING_OUT);
	const middle = middleInTheRoom(camera.view.box, frame);
	const eyeDistance = eyeDistanceOf(frame);
	const sight = {
		across: point.left - frame.width / HALVES,
		down: point.top - frame.height / HALVES,
		out: -eyeDistance
	};
	// How far along the sight from the eye the plane is met: at the point itself, where the screen is face-on
	const reach = (dotProduct(facingNow, middle) - facingNow.out * eyeDistance) / dotProduct(facingNow, sight);
	if (!(reach > 0 && Number.isFinite(reach))) return null;
	const met = carried(angledBack(camera.view.angle), {
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

/**
 * The matrix that carries a spot of what leans, on its own plane, to its angle: swung about its middle by its turn,
 * then leant back by its tilt, as the stage's `rotateX() rotateY()` does.
 */
export function angledAs(angle: Angle): Matrix {
	return chained([rotationX(angle.tilt), rotationY(angle.turn)]);
}

/** The matrix that takes a spot of the room back from an angle to the plane's own. */
function angledBack(angle: Angle): Matrix {
	return chained([rotationY(-angle.turn), rotationX(-angle.tilt)]);
}

function dotProduct(first: Spot, second: Spot): number {
	return first.across * second.across + first.down * second.down + first.out * second.out;
}
