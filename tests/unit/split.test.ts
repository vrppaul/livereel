import { expect, test } from 'vitest';
import type { Format } from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';

// A wide frame with its page as wide, and a square frame with the page as a laptop lays it out
const WIDE: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
const SQUARE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };

test("a window beside the words stands whole in its share's middle, in the screen's shape", () => {
	expect(windowOn(WIDE, 'right')).toEqual({
		left: expect.closeTo(691.2, 6),
		top: expect.closeTo(214.65, 6),
		width: expect.closeTo(1156.8, 6),
		height: expect.closeTo(650.7, 6)
	});
});

test("a window below the words, taller than its share, reaches past the frame's foot", () => {
	expect(windowOn(SQUARE, 'bottom')).toEqual({ left: 72, top: 388.8, width: 936, height: 702 });
});

test('words stand clear of the window on the side across: beside it, above it', () => {
	const window = windowOn(WIDE, 'right');
	const words = wordsOn(WIDE.frame, 'left');
	const below = windowOn(SQUARE, 'bottom');
	const above = wordsOn(SQUARE.frame, 'top');
	expect([window.left - (words.left + words.width), below.top - (above.top + above.height)]).toEqual([
		expect.closeTo(48, 6),
		expect.closeTo(48, 6)
	]);
});
