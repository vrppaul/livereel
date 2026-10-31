// Stand-ins for the browser in the unit tests: a page whose blocks stand where a table says, and a stage, footage and
// a track that keep what they were handed
import type { ActContext, FilmedPage, PageMotionSwitch, ScrollCourse } from '../../src/direction/page.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Box, Format } from '../../src/domain/geometry.ts';
import type { DrawnScene } from '../../src/scene.ts';
import type {
	Exposures,
	Footage,
	FramedStage,
	Opened,
	PageTime,
	PicturedStage,
	Stage,
	Track
} from '../../src/studio/ports.ts';

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

/**
 * A stage of either kind, drawing one exposure of a frame at a time, that keeps every scene drawn on it, how many each
 * drawing was of, and counts its captures.
 */
export abstract class StageThatKeeps {
	readonly exposuresAtOnce: number = 1;
	readonly drawn: DrawnScene[] = [];
	readonly draws: number[] = [];
	captured = 0;
	private lost: Error | undefined = undefined;

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		this.drawn.push(...exposures);
		this.draws.push(exposures.length);
		return Promise.resolve();
	}

	/** The stage, or the page in its frame, gone from now on, for the reason given. */
	lose(why: Error): Promise<void> {
		this.lost = why;
		return Promise.resolve();
	}

	absence(): Promise<Error | undefined> {
		return Promise.resolve(this.lost);
	}

	capture(): Promise<Uint8Array> {
		this.captured += 1;
		return Promise.resolve(new Uint8Array());
	}
}

/** A stage with the page live in its frame. */
export class FramedStageThatKeeps extends StageThatKeeps implements FramedStage {
	readonly kind = 'framed';

	layFlat(): Promise<void> {
		return Promise.resolve();
	}

	standUp(): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * A stage showing a picture of a page that never changes, which keeps the zoom each picture was taken to hold: every
 * picture of it comes out as the last.
 */
export class PicturedStageThatKeeps extends StageThatKeeps implements PicturedStage {
	readonly kind = 'pictured';
	readonly retakenAt: number[] = [];

	retakePage(zoom: number): Promise<boolean> {
		this.retakenAt.push(zoom);
		return Promise.resolve(true);
	}

	changedOfItself(): boolean {
		return false;
	}
}

/** Footage that keeps the shots it is told to keep, up to and including the last, and how many images each was. */
export class FootageOf implements Footage {
	readonly wanted: ReadonlySet<number>;
	readonly last: number;
	readonly kept: number[] = [];
	readonly exposed: number[] = [];

	constructor(wanted: readonly number[]) {
		this.wanted = new Set(wanted);
		this.last = Math.max(...wanted);
	}

	expect(): void {}

	keeps(shot: number): boolean {
		return this.wanted.has(shot);
	}

	keep(shot: number, exposures: Exposures): Promise<void> {
		this.kept.push(shot);
		this.exposed.push(exposures.earlier.length + 1);
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

	expect(): Promise<void> {
		return Promise.resolve();
	}

	hear(moment: number, sound: Sound): void {
		this.heard.push({ moment, sound });
	}
}

// No unit test acts on a real page: a film's acts are shot in the smoke tests, in a browser
const NO_PAGE = undefined as never;

/** The page's own motion as a switch that only keeps whether it is let go. */
class MotionSwitch implements PageMotionSwitch {
	released = false;

	release(): Promise<void> {
		this.released = true;
		return Promise.resolve();
	}

	still(): Promise<void> {
		this.released = false;
		return Promise.resolve();
	}
}

/**
 * The page's time as a log of what was asked of it, in order: `begun` as the film began, each moment it was run on
 * to, and `waited` for each time it ran as the wall's while the work handed to it was done.
 */
export class PageTimeLogged implements PageTime {
	readonly log: (number | 'begun' | 'waited')[] = [];

	begin(): void {
		this.log.push('begun');
	}

	runTo(moment: number): Promise<void> {
		this.log.push(moment);
		return Promise.resolve();
	}

	async running(work: () => Promise<void>): Promise<void> {
		await work();
		this.log.push('waited');
	}
}

export function openedOn(page: PageOfBoxes, stage: Stage, time: PageTime = new PageTimeLogged()): Opened {
	const act: ActContext = { page: NO_PAGE, motion: new MotionSwitch() };
	return { stage, page, act, time, [Symbol.asyncDispose]: () => Promise.resolve() };
}
