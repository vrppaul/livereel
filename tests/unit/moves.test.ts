import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import type { Beginning, Move } from '../../src/direction/move.ts';
import { onto } from '../../src/moves/camera.ts';
import { to as cursorTo } from '../../src/moves/cursor.ts';
import { off, to as lightTo } from '../../src/moves/light.ts';
import { type Scene, openingScene, withProp } from '../../src/scene.ts';
import { PageOfBoxes, SMALL } from './fakes.ts';

const BLOCK = { left: 100, top: 100, width: 100, height: 40 };
const PAGE = new PageOfBoxes(new Map([['#block', BLOCK]]));
const LIT = { box: BLOCK, strength: 1, dim: 0.6 };

function beginningOf(scene: Scene): Beginning {
	return { scene, page: PAGE, format: SMALL };
}

/** The scene a move sets, begun on a scene, at a progress of its way. */
async function setAt(move: Move, scene: Scene, progress: number): Promise<Scene> {
	const change = await move.begin(beginningOf(scene));
	return change(scene, progress);
}

test('the light is carried or put out only where one is on', async () => {
	const unlit = beginningOf(openingScene(SMALL));
	await expect(async () => lightTo('#block').begin(unlit)).rejects.toThrow(FilmError);
	await expect(async () => off().begin(unlit)).rejects.toThrow(FilmError);
});

test('a light put out is gone at its end', async () => {
	expect((await setAt(off(), withProp(openingScene(SMALL), 'light', LIT), 1)).light).toBeNull();
});

test('a cursor not yet on the screen comes in from below and to the right of where it goes', async () => {
	const start = (await setAt(cursorTo('#block'), openingScene(SMALL), 0)).cursor;
	const end = (await setAt(cursorTo('#block'), openingScene(SMALL), 1)).cursor;
	expect([start!.left > end!.left, start!.top > end!.top]).toEqual([true, true]);
});

test('a face-on camera onto a block near the screen edge stops short of showing the edge', async () => {
	const pose = (await setAt(onto('#block', { air: 0, zoomAtMost: 4 }), openingScene(SMALL), 1)).camera;
	expect(pose.focusX - SMALL.frame.width / (2 * pose.zoom)).toBeGreaterThanOrEqual(0);
});
