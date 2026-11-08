// A film its own page draws, shot against a page and a browser that keep what they are asked: which moments are drawn,
// what is kept, and in which order the page and its server are let go
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import type { Size } from '../../src/domain/geometry.ts';
import type { DrawnFilmInFormat } from '../../src/direction/drawn-film.ts';
import type { Serving } from '../../src/direction/film.ts';
import type { DrawnBrowser, OpenedDrawnPage } from '../../src/studio/ports.ts';
import { shootDrawn } from '../../src/studio/draw.ts';
import { StillFootage } from '../../src/adapters/video/still.ts';
import { FootageOf } from './fakes.ts';

// A film a second long at 30 frames a second, on a small frame
const ONE_SECOND = 1;
const RATE = 30;
const FRAME: Size = { width: 320, height: 320 };
const AN_IMAGE = new Uint8Array([1]);
const PAGE_CLOSED = 'page closed';
const SERVER_STOPPED = 'server stopped';

/** A page that draws nothing but keeps each moment it is asked to draw, and says when it is let go. */
class PageThatKeeps implements OpenedDrawnPage {
	readonly duration = ONE_SECOND;
	readonly drawn: number[] = [];
	readonly happened: string[];

	constructor(happened: string[]) {
		this.happened = happened;
	}

	drawAt(seconds: number): Promise<void> {
		this.drawn.push(seconds);
		return Promise.resolve();
	}

	capture(): Promise<Uint8Array> {
		return Promise.resolve(AN_IMAGE);
	}

	[Symbol.asyncDispose](): Promise<void> {
		this.happened.push(PAGE_CLOSED);
		return Promise.resolve();
	}
}

/** A browser that opens the one page it holds. */
class BrowserOf implements DrawnBrowser {
	readonly page: PageThatKeeps;

	constructor(page: PageThatKeeps) {
		this.page = page;
	}

	openDrawn(): Promise<OpenedDrawnPage> {
		return Promise.resolve(this.page);
	}
}

/** The drawn film, its server saying when it stops. */
function filmServed(happened: string[]): DrawnFilmInFormat {
	const serving: Serving = {
		address: 'http://127.0.0.1/film.html',
		[Symbol.asyncDispose]: () => Promise.resolve(void happened.push(SERVER_STOPPED))
	};
	return {
		kind: 'drawn',
		formatName: 'small',
		format: { frame: FRAME },
		framesPerSecond: RATE,
		serve: () => Promise.resolve(serving)
	};
}

test('a drawn film draws the frames its footage keeps alone, each at its moment, and stops past the last', async () => {
	const happened: string[] = [];
	const page = new PageThatKeeps(happened);
	const footage = new FootageOf([3, 4]);
	const shot = await shootDrawn(filmServed(happened), new BrowserOf(page), footage);
	expect([page.drawn, footage.kept, footage.exposed, shot.frames]).toEqual([[3 / RATE, 4 / RATE], [3, 4], [1, 1], 5]);
});

test("a drawn film's page is let go before its server stops", async () => {
	const happened: string[] = [];
	await shootDrawn(filmServed(happened), new BrowserOf(new PageThatKeeps(happened)), new FootageOf([0]));
	expect(happened).toEqual([PAGE_CLOSED, SERVER_STOPPED]);
});

test('a still past the end of a drawn film is refused with the length its page says, before any frame is drawn', async () => {
	const page = new PageThatKeeps([]);
	const still = new StillFootage('still.jpg', 2, RATE, () => Promise.resolve(AN_IMAGE));
	await expect(shootDrawn(filmServed([]), new BrowserOf(page), still)).rejects.toThrow(
		new FilmError('the film is 1.0 s long (30 frames): there is no frame at 2 s')
	);
	expect(page.drawn).toEqual([]);
});
