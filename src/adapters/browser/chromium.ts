/**
 * Chromium with the stage open in it and the filmed page in the stage's frame, for one take.
 *
 * The stage is a file, `stage/stage.html` in the package. Chrome's Local Network Access checks are off in the
 * filming browser: with them on, a page served on this machine and framed in the stage still fetches from its
 * server, but nothing its server pushes down a WebSocket reaches it (measured on Chromium 156; held by
 * `tests/smoke/app.test.ts`), and a live app is filmed for what its server says. The page's own motion is stilled,
 * by the reduced motion it is asked for, so every move in the film is the film's. Launched headless, Playwright
 * starts Chromium's headless shell. A page that cannot be reached is refused as the frame opens it, by the address
 * the film gave, rather than when the film first waits on it.
 */
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { FilmError, SetupError } from '../../domain/errors.ts';
import type { Format } from '../../domain/geometry.ts';
import type { ActContext, PageMotionSwitch } from '../../direction/page.ts';
import type { Browser, Opened } from '../../studio/ports.ts';
import { PlaywrightPage } from './page.ts';
import { isServed, withoutFrameRefusals } from './refusals.ts';
import { BrowserStage, openPage, setUpStage } from './stage.ts';

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

export class Chromium implements Browser {
	async open(format: Format, address: string, sharpness: number): Promise<Opened> {
		const browser = await launched();
		try {
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

async function launched(): Promise<Playwright> {
	try {
		return await chromium.launch({ args: [LOCAL_NETWORK_ALLOWED] });
	} catch (fault) {
		if (fault instanceof Error && fault.message.includes(NO_BROWSER)) {
			throw new SetupError('the browser films are shot in is not installed: run `npx livereel setup`', {
				cause: fault
			});
		}
		throw fault;
	}
}

async function openedIn(browser: Playwright, format: Format, address: string, sharpness: number): Promise<Opened> {
	const page = await browser.newPage({ viewport: format.frame, deviceScaleFactor: sharpness });
	await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: COLOUR_SCHEME });
	await page.route(isServed, withoutFrameRefusals);
	await page.goto(STAGE);
	await page.evaluate(setUpStage, format);
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
