// @ts-check
'use strict';
/**
 * How a page of the film's own is laid and stood, which the stage and the tab its copies are read in share: the stage
 * lays it in each exposure's screen and draws it so, the tab (`pages.html`) lays the one copy moves read and parts of
 * it are pictured on, so each stands as the other does at a moment. A plain script, as the stage's is, loaded before
 * each page's own, it answers both under `window.ownPage` (`OwnPageApi` in `src/adapters/browser/own-pages.ts`): the
 * type checker reads every script of the stage's as a module of its own, whose names no other sees. The browser does
 * not: the names declared at the top of a page's scripts stand in one scope, and a name declared in two stops the
 * second loading. So this script declares none there: all it holds stands in one block, strict, so its functions
 * stay in it too, and eslint refuses a name at its top (`eslint.config.js`).
 */
/** @import { OwnPage } from '../src/direction/page.ts' */
/** @import { OwnPageStanding } from '../src/domain/own-page.ts' */
/** @import { OwnPageApi } from '../src/adapters/browser/own-pages.ts' */

{
	// A page of the film's own in its frame: the attribute it is known by, by its key, and what it is called
	const OWN_PAGE = 'data-own-page';
	const OWN_PAGE_TITLE = "A page of the film's own";
	// What a page of the film's own may do: be reached by the page it is laid in, which measures it, and run no script
	// of its own
	const MEASURABLE_ALONE = 'allow-same-origin';
	// How a page of the film's own is scrolled to where the film has run it: at once, as `instant` wins over a smooth
	// scroll the page's own styles ask for
	/** @type {ScrollBehavior} */
	const AT_ONCE = 'instant';

	/**
	 * A frame of a page of the film's own laid where the caller lays it, its scripts kept from running, as the film
	 * alone moves it. It is named by the page's key before it is laid, as the browser names a frame once: the browser
	 * adapter finds the copy moves read by that name. Handed back once it has loaded and its fonts are ready.
	 * @param {OwnPage} page @param {(frame: HTMLIFrameElement) => void} lay
	 * @returns {Promise<HTMLIFrameElement>}
	 */
	async function frameLaid(page, lay) {
		const frame = document.createElement('iframe');
		frame.setAttribute(OWN_PAGE, page.key);
		frame.setAttribute('sandbox', MEASURABLE_ALONE);
		frame.title = OWN_PAGE_TITLE;
		frame.name = page.key;
		const loaded = new Promise((resolve) => frame.addEventListener('load', resolve, { once: true }));
		frame.srcdoc = page.html;
		lay(frame);
		await loaded;
		await documentOf(frame).fonts.ready;
		return frame;
	}

	/**
	 * A frame's page with what the film typed into its blocks written and each block it blinks as clear as it stands,
	 * then scrolled so far down, at once, whatever scroll the page's own styles ask for, as a text typed may lengthen
	 * it; the film runs it, never the page. How clear a block stands is set on the block itself, as no stylesheet of
	 * the stage's reaches into a page of the film's own.
	 * @param {HTMLIFrameElement} frame @param {Pick<OwnPageStanding, 'typed' | 'blinking'>} standing
	 * @param {number} top
	 */
	function pageWritten(frame, standing, top) {
		const laid = documentOf(frame);
		for (const text of standing.typed) blockOf(laid, text.into).textContent = text.text;
		for (const block of standing.blinking) blockOf(laid, block.into).style.opacity = String(block.clear);
		(laid.scrollingElement ?? laid.documentElement).scrollTo({ top, behavior: AT_ONCE });
	}

	/**
	 * The block of a page of the film's own a film types into or blinks, the first its CSS selector matches, which the
	 * move found as it began: an element of the page's own window, as the frame's page is a world of its own.
	 * @param {Document} laid @param {string} into @returns {HTMLElement}
	 */
	function blockOf(laid, into) {
		const block = laid.querySelector(into);
		const pagesWindow = laid.defaultView;
		if (pagesWindow === null || !(block instanceof pagesWindow.HTMLElement)) {
			throw new Error(`the film's own page holds no element ${into}`);
		}
		return block;
	}

	/** The document a page of the film's own laid in a frame holds. @param {HTMLIFrameElement} frame */
	function documentOf(frame) {
		const laid = frame.contentDocument;
		if (laid === null) throw new Error("the page of the film's own holds no document");
		return laid;
	}

	/** @type {OwnPageApi} */
	const ownPageWays = { frameLaid, pageWritten, documentOf };
	window.ownPage = ownPageWays;
}
