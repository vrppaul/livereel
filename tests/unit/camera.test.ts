import { expect, test } from 'vitest';
import { type Pose, covering, frameShift, onTheFrame, onto, underTheFrame } from '../../src/domain/camera.ts';
import { type Format, type Point, distanceBetween } from '../../src/domain/geometry.ts';

const SQUARE: Format = { frame: { width: 1000, height: 1000 }, screen: { width: 1400, height: 1000 } };
const FACE_ON: Pose = { focusX: 700, focusY: 500, zoom: 1, tilt: 0, turn: 0 };
const LEANING_BACK: Pose = { focusX: 600, focusY: 400, zoom: 0.7, tilt: 14, turn: -9 };
// The screen seen edge-on: no corner of the frame shows a point of it
const EDGE_ON: Pose = { ...FACE_ON, turn: 90 };
// How far a corner of a square frame of 1000 stands from its middle
const CORNER_FROM_MIDDLE = Math.hypot(500, 500);
// The screen's corners at half its size in the frame, then at 0.55 of it: each moves 35 across and 25 down
const SCREEN_CORNER_DRAWN_CLOSER = Math.hypot(35, 25);
// A pan across the screen, in its pixels
const PANNED_BY = 20;
// The frame's bottom right corner, and how many decimals of a pixel a point carried there and back keeps
const FRAME_CORNER: Point = { left: 1000, top: 1000 };
const DECIMALS = 6;
const TOP_LEFT: Point = { left: 0, top: 0 };
const TOP_RIGHT: Point = { left: 1400, top: 0 };
const BOTTOM_LEFT: Point = { left: 0, top: 1000 };
const BOTTOM_RIGHT: Point = { left: 1400, top: 1000 };

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
	expect(frameShift(close, { ...close, focusX: 710 }, SQUARE)).toBe(20);
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

test('a block is framed whole with its air round it', () => {
	const block = { left: 100, top: 200, width: 400, height: 100 };
	expect(onto(block, FACE_ON, SQUARE.frame, { air: 50, zoomAtMost: 5 })).toEqual({
		...FACE_ON,
		focusX: 300,
		focusY: 250,
		zoom: 2
	});
});

test('the camera comes no closer than allowed', () => {
	const block = { left: 0, top: 0, width: 10, height: 10 };
	expect(onto(block, FACE_ON, SQUARE.frame, { air: 0, zoomAtMost: 3 }).zoom).toBe(3);
});

test('a framing keeps the angle it was taken at', () => {
	const angled = { ...FACE_ON, tilt: 20, turn: -10 };
	const framed = onto({ left: 0, top: 0, width: 500, height: 500 }, angled, SQUARE.frame, { air: 0, zoomAtMost: 5 });
	expect([framed.tilt, framed.turn]).toEqual([20, -10]);
});

test('a face-on camera near a corner moves until no edge of the screen shows', () => {
	const covered = covering({ ...FACE_ON, focusX: 50, focusY: 950, zoom: 2 }, SQUARE);
	expect([covered.focusX, covered.focusY]).toEqual([250, 750]);
});

test('a screen too short to fill the frame along a side stands in its middle along that side', () => {
	const covered = covering({ ...FACE_ON, focusX: 200, focusY: 100, zoom: 0.8 }, SQUARE);
	expect([covered.focusX, covered.focusY]).toEqual([625, 500]);
});
