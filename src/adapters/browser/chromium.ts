/**
 * Chromium with the stage open in it and the filmed page shown on it, for one take: a static page in a tab of its own,
 * pictured on the stage; a dynamic one live in the stage's frame (`stage.ts`).
 *
 * A static page's tab is the page's own: it opens the film's address at the top, first-party to its cookies, so a
 * page that refuses to be framed or signs in is filmed as it comes, and its pictures are taken only as it changes, not
 * every frame, which had cost a second capture a frame (347 ms against 202 on the whole screen, measured 2026-10-27).
 * A dynamic page's stage stands apart from the app, a file of the package (`stage/stage.html`), or inside it, on the
 * app's own address, where the film asks for it (`inside.ts`). Apart, the page is framed as it comes and nothing of
 * its answers is touched: a redirect lands in the frame, and a page that refuses to be framed is refused, its refusal
 * named (`watch.ts`). Chrome's Local Network Access checks stay on, and every page is granted `local-network-access`,
 * as a live app is filmed for what its server says: a page left as it came hears what its server on this machine
 * pushes down a WebSocket even without it, but one the stage inside the app answers anew hears nothing until granted
 * it (measured 2026-10-27; held by `tests/smoke/inside.test.ts`). It is granted everywhere else too, so a page of a
 * public site that asks this machine is heard as it was while the checks were turned off; that is not measured.
 *
 * The page's own motion is stilled, by the reduced motion it is asked for, so every move in the film is the film's.
 * Launched headless, Playwright starts Chromium's headless shell, which draws every frame in software unless asked to draw on the graphics card,
 * through ANGLE onto the system's own graphics interface; it stays headless, and needs no screen. On Linux, Vulkan
 * reached an Intel Iris Xe with no screen named, and the promo, wide and blurred, took 271 s against 495 s in
 * software, its frames alike (SSIM 0.998 on average, 0.996 at the least; measured 2026-10-26). Metal on macOS and
 * Direct3D 11 on Windows are untried. Where it reaches no graphics card, the shell draws in software all the same:
 * where Vulkan finds no driver at all, through SwiftShader, WebGL drawn; where it finds Mesa's software Vulkan alone
 * (lavapipe), the page has no WebGL (both measured on Linux 2026-10-27). The person is warned, as Chrome tells it, and
 * the film is shot. A page that cannot be reached, or refuses its frame, is refused as it is opened, by why, rather
 * than when the film first waits on it.
 */
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { ZOOM_AT_MOST } from '../../domain/camera.ts';
import { FilmError, SetupError } from '../../domain/errors.ts';
import { frameScaleOf } from '../../domain/geometry.ts';
import type { StagePlace } from '../../direction/film.ts';
import type { ActContext, PageMotionSwitch } from '../../direction/page.ts';
import type { FontNamed } from '../../direction/theme.ts';
import type { Browser, Opened, Setting, Stage } from '../../studio/ports.ts';
import { stagedInside } from './inside.ts';
import { PlaywrightPage } from './page.ts';
import {
	type Opening,
	PlaywrightFramedStage,
	PlaywrightPicturedStage,
	STAGE_FOLDER,
	STAGE_PAGE,
	openPage,
	roomOf,
	setUpStage
} from './stage.ts';
import { FrameWatch, TabWatch, notReached } from './watch.ts';
import type { Warn } from './warn.ts';

const NAVIGATED = 'framenavigated';
// What the filming browser is granted, so a page hears its server on this machine: why is the module's comment
const LOCAL_NETWORK = 'local-network-access';
// What Playwright says where the browser was never downloaded, and what the person is told in its place: Playwright
// names its own command, not livereel's
const NO_BROWSER = "Executable doesn't exist";
const NOT_INSTALLED = 'the browser films are shot in is not installed: run `npx livereel setup`';
// What Playwright says where the system lacks libraries the browser needs, its words then naming them and how this
// system installs them, which differs between Linux distributions, Docker and Windows
const NO_LIBRARIES = 'Host system is missing dependencies';
// How a block the film blurs is blurred: 12 of the page's pixels, as no letter of a line reads through, the camera
// close or not (looked at 2026-10-28)
const BLURRING = { property: 'filter', value: 'blur(12px)' } as const;
// The page's text caret stands shown and never blinks on the wall clock, so a hold shows it as it was, and a static
// page's pictures come out alike once it is typed into: of 12 pictures over 1.5 s after typing, 2 unlike as it blinks,
// all alike held (measured 2026-10-30 on Chrome 156)
const STEADY_CARET: ForcedRule = { selector: '*', property: 'caret-animation', value: 'manual' };
// What the film forces on the page stands whatever the page's own style says
const OVER_THE_PAGES_OWN = 'important';
// Whether the document at the top of a tab is the stage's own, left as it is, or the filmed page's
const THE_STAGE_AT_THE_TOP = true;
const THE_PAGE_AT_THE_TOP = false;

// A family any browser has, set after a film's font to see that it stands as a family of its own
const FALLBACK_FONT = 'monospace';

/** A font a film names, and the fallback set after it. */
interface FontProbe {
	readonly font: string;
	readonly fallback: string;
}

/** A property the film forces on the page's blocks a selector matches, and its value. */
interface ForcedRule {
	readonly selector: string;
	readonly property: string;
	readonly value: string;
}

/**
 * The rules the film forces on the page, and how far over the page's own style; and whether the document at the top
 * is the stage's own, the page framed in it, and left as it is.
 */
interface Forcing {
	readonly rules: readonly ForcedRule[];
	readonly priority: string;
	readonly stageAtTheTop: boolean;
}

/** The browser, and the tab the filmed page stands in: the stage's own, or a tab of its own. */
interface Tabs {
	readonly browser: Playwright;
	readonly filmed: Page;
}
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

	async open(setting: Setting, address: string, sharpness: number): Promise<Opened> {
		const browser = await launched(this.renderer);
		try {
			await whereItDrawsChecked(this.renderer, browser, this.warn);
			const stage = await browser.newPage({
				viewport: setting.format.frame,
				deviceScaleFactor: sharpness,
				permissions: [LOCAL_NETWORK]
			});
			await unreadRefused(stage, setting.blurred);
			switch (setting.page) {
				case 'static':
					return await pictured(browser, stage, setting, address, sharpness);
				case 'dynamic':
					return await framedLive(browser, stage, setting, address, this.warn);
			}
		} catch (fault) {
			await browser.close();
			throw fault;
		}
	}
}

/** The browser with the filmed page shown on its stage: acted on, typed into and scrolled in the tab it stands in. */
class OpenedChromium implements Opened {
	readonly browser: Playwright;
	readonly stage: Stage;
	readonly page: PlaywrightPage;
	readonly act: ActContext;

	constructor(tabs: Tabs, stage: Stage, filmed: Frame) {
		this.browser = tabs.browser;
		this.stage = stage;
		this.page = new PlaywrightPage(filmed, tabs.filmed.keyboard);
		this.act = { page: filmed, motion: new PageMotion(tabs.filmed) };
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.browser.close();
	}
}

/**
 * A static page opened in a tab of its own at the screen's size, and pictured on the stage apart from the app, each
 * picture as sharp as the stage's frames are for a camera at the zoom the take names, on a frame of the format's size.
 * The tab stands at the device scale of the sharpest picture, so a page that picks its images by it picks those.
 */
async function pictured(
	browser: Playwright,
	stage: Page,
	setting: Setting,
	address: string,
	sharpness: number
): Promise<Opened> {
	await stageApartOpened(stage);
	await stageSetUp(stage, setting);
	const pixelsAtZoomOne = sharpness * frameScaleOf(setting.format.frame);
	const filmed = await browser.newPage({
		viewport: setting.format.screen,
		deviceScaleFactor: pixelsAtZoomOne * ZOOM_AT_MOST,
		permissions: [LOCAL_NETWORK]
	});
	await filmed.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
	await forcedOn(filmed, setting.blurred, THE_PAGE_AT_THE_TOP);
	const watch = new TabWatch(filmed, address);
	await reached(filmed, address);
	const session = await filmed.context().newCDPSession(filmed);
	const filmedTab = { session, screen: setting.format.screen, pixelsAtZoomOne };
	const picturedStage = new PlaywrightPicturedStage(stage, filmedTab, watch);
	return new OpenedChromium({ browser, filmed }, picturedStage, filmed.mainFrame());
}

/** A dynamic page opened live in the stage's frame, the stage standing where the film asks; refused where it is gone. */
async function framedLive(
	browser: Playwright,
	stage: Page,
	setting: Setting,
	address: string,
	warn: Warn
): Promise<Opened> {
	await forcedOn(stage, setting.blurred, THE_STAGE_AT_THE_TOP);
	const opening = await staged(stage, setting.stage, address, warn);
	const watch = new FrameWatch(stage, setting.stage, address);
	const filmed = await framed(stage, setting, opening);
	const absence = await watch.absence(filmed);
	if (absence !== undefined) throw absence;
	const tabs = { browser, filmed: stage };
	return new OpenedChromium(tabs, new PlaywrightFramedStage(stage, setting.format, watch, filmed), filmed);
}

/** A page gone to the film's address; one that cannot be reached refused, saying so. */
async function reached(page: Page, address: string): Promise<void> {
	try {
		await page.goto(address);
	} catch (fault) {
		if (!(fault instanceof Error)) throw fault;
		throw notReached(address, { cause: fault });
	}
}

class PageMotion implements PageMotionSwitch {
	readonly page: Page;
	released = false;

	constructor(page: Page) {
		this.page = page;
	}

	/** Said let go as it is asked, so an act that does not wait for it still has the page captured every frame. */
	release(): Promise<void> {
		this.released = true;
		return this.page.emulateMedia({ reducedMotion: 'no-preference' });
	}

	async still(): Promise<void> {
		await this.page.emulateMedia({ reducedMotion: 'reduce' });
		this.released = false;
	}
}

async function launched(renderer: Renderer): Promise<Playwright> {
	try {
		return await chromium.launch({ args: [...flagsOf(renderer, process.platform)] });
	} catch (fault) {
		throw lackOf(fault) ?? fault;
	}
}

/**
 * What this machine lacks for the browser to start, where Playwright's fault says so: in livereel's words for a
 * browser never downloaded, in Playwright's own for libraries the system lacks; none for any other fault.
 */
function lackOf(fault: unknown): SetupError | undefined {
	if (!(fault instanceof Error)) return undefined;
	if (fault.message.includes(NO_BROWSER)) return new SetupError(NOT_INSTALLED, { cause: fault });
	if (fault.message.includes(NO_LIBRARIES)) return new SetupError(fault.message, { cause: fault });
	return undefined;
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
 * sandboxed, so the page does all it would, and nothing a sandbox changes for an app (a popup, a download, storage)
 * is a risk of the simple stage: Chrome stops a page of another site moving the page it is framed in, but not on a
 * click, so a click on a link to `_top` takes the stage away (measured 2026-10-27), and the take is refused, saying
 * so and naming the stage inside the app, where the frame is sandboxed against it (`watch.ts`).
 */
async function staged(page: Page, stage: StagePlace, address: string, warn: Warn): Promise<Opening> {
	switch (stage) {
		case 'apart':
			await stageApartOpened(page);
			return { address, sandbox: null };
		case 'inside':
			return stagedInside(page, address, warn);
	}
}

/** The stage opened apart from the app: the package's own file. */
async function stageApartOpened(page: Page): Promise<void> {
	await page.goto(new URL(STAGE_PAGE, STAGE_FOLDER).href);
}

/**
 * A selector the film blurs that Chrome cannot make a rule of, refused before anything opens, by the same making of a
 * rule, where a style sheet would drop it without a word.
 */
async function unreadRefused(page: Page, blurred: readonly string[]): Promise<void> {
	const unread = await page.evaluate(unreadOf, blurred);
	if (unread !== undefined) {
		throw new FilmError(`the film's blurred holds ${JSON.stringify(unread)}: it is no selector Chrome reads`);
	}
}

/**
 * What the film forces on the page — the blocks it blurs blurred, the text caret steady — in every document a tab
 * opens, by a style sheet each is given as it is made, a rule a selector, so a page the film goes on to has it too;
 * where the stage stands at the top, its own document is given none. A document that sets its own adopted style
 * sheets in place of all loses them, and a block in a shadow root is not blurred; its field's caret, inherited from its
 * host, stands steady all the same (probed 2026-10-30).
 */
async function forcedOn(page: Page, blurred: readonly string[], stageAtTheTop: boolean): Promise<void> {
	const rules = [STEADY_CARET, ...blurred.map((selector) => ({ selector, ...BLURRING }))];
	await page.addInitScript(forcedIn, { rules, priority: OVER_THE_PAGES_OWN, stageAtTheTop });
}

/**
 * The stage set to the film's format and asked for its colour scheme and stilled motion. A font the film names, in its
 * theme or in a look's move, that CSS reads as no list of families a fallback can follow is refused, as one with a
 * quote left open, which runs on over the stage's own fallbacks: the stage would fall to the browser's font without a
 * word.
 */
async function stageSetUp(page: Page, setting: Setting): Promise<void> {
	await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
	await page.evaluate(setUpStage, roomOf(setting.format));
	for (const named of setting.fonts) await refusedWhereNoFamily(page, named);
}

/** The stage set up and the page opened in its frame, as far as it loads: its frame. */
async function framed(page: Page, setting: Setting, opening: Opening): Promise<Frame> {
	await stageSetUp(page, setting);
	const [filmed] = await Promise.all([
		page.waitForEvent(NAVIGATED, { predicate: isInTheStagesFrame }),
		page.evaluate(openPage, opening)
	]);
	await filmed.waitForLoadState();
	return filmed;
}

/** A font a film names refused, by where it names it, where CSS reads no list of families a fallback can follow. */
async function refusedWhereNoFamily(page: Page, named: FontNamed): Promise<void> {
	if (await page.evaluate(isFollowedByAFallback, { font: named.family, fallback: FALLBACK_FONT })) return;
	throw new FilmError(`${named.place} is ${JSON.stringify(named.family)}: CSS reads no font family there`);
}

/** Whether a page that went somewhere is the one in the stage's frame, not the stage itself. */
function isInTheStagesFrame(navigated: Frame): boolean {
	return navigated.parentFrame() !== null;
}

// What follows runs in the page, each function handed over alone

/** The first of the selectors the browser cannot make a rule of; none where it makes one of each. */
function unreadOf(selectors: readonly string[]): string | undefined {
	const sheet = new CSSStyleSheet();
	for (const selector of selectors) {
		try {
			sheet.insertRule(`${selector} {}`);
		} catch {
			return selector;
		}
	}
	return undefined;
}

/** A document given what the film forces on it, a rule a selector, unless it is the stage's own, at its tab's top. */
function forcedIn(forcing: Forcing): void {
	if (forcing.stageAtTheTop && window.top === window) return;
	const sheet = new CSSStyleSheet();
	for (const forced of forcing.rules) {
		const rule = sheet.cssRules.item(sheet.insertRule(`${forced.selector} {}`));
		if (rule instanceof CSSStyleRule) rule.style.setProperty(forced.property, forced.value, forcing.priority);
	}
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

/** Whether CSS reads a font a film names as a list of families the fallback can follow, its own family still. */
function isFollowedByAFallback(probe: FontProbe): boolean {
	const element = document.createElement('i');
	element.style.fontFamily = `${probe.font}, ${probe.fallback}`;
	return element.style.fontFamily.endsWith(`, ${probe.fallback}`);
}
