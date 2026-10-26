import { expect, test } from 'vitest';
import type { Pose } from '../../src/domain/camera.ts';
import { type Format, diagonalOf } from '../../src/domain/geometry.ts';
import { EYE_STEP, type MotionBlur, alsoExposedAt } from '../../src/domain/shutter.ts';

// A screen wider than the frame, so the frame shows it alone however the camera pans here
const WIDE: Format = { frame: { width: 1000, height: 1000 }, screen: { width: 2000, height: 1000 } };
const FACE_ON: Pose = { focusX: 600, focusY: 500, zoom: 1, tilt: 0, turn: 0 };
// The camera's way from the frame before: far faster than any eye sees as smooth, and a pixel
const FAST: Pose = { ...FACE_ON, focusX: 800 };
const SLOW: Pose = { ...FACE_ON, focusX: 601 };
// A film camera's shutter, open for half the way, of four exposures at most
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
// The shutter open for the whole way, of eight exposures at most; a pan of a little more than two of the eye's steps
// across the frame, whose copies three exposures keep less than a step apart and two would not; and a pan of a step
// and a half, half of which a half shutter smears
const WHOLE_WAY_OF_EIGHT: MotionBlur = { shutter: 1, exposuresAtMost: 8 };
const STEPS_PANNED = 2.2;
const STEPS_HALF_SMEARED = 1.5;

test('a frame the camera crosses fast is exposed again along the share of its way the shutter is open for, evenly', () => {
	const poses = alsoExposedAt(FACE_ON, FAST, WIDE, HALF_OF_FOUR);
	expect(poses.map((pose) => pose.focusX)).toEqual([725, 750, 775]);
});

test("a frame the camera crosses a little fast is exposed only as often as keeps its copies an eye's step apart", () => {
	expect(alsoExposedAt(FACE_ON, pannedBy(STEPS_PANNED), WIDE, WHOLE_WAY_OF_EIGHT)).toHaveLength(2);
});

test("a smear no longer than the eye's step is shot at once, however far the frame moved: a half shutter's", () => {
	expect(alsoExposedAt(FACE_ON, pannedBy(STEPS_HALF_SMEARED), WIDE, HALF_OF_FOUR)).toEqual([]);
});

/** The camera panned across the screen by so many of the eye's steps on the frame. */
function pannedBy(steps: number): Pose {
	return { ...FACE_ON, focusX: FACE_ON.focusX + steps * EYE_STEP * diagonalOf(WIDE.frame) };
}

test('a frame the camera crosses slowly is exposed at its own pose alone', () => {
	expect(alsoExposedAt(FACE_ON, SLOW, WIDE, HALF_OF_FOUR)).toEqual([]);
});

test('a frame of a film with no blur is exposed at its own pose alone, however fast the camera', () => {
	expect(alsoExposedAt(FACE_ON, FAST, WIDE, null)).toEqual([]);
});
