/**
 * What is done to the page itself between frames: its own scroll, and keys a person types into it.
 *
 * These change the page, not the scene: each frame sets the page's scroll, or presses the keys due by then, so the
 * page renders a little each frame as a person's scroll and typing make it.
 */
import { between, type Ease, linear } from '#domain/time';
import { type Keystroke, typedBy, typingSeconds } from '#domain/typing';
import { type PageMotion, type PageMove, type Timing, type TimingScript, timingOf } from '#direction/move';
import type { PageDriver, PageReader, ScrollCourse, Scrolling } from '#direction/page';

// Keys come at the times they are given unless the film names a curve
const AT_ITS_TIMES: Ease = linear;
const BACKSPACE = 'Backspace';

/** A block of the page that scrolls, moved `pixels` down its scroll (up, below none). */
export class ScrollBy implements PageMove {
	readonly kind = 'page';
	readonly timing: Timing;
	readonly target: string;
	readonly pixels: number;

	constructor(target: string, pixels: number, script: TimingScript) {
		this.timing = timingOf(script);
		this.target = target;
		this.pixels = pixels;
	}

	async begin(page: PageReader): Promise<PageMotion> {
		return new Scrolled(await page.scrolling(this.target), this.pixels);
	}
}

/** The page scrolled until a block of it stands `top` pixels below the top of what scrolls it. */
export class ScrollTo implements PageMove {
	readonly kind = 'page';
	readonly timing: Timing;
	readonly target: string;
	readonly top: number;

	constructor(target: string, top: number, script: TimingScript) {
		this.timing = timingOf(script);
		this.target = target;
		this.top = top;
	}

	async begin(page: PageReader): Promise<PageMotion> {
		return new ScrolledTo(await page.scrollingTo(this.target, this.top));
	}
}

/** A person typing into whatever holds the page's keyboard: real keys, at the times the strokes have them. */
export class TypeIntoPage implements PageMove {
	readonly kind = 'page';
	readonly timing: Timing;
	readonly strokes: readonly Keystroke[];

	constructor(strokes: readonly Keystroke[], script: TimingScript) {
		this.timing = timingOf({ ease: AT_ITS_TIMES, ...script });
		this.strokes = strokes;
	}

	begin(): Promise<PageMotion> {
		return Promise.resolve(new KeysPressed(this.strokes));
	}
}

class Scrolled implements PageMotion {
	readonly scrolling: Scrolling;
	readonly pixels: number;

	constructor(scrolling: Scrolling, pixels: number) {
		this.scrolling = scrolling;
		this.pixels = pixels;
	}

	at(_page: PageDriver, progress: number): Promise<void> {
		return this.scrolling.scroll(this.scrolling.top + this.pixels * progress);
	}
}

class ScrolledTo implements PageMotion {
	readonly course: ScrollCourse;

	constructor(course: ScrollCourse) {
		this.course = course;
	}

	at(_page: PageDriver, progress: number): Promise<void> {
		return this.course.scroll(between(this.course.start, this.course.end, progress));
	}
}

/** The keys due by each frame pressed, a slip rubbed out as a person rubs it out. */
class KeysPressed implements PageMotion {
	readonly strokes: readonly Keystroke[];
	// What stands typed in the page so far: the keys are the page's, so what was pressed is kept here
	private standing = '';

	constructor(strokes: readonly Keystroke[]) {
		this.strokes = strokes;
	}

	async at(page: PageDriver, progress: number): Promise<void> {
		const wanted = typedBy(this.strokes, progress * typingSeconds(this.strokes));
		const kept = sharedStart(wanted, this.standing);
		for (let rubbed = kept; rubbed < this.standing.length; rubbed += 1) await page.press(BACKSPACE);
		if (wanted.length > kept) await page.type(wanted.slice(kept));
		this.standing = wanted;
	}
}

/** How far a block scrolls: so many pixels down its scroll, up where below none. */
export interface ScrollByScript extends TimingScript {
	readonly pixels: number;
}

/** Where the scroll ends: the target's top so many pixels below the top of what scrolls it. */
export interface ScrollToScript extends TimingScript {
	readonly top: number;
}

export function scrollBy(target: string, script: ScrollByScript): ScrollBy {
	return new ScrollBy(target, script.pixels, script);
}

export function scrollTo(target: string, script: ScrollToScript): ScrollTo {
	return new ScrollTo(target, script.top, script);
}

export function type(strokes: readonly Keystroke[], script: TimingScript = {}): TypeIntoPage {
	return new TypeIntoPage(strokes, script);
}

/** How many letters two texts share from their start. */
function sharedStart(first: string, second: string): number {
	const shortest = Math.min(first.length, second.length);
	const differing = [...Array(shortest).keys()].find((place) => first[place] !== second[place]);
	return differing ?? shortest;
}
