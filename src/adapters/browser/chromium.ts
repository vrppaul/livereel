/**
 * Chromium with the stage open in it and the filmed page in the stage's frame, for one take.
 *
 * The stage is a file, `stage/stage.html` in the package. Chrome's Local Network Access checks are off in the
 * filming browser: with them on, a page served on this machine and framed in the stage still fetches from its
 * server, but nothing its server pushes down a WebSocket reaches it (measured on Chromium 156; held by
 * `tests/smoke/app.test.ts`), and a live app is filmed for what its server says. The page's own motion is stilled,
 * by the reduced motion it is asked for, so every move in the film is the film's. Launched headless, Playwright
 * starts Chromium's headless shell, which draws every frame in software unless asked to draw on the graphics card,
 * through ANGLE onto the system's own graphics interface; it stays headless, and needs no screen. On Linux, Vulkan
 * reached an Intel Iris Xe with no screen named, and the promo, wide and blurred, took 271 s against 495 s in
 * software, its frames alike (SSIM 0.998 on average, 0.996 at the least; measured 2026-10-26). Metal on macOS and
 * Direct3D 11 on Windows are untried. Where it reaches no graphics card, the shell draws in software all the same:
 * where Vulkan finds no driver at all, through SwiftShader, WebGL drawn; where it finds Mesa's software Vulkan alone
 * (lavapipe), the page has no WebGL (both measured on Linux 2026-10-27). The person is warned, as Chrome tells it, and
 * the film is shot. A page that cannot be reached is refused as the frame opens it, by the address the film gave,
 * rather than when the film first waits on it.
 */
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { FilmError, SetupError } from '../../domain/errors.ts';
import type { Format } from '../../domain/geometry.ts';
import type { ActContext, PageMotionSwitch } from '../../direction/page.ts';
import type { Browser, Opened } from '../../studio/ports.ts';
import { PlaywrightPage } from './page.ts';
import { isServed, withoutFrameRefusals } from './refusals.ts';
import { BrowserStage, openPage, roomOf, setUpStage } from './stage.ts';

// The package's stage: as far from this module in the source as in the package built from it
const STAGE = new URL('../../../stage/stage.html', import.meta.url).href;
const NAVIGATED = 'framenavigated';
// Where Chrome leaves a frame whose page it could not reach
const UNREACHED = 'chrome-error:';
// Chrome's Local Network Access checks, off: why is the module's comment
const LOCAL_NETWORK_ALLOWED = '--disable-features=LocalNetworkAccessChecks';
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

/** A line livereel warns of as it goes on: something the person would want to know, which stops nothing. */
export type Warn = (line: string) => void;

export class Chromium implements Browser {
	readonly renderer: Renderer;
	readonly warn: Warn;

	constructor(renderer: Renderer, warn: Warn) {
		this.renderer = renderer;
		this.warn = warn;
	}

	async open(format: Format, address: string, sharpness: number): Promise<Opened> {
		const browser = await launched(this.renderer);
		try {
			await whereItDrawsChecked(this.renderer, browser, this.warn);
			return await openedIn(browser, format, address, sharpness);
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
		return await chromium.launch({ args: [LOCAL_NETWORK_ALLOWED, ...flagsOf(renderer, process.platform)] });
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

async function openedIn(browser: Playwright, format: Format, address: string, sharpness: number): Promise<Opened> {
	const page = await browser.newPage({ viewport: format.frame, deviceScaleFactor: sharpness });
	await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: COLOUR_SCHEME });
	await page.route(isServed, withoutFrameRefusals);
	await page.goto(STAGE);
	await page.evaluate(setUpStage, roomOf(format));
	const [filmed] = await Promise.all([
		page.waitForEvent(NAVIGATED, { predicate: isInTheStagesFrame }),
		page.evaluate(openPage, address)
	]);
	await filmed.waitForLoadState();
	if (filmed.url().startsWith(UNREACHED)) throw new FilmError(`the page at ${address} could not be reached`);
	return new OpenedChromium(browser, new BrowserStage(page, format), filmed);
}

/** Whether a page that went somewhere is the one in the stage's frame, not the stage itself. */
function isInTheStagesFrame(navigated: Frame): boolean {
	return navigated.parentFrame() !== null;
}
