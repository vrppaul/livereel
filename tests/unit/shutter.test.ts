import { expect, test } from 'vitest';
import { type Size, diagonalOf } from '../../src/domain/geometry.ts';
import { EYE_STEP, type MotionBlur, alsoExposedBack } from '../../src/domain/shutter.ts';

// A frame as large as the stage's look was made on, and how long the eye's step is on it
const SQUARE: Size = { width: 1080, height: 1080 };
const STEP = EYE_STEP * diagonalOf(SQUARE);
// A film camera's shutter, open for half the frame's time, of four exposures at most; and one open for the whole of it,
// of eight
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
const WHOLE_WAY_OF_EIGHT: MotionBlur = { shutter: 1, exposuresAtMost: 8 };
// A smear far longer than any eye sees as smooth; and one of a little more than two of the eye's steps, whose copies
// three exposures keep less than a step apart and two would not
const FAR = 200;
const STEPS_SMEARED = 2.2;

test('a frame smeared far is exposed again along the share of its time the shutter is open for, evenly, back from its own moment', () => {
	expect(alsoExposedBack(FAR, SQUARE, HALF_OF_FOUR)).toEqual([0.375, 0.25, 0.125]);
});

test("a frame smeared a little is exposed only as often as keeps its copies an eye's step apart", () => {
	expect(alsoExposedBack(STEPS_SMEARED * STEP, SQUARE, WHOLE_WAY_OF_EIGHT)).toHaveLength(2);
});

test("a smear no longer than the eye's step is shot at once, as a frame where nothing moves is", () => {
	expect([alsoExposedBack(STEP, SQUARE, HALF_OF_FOUR), alsoExposedBack(0, SQUARE, HALF_OF_FOUR)]).toEqual([[], []]);
});
