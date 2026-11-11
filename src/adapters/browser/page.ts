/**
 * The filmed page as moves read it and type into it: where its blocks and their letters stand, the ground behind
 * them, its scroll, its keyboard; and a page of the film's own as moves measure it, among the rest how far down it
 * scrolls with what is typed into its blocks, how far down its document a block stands, and what a block the film types
 * into shows as its text.
 *
 * The functions handed to the page run there, each alone: none may call another of this module. The block a scroll
 * moves is kept as a handle for the move that scrolls it, released with the browser. A ground is read through a
 * canvas of the page's own, which turns any colour CSS writes, in whatever form, into its channels. Where a block's
 * letters start, and how far one steps, is read off a letter set there for the measure and taken out at once, as the
 * page lays it: never off the block's box, which holds its padding too, nor off its own letters, of which a blank line
 * of code has none.
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
import { type Box, MIDDLE_SHARE, type Point, boxAround, pointAt } from '../../domain/geometry.ts';
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
// What the page answers where a CSS selector selects no block
const NONE_SELECTED = null;
// A canvas of one pixel reads a colour's alpha from 0 to 255, the most, where the colour is drawn whole
const GROUND_ASKED: GroundAsked = { canvasSide: 1, whole: 255 };
// The ground read where no block a block stands in draws one: white, the browser's canvas in the light scheme a film
// asks for where it names none; a page that lets the dark scheme in shows its canvas dark, which is not read
const WHITE: Channels = { red: 255, green: 255, blue: 255, alpha: 255 };
// The letter set at the start of a block's text to find where its letters start and how far one steps: a figure, as
// wide as every letter of the monospace fonts code is set in
const A_LETTER = '0';

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

	async letterAtTheStart(target: string): Promise<Box | null> {
		return (await this.found(target)).evaluate(letterAtTheStartOf, A_LETTER);
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

	/** How far down the page's document the first block a target matches stands, in its pixels, however far it is scrolled. */
	async documentTop(target: string): Promise<number> {
		return (await this.found(target)).evaluate(documentTopOf);
	}

	/**
	 * What the first block a target matches as a CSS selector, as the stage finds a block to write text into, shows as
	 * its text; refused at once where the page has none it matches, or the target is no CSS selector.
	 */
	async holdingOf(target: string): Promise<BlockHolding> {
		const holding = await this.frame.evaluate(holdingOfTheBlock, target);
		if (holding === NONE_SELECTED) throw new FilmError(`nothing on the page matches ${target} as a CSS selector`);
		return holding;
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

/**
 * The box a letter takes set at the start of a block's text: before the first text it holds, in that text's own
 * font, or into the block where it holds none; taken out again at once. None where the block lays out no letter, as
 * it is hidden.
 */
function letterAtTheStartOf(block: Element, letter: string): Box | null {
	const set = document.createTextNode(letter);
	const first = document.createTreeWalker(block, NodeFilter.SHOW_TEXT).nextNode();
	if (first instanceof Text) first.before(set);
	else block.prepend(set);
	const range = document.createRange();
	range.selectNodeContents(set);
	const [taken] = range.getClientRects();
	set.remove();
	if (taken === undefined || taken.width === 0) return null;
	return { left: taken.left, top: taken.top, width: taken.width, height: taken.height };
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
 * What the first block a CSS selector matches shows as its text: its value, where it is an input, told by the element's
 * own interface, which holds no text and shows its value alone; elements of its own; or its text alone, as a text area
 * shows it while nobody has edited it. None selected where it matches none, or is no CSS selector.
 */
function holdingOfTheBlock(target: string): BlockHolding | null {
	if (!CSS.supports(`selector(${target})`)) return null;
	const block = document.querySelector(target);
	if (block === null) return null;
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
