import { expect, test } from 'vitest';
import {
	type Camera,
	type Cut,
	type Pose,
	covering,
	drawnCamera,
	frameShift,
	keptOnTheScreen,
	onTheFrame,
	onto,
	underTheFrame,
	wholePose,
	wholeView,
	windowView,
	zoomPicturedFor
} from '../../src/domain/camera.ts';
import { type Box, type Format, type Point, type Size, distanceBetween } from '../../src/domain/geometry.ts';

// A square frame as large as the stage's look was made on, where a zoom counts the frame's own pixels
const SQUARE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1512, height: 1080 } };
// The same screen in a square frame half as large each way
const HALF = 0.5;
const HALF_SQUARE: Format = { frame: { width: 540, height: 540 }, screen: SQUARE.screen };
const FACE_ON: Pose = { focusX: 756, focusY: 540, zoom: 1, tilt: 0, turn: 0 };
const LEANING_BACK: Pose = { focusX: 648, focusY: 432, zoom: 0.7, tilt: 14, turn: -9 };
// The screen seen edge-on: no corner of the frame shows a point of it
const EDGE_ON: Pose = { ...FACE_ON, turn: 90 };
// How far a corner of a square frame of 1080 stands from its middle
const CORNER_FROM_MIDDLE = Math.hypot(540, 540);
// The screen's corners at half its size in the frame, then at 0.55 of it: each moves 37.8 across and 27 down
const SCREEN_CORNER_DRAWN_CLOSER = Math.hypot(37.8, 27);
// A pan across the screen, in its pixels
const PANNED_BY = 20;
// The frame's bottom right corner, and how many decimals of a pixel a point carried there and back keeps
const FRAME_CORNER: Point = { left: 1080, top: 1080 };
const DECIMALS = 6;
const TOP_LEFT: Point = { left: 0, top: 0 };
const TOP_RIGHT: Point = { left: 1512, top: 0 };
const BOTTOM_LEFT: Point = { left: 0, top: 1080 };
const BOTTOM_RIGHT: Point = { left: 1512, top: 1080 };
// A window in the square frame's lower right, off its middle, and its bottom right corner
const WINDOW: Box = { left: 400, top: 500, width: 600, height: 400 };
const WINDOW_CORNER: Point = { left: 1000, top: 900 };

/** A camera at a pose, its picture the whole of a frame. */
function inTheWhole(pose: Pose, frame: Size = SQUARE.frame): Camera {
	return { pose, view: wholeView(frame) };
}

function inTheWindow(pose: Pose): Camera {
	return { pose, view: windowView(WINDOW) };
}

/** Where a face-on camera's picture is cut, its view the whole square frame lifted so far. */
function cutAt(lift: number): Cut {
	return drawnCamera({ pose: FACE_ON, view: { box: { left: 0, top: 0, width: 1080, height: 1080 }, lift } }, SQUARE)
		.cut;
}

function widthBetween(pose: Pose, left: Point, right: Point): number {
	return onTheFrame(inTheWhole(pose), SQUARE.frame, right).left - onTheFrame(inTheWhole(pose), SQUARE.frame, left).left;
}

function heightBetween(pose: Pose, top: Point, bottom: Point): number {
	return onTheFrame(inTheWhole(pose), SQUARE.frame, bottom).top - onTheFrame(inTheWhole(pose), SQUARE.frame, top).top;
}

test('a camera that stands still moves nothing on the frame, at any angle', () => {
	expect([
		frameShift(inTheWhole(FACE_ON), inTheWhole(FACE_ON), SQUARE),
		frameShift(inTheWhole(LEANING_BACK), inTheWhole(LEANING_BACK), SQUARE),
		frameShift(inTheWhole(EDGE_ON), inTheWhole(EDGE_ON), SQUARE)
	]).toEqual([0, 0, 0]);
});

test('a camera panned face-on moves what the frame shows by its way, as close as it stands', () => {
	const close = { ...FACE_ON, zoom: 2 };
	expect(frameShift(inTheWhole(close), inTheWhole({ ...close, focusX: 766 }), SQUARE)).toBe(20);
});

test('a camera panned at an angle moves what the frame shows further than face-on, where the screen leans nearer', () => {
	const faceOnAsFar = { ...LEANING_BACK, tilt: 0, turn: 0 };
	const angled = frameShift(
		inTheWhole(LEANING_BACK),
		inTheWhole({ ...LEANING_BACK, focusX: LEANING_BACK.focusX + PANNED_BY }),
		SQUARE
	);
	const faceOn = frameShift(
		inTheWhole(faceOnAsFar),
		inTheWhole({ ...faceOnAsFar, focusX: faceOnAsFar.focusX + PANNED_BY }),
		SQUARE
	);
	expect(angled).toBeGreaterThan(faceOn);
});

test('the point of the screen a corner of the view shows at an angle is drawn at that corner: the whole frame, a window off its middle', () => {
	const shown = underTheFrame(inTheWhole(LEANING_BACK), SQUARE.frame, FRAME_CORNER);
	const shownInTheWindow = underTheFrame(inTheWindow(LEANING_BACK), SQUARE.frame, WINDOW_CORNER);
	expect([
		distanceBetween(onTheFrame(inTheWhole(LEANING_BACK), SQUARE.frame, shown!), FRAME_CORNER),
		distanceBetween(onTheFrame(inTheWindow(LEANING_BACK), SQUARE.frame, shownInTheWindow!), WINDOW_CORNER)
	]).toEqual([expect.closeTo(0, DECIMALS), expect.closeTo(0, DECIMALS)]);
});

test("a camera drawn closer moves the frame's corners most, by how far they stand from its middle", () => {
	expect(frameShift(inTheWhole(FACE_ON), inTheWhole({ ...FACE_ON, zoom: 1.1 }), SQUARE)).toBeCloseTo(
		CORNER_FROM_MIDDLE * 0.1,
		9
	);
});

test('a camera drawn closer over a screen smaller than the frame moves the screen, not the ground round it', () => {
	const far = { ...FACE_ON, zoom: 0.5 };
	expect(frameShift(inTheWhole(far), inTheWhole({ ...far, zoom: 0.55 }), SQUARE)).toBeCloseTo(
		SCREEN_CORNER_DRAWN_CLOSER,
		9
	);
});

test('a window drawn back off the frame moves what it shows by how far its corners go', () => {
	const whole = inTheWhole(FACE_ON);
	const drawnBack: Camera = {
		pose: FACE_ON,
		view: windowView({ left: 0, top: 0, width: 1080, height: 1080 })
	};
	const movedAside: Camera = {
		pose: FACE_ON,
		view: windowView({ left: 30, top: 40, width: 1080, height: 1080 })
	};
	expect([frameShift(whole, drawnBack, SQUARE), frameShift(whole, movedAside, SQUARE)]).toEqual([0, 50]);
});

test('a screen leant back shows its top edge narrower than its bottom', () => {
	const leant = { ...FACE_ON, tilt: 20 };
	expect(widthBetween(leant, TOP_LEFT, TOP_RIGHT)).toBeLessThan(widthBetween(leant, BOTTOM_LEFT, BOTTOM_RIGHT));
});

test('a screen swung by a turn shows its right edge shorter than its left', () => {
	const swung = { ...FACE_ON, turn: 20 };
	expect(heightBetween(swung, TOP_RIGHT, BOTTOM_RIGHT)).toBeLessThan(heightBetween(swung, TOP_LEFT, BOTTOM_LEFT));
});

test('a pose shows the same on a frame half as large: the whole screen, a point of it at an angle, its corner, a face-on edge kept', () => {
	const onTheHalf = onTheFrame(inTheWhole(LEANING_BACK, HALF_SQUARE.frame), HALF_SQUARE.frame, BOTTOM_RIGHT);
	const onTheWhole = onTheFrame(inTheWhole(LEANING_BACK), SQUARE.frame, BOTTOM_RIGHT);
	const halfCorner: Point = { left: HALF_SQUARE.frame.width, top: HALF_SQUARE.frame.height };
	const nearTheEdge: Pose = { ...FACE_ON, focusX: 50, zoom: 2 };
	expect([
		wholePose(HALF_SQUARE),
		distanceBetween({ left: onTheHalf.left / HALF, top: onTheHalf.top / HALF }, onTheWhole),
		distanceBetween(
			underTheFrame(inTheWhole(LEANING_BACK, HALF_SQUARE.frame), HALF_SQUARE.frame, halfCorner)!,
			underTheFrame(inTheWhole(LEANING_BACK), SQUARE.frame, FRAME_CORNER)!
		),
		covering(nearTheEdge, HALF_SQUARE, HALF_SQUARE.frame)
	]).toEqual([
		wholePose(SQUARE),
		expect.closeTo(0, DECIMALS),
		expect.closeTo(0, DECIMALS),
		covering(nearTheEdge, SQUARE, SQUARE.frame)
	]);
});

test('a block is framed whole with its air round it', () => {
	const block: Box = { left: 100, top: 200, width: 440, height: 100 };
	expect(onto(block, FACE_ON, SQUARE.frame, SQUARE.frame, { air: 50, zoomAtMost: 5 })).toEqual({
		...FACE_ON,
		focusX: 320,
		focusY: 250,
		zoom: 2
	});
});

test("a block framed in a window stands at the window's middle, as close as its air lets in the window", () => {
	const block: Box = { left: 100, top: 200, width: 400, height: 100 };
	const framed = onto(block, FACE_ON, WINDOW, SQUARE.frame, { air: 50, zoomAtMost: 5 });
	expect([onTheFrame(inTheWindow(framed), SQUARE.frame, { left: 300, top: 250 }), framed.zoom]).toEqual([
		{ left: 700, top: 700 },
		1.2
	]);
});

test('the camera comes no closer than allowed', () => {
	const block: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect(onto(block, FACE_ON, SQUARE.frame, SQUARE.frame, { air: 0, zoomAtMost: 3 }).zoom).toBe(3);
});

test('a block is framed alike on a frame half as large: as close as its air lets, and no closer than allowed', () => {
	const fitted: Box = { left: 100, top: 200, width: 440, height: 100 };
	const small: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect([
		onto(fitted, FACE_ON, HALF_SQUARE.frame, HALF_SQUARE.frame, { air: 50, zoomAtMost: 5 }),
		onto(small, FACE_ON, HALF_SQUARE.frame, HALF_SQUARE.frame, { air: 0, zoomAtMost: 3 })
	]).toEqual([
		onto(fitted, FACE_ON, SQUARE.frame, SQUARE.frame, { air: 50, zoomAtMost: 5 }),
		onto(small, FACE_ON, SQUARE.frame, SQUARE.frame, { air: 0, zoomAtMost: 3 })
	]);
});

test('a framing keeps the angle it was taken at', () => {
	const angled = { ...FACE_ON, tilt: 20, turn: -10 };
	const block = { left: 0, top: 0, width: 500, height: 500 };
	const framed = onto(block, angled, SQUARE.frame, SQUARE.frame, { air: 0, zoomAtMost: 5 });
	expect([framed.tilt, framed.turn]).toEqual([20, -10]);
});

test('a face-on camera near a corner moves until no edge of the screen shows', () => {
	const covered = covering({ ...FACE_ON, focusX: 50, focusY: 1030, zoom: 2 }, SQUARE, SQUARE.frame);
	expect([covered.focusX, covered.focusY]).toEqual([270, 810]);
});

test('a face-on camera in a window moves until no edge of the screen shows in the window', () => {
	const covered = covering({ ...FACE_ON, focusX: -100, focusY: 540, zoom: 1 }, SQUARE, WINDOW);
	expect(onTheFrame(inTheWindow(covered), SQUARE.frame, { left: 0, top: 540 })).toEqual({ left: 400, top: 700 });
});

test('a camera in a window comes as close as it takes for the screen to fill it, so the window shows part of the page; the whole frame stands as far back as the film puts it', () => {
	const drawnBack = { ...FACE_ON, zoom: 0.2 };
	expect([
		keptOnTheScreen(drawnBack, SQUARE, windowView(WINDOW)).zoom,
		keptOnTheScreen(FACE_ON, SQUARE, windowView(WINDOW)).zoom,
		keptOnTheScreen(drawnBack, SQUARE, wholeView(SQUARE.frame)).zoom
	]).toEqual([WINDOW.width / SQUARE.screen.width, FACE_ON.zoom, drawnBack.zoom]);
});

test("the picture is cut at the screen's edges flat on the frame, at the view's in a window, and between as it lifts", () => {
	const screenPastTheView = -216;
	expect([cutAt(0), cutAt(0.5), cutAt(1)]).toEqual([
		{ top: expect.closeTo(0), right: screenPastTheView, bottom: expect.closeTo(0), left: screenPastTheView },
		{ top: expect.closeTo(0), right: screenPastTheView / 2, bottom: expect.closeTo(0), left: screenPastTheView / 2 },
		{ top: expect.closeTo(0), right: expect.closeTo(0), bottom: expect.closeTo(0), left: expect.closeTo(0) }
	]);
});

test("a flat view slid off the frame's edge is cut at its own edge where it stands in from the frame's, and past it only where it meets or passes the frame's edge", () => {
	const slidHalfAcross: Camera = {
		pose: { ...FACE_ON, zoom: 2 },
		view: { box: { left: 540, top: 0, width: 1080, height: 1080 }, lift: 0 }
	};
	expect(drawnCamera(slidHalfAcross, SQUARE).cut).toEqual({ top: -540, right: -972, bottom: -540, left: 0 });
});

test('a screen too short to fill the frame along a side stands in its middle along that side', () => {
	const covered = covering({ ...FACE_ON, focusX: 200, focusY: 100, zoom: 0.8 }, SQUARE, SQUARE.frame);
	expect([covered.focusX, covered.focusY]).toEqual([675, 540]);
});

test("a picture of the page holds it as close as the closest face-on camera comes, as close as livereel's bound where one is angled, and never closer", () => {
	const closer = inTheWhole({ ...FACE_ON, zoom: 1.5 });
	const pastTheBound = inTheWhole({ ...FACE_ON, zoom: 3 });
	expect([
		zoomPicturedFor([inTheWhole(FACE_ON), closer]),
		zoomPicturedFor([inTheWhole(FACE_ON), inTheWhole(LEANING_BACK)]),
		zoomPicturedFor([pastTheBound])
	]).toEqual([1.5, 2.2, 2.2]);
});
