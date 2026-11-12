import { writeFileSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { filmsPicturesRead, pictureDecodedOf } from '../../src/adapters/browser/films-files.ts';

// A frame drawn at twice its pixels, as at the finest quality
const TWICE_THE_PIXELS = 2;
// An SVG file named in capitals, and what it holds: a picture of lines, 800 across and 200 down
const NAMED_IN_CAPITALS = 'MARK.SVG';
const A_PICTURE_OF_LINES = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="200"/>';

test("a picture of the film's decodes as wide against as tall as its file, holding its pixels across in the frame's at the take's sharpness; an SVG, endless", () => {
	const pixels = pictureDecodedOf({ path: 'mark.png', width: 800, height: 200 }, TWICE_THE_PIXELS);
	const lines = pictureDecodedOf({ path: 'mark.svg', width: 800, height: 200 }, TWICE_THE_PIXELS);
	expect([pixels, lines]).toEqual([
		{ aspect: 4, sharpAcross: 400 },
		{ aspect: 4, sharpAcross: Infinity }
	]);
});

test("an SVG of the film's is told by its name whatever its case: handed to the stage typed as one, and decoded endless", async () => {
	const folder = await mkdtemp(join(tmpdir(), 'livereel-films-files-'));
	writeFileSync(join(folder, NAMED_IN_CAPITALS), A_PICTURE_OF_LINES);
	const [handed] = await filmsPicturesRead(folder, [NAMED_IN_CAPITALS]);
	const decoded = pictureDecodedOf({ path: NAMED_IN_CAPITALS, width: 800, height: 200 }, TWICE_THE_PIXELS);
	expect([handed!.type, decoded.sharpAcross]).toEqual(['image/svg+xml', Infinity]);
});
