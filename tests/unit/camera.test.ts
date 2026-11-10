import { expect, test } from 'vitest';
import {
	type Camera,
	type Cut,
	type Pose,
	covering,
	drawnCamera,
	frameShift,
	inTheEyesSpaceAbout,
	keptOnTheScreen,
	leaningOnTheFrame,
	onTheFrame,
	onto,
	seenFromTheEye,
	underTheFrame,
	wholePose,
	wholeView,
	windowView,
	zoomPicturedFor
} from '../../src/domain/camera.ts';
import { type Eye, eyeAtRest } from '../../src/domain/eye.ts';
import { type Box, type Format, type Point, type Size, distanceBetween } from '../../src/domain/geometry.ts';
import type { Sharpness } from '../../src/domain/focus.ts';
import { type Spot, carried } from '../../src/domain/matrix.ts';
import { type Angle, angledAs } from '../../src/domain/stance.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { UNSHADED, drawnWindow } from '../../src/props/window.ts';
import { FOCAL_LENGTH } from './fakes.ts';

// A square frame as large as the stage's look was made on, where a zoom counts the frame's own pixels
const SQUARE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1512, height: 1080 } };
// The same screen in a square frame half as large each way
const HALF = 0.5;
const HALF_SQUARE: Format = { frame: { width: 540, height: 540 }, screen: SQUARE.screen };
const FACE_ON: Pose = { focusX: 756, focusY: 540, zoom: 1 };
const DRAWN_BACK: Pose = { focusX: 648, focusY: 432, zoom: 0.7 };
// How a view leans: not at all, back and swung a little, and edge-on, where no corner of the frame shows the screen
const STRAIGHT: Angle = { tilt: 0, turn: 0, roll: 0, over: 0 };
const LEANT_BACK: Angle = { ...STRAIGHT, tilt: 14, turn: -9 };
const EDGE_ON: Angle = { ...STRAIGHT, turn: 90 };
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
// A box on the square frame, off its middle, and how far its middle stands from the frame's; spots of it from its
// middle: two corners on its plane and one out toward the eye
const BOX_OFF_THE_MIDDLE: Box = { left: 200, top: 600, width: 300, height: 200 };
const BOX_MIDDLE_FROM_THE_FRAMES: Point = { left: -190, top: 160 };
const SPOTS_OF_THE_BOX: readonly Spot[] = [
	{ across: -150, down: -100, out: 0 },
	{ across: 150, down: 100, out: 0 },
	{ across: 40, down: -30, out: 250 }
];
// The eye at rest; moved aside and near; and below the frame's middle, looking up at its top
const EYES: readonly Eye[] = [
	eyeAtRest(FOCAL_LENGTH),
	{ ...eyeAtRest(FOCAL_LENGTH), at: { across: 300, down: -150, out: 900 } },
	{ ...eyeAtRest(FOCAL_LENGTH), at: { across: 0, down: 400, out: 1200 }, aim: { across: 0, down: -540, out: 0 } }
];
// The window off the frame's middle leant back and swung, seen by the eye moved aside and near; how far its middle
// stands from the frame's; spots of it from its middle, in three's axes, up the frame; and every point seen sharp
const LEANT_WINDOW = { ...windowView(WINDOW), angle: LEANT_BACK };
const MOVED_EYE: Eye = { ...eyeAtRest(FOCAL_LENGTH), at: { across: 300, down: -150, out: 900 } };
const WINDOW_MIDDLE_FROM_THE_FRAMES: Point = { left: 160, top: 160 };
const SPOTS_OF_THE_WINDOW_UP_THE_FRAME: readonly Spot[] = [
	{ across: -300, down: 200, out: 0 },
	{ across: 300, down: -200, out: 0 },
	{ across: 300, down: 200, out: 0 }
];
const ALL_SHARP: Sharpness = { focusedAt: FOCAL_LENGTH, focalLength: FOCAL_LENGTH, aperture: 0 };
// Spots of what leans from its middle: the middle of its top edge and of its right side
const ITS_TOP: Spot = { across: 0, down: -100, out: 0 };
const ITS_RIGHT: Spot = { across: 100, down: 0, out: 0 };

/** A spot rounded to so many decimals each way, so arithmetic's last digits and a zero's sign do not count. */
function roundedSpot(spot: Spot): Spot {
	return {
		across: Number(spot.across.toFixed(DECIMALS)) + 0,
		down: Number(spot.down.toFixed(DECIMALS)) + 0,
		out: Number(spot.out.toFixed(DECIMALS)) + 0
	};
}

/** A camera at a pose, its picture the whole of a frame, leant as it is said, seen from the eye at rest. */
function inTheWhole(pose: Pose, angle: Angle = STRAIGHT, frame: Size = SQUARE.frame): Camera {
	return { pose, view: { ...wholeView(frame), angle }, eye: eyeAtRest(FOCAL_LENGTH) };
}

function inTheWindow(pose: Pose, angle: Angle = STRAIGHT): Camera {
	return { pose, view: { ...windowView(WINDOW), angle }, eye: eyeAtRest(FOCAL_LENGTH) };
}

/** Where a face-on camera's picture is cut, its view the whole square frame lifted so far. */
function cutAt(lift: number): Cut {
	const view = { box: { left: 0, top: 0, width: 1080, height: 1080 }, lift, angle: STRAIGHT };
	return drawnCamera({ pose: FACE_ON, view, eye: eyeAtRest(FOCAL_LENGTH) }, SQUARE).cut;
}

function widthBetween(angle: Angle, left: Point, right: Point): number {
	const camera = inTheWhole(FACE_ON, angle);
	return onTheFrame(camera, SQUARE.frame, right).left - onTheFrame(camera, SQUARE.frame, left).left;
}

/**
 * Where a spot of the off-middle box lands on the square frame, from the box's middle: carried into the eye's own
 * space, then seen in perspective from the eye standing at that space's middle, as far from its picture plane as its
 * focal length.
 */
function seenInPerspective(eye: Eye, spot: Spot): Point {
	const inTheEyesSpace = carried(inTheEyesSpaceAbout(BOX_OFF_THE_MIDDLE, eye, SQUARE.frame), spot);
	const toThePicturePlane = FOCAL_LENGTH / -inTheEyesSpace.out;
	return {
		left: inTheEyesSpace.across * toThePicturePlane - BOX_MIDDLE_FROM_THE_FRAMES.left,
		top: inTheEyesSpace.down * toThePicturePlane - BOX_MIDDLE_FROM_THE_FRAMES.top
	};
}

/**
 * Where a spot of the leant window, in three's axes, lands on the square frame from the window's middle: carried into
 * the eye's own space as the window is handed the room, then seen in perspective from the eye there, its up turned
 * back to the frame's down.
 */
function windowSeenInPerspective(spot: Spot): Point {
	const cut = drawnCamera({ pose: FACE_ON, view: LEANT_WINDOW, eye: MOVED_EYE }, SQUARE).cut;
	const around = { eye: MOVED_EYE, frame: SQUARE.frame, sharpness: ALL_SHARP, look: LIVEREELS_LOOK, screenShown: 1 };
	const window = drawnWindow(LEANT_WINDOW, cut, UNSHADED, around);
	const inTheEyesSpace = carried(window.inTheEyesSpace, spot);
	const toThePicturePlane = FOCAL_LENGTH / -inTheEyesSpace.out;
	return {
		left: inTheEyesSpace.across * toThePicturePlane - WINDOW_MIDDLE_FROM_THE_FRAMES.left,
		top: -inTheEyesSpace.down * toThePicturePlane - WINDOW_MIDDLE_FROM_THE_FRAMES.top
	};
}

/** Where the leant window is drawn on the square frame at a spot of it in three's axes, from its middle. */
function windowDrawnAt(spot: Spot): Point {
	const placed = carried(leaningOnTheFrame(LEANT_WINDOW, MOVED_EYE, SQUARE.frame), { ...spot, down: -spot.down });
	return { left: placed.across, top: placed.down };
}

/** Where the eye sees a spot of the off-middle box on the square frame, from the box's middle. */
function seenOnTheFrame(eye: Eye, spot: Spot): Point {
	const placed = carried(seenFromTheEye(BOX_OFF_THE_MIDDLE, eye, SQUARE.frame), spot);
	return { left: placed.across, top: placed.down };
}

function heightBetween(angle: Angle, top: Point, bottom: Point): number {
	const camera = inTheWhole(FACE_ON, angle);
	return onTheFrame(camera, SQUARE.frame, bottom).top - onTheFrame(camera, SQUARE.frame, top).top;
}

test('a camera that stands still moves nothing on the frame, at any angle', () => {
	expect([
		frameShift(inTheWhole(FACE_ON), inTheWhole(FACE_ON), SQUARE),
		frameShift(inTheWhole(DRAWN_BACK, LEANT_BACK), inTheWhole(DRAWN_BACK, LEANT_BACK), SQUARE),
		frameShift(inTheWhole(FACE_ON, EDGE_ON), inTheWhole(FACE_ON, EDGE_ON), SQUARE)
	]).toEqual([0, 0, 0]);
});

test('a camera panned face-on moves what the frame shows by its way, as close as it stands', () => {
	const close = { ...FACE_ON, zoom: 2 };
	expect(frameShift(inTheWhole(close), inTheWhole({ ...close, focusX: 766 }), SQUARE)).toBe(20);
});

test('a camera panned at an angle moves what the frame shows further than face-on, where the screen leans nearer', () => {
	const panned = { ...DRAWN_BACK, focusX: DRAWN_BACK.focusX + PANNED_BY };
	const angled = frameShift(inTheWhole(DRAWN_BACK, LEANT_BACK), inTheWhole(panned, LEANT_BACK), SQUARE);
	const faceOn = frameShift(inTheWhole(DRAWN_BACK), inTheWhole(panned), SQUARE);
	expect(angled).toBeGreaterThan(faceOn);
});

test('the point of the screen a corner of the view shows at an angle is drawn at that corner: the whole frame, a window off its middle', () => {
	const whole = inTheWhole(DRAWN_BACK, LEANT_BACK);
	const window = inTheWindow(DRAWN_BACK, LEANT_BACK);
	const shown = underTheFrame(whole, SQUARE.frame, FRAME_CORNER);
	const shownInTheWindow = underTheFrame(window, SQUARE.frame, WINDOW_CORNER);
	expect([
		distanceBetween(onTheFrame(whole, SQUARE.frame, shown!), FRAME_CORNER),
		distanceBetween(onTheFrame(window, SQUARE.frame, shownInTheWindow!), WINDOW_CORNER)
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
		view: windowView({ left: 0, top: 0, width: 1080, height: 1080 }),
		eye: eyeAtRest(FOCAL_LENGTH)
	};
	const movedAside: Camera = {
		pose: FACE_ON,
		view: windowView({ left: 30, top: 40, width: 1080, height: 1080 }),
		eye: eyeAtRest(FOCAL_LENGTH)
	};
	expect([frameShift(whole, drawnBack, SQUARE), frameShift(whole, movedAside, SQUARE)]).toEqual([0, 50]);
});

test('a screen leant back shows its top edge narrower than its bottom', () => {
	const leant = { ...STRAIGHT, tilt: 20 };
	expect(widthBetween(leant, TOP_LEFT, TOP_RIGHT)).toBeLessThan(widthBetween(leant, BOTTOM_LEFT, BOTTOM_RIGHT));
});

test('a screen swung by a turn shows its right edge shorter than its left', () => {
	const swung = { ...STRAIGHT, turn: 20 };
	expect(heightBetween(swung, TOP_RIGHT, BOTTOM_RIGHT)).toBeLessThan(heightBetween(swung, TOP_LEFT, BOTTOM_LEFT));
});

test('a pose shows the same on a frame half as large: the whole screen, a point of it at an angle, its corner, a face-on edge kept', () => {
	const onTheHalf = onTheFrame(inTheWhole(DRAWN_BACK, LEANT_BACK, HALF_SQUARE.frame), HALF_SQUARE.frame, BOTTOM_RIGHT);
	const onTheWhole = onTheFrame(inTheWhole(DRAWN_BACK, LEANT_BACK), SQUARE.frame, BOTTOM_RIGHT);
	const halfCorner: Point = { left: HALF_SQUARE.frame.width, top: HALF_SQUARE.frame.height };
	const nearTheEdge: Pose = { ...FACE_ON, focusX: 50, zoom: 2 };
	expect([
		wholePose(HALF_SQUARE),
		distanceBetween({ left: onTheHalf.left / HALF, top: onTheHalf.top / HALF }, onTheWhole),
		distanceBetween(
			underTheFrame(inTheWhole(DRAWN_BACK, LEANT_BACK, HALF_SQUARE.frame), HALF_SQUARE.frame, halfCorner)!,
			underTheFrame(inTheWhole(DRAWN_BACK, LEANT_BACK), SQUARE.frame, FRAME_CORNER)!
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
	expect(onto(block, SQUARE.frame, SQUARE.frame, { air: 50, zoomAtMost: 5 })).toEqual({
		focusX: 320,
		focusY: 250,
		zoom: 2
	});
});

test("a block framed in a window stands at the window's middle, as close as its air lets in the window", () => {
	const block: Box = { left: 100, top: 200, width: 400, height: 100 };
	const framed = onto(block, WINDOW, SQUARE.frame, { air: 50, zoomAtMost: 5 });
	expect([onTheFrame(inTheWindow(framed), SQUARE.frame, { left: 300, top: 250 }), framed.zoom]).toEqual([
		{ left: 700, top: 700 },
		1.2
	]);
});

test('the camera comes no closer than allowed', () => {
	const block: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect(onto(block, SQUARE.frame, SQUARE.frame, { air: 0, zoomAtMost: 3 }).zoom).toBe(3);
});

test('a block is framed alike on a frame half as large: as close as its air lets, and no closer than allowed', () => {
	const fitted: Box = { left: 100, top: 200, width: 440, height: 100 };
	const small: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect([
		onto(fitted, HALF_SQUARE.frame, HALF_SQUARE.frame, { air: 50, zoomAtMost: 5 }),
		onto(small, HALF_SQUARE.frame, HALF_SQUARE.frame, { air: 0, zoomAtMost: 3 })
	]).toEqual([
		onto(fitted, SQUARE.frame, SQUARE.frame, { air: 50, zoomAtMost: 5 }),
		onto(small, SQUARE.frame, SQUARE.frame, { air: 0, zoomAtMost: 3 })
	]);
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
		view: { box: { left: 540, top: 0, width: 1080, height: 1080 }, lift: 0, angle: STRAIGHT },
		eye: eyeAtRest(FOCAL_LENGTH)
	};
	expect(drawnCamera(slidHalfAcross, SQUARE).cut).toEqual({ top: -540, right: -972, bottom: -540, left: 0 });
});

test('a screen too short to fill the frame along a side stands in its middle along that side', () => {
	const covered = covering({ ...FACE_ON, focusX: 200, focusY: 100, zoom: 0.8 }, SQUARE, SQUARE.frame);
	expect([covered.focusX, covered.focusY]).toEqual([675, 540]);
});

test("a picture of the page holds it as close as the closest face-on camera or piece of it comes, a view turned a whole turn face-on too, as close as livereel's bound where one is angled, and never closer", () => {
	const closer = inTheWhole({ ...FACE_ON, zoom: 1.5 });
	const pastTheBound = inTheWhole({ ...FACE_ON, zoom: 3 });
	const turnedWhole = inTheWhole({ ...FACE_ON, zoom: 1.5 }, { ...STRAIGHT, tilt: 360, turn: -360 });
	expect([
		zoomPicturedFor(inTheWhole(FACE_ON), [closer], []),
		zoomPicturedFor(inTheWhole(FACE_ON), [turnedWhole], []),
		zoomPicturedFor(inTheWhole(FACE_ON), [], [1.8]),
		zoomPicturedFor(inTheWhole(FACE_ON), [inTheWhole(DRAWN_BACK, LEANT_BACK)], []),
		zoomPicturedFor(pastTheBound, [], []),
		zoomPicturedFor(inTheWhole(FACE_ON), [], [3])
	]).toEqual([1.5, 1.5, 1.8, 2.2, 2.2, 2.2]);
});

test("a spot of a box carried into the eye's own space and seen in perspective from the eye there lands where the eye sees it on the frame: the eye at rest, moved aside and near, below the frame looking up; on the box's plane and out of it", () => {
	const missedBy = EYES.flatMap((eye) =>
		SPOTS_OF_THE_BOX.map((spot) => distanceBetween(seenInPerspective(eye, spot), seenOnTheFrame(eye, spot)))
	);
	expect(missedBy).toEqual(
		Array.from({ length: EYES.length * SPOTS_OF_THE_BOX.length }, () => expect.closeTo(0, DECIMALS))
	);
});

test("the window carried into the eye's own space as the room is handed it, in three's axes, and seen from the eye there, lands where the window is drawn on the frame: leant back and swung, the eye moved aside and near", () => {
	const missedBy = SPOTS_OF_THE_WINDOW_UP_THE_FRAME.map((spot) =>
		distanceBetween(windowSeenInPerspective(spot), windowDrawnAt(spot))
	);
	expect(missedBy).toEqual(SPOTS_OF_THE_WINDOW_UP_THE_FRAME.map(() => expect.closeTo(0, DECIMALS)));
});

test('what leans turns over round its own width after it is leant back, swung and rolled: rolled a quarter turn and turned over a quarter, its top goes back from the eye and its right side down the frame, where leant back a quarter and rolled its top would go right', () => {
	const rolledThenOver = angledAs({ tilt: 0, turn: 0, roll: 90, over: 90 });
	const leantThenRolled = angledAs({ tilt: 90, turn: 0, roll: 90, over: 0 });
	expect(
		[carried(rolledThenOver, ITS_TOP), carried(rolledThenOver, ITS_RIGHT), carried(leantThenRolled, ITS_TOP)].map(
			roundedSpot
		)
	).toEqual([
		{ across: 0, down: 0, out: -100 },
		{ across: 0, down: 100, out: 0 },
		{ across: 100, down: 0, out: 0 }
	]);
});
