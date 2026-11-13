/**
 * The filmed page as moves read it and type into it: where its blocks and their letters stand, the ground behind
 * them, its scroll, its keyboard; and a page of the film's own as moves measure it, among the rest how far down it
 * scrolls with what is typed into its blocks, how far down its document a block stands, and the block the film types
 * into or blinks, found as the stage finds it, and what it shows as its text.
 *
 * The functions handed to the page run there, each alone: none may call another of this module. The block a scroll
 * moves is kept as a handle for the move that scrolls it, released with the browser. A ground is read through a
 * canvas of the page's own, which turns any colour CSS writes, in whatever form, into its channels. Where a block's
 * letters start is read off what the page lays out, its first letter, or, where it lays out none, as a blank line of
 * code, its content box; how far a letter steps in their font, and how tall it stands, off a canvas too, which knows
 * the font but not the scale the page draws it at: the first letter's box carries that scale, and a blank block is
 * drawn as much larger as the transforms over it make it. No letter is set into the page to measure it: only an act
 * changes the filmed page, and a page watching itself would see one.
 *
 * A block a scroll moves, and every block whose scroll carries the source of a piece riding its block, is told by a key
 * the take gives it, the same however a film selects the block, so a scroll and a ride meet on the block itself, never
 * on a selector's text. The keys are held in the frame's document, keyed by the elements themselves, by a handle the
 * take keeps: the page is not changed to name a block, and a document the frame goes on to starts with none, its
 * blocks keyed past the last key given.
 *
 * Which blocks' scrolls carry a block the page reads off how the browser lays the block out, not off the blocks it
 * stands in: a block placed apart, absolutely or fixed, is laid out from the block the browser places it from, and the
 * scrolls of the blocks between leave it where it stands, as a column fixed to the screen stays as the page scrolls. A
 * block placed `sticky` is carried by its scrolls until it sticks, which no reading of its style tells, and is taken as
 * carried.
 */
import type { Frame, JSHandle, Keyboard } from 'playwright-core';
import { type Channels, hexOf } from '../../domain/colour.ts';
import { FilmError } from '../../domain/errors.ts';
import {
	type Box,
	type Corners,
	MIDDLE_SHARE,
	type Point,
	type Size,
	boxAround,
	pointAt
} from '../../domain/geometry.ts';
import { described } from '../../domain/handed.ts';
import type { ActContext, BlockHolding, FilmedPage, ScrollAim, ScrollCourse } from '../../direction/page.ts';
import type { BlockKey } from '../../domain/placement.ts';
import type { TypedText } from '../../domain/typing.ts';

/** The page a take films as moves read it, and as an act is handed it: live, or the film's set (`set.ts`). */
export interface FilmedShown {
	readonly page: FilmedPage;
	readonly act: ActContext;
}

/** Where a target's top is to stand below the top of what scrolls it, handed to the page with the target. */
interface CourseAsked {
	readonly target: Element;
	readonly top: number;
}

interface CourseFound {
	readonly start: number;
	readonly end: number;
}

/** A block a measure wrote a typed text into, and the text it held before, which the measure writes back. */
interface BlockWritten {
	readonly block: Element;
	readonly found: string | null;
}

/**
 * How the page reads a colour, handed to it: on a square canvas with sides this many pixels long, a background counting
 * as drawn whole where its alpha reads this.
 */
interface GroundAsked {
	readonly canvasSide: number;
	readonly whole: number;
}

/**
 * How a block's corners are rounded, as the page reads them: each corner's radius as CSS computes it, the box the block
 * lays out, and the box it is drawn as.
 */
interface RadiiRead {
	readonly radii: readonly string[];
	readonly laid: Size;
	readonly drawn: Size;
}

/**
 * What a block that paints nothing computes, handed to the page: its ground's colour and picture, its shadow, and, on
 * each of the properties its border's widths are set by, a width.
 */
interface PaintsNone {
	readonly colour: string;
	readonly picture: string;
	readonly shadow: string;
	readonly borderWidths: readonly string[];
	readonly border: string;
}

/**
 * A font as a canvas is handed it, as large as the page lays it out: CSS's `font` shorthand, and how far apart its
 * letters stand, as CSS writes each.
 */
interface CanvasFont {
	readonly font: string;
	readonly letterSpacing: string;
}

/** How many times larger the transforms over a block draw it than the page lays it out, across and down. */
interface DrawnLarger {
	readonly across: number;
	readonly down: number;
}

/**
 * Where a block's letters start on the screen, as the page draws them, and the font they are set in, as large as the
 * page lays it out: the box its first letter takes, which carries every scale the page draws the letter at; or, for a
 * block that lays out none, its content box, which a letter would stand in the middle of, and how much larger than it
 * lays the box out the transforms over the block draw it.
 */
type LettersStart = FirstLetterLaid | BlankBlockLaid;

/** What a block's letter stands in on the screen, where and how tall, and the font it is set in. */
interface LetterStandsIn {
	readonly left: number;
	readonly top: number;
	readonly height: number;
	readonly font: CanvasFont;
}

interface FirstLetterLaid extends LetterStandsIn {
	readonly kind: 'letter';
}

interface BlankBlockLaid extends LetterStandsIn {
	readonly kind: 'blank';
	readonly drawnLarger: DrawnLarger;
}

/** A letter handed to the page to measure on a canvas, in a font. */
interface LetterAsked extends CanvasFont {
	readonly letter: string;
}

/** How far a letter steps, its width with the spacing after it, and how tall its font stands, ascent and descent. */
interface LetterMeasured {
	readonly width: number;
	readonly height: number;
}

/**
 * The keys a take gave blocks of one document of the frame, held in that document by a handle alone: no global, no
 * attribute, nothing the page or a selector sees, and gone with the document.
 */
type BlockKeys = WeakMap<Element, BlockKey>;

/** What the page is handed to key blocks: the keys its document holds, the blocks, and the next key to give. */
interface KeysAsked {
	readonly keys: BlockKeys;
	readonly blocks: Element[];
	readonly next: BlockKey;
}

/**
 * What the page is handed to find the blocks whose scrolls carry blocks: the blocks, and the positions that place a
 * block apart from the flow of the block it stands in.
 */
interface HoldersAsked {
	readonly blocks: Node[];
	readonly placedApart: string[];
}

/** The keys of the blocks asked, in their order, and how many of them were given anew. */
interface BlocksKeyed {
	readonly keys: BlockKey[];
	readonly given: number;
}

// What a block's overflow is when it scrolls of itself
const SCROLLS = new Set(['auto', 'scroll']);
// The positions that place a block from the block the browser picks, its offset parent, not the one it stands in
const PLACED_APART = new Set(['absolute', 'fixed']);
// The keys of the frame's document before a move asks for one
const NONE_KEPT = null;
// What the page answers where a CSS selector selects no HTML element
const NONE_SELECTED = null;
// A canvas of one pixel reads a colour's alpha from 0 to 255, the most, where the colour is drawn whole
const GROUND_ASKED: GroundAsked = { canvasSide: 1, whole: 255 };
// The properties a block's corners are rounded by: top left, top right, bottom right, bottom left
const CORNER_RADII = [
	'border-top-left-radius',
	'border-top-right-radius',
	'border-bottom-right-radius',
	'border-bottom-left-radius'
];
// What a block that paints nothing of its own computes; and a block it holds standing as large and where it does,
// within half a pixel, as a wrapper holds the card it lays out
const PAINTS_NONE: PaintsNone = {
	colour: 'rgba(0, 0, 0, 0)',
	picture: 'none',
	shadow: 'none',
	borderWidths: ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
	border: '0px'
};
const AS_LARGE_WITHIN = 0.5;
// A radius CSS computes as one across and one down, a space apart, each a length in pixels or a percentage of the box,
// a number and its unit and nothing else; and as a percentage of the box
const RADII_APART = ' ';
const LENGTH_READ = /^-?[\d.]+(?:e-?\d+)?(?:px|%)$/u;
const A_SHARE_SIGN = '%';
const SHARES_WHOLE = 100;
const SQUARE_WRITTEN = '0px';
const SQUARE = 0;
const NOT_SCALED = 1;
// The ground read where no block a block stands in draws one: white, the browser's canvas in the light scheme a film
// asks for where it names none; a page that lets the dark scheme in shows its canvas dark, which is not read
const WHITE: Channels = { red: 255, green: 255, blue: 255, alpha: 255 };
// The letter measured in a block's font to find how far one steps: a figure, as wide as every letter of the monospace
// fonts code is set in
const A_LETTER = '0';
// What the page answers where a block lays out nothing, as it is hidden
const NONE_LAID = null;
// Chromium lays a page out in sixty-fourths of a pixel
const LAYOUT_UNITS_A_PIXEL = 64;

export class PlaywrightPage implements FilmedPage {
	readonly frame: Frame;
	readonly keyboard: Keyboard;
	// The keys of the blocks of the frame's document, made as a move first asks for one, and anew in each document the
	// frame comes to after
	private keys: JSHandle<BlockKeys> | null = NONE_KEPT;
	// How many keys the take has given, in every document, which the next new block's key follows
	private keysGiven = 0;

	constructor(frame: Frame, keyboard: Keyboard) {
		this.frame = frame;
		this.keyboard = keyboard;
	}

	async box(target: string, every: number): Promise<Box> {
		const [first, ...others] = (await this.boxes(target)).slice(0, every);
		if (first === undefined) throw nothingMatches(target);
		return boxAround([first, ...others]);
	}

	/** Where every block a target matches stands on the screen, in the page's order: none where it matches none. */
	boxes(target: string): Promise<Box[]> {
		return this.frame.locator(target).evaluateAll(boxesOf);
	}

	async groundBehind(target: string): Promise<string> {
		const block = await this.found(target);
		return hexOf((await block.evaluate(groundOf, GROUND_ASKED)) ?? WHITE);
	}

	async cornersOf(target: string): Promise<Corners> {
		const drawing = await this.drawingOf(await this.found(target));
		return cornersFrom(await drawing.evaluate(radiiRead, CORNER_RADII), target);
	}

	/**
	 * The block that draws a block: the block itself, or, where it paints nothing of its own, the one block it holds,
	 * where that one stands as large and where it does, as a wrapper holds the card it lays out, and so on down.
	 */
	private async drawingOf(block: JSHandle<Element>): Promise<JSHandle<Element>> {
		let drawing = block;
		while (
			(await drawing.evaluate(paintsNothing, PAINTS_NONE)) &&
			(await drawing.evaluate(holdsOneAsLarge, AS_LARGE_WITHIN))
		) {
			drawing = await drawing.evaluateHandle(firstHeld);
		}
		return drawing;
	}

	async letterAtTheStart(target: string): Promise<Box | null> {
		const start = await (await this.found(target)).evaluate(lettersStartOf);
		if (start === NONE_LAID) return null;
		const letter = await this.frame.evaluate(letterMeasured, { letter: A_LETTER, ...start.font });
		switch (start.kind) {
			case 'letter':
				return letterOver(start, letter);
			case 'blank':
				return letterInTheMiddle(start, letter);
		}
	}

	async scrollCourse(target: string, aim: ScrollAim): Promise<ScrollCourse> {
		const block = await this.found(target);
		switch (aim.kind) {
			case 'by':
				return this.courseOn(block, await block.evaluate(courseBy, aim.pixels));
			case 'to':
				return this.courseTo(block, aim.top);
		}
	}

	async blocksHolding(source: string | Box, every: number): Promise<readonly BlockKey[]> {
		if (typeof source === 'string') return this.keysOf(await this.holdersOf(await this.selected(source, every)));
		const shown = await this.shownAt(source);
		const shownKeys = await this.keysOf(await shown.evaluateHandle(alone));
		return [...shownKeys, ...(await this.keysOf(await this.holdersOf([shown])))];
	}

	/**
	 * How far down the page's own scroll goes at most, in its pixels, with each block a typed text names holding that
	 * text: none where the page fits its frame. Each block holds what it held again after.
	 */
	scrollLengthWith(typed: readonly TypedText[]): Promise<number> {
		return this.frame.evaluate(scrollLengthTyped, typed);
	}

	/**
	 * How far down the page's document the first block a target matches stands, in its pixels, however far it is
	 * scrolled.
	 */
	async documentTop(target: string): Promise<number> {
		return (await this.found(target)).evaluate(documentTopOf);
	}

	async blockFound(target: string): Promise<void> {
		await this.written(target);
	}

	async holdingOf(target: string): Promise<BlockHolding> {
		return (await this.written(target)).evaluate(holdingOfTheBlock);
	}

	type(text: string): Promise<void> {
		return this.keyboard.type(text);
	}

	press(key: string): Promise<void> {
		return this.keyboard.press(key);
	}

	/** The first block a target matches as the page stands, refused at once where none does. */
	private async found(target: string): Promise<JSHandle<Element>> {
		const blocks = this.frame.locator(target);
		if ((await blocks.count()) === 0) throw nothingMatches(target);
		return blocks.first().evaluateHandle(itself);
	}

	/**
	 * The block the stage writes, typing its text or blinking it, found as it finds it (`blockOf` in
	 * `stage/own-page.js`): the first a CSS selector matches, an HTML element; refused at once where there is none.
	 */
	private async written(target: string): Promise<JSHandle<HTMLElement>> {
		const block = (await this.frame.evaluateHandle(writtenBlockOf, target)).asElement();
		if (block === NONE_SELECTED) throw new FilmError(`no HTML element of the page matches ${target} as a CSS selector`);
		return block;
	}

	/** The first `every` blocks a selector matches, refused at once where it matches none. */
	private async selected(target: string, every: number): Promise<readonly JSHandle<Node>[]> {
		const blocks = (await this.frame.locator(target).elementHandles()).slice(0, every);
		if (blocks.length === 0) throw nothingMatches(target);
		return blocks;
	}

	/**
	 * The block the page shows at the middle of a box of the screen, the innermost drawn there, whose own scroll moves
	 * what shows there; refused at once where it shows none, as past the screen's edge.
	 */
	private async shownAt(box: Box): Promise<JSHandle<Element>> {
		const shown = (await this.frame.evaluateHandle(shownAt, pointAt(box, MIDDLE_SHARE))).asElement();
		if (shown === null) throw new FilmError(`the page shows no block at the middle of box ${described(box)}`);
		return shown;
	}

	/** Every block whose scroll carries all the blocks, nearest first, as the page lays them out (`holdersOfAll`). */
	private holdersOf(blocks: readonly JSHandle<Node>[]): Promise<JSHandle<Element[]>> {
		return this.frame.evaluateHandle(holdersOfAll, { blocks: [...blocks], placedApart: [...PLACED_APART] });
	}

	/**
	 * The nearest block whose scroll carries the target and that scrolls of itself, or the page's own scroll, scrolled
	 * until the target stands `top` below its top.
	 */
	private async courseTo(block: JSHandle<Element>, top: number): Promise<ScrollCourse> {
		const holders = await this.holdersOf([block]);
		const scroller = await holders.evaluateHandle(firstScrolling, [...SCROLLS]);
		return this.courseOn(scroller, await scroller.evaluate(courseTo, { target: block, top }));
	}

	/** A course found on a block that scrolls, with the key the page knows that block by. */
	private async courseOn(scroller: JSHandle<Element>, course: CourseFound): Promise<ScrollCourse> {
		const [block] = await this.keysOf(await scroller.evaluateHandle(alone));
		// The page hands back a key for each block it is handed: one here, which the type checker cannot see
		if (block === undefined) throw new Error('the page keyed no block it was handed');
		return { start: course.start, end: course.end, block, scroll: (top) => scroller.evaluate(scrollTopSet, top) };
	}

	/**
	 * The keys of blocks of the frame's document, in their order: each the one the take gave it, or the next the take
	 * has not given, in any document, so no two blocks of a take share one.
	 */
	private async keysOf(blocks: JSHandle<Element[]>): Promise<readonly BlockKey[]> {
		const keyed = await this.frame.evaluate(blocksKeyed, { keys: await this.keysNow(), blocks, next: this.keysGiven });
		this.keysGiven += keyed.given;
		return keyed.keys;
	}

	/**
	 * The keys of the blocks of the frame's document as it stands: those kept while their document is still the frame's,
	 * new ones once the frame has come to another document, where a handle into the one it left is refused.
	 */
	private async keysNow(): Promise<JSHandle<BlockKeys>> {
		const kept = this.keys;
		if (kept !== NONE_KEPT && (await stillOpen(kept))) return kept;
		const made = await this.frame.evaluateHandle(newKeys);
		this.keys = made;
		return made;
	}
}

function nothingMatches(target: string): FilmError {
	return new FilmError(`nothing on the page matches ${target}`);
}

/** Whether a handle is into the document its frame shows still: one into a document the frame has left is refused. */
async function stillOpen(handle: JSHandle): Promise<boolean> {
	try {
		await handle.evaluate(() => undefined);
		return true;
	} catch {
		return false;
	}
}

/**
 * The letter over the first one the page laid out of a block: where that one stands, as tall, and as wide as a letter
 * steps, the canvas's step grown as many times as that letter's box is taller than the font on the canvas.
 */
function letterOver(laid: FirstLetterLaid, letter: LetterMeasured): Box {
	const { left, top, height } = laid;
	return { left, top, width: (letter.width * height) / letter.height, height };
}

/**
 * A letter in the middle of a blank block's content box, drawn as much larger as the transforms over the block draw it:
 * the leading above it rounded down to a whole pixel of the page's layout, as Chromium lays a line's letters out in its
 * height.
 */
function letterInTheMiddle(blank: BlankBlockLaid, letter: LetterMeasured): Box {
	const { left, top, height, drawnLarger } = blank;
	// The box as tall as the page lays it out, to its unit of layout: the transforms are read off a matrix CSS writes in
	// six figures, which could leave an even leading a hair short of its whole pixels
	const laidHeight = Math.round((height / drawnLarger.down) * LAYOUT_UNITS_A_PIXEL) / LAYOUT_UNITS_A_PIXEL;
	const leadingAbove = Math.floor((laidHeight - letter.height) * MIDDLE_SHARE.top);
	return {
		left,
		top: top + leadingAbove * drawnLarger.down,
		width: letter.width * drawnLarger.across,
		height: letter.height * drawnLarger.down
	};
}

// What follows runs in the page, each function handed over alone

/** A block as a handle the page keeps for the move that scrolls it. */
function itself(block: Element): Element {
	return block;
}

function boxesOf(blocks: Element[]): Box[] {
	return blocks
		.map((block) => block.getBoundingClientRect())
		.map((bounds) => ({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }));
}

/**
 * The channels of the first background the blocks a block stands in draw whole, nearest first, read off a canvas of a
 * pixel painted with each; none where none does. A tint drawn over its ground, seen through, is passed by.
 */
function groundOf(block: Element, asked: GroundAsked): Channels | null {
	const canvas = document.createElement('canvas');
	canvas.width = asked.canvasSide;
	canvas.height = asked.canvasSide;
	const paint = canvas.getContext('2d', { willReadFrequently: true });
	if (paint === null) throw new Error('the page gives no canvas to read a colour on');
	for (let holder = block.parentElement; holder !== null; holder = holder.parentElement) {
		paint.clearRect(0, 0, asked.canvasSide, asked.canvasSide);
		paint.fillStyle = getComputedStyle(holder).backgroundColor;
		paint.fillRect(0, 0, asked.canvasSide, asked.canvasSide);
		// A pixel's data holds its four channels always; the defaults tell the type checker so
		const [red = 0, green = 0, blue = 0, alpha = 0] = paint.getImageData(0, 0, asked.canvasSide, asked.canvasSide).data;
		if (alpha === asked.whole) return { red, green, blue, alpha };
	}
	return null;
}

/** Whether a block paints nothing of its own: no ground, picture, border or shadow. */
function paintsNothing(block: Element, none: PaintsNone): boolean {
	const style = getComputedStyle(block);
	return (
		style.backgroundColor === none.colour &&
		style.backgroundImage === none.picture &&
		style.boxShadow === none.shadow &&
		none.borderWidths.every((width) => style.getPropertyValue(width) === none.border)
	);
}

/** Whether a block holds one block alone, standing as large and where it does, within so many pixels. */
function holdsOneAsLarge(block: Element, within: number): boolean {
	const held = block.firstElementChild;
	if (block.children.length !== 1 || held === null) return false;
	const outer = block.getBoundingClientRect();
	const inner = held.getBoundingClientRect();
	return (
		Math.abs(inner.left - outer.left) < within &&
		Math.abs(inner.top - outer.top) < within &&
		Math.abs(inner.width - outer.width) < within &&
		Math.abs(inner.height - outer.height) < within
	);
}

/** The first block a block holds, asked of one that holds one. */
function firstHeld(block: Element): Element {
	const held = block.firstElementChild;
	if (held === null) throw new Error('a block asked for the block it holds holds none');
	return held;
}

/**
 * How a block's corners are rounded, read off the page: each corner's border radius as CSS computes it, top left, top
 * right, bottom right, bottom left; the box the block lays out, which a share of it is written of; and the box it is
 * drawn as, as the transforms over it scale it.
 */
function radiiRead(block: Element, radii: readonly string[]): RadiiRead {
	const style = getComputedStyle(block);
	const bounds = block.getBoundingClientRect();
	const laid = block instanceof HTMLElement ? { width: block.offsetWidth, height: block.offsetHeight } : bounds;
	return {
		radii: radii.map((property) => style.getPropertyValue(property)),
		laid: { width: laid.width, height: laid.height },
		drawn: { width: bounds.width, height: bounds.height }
	};
}

/**
 * How round each corner of a block is drawn, in the screen's pixels, as its radii read come out on its box: a share of
 * its width across and of its height down where written as one; of an elliptical corner the narrower way, as the stage
 * rounds a corner as a circle; as many times as large across and down as the block is drawn. Refused where a radius is
 * written in a way it cannot be read, as a `calc()` mixing a share and pixels.
 */
function cornersFrom(read: RadiiRead, target: string): Corners {
	const across = read.laid.width > 0 ? read.drawn.width / read.laid.width : NOT_SCALED;
	const down = read.laid.height > 0 ? read.drawn.height / read.laid.height : NOT_SCALED;
	const radii = read.radii.map((radius) => radiusOf(radius, read.laid, { across, down }));
	const unread = read.radii.find((_, place) => Number.isNaN(radii[place]));
	if (unread !== undefined) {
		throw new FilmError(
			`piece.show reads how round ${target} is drawn, and its border radius ${unread} is no length it reads: lift it with air and name its corner`
		);
	}
	// Each of the four properties gives a radius always; the defaults tell the type checker so
	const [topLeft = SQUARE, topRight = SQUARE, bottomRight = SQUARE, bottomLeft = SQUARE] = radii;
	return { topLeft, topRight, bottomRight, bottomLeft };
}

/**
 * How round a corner is drawn, in the screen's pixels, as CSS computes its radius on a box laid out so large and drawn
 * so many times as large across and down: one length, or one across and one down, each in pixels or as a share of the
 * box; the narrower way.
 */
function radiusOf(
	computed: string,
	laid: Size,
	drawnTimes: { readonly across: number; readonly down: number }
): number {
	const [across = SQUARE_WRITTEN, down = across] = computed.split(RADII_APART);
	return Math.min(lengthOf(across, laid.width) * drawnTimes.across, lengthOf(down, laid.height) * drawnTimes.down);
}

/** A length CSS computes, in pixels or as a share of a length, in pixels; none it reads, not a number, else. */
function lengthOf(computed: string, ofLength: number): number {
	if (!LENGTH_READ.test(computed)) return Number.NaN;
	const value = Number.parseFloat(computed);
	return computed.endsWith(A_SHARE_SIGN) ? (value / SHARES_WHOLE) * ofLength : value;
}

/**
 * Where a block's letters start, read off what the page lays out and draws, never written into it: the box of the
 * first letter of its text the page lays out, in that letter's own font, past text it lays out nothing of, as the
 * indentation of its markup; or, where it lays out no letter, as a blank line of code, its content box, inside its
 * border and padding, in the block's own font, with the transforms over the block multiplied, each read off its matrix.
 * The font is handed as large as the page lays it out: its computed size and spacing times the zoom over it, which they
 * leave out. None where the block lays out nothing, as it is hidden.
 */
function lettersStartOf(block: Element): LettersStart | null {
	const textLaid = document.createRange();
	const texts = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
	// The first stretch of a text the page lays out on a line: where its first letter laid out stands, and as tall
	let laid: DOMRect | undefined;
	let setIn = block;
	for (let text = texts.nextNode(); laid === undefined && text instanceof Text; text = texts.nextNode()) {
		textLaid.selectNodeContents(text);
		laid = [...textLaid.getClientRects()].find((stretch) => stretch.width > 0);
		// A text in the block stands in an element of it, which the type checker cannot see
		if (laid !== undefined) setIn = text.parentElement ?? block;
	}
	const style = getComputedStyle(setIn);
	const zoom = setIn.currentCSSZoom;
	// Letters spaced `normal`, a keyword, not a length, stand as far apart as the font sets them
	const spacing = setIn.computedStyleMap().get('letter-spacing');
	const font = {
		font: `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * zoom}px ${style.fontFamily}`,
		letterSpacing: `${spacing instanceof CSSUnitValue ? spacing.value * zoom : 0}px`
	};
	if (laid !== undefined) return { kind: 'letter', left: laid.left, top: laid.top, height: laid.height, font };
	const [own] = block.getClientRects();
	if (own === undefined) return null;
	// The transforms of the block and of every element it stands in, the block's first, as the page draws it
	let drawn = new DOMMatrixReadOnly();
	for (let holder: Element | null = block; holder !== null; holder = holder.parentElement) {
		drawn = new DOMMatrixReadOnly(getComputedStyle(holder).transform).multiply(drawn);
	}
	const drawnLarger = { across: Math.hypot(drawn.a, drawn.b), down: Math.hypot(drawn.c, drawn.d) };
	// How many times larger than its style computes them the page draws the block's border and padding: zoomed as it
	// lays them out, then transformed
	const acrossDrawn = zoom * drawnLarger.across;
	const downDrawn = zoom * drawnLarger.down;
	const top = own.top + (parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop)) * downDrawn;
	const bottom = own.bottom - (parseFloat(style.borderBottomWidth) + parseFloat(style.paddingBottom)) * downDrawn;
	const left = own.left + (parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft)) * acrossDrawn;
	return { kind: 'blank', left, top, height: bottom - top, font, drawnLarger };
}

/**
 * How far a letter steps in a font and how tall the font stands, measured on a canvas never put into the document, as
 * a ground is read: its width with the spacing after it, and the font's ascent and descent.
 */
function letterMeasured(asked: LetterAsked): LetterMeasured {
	const paint = document.createElement('canvas').getContext('2d');
	if (paint === null) throw new Error('the page gives no canvas to measure a letter on');
	paint.font = asked.font;
	paint.letterSpacing = asked.letterSpacing;
	const measured = paint.measureText(asked.letter);
	return { width: measured.width, height: measured.fontBoundingBoxAscent + measured.fontBoundingBoxDescent };
}

/**
 * How far the page's own scroll goes at most, the page's height past its frame's, with the first block each typed
 * text's selector matches holding that text; each block's text as it found it written back after.
 */
function scrollLengthTyped(typed: readonly TypedText[]): number {
	const written: BlockWritten[] = [];
	for (const text of typed) {
		const block = document.querySelector(text.into);
		if (block === null) throw new Error(`the film's own page holds no ${text.into} to type into`);
		written.push({ block, found: block.textContent });
		block.textContent = text.text;
	}
	const scroller = document.scrollingElement ?? document.documentElement;
	const length = scroller.scrollHeight - scroller.clientHeight;
	for (const { block, found } of written) block.textContent = found;
	return length;
}

/**
 * The first block a CSS selector matches, where it is an HTML element: none selected where the selector matches none,
 * its first match is no HTML element, as an SVG shape, or it is no CSS selector.
 */
function writtenBlockOf(target: string): HTMLElement | null {
	if (!CSS.supports(`selector(${target})`)) return null;
	const block = document.querySelector(target);
	return block instanceof HTMLElement ? block : null;
}

/**
 * What a block shows as its text: its value, where it is an input, told by the element's own interface, which holds no
 * text and shows its value alone; elements of its own; or its text alone, as a text area shows it while nobody has
 * edited it.
 */
function holdingOfTheBlock(block: HTMLElement): BlockHolding {
	if (block instanceof HTMLInputElement) return 'its value';
	return block.childElementCount > 0 ? 'elements' : 'text alone';
}

/** A block's top in its document: where it stands in the frame, and as far again as the page's own scroll has gone. */
function documentTopOf(block: Element): number {
	return block.getBoundingClientRect().top + scrollY;
}

function scrollTopSet(block: Element, top: number): void {
	block.scrollTop = top;
}

/** A block's own scroll, moved so many pixels as far as it goes either way. */
function courseBy(block: Element, pixels: number): CourseFound {
	const furthest = block.scrollHeight - block.clientHeight;
	return { start: block.scrollTop, end: Math.max(0, Math.min(block.scrollTop + pixels, furthest)) };
}

/** A block alone in a list, as the blocks a key is asked for are handed. */
function alone(block: Element): Element[] {
	return [block];
}

/** The block the page shows at a point of the screen, the innermost drawn there; none where it shows none. */
function shownAt(point: Point): Element | null {
	return document.elementFromPoint(point.left, point.top);
}

/** No key given yet in a document: each block of it keyed as it is first asked for. */
function newKeys(): BlockKeys {
	return new WeakMap();
}

/**
 * Every block whose scroll carries all the blocks, nearest first: the block each is laid out in, the block that one is
 * laid out in, and so on up to the document's root, which with its body scrolls the page. A block in the page's flow,
 * or offset from its place there, is laid out in the block it stands in; one placed apart, absolutely or fixed, in the
 * block the browser places it from, its offset parent, past the blocks between, whose scrolls leave it where it
 * stands; one fixed to the screen in none, so no scroll carries it. The offset parent is the browser's own reading, so
 * it knows every block that places what is fixed in it: a transform, a filter, containment. An SVG element has none,
 * and is taken as laid out in the block it stands in.
 */
function holdersOfAll(asked: HoldersAsked): Element[] {
	let carryingAll: Element[] | null = null;
	for (const block of asked.blocks) {
		const holders: Element[] = [];
		let held: Node | null = block;
		while (held !== null) {
			const holder: Element | null =
				held instanceof HTMLElement && asked.placedApart.includes(getComputedStyle(held).position)
					? held.offsetParent
					: held.parentElement;
			if (holder !== null) holders.push(holder);
			held = holder;
		}
		carryingAll = carryingAll === null ? holders : carryingAll.filter((holder) => holders.includes(holder));
	}
	return carryingAll ?? [];
}

/** The nearest of the blocks carrying a target that scrolls of itself, or the page's own scroll where none does. */
function firstScrolling(holders: Element[], scrolls: string[]): Element {
	const scroller = holders.find(
		(holder) => holder.scrollHeight > holder.clientHeight && scrolls.includes(getComputedStyle(holder).overflowY)
	);
	return scroller ?? document.scrollingElement ?? document.documentElement;
}

/** The keys of blocks: each the one its document holds for it, or the next new one, which the document then holds. */
function blocksKeyed(asked: KeysAsked): BlocksKeyed {
	const keys: BlockKey[] = [];
	let next = asked.next;
	for (const block of asked.blocks) {
		const kept = asked.keys.get(block);
		if (kept === undefined) {
			asked.keys.set(block, next);
			keys.push(next);
			next += 1;
		} else {
			keys.push(kept);
		}
	}
	return { keys, given: next - asked.next };
}

/**
 * Where a scroll starts, and where it ends with the target's top `top` pixels below the scroller's top, as far as it
 * goes. The page's own scroller is the window: its top is the window's, not the document's, which has moved with it.
 */
function courseTo(scroller: Element, asked: CourseAsked): CourseFound {
	const scrollerTop = scroller === document.scrollingElement ? 0 : scroller.getBoundingClientRect().top;
	const below = asked.target.getBoundingClientRect().top - scrollerTop;
	const furthest = scroller.scrollHeight - scroller.clientHeight;
	return { start: scroller.scrollTop, end: Math.max(0, Math.min(scroller.scrollTop + below - asked.top, furthest)) };
}
