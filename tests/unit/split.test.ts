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

test("a format's own split sets the words' share, the margins and the gap; what it leaves out stays livereel's", () => {
	const tuned: Format = { ...WIDE, split: { wordsShare: 0.3, windowMargin: 40, wordsMargin: 60, wordsGap: 20 } };
	const narrower: Format = { ...WIDE, split: { wordsShare: 0.3 } };
	expect([wordsOn(tuned, 'left'), windowOn(tuned, 'right'), wordsOn(narrower, 'left')]).toEqual([
		{ left: 60, top: 60, width: 496, height: 960 },
		{ left: 576, top: 173, width: 1304, height: 734 },
		{ left: 96, top: 96, width: 432, height: 888 }
	]);
});

test('words stand clear of the window on the side across: beside it, above it', () => {
	const window = windowOn(WIDE, 'right');
	const words = wordsOn(WIDE, 'left');
	const below = windowOn(SQUARE, 'bottom');
	const above = wordsOn(SQUARE, 'top');
	expect([window.left - (words.left + words.width), below.top - (above.top + above.height)]).toEqual([48, 48]);
});
