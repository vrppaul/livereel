import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import type { Beginning, Move } from '../../src/direction/move.ts';
import { onto } from '../../src/moves/camera.ts';
import { hide } from '../../src/moves/caption.ts';
import { press, release, to as cursorTo } from '../../src/moves/cursor.ts';
import { off, to as lightTo } from '../../src/moves/light.ts';
import { leave, open, submit, works } from '../../src/moves/terminal.ts';
import type { TerminalLine } from '../../src/props/terminal.ts';
import { type Scene, openingScene, withProp } from '../../src/scene.ts';
import { PageOfBoxes, SMALL } from './fakes.ts';

const BLOCK = { left: 100, top: 100, width: 100, height: 40 };
const PAGE = new PageOfBoxes(new Map([['#block', BLOCK]]));
const LIT = { box: BLOCK, strength: 1, dim: 0.6 };
const TYPED = withProp(openingScene(SMALL), 'terminal', {
	title: 'A terminal',
	lines: [],
	typed: 'add a test',
	shown: 1
});
const READ: TerminalLine = { kind: 'work', text: 'Read app.py' };
const SAID: TerminalLine = { kind: 'said', text: 'Done.' };
const THINKING = 'Working…';

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

test('what is put away — the light, a caption, the terminal — is gone at its end', async () => {
	const lit = withProp(openingScene(SMALL), 'light', LIT);
	const captioned = withProp(openingScene(SMALL), 'caption', { text: 'Words', shown: 1, gone: 0 });
	expect([
		(await setAt(off(), lit, 1)).light,
		(await setAt(hide(), captioned, 1)).caption,
		(await setAt(leave(), TYPED, 1)).terminal
	]).toEqual([null, null, null]);
});

test('a cursor pressed goes in as the press goes on, and comes back out as it is let go', async () => {
	const pointed = withProp(openingScene(SMALL), 'cursor', { left: 10, top: 10, press: 0 });
	const pressed = withProp(openingScene(SMALL), 'cursor', { left: 10, top: 10, press: 1 });
	expect([
		(await setAt(press(), pointed, 0.4)).cursor?.press,
		(await setAt(release(), pressed, 0.25)).cursor?.press
	]).toEqual([0.4, 0.75]);
});

test('a terminal opened comes up as its move goes on, and one left goes as its move goes on', async () => {
	expect([
		(await setAt(open('A terminal'), openingScene(SMALL), 0.25)).terminal?.shown,
		(await setAt(leave(), TYPED, 0.25)).terminal?.shown
	]).toEqual([0.25, 0.75]);
});

test('Enter puts the typed line up into the log, and the line is empty again', async () => {
	const terminal = (await setAt(submit(), TYPED, 1)).terminal;
	expect([terminal?.lines, terminal?.typed]).toEqual([[{ kind: 'asked', text: 'add a test' }], '']);
});

test('the agent thinks first, writes its lines one after another, and stops thinking once done', async () => {
	const work = works([READ, SAID], THINKING, { thinkingShare: 0.5 });
	const thinking: TerminalLine = { kind: 'thinking', text: THINKING };
	expect([
		(await setAt(work, TYPED, 0.25)).terminal?.lines,
		(await setAt(work, TYPED, 0.75)).terminal?.lines,
		(await setAt(work, TYPED, 1)).terminal?.lines
	]).toEqual([[thinking], [READ, thinking], [READ, SAID]]);
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
