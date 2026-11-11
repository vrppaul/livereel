// @ts-check
/**
 * How a page of the film's own is laid and stood, which the stage and the tab its copies are read in share: the stage
 * lays it in each exposure's screen and draws it so, the tab (`pages.html`) lays the one copy moves read and parts of
 * it are pictured on, so each stands as the other does at a moment. A plain script, as the stage's is, loaded before
 * each page's own, it answers both under `window.ownPage` (`OwnPageApi` in `src/adapters/browser/own-pages.ts`): the
 * type checker reads every script of the stage's as a module of its own, whose names no other sees. The browser does
 * not: the names declared at the top of this file and of the page's script stand in one scope, and a name declared in
 * both stops the second loading, so neither declares one of the other's.
 */
/** @import { OwnPage } from '../src/direction/page.ts' */
/** @import { TypedText } from '../src/domain/typing.ts' */
/** @import { OwnPageApi } from '../src/adapters/browser/own-pages.ts' */

// A page of the film's own in its frame: the attribute it is known by, by its key, and what it is called
const OWN_PAGE = 'data-own-page';
const OWN_PAGE_TITLE = "A page of the film's own";
// What a page of the film's own may do: be reached by the page it is laid in, which measures it, and run no script of
// its own
const MEASURABLE_ALONE = 'allow-same-origin';
// How a page of the film's own is scrolled to where the film has run it: at once, as `instant` wins over a smooth
// scroll the page's own styles ask for
/** @type {ScrollBehavior} */
const AT_ONCE = 'instant';

/**
 * A frame of a page of the film's own laid where the caller lays it, with its scripts kept from running, as its frame
 * moves as the film moves it alone, named by the page's key, by which the browser adapter finds a copy moves read,
 * given before it is laid, as the browser names a frame once: once it has loaded and its fonts are ready.
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
 * A frame's page with what the film typed into its blocks written, then scrolled so far down, at once, whatever scroll
 * the page's own styles ask for, as a text typed may lengthen it; the film runs it, never the page.
 * @param {HTMLIFrameElement} frame @param {readonly TypedText[]} typed @param {number} top
 */
function pageWritten(frame, typed, top) {
	const laid = documentOf(frame);
	for (const text of typed) typedBlockOf(laid, text.into).textContent = text.text;
	(laid.scrollingElement ?? laid.documentElement).scrollTo({ top, behavior: AT_ONCE });
}

/**
 * The block of a page of the film's own a film types into, the first its CSS selector matches, which the move measured
 * as it began. @param {Document} laid @param {string} into
 */
function typedBlockOf(laid, into) {
	const block = laid.querySelector(into);
	if (block === null) throw new Error(`the film's own page holds no ${into} to type into`);
	return block;
}

/** The document a page of the film's own laid in a frame holds. @param {HTMLIFrameElement} frame */
function documentOf(frame) {
	const laid = frame.contentDocument;
	if (laid === null) throw new Error("the page of the film's own holds no document");
	return laid;
}

/** @type {OwnPageApi} */
const OWN_PAGE_WAYS = { frameLaid, pageWritten, documentOf };
window.ownPage = OWN_PAGE_WAYS;
