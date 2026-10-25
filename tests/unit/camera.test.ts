import { expect, test } from 'vitest';
import { type Pose, covering, onto } from '#domain/camera';
import type { Format } from '#domain/geometry';

const SQUARE: Format = { frame: { width: 1000, height: 1000 }, screen: { width: 1400, height: 1000 } };
const FACE_ON: Pose = { focusX: 700, focusY: 500, zoom: 1, tilt: 0, turn: 0 };

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

test('a screen too short to fill the frame stays where the camera put it', () => {
	const far = { ...FACE_ON, focusY: 900, zoom: 0.5 };
	expect(covering(far, SQUARE)).toEqual(far);
});
