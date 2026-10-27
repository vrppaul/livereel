/**
 * Chromium with the stage open in it and the filmed page in the stage's frame, for one take.
 *
 * The stage stands apart from the app, a file of the package (`stage/stage.html`), or inside it, on the app's own
 * address, where the film asks for it (`inside.ts`). Apart, the page is framed as it comes and nothing of its answers
 * is touched: a redirect lands in the frame, and a page that refuses to be framed is refused, its refusal named
 * (`watch.ts`). Chrome's Local Network Access checks stay on, and every page is granted `local-network-access`, as a
 * live app is filmed for what its server says: a page left as it came hears what its server on this machine pushes
 * down a WebSocket even without it, but one the stage inside the app answers anew hears nothing until granted it
 * (measured 2026-10-27; held by `tests/smoke/inside.test.ts`). It is granted on the stage apart too, so a page of a
 * public site that asks this machine is heard as it was while the checks were turned off; that is not measured.
 *
 * The page is framed live, not shown on the stage as a picture taken in a tab of its own: that took every frame a
 * second capture, at the finest 347 ms against 202 a frame on the whole screen and 937 against 194 close up (measured
 * 2026-10-27). The page's own motion is stilled, by the reduced motion it is asked for, so every move in the film is
 * the film's. Launched headless, Playwright starts Chromium's headless shell, which draws every frame in software unless asked to draw on the graphics card,
 * through ANGLE onto the system's own graphics interface; it stays headless, and needs no screen. On Linux, Vulkan
 * reached an Intel Iris Xe with no screen named, and the promo, wide and blurred, took 271 s against 495 s in
 * software, its frames alike (SSIM 0.998 on average, 0.996 at the least; measured 2026-10-26). Metal on macOS and
 * Direct3D 11 on Windows are untried. Where it reaches no graphics card, the shell draws in software all the same:
 * where Vulkan finds no driver at all, through SwiftShader, WebGL drawn; where it finds Mesa's software Vulkan alone
 * (lavapipe), the page has no WebGL (both measured on Linux 2026-10-27). The person is warned, as Chrome tells it, and
 * the film is shot. A page that cannot be reached, or refuses its frame, is refused as the frame opens it, by why,
 * rather than when the film first waits on it.
 */
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { SetupError } from '../../domain/errors.ts';
import type { Format } from '../../domain/geometry.ts';
import type { StagePlace } from '../../direction/film.ts';
import type { ActContext, PageMotionSwitch } from '../../direction/page.ts';
import type { Browser, Opened } from '../../studio/ports.ts';
import { stagedInside } from './inside.ts';
import { PlaywrightPage } from './page.ts';
import { BrowserStage, type Opening, STAGE_FOLDER, STAGE_PAGE, openPage, roomOf, setUpStage } from './stage.ts';
import { FrameWatch } from './watch.ts';
import type { Warn } from './warn.ts';

const NAVIGATED = 'framenavigated';
// What the filming browser is granted, so a page hears its server on this machine: why is the module's comment
const LOCAL_NETWORK = 'local-network-access';
// What Playwright says when the browser it is asked for was never downloaded
const NO_BROWSER = "Executable doesn't exist";
const COLOUR_SCHEME = 'light';
// The flag naming the graphics interface ANGLE draws through, and that interface on each system's card, by Node's
// name for the system
const USE_ANGLE = '--use-angle=';
const CARD_INTERFACES = { linux: 'vulkan', darwin: 'metal', win32: 'd3d11' } as const;
// Chrome's compositing as CDP's `SystemInfo.getInfo` reports it, and what it reports on the graphics card: `enabled`
// with Vulkan on the card, `disabled_software` with no driver for one or with lavapipe alone (measured on Linux
// 2026-10-26 and 2026-10-27)
const COMPOSITING = 'gpu_compositing';
const ON_THE_CARD = 'enabled';
const UNTOLD = '--renderer gpu: Chrome did not tell whether it reached a graphics card';

type System = keyof typeof CARD_INTERFACES;

/** Where a frame is drawn: in software, or on the machine's graphics card. */
export const RENDERERS = ['software', 'gpu'] as const;

export type Renderer = (typeof RENDERERS)[number];

/** The flags the shell is launched with to draw where the renderer draws, on the system it runs on. */
export function flagsOf(renderer: Renderer, platform: NodeJS.Platform): readonly string[] {
	switch (renderer) {
		case 'software':
			return [];
		case 'gpu':
			return [`${USE_ANGLE}${cardInterfaceOf(platform)}`];
	}
}

/** The interface ANGLE reaches the card through on a system; a system livereel knows none of is refused. */
function cardInterfaceOf(platform: NodeJS.Platform): string {
	if (!isSystem(platform)) {
		const known = Object.keys(CARD_INTERFACES).join(', ');
		throw new SetupError(`--renderer gpu draws on a graphics card on ${known}: not on ${platform}`);
	}
	return CARD_INTERFACES[platform];
}

function isSystem(platform: string): platform is System {
	return Object.hasOwn(CARD_INTERFACES, platform);
}

export class Chromium implements Browser {
	readonly renderer: Renderer;
	readonly warn: Warn;

	constructor(renderer: Renderer, warn: Warn) {
		this.renderer = renderer;
		this.warn = warn;
	}

	async open(format: Format, address: string, stage: StagePlace, sharpness: number): Promise<Opened> {
		const browser = await launched(this.renderer);
		try {
			await whereItDrawsChecked(this.renderer, browser, this.warn);
			const page = await browser.newPage({
				viewport: format.frame,
				deviceScaleFactor: sharpness,
				permissions: [LOCAL_NETWORK]
			});
			const opening = await staged(page, stage, address, this.warn);
			const watch = new FrameWatch(page, stage, address);
			const filmed = await framed(page, format, opening);
			const absence = await watch.absence(filmed);
			if (absence !== undefined) throw absence;
			return new OpenedChromium(browser, new BrowserStage(page, format, watch, filmed), filmed);
		} catch (fault) {
			await browser.close();
			throw fault;
		}
	}
}

class OpenedChromium implements Opened {
	readonly browser: Playwright;
	readonly stage: BrowserStage;
	readonly page: PlaywrightPage;
	readonly act: ActContext;

	constructor(browser: Playwright, stage: BrowserStage, filmed: Frame) {
		this.browser = browser;
		this.stage = stage;
		this.page = new PlaywrightPage(filmed, stage.page.keyboard);
		this.act = { page: filmed, motion: new PageMotion(stage.page) };
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.browser.close();
	}
}

class PageMotion implements PageMotionSwitch {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	release(): Promise<void> {
		return this.page.emulateMedia({ reducedMotion: 'no-preference' });
	}

	still(): Promise<void> {
		return this.page.emulateMedia({ reducedMotion: 'reduce' });
	}
}

async function launched(renderer: Renderer): Promise<Playwright> {
	try {
		return await chromium.launch({ args: [...flagsOf(renderer, process.platform)] });
	} catch (fault) {
		if (fault instanceof Error && fault.message.includes(NO_BROWSER)) {
			throw new SetupError('the browser films are shot in is not installed: run `npx livereel setup`', {
				cause: fault
			});
		}
		throw fault;
	}
}

/**
 * The launched browser checked for drawing where it was asked to: asked onto the graphics card and reaching none, it
 * draws in software all the same, and the person is warned, as a page that draws with WebGL may then draw nothing; a
 * Chrome that does not tell is said as such.
 */
async function whereItDrawsChecked(renderer: Renderer, browser: Playwright, warn: Warn): Promise<void> {
	switch (renderer) {
		case 'software':
			return;
		case 'gpu': {
			const compositing = await compositingOf(browser);
			if (compositing === ON_THE_CARD) return;
			if (compositing === undefined) {
				warn(UNTOLD);
				return;
			}
			warn(
				`--renderer gpu reached no graphics card (Chrome's compositing is ${compositing}): the frames are ` +
					'drawn in software, and a page that draws with WebGL may draw nothing'
			);
		}
	}
}

/**
 * How Chrome composites its pages, as it reports it: `enabled` on the graphics card. The call ships with the browser
 * Playwright pins, so a failure of it is a fault of the setup, and fails the take as one rather than go on unsure.
 */
async function compositingOf(browser: Playwright): Promise<string | undefined> {
	const session = await browser.newBrowserCDPSession();
	try {
		const { gpu } = await session.send('SystemInfo.getInfo');
		return gpu.featureStatus?.[COMPOSITING];
	} finally {
		await session.detach();
	}
}

/**
 * The stage opened where the film asks for it; how its frame then opens the page. Apart from the app the frame is not
 * sandboxed, so the page does all it would: Chrome stops a page of another site moving the page it is framed in, but
 * not on a click, so a click on a link to `_top` takes the stage away (measured 2026-10-27; TODO.md).
 */
async function staged(page: Page, stage: StagePlace, address: string, warn: Warn): Promise<Opening> {
	switch (stage) {
		case 'apart':
			await page.goto(new URL(STAGE_PAGE, STAGE_FOLDER).href);
			return { address, sandbox: null };
		case 'inside':
			return stagedInside(page, address, warn);
	}
}

/** The stage set up and the page opened in its frame, as far as it loads: its frame. */
async function framed(page: Page, format: Format, opening: Opening): Promise<Frame> {
	await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: COLOUR_SCHEME });
	await page.evaluate(setUpStage, roomOf(format));
	const [filmed] = await Promise.all([
		page.waitForEvent(NAVIGATED, { predicate: isInTheStagesFrame }),
		page.evaluate(openPage, opening)
	]);
	await filmed.waitForLoadState();
	return filmed;
}

/** Whether a page that went somewhere is the one in the stage's frame, not the stage itself. */
function isInTheStagesFrame(navigated: Frame): boolean {
	return navigated.parentFrame() !== null;
}
