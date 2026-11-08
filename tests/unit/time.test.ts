import { describe, expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { easeOutBack, framesOf, shotAt } from '../../src/domain/time.ts';
import { Share } from '../../src/direction/move.ts';

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
