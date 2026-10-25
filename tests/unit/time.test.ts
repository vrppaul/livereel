import { describe, expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { framesOf, shotAt } from '../../src/domain/time.ts';
import { Share } from '../../src/direction/move.ts';

describe('the film counts its time in frames', () => {
	test('so many seconds take the nearest count of frames, a half frame counted whole', () => {
		expect([framesOf(0.35), framesOf(0.25), framesOf(1)]).toEqual([11, 8, 30]);
	});

	test('a step of a moment still takes one frame', () => {
		expect(framesOf(0.001)).toBe(1);
	});

	test('the frame at a moment is the nearest, a half frame counted whole', () => {
		expect([shotAt(0), shotAt(0.1), shotAt(0.35)]).toEqual([0, 3, 11]);
	});
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
