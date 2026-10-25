// Stand-ins for the browser in the unit tests: a page whose blocks stand where a table says, and a stage, footage and
// a track that keep what they were handed
import type { ActContext, FilmedPage, ScrollCourse } from '../../src/direction/page.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Box, Format } from '../../src/domain/geometry.ts';
import type { DrawnScene } from '../../src/scene.ts';
import type { Footage, Opened, Stage, Track } from '../../src/studio/ports.ts';

export const SMALL: Format = { frame: { width: 400, height: 400 }, screen: { width: 600, height: 400 } };

export class PageOfBoxes implements FilmedPage {
	readonly boxes: ReadonlyMap<string, Box>;
	readonly typed: string[] = [];

	constructor(boxes: ReadonlyMap<string, Box>) {
		this.boxes = boxes;
	}

	/** A test names only the blocks its page has. */
	box(target: string): Promise<Box> {
		return Promise.resolve(this.boxes.get(target)!);
	}

	scrollCourse(): Promise<ScrollCourse> {
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

/** A sound heard, at the moment of the frame it was heard on. */
interface Heard {
	readonly moment: number;
	readonly sound: Sound;
}

/** A track that keeps every sound it hears, with its moment. */
export class TrackThatKeeps implements Track {
	readonly heard: Heard[] = [];

	expect(): void {}

	hear(moment: number, sound: Sound): void {
		this.heard.push({ moment, sound });
	}
}

// No unit test acts on a real page: a film's acts are shot in the smoke tests, in a browser
const NO_PAGE = undefined as never;
const STILL_MOTION = { release: () => Promise.resolve(), still: () => Promise.resolve() };

export function openedOn(page: PageOfBoxes, stage: Stage): Opened {
	const act: ActContext = { page: NO_PAGE, motion: STILL_MOTION };
	return { stage, page, act, [Symbol.asyncDispose]: () => Promise.resolve() };
}
