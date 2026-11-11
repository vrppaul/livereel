/**
 * What moves and acts may ask of the page being filmed, as the browser adapter answers it, and the pages of the film's
 * own a move may show in its place.
 *
 * A move reads the page as its share begins and, for the page's own scroll and keys, acts on it as it goes. An act
 * is Playwright code: it is handed the filmed page's frame itself, since anything narrower would be a part of what
 * Playwright already offers.
 */
import type { Frame } from 'playwright-core';
import type { Box } from '../domain/geometry.ts';
import { A_FUNCTION_SAID, type Kind, aFunction } from '../domain/handed.ts';

/** How far a scroll goes: so many pixels down the target's own scroll, or until the target stands `top` below the top of what scrolls it. */
export type ScrollAim =
	{ readonly kind: 'by'; readonly pixels: number } | { readonly kind: 'to'; readonly top: number };

/** Where a scroll starts and ends, as far as the block that scrolls goes, and the way to set it. */
export interface ScrollCourse {
	readonly start: number;
	readonly end: number;
	readonly scroll: (top: number) => Promise<void>;
}

/**
 * How the stage shows the filmed page: live in its frame (a film's `page: 'dynamic'`), or as a picture of it, taken
 * anew as it changes, which a piece of the page is drawn from too.
 */
export type PageShown = 'framed' | 'pictured';

/**
 * A page as a move measures it: where its blocks stand and the ground behind them, and, in its pixels, how far down it
 * scrolls at most and how far down its document a block's top stands, however far it is scrolled; as a page of the
 * film's own is measured, which nothing types into and the film alone runs.
 */
export type MeasuredPage = Pick<FilmedPage, 'box' | 'groundBehind'> & {
	readonly scrollLength: () => Promise<number>;
	/** The first block a target matches; a target the page lacks is refused at once. */
	readonly documentTop: (target: string) => Promise<number>;
};

/** The filmed page as a move reads it and types into it. */
export interface FilmedPage {
	/** Where a block stands on the screen; with `every`, the first that many that match, together. */
	readonly box: (target: string, every: number) => Promise<Box>;
	/**
	 * The colour of the ground behind the first block a target matches, in hex, as the page draws it: the first
	 * background the blocks it stands in draw whole, or white where none does.
	 */
	readonly groundBehind: (target: string) => Promise<string>;
	/** The scroll a target takes to reach its aim; a target the page lacks is refused at once. */
	readonly scrollCourse: (target: string, aim: ScrollAim) => Promise<ScrollCourse>;
	/** Keys a person types into whatever holds the page's keyboard. */
	readonly type: (text: string) => Promise<void>;
	readonly press: (key: string) => Promise<void>;
}

/** The page's own motion, stilled while a film is shot, let go for a shot that shows it sped up. */
export interface PageMotionSwitch {
	/** Whether the page's own motion is let go now, so the page may change of itself from frame to frame. */
	readonly released: boolean;
	readonly release: () => Promise<void>;
	readonly still: () => Promise<void>;
}

/**
 * The film's set as an act shows it (`src/direction/set.ts`): a state it shot, by its name, in place of the one shown,
 * once its picture is decoded; refused where the set shot none by the name, or the film is shot on no set.
 */
export interface SetShown {
	readonly show: (state: string) => Promise<void>;
}

/** What an act is handed: the filmed page, its own motion, and the film's set. */
export interface ActContext {
	readonly page: Frame;
	readonly motion: PageMotionSwitch;
	readonly set: SetShown;
}

/** What a film does to the page for real, Playwright code handed what an act is handed. */
export type Action = (context: ActContext) => Promise<void>;

/** What the page is acted on with, as a film hands it to `act`, `page.act` or `cursor.click`. */
export const AN_ACTION: Kind<Action> = aFunction<Action>(A_FUNCTION_SAID);

/**
 * A page of the film's own, which the screen may show in the filmed page's place: its HTML, whole, which the stage lays
 * out before the film is shot, and the key the scene and the stage know it by.
 */
export interface OwnPage {
	readonly key: string;
	readonly html: string;
}

// FNV-1a over a page's code units, 32 bits: where it starts, what it multiplies by, and the base its key is written in
const HASH_START = 0x811c9dc5;
const HASH_PRIME = 0x01000193;
const KEY_BASE = 36;
// A hash kept to 32 bits unsigned, as a shift by none keeps it
const UNSIGNED = 0;

/** A page of the film's own, from its HTML. */
export function ownPageOf(html: string): OwnPage {
	return { key: pageKeyOf(html), html };
}

/** The key a page of the film's own is known by: a hash of its HTML, with its length. */
export function pageKeyOf(html: string): string {
	let hash = HASH_START;
	for (let place = 0; place < html.length; place += 1) {
		hash = Math.imul(hash ^ html.charCodeAt(place), HASH_PRIME) >>> UNSIGNED;
	}
	return `${hash.toString(KEY_BASE)}-${html.length.toString(KEY_BASE)}`;
}
