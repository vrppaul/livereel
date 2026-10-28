import { expect, test } from 'vitest';
import {
	type Pose,
	covering,
	frameShift,
	onTheFrame,
	onto,
	underTheFrame,
	wholePose
} from '../../src/domain/camera.ts';
import { type Box, type Format, type Point, distanceBetween } from '../../src/domain/geometry.ts';

// The whole frame, where no half of it is named
const WHOLE = null;

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

function widthBetween(pose: Pose, left: Point, right: Point): number {
	return onTheFrame(pose, SQUARE.frame, right).left - onTheFrame(pose, SQUARE.frame, left).left;
}

function heightBetween(pose: Pose, top: Point, bottom: Point): number {
	return onTheFrame(pose, SQUARE.frame, bottom).top - onTheFrame(pose, SQUARE.frame, top).top;
}

test('a camera that stands still moves nothing on the frame, at any angle', () => {
	expect([
		frameShift(FACE_ON, FACE_ON, SQUARE),
		frameShift(LEANING_BACK, LEANING_BACK, SQUARE),
		frameShift(EDGE_ON, EDGE_ON, SQUARE)
	]).toEqual([0, 0, 0]);
});

test('a camera panned face-on moves what the frame shows by its way, as close as it stands', () => {
	const close = { ...FACE_ON, zoom: 2 };
	expect(frameShift(close, { ...close, focusX: 766 }, SQUARE)).toBe(20);
});

test('a camera panned at an angle moves what the frame shows further than face-on, where the screen leans nearer', () => {
	const faceOnAsFar = { ...LEANING_BACK, tilt: 0, turn: 0 };
	const angled = frameShift(LEANING_BACK, { ...LEANING_BACK, focusX: LEANING_BACK.focusX + PANNED_BY }, SQUARE);
	const faceOn = frameShift(faceOnAsFar, { ...faceOnAsFar, focusX: faceOnAsFar.focusX + PANNED_BY }, SQUARE);
	expect(angled).toBeGreaterThan(faceOn);
});

test('the point of the screen a corner of the frame shows at an angle is drawn at that corner', () => {
	const shown = underTheFrame(LEANING_BACK, SQUARE.frame, FRAME_CORNER);
	const drawn = onTheFrame(LEANING_BACK, SQUARE.frame, shown!);
	expect(distanceBetween(drawn, FRAME_CORNER)).toBeCloseTo(0, DECIMALS);
});

test("a camera drawn closer moves the frame's corners most, by how far they stand from its middle", () => {
	expect(frameShift(FACE_ON, { ...FACE_ON, zoom: 1.1 }, SQUARE)).toBeCloseTo(CORNER_FROM_MIDDLE * 0.1, 9);
});

test('a camera drawn closer over a screen smaller than the frame moves the screen, not the ground round it', () => {
	const far = { ...FACE_ON, zoom: 0.5 };
	expect(frameShift(far, { ...far, zoom: 0.55 }, SQUARE)).toBeCloseTo(SCREEN_CORNER_DRAWN_CLOSER, 9);
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
	const onTheHalf = onTheFrame(LEANING_BACK, HALF_SQUARE.frame, BOTTOM_RIGHT);
	const onTheWhole = onTheFrame(LEANING_BACK, SQUARE.frame, BOTTOM_RIGHT);
	const halfCorner: Point = { left: HALF_SQUARE.frame.width, top: HALF_SQUARE.frame.height };
	const nearTheEdge: Pose = { ...FACE_ON, focusX: 50, zoom: 2 };
	expect([
		wholePose(HALF_SQUARE),
		distanceBetween({ left: onTheHalf.left / HALF, top: onTheHalf.top / HALF }, onTheWhole),
		distanceBetween(
			underTheFrame(LEANING_BACK, HALF_SQUARE.frame, halfCorner)!,
			underTheFrame(LEANING_BACK, SQUARE.frame, FRAME_CORNER)!
		),
		covering(nearTheEdge, HALF_SQUARE, WHOLE)
	]).toEqual([
		wholePose(SQUARE),
		expect.closeTo(0, DECIMALS),
		expect.closeTo(0, DECIMALS),
		covering(nearTheEdge, SQUARE, WHOLE)
	]);
});

test('a block is framed whole with its air round it', () => {
	const block: Box = { left: 100, top: 200, width: 440, height: 100 };
	expect(onto(block, FACE_ON, SQUARE.frame, { air: 50, zoomAtMost: 5 }, WHOLE)).toEqual({
		...FACE_ON,
		focusX: 320,
		focusY: 250,
		zoom: 2
	});
});

test("a block framed in a half of the frame stands at the half's middle, as close as its air lets in the half", () => {
	const block: Box = { left: 100, top: 200, width: 440, height: 100 };
	const middle = { left: 320, top: 250 };
	const framings = (['left', 'right', 'top', 'bottom'] as const).map((half) =>
		onto(block, FACE_ON, SQUARE.frame, { air: 50, zoomAtMost: 5 }, half)
	);
	expect(framings.map((framed) => [onTheFrame(framed, SQUARE.frame, middle), framed.zoom])).toEqual([
		[{ left: 270, top: 540 }, 1],
		[{ left: 810, top: 540 }, 1],
		[{ left: 540, top: 270 }, 2],
		[{ left: 540, top: 810 }, 2]
	]);
});

test('the camera comes no closer than allowed', () => {
	const block: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect(onto(block, FACE_ON, SQUARE.frame, { air: 0, zoomAtMost: 3 }, WHOLE).zoom).toBe(3);
});

test('a block is framed alike on a frame half as large: as close as its air lets, and no closer than allowed', () => {
	const fitted: Box = { left: 100, top: 200, width: 440, height: 100 };
	const small: Box = { left: 0, top: 0, width: 10, height: 10 };
	expect([
		onto(fitted, FACE_ON, HALF_SQUARE.frame, { air: 50, zoomAtMost: 5 }, WHOLE),
		onto(small, FACE_ON, HALF_SQUARE.frame, { air: 0, zoomAtMost: 3 }, WHOLE)
	]).toEqual([
		onto(fitted, FACE_ON, SQUARE.frame, { air: 50, zoomAtMost: 5 }, WHOLE),
		onto(small, FACE_ON, SQUARE.frame, { air: 0, zoomAtMost: 3 }, WHOLE)
	]);
});

test('a framing keeps the angle it was taken at', () => {
	const angled = { ...FACE_ON, tilt: 20, turn: -10 };
	const block = { left: 0, top: 0, width: 500, height: 500 };
	const framed = onto(block, angled, SQUARE.frame, { air: 0, zoomAtMost: 5 }, WHOLE);
	expect([framed.tilt, framed.turn]).toEqual([20, -10]);
});

test('a face-on camera near a corner moves until no edge of the screen shows', () => {
	const covered = covering({ ...FACE_ON, focusX: 50, focusY: 1030, zoom: 2 }, SQUARE, WHOLE);
	expect([covered.focusX, covered.focusY]).toEqual([270, 810]);
});

test('a face-on camera framing into a half moves until no edge of the screen shows in that half', () => {
	const covered = covering({ ...FACE_ON, focusX: -100, focusY: 540, zoom: 1 }, SQUARE, 'right');
	expect(onTheFrame(covered, SQUARE.frame, { left: 0, top: 540 })).toEqual({ left: 540, top: 540 });
});

test('a screen too short to fill the frame along a side stands in its middle along that side', () => {
	const covered = covering({ ...FACE_ON, focusX: 200, focusY: 100, zoom: 0.8 }, SQUARE, WHOLE);
	expect([covered.focusX, covered.focusY]).toEqual([675, 540]);
});
