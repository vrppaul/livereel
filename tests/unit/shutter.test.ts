import { expect, test } from 'vitest';
import { type Camera, wholeView } from '../../src/domain/camera.ts';
import { type Format, diagonalOf } from '../../src/domain/geometry.ts';
import { EYE_STEP, type MotionBlur, alsoExposedAt } from '../../src/domain/shutter.ts';

// A screen wider than the frame, so the frame shows it alone however the camera pans here; the frame as large as the
// stage's look was made on, where a zoom of 1 takes a page's pixel to the frame's own
const WIDE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 2160, height: 1080 } };
const FACE_ON: Camera = { pose: { focusX: 600, focusY: 540, zoom: 1 }, view: wholeView(WIDE.frame) };
// The camera's way from the frame before: far faster than any eye sees as smooth, and a pixel
const FAST: Camera = panned(800);
const SLOW: Camera = panned(601);
// A film camera's shutter, open for half the way, of four exposures at most
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
// The shutter open for the whole way, of eight exposures at most; a pan of a little more than two of the eye's steps
// across the frame, whose copies three exposures keep less than a step apart and two would not; and a pan of a step
// and a half, half of which a half shutter smears
const WHOLE_WAY_OF_EIGHT: MotionBlur = { shutter: 1, exposuresAtMost: 8 };
const STEPS_PANNED = 2.2;
const STEPS_HALF_SMEARED = 1.5;

test('a frame the camera crosses fast is exposed again along the share of its way the shutter is open for, evenly', () => {
	const cameras = alsoExposedAt(FACE_ON, FAST, WIDE, HALF_OF_FOUR);
	expect(cameras.map((camera) => camera.pose.focusX)).toEqual([725, 750, 775]);
});

test("a frame the camera crosses a little fast is exposed only as often as keeps its copies an eye's step apart", () => {
	expect(alsoExposedAt(FACE_ON, pannedBy(STEPS_PANNED), WIDE, WHOLE_WAY_OF_EIGHT)).toHaveLength(2);
});

test("a smear no longer than the eye's step is shot at once, however far the frame moved: a half shutter's", () => {
	expect(alsoExposedAt(FACE_ON, pannedBy(STEPS_HALF_SMEARED), WIDE, HALF_OF_FOUR)).toEqual([]);
});

/** The camera panned across the screen by so many of the eye's steps on the frame. */
function pannedBy(steps: number): Camera {
	return panned(FACE_ON.pose.focusX + steps * EYE_STEP * diagonalOf(WIDE.frame));
}

/** The camera face-on, looking at another point across the screen. */
function panned(focusX: number): Camera {
	return { pose: { ...FACE_ON.pose, focusX }, view: FACE_ON.view };
}

test('a frame the camera crosses slowly is exposed at its own pose alone', () => {
	expect(alsoExposedAt(FACE_ON, SLOW, WIDE, HALF_OF_FOUR)).toEqual([]);
});

test('a frame of a film with no blur is exposed at its own pose alone, however fast the camera', () => {
	expect(alsoExposedAt(FACE_ON, FAST, WIDE, null)).toEqual([]);
});
