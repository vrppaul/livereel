/**
 * What moves and acts may ask of the page being filmed, as the browser adapter answers it, and the pages of the film's
 * own a move may show in its place.
 *
 * A move reads the page as its share begins and, for the page's own scroll and keys, acts on it as it goes. An act
 * is Playwright code: it is handed the filmed page's frame itself, since anything narrower would be a part of what
 * Playwright already offers.
 */
import type { Frame } from 'playwright-core';
import type { Box, Corners } from '../domain/geometry.ts';
import { A_FUNCTION_SAID, type Kind, aFunction } from '../domain/handed.ts';
import type { BlockKey } from '../domain/placement.ts';
import type { TypedText } from '../domain/typing.ts';

/**
 * How far a scroll goes: so many pixels down the target's own scroll, or until the target stands `top` below the top of
 * what scrolls it.
 */
export type ScrollAim =
	{ readonly kind: 'by'; readonly pixels: number } | { readonly kind: 'to'; readonly top: number };

/**
 * Where a scroll starts and ends, as far as the block that scrolls goes, the key the page knows that block by, and the
 * way to set it.
 */
export interface ScrollCourse {
	readonly start: number;
	readonly end: number;
	readonly block: BlockKey;
	readonly scroll: (top: number) => Promise<void>;
}

/**
 * How the stage shows the filmed page: live in its frame (a film's `page: 'dynamic'`), or as a picture of it, taken
 * anew as it changes, which a piece of the page is drawn from too.
 */
export type PageShown = 'framed' | 'pictured';

/**
 * What a block of a page shows as its text: the text it holds alone, as a text area does too, whose value its text sets
 * while nobody has edited it; elements of its own, which a text written into it would take the place of; or its value,
 * as an input shows, which holds no text.
 */
export type BlockHolding = 'text alone' | 'elements' | 'its value';

/**
 * A page as a move measures it: where its blocks and their letters stand, how round and on what ground they are drawn;
 * in its pixels, how far down it scrolls at most with a text written into each of some blocks, and how far down its
 * document a block's top stands, however far it is scrolled, and a block the stage writes, found as it finds it, and
 * what it shows as its text; as a page of the film's own is measured, which no key reaches and the film alone runs and
 * types into.
 */
export type MeasuredPage = Pick<FilmedPage, 'box' | 'groundBehind' | 'roundingOf' | 'letterAtTheStart'> & {
	/**
	 * Measured with each block a typed text names, the first its CSS selector matches, holding that text and every other
	 * holding what it held; each holds what it held again after, as the stage writes what stands typed in each exposure.
	 */
	readonly scrollLengthWith: (typed: readonly TypedText[]) => Promise<number>;
	/** The first block a target matches; a target the page lacks is refused at once. */
	readonly documentTop: (target: string) => Promise<number>;
	/**
	 * The first block a target matches as a CSS selector, found as the stage finds a block it writes, typing its text or
	 * blinking it: an HTML element. A target the page lacks, that is no CSS selector, or whose first match is no HTML
	 * element, as an SVG shape, is refused at once.
	 */
	readonly blockFound: (target: string) => Promise<void>;
	/** What the block so found shows as its text; refused at once as `blockFound` refuses. */
	readonly holdingOf: (target: string) => Promise<BlockHolding>;
};

/**
 * How round a block's corners are as the page reads them: each corner's radius; or, where one is written so no length
 * reads it, as a `calc()` mixing a share and pixels, that radius as CSS computes it, which a piece of it refuses.
 */
export type Rounding = Corners | { readonly unread: string };

/** The filmed page as a move reads it and types into it. */
export interface FilmedPage {
	/** Where a block stands on the screen; with `every`, the first that many that match, together. */
	readonly box: (target: string, every: number) => Promise<Box>;
	/**
	 * The colour of the ground behind the first block a target matches, in hex, as the page draws it: the first
	 * background the blocks it stands in draw whole, or white where none does.
	 */
	readonly groundBehind: (target: string) => Promise<string>;
	/**
	 * How round each corner of the first block a target matches is drawn, or of the one block it holds where it is a bare
	 * wrapper, in the screen's pixels, as its border radii come out on its box. A target the page lacks is refused at
	 * once.
	 */
	readonly roundingOf: (target: string) => Promise<Rounding>;
	/**
	 * Where the letters of the first block a target matches start on the screen, as the page lays them out, read
	 * without writing into it: the box its first laid-out letter takes, or, in a block that lays out none, the box a
	 * letter of its font would take at the start of its content, in its middle; as wide as a letter steps in that font.
	 * None where the block lays out nothing, as it is hidden. A target the page lacks is refused at once.
	 */
	readonly letterAtTheStart: (target: string) => Promise<Box | null>;
	/** The scroll a target takes to reach its aim; a target the page lacks is refused at once. */
	readonly scrollCourse: (target: string, aim: ScrollAim) => Promise<ScrollCourse>;
	/**
	 * Every block whose scroll carries a source, up to the page's root, by the keys the page knows them by: those whose
	 * scrolls carry all of the first `every` blocks a selector matches, as the page lays them out; for a box of the
	 * screen, the block the page shows at its middle and those whose scrolls carry it. A source the page lacks is
	 * refused at once.
	 */
	readonly blocksHolding: (source: string | Box, every: number) => Promise<readonly BlockKey[]>;
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
 * out before the film is shot, the key the scene and the stage know it by, and whether a move draws it past its screen,
 * which the stage lays it again for, in a frame of its own: the one at the screen's size stays what moves measure.
 */
export interface OwnPage {
	readonly key: string;
	readonly html: string;
	readonly drawnPast: boolean;
}

// FNV-1a over a page's code units, 32 bits: where it starts, what it multiplies by, and the base its key is written in
const HASH_START = 0x811c9dc5;
const HASH_PRIME = 0x01000193;
const KEY_BASE = 36;
// A hash kept to 32 bits unsigned, as a shift by none keeps it
const UNSIGNED = 0;

/** A page of the film's own, from its HTML, drawn past its screen or not. */
export function ownPageOf(html: string, drawnPast: boolean): OwnPage {
	return { key: pageKeyOf(html), html, drawnPast };
}

/** The key a page of the film's own is known by: a hash of its HTML, with its length. */
export function pageKeyOf(html: string): string {
	let hash = HASH_START;
	for (let place = 0; place < html.length; place += 1) {
		hash = Math.imul(hash ^ html.charCodeAt(place), HASH_PRIME) >>> UNSIGNED;
	}
	return `${hash.toString(KEY_BASE)}-${html.length.toString(KEY_BASE)}`;
}
