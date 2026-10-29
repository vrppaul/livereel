import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import type { Format } from '../../src/domain/format.ts';
import { alignmentIn, pastTheEdge, windowPlaced, wordsPlaced } from '../../src/domain/place.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';

// A wide frame with its page as wide
const WIDE: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
// The same frame naming places of its own: the words on the left, the page across, a heading high in the words
const NAMING: Format = {
	...WIDE,
	places: { words: 'left', page: 'right', heading: { of: 'words', height: 0.2 } }
};

test("a format's own name is the place it names, as what stands there reads that place, through another of its own names too", () => {
	expect([
		wordsPlaced(NAMING, 'words'),
		windowPlaced(NAMING, 'page'),
		wordsPlaced(NAMING, 'heading'),
		wordsPlaced(NAMING, { of: 'heading', width: 0.5 })
	]).toEqual([
		wordsOn(WIDE, 'left'),
		windowOn(WIDE, 'right'),
		wordsPlaced(WIDE, { of: 'left', height: 0.2 }),
		wordsPlaced(WIDE, { of: { of: 'left', height: 0.2 }, width: 0.5 })
	]);
});

test("words in a format's own place read as in the place it names: centred above a window, from the left beside one", () => {
	const square: Format = { ...WIDE, places: { words: 'top', heading: 'words', beside: 'left' } };
	expect([alignmentIn(square, 'words'), alignmentIn(square, 'heading'), alignmentIn(square, 'beside')]).toEqual([
		'center',
		'center',
		'start'
	]);
});

test("a name that is no place of livereel's nor of the format is refused, naming the format's own", () => {
	expect(() => wordsPlaced(NAMING, 'nowhere')).toThrow(
		new FilmError(
			'the place "nowhere" is none: a place is whole, left, right, top or bottom, or one its format names: words, page, heading'
		)
	);
});

test("a named place is where words stood on that side of the frame beside a window, and the whole frame inside the words' margin", () => {
	expect([wordsPlaced(WIDE, 'left'), wordsPlaced(WIDE, 'bottom'), wordsPlaced(WIDE, 'whole')]).toEqual([
		wordsOn(WIDE, 'left'),
		wordsOn(WIDE, 'bottom'),
		{ left: 96, top: 96, width: 1728, height: 888 }
	]);
});

test("a name is the window's own place: the whole room across from the words' share on that side, the frame edge to edge for whole, and a box within either in shares", () => {
	expect([
		windowPlaced(WIDE, 'right'),
		windowPlaced(WIDE, 'whole'),
		windowPlaced(WIDE, { of: 'right', top: 0.5, height: 0.5 })
	]).toEqual([
		windowOn(WIDE, 'right'),
		{ left: 0, top: 0, width: 1920, height: 1080 },
		{ left: 691, top: 540, width: 1157, height: 468 }
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
