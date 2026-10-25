// Stand-ins for the browser in the unit tests: a page whose blocks stand where a table says, and a stage and footage
// that keep what they were handed
import type { ActContext, PageDriver, PageReader, ScrollCourse, Scrolling } from '#direction/page';
import type { Box, Format } from '#domain/geometry';
import type { DrawnScene } from '#scene';
import type { Footage, Opened, Stage } from '#studio/ports';

export const SMALL: Format = { frame: { width: 400, height: 400 }, screen: { width: 600, height: 400 } };

export class PageOfBoxes implements PageReader, PageDriver {
	readonly boxes: ReadonlyMap<string, Box>;
	readonly typed: string[] = [];

	constructor(boxes: ReadonlyMap<string, Box>) {
		this.boxes = boxes;
	}

	/** A test names only the blocks its page has. */
	box(target: string): Promise<Box> {
		return Promise.resolve(this.boxes.get(target)!);
	}

	scrolling(): Promise<Scrolling> {
		return Promise.resolve({ top: 0, scroll: () => Promise.resolve() });
	}

	scrollingTo(): Promise<ScrollCourse> {
		return Promise.resolve({ start: 0, end: 0, scroll: () => Promise.resolve() });
	}

	type(text: string): Promise<void> {
		this.typed.push(text);
		return Promise.resolve();
	}

	press(): Promise<void> {
		return Promise.resolve();
	}
}

export class StageThatKeeps implements Stage {
	readonly drawn: DrawnScene[] = [];

	draw(scene: DrawnScene): Promise<void> {
		this.drawn.push(scene);
		return Promise.resolve();
	}

	layFlat(): Promise<void> {
		return Promise.resolve();
	}

	standUp(): Promise<void> {
		return Promise.resolve();
	}

	capture(): Promise<Uint8Array> {
		return Promise.resolve(new Uint8Array());
	}
}

/** Footage that keeps the shots it is told to keep, up to and including the last. */
export class FootageOf implements Footage {
	readonly wanted: ReadonlySet<number>;
	readonly last: number;
	readonly kept: number[] = [];

	constructor(wanted: readonly number[]) {
		this.wanted = new Set(wanted);
		this.last = Math.max(...wanted);
	}

	expect(): void {}

	keeps(shot: number): boolean {
		return this.wanted.has(shot);
	}

	keep(shot: number): Promise<void> {
		this.kept.push(shot);
		return Promise.resolve();
	}

	complete(shot: number): boolean {
		return shot > this.last;
	}
}

// No unit test acts on a real page: a film's acts are shot in the smoke tests, in a browser
const NO_PAGE = undefined as never;
const STILL_MOTION = { release: () => Promise.resolve(), still: () => Promise.resolve() };

export function openedOn(page: PageOfBoxes, stage: Stage): Opened {
	const act: ActContext = { page: NO_PAGE, motion: STILL_MOTION };
	return { stage, reader: page, driver: page, act, [Symbol.asyncDispose]: () => Promise.resolve() };
}
