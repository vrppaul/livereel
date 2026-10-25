/**
 * What moves and acts may ask of the page being filmed, as the browser adapter answers it.
 *
 * A move reads the page through a reader as its share begins and, for the page's own scroll and keys, acts on it
 * through what the reader handed back or through the driver. An act is Playwright code: it is handed the filmed
 * page's frame itself, since anything narrower would be a part of what Playwright already offers.
 */
import type { Frame } from 'playwright-core';
import type { Box } from '#domain/geometry';

export interface PageReader {
	/** Where a block stands on the screen; with `every`, the first that many that match, together. */
	readonly box: (target: string, every: number) => Promise<Box>;
	/** A block that scrolls, as it stands now. */
	readonly scrolling: (target: string) => Promise<Scrolling>;
	/** The block that scrolls a target, and how far it scrolls to bring the target `top` pixels below its own top. */
	readonly scrollingTo: (target: string, top: number) => Promise<ScrollCourse>;
}

/** A block that scrolls: where its scroll stands, and the way to set it. */
export interface Scrolling {
	readonly top: number;
	readonly scroll: (top: number) => Promise<void>;
}

/** Where a scroll starts and ends, and the way to set the block that scrolls. */
export interface ScrollCourse {
	readonly start: number;
	readonly end: number;
	readonly scroll: (top: number) => Promise<void>;
}

/** Keys a person types into whatever holds the page's keyboard. */
export interface PageDriver {
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
