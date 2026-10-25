/**
 * Chromium with the stage open in it and the filmed page in the stage's frame, for one take.
 *
 * The stage is a file, and Chrome refuses a page framed in it the connections it makes to this machine (Local Network
 * Access): a page served here, as a film's own is, would never hear its server again once loaded, so that check is
 * off in the filming browser. The page's own motion is stilled, by the reduced motion it is asked for, so every move
 * in the film is the film's. Launched headless, Playwright starts Chromium's headless shell.
 */
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { SetupError } from '#domain/errors';
import type { Format } from '#domain/geometry';
import type { ActContext, PageMotionSwitch } from '#direction/page';
import type { Browser, Opened } from '#studio/ports';
import { FilmedPage } from './page.ts';
import { isServed, withoutFrameRefusals } from './refusals.ts';
import { BrowserStage, openPage, setUpStage } from './stage.ts';

const BROWSER_ARGUMENTS = ['--disable-features=LocalNetworkAccessChecks'];
const STAGE = import.meta.resolve('#built-stage/stage.html');
const NAVIGATED = 'framenavigated';
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
	readonly reader: FilmedPage;
	readonly driver: FilmedPage;
	readonly act: ActContext;

	constructor(browser: Playwright, stage: BrowserStage, filmed: Frame) {
		this.browser = browser;
		this.stage = stage;
		this.reader = new FilmedPage(filmed, stage.page.keyboard);
		this.driver = this.reader;
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
		return await chromium.launch({ args: BROWSER_ARGUMENTS });
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
	const chrome = await page.context().newCDPSession(page);
	return new OpenedChromium(browser, new BrowserStage(page, chrome, format), filmed);
}

/** Whether a page that went somewhere is the one in the stage's frame, not the stage itself. */
function isInTheStagesFrame(navigated: Frame): boolean {
	return navigated.parentFrame() !== null;
}
