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
	cut,
	defineFilm,
	keystrokes,
	light,
	look,
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
	return filmWritten(steps, {});
}

/** A film of these steps with what else it is written with: how its page is asked to look, what it blurs, its font. */
function filmWritten(
	steps: readonly Step[],
	written: { colourScheme?: 'dark'; blurred?: readonly string[]; theme?: { font: string } }
) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => Promise.resolve(atAddress(PAGE)),
		ready: (context) => context.page.locator('h1').waitFor(),
		steps: () => steps,
		...written
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

test('a block a film blurs is blurred on the page, and a block it does not name is not', async () => {
	const filters: string[] = [];
	const steps = [
		act(async (context: ActContext) => {
			filters.push(await context.page.locator(FIELD).evaluate((field) => getComputedStyle(field).filter));
			filters.push(await context.page.locator('h1').evaluate((heading) => getComputedStyle(heading).filter));
		})
	];
	await shoot(filmWritten(steps, { blurred: [FIELD] }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(filters).toEqual(['blur(12px)', 'none']);
});

test('the page is asked for the colour scheme the film names', async () => {
	const dark: boolean[] = [];
	const steps = [
		act(async (context: ActContext) => {
			dark.push(await context.page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches));
		})
	];
	await shoot(filmWritten(steps, { colourScheme: 'dark' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(dark).toEqual([true]);
});

test('a block to blur named by no selector Chrome makes a rule of is refused before the film is shot: a broken one, one that opens a comment', async () => {
	await expect(
		shoot(filmWritten([], { blurred: ['[['] }), shootingInto(new EveryFrameCounted(), 'software'))
	).rejects.toThrow('the film\'s blurred holds "[[": it is no selector Chrome reads');
	await expect(
		shoot(filmWritten([], { blurred: ['.email /*', '.secret'] }), shootingInto(new EveryFrameCounted(), 'software'))
	).rejects.toThrow('the film\'s blurred holds ".email /*": it is no selector Chrome reads');
});

test("a font named in no form CSS reads is refused before the film is shot: in the film's theme, in a look's move", async () => {
	const themed = shoot(
		filmWritten([], { theme: { font: "'Inter, sans-serif" } }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(themed).rejects.toThrow(
		`the film's theme's font is "'Inter, sans-serif": CSS reads no font family there`
	);
	const moved = shoot(
		filmWritten([cut(look.to({ mono: "'Menlo" }))], {}),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(moved).rejects.toThrow(`look.to's mono is "'Menlo": CSS reads no font family there`);
});

test('a scroll of a block the page does not have is refused as its share begins, naming the block', async () => {
	const steps = [play({ seconds: 0.1, moves: [page.scrollTo('[data-testid=nowhere]', { top: 0 })] })];
	const shooting = shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	await expect(shooting).rejects.toThrow('nothing on the page matches [data-testid=nowhere]');
});
