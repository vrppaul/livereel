/**
 * Where a shoot's time goes: every call the take waits on, timed at the ports it is made through, and every blend the
 * footage makes, timed as it runs.
 *
 * Each port is wrapped as the take is handed it, so every call it makes on the browser, the stage, the filmed page and
 * the footage is counted and timed, and the footage's finish after the last frame with them; what none of them took
 * is said as the rest: the film's own code, its acts, the sounds read before the first frame, and the scene worked
 * out. Where the rest grows, a part of it is timed next, so no second is put down to a guess. The footage's blends
 * are timed apart, as they run beside the take rather than in its way; a frame of one exposure blends nothing, and
 * is not counted. Timing costs two readings of the clock a call, so a shoot is always timed, and says it where it is
 * asked to.
 */
import type { Box } from '../domain/geometry.ts';
import { MILLISECONDS_A_SECOND, secondsSaid } from '../domain/time.ts';
import type { ActContext, FilmedPage, ScrollAim, ScrollCourse } from '../direction/page.ts';
import type { DrawnScene } from '../scene.ts';
import type {
	Browser,
	Exposures,
	Footage,
	FramedStage,
	Opened,
	PicturedStage,
	Setting,
	Stage
} from '../studio/ports.ts';
import type { Blend } from './video/exposures.ts';

/** A reading of the time, in milliseconds, from a moment of its own. */
export type Clock = () => number;

/** A part timed: how many times it was called, and how long it took in all. */
interface Spent {
	readonly calls: number;
	readonly milliseconds: number;
}

// How the profile lays out its lines: each column's width, in letters; a part's calls and the time each took make one
// column, left blank for the rest
const PART_WIDTH = 22;
const CALLS_WIDTH = 6;
const TIMES = ' × ';
const EACH_WIDTH = 8;
const MILLISECONDS = ' ms';
const COUNTED_WIDTH = CALLS_WIDTH + TIMES.length + EACH_WIDTH + MILLISECONDS.length;
const SECONDS_WIDTH = 8;
const SHARE_WIDTH = 5;
const INDENT = '  ';
const EACH_DIGITS = 1;
const PERCENT = 100;
const THE_REST = 'the rest';
// A frame's own exposure, counted with its earlier ones in a blend's name
const ITS_OWN = 1;

/**
 * A shoot's profile: the parts the take waits on, timed at the ports handed to it, and the footage's blends, timed as
 * they run; said as lines once the shoot is done.
 */
export class Profile {
	readonly clock: Clock;
	readonly waited: Timings;
	readonly blended: Timings;
	private whole = 0;

	constructor(clock: Clock) {
		this.clock = clock;
		this.waited = new Timings(clock);
		this.blended = new Timings(clock);
	}

	/** The shoot, timed whole: what each part's share is of. */
	async shooting<Given>(work: () => Promise<Given>): Promise<Given> {
		const started = this.clock();
		try {
			return await work();
		} finally {
			this.whole += this.clock() - started;
		}
	}

	/** The footage finished after the last frame, the frames still queued written: a part of the shoot as well. */
	finishing(work: () => Promise<void>): Promise<void> {
		return this.shooting(() => this.waited.timed('footage.finish', work));
	}

	browser(browser: Browser): Browser {
		return new TimedBrowser(browser, this.waited);
	}

	footage(footage: Footage): Footage {
		return new TimedFootage(footage, this.waited);
	}

	blend(blend: Blend): Blend {
		return (exposures) =>
			exposures.earlier.length === 0
				? blend(exposures)
				: this.blended.timed(`blend of ${exposures.earlier.length + ITS_OWN}`, () => blend(exposures));
	}

	/** Where the shoot's time went. */
	said(): readonly string[] {
		return profileSaid(this.whole, this.waited, this.blended);
	}
}

/** The parts of a shoot timed, each by its name. */
export class Timings {
	readonly clock: Clock;
	private readonly parts = new Map<string, Spent>();

	constructor(clock: Clock) {
		this.clock = clock;
	}

	/** The work done, and its time added to its part's. */
	async timed<Given>(part: string, work: () => PromiseLike<Given>): Promise<Given> {
		const started = this.clock();
		try {
			return await work();
		} finally {
			const spent = this.parts.get(part) ?? { calls: 0, milliseconds: 0 };
			this.parts.set(part, { calls: spent.calls + 1, milliseconds: spent.milliseconds + this.clock() - started });
		}
	}

	/** Every part timed, the slowest first. */
	slowestFirst(): readonly (readonly [string, Spent])[] {
		return [...this.parts].sort(([, first], [, second]) => second.milliseconds - first.milliseconds);
	}

	/** How long every part took, together. */
	total(): number {
		return this.slowestFirst().reduce((sum, [, spent]) => sum + spent.milliseconds, 0);
	}
}

/**
 * Where a shoot of so many milliseconds went: each part the take waited on with its share of the whole, then the rest;
 * and the footage's blends, where it made any.
 */
export function profileSaid(whole: number, waited: Timings, blended: Timings): readonly string[] {
	const rest = whole - waited.total();
	const blends = blended.slowestFirst();
	return [
		`where the ${secondsOf(whole)} s went:`,
		...waited.slowestFirst().map(([part, spent]) => `${partSaid(part, spent)}${shareOf(spent.milliseconds, whole)}`),
		`${lineOf(THE_REST, '', rest)}${shareOf(rest, whole)}`,
		...(blends.length === 0 ? [] : ["the footage's blends, as they ran:"]),
		...blends.map(([part, spent]) => partSaid(part, spent))
	];
}

/** A part's line: its name, its calls, the time each took, and its seconds in all. */
function partSaid(part: string, spent: Spent): string {
	const each = (spent.milliseconds / spent.calls).toFixed(EACH_DIGITS);
	const counted = `${String(spent.calls).padStart(CALLS_WIDTH)}${TIMES}${each.padStart(EACH_WIDTH)}${MILLISECONDS}`;
	return lineOf(part, counted, spent.milliseconds);
}

function lineOf(part: string, counted: string, milliseconds: number): string {
	const seconds = secondsOf(milliseconds).padStart(SECONDS_WIDTH);
	return `${INDENT}${part.padEnd(PART_WIDTH)}${counted.padStart(COUNTED_WIDTH)}${seconds} s`;
}

function shareOf(milliseconds: number, whole: number): string {
	return `${String(Math.round((milliseconds / whole) * PERCENT)).padStart(SHARE_WIDTH)} %`;
}

function secondsOf(milliseconds: number): string {
	return secondsSaid(milliseconds / MILLISECONDS_A_SECOND);
}

/** A browser whose every call, and every call on what it opens, is timed. */
class TimedBrowser implements Browser {
	readonly browser: Browser;
	readonly timings: Timings;

	constructor(browser: Browser, timings: Timings) {
		this.browser = browser;
		this.timings = timings;
	}

	async open(setting: Setting, address: string, sharpness: number): Promise<Opened> {
		const opened = await this.timings.timed('browser.open', () => this.browser.open(setting, address, sharpness));
		return new TimedOpened(opened, this.timings);
	}
}

class TimedOpened implements Opened {
	readonly opened: Opened;
	readonly timings: Timings;
	readonly stage: Stage;
	readonly page: FilmedPage;
	readonly act: ActContext;

	constructor(opened: Opened, timings: Timings) {
		this.opened = opened;
		this.timings = timings;
		this.stage = timedStage(opened.stage, timings);
		this.page = new TimedPage(opened.page, timings);
		this.act = opened.act;
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.timings.timed('browser.close', () => this.opened[Symbol.asyncDispose]());
	}
}

/** A stage whose every call is timed, of the kind it is. */
function timedStage(stage: Stage, timings: Timings): Stage {
	switch (stage.kind) {
		case 'framed':
			return new TimedFramedStage(stage, timings);
		case 'pictured':
			return new TimedPicturedStage(stage, timings);
	}
}

/** What a stage of either kind does, timed. */
class TimedDrawingStage<Timed extends Stage> {
	readonly stage: Timed;
	readonly timings: Timings;

	constructor(stage: Timed, timings: Timings) {
		this.stage = stage;
		this.timings = timings;
	}

	get exposuresAtOnce(): number {
		return this.stage.exposuresAtOnce;
	}

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		return this.timings.timed('stage.draw', () => this.stage.draw(exposures));
	}

	absence(): Promise<Error | undefined> {
		return this.timings.timed('stage.absence', () => this.stage.absence());
	}

	capture(): Promise<Uint8Array> {
		return this.timings.timed('stage.capture', () => this.stage.capture());
	}
}

class TimedFramedStage extends TimedDrawingStage<FramedStage> implements FramedStage {
	readonly kind = 'framed';

	layFlat(scene: DrawnScene): Promise<void> {
		return this.timings.timed('stage.layFlat', () => this.stage.layFlat(scene));
	}

	standUp(): Promise<void> {
		return this.timings.timed('stage.standUp', () => this.stage.standUp());
	}
}

class TimedPicturedStage extends TimedDrawingStage<PicturedStage> implements PicturedStage {
	readonly kind = 'pictured';

	retakePage(zoom: number): Promise<boolean> {
		return this.timings.timed('stage.retakePage', () => this.stage.retakePage(zoom));
	}
}

/** The filmed page, its scroll's every step timed as well as each call. */
class TimedPage implements FilmedPage {
	readonly page: FilmedPage;
	readonly timings: Timings;

	constructor(page: FilmedPage, timings: Timings) {
		this.page = page;
		this.timings = timings;
	}

	box(target: string, every: number): Promise<Box> {
		return this.timings.timed('page.box', () => this.page.box(target, every));
	}

	async scrollCourse(target: string, aim: ScrollAim): Promise<ScrollCourse> {
		const course = await this.timings.timed('page.scrollCourse', () => this.page.scrollCourse(target, aim));
		return { ...course, scroll: (top) => this.timings.timed('page.scroll', () => course.scroll(top)) };
	}

	type(text: string): Promise<void> {
		return this.timings.timed('page.type', () => this.page.type(text));
	}

	press(key: string): Promise<void> {
		return this.timings.timed('page.press', () => this.page.press(key));
	}
}

/** Footage whose keeping of each frame is timed: how long the take waits on it. */
class TimedFootage implements Footage {
	readonly footage: Footage;
	readonly timings: Timings;

	constructor(footage: Footage, timings: Timings) {
		this.footage = footage;
		this.timings = timings;
	}

	expect(frames: number): void {
		this.footage.expect(frames);
	}

	keeps(shot: number): boolean {
		return this.footage.keeps(shot);
	}

	keep(shot: number, exposures: Exposures): Promise<void> {
		return this.timings.timed('footage.keep', () => this.footage.keep(shot, exposures));
	}

	complete(shot: number): boolean {
		return this.footage.complete(shot);
	}
}
