// @ts-check
'use strict';
/**
 * How a film's own page is laid and stood, one way for the stage, which lays it in each exposure's screen, and for the
 * tab whose copy moves read and parts of it are pictured on (`pages.html`), so each stands as the other does at a
 * moment. It answers both under `window.ownPage` (`OwnPageApi` in `src/adapters/browser/own-pages.ts`). It shares one
 * scope with each page's scripts, where a name declared twice stops the second loading, so all it holds stands in one
 * strict block.
 */
/** @import { OwnPage } from '../src/direction/page.ts' */
/** @import { OwnPageStanding } from '../src/domain/own-page.ts' */
/** @import { OwnPageApi } from '../src/adapters/browser/own-pages.ts' */

{
	// A film's own page in its frame: the attribute it is known by, by its key, and what it is called
	const OWN_PAGE = 'data-own-page';
	const OWN_PAGE_TITLE = "A film's own page";
	// What a film's own page may do: be reached by the page it is laid in, which measures it, and run no script of its
	// own
	const MEASURABLE_ALONE = 'allow-same-origin';
	// How a film's own page is scrolled to where the film has run it: at once, as `instant` wins over a smooth scroll the
	// page's own styles ask for
	/** @type {ScrollBehavior} */
	const AT_ONCE = 'instant';

	/**
	 * A frame of a film's own page laid where the caller lays it, its scripts kept from running, as the film alone moves
	 * it. It is named by the page's key before it is laid, as the browser names a frame once: the browser adapter finds
	 * the copy moves read by that name. Handed back once it has loaded and its fonts are ready.
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
	 * then scrolled so far down, at once, whatever scroll the page's own styles ask for, as a text typed may lengthen it;
	 * the film runs it, never the page. How clear a block stands is set on the block itself, as no stylesheet of the
	 * stage's reaches into a film's own page.
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
	 * The block of a film's own page a film types into or blinks, the first its CSS selector matches, which the move
	 * found as it began: an element of the page's own window, as the frame's page is a world of its own.
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

	/** The document a film's own page laid in a frame holds. @param {HTMLIFrameElement} frame */
	function documentOf(frame) {
		const laid = frame.contentDocument;
		if (laid === null) throw new Error("the film's own page holds no document");
		return laid;
	}

	/** @type {OwnPageApi} */
	const ownPageWays = { frameLaid, pageWritten, documentOf };
	window.ownPage = ownPageWays;
}
