import { expect, test } from 'vitest';
import type { Format } from '../../src/domain/geometry.ts';
import { pastTheEdge, wordsPlaced } from '../../src/domain/place.ts';
import { wordsOn } from '../../src/domain/split.ts';

// A wide frame with its page as wide
const WIDE: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };

test("a named place is where words stood on that side of the frame beside a window, and the whole frame inside the words' margin", () => {
	expect([wordsPlaced(WIDE, 'left'), wordsPlaced(WIDE, 'bottom'), wordsPlaced(WIDE, 'whole')]).toEqual([
		wordsOn(WIDE, 'left'),
		wordsOn(WIDE, 'bottom'),
		{ left: 96, top: 96, width: 1728, height: 888 }
	]);
});

test('a place within another takes its shares of that place, a box within one too, one within none its shares of the frame edge to edge, and any may reach past the frame', () => {
	expect([
		wordsPlaced(WIDE, { of: 'left', top: 0.25, height: 0.5 }),
		wordsPlaced(WIDE, { of: { of: 'left', top: 0.25, height: 0.5 }, top: 0.5 }),
		wordsPlaced(WIDE, { left: 0.5, top: 0.9, width: 0.5, height: 0.5 })
	]).toEqual([
		{ left: 96, top: 318, width: 547, height: 444 },
		{ left: 96, top: 540, width: 547, height: 444 },
		{ left: 960, top: 972, width: 960, height: 540 }
	]);
});

test('a box past the edge on a side is the box moved a whole frame toward it, every side alike', () => {
	const box = { left: 100, top: 50, width: 200, height: 80 };
	expect(
		[pastTheEdge(box, 'left', WIDE.frame), pastTheEdge(box, 'right', WIDE.frame)].concat([
			pastTheEdge(box, 'top', WIDE.frame),
			pastTheEdge(box, 'bottom', WIDE.frame)
		])
	).toEqual([
		{ ...box, left: -1820 },
		{ ...box, left: 2020 },
		{ ...box, top: -1030 },
		{ ...box, top: 1130 }
	]);
});
