/**
 * What moves and acts may ask of the page being filmed, as the browser adapter answers it.
 *
 * A move reads the page as its share begins and, for the page's own scroll and keys, acts on it as it goes. An act
 * is Playwright code: it is handed the filmed page's frame itself, since anything narrower would be a part of what
 * Playwright already offers.
 */
import type { Frame } from 'playwright-core';
import type { Box } from '../domain/geometry.ts';

/** How far a scroll goes: so many pixels down the target's own scroll, or until the target stands `top` below the top of what scrolls it. */
export type ScrollAim =
	{ readonly kind: 'by'; readonly pixels: number } | { readonly kind: 'to'; readonly top: number };

/** Where a scroll starts and ends, as far as the block that scrolls goes, and the way to set it. */
export interface ScrollCourse {
	readonly start: number;
	readonly end: number;
	readonly scroll: (top: number) => Promise<void>;
}

/** The filmed page as a move reads it and types into it. */
export interface FilmedPage {
	/** Where a block stands on the screen; with `every`, the first that many that match, together. */
	readonly box: (target: string, every: number) => Promise<Box>;
	/** The scroll a target takes to reach its aim; a target the page lacks is refused at once. */
	readonly scrollCourse: (target: string, aim: ScrollAim) => Promise<ScrollCourse>;
	/** Keys a person types into whatever holds the page's keyboard. */
	readonly type: (text: string) => Promise<void>;
	readonly press: (key: string) => Promise<void>;
}

/** The page's own motion, stilled while a film is shot, let go for a shot that shows it sped up. */
export interface PageMotionSwitch {
	readonly release: () => Promise<void>;
	readonly still: () => Promise<void>;
}

/** What an act is handed: the filmed page, and its own motion. */
export interface ActContext {
	readonly page: Frame;
	readonly motion: PageMotionSwitch;
}
