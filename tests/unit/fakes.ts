// Stand-ins for the browser in the unit tests: a page whose blocks stand where a table says, and a stage, footage and
// a track that keep what they were handed
import type {
	ActContext,
	BlockHolding,
	FilmedPage,
	PageMotionSwitch,
	ScrollAim,
	ScrollCourse
} from '../../src/direction/page.ts';
import type { BlockKey } from '../../src/domain/placement.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Box, Format } from '../../src/domain/geometry.ts';
import type { TypedText } from '../../src/domain/typing.ts';
import type { OwnPageStanding } from '../../src/domain/own-page.ts';
import type { DrawnScene } from '../../src/scene.ts';
import type {
	Exposures,
	Footage,
	FramedStage,
	Opened,
	OwnPages,
	PageTime,
	PicturedPage,
	PicturedStage,
	Stage,
	Track
} from '../../src/studio/ports.ts';

export const SMALL: Format = { frame: { width: 400, height: 400 }, screen: { width: 600, height: 400 } };
// The eye's focal length a test's scene opens with, in pixels of a frame 1080 high: as far as it stands from the frame
// at rest, which the numbers the tests work out by hand take
export const FOCAL_LENGTH = 2000;

// How far a test's page scrolls where it names none: far past anything a test runs it; and a page that grows by nothing
// whatever is typed into it
const A_LONG_PAGE = 100000;
const NOTHING_GROWS = (): number => 0;
// The key a test's page knows the block that scrolls the page itself by
export const THE_PAGES_OWN_SCROLL: BlockKey = 0;

/**
 * A page whose blocks stand where a table says, the ground behind each as another says, as far as it scrolls with
 * nothing typed and so much farther as a rule says of what is typed, each block holding what a third table says.
 */
export class PageOfBoxes implements FilmedPage {
	readonly boxes: ReadonlyMap<string, Box>;
	readonly grounds: ReadonlyMap<string, string>;
	readonly length: number;
	readonly holdings: ReadonlyMap<string, BlockHolding>;
	readonly growth: (typed: readonly TypedText[]) => number;
	readonly typed: string[] = [];

	constructor(
		boxes: ReadonlyMap<string, Box>,
		grounds: ReadonlyMap<string, string> = new Map(),
		length = A_LONG_PAGE,
		holdings: ReadonlyMap<string, BlockHolding> = new Map(),
		growth: (typed: readonly TypedText[]) => number = NOTHING_GROWS
	) {
		this.boxes = boxes;
		this.grounds = grounds;
		this.length = length;
		this.holdings = holdings;
		this.growth = growth;
	}

	/** A test names only the blocks whose holding its page has. */
	holdingOf(target: string): Promise<BlockHolding> {
		return Promise.resolve(this.holdings.get(target)!);
	}

	scrollLengthWith(typed: readonly TypedText[]): Promise<number> {
		return Promise.resolve(this.length + this.growth(typed));
	}

	/** A test names only the blocks its page has. */
	box(target: string): Promise<Box> {
		return Promise.resolve(this.boxes.get(target)!);
	}

	/** A test's page stands at its top, so a block's top on its screen is its top in the document. */
	documentTop(target: string): Promise<number> {
		return Promise.resolve(this.boxes.get(target)!.top);
	}

	/** A test names only the blocks whose ground its page has. */
	groundBehind(target: string): Promise<string> {
		return Promise.resolve(this.grounds.get(target)!);
	}

	scrollCourse(): Promise<ScrollCourse> {
		return Promise.resolve({ start: 0, end: 0, block: THE_PAGES_OWN_SCROLL, scroll: () => Promise.resolve() });
	}

	/** Every block of a test's page stands in the page's own scroll alone. */
	blocksHolding(): Promise<readonly BlockKey[]> {
		return Promise.resolve([THE_PAGES_OWN_SCROLL]);
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
 * Where a test page's blocks stand among the blocks that scroll, each by the key the page knows it by: the block a
 * scroll of a target moves, by `page.scrollBy`, the target's own, and by `page.scrollTo`, the one that scrolls it; and
 * the blocks each target stands in.
 */
export interface ScrollingBlocks {
	readonly moved: Readonly<Record<ScrollAim['kind'], ReadonlyMap<string, BlockKey>>>;
	readonly holding: ReadonlyMap<string | Box, readonly BlockKey[]>;
}

/**
 * A page of boxes whose blocks stand among the blocks that scroll as a table says, and whose every scroll runs so many
 * pixels down the block it moves from where it stands.
 */
export class PageScrollingBy extends PageOfBoxes {
	readonly pixels: number;
	readonly scrolling: ScrollingBlocks;

	constructor(boxes: ReadonlyMap<string, Box>, pixels: number, scrolling: ScrollingBlocks) {
		super(boxes);
		this.pixels = pixels;
		this.scrolling = scrolling;
	}

	/** A test scrolls only the blocks its table names for the scroll. */
	scrollCourse(target: string, aim: ScrollAim): Promise<ScrollCourse> {
		const block = this.scrolling.moved[aim.kind].get(target)!;
		return Promise.resolve({ start: 0, end: this.pixels, block, scroll: () => Promise.resolve() });
	}

	/** A test lifts only the selectors and the boxes, the very objects, its table names. */
	blocksHolding(source: string | Box): Promise<readonly BlockKey[]> {
		return Promise.resolve(this.scrolling.holding.get(source)!);
	}
}

/**
 * A stage of either kind, drawing one exposure of a frame at a time, that keeps every scene drawn on it and how many
 * each drawing was of, and counts its captures and the times it was waited on to finish drawing.
 */
export abstract class StageThatKeeps {
	readonly exposuresAtOnce: number = 1;
	readonly drawn: DrawnScene[] = [];
	readonly draws: number[] = [];
	captured = 0;
	waitedOn = 0;
	private lost: Error | undefined = undefined;

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		this.drawn.push(...exposures);
		this.draws.push(exposures.length);
		return Promise.resolve();
	}

	drawingFinished(): Promise<void> {
		this.waitedOn += 1;
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

/** The pages of the film's own as a take reads them, each by its key, keeping how each was stood, in turn. */
export class OwnPagesThatKeep implements OwnPages {
	readonly laid: ReadonlyMap<string, PageOfBoxes>;
	readonly stood: OwnPageStanding[] = [];

	constructor(laid: ReadonlyMap<string, PageOfBoxes>) {
		this.laid = laid;
	}

	stand(standing: OwnPageStanding): Promise<void> {
		this.stood.push(standing);
		return Promise.resolve();
	}
}

/** A stage with the page live in its frame. */
export class FramedStageThatKeeps extends StageThatKeeps implements FramedStage {
	readonly kind = 'framed';
	readonly laidFlat: DrawnScene[] = [];

	layFlat(scene: DrawnScene): Promise<void> {
		this.laidFlat.push(scene);
		return Promise.resolve();
	}

	standUp(): Promise<void> {
		return Promise.resolve();
	}
}

/**
 * A picture of a part of the screen a stage was asked to hold, the zoom it was to be as sharp as, and the page it was
 * to be of.
 */
export interface PictureAsked {
	readonly part: Box;
	readonly zoom: number;
	readonly page: PicturedPage;
}

/**
 * A stage showing a picture of a page that never changes, which keeps the zoom each picture was taken to hold: every
 * picture of it comes out as the last; each picture of a part of the screen it was asked to hold, numbered from 1; and
 * the number of each it was told to let go, in turn.
 */
export class PicturedStageThatKeeps extends StageThatKeeps implements PicturedStage {
	readonly kind = 'pictured';
	readonly retakenAt: number[] = [];
	readonly held: PictureAsked[] = [];
	readonly letGone: number[] = [];

	retakePage(zoom: number): Promise<boolean> {
		this.retakenAt.push(zoom);
		return Promise.resolve(true);
	}

	holdPicture(part: Box, zoom: number, page: PicturedPage): Promise<number> {
		this.held.push({ part, zoom, page });
		return Promise.resolve(this.held.length);
	}

	letGo(number: number): Promise<void> {
		this.letGone.push(number);
		return Promise.resolve();
	}

	changedOfItself(): boolean {
		return false;
	}
}

/** The take's way to hold a picture of a part of the screen, as a move asks it: each part asked, numbered from 1. */
export class PicturesHeld {
	readonly parts: Box[] = [];

	hold(part: Box): Promise<number> {
		this.parts.push(part);
		return Promise.resolve(this.parts.length);
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

// No unit test acts on a real page, nor shows a set: a film's acts are shot in the smoke tests, in a browser
const NO_PAGE = undefined as never;
const NO_SET = undefined as never;

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

export function openedOn(
	page: PageOfBoxes,
	stage: Stage,
	time: PageTime = new PageTimeLogged(),
	ownPages: OwnPagesThatKeep = new OwnPagesThatKeep(new Map())
): Opened {
	const act: ActContext = { page: NO_PAGE, motion: new MotionSwitch(), set: NO_SET };
	return { stage, page, ownPages, act, time, [Symbol.asyncDispose]: () => Promise.resolve() };
}
