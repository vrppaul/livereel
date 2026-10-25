/**
 * The filmed page as moves read it and type into it: where its blocks stand, its scroll, its keyboard.
 *
 * The functions handed to the page run there, each alone: none may call another of this module. A block that
 * scrolls is kept as a handle for the move that scrolls it, released with the browser.
 */
import type { Frame, Keyboard, Locator } from 'playwright-core';
import { FilmError } from '#domain/errors';
import { type Box, boxAround } from '#domain/geometry';
import type { PageDriver, PageReader, ScrollCourse, Scrolling } from '#direction/page';

/** Where a target's top is to stand below the top of what scrolls it, handed to the page with the target. */
interface CourseAsked {
	readonly target: Element;
	readonly top: number;
}

interface CourseFound {
	readonly start: number;
	readonly end: number;
}

// What a block's overflow is when it scrolls of itself
const SCROLLS = new Set(['auto', 'scroll']);

export class FilmedPage implements PageReader, PageDriver {
	readonly frame: Frame;
	readonly keyboard: Keyboard;

	constructor(frame: Frame, keyboard: Keyboard) {
		this.frame = frame;
		this.keyboard = keyboard;
	}

	async box(target: string, every: number): Promise<Box> {
		const [first, ...others] = (await this.frame.locator(target).evaluateAll(boxesOf)).slice(0, every);
		if (first === undefined) throw nothingMatches(target);
		return boxAround([first, ...others]);
	}

	async scrolling(target: string): Promise<Scrolling> {
		const block = await this.found(target);
		const top = await block.evaluate(scrollTopOf);
		return { top, scroll: (scrollTop) => block.evaluate(scrollTopSet, scrollTop) };
	}

	async scrollingTo(target: string, top: number): Promise<ScrollCourse> {
		const block = await (await this.found(target)).elementHandle();
		const scroller = await block.evaluateHandle(scrollerOf, [...SCROLLS]);
		const course = await scroller.evaluate(courseTo, { target: block, top });
		return { start: course.start, end: course.end, scroll: (scrollTop) => scroller.evaluate(scrollTopSet, scrollTop) };
	}

	/** The first block a target matches as the page stands, refused at once where none does. */
	private async found(target: string): Promise<Locator> {
		const blocks = this.frame.locator(target);
		if ((await blocks.count()) === 0) throw nothingMatches(target);
		return blocks.first();
	}

	type(text: string): Promise<void> {
		return this.keyboard.type(text);
	}

	press(key: string): Promise<void> {
		return this.keyboard.press(key);
	}
}

function nothingMatches(target: string): FilmError {
	return new FilmError(`nothing on the page matches ${target}`);
}

function boxesOf(blocks: Element[]): Box[] {
	return blocks
		.map((block) => block.getBoundingClientRect())
		.map((bounds) => ({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }));
}

function scrollTopOf(block: Element): number {
	return block.scrollTop;
}

function scrollTopSet(block: Element, top: number): void {
	block.scrollTop = top;
}

/** The nearest block above a target that scrolls of itself, or the page's own scroll. */
function scrollerOf(target: Element, scrolls: string[]): Element {
	let scroller = target.parentElement;
	while (scroller !== null) {
		const overflows = scroller.scrollHeight > scroller.clientHeight;
		if (overflows && scrolls.includes(getComputedStyle(scroller).overflowY)) return scroller;
		scroller = scroller.parentElement;
	}
	return document.scrollingElement ?? document.documentElement;
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
