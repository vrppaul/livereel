// A film shot for real, in a browser, of a page on the disk: the frames it keeps, its one still, keys typed into it
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { chromium } from 'playwright-core';
import { expect, test } from 'vitest';
import { Chromium, type Renderer } from '../../src/adapters/browser/chromium.ts';
import { PlaywrightPage } from '../../src/adapters/browser/page.ts';
import { roomOpened } from '../../src/adapters/browser/room.ts';
import type { PlaywrightPicturedStage } from '../../src/adapters/browser/stage.ts';
import { ANSWERED_WITHIN_MILLISECONDS, CommandServer } from '../../src/adapters/server.ts';
import { blended } from '../../src/adapters/video/exposures.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { StillFootage } from '../../src/adapters/video/still.ts';
import { ZOOM_AT_MOST } from '../../src/domain/camera.ts';
import { FilmError, SetupError, TakeError } from '../../src/domain/errors.ts';
import type { Box, Size } from '../../src/domain/geometry.ts';
import { type Shooting, shoot } from '../../src/studio/shoot.ts';
import type { Exposures, Filmed, Footage, FramesHanded, Opened, PicturedStage } from '../../src/studio/ports.ts';
import { type BlockHolding, ownPageOf } from '../../src/direction/page.ts';
import { FILMS_FOLDER, NO_SET } from './app.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import {
	type ActContext,
	type Step,
	type Theme,
	act,
	camera,
	cut,
	defineFilm,
	hold,
	keystrokes,
	light,
	look,
	page,
	picture,
	piece,
	play,
	screen,
	thing,
	typing,
	window
} from 'livereel';

const PAGE = new URL('./page.html', import.meta.url).href;
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };
// The films' rate: each frame a thirtieth of a second, as the counts of frames below are written
const RATE = 30;
const FIELD = '[data-testid=field]';
const TYPED = 'hello';
// A short command typed evenly, ten letters a second
const LS = keystrokes('ls', { lettersPerSecond: 10 });
// A film that shows no page of its own, opened as a take opens it; a page of the film's own, and a block only it has
const NO_OWN_PAGES: readonly never[] = [];
// A film that shows no picture of its own
const NO_PICTURES: readonly never[] = [];
const OWN_PAGE = { html: '<!doctype html><body style="margin: 0"><h2 id="ours" style="margin: 60px">Ours</h2></body>' };
const ONLY_OURS = '#ours';
// The window leant back and swung, as the room places it by the engine's matrix
const LEANT = { tilt: 12, turn: -7 };
// Frames handed on scaled to the frame's own size, as a video keeps them, or as sharp as drawn, as a still keeps its
// frame; a film shot at twice the frame's size each way, and its frame at that size
const SCALED: FramesHanded = 'scaled';
const SHARP: FramesHanded = 'sharp';
const TWICE = 2;
const TWICE_THE_FRAME = { width: 640, height: 640 };
// A card of the film's things module, as wide as half a frame 1080 high and a third as tall, about the frame's middle
const A_CARD = { at: 'whole', reach: { width: 540, height: 360 }, values: { turn: 0 } } as const;

// What a film is told where the graphics card drops the room's canvas
const CANVAS_DROPPED =
	"the graphics card dropped the room's canvas, which draws nothing after: it ran out of memory, or was reset; shoot " +
	'again, or ask less of it, at `--quality draft` or a smaller format, or with fewer things near the eye';

/** What a film that shows a thing its module builds none of is told, as its first step begins. */
function unbuiltRefusalOf(made: string): TakeError {
	return new TakeError(
		new FilmError(
			`thing.show shows ${made}, which the film's things module builds none of: draw the film as a room, name its things module, and export a builder of ${made} from it`
		),
		0,
		1
	);
}
// The films here name pages on the disk and no command, so it starts nothing
const SERVER = new CommandServer(import.meta.dirname, ANSWERED_WITHIN_MILLISECONDS);

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

/** Footage that keeps each frame's own image, as the take hands it. */
class ImagesKept implements Footage {
	readonly images: Uint8Array[] = [];

	expect(): void {}

	keeps(): boolean {
		return true;
	}

	keep(_shot: number, exposures: Exposures): Promise<void> {
		this.images.push(exposures.own);
		return Promise.resolve();
	}

	complete(): boolean {
		return false;
	}
}

/** An image's size, as ffprobe reads it. */
async function sizeOf(image: Uint8Array): Promise<Size> {
	const file = join(await scratch(), 'frame.jpg');
	await writeFile(file, image);
	const { stdout } = await promisify(execFile)('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'stream=width,height',
		'-of',
		'json',
		file
	]);
	const [stream] = (JSON.parse(stdout) as { streams: Size[] }).streams;
	return { width: stream!.width, height: stream!.height };
}

function filmOf(steps: readonly Step[]) {
	return filmWritten(steps, {});
}

/**
 * A film of these steps with what else it is written with: how its page is asked to look, what it blurs, its theme,
 * whether it is dynamic, framed live, or static, in a tab of its own, and whether it is drawn as a room.
 */
function filmWritten(
	steps: readonly Step[],
	written: {
		colourScheme?: 'dark';
		blurred?: readonly string[];
		theme?: Theme;
		fonts?: Readonly<Record<string, string>>;
		page?: 'dynamic';
		drawing?: 'room';
		things?: string;
	}
) {
	return defineFilm({
		formats: { small: SMALL },
		address: PAGE,
		ready: (context) => context.page.locator('h1').waitFor(),
		steps: () => steps,
		framesPerSecond: RATE,
		...written
	}).formats.get('small')!;
}

/**
 * A film shot in Chromium, drawn by the renderer, at the frame's own size into this footage, each frame exposed once,
 * its sounds heard by nobody.
 */
function shootingInto(footage: Footage, renderer: Renderer): Shooting {
	return {
		server: SERVER,
		set: NO_SET,
		browser: new Chromium(renderer, WARNED_TO_NOBODY, FILMS_FOLDER),
		footage,
		track: SILENT,
		quality: { sharpness: 1, blurred: false, framesHanded: SCALED }
	};
}

/** A film shot as `shootingInto` shoots it, a fast camera blurred as the film says. */
function blurredShootingInto(footage: Footage, renderer: Renderer): Shooting {
	return { ...shootingInto(footage, renderer), quality: { sharpness: 1, blurred: true, framesHanded: SCALED } };
}

/** A film shot as `shootingInto` shoots it, at twice the frame's size each way, its frames handed on so. */
function sharpShootingInto(footage: Footage, framesHanded: FramesHanded): Shooting {
	return { ...shootingInto(footage, 'gpu'), quality: { sharpness: TWICE, blurred: false, framesHanded } };
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

test("a film drawn as a room is shot, every frame kept, in software or on the graphics card, where a fast camera's frame is one image, its exposures composed at once", async () => {
	const inSoftware = new EveryFrameCounted();
	const onTheCard = new EveryFrameCounted();
	const film = filmWritten([play({ seconds: 0.2, moves: [camera.onto('h1'), window.lean(LEANT)] })], {
		drawing: 'room'
	});
	await shoot(film, shootingInto(inSoftware, 'software'));
	await shoot(film, blurredShootingInto(onTheCard, 'gpu'));
	expect([inSoftware.kept, onTheCard.kept, Math.max(...onTheCard.images)]).toEqual([
		[0, 1, 2, 3, 4, 5],
		[0, 1, 2, 3, 4, 5],
		1
	]);
});

test("a room hands a video its frames scaled down to the frame's own size, and a still its frame as sharp as it is drawn", async () => {
	const scaled = new ImagesKept();
	const sharp = new ImagesKept();
	const film = filmWritten([hold({ seconds: 0.05 })], { drawing: 'room' });
	await shoot(film, sharpShootingInto(scaled, SCALED));
	await shoot(film, sharpShootingInto(sharp, SHARP));
	expect([await sizeOf(scaled.images[0]!), await sizeOf(sharp.images[0]!)]).toEqual([SMALL.frame, TWICE_THE_FRAME]);
});

test("a film's things are built by its module and drawn in the room, every frame kept, in software or on the graphics card, as they come up, turn and move", async () => {
	const inSoftware = new EveryFrameCounted();
	const onTheCard = new EveryFrameCounted();
	const steps = [
		play({ seconds: 0.1, moves: [thing.show('card', { ...A_CARD, inside: 'world' })] }),
		play({ seconds: 0.1, moves: [thing.set({ turn: 1 }), thing.to('whole', { depth: 400 })] })
	];
	const film = filmWritten(steps, { drawing: 'room', things: './things.js' });
	await shoot(film, shootingInto(inSoftware, 'software'));
	await shoot(film, blurredShootingInto(onTheCard, 'gpu'));
	expect([inSoftware.kept, onTheCard.kept]).toEqual([
		[0, 1, 2, 3, 4, 5],
		[0, 1, 2, 3, 4, 5]
	]);
});

test("a thing is refused as it begins where flat draws the film, which loads no things module, and where the film's module builds none of it", async () => {
	const shown = [play({ seconds: 0.1, moves: [thing.show('card', A_CARD)] })];
	const unbuilt = [play({ seconds: 0.1, moves: [thing.show('sheen', A_CARD)] })];
	await expect(shoot(filmWritten(shown, {}), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		unbuiltRefusalOf('card')
	);
	const room = filmWritten(unbuilt, { drawing: 'room', things: './things.js' });
	await expect(shoot(room, shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		unbuiltRefusalOf('sheen')
	);
});

test("a film's things module that exports no builders is refused as the stage opens", async () => {
	const film = filmWritten([hold({ seconds: 0.1 })], { drawing: 'room', things: './no-things.js' });
	await expect(shoot(film, shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		new FilmError(
			"the film's things module exports no builders by default: export default { card: { build(three) {...}, set(built, values, shown, three) {...} } }"
		)
	);
});

test("a picture of the film's that is not there, or that decodes to no picture, is refused before the first frame", async () => {
	const missing = filmWritten([cut(picture.show('missing.png')), hold({ seconds: 0.1 })], {});
	const unreadable = filmWritten([cut(picture.show('not-a-picture.png')), hold({ seconds: 0.1 })], {});
	const counted = new EveryFrameCounted();
	await expect(shoot(missing, shootingInto(counted, 'software'))).rejects.toThrow(
		"the film's picture missing.png could not be read"
	);
	await expect(shoot(unreadable, shootingInto(counted, 'software'))).rejects.toThrow(
		new FilmError(
			"the film's picture not-a-picture.png decodes to no picture with a size: give a PNG, JPEG, WebP, AVIF or GIF file, or an SVG that names its width and height"
		)
	);
	expect(counted.kept).toEqual([]);
});

test('a film drawn as a room in software is shot with a word that the graphics card draws it faster', async () => {
	const warned: string[] = [];
	const film = filmWritten([hold({ seconds: 0.1 })], { drawing: 'room' });
	await shoot(film, {
		...shootingInto(new EveryFrameCounted(), 'software'),
		browser: new Chromium('software', (said) => warned.push(said), FILMS_FOLDER)
	});
	expect(warned).toEqual([
		'the room is drawn in software, where a frame takes about 150 times as long to draw as on a graphics card: --renderer gpu draws it on the card, where the machine has one'
	]);
});

test("the room is refused as the machine's to put right where the browser draws no element into WebGL", async () => {
	const withoutTheRoomsFlag = await chromium.launch();
	try {
		const opened = roomOpened(await withoutTheRoomsFlag.newPage(), null);
		await expect(opened).rejects.toThrow(
			new SetupError(
				"the room draws the stage through Chrome's HTML-in-Canvas, which this browser lacks: the browser livereel pins has it, installed by `npx livereel setup`"
			)
		);
	} finally {
		await withoutTheRoomsFlag.close();
	}
});

test("a room whose canvas the graphics card drops ends the shoot at that frame as the machine's to put right, naming the moment, and keeps no frame drawn without it", async () => {
	// The hold's three frames and the play's first, which drops the canvas once drawn; the next finds it dropped
	const keptBeforeTheDrop = [0, 1, 2, 3];
	const counted = new EveryFrameCounted();
	const steps = [hold({ seconds: 0.1 }), play({ seconds: 0.1, moves: [thing.show('dropper', A_CARD)] })];
	const film = filmWritten(steps, { drawing: 'room', things: './canvas-lost.js' });
	await expect(shoot(film, shootingInto(counted, 'gpu'))).rejects.toThrow(
		new TakeError(new SetupError(CANVAS_DROPPED), keptBeforeTheDrop.length / RATE, 2)
	);
	expect(counted.kept).toEqual(keptBeforeTheDrop);
});

test('a still is the one frame written, and nothing after it is shot', async () => {
	const directory = await scratch();
	const footage = new StillFootage(join(directory, 'still.jpg'), 0.1, RATE, blended);
	const shot = await shoot(filmOf([play({ seconds: 0.2 })]), shootingInto(footage, 'software'));
	expect([await readdir(directory), shot.frames]).toEqual([['still.jpg'], 4]);
});

test("a block only a page of the film's own has is framed while the screen shows that page, and the filmed page is acted on behind it, in its own tab or framed live", async () => {
	const values: string[] = [];
	const steps = [
		cut(screen.shows(OWN_PAGE)),
		play({ seconds: 0.2, moves: [camera.onto(ONLY_OURS)] }),
		act((context: ActContext) => context.page.locator(FIELD).fill(TYPED)),
		act(async (context: ActContext) => {
			values.push(await context.page.locator(FIELD).inputValue());
		}),
		play({ seconds: 0.1, moves: [screen.shows('filmed', { within: { start: 0.5 } })] })
	];
	const inItsOwnTab = await shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	const framedLive = await shoot(
		filmWritten(steps, { page: 'dynamic' }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	expect([inItsOwnTab.frames, framedLive.frames, values]).toEqual([9, 9, [TYPED, TYPED]]);
});

test('a piece holding the picture of its block it was lifted with is shot as the page changes under it, every frame kept', async () => {
	const footage = new EveryFrameCounted();
	const steps = [
		cut(piece.show(FIELD, { picture: 'held' })),
		act((context: ActContext) => context.page.locator(FIELD).fill(TYPED)),
		play({ seconds: 0.1, moves: [piece.to('whole')] })
	];
	const shot = await shoot(filmOf(steps), shootingInto(footage, 'software'));
	expect([shot.frames, footage.kept]).toEqual([3, [0, 1, 2]]);
});

test("a piece drawn past livereel's bound is shot whole as the page changes under it, every frame kept", async () => {
	const footage = new EveryFrameCounted();
	const steps = [
		cut(piece.show(FIELD)),
		play({ seconds: 0.1, moves: [piece.to('whole')] }),
		act((context: ActContext) => context.page.locator(FIELD).fill(TYPED)),
		hold({ seconds: 0.1 })
	];
	const shot = await shoot(filmOf(steps), shootingInto(footage, 'software'));
	expect([shot.frames, footage.kept]).toEqual([6, [0, 1, 2, 3, 4, 5]]);
});

// A page of the film's own 3040 pixels tall, 2720 longer than the screen: a block 2000 down it
const TALL_OWN_PAGE = {
	html: '<!doctype html><body style="margin: 0"><div style="height: 2000px"></div><h2 id="far" style="margin: 0; height: 40px">Far</h2><div style="height: 1000px"></div></body>'
};

test("a block a page of the film's own is brought to rest by is measured down its document, wherever the page has run", async () => {
	// The page run some 600 down by 0.2 s; #far 800 above the screen's top asks it 2800 down, past its 2720
	const steps = [
		cut(screen.shows(TALL_OWN_PAGE), screen.scrolls(TALL_OWN_PAGE, { pace: 3000 })),
		hold({ seconds: 0.2 }),
		play({ seconds: 0.1, moves: [screen.scrollTo(TALL_OWN_PAGE, '#far', { top: -800 })] })
	];
	await expect(shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		"screen.scrollTo would bring #far -800 pixels below the screen's top with its page scrolled 2800 down, and it scrolls from 0 to 2720: name a top it reaches"
	);
});

test("a block of a page of the film's own is measured where its copy was last stood, whatever frame the stage last drew", async () => {
	// The page stood 1500 down: #far, 2000 down its document, 500 below the screen's top; no frame drawn stood it at 0
	const tall = ownPageOf(TALL_OWN_PAGE.html, false);
	const setting = { ...filmOf([]), ownPages: [tall], pictures: NO_PICTURES, framesHanded: SCALED };
	await using opened = await new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER).open(setting, liveAt(PAGE), 1);
	await opened.ownPages.stand({ key: tall.key, scrolled: 1500, typed: [], blinking: [] });
	expect((await opened.ownPages.laid.get(tall.key)!.box('#far', 1)).top).toBe(500);
});

test("a typing into a block a page of the film's own lacks, into one that holds elements of its own, or into an input, which shows its value, not its text, is refused as it begins, naming the block; a text area shows its text", async () => {
	// In the first film's act, the filmed page's input and a text area laid beside it are written as the stage writes a
	// block typed into, measured as a page of the film's own is, and what each shows is read back
	const measured: (BlockHolding | string)[] = [];
	const fieldsMeasured = act(async (context: ActContext) => {
		const read = new PlaywrightPage(context.page, context.page.page().keyboard);
		await context.page.locator('body').evaluate((body, typed) => {
			const area = document.createElement('textarea');
			area.id = 'area';
			body.append(area);
			area.textContent = typed;
			body.querySelector('input')!.textContent = typed;
		}, '/review-ui');
		measured.push(
			await read.holdingOf(FIELD),
			await read.holdingOf('#area'),
			await context.page.locator(FIELD).inputValue(),
			await context.page.locator('#area').inputValue()
		);
	});
	const intoNothing = [
		fieldsMeasured,
		cut(screen.shows(OWN_PAGE)),
		...typing(screen.type(OWN_PAGE, LS, { into: '#nowhere' }))
	];
	const intoItsBody = [cut(screen.shows(OWN_PAGE)), ...typing(screen.type(OWN_PAGE, LS, { into: 'body' }))];
	await expect(shoot(filmOf(intoNothing), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		'no HTML element of the page matches #nowhere as a CSS selector'
	);
	await expect(shoot(filmOf(intoItsBody), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		'screen.type types into body, which holds elements of its own that what it types would take the place of: name a span of text alone, as <span id="typed"></span> beside <span class="caret"></span>'
	);
	expect(measured).toEqual(['its value', 'text alone', '', '/review-ui']);
});

// A page of the film's own drawing a shape, an SVG element, whose opacity the stage cannot set on its own style
const PAGE_WITH_A_SHAPE = {
	html: '<!doctype html><body><svg><rect class="shape" width="40" height="40"></rect></svg></body>'
};

test("a blink of a block a page of the film's own lacks, or of one that is no HTML element, as an SVG shape, is refused as it begins, naming the block", async () => {
	const blinking = (into: string) => [
		cut(screen.shows(PAGE_WITH_A_SHAPE)),
		cut(screen.blinks(PAGE_WITH_A_SHAPE, into, { seconds: 1 })),
		hold({ seconds: 0.1 })
	];
	await expect(shoot(filmOf(blinking('#nowhere')), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		'no HTML element of the page matches #nowhere as a CSS selector'
	);
	await expect(shoot(filmOf(blinking('.shape')), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		'no HTML element of the page matches .shape as a CSS selector'
	);
});

test("a page of the film's own that moves of itself is refused before the film is shot, naming how it begins", async () => {
	const spinning = '<style>h2 { animation: spin 1s infinite } @keyframes spin { to { rotate: 1turn } }</style>';
	const steps = [cut(screen.shows({ html: `${spinning}<h2>Spinning</h2>` }))];
	await expect(shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'))).rejects.toThrow(
		new FilmError(
			`the film's own page that begins ${JSON.stringify(spinning.slice(0, 60))} moves of itself, by an animation or a transition of its own, which no move of the film sets: take it out, and move what it shows with the film's moves`
		)
	);
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

test('a click at a moment of a play reaches the page while the camera goes on closing in, in its own tab or framed live', async () => {
	const values: string[] = [];
	const clicked = page.act((context: ActContext) => context.page.locator(FIELD).click(), { within: { start: 0.5 } });
	const steps = [
		play({ seconds: 0.2, moves: [camera.onto(FIELD), clicked] }),
		...typing(page.type(keystrokes(TYPED, { seed: 1 }))),
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

test('a font the film names that neither the machine has nor the film brings is refused before the first frame, as is a font file not there or read as no font; one whose file the film brings is shot', async () => {
	const counted = new EveryFrameCounted();
	const steps = [hold({ seconds: 0.1 })];
	await expect(
		shoot(filmWritten(steps, { theme: { font: 'Nowhere Sans' } }), shootingInto(counted, 'software'))
	).rejects.toThrow(
		new FilmError(
			`the film's theme's font is "Nowhere Sans": it names no font this machine has or the film brings: name its file in the film's fonts, { 'Inter Tight': './InterTight.ttf' }`
		)
	);
	await expect(
		shoot(filmWritten(steps, { fonts: { Missing: 'missing.ttf' } }), shootingInto(counted, 'software'))
	).rejects.toThrow("the film's font missing.ttf could not be read");
	await expect(
		shoot(filmWritten(steps, { fonts: { Unread: 'not-a-picture.png' } }), shootingInto(counted, 'software'))
	).rejects.toThrow(
		new FilmError("the film's font not-a-picture.png is read as no font: give a TrueType, OpenType or WOFF file")
	);
	const brought = await shoot(
		filmWritten(steps, { fonts: { 'Brought Sans': 'inter-tight-latin.ttf' }, theme: { font: 'Brought Sans' } }),
		shootingInto(counted, 'software')
	);
	expect([counted.kept, brought.frames]).toEqual([[0, 1, 2], 3]);
});

test("the ground's layers CSS reads are let through: a film whose theme lays a grid of dots and a gradient with a colour of its own over its ground is shot", async () => {
	const dotsAndLight =
		'radial-gradient(#ffffff26 2px, transparent 2.5px) 0 0 / 36px 36px, linear-gradient(115deg, #ffb22414, transparent 45%) #10141c';
	const footage = new EveryFrameCounted();
	const steps = [hold({ seconds: 0.1 })];
	const shot = await shoot(
		filmWritten(steps, { theme: { groundLayers: dotsAndLight } }),
		shootingInto(footage, 'software')
	);
	expect([shot.frames, footage.kept]).toEqual([3, [0, 1, 2]]);
});

test("the ground's layers in no form the stage draws are refused before the film is shot: broken, a colour on a layer not the last, a custom property set nowhere, a word CSS keeps for every property, a picture, in the film's theme and in a look's move", async () => {
	const broken = shoot(
		filmWritten([], { theme: { groundLayers: 'linear-gradient(#fff2 #0000)' } }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(broken).rejects.toThrow(
		`the film's theme's groundLayers is "linear-gradient(#fff2 #0000)": CSS reads no background layers there`
	);
	const colouredFirst = shoot(
		filmWritten([cut(look.to({ groundLayers: 'linear-gradient(#fff2, #0000) #123, none' }))], {}),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(colouredFirst).rejects.toThrow(
		`look.to's groundLayers is "linear-gradient(#fff2, #0000) #123, none": CSS reads no background layers there`
	);
	const named = shoot(
		filmWritten([], { theme: { groundLayers: 'var(--nowhere)' } }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(named).rejects.toThrow(
		`the film's theme's groundLayers is "var(--nowhere)": CSS reads no background layers there`
	);
	const inherited = shoot(
		filmWritten([], { theme: { groundLayers: 'inherit' } }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(inherited).rejects.toThrow(
		`the film's theme's groundLayers is "inherit": CSS reads no background layers there`
	);
	const pictured = shoot(
		filmWritten([], { theme: { groundLayers: 'url(dots.png)' } }),
		shootingInto(new EveryFrameCounted(), 'software')
	);
	await expect(pictured).rejects.toThrow(
		`the film's theme's groundLayers is "url(dots.png)": the ground draws no picture, only what CSS draws itself`
	);
});

test('a scroll of a block the page does not have is refused as its share begins, naming the block', async () => {
	const steps = [play({ seconds: 0.1, moves: [page.scrollTo('[data-testid=nowhere]', { top: 0 })] })];
	const shooting = shoot(filmOf(steps), shootingInto(new EveryFrameCounted(), 'software'));
	await expect(shooting).rejects.toThrow('nothing on the page matches [data-testid=nowhere]');
});

// A page whose blocks stand on grounds of their own: a card on a band tinted over the page's light ground, and a note on
// a dark band
const GROUNDS = new URL('./grounds.html', import.meta.url).href;

test('the ground behind a block is the first the blocks it stands in draw whole, a tint over it seen through, and white where none draws one', async () => {
	const grounds: string[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const read = new PlaywrightPage(context.page, context.page.page().keyboard);
			grounds.push(await read.groundBehind('[data-testid=card]'), await read.groundBehind('[data-testid=note]'));
			await context.page.locator('body').evaluate((body) => body.style.setProperty('background', 'none'));
			grounds.push(await read.groundBehind('[data-testid=card]'));
		})
	];
	const film = defineFilm({
		formats: { small: SMALL },
		address: GROUNDS,
		ready: (context) => context.page.locator('main').waitFor(),
		steps: () => steps
	}).formats.get('small')!;
	await shoot(film, shootingInto(new EveryFrameCounted(), 'software'));
	expect(grounds).toEqual(['#f6f7f9ff', '#123456ff', '#ffffffff']);
});

// A page of lines of code set in a monospace font past a padding, each a line tall: one whose markup is indented
// before a word of six letters in a larger font, spaced wider, a blank one and one holding text, alike but for that,
// and a hidden one
const LETTERS = new URL('./letters.html', import.meta.url).href;
const CODE = '[data-testid=code]';
const WORD = '[data-testid=word]';
const BLANK = '[data-testid=blank]';
const FILLED = '[data-testid=filled]';
const HIDDEN = '[data-testid=hidden]';
const LINES_OF_CODE = [CODE, BLANK, FILLED, HIDDEN];

// How many letters the word the block of code starts with holds
const LETTERS_IN_THE_WORD = 6;

/**
 * What a page of letters reads: the letter at the start of the block of code and the word it starts with; the letter
 * at the start of the blank block and of the one holding text, each from its block's top; and the letter at the start
 * of the hidden block.
 */
interface LettersRead {
	readonly code: Box;
	readonly word: Box;
	readonly blank: Box;
	readonly filled: Box;
	readonly hidden: Box | null;
}

/** How many changes to its document a page has handed a watch on it, which counts them as they come. */
interface ChangesSeen {
	changes: number;
}

test("the letter at the start of a block stands over its first laid-out letter, in that letter's font past indented markup, as wide as one steps, and where a blank block's would start; a hidden block lays out none", async () => {
	const read: LettersRead[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const page = new PlaywrightPage(context.page, context.page.page().keyboard);
			const blank = (await page.letterAtTheStart(BLANK))!;
			const filled = (await page.letterAtTheStart(FILLED))!;
			read.push({
				code: (await page.letterAtTheStart(CODE))!,
				word: await page.box(WORD, 1),
				blank: { ...blank, top: blank.top - (await page.box(BLANK, 1)).top },
				filled: { ...filled, top: filled.top - (await page.box(FILLED, 1)).top },
				hidden: await page.letterAtTheStart(HIDDEN)
			});
		})
	];
	await shoot(lettersFilm(steps), shootingInto(new EveryFrameCounted(), 'software'));
	const [{ code, word, blank, filled, hidden }] = read as [LettersRead];
	expect([code, blank, hidden]).toEqual([
		{ ...word, width: expect.closeTo(word.width / LETTERS_IN_THE_WORD, 1) },
		filled,
		null
	]);
});

// The same page's lines drawn larger: twice as large by a transform and by zoom, and five thirds as large by a
// transform whose matrix CSS writes in six figures, about letters an even count of pixels shorter than their line;
// each a line holding a word of three letters and a blank line
const DRAWN_LARGER: readonly LinesDrawnLarger[] = [
	{
		filled: '[data-testid=transformed-filled]',
		word: '[data-testid=transformed-word]',
		blank: '[data-testid=transformed-blank]'
	},
	{ filled: '[data-testid=zoomed-filled]', word: '[data-testid=zoomed-word]', blank: '[data-testid=zoomed-blank]' },
	{ filled: '[data-testid=thirds-filled]', word: '[data-testid=thirds-word]', blank: '[data-testid=thirds-blank]' }
];
const LETTERS_IN_A_WORD_DRAWN_LARGER = 3;
// How many decimals of a pixel a blank line's letter stands where a filled one's does: the six figures CSS writes a
// transform's matrix in leave it a hundred-thousandth off
const BLANK_AS_FILLED_TO = 3;

/** A line holding a word and a blank line, both drawn larger than the page lays them out. */
interface LinesDrawnLarger {
	readonly filled: string;
	readonly word: string;
	readonly blank: string;
}

/**
 * What a page reads of lines drawn larger: the letter at the start of the line holding a word, and the word; the
 * letter at the start of the blank line and of the filled one, each from its line's top.
 */
interface LargerRead {
	readonly letter: Box;
	readonly word: Box;
	readonly blank: Box;
	readonly filled: Box;
}

test("the letter at the start of a block the page draws larger, by a transform or by zoom, stands over its first letter as the page draws it, as wide as one steps there, and a blank block's as large where a filled one's starts", async () => {
	const read: LargerRead[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const page = new PlaywrightPage(context.page, context.page.page().keyboard);
			for (const lines of DRAWN_LARGER) {
				const letter = (await page.letterAtTheStart(lines.filled))!;
				const blank = (await page.letterAtTheStart(lines.blank))!;
				read.push({
					letter,
					word: await page.box(lines.word, 1),
					blank: { ...blank, top: blank.top - (await page.box(lines.blank, 1)).top },
					filled: { ...letter, top: letter.top - (await page.box(lines.filled, 1)).top }
				});
			}
		})
	];
	await shoot(lettersFilm(steps), shootingInto(new EveryFrameCounted(), 'software'));
	expect(read.map(({ letter, blank }) => ({ letter, blank }))).toEqual(
		read.map(({ word, filled }) => ({
			letter: { ...word, width: expect.closeTo(word.width / LETTERS_IN_A_WORD_DRAWN_LARGER, 1) },
			blank: {
				left: expect.closeTo(filled.left, BLANK_AS_FILLED_TO),
				top: expect.closeTo(filled.top, BLANK_AS_FILLED_TO),
				width: expect.closeTo(filled.width, BLANK_AS_FILLED_TO),
				height: expect.closeTo(filled.height, BLANK_AS_FILLED_TO)
			}
		}))
	);
});

test('measuring where letters start changes nothing in the page', async () => {
	const changes: number[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const page = new PlaywrightPage(context.page, context.page.page().keyboard);
			const seen = await context.page.evaluateHandle(watching);
			for (const line of LINES_OF_CODE) await page.letterAtTheStart(line);
			changes.push((await seen.jsonValue()).changes);
		})
	];
	await shoot(lettersFilm(steps), shootingInto(new EveryFrameCounted(), 'software'));
	expect(changes).toEqual([0]);
});

function lettersFilm(steps: readonly Step[]) {
	return defineFilm({
		formats: { small: SMALL },
		address: LETTERS,
		ready: (context) => context.page.locator('main').waitFor(),
		steps: () => steps
	}).formats.get('small')!;
}

/**
 * A watch on every change to the page's document from now on, a node added or taken out, a text or an attribute
 * changed, counting them as the page hands them on.
 */
function watching(): ChangesSeen {
	const seen = { changes: 0 };
	new MutationObserver((records) => {
		seen.changes += records.length;
	}).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
	return seen;
}

// A page whose column scrolls of itself, a row in it, and the page tall enough to scroll the column away
const SCROLLING = new URL('./scrolling.html', import.meta.url).href;

/** The keys a page reads off itself as a take keys blocks: blocks scrolled, and the blocks a row stands in. */
interface KeysRead {
	readonly byTheColumn: number;
	readonly byItsTestId: number;
	readonly toTheRow: number;
	readonly toTheColumn: number;
	readonly holdingTheRow: readonly number[];
	readonly underTheFirstRowsBox: readonly number[];
	readonly afterGoingOn: number;
}

test('the page keys a block alike however a film selects it, by a scroll of it, a scroll to a block it scrolls, and among the blocks one stands in, by its selector or a box of the screen; a block of a document the frame goes on to takes a new key', async () => {
	const read: KeysRead[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const page = new PlaywrightPage(context.page, context.page.page().keyboard);
			const byTheColumn = (await page.scrollCourse('#column', { kind: 'by', pixels: 10 })).block;
			const byItsTestId = (await page.scrollCourse('[data-testid=column]', { kind: 'by', pixels: 10 })).block;
			const toTheRow = (await page.scrollCourse('#row', { kind: 'to', top: 0 })).block;
			const toTheColumn = (await page.scrollCourse('#column', { kind: 'to', top: 0 })).block;
			const holdingTheRow = await page.blocksHolding('[data-testid=row]', 1);
			const underTheFirstRowsBox = await page.blocksHolding(await page.box('[data-testid=first]', 1), 1);
			await context.page.goto(SCROLLING);
			const afterGoingOn = (await page.scrollCourse('#column', { kind: 'by', pixels: 10 })).block;
			read.push({ byTheColumn, byItsTestId, toTheRow, toTheColumn, holdingTheRow, underTheFirstRowsBox, afterGoingOn });
		})
	];
	const film = defineFilm({
		formats: { small: SMALL },
		address: SCROLLING,
		ready: (context) => context.page.locator('#column').waitFor(),
		steps: () => steps
	}).formats.get('small')!;
	await shoot(film, shootingInto(new EveryFrameCounted(), 'software'));
	const [keys] = read;
	// Each row stands in the column, the body and the document's root, which scrolls the page; a box over the first row
	// rides the row shown at its middle too
	const [column, , root] = keys!.holdingTheRow;
	expect(keys).toEqual({
		byTheColumn: column,
		byItsTestId: column,
		toTheRow: column,
		toTheColumn: root,
		holdingTheRow: [column, expect.any(Number), root],
		underTheFirstRowsBox: [expect.any(Number), ...keys!.holdingTheRow],
		afterGoingOn: expect.toSatisfy((key: number) => !keys!.holdingTheRow.includes(key))
	});
});

/** The keys of the blocks whose scrolls carry blocks placed out of the column's flow, and a ride off the page refused. */
interface CarriersRead {
	readonly holdingTheRow: readonly number[];
	readonly holdingThePinnedRow: readonly number[];
	readonly underThePinnedRowsBox: readonly number[];
	readonly holdingTheTurnedRow: readonly number[];
	readonly holdingTheNote: readonly number[];
	readonly toTheNote: number;
	readonly offThePage: string;
}

// A box of the screen wholly above and left of it, where the page shows no block
const OFF_THE_PAGE = { left: -200, top: -200, width: 100, height: 100 };

test('a source rides the scrolls of the blocks the browser places it from alone: a row of a block fixed to the screen none, one fixed in a block turned by a transform that block and those it stands in, a note placed absolutely from the page the page alone, past the column round it, which a scroll to it leaves too; a box where the page shows no block is refused, naming it', async () => {
	const read: CarriersRead[] = [];
	const steps = [
		act(async (context: ActContext) => {
			const page = new PlaywrightPage(context.page, context.page.page().keyboard);
			read.push({
				holdingTheRow: await page.blocksHolding('[data-testid=row]', 1),
				holdingThePinnedRow: await page.blocksHolding('[data-testid=pinned-row]', 1),
				underThePinnedRowsBox: await page.blocksHolding(await page.box('[data-testid=pinned-row]', 1), 1),
				holdingTheTurnedRow: await page.blocksHolding('[data-testid=turned-row]', 1),
				holdingTheNote: await page.blocksHolding('[data-testid=placed]', 1),
				toTheNote: (await page.scrollCourse('[data-testid=placed]', { kind: 'to', top: 0 })).block,
				offThePage: await page.blocksHolding(OFF_THE_PAGE, 1).then(String, String)
			});
		})
	];
	const film = defineFilm({
		formats: { small: SMALL },
		address: SCROLLING,
		ready: (context) => context.page.locator('#column').waitFor(),
		steps: () => steps
	}).formats.get('small')!;
	await shoot(film, shootingInto(new EveryFrameCounted(), 'software'));
	const [keys] = read;
	// The row stands in the column, the body and the document's root, which scrolls the page; the pinned row in its
	// block alone, a box over it in the row shown at its middle too; the turned row in its turned block, then as the row
	const [column, body, root] = keys!.holdingTheRow;
	expect(keys).toEqual({
		holdingTheRow: [column, body, root],
		holdingThePinnedRow: [expect.toSatisfy((key: number) => !keys!.holdingTheRow.includes(key))],
		underThePinnedRowsBox: [expect.any(Number), ...keys!.holdingThePinnedRow],
		holdingTheTurnedRow: [expect.any(Number), column, body, root],
		holdingTheNote: [body, root],
		toTheNote: root,
		offThePage: String(new FilmError(`the page shows no block at the middle of box ${JSON.stringify(OFF_THE_PAGE)}`))
	});
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
		address: TIMED,
		ready: (context) => context.page.locator(SAID_READY).waitFor(),
		steps: () => steps,
		framesPerSecond: RATE,
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

test('a timer the page sets at a speed of 4 runs out in a quarter of its delay into the film, in its own tab or framed live', async () => {
	const echoed: string[] = [];
	// Typed at four times the film's speed, then read 0.05 s and 0.1 s into the film after: the page's 0.3 s are up at
	// 0.075 s
	const steps = [
		cut(page.speed(4)),
		typedIn,
		hold({ seconds: 0.05 }),
		echoRead(echoed),
		hold({ seconds: 0.05 }),
		echoRead(echoed)
	];
	await shoot(timedFilmOf(steps, {}), shootingInto(new EveryFrameCounted(), 'software'));
	await shoot(timedFilmOf(steps, { page: 'dynamic' }), shootingInto(new EveryFrameCounted(), 'software'));
	expect(echoed).toEqual(['', TYPED, '', TYPED]);
});

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
		browser: new Chromium('software', (line: string) => warned.push(line), FILMS_FOLDER)
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
	const setting = { ...timedFilmOf([], {}), ownPages: NO_OWN_PAGES, pictures: NO_PICTURES, framesHanded: SCALED };
	await using opened = await new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER).open(setting, liveAt(TIMED), 1);
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

// A page of lines as dense as code, on a screen as large as a film's, its pixel a picture's at a zoom of 1; and a
// camera that shows the screen at its own size
const DENSE = new URL('./dense.html', import.meta.url).href;
const WIDE = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
const DENSE_FILM = defineFilm({
	formats: { wide: WIDE },
	address: DENSE,
	ready: (context) => context.page.locator('[data-testid=lines]').waitFor(),
	steps: () => []
}).formats.get('wide')!;
const AT_ITS_SIZE = 1;

test("a dense page's picture, taken as sharp as livereel's closest camera needs and too large for a custom property as a data URL, is the one every piece of the page is drawn from", async () => {
	await using opened = await denseOpened();
	const stage = opened.stage as PlaywrightPicturedStage;
	await stage.retakePage(ZOOM_AT_MOST);
	expect(await stage.page.evaluate(pictureDrawnFrom)).toEqual({
		width: Math.round(WIDE.screen.width * ZOOM_AT_MOST),
		height: Math.round(WIDE.screen.height * ZOOM_AT_MOST)
	});
});

test("a page's picture taken anew takes the place of the last, which the stage lets go", async () => {
	await using opened = await denseOpened();
	const stage = opened.stage as PlaywrightPicturedStage;
	await stage.retakePage(ZOOM_AT_MOST);
	const first = await stage.page.evaluate(pictureHeld);
	await stage.retakePage(AT_ITS_SIZE);
	expect(await stage.page.evaluate(pictureDrawnFrom)).toEqual(WIDE.screen);
	await expect(stage.page.evaluate(fetchedAgain, first)).rejects.toThrow('Failed to fetch');
});

// A screen whose picture at livereel's closest would be taller than a JPEG holds, on a frame where a page's pixel takes
// one of a picture's at a zoom of 1
const PAST_A_JPEG = { frame: { width: 1080, height: 1080 }, screen: { width: 200, height: 30_000 } };
const JPEG_SIDE = 65_500;
const TALL_FILM = defineFilm({
	formats: { tall: PAST_A_JPEG },
	address: PAGE,
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => []
}).formats.get('tall')!;

test("a picture of a screen taller at livereel's closest than a JPEG holds is taken as close as one holds it, the person told once that it is drawn softer", async () => {
	const warned: string[] = [];
	const browser = new Chromium('software', (said) => warned.push(said), FILMS_FOLDER);
	await using opened = await browser.open(
		{ ...TALL_FILM, ownPages: NO_OWN_PAGES, pictures: NO_PICTURES, framesHanded: SCALED },
		liveAt(PAGE),
		1
	);
	const stage = opened.stage as PlaywrightPicturedStage;
	await stage.retakePage(ZOOM_AT_MOST);
	await stage.retakePage(ZOOM_AT_MOST);
	expect([(await stage.page.evaluate(pictureDrawnFrom)).height, warned]).toEqual([
		JPEG_SIDE,
		[
			'a picture of 200 × 30000 px of the screen is taken as close as a camera at a zoom of 2.18, not the 2.2 asked, as a JPEG holds no more than 65500 px on a side: a camera or a piece closer than 2.18 shows it softer, and pictures taken short after it are not said'
		]
	]);
});

/** The dense page in a tab of its own, the stage showing its pictures at the draft's sharpness. */
function denseOpened(): Promise<Opened> {
	return new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER).open(
		{ ...DENSE_FILM, ownPages: NO_OWN_PAGES, pictures: NO_PICTURES, framesHanded: SCALED },
		liveAt(DENSE),
		1
	);
}

/** A static page on the disk, filmed live. */
function liveAt(address: string): Filmed {
	return { kind: 'static', address };
}

/** The size of the picture the stage's root holds for its pieces of the page to be drawn from, run in the stage. */
async function pictureDrawnFrom(): Promise<Size> {
	const held = getComputedStyle(document.documentElement).getPropertyValue('--page-picture');
	const picture = new Image();
	picture.src = held.slice('url("'.length, -'")'.length);
	await picture.decode();
	return { width: picture.naturalWidth, height: picture.naturalHeight };
}

/** The picture the stage's root holds for its pieces of the page to be drawn from, as CSS writes it, run in the stage. */
function pictureHeld(): string {
	return getComputedStyle(document.documentElement).getPropertyValue('--page-picture');
}

/** A picture held as CSS writes it fetched again by its address, run in the stage: refused once the address is let go. */
async function fetchedAgain(held: string): Promise<void> {
	await fetch(held.slice('url("'.length, -'")'.length));
}
