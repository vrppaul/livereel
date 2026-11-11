/**
 * The pages of the film's own as moves read them and parts of them are pictured: one copy of each in a tab of its own
 * (`stage/pages.html`), at the screen's size and the filmed page's tab's device scale, laid and stood by the stage's
 * own script (`stage/own-page.js`), the copy last stood shown alone on the screen's ground. The stage's copies draw the
 * frames; these, which no frame shows, stand as a move's moment has them, whatever frame was drawn last.
 *
 * A part of a copy is pictured as a part of the filmed page is (`stage.ts`): by CDP's capture of its tab, clipped to
 * the part at the scale asked. The stage's own tab could not picture it: it is the frame's size, and a copy laid past
 * its edge is measured there, but CDP's capture is clipped to the viewport, and HTML-in-Canvas draws a canvas past it
 * as nothing (probed 2026-11-11); a stage's tab made wide enough to hold the copy beside the frame cost every frame of
 * a room film (a capture 53.9–54.3 ms against 35.6–36.1 at draft, `62b4f9e`). A row of a terminal's page pictured at
 * 2.2 here came out as sharp as one drawn by HTML-in-Canvas in a canvas inside the viewport (a mean gradient 4.864
 * against 4.866, probed 2026-11-11). The tab costs a film with such a page a browser opened in 559–566 ms against
 * 282–380, and a held picture of a terminal's line 41 ms at draft, 64 at the finest (`--profile`, 2026-11-11). Its
 * device scale changed no layout of the terminal's: its 318 blocks stood alike at 1, 2, 2.2 and 4.4.
 */
import type { Browser as Playwright, CDPSession, Frame, Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import type { OwnPageStanding } from '../../domain/own-page.ts';
import type { TypedText } from '../../domain/typing.ts';
import type { MeasuredPage, OwnPage } from '../../direction/page.ts';
import type { OwnPages, Setting } from '../../studio/ports.ts';
import { PlaywrightPage } from './page.ts';
import { type PictureTab, STAGE_FOLDER } from './stage.ts';

/** What the tab's script, `stage/pages.js`, answers under `window.pages`. */
export interface PagesApi {
	/**
	 * One copy of each page of the film's own laid, each named by its key, loaded with its fonts, its scripts kept from
	 * running: the keys of those that move of themselves, by an animation or a transition of their own.
	 */
	readonly lay: (pages: readonly OwnPage[]) => Promise<readonly string[]>;
	/** A page's copy written and scrolled as the page stands at a moment, and shown alone. */
	readonly stand: (standing: OwnPageStanding) => void;
}

/**
 * What `stage/own-page.js` answers under `window.ownPage`, to the stage's script and the tab's alike, so a page of the
 * film's own is laid and stood one way in both.
 */
export interface OwnPageApi {
	/**
	 * A page laid in a frame where `lay` lays it, its scripts kept from running, named by its key: its frame, once it has
	 * loaded and its fonts are ready.
	 */
	readonly frameLaid: (page: OwnPage, lay: (frame: HTMLIFrameElement) => void) => Promise<HTMLIFrameElement>;
	/** A frame's page with what the film typed into its blocks written, then scrolled so far down, at once. */
	readonly pageWritten: (frame: HTMLIFrameElement, typed: readonly TypedText[], top: number) => void;
	/** The document a frame's page holds. */
	readonly documentOf: (frame: HTMLIFrameElement) => Document;
}

declare global {
	interface Window {
		pages: PagesApi;
		ownPage: OwnPageApi;
	}
}

// The tab's page, in the stage's folder, so an address in a page of the film's own is read from where the stage reads
// it; and how much of a page's HTML a refusal names it by
const PAGES_PAGE = 'pages.html';
const HTML_SAID = 60;

/** The pages of the film's own of a film that shows none: none to read, and none to stand. */
export const NO_OWN_PAGES: OwnPages = {
	laid: new Map(),
	stand: (standing) => Promise.reject(new Error(`the film laid no page of its own by the key ${standing.key}`))
};

/** The tab the pages of the film's own are read and pictured in, each copy by its key. */
export class OwnPagesTab implements OwnPages, PictureTab {
	readonly tab: Page;
	readonly session: CDPSession;
	readonly laid: ReadonlyMap<string, MeasuredPage>;

	constructor(tab: Page, session: CDPSession, laid: ReadonlyMap<string, MeasuredPage>) {
		this.tab = tab;
		this.session = session;
		this.laid = laid;
	}

	stand(standing: OwnPageStanding): Promise<void> {
		return this.tab.evaluate(pageStood, standing);
	}
}

/**
 * The tab the film's own pages are read and pictured in, opened at the screen's size and a device scale, asked for the
 * film's colour scheme with its own motion stilled, as the stage is; the film refused where a page moves of itself.
 * None where the film shows no page of its own.
 */
export async function ownPagesOpened(
	browser: Playwright,
	setting: Setting,
	deviceScale: number
): Promise<OwnPagesTab | null> {
	if (setting.ownPages.length === 0) return null;
	const tab = await browser.newPage({ viewport: setting.format.screen, deviceScaleFactor: deviceScale });
	await tab.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
	await tab.goto(new URL(PAGES_PAGE, STAGE_FOLDER).href);
	refusedWhereMoving(setting.ownPages, await tab.evaluate(pagesLaid, setting.ownPages));
	const laid = setting.ownPages.map(
		(page) => [page.key, new PlaywrightPage(frameOf(tab, page), tab.keyboard)] as const
	);
	return new OwnPagesTab(tab, await tab.context().newCDPSession(tab), new Map(laid));
}

/** The frame a page of the film's own is laid in, named by its key. */
function frameOf(tab: Page, page: OwnPage): Frame {
	const frame = tab.frame({ name: page.key });
	if (frame === null) throw new Error(`the tab of the film's own pages laid no frame for the page ${page.key}`);
	return frame;
}

/**
 * The film refused where a page of its own moves of itself, by an animation or a transition of its own, which would
 * run on the wall's clock: what moves in a film is the film's, set by its moves; named by how its HTML begins.
 */
function refusedWhereMoving(pages: readonly OwnPage[], moving: readonly string[]): void {
	const [first] = pages.filter((page) => moving.includes(page.key));
	if (first === undefined) return;
	throw new FilmError(
		`the film's own page that begins ${JSON.stringify(first.html.slice(0, HTML_SAID))} moves of itself, by an animation or a transition of its own, which no move of the film sets: take it out, and move what it shows with the film's moves`
	);
}

// What follows runs in the tab, each function handed over alone

function pagesLaid(pages: readonly OwnPage[]): Promise<readonly string[]> {
	return window.pages.lay(pages);
}

function pageStood(standing: OwnPageStanding): void {
	window.pages.stand(standing);
}
