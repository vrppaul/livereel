import { expect, test } from 'vitest';
import { pictureDecodedOf } from '../../src/adapters/browser/films-files.ts';

// A frame drawn at twice its pixels, as at the finest quality
const TWICE_THE_PIXELS = 2;

test("a picture of the film's decodes as wide against as tall as its file, holding its pixels across in the frame's at the take's sharpness; an SVG, endless", () => {
	const pixels = pictureDecodedOf({ path: 'mark.png', width: 800, height: 200 }, TWICE_THE_PIXELS);
	const lines = pictureDecodedOf({ path: 'mark.svg', width: 800, height: 200 }, TWICE_THE_PIXELS);
	expect([pixels, lines]).toEqual([
		{ aspect: 4, sharpAcross: 400 },
		{ aspect: 4, sharpAcross: Infinity }
	]);
});
