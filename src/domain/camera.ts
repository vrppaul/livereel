/**
 * Where the camera looks, where it stands to frame a block of the page, and how far what it shows moves as it goes.
 *
 * Arithmetic on poses and boxes alone, so a film's framing is worked out before a browser is asked anything. The
 * camera's picture shows in a view, the page's window: the whole frame, edge to edge, or a window standing on the
 * film's ground. The window moves apart from the camera, so the camera holds what it aims at — a pose, or a block
 * framed with air round it — and comes to it in whatever window stands as each frame is drawn: a block it frames
 * stays framed as the window travels or grows, in the part of the window on the frame where it runs off the frame's
 * edge. The window leans, not the camera: how it stands is its own (`src/domain/stance.ts`), the screen in it face-on
 * to it, so a window travels and leans by moves of their own, and the camera frames a block alike at any angle. In a
 * window the camera comes as close as it takes for the screen to fill it, so the window shows part of the page and no
 * ground, and moves as little as it takes to keep it so; in the whole frame it moves as little as it takes to show no
 * edge of the screen face-on, along a side the screen is too short to fill at that zoom the screen standing in the
 * frame's middle, as much ground showing on either side of it. It stands so leant or not, so a lean never moves what
 * it frames; a view leant far over the whole frame may show ground at its far corners. What the camera shows where is
 * worked out as the stage draws it (`.camera` in `stage/stage.css`, and the view by where it is placed in the world,
 * `src/domain/placement.ts`): the screen carried by its focus to the view's middle and brought close, the view
 * standing about its middle as it stands, and seen from the eye before the frame's middle, a nearer point larger. Where
 * a point of it is seen on the frame is `pointOnTheFrame` there; how far it moves on the frame is worked out here.
 */
import { type Eye, type Viewpoint, eyeAtRest, isAtRest, sightOf } from './eye.ts';
import type { Format } from './format.ts';
import { boxInTheView, frameZoomOf, pointInTheView } from './framing.ts';
import { type Fraction, NONE, WHOLE } from './fraction.ts';
import {
	type Box,
	CORNER_SHARES,
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
	partWithin,
	pointAt,
	withAir
} from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, Plain, needed } from './handed.ts';
import { NO_KEYS, type PathSpace, type Through, alongPath } from './path.ts';
import {
	type Matrix,
	type Spot,
	carried,
	chained,
	dotOf,
	facesTheFrame,
	movedAlong,
	scaledBy,
	translation,
	wayBetween
} from './matrix.ts';
import { middleInTheRoom, pointOnTheFrame, windowInTheWorld } from './placement.ts';
import {
	AS_PLACED,
	type Stance,
	angledAs,
	angledBack,
	middleMovedBy,
	stanceMatrix,
	stanceMatrixBack
} from './stance.ts';
import { between } from './toward.ts';
import { ARRIVED, type Track, alongTrack, arrivedAt } from './track.ts';

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
 * it stands about its middle (`src/domain/stance.ts`).
 */
export interface View extends Stance {
	readonly box: Box;
	readonly lift: Fraction;
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
 * The camera as a scene holds it: on its path from the pose it stood at, as its move began, through the aims on its
 * way, to what it aims at, `progress` of the way; at 1, there. Each aim comes to a pose in the view as each frame is
 * drawn, the keys on the way as the last.
 */
export interface Aiming {
	readonly from: Pose;
	readonly through: Through<Aim>;
	readonly aim: Aim;
	readonly progress: number;
}

/**
 * The window as a scene holds it, all the camera reads of it: its box on its way, as the camera keeps what it frames in
 * the part of the window on the frame as the window goes, and what comes up beside the window is placed beside where it
 * goes; and how far it stands off the ground and how it stands, as far along as the moves that set them have come.
 */
export interface Placing extends Stance {
	readonly box: Track<Box>;
	readonly lift: Fraction;
}

/**
 * The camera as a frame shows it: how it looks at the screen, where its picture shows on the frame's plane, and the eye
 * that plane is seen from, which stands where the film has it.
 */
export interface Camera {
	readonly pose: Pose;
	readonly view: View;
	readonly eye: Eye;
}

/**
 * Where the camera's picture is cut, in from each edge of its view, in the frame's pixels; past the edge, less than
 * none. Flat on the frame, the cut stands at the edges of the page the screen shows, the screen's or a sheet's past it,
 * where they reach past the view's, so an angled screen shows past the frame's own edges; as the view lifts into a
 * window, the cut closes in on its edges. On a side where the view stands in from the frame's edge, as a flat view
 * sliding in or out does, the cut stands at the view's edge, so nothing of the picture shows past it there.
 */
export interface Cut {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

/**
 * The cameras two moments of a frame's time show the scene by, on a frame of a size: what moves on the frame while its
 * shutter is open is measured between them.
 */
export interface SeenBetween {
	readonly start: Camera;
	readonly end: Camera;
	readonly frame: Size;
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

// The middle of a length lies half-way along it
const HALVES = 2;
// Where the screen faces before the window leans it: straight out at the eye
const FACING_OUT: Spot = { across: 0, down: 0, out: 1 };
// How far the screen moves on a frame that shows none of it
const NOTHING = 0;
// Where the frame's left and top edges stand, in its own pixels
const FRAMES_EDGE = 0;
// A zoom that shows a page's pixel as none of the frame's, which no camera comes to
const NO_ZOOM = 0;
// How far a view stands off the ground: the frame itself, or a window
const FLAT: Fraction = NONE;
const LIFTED: Fraction = WHOLE;
// The whole of a view, in shares of it
const WHOLE_SHARE: Box = { left: 0, top: 0, width: 1, height: 1 };
// A move the other way: so many times as far back
const BACK = -1;

/** The whole frame as the camera's view, edge to edge, standing as placed. */
export function wholeView(frame: Size): View {
	return { box: boxOf(frame), lift: FLAT, ...AS_PLACED };
}

/** A window as the camera's view, standing on the film's ground as placed. */
export function windowView(box: Box): View {
	return { box, lift: LIFTED, ...AS_PLACED };
}

/** The camera's view over a box of the frame: the frame itself, flat, where the box is the whole of it; else a window. */
export function viewOver(box: Box, frame: Size): View {
	return isTheWholeOf(box, frame) ? wholeView(frame) : windowView(box);
}

/** The window standing in a view: its box there already, lifted and standing as the view. */
export function placedIn(view: View): Placing {
	return { ...view, box: arrivedAt(view.box) };
}

/** Where the window stands, so far on its way: its box as far along as its move, lifted and standing as it is. */
export function viewOf(placing: Placing): View {
	return {
		box: alongTrack(placing.box, boxToward),
		lift: placing.lift,
		scale: placing.scale,
		depth: placing.depth,
		angle: placing.angle,
		about: placing.about
	};
}

/** The camera standing at a pose: there already, aiming at it. */
export function standingAt(pose: Pose): Aiming {
	return { from: pose, through: NO_KEYS, aim: { kind: 'pose', pose }, progress: ARRIVED };
}

/**
 * The camera as a frame shows it through the window where it stands so far: on its path from where it stood, through
 * the aims on its way, to its aim, each come to in that view and kept off the screen's edge there, as is every pose on
 * its path: a path through keys may bow past the edge between them, and a zoom from a screen too short to fill the frame
 * would show the screen's edge where it kept its still point still. A block is framed in the part of the window on the
 * frame, its share of the window going from where the window stood to where it goes as the window does, so a window
 * sliding whole carries the page with it. The window's plane is seen from the eye where it stands.
 */
export function seenThrough(aiming: Aiming, window: Placing, eye: Eye, format: Format): Camera {
	const view = viewOf(window);
	const shownFrom = shownShareOf(window.box.from, format.frame);
	const shownTo = shownShareOf(window.box.to, format.frame);
	// A window sliding in from off the frame, or out off it, keeps the share it has on the frame at the other end
	const shown = boxToward(
		shownFrom ?? shownTo ?? WHOLE_SHARE,
		shownTo ?? shownFrom ?? WHOLE_SHARE,
		window.box.progress
	);
	const through = { ...aiming.through, keys: aiming.through.keys.map((aim) => aimedIn(aim, view, shown, format)) };
	const to = aimedIn(aiming.aim, view, shown, format);
	const inTheRoom = eyeInTheRoom(eye, view, format.frame);
	const pose = alongPath(aiming.from, through, to, poseSpaceIn(view, inTheRoom, format), aiming.progress);
	return { pose: keptOnTheScreen(pose, format, view), view, eye: inTheRoom };
}

/**
 * The eye where it stands in the room: as it stands, where it stands there; carried by the window as it stands, where
 * it rides the window.
 */
function eyeInTheRoom(eye: Eye, view: View, frame: Size): Eye {
	switch (eye.inside) {
		case 'world':
			return eye;
		case 'window':
			return { ...eye, ...viewpointCarried(windowInTheRoom(view, frame), angledAs(view.angle), eye), inside: 'world' };
	}
}

/**
 * An eye standing in the room, riding the window as it stands now: where it stands, looks and its top points on the
 * window's own plane, in pixels of a frame 1080 high from the window's middle, `out` away from its face.
 */
export function eyeInTheWindow(eye: Eye, view: View, frame: Size): Eye {
	const back = chained([
		stanceMatrixBack(stanceAsTheEyeMeasures(view, frame), sizeAsTheEyeMeasures(view, frame)),
		translation(scaledBy(windowsMiddle(view, frame), BACK))
	]);
	return { ...eye, ...viewpointCarried(back, angledBack(view.angle), eye), inside: 'window' };
}

/**
 * The matrix that carries a spot of the window's own plane, from its middle, into the room as the window stands on a
 * frame of this size, in pixels of a frame 1080 high, as the eye's spots are.
 */
function windowInTheRoom(view: View, frame: Size): Matrix {
	return chained([
		translation(windowsMiddle(view, frame)),
		stanceMatrix(stanceAsTheEyeMeasures(view, frame), sizeAsTheEyeMeasures(view, frame))
	]);
}

/**
 * Where the middle of the window's box stands on the frame's plane on a frame of this size, in pixels of a frame 1080
 * high.
 */
function windowsMiddle(view: View, frame: Size): Spot {
	return scaledBy(middleInTheRoom(view.box, frame), 1 / frameScaleOf(frame));
}

/** How the window stands on a frame of this size, its depth in pixels of a frame 1080 high, as the eye's spots are. */
function stanceAsTheEyeMeasures(view: View, frame: Size): Stance {
	return { scale: view.scale, depth: view.depth / frameScaleOf(frame), angle: view.angle, about: view.about };
}

/** The size of the window's box on a frame of this size, in pixels of a frame 1080 high, as the eye's spots are. */
function sizeAsTheEyeMeasures(view: View, frame: Size): Size {
	const frameScale = frameScaleOf(frame);
	return { width: view.box.width / frameScale, height: view.box.height / frameScale };
}

/** Where an eye stands and looks carried by a matrix, and the way its top points turned by the matrix's turn alone. */
function viewpointCarried(matrix: Matrix, turn: Matrix, eye: Viewpoint): Viewpoint {
	return { at: carried(matrix, eye.at), aim: carried(matrix, eye.aim), up: carried(turn, eye.up) };
}

/**
 * How a pose goes on a way through keys in a view (`src/domain/path.ts`): by its focus and its zoom's logarithm, so
 * through keys too its zoom goes by steps of scale; a step from one pose to another as long as what the frame shows
 * moves on it.
 */
function poseSpaceIn(view: View, eye: Eye, format: Format): PathSpace<Pose> {
	return {
		toward: poseToward,
		numbersOf: (pose) => [pose.focusX, pose.focusY, Math.log(pose.zoom)],
		valueOf: poseOfNumbers,
		distance: (start, end) => frameShift({ pose: start, view, eye }, { pose: end, view, eye }, format)
	};
}

/** The pose three numbers stand for on a way: its focus across and down, and its zoom's logarithm. */
function poseOfNumbers(numbers: readonly number[]): Pose {
	const [focusX, focusY, zoomsLogarithm] = numbers;
	if (focusX === undefined || focusY === undefined || zoomsLogarithm === undefined) {
		throw new Error(`a pose on a way stands for three numbers, not ${numbers.length}`);
	}
	return { focusX, focusY, zoom: Math.exp(zoomsLogarithm) };
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

/**
 * The camera an act is done in: face-on at the screen's own size, on a frame the screen's size, the eye of a focal
 * length at rest.
 */
export function flatCamera(format: Format, focalLength: number): Camera {
	return { pose: flatPose(format), view: wholeView(format.screen), eye: eyeAtRest(focalLength) };
}

/**
 * The camera as the stage draws it, its cut worked out from where the part of the screen's plane the page shows on, in
 * the screen's pixels, stands in its view: the screen, or a page of the film's own drawn on past it.
 */
export function drawnCamera(camera: Camera, format: Format, pageShownOn: Box): DrawnCamera {
	const view = camera.view.box;
	const page = boxInTheView(camera, format.frame, pageShownOn);
	// How much of the way from the page's edges to the view's the cut still stands out
	const open = LIFTED - camera.view.lift;
	const { frame } = format;
	return {
		pose: camera.pose,
		cut: {
			top: cutPast(page.top, view.top > FRAMES_EDGE, open),
			right: cutPast(view.width - (page.left + page.width), view.left + view.width < frame.width, open),
			bottom: cutPast(view.height - (page.top + page.height), view.top + view.height < frame.height, open),
			left: cutPast(page.left, view.left > FRAMES_EDGE, open)
		}
	};
}

/**
 * How far the camera's picture reaches on the window's plane: the view's box, past each edge as far as its cut stands
 * out, as a window on the frame's edge shows the page past it, and within it as far as the cut closes in.
 */
export function pictureReachOf(view: Box, cut: Cut): Box {
	return {
		left: view.left + cut.left,
		top: view.top + cut.top,
		width: view.width - cut.left - cut.right,
		height: view.height - cut.top - cut.bottom
	};
}

/**
 * Where the picture is cut on one side of its view: as far past the view's edge as the page reaches, so much of the
 * way as the cut still stands out, where the view meets the frame's edge there; at the view's edge where it stands in
 * from the frame's.
 */
function cutPast(pagePast: number, standsIn: boolean, open: number): number {
	return standsIn ? NOTHING : open * Math.min(NOTHING, pagePast);
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
 * the closest of them comes, and a view drawn back from the eye or made smaller shows the page smaller still. A camera
 * in a view leant, brought near or grown, or seen by an eye that has moved, shows the page, or its nearer part, larger
 * than its zoom, so the picture holds it at livereel's bound, `ZOOM_AT_MOST`; no picture holds it closer than that.
 */
export function zoomPicturedFor(own: Camera, along: readonly Camera[], pieces: readonly number[]): number {
	const cameras = [own, ...along];
	if (!cameras.every((camera) => showsThePageNoLargerThanItsZoom(camera.view) && isAtRest(camera.eye))) {
		return ZOOM_AT_MOST;
	}
	return Math.min(ZOOM_AT_MOST, Math.max(...cameras.map((camera) => camera.pose.zoom), ...pieces));
}

/**
 * Whether a view, seen from the eye at rest, shows the page no larger than its camera's zoom has it: on the frame's
 * plane or farther from the eye, no larger than its box, and in a plane facing the frame, neither tilted, turned nor
 * turned over, or by whole or half turns alone, which show its front or its back, rolled any way.
 */
function showsThePageNoLargerThanItsZoom(view: View): boolean {
	return view.depth <= AS_PLACED.depth && view.scale <= AS_PLACED.scale && facesTheFrame(angledAs(view.angle));
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

/**
 * A pose `progress` of the way to another: its zoom by even steps of scale, evenly in its logarithm, so a zoom from 1
 * to 4 stands at 2 half way, as a person sees a zoom go evenly; its focus as keeps still the point of the page that
 * stands at one place on the frame at both ends, so a zoom round a point stays on it all the way, where the screen's
 * edge lets it (`seenThrough`).
 */
function poseToward(start: Pose, end: Pose, progress: number): Pose {
	const focusShare = focusShareAt(start.zoom, end.zoom, progress);
	return {
		focusX: between(start.focusX, end.focusX, focusShare),
		focusY: between(start.focusY, end.focusY, focusShare),
		zoom: start.zoom * (end.zoom / start.zoom) ** progress
	};
}

/**
 * The share of the way between two foci where the zoom has gone `progress` of its way by scale, the point still on the
 * frame kept still: `(1 − start ÷ zoom) ÷ (1 − start ÷ end)`, written with `expm1` so a zoom that hardly changes comes
 * out as exact as a pan, which, of one zoom, goes evenly.
 */
function focusShareAt(startZoom: number, endZoom: number, progress: number): number {
	const zoomRatiosLogarithm = Math.log(endZoom / startZoom);
	if (zoomRatiosLogarithm === 0) return progress;
	return Math.expm1(-zoomRatiosLogarithm * progress) / Math.expm1(-zoomRatiosLogarithm);
}

/** How close a camera comes: more than none, as a camera at none shows no page, and its zoom goes by scale. */
const A_ZOOM: Kind<number> = new Plain(isZoom, "a zoom, the frame's pixels a page's pixel takes, more than 0");

/** The closest a film lets the camera come to a block it frames: a zoom, or no bound. */
export const A_ZOOM_AT_MOST: Kind<number> = new Plain(
	isZoomOrEndless,
	"a zoom, the frame's pixels a page's pixel takes, more than 0, or Infinity for no bound"
);

/** A pose as a film hands it, made by livereel or written out whole. */
export const A_POSE: Kind<Pose> = new OfForm<Pose>(
	{ focusX: needed(A_NUMBER), focusY: needed(A_NUMBER), zoom: needed(A_ZOOM) },
	'a pose: { focusX, focusY, zoom }, as steps is handed'
);

/**
 * The pose that holds a box with its air on every side in a view of this size, its middle at the view's middle, no
 * closer than allowed: worked out face-on.
 */
export function onto(box: Box, view: Size, frame: Size, framing: Framing): Pose {
	const aired = withAir(box, framing.air);
	const fit = Math.min(view.width / aired.width, view.height / aired.height);
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

/**
 * How far the window's edge moves on the frame from one camera's view to another's: the farthest any corner of it
 * goes, as each view stands before the eye that sees it, so a window carried or grown while the camera holds the page
 * still is measured as it moves.
 */
export function viewShift(seen: SeenBetween): number {
	return Math.max(
		...CORNER_SHARES.map((corner) =>
			distanceBetween(cornerOnTheFrame(seen.start, seen.frame, corner), cornerOnTheFrame(seen.end, seen.frame, corner))
		)
	);
}

/** Where a corner of a camera's view, in shares of the view's box, stands on the frame as the view stands. */
function cornerOnTheFrame(camera: Camera, frame: Size, corner: Point): Point {
	const window = windowInTheWorld(camera.view, camera.eye, frame);
	return pointOnTheFrame(window, pointAt(boxOf(camera.view.box), corner));
}

/**
 * How far a point of the screen moves on the frame from where it stood, as one camera showed it, to where it stands,
 * as another shows it.
 */
export function screenPointShift(seen: SeenBetween, start: Point, end: Point): number {
	return distanceBetween(onTheFrame(seen.start, seen.frame, start), onTheFrame(seen.end, seen.frame, end));
}

/**
 * How far a box of the screen moves on the frame from where it stood, as one camera showed it, to where it stands, as
 * another shows it: the farthest any of its corners goes.
 */
export function screenBoxShift(seen: SeenBetween, start: Box, end: Box): number {
	return Math.max(
		...CORNER_SHARES.map((corner) => screenPointShift(seen, pointAt(start, corner), pointAt(end, corner)))
	);
}

/**
 * Where a point of the screen stands on the frame from a camera: where the camera frames it in its view, carried as the
 * window stands and seen from the eye.
 */
export function onTheFrame(camera: Camera, frame: Size, point: Point): Point {
	return pointOnTheFrame(windowInTheWorld(camera.view, camera.eye, frame), pointInTheView(camera, frame, point));
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

function facing(screen: Size, zoom: number): Pose {
	return { focusX: screen.width / HALVES, focusY: screen.height / HALVES, zoom };
}

/** A focus moved so that as much as is seen either side of it stays on the screen; the screen's middle where it cannot. */
function keptWithin(focus: number, halfSeen: number, length: number): number {
	if (HALVES * halfSeen > length) return length / HALVES;
	return Math.min(Math.max(focus, halfSeen), length - halfSeen);
}

/**
 * The part of the screen a camera's view shows as the camera frames the page, before the view's stance carries it: in
 * the screen's pixels, as large as the view at the camera's zoom, its middle at the camera's focus, wherever the
 * screen's edges are.
 */
export function viewOnTheScreen(camera: Camera, frame: Size): Box {
	const frameZoom = frameZoomOf(camera.pose, frame);
	const width = camera.view.box.width / frameZoom;
	const height = camera.view.box.height / frameZoom;
	return { left: camera.pose.focusX - width / HALVES, top: camera.pose.focusY - height / HALVES, width, height };
}

/**
 * Where a box of the frame stands on the screen as a camera shows it through a view that faces the frame: between the
 * points of the screen its top left and bottom right corners show.
 */
export function boxOnTheScreen(camera: Camera, frame: Size, box: Box): Box {
	return boxBetween(
		seenOnTheScreen(camera, frame, { left: box.left, top: box.top }),
		seenOnTheScreen(camera, frame, { left: box.left + box.width, top: box.top + box.height })
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

/**
 * The part of the screen a camera's picture holds on the window's plane, in the screen's pixels, wherever the eye
 * stands: what its view shows of the screen, and past the view's edges as far as its cut stands out there; none where
 * it holds nothing of the screen.
 */
export function screenPicturedBy(camera: Camera, format: Format): Box | null {
	const screen = boxOf(format.screen);
	const { cut } = drawnCamera(camera, format, screen);
	const frameZoom = frameZoomOf(camera.pose, format.frame);
	const view = viewOnTheScreen(camera, format.frame);
	const reach = {
		left: view.left + cut.left / frameZoom,
		top: view.top + cut.top / frameZoom,
		width: view.width - (cut.left + cut.right) / frameZoom,
		height: view.height - (cut.top + cut.bottom) / frameZoom
	};
	return overlapOf(reach, screen);
}

/** The point of the screen a camera facing the frame sees at a point of the frame, which it sees the screen's plane at. */
function seenOnTheScreen(camera: Camera, frame: Size, point: Point): Point {
	const seen = underTheFrame(camera, frame, point);
	if (seen === null) throw new Error('a camera facing the frame sees the plane of its screen at every point');
	return seen;
}

/**
 * The point of the screen's plane a point of the frame shows from a camera: where the eye's line through it meets the
 * plane, which passes through the view's middle where its stance moves it, brought out by its depth and round the
 * point it turns about, facing as the view leans, carried back to the screen. None where the line meets the plane
 * behind the eye, or never: the point sees past it.
 */
export function underTheFrame(camera: Camera, frame: Size, point: Point): Point | null {
	const pose = camera.pose;
	const facingNow = carried(angledAs(camera.view.angle), FACING_OUT);
	const middle = middleInTheRoom(camera.view.box, frame);
	const moved = middleMovedBy(camera.view, camera.view.box);
	const planesMiddle = { across: middle.across + moved.across, down: middle.down + moved.down, out: moved.out };
	const sight = sightOf(camera.eye, frame, {
		left: point.left - frame.width / HALVES,
		top: point.top - frame.height / HALVES
	});
	// How far along the sight from the eye the plane is met: at the point itself, where the screen is face-on to the
	// eye at rest on the frame's plane
	const reach = dotOf(facingNow, wayBetween(sight.from, planesMiddle)) / dotOf(facingNow, sight.along);
	if (!(reach > 0 && Number.isFinite(reach))) return null;
	const met = carried(
		stanceMatrixBack(camera.view, camera.view.box),
		wayBetween(middle, movedAlong(sight.from, sight.along, reach))
	);
	const frameZoom = frameZoomOf(pose, frame);
	return { left: pose.focusX + met.across / frameZoom, top: pose.focusY + met.down / frameZoom };
}

/**
 * What a frame sees of the screen's plane from a camera, in the screen's pixels: the least box round the points of it
 * the frame's corners show, as a frame whose every corner sees the plane before the eye sees a four-sided part of it
 * with those points at its corners; none where a corner's sight misses the plane, as the frame then sees it on to its
 * horizon.
 */
export function screenPlaneSeen(camera: Camera, frame: Size): Box | null {
	const seen = cornersOf(boxOf(frame)).map((corner) => underTheFrame(camera, frame, corner));
	const met = seen.filter((point) => point !== null);
	if (met.length < seen.length) return null;
	const lefts = met.map((point) => point.left);
	const tops = met.map((point) => point.top);
	return boxBetween(
		{ left: Math.min(...lefts), top: Math.min(...tops) },
		{ left: Math.max(...lefts), top: Math.max(...tops) }
	);
}

/** The zoom of a pose in which a page's pixel takes so many of the frame's own pixels, on a frame of this size. */
function poseZoomFor(frameZoom: number, frame: Size): number {
	return frameZoom / frameScaleOf(frame);
}

function isZoom(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NO_ZOOM;
}

function isZoomOrEndless(written: unknown): written is number {
	return isZoom(written) || written === Number.POSITIVE_INFINITY;
}
