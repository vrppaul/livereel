// A film shot for real, in a browser, of a page on the disk: the frames it keeps, its one still, keys typed into it
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { Chromium, type Renderer } from '../../src/adapters/browser/chromium.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { StillFootage } from '../../src/adapters/video/still.ts';
import { type Shooting, shoot } from '../../src/studio/shoot.ts';
import type { Footage } from '../../src/studio/ports.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import {
	type ActContext,
	type Step,
	act,
	atAddress,
	camera,
	defineFilm,
	keystrokes,
	light,
	page,
	play,
	typing
} from 'livereel';

const PAGE = new URL('./page.html', import.meta.url).href;
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };
const FIELD = '[data-testid=field]';
const TYPED = 'hello';

/** Footage that keeps every frame and counts them. */
class EveryFrameCounted implements Footage {
	readonly kept: number[] = [];

	expect(): void {}

	keeps(): boolean {
		return true;
	}

	keep(shot: number): Promise<void> {
		this.kept.push(shot);
		return Promise.resolve();
	}

	complete(): boolean {
		return false;
	}
}

function filmOf(steps: readonly Step[]) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => Promise.resolve(atAddress(PAGE)),
		ready: (context) => context.page.locator('h1').waitFor(),
		steps: () => steps
	}).formats.get('small')!;
}

/**
 * A film shot in Chromium, drawn by the renderer, at the frame's own size into this footage, each frame exposed once,
 * its sounds heard by nobody.
 */
function shootingInto(footage: Footage, renderer: Renderer): Shooting {
	return {
		browser: new Chromium(renderer, WARNED_TO_NOBODY),
		footage,
		track: SILENT,
		quality: { sharpness: 1, blurred: false }
	};
}

async function scratch(): Promise<string> {
	return mkdtemp(join(tmpdir(), 'livereel-smoke-'));
}

test('every frame of a film is kept, in order, drawn in software or on the graphics card', async () => {
	const inSoftware = new EveryFrameCounted();
	const onTheCard = new EveryFrameCounted();
	const steps = [play({ seconds: 0.2, moves: [camera.onto('h1'), light.on('p')] })];
	const shotInSoftware = await shoot(filmOf(steps), shootingInto(inSoftware, 'software'));
	const shotOnTheCard = await shoot(filmOf(steps), shootingInto(onTheCard, 'gpu'));
	expect([shotInSoftware.frames, inSoftware.kept, shotOnTheCard.frames, onTheCard.kept]).toEqual([
		6,
		[0, 1, 2, 3, 4, 5],
		6,
		[0, 1, 2, 3, 4, 5]
	]);
});

test('a still is the one frame written, and nothing after it is shot', async () => {
	const directory = await scratch();
	const footage = new StillFootage(join(directory, 'still.jpg'), 0.1);
	const shot = await shoot(filmOf([play({ seconds: 0.2 })]), shootingInto(footage, 'software'));
	expect([await readdir(directory), shot.frames]).toEqual([['still.jpg'], 4]);
});

test('keys typed into the page reach the field that holds its keyboard', async () => {
	const values: string[] = [];
	const steps = [
		act((context: ActContext) => context.page.locator(FIELD).click()),
		...typing(page.type(keystrokes(TYPED, { seed: 1, slipAt: 2 }))),
		act(async (context: ActContext) => {
			values.push(await context.page.locator(FIELD).inputValue());
		})
	];
	await shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	expect(values).toEqual([TYPED]);
});

test('a scroll of a block the page does not have is refused as its share begins, naming the block', async () => {
	const steps = [play({ seconds: 0.1, moves: [page.scrollTo('[data-testid=nowhere]', { top: 0 })] })];
	const shooting = shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	await expect(shooting).rejects.toThrow('nothing on the page matches [data-testid=nowhere]');
});
