// @ts-check
/**
 * The tab the pages of the film's own are read in and parts of them pictured: one copy of each, at the screen's size,
 * as the tab is, and at no scale, laid and stood as the stage lays and stands its own (`window.ownPage`), the copy last
 * stood shown alone over the screen's ground, so a picture of a part of the tab is of that page as the stage draws it.
 * It answers the browser adapter under `window.pages` (`src/adapters/browser/own-pages.ts`), draws no frame and keeps
 * no time. A plain script, as the stage's is.
 */
/** @import { OwnPage } from '../src/direction/page.ts' */
/** @import { OwnPageStanding } from '../src/domain/own-page.ts' */
/** @import { PagesApi } from '../src/adapters/browser/own-pages.ts' */

// The attribute the copy last stood takes, the only one shown; and how many animations a page has that move of
// themselves, none
const STOOD = 'data-stood';
const NO_ANIMATIONS = 0;
/**
 * The copies of the film's own pages, by their keys, each a document of its own laid in the tab's body.
 * @type {Map<string, HTMLIFrameElement>}
 */
const COPIES = new Map();

/**
 * One copy of each page of the film's own laid, named by its key, by which the adapter finds its frame, once each has
 * loaded and its fonts are ready: the keys of those that move of themselves, by an animation or a transition of their
 * own, which the film refuses.
 * @param {readonly OwnPage[]} pages @returns {Promise<readonly string[]>}
 */
async function pagesLaid(pages) {
	await Promise.all(pages.map((page) => copyLaid(page)));
	return pages.filter((page) => movesOfItself(copyOf(page.key))).map((page) => page.key);
}

/** A copy of a page of the film's own laid in the tab's body, named by its key. @param {OwnPage} page */
async function copyLaid(page) {
	COPIES.set(page.key, await window.ownPage.frameLaid(page, (frame) => document.body.append(frame)));
}

/**
 * The copy of a page of the film's own, by its key, written and scrolled as the page stands at a moment, and shown
 * alone. @param {OwnPageStanding} standing
 */
function pageStood(standing) {
	const stood = copyOf(standing.key);
	for (const copy of COPIES.values()) copy.toggleAttribute(STOOD, copy === stood);
	window.ownPage.pageWritten(stood, standing, standing.scrolled);
}

/** The copy of a page of the film's own, by its key. @param {string} key */
function copyOf(key) {
	const copy = COPIES.get(key);
	if (copy === undefined) throw new Error(`the tab laid no copy of the film's own page by the key ${key}`);
	return copy;
}

/**
 * Whether a page of the film's own moves of itself, by an animation or a transition of its own.
 * @param {HTMLIFrameElement} frame
 */
function movesOfItself(frame) {
	return window.ownPage.documentOf(frame).getAnimations().length > NO_ANIMATIONS;
}

/** @type {PagesApi} */
const PAGES = { lay: pagesLaid, stand: pageStood };
window.pages = PAGES;
