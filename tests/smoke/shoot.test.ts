// A film shot for real, in a browser, of a page on the disk: the frames it keeps, its one still, keys typed into it
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { Chromium, type Renderer } from '../../src/adapters/browser/chromium.ts';
import { blended } from '../../src/adapters/video/exposures.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { StillFootage } from '../../src/adapters/video/still.ts';
import { type Shooting, shoot } from '../../src/studio/shoot.ts';
import type { Exposures, Footage, PicturedStage } from '../../src/studio/ports.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import {
	type ActContext,
	type Step,
	act,
	atAddress,
	camera,
	cut,
	defineFilm,
	hold,
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

/** Footage that keeps every frame and counts them, and how many images each was handed as. */
class EveryFrameCounted implements Footage {
	readonly kept: number[] = [];
	readonly images: number[] = [];

	expect(): void {}

	keeps(): boolean {
		return true;
	}

	keep(shot: number, exposures: Exposures): Promise<void> {
		this.kept.push(shot);
		this.images.push(exposures.earlier.length + 1);
		return Promise.resolve();
	}

	complete(): boolean {
		return false;
	}
}

function filmOf(steps: readonly Step[]) {
	return filmWritten(steps, {});
}

/**
 * A film of these steps with what else it is written with: how its page is asked to look, what it blurs, its font,
 * and whether it is dynamic, framed live, or static, in a tab of its own.
 */
function filmWritten(
	steps: readonly Step[],
	written: { colourScheme?: 'dark'; blurred?: readonly string[]; theme?: { font: string }; page?: 'dynamic' }
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

/** A film shot as `shootingInto` shoots it, a fast camera blurred as the film says. */
function blurredShootingInto(footage: Footage, renderer: Renderer): Shooting {
	return { ...shootingInto(footage, renderer), quality: { sharpness: 1, blurred: true } };
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

test("a static page's frame the camera crosses fast is one image on the graphics card, its exposures laid at once, and each exposure an image in software", async () => {
	const onTheCard = new EveryFrameCounted();
	const inSoftware = new EveryFrameCounted();
	const steps = [play({ seconds: 0.2, moves: [camera.onto('h1')] })];
	await shoot(filmOf(steps), blurredShootingInto(onTheCard, 'gpu'));
	await shoot(filmOf(steps), blurredShootingInto(inSoftware, 'software'));
	expect([Math.max(...onTheCard.images), Math.max(...inSoftware.images) > 1]).toEqual([1, true]);
});

test('a still is the one frame written, and nothing after it is shot', async () => {
	const directory = await scratch();
	const footage = new StillFootage(join(directory, 'still.jpg'), 0.1, blended);
	const shot = await shoot(filmOf([play({ seconds: 0.2 })]), shootingInto(footage, 'software'));
	expect([await readdir(directory), shot.frames]).toEqual([['still.jpg'], 4]);
});

test('keys typed into the page reach the field that holds its keyboard, in its own tab or framed live', async () => {
	const values: string[] = [];
	const steps = [
		act((context: ActContext) => context.page.locator(FIELD).click()),
		...typing(page.type(keystrokes(TYPED, { seed: 1, slipAt: 2 }))),
		act(async (context: ActContext) => {
			values.push(await context.page.locator(FIELD).inputValue());
		})
	];
	await shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(filmWritten(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(values).toEqual([TYPED, TYPED]);
});

test('a block a film blurs is blurred on the page, and a block it does not name is not, in its own tab or framed live', async () => {
	const filters: string[] = [];
	const steps = [
		act(async (context: ActContext) => {
			filters.push(await context.page.locator(FIELD).evaluate((field) => getComputedStyle(field).filter));
			filters.push(await context.page.locator('h1').evaluate((heading) => getComputedStyle(heading).filter));
		})
	];
	await shoot(filmWritten(steps, { blurred: [FIELD] }), shootingInto(new EveryFrameCounted(), 'software'));
	const framed = filmWritten(steps, { blurred: [FIELD], page: 'dynamic' });
	await shoot(framed, shootingInto(new EveryFrameCounted(), 'software'));
	expect(filters).toEqual(['blur(12px)', 'none', 'blur(12px)', 'none']);
});

test("the page's fields are set to a caret that does not blink, in its own tab or framed live", async () => {
	const caretAnimations: string[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const field = context.page.locator(FIELD);
			caretAnimations.push(
				await field.evaluate((input) => getComputedStyle(input).getPropertyValue('caret-animation'))
			);
		})
	];
	await shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(filmWritten(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(caretAnimations).toEqual(['manual', 'manual']);
});

test('the page is asked for the colour scheme the film names, in its own tab or framed live', async () => {
	const dark: boolean[] = [];
	const steps = [
		act(async (context: ActContext) => {
			dark.push(await context.page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches));
		})
	];
	await shoot(filmWritten(steps, { colourScheme: 'dark' }), shootingInto(new EveryFrameCounted(), 'software'));
	const framed = filmWritten(steps, { colourScheme: 'dark', page: 'dynamic' });
	await shoot(framed, shootingInto(new EveryFrameCounted(), 'software'));
	expect(dark).toEqual([true, true]);
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

// A page that keeps time of its own: it echoes what is typed into it a moment after the typing stops, and says it is
// ready a moment after it opens
const TIMED = new URL('./timed.html', import.meta.url).href;
const ECHO = '[data-testid=echo]';
const SAID_READY = 'body[data-ready]';
// Long enough a hold that the page's time run a whole millisecond for each third of one would come out a tenth of a
// second ahead (6.12 s), and that a page on the wall's time comes out short, as a held frame costs next to nothing
const SIX_SECONDS = 6;

/** A film of these steps of the page that keeps time of its own, made ready once it says so: static, or framed live. */
function timedFilmOf(steps: readonly Step[], written: { page?: 'dynamic' }) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => Promise.resolve(atAddress(TIMED)),
		ready: (context) => context.page.locator(SAID_READY).waitFor(),
		steps: () => steps,
		...written
	}).formats.get('small')!;
}

/** An act that writes down the page's own time, as it reads it. */
function timeRead(read: number[]): Step {
	return act(async (context: ActContext) => {
		read.push(await context.page.evaluate(() => Date.now()));
	});
}

test("the page's own time runs as far as the film's, however long the shoot takes, in its own tab or framed live", async () => {
	const read: number[] = [];
	const steps = [timeRead(read), hold({ seconds: SIX_SECONDS }), timeRead(read)];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(timedFilmOf(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	const ran = [read[1]! - read[0]!, read[3]! - read[2]!];
	// In seconds, to the tenth: an act's own wait on the page runs the page's time a few milliseconds more
	expect(ran.map((milliseconds) => Math.round(milliseconds / 100) / 10)).toEqual([SIX_SECONDS, SIX_SECONDS]);
});

/** An act that writes down what the page has echoed of what was typed into it. */
function echoRead(echoed: string[]): Step {
	return act(async (context: ActContext) => {
		echoed.push(await context.page.locator(ECHO).innerText());
	});
}

const typedIn = act((context: ActContext) => context.page.locator(FIELD).fill(TYPED));

test('a timer the page sets runs out as far into the film as its delay, however long the shoot takes, in its own tab or framed live', async () => {
	const echoed: string[] = [];
	// Typed, then read before the page's 0.3 s are up and after
	const steps = [typedIn, hold({ seconds: 0.2 }), echoRead(echoed), hold({ seconds: 0.2 }), echoRead(echoed)];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(timedFilmOf(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(echoed).toEqual(['', TYPED, '', TYPED]);
});

test('a timer the page sets runs out as far into the film as its delay though an act after it waits on the page, in its own tab or framed live', async () => {
	const echoed: string[] = [];
	// Typed, then an act that waits 0.2 s on the page, then read 0.15 s and 0.35 s into the film after: the page's
	// 0.3 s are up only at the second, the wait's own time not counted twice
	const steps = [
		typedIn,
		act((context: ActContext) => context.page.waitForTimeout(200)),
		hold({ seconds: 0.15 }),
		echoRead(echoed),
		hold({ seconds: 0.2 }),
		echoRead(echoed)
	];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(timedFilmOf(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(echoed).toEqual(['', TYPED, '', TYPED]);
});

test("a page with a timer of a millisecond runs no further than the wall's clock while an act waits on it", async () => {
	const read: number[] = [];
	// Every timer the clock runs yields to the browser, so a page's time with one a millisecond runs slower than the
	// wall's: run on as long as the wall's clock took, it ran 1.8 s ahead in a wait of 0.5 s
	const waitedOnABusyPage = act(async (context: ActContext) => {
		await context.page.evaluate(() => setInterval(() => undefined, 1));
		await context.page.waitForTimeout(500);
	});
	const steps = [timeRead(read), waitedOnABusyPage, timeRead(read)];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	expect(read[1]! - read[0]! < 1000).toBe(true);
});

test("a page that goes elsewhere keeps the film's time, in its own tab", async () => {
	const read: number[] = [];
	const wentAgain = act(async (context: ActContext) => {
		await context.page.goto(TIMED);
	});
	const steps = [timeRead(read), wentAgain, hold({ seconds: 2 }), timeRead(read)];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	// In seconds, to the tenth
	expect(Math.round((read[1]! - read[0]!) / 100) / 10).toEqual(2);
});

test('a page whose own timer throws is filmed to its end, the person warned once of what it threw', async () => {
	const warned: string[] = [];
	const thrownEveryTenth = act((context: ActContext) =>
		context.page.evaluate(() =>
			setInterval(() => {
				throw new Error('a timer of the page');
			}, 100)
		)
	);
	const steps = [thrownEveryTenth, hold({ seconds: 0.5 })];
	const shooting = {
		...shootingInto(new EveryFrameCounted(), 'software'),
		browser: new Chromium('software', (line: string) => warned.push(line))
	};
	const shot = await shoot(timedFilmOf(steps, {}), shooting);
	expect([shot.frames, warned.map((line) => line.includes('a timer of the page'))]).toEqual([15, [true]]);
});

test('an act waiting on what the page does after a delay of its own is answered, as is the wait for the page to say it is ready, in its own tab or framed live', async () => {
	const answered: string[] = [];
	const steps = [
		act(async (context: ActContext) => {
			await context.page.locator(FIELD).fill(TYPED);
			answered.push(await context.page.locator(ECHO, { hasText: TYPED }).innerText());
		})
	];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(timedFilmOf(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(answered).toEqual([TYPED, TYPED]);
});

test('a page in a tab of its own is heard to change of itself, once', async () => {
	await using opened = await new Chromium('software', WARNED_TO_NOBODY).open(timedFilmOf([], {}), TIMED, 1);
	const stage = opened.stage as PicturedStage;
	const page = opened.act.page;
	// What the page did as it opened and as it said it was ready, 0.3 s on, heard and forgotten; then a change it makes
	// 0.1 s on, at 0.6 s, heard once it is made
	await opened.time.runTo(0.5);
	stage.changedOfItself();
	await page.evaluate(() => setTimeout(() => (document.body.dataset['late'] = 'yes'), 100));
	await opened.time.runTo(0.55);
	const heard = [stage.changedOfItself()];
	await opened.time.runTo(0.65);
	heard.push(stage.changedOfItself(), stage.changedOfItself());
	expect(heard).toEqual([false, true, false]);
});
