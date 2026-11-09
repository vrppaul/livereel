import { describe, expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { atSpeeds, cubicBezier, easeOutBack, softThenHeld } from '../../src/domain/curves.ts';

// How far either side of a share of time a curve's speed is read
const A_MOMENT = 1e-4;

/** How fast a curve goes at a share of time, in times its mean speed. */
function speedOf(curve: (progress: number) => number, at: number): number {
	return (curve(at + A_MOMENT) - curve(at - A_MOMENT)) / (2 * A_MOMENT);
}

test('the curve that bounces starts at none, passes its end on its way, and settles on it', () => {
	expect(easeOutBack(0)).toBeCloseTo(0);
	expect(easeOutBack(0.7)).toBeGreaterThan(1);
	expect(easeOutBack(1)).toBe(1);
});

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
