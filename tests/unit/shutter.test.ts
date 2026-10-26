import { expect, test } from 'vitest';
import type { Pose } from '../../src/domain/camera.ts';
import type { Format } from '../../src/domain/geometry.ts';
import { type MotionBlur, alsoExposedAt } from '../../src/domain/shutter.ts';

// A screen wider than the frame, so the frame shows it alone however the camera pans here
const WIDE: Format = { frame: { width: 1000, height: 1000 }, screen: { width: 2000, height: 1000 } };
const FACE_ON: Pose = { focusX: 600, focusY: 500, zoom: 1, tilt: 0, turn: 0 };
// The camera's way from the frame before: far faster than any eye sees as smooth, and a pixel
const FAST: Pose = { ...FACE_ON, focusX: 800 };
const SLOW: Pose = { ...FACE_ON, focusX: 601 };
// A film camera's shutter, open for half the way, of four exposures
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposures: 4 };

test('a frame the camera crosses fast is exposed again along the share of its way the shutter is open for, evenly', () => {
	const poses = alsoExposedAt(FACE_ON, FAST, WIDE, HALF_OF_FOUR);
	expect(poses.map((pose) => pose.focusX)).toEqual([725, 750, 775]);
});

test('a frame the camera crosses slowly is exposed at its own pose alone', () => {
	expect(alsoExposedAt(FACE_ON, SLOW, WIDE, HALF_OF_FOUR)).toEqual([]);
});

test('a frame of a film with no blur is exposed at its own pose alone, however fast the camera', () => {
	expect(alsoExposedAt(FACE_ON, FAST, WIDE, null)).toEqual([]);
});
