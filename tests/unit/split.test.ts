import { expect, test } from 'vitest';
import type { Format } from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';

// A wide frame with its page as wide, a square frame with the page as a laptop lays it out, and a square frame with a
// phone's page, taller than wide
const WIDE: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
const SQUARE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };
const PHONE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 390, height: 844 } };

test("a window stands whole in the middle of its room, in the screen's shape, on whole pixels: beside the words, below them, for a phone", () => {
	expect([windowOn(WIDE, 'right'), windowOn(SQUARE, 'bottom'), windowOn(PHONE, 'bottom')]).toEqual([
		{ left: 691, top: 215, width: 1157, height: 651 },
		{ left: 127, top: 389, width: 826, height: 619 },
		{ left: 397, top: 389, width: 286, height: 619 }
	]);
});

test('words stand clear of the window on the side across: beside it, above it', () => {
	const window = windowOn(WIDE, 'right');
	const words = wordsOn(WIDE.frame, 'left');
	const below = windowOn(SQUARE, 'bottom');
	const above = wordsOn(SQUARE.frame, 'top');
	expect([window.left - (words.left + words.width), below.top - (above.top + above.height)]).toEqual([48, 48]);
});
