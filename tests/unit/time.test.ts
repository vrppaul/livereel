import { describe, expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { easeOutBack, framesOf, shotAt } from '../../src/domain/time.ts';
import { Share } from '../../src/direction/move.ts';
import { atSpeeds, cubicBezier, softThenHeld } from '../../src/direction/curves.ts';

// How far either side of a share of time a curve's speed is read
const A_MOMENT = 1e-4;

/** How fast a curve goes at a share of time, in times its mean speed. */
function speedOf(curve: (progress: number) => number, at: number): number {
	return (curve(at + A_MOMENT) - curve(at - A_MOMENT)) / (2 * A_MOMENT);
}

describe("curves of a film's own numbers", () => {
	test("one drawn as CSS's cubic-bezier: its ends at its ends, the straight one even, the ease-in-out one half way at half its time", () => {
		const straight = cubicBezier(0, 0, 1, 1);
		const inOut = cubicBezier(0.42, 0, 0.58, 1);
		expect([straight(0.3), inOut(0), inOut(0.5), inOut(1), inOut(0.25)]).toEqual([
			expect.closeTo(0.3),
			expect.closeTo(0),
			expect.closeTo(0.5),
			expect.closeTo(1),
			expect.closeTo(0.129, 2)
		]);
	});

	test('one whose handles leave its time standing still at its middle is read exactly there too', () => {
		// At its own parameter 0.6, the curve through handles (1, 0) and (0, 1) stands at time 0.504, way 0.648
		const steepest = cubicBezier(1, 0, 0, 1);
		expect(steepest(3 * 0.4 * 0.36 * 0 + 3 * 0.4 ** 2 * 0.6 + 0.6 ** 3)).toBeCloseTo(3 * 0.4 * 0.36 + 0.216, 9);
	});

	test('one that sets off and arrives at the speeds named, from its start to its end', () => {
		const joining = atSpeeds({ settingOff: 2, arriving: 0.5 });
		expect([joining(0), joining(1), speedOf(joining, A_MOMENT), speedOf(joining, 1 - A_MOMENT)]).toEqual([
			0,
			1,
			expect.closeTo(2, 2),
			expect.closeTo(0.5, 2)
		]);
	});

	test('one soft then held: from rest, at its fastest at the share named, that speed held to its end', () => {
		const diving = softThenHeld(0.4);
		expect([
			diving(0),
			diving(1),
			speedOf(diving, A_MOMENT),
			speedOf(diving, 0.4) - speedOf(diving, 0.9),
			speedOf(diving, 0.2) < speedOf(diving, 0.4)
		]).toEqual([0, 1, expect.closeTo(0, 2), expect.closeTo(0, 2), true]);
	});

	test("a curve's numbers in no form of one are refused as it is made", () => {
		expect(() => cubicBezier(1.2, 0, 0.5, 1)).toThrow(
			new FilmError("cubicBezier's first handle's time is 1.2: it is a share of the time, from 0 to 1, as CSS takes it")
		);
		expect(() => atSpeeds({ settingOff: -1, arriving: 0 })).toThrow(
			new FilmError(
				"atSpeeds's settingOff is -1: it is times the mean speed, from 0 to 3: faster, the curve runs past its end or back before its start"
			)
		);
		expect(() => atSpeeds({ settingOff: 0, arriving: 4 })).toThrow(
			new FilmError(
				"atSpeeds's arriving is 4: it is times the mean speed, from 0 to 3: faster, the curve runs past its end or back before its start"
			)
		);
		expect(() => softThenHeld(0)).toThrow(
			new FilmError("softThenHeld's fastestAt is 0: it is a share of the time, more than 0 and at most 1")
		);
	});
});

// Two films' rates: an old film's, and livereel's where a film names none
const THIRTY = 30;
const SIXTY = 60;

describe('the film counts its time in frames, at its own rate', () => {
	test('so many seconds take the nearest count of frames, a half frame counted whole', () => {
		expect([framesOf(0.35, THIRTY), framesOf(0.25, THIRTY), framesOf(1, THIRTY)]).toEqual([11, 8, 30]);
	});

	test('a second takes as many frames as the film makes a second', () => {
		expect([framesOf(1, THIRTY), framesOf(1, SIXTY)]).toEqual([30, 60]);
	});

	test('a step of a moment still takes one frame', () => {
		expect(framesOf(0.001, SIXTY)).toBe(1);
	});

	test('the frame at a moment is the nearest, a half frame counted whole', () => {
		expect([shotAt(0, THIRTY), shotAt(0.1, THIRTY), shotAt(0.35, THIRTY), shotAt(0.35, SIXTY)]).toEqual([0, 3, 11, 21]);
	});
});

test('the curve that bounces starts at none, passes its end on its way, and settles on it', () => {
	expect(easeOutBack(0)).toBeCloseTo(0);
	expect(easeOutBack(0.7)).toBeGreaterThan(1);
	expect(easeOutBack(1)).toBe(1);
});

describe('a share of a step', () => {
	test('is none before its start, all after its end, and in between as far along as the step', () => {
		const share = Share.of({ start: 0.25, end: 0.75 });
		expect([share.along(0.1), share.along(0.5), share.along(0.9)]).toEqual([0, 0.5, 1]);
	});

	test('that takes no time, or reaches past its step, is refused', () => {
		expect(() => Share.of({ start: 0.5, end: 0.5 })).toThrow(FilmError);
		expect(() => Share.of({ start: 0.6, end: 0.4 })).toThrow(FilmError);
		expect(() => Share.of({ end: 1.5 })).toThrow(FilmError);
		expect(() => Share.of({ end: Number.NaN })).toThrow(FilmError);
	});

	test('overlaps another only where both run at once, not where one ends as the other starts', () => {
		const first = Share.of({ end: 0.3 });
		expect([first.overlaps(Share.of({ start: 0.3 })), first.overlaps(Share.of({ start: 0.2 }))]).toEqual([false, true]);
	});
});
