import { expect, test } from 'vitest';
import { FilmError } from '#domain/errors';
import type { Beginning } from '#direction/move';
import { onto } from '#props/camera/moves';
import { to as cursorTo } from '#props/cursor/moves';
import { off, to as lightTo } from '#props/light/moves';
import { type Scene, openingScene, withProp } from '#scene';
import { PageOfBoxes, SMALL } from './fakes.ts';

const BLOCK = { left: 100, top: 100, width: 100, height: 40 };
const PAGE = new PageOfBoxes(new Map([['#block', BLOCK]]));
const LIT = { box: BLOCK, strength: 1, dim: 0.6, pad: 4 };

function beginningOf(scene: Scene): Beginning {
	return { scene, page: PAGE, format: SMALL };
}

test('the light is carried or put out only where one is on', async () => {
	const unlit = beginningOf(openingScene(SMALL));
	await expect(lightTo('#block').begin(unlit)).rejects.toThrow(FilmError);
	await expect(off().begin(unlit)).rejects.toThrow(FilmError);
});

test('a light put out is gone at its end', async () => {
	const change = await off().begin(beginningOf(withProp(openingScene(SMALL), 'light', LIT)));
	expect(change.at(openingScene(SMALL), 1).light).toBeNull();
});

test('a cursor not yet on the screen comes in from below and to the right of where it goes', async () => {
	const change = await cursorTo('#block').begin(beginningOf(openingScene(SMALL)));
	const start = change.at(openingScene(SMALL), 0).cursor;
	const end = change.at(openingScene(SMALL), 1).cursor;
	expect([start!.left > end!.left, start!.top > end!.top]).toEqual([true, true]);
});

test('a face-on camera onto a block near the screen edge stops short of showing the edge', async () => {
	const change = await onto('#block', { air: 0, zoomAtMost: 4 }).begin(beginningOf(openingScene(SMALL)));
	const pose = change.at(openingScene(SMALL), 1).camera;
	expect(pose.focusX - SMALL.frame.width / (2 * pose.zoom)).toBeGreaterThanOrEqual(0);
});
