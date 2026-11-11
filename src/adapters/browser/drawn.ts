/**
 * A drawn film's page in a tab of its own at the frame's size, a page's pixel a frame's, as the page draws as finely
 * as it wants itself: made ready once it says so, then drawn at each moment asked through the one global it answers
 * livereel by (`DrawnFilmPage` in `src/direction/drawn-film.ts`), and captured.
 *
 * Everything read off the page is checked where it enters and refused as the film's, said where it stands: an address
 * it cannot reach, a global it lacks or gives in no form of one, a readiness that fails, a length in no form of one, a
 * fault it throws as it draws. What the page throws of itself, as it is made or waits, ends its readiness with that
 * fault, so a page that fails never leaves livereel waiting.
 */
import type { Browser as Playwright, Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import type { Size } from '../../domain/geometry.ts';
import type { OpenedDrawnPage } from '../../studio/ports.ts';
import { JPEG_QUALITY } from './stage.ts';
import { reached } from './watch.ts';

// The page draws as finely as it wants itself, so it is shot a page's pixel to a frame's
const A_PIXEL_A_PIXEL = 1;
// What the page answers livereel by, as a refusal names it
const THE_GLOBAL = 'globalThis.livereelDrawnFilm = { ready, duration, at }';
// A page answers livereel by its global once it has loaded: set as its script runs, before anything it waits on
const NO_ANSWER =
	`the film's page answers livereel by no ${THE_GLOBAL} once it has loaded: ` +
	'set it as its script runs, its ready a promise of what it waits on';

/** A drawn film's page opened in a tab of its own of the browser, the tab at the frame's size, and made ready. */
export async function drawnPageOpened(browser: Playwright, address: string, frame: Size): Promise<OpenedDrawnPage> {
	const page = await browser.newPage({ viewport: frame, deviceScaleFactor: A_PIXEL_A_PIXEL });
	const thrown = new FirstThrown(page);
	await reached(page, address);
	const fault = await page.evaluate(faultInTheGlobal);
	if (fault === MISSING) throw new FilmError(`${NO_ANSWER}${thrown.said()}`);
	if (fault !== null) throw new FilmError(`the film's page's livereelDrawnFilm ${fault}: it is ${THE_GLOBAL}`);
	try {
		await Promise.race([page.evaluate(madeReady), thrown.ending]);
	} catch (failed) {
		throw new FilmError(`the film's page failed to get ready: ${messageOf(failed)}`, { cause: failed });
	}
	const duration = await page.evaluate(lengthSaid);
	if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
		throw new FilmError(
			`the film's page says it is ${String(duration)} s long: it is a number of seconds, more than 0`
		);
	}
	return new OpenedDrawnChromium(browser, page, duration);
}

/** What a page throws of itself: the first fault, and a promise that fails with it, ending a wait on the page. */
class FirstThrown {
	readonly ended = Promise.withResolvers<never>();
	readonly ending: Promise<never> = this.ended.promise;
	first: Error | undefined;

	constructor(page: Page) {
		// Heard here too, so a fault met while nothing waits on it is not one Node takes as unheard
		this.ending.catch(() => undefined);
		page.on('pageerror', (fault) => this.heard(fault));
	}

	heard(fault: Error): void {
		this.first ??= fault;
		this.ended.reject(fault);
	}

	/** The first fault the page threw, said after a refusal; nothing where it threw none. */
	said(): string {
		return this.first === undefined ? '' : `; it threw: ${this.first.message}`;
	}
}

class OpenedDrawnChromium implements OpenedDrawnPage {
	readonly browser: Playwright;
	readonly page: Page;
	readonly duration: number;

	constructor(browser: Playwright, page: Page, duration: number) {
		this.browser = browser;
		this.page = page;
		this.duration = duration;
	}

	async drawAt(seconds: number): Promise<void> {
		try {
			await this.page.evaluate(drawnAt, seconds);
		} catch (fault) {
			throw new FilmError(`the film's page failed to draw at ${String(seconds)} s: ${messageOf(fault)}`, {
				cause: fault
			});
		}
	}

	capture(): Promise<Uint8Array> {
		return this.page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY });
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.browser.close();
	}
}

function messageOf(fault: unknown): string {
	return fault instanceof Error ? fault.message : String(fault);
}

// What the page says is wrong with its global: there is none
const MISSING = 'missing';

/**
 * In the page: what is wrong with the global it answers livereel by, `missing` where it has none; null where nothing.
 */
function faultInTheGlobal(): string | null {
	// `MISSING`, written here again as a function handed to the page calls nothing of its module
	const missing = 'missing';
	if (!('livereelDrawnFilm' in window)) return missing;
	const film: unknown = (window as unknown as { livereelDrawnFilm: unknown }).livereelDrawnFilm;
	if (typeof film !== 'object' || film === null) return `is ${String(film)}`;
	const { ready, at } = film as { ready?: unknown; at?: unknown };
	const readyThen = typeof ready === 'object' && ready !== null ? (ready as { then?: unknown }).then : undefined;
	if (typeof readyThen !== 'function') return 'has a ready that is no promise';
	if (typeof at !== 'function') return 'has an at that is no function';
	return null;
}

/** In the page: settled once the page says it is ready. */
async function madeReady(): Promise<void> {
	await (window as unknown as { livereelDrawnFilm: { ready: Promise<void> } }).livereelDrawnFilm.ready;
}

/** In the page: how long it says the film is, read once it is ready. */
function lengthSaid(): unknown {
	return (window as unknown as { livereelDrawnFilm: { duration: unknown } }).livereelDrawnFilm.duration;
}

/** In the page: the frame drawn at a moment, settled. */
async function drawnAt(seconds: number): Promise<void> {
	await (window as unknown as { livereelDrawnFilm: { at: (moment: number) => unknown } }).livereelDrawnFilm.at(seconds);
}
