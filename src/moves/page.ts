/**
 * What is done to the page itself between frames: its own scroll, keys a person types into it, and an act at a moment
 * of a play; and the speed its own time runs at.
 *
 * The scroll and the keys change the page: each frame sets the page's scroll, or presses the keys due by then, so the
 * page renders a little each frame as a person's scroll and typing make it. Of the scene, a scroll changes only how far
 * the film has scrolled the block, which carries a piece riding it (`src/domain/placement.ts`). An act is done once, at
 * its moment, as its move begins, the film's time standing while the page answers and every other move going on round
 * it, so a camera need not stop at a click. It takes no time, so it clashes only with a scroll or a typing running
 * across its moment, which it would pull the page out from under, and the take does it before any move that begins
 * at that moment reads the page. The speed is the scene's, which the take runs the page's time by, so its time runs
 * ever faster or slower through a play, at once from a cut.
 */
import {
	A_NUMBER,
	A_NUMBER_OR_ENDLESS,
	A_PAGE_SPEED,
	A_SELECTOR,
	type Form,
	assertKind,
	assertWritten,
	needed
} from '../domain/handed.ts';
import { linear } from '../domain/curves.ts';
import { scrolledSoFar } from '../domain/placement.ts';
import { between } from '../domain/toward.ts';
import { A_STROKES, type Keystroke, typedAlong } from '../domain/typing.ts';
import {
	type Beginning,
	type Change,
	MOMENT_FORM,
	type MomentScript,
	type Move,
	TIMING_FORM,
	type TimingScript,
	UNCHANGED,
	momentTimingOf,
	timingOf
} from '../direction/move.ts';
import { AN_ACTION, type Action, type FilmedPage, type ScrollAim, type ScrollCourse } from '../direction/page.ts';
import { keysHeard } from '../direction/sound.ts';
import type { Typed } from '../direction/steps.ts';
import { type Scene, withPageSpeed, withScrolled } from '../scene.ts';
import { TYPING_FORM, type TypingScript } from './typing.ts';

/** How far a block scrolls: so many pixels down its scroll, up where below none. */
export interface ScrollByScript extends TimingScript {
	readonly pixels: number;
}

/** Where the scroll ends: the target's top so many pixels below the top of what scrolls it. */
export interface ScrollToScript extends TimingScript {
	readonly top: number;
}

const BACKSPACE = 'Backspace';
// The page's own time standing still: no speed is slower
const STANDING_STILL = 0;
const SCROLL_BY_FORM: Form<ScrollByScript> = { pixels: needed(A_NUMBER_OR_ENDLESS), ...TIMING_FORM };
const SCROLL_TO_FORM: Form<ScrollToScript> = { top: needed(A_NUMBER), ...TIMING_FORM };

/** A block of the page that scrolls, moved `pixels` down its scroll as far as it goes. */
export function scrollBy(target: string, script: ScrollByScript): Move {
	assertKind(target, A_SELECTOR, "page.scrollBy's selector");
	assertWritten(script, SCROLL_BY_FORM, 'page.scrollBy');
	const aim: ScrollAim = { kind: 'by', pixels: script.pixels };
	return { part: 'page', timing: timingOf(script), begin: (beginning) => scrolling(beginning, target, aim) };
}

/** The page scrolled until a block of it stands `top` pixels below the top of what scrolls it. */
export function scrollTo(target: string, script: ScrollToScript): Move {
	assertKind(target, A_SELECTOR, "page.scrollTo's selector");
	assertWritten(script, SCROLL_TO_FORM, 'page.scrollTo');
	const aim: ScrollAim = { kind: 'to', top: script.top };
	return { part: 'page', timing: timingOf(script), begin: (beginning) => scrolling(beginning, target, aim) };
}

/**
 * A person typing into whatever holds the page's keyboard: real keys, each heard, on the film's keyboard or the one
 * named, when the strokes have them.
 */
export function type(strokes: readonly Keystroke[], script: TypingScript = {}): Move & Typed {
	assertKind(strokes, A_STROKES, "page.type's strokes");
	assertWritten(script, TYPING_FORM, 'page.type');
	return {
		part: 'page',
		timing: timingOf({ ease: linear, ...script }),
		strokes,
		sounds: keysHeard(strokes, script.keyboard),
		begin: (beginning) => keysInto(beginning.page, strokes)
	};
}

/**
 * The page acted on for real at a moment of a step, while the play's other moves go on: `action(context)` is
 * Playwright code. A move that begins at that moment reads the page it left; two acts at one moment are done in the
 * order written.
 */
export function act(action: Action, script: MomentScript = {}): Move {
	assertKind(action, AN_ACTION, "page.act's action");
	assertWritten(script, MOMENT_FORM, 'page.act');
	return { part: 'page', timing: momentTimingOf(script), begin: (beginning) => actedAsItBegins(beginning, action) };
}

/**
 * The page's own time running at a speed, so many of its seconds to each of the film's: 4 shows a minute of the site
 * in 15 s, 0.5 slows it down, 0 stands it still; from the speed it runs at as the move's share begins.
 */
export function speed(pageSpeed: number, script: TimingScript = {}): Move {
	assertKind(pageSpeed, A_PAGE_SPEED, "page.speed's speed");
	assertWritten(script, TIMING_FORM, 'page.speed');
	return {
		part: 'pageSpeed',
		timing: timingOf(script),
		begin: (beginning) => speeding(beginning.scene.pageSpeed, pageSpeed)
	};
}

/** The page's speed on its way, never below standing still on a curve that passes its ends. */
function speeding(startSpeed: number, endSpeed: number): Change {
	return (scene, progress) => withPageSpeed(scene, Math.max(STANDING_STILL, between(startSpeed, endSpeed, progress)));
}

async function actedAsItBegins(beginning: Beginning, action: Action): Promise<Change> {
	await beginning.act(action);
	return UNCHANGED;
}

/**
 * A block's scroll on its course: the page scrolled so far each frame, and the scene told how far the film has
 * scrolled the block in all, from how far it had as the move began.
 */
async function scrolling(beginning: Beginning, target: string, aim: ScrollAim): Promise<Change> {
	const course = await beginning.page.scrollCourse(target, aim);
	const scrolledBefore = scrolledSoFar(beginning.scene.scrolled, target);
	return (scene, progress) => scrolledAlong(course, target, scrolledBefore, scene, progress);
}

async function scrolledAlong(
	course: ScrollCourse,
	target: string,
	scrolledBefore: number,
	scene: Scene,
	progress: number
): Promise<Scene> {
	const top = between(course.start, course.end, progress);
	await course.scroll(top);
	return withScrolled(scene, target, scrolledBefore + top - course.start);
}

function keysInto(page: FilmedPage, strokes: readonly Keystroke[]): Change {
	const keys = new KeysPressed(page, strokes);
	return (scene, progress) => keys.pressedBy(scene, progress);
}

/** The keys due by each frame pressed, a slip rubbed out as a person rubs it out. */
class KeysPressed {
	readonly page: FilmedPage;
	readonly strokes: readonly Keystroke[];
	// What stands typed in the page so far: the keys are the page's, so what was pressed is kept here
	private standing = '';

	constructor(page: FilmedPage, strokes: readonly Keystroke[]) {
		this.page = page;
		this.strokes = strokes;
	}

	async pressedBy(scene: Scene, progress: number): Promise<Scene> {
		const wanted = typedAlong(this.strokes, progress);
		const kept = sharedStart(wanted, this.standing);
		for (let rubbed = kept; rubbed < this.standing.length; rubbed += 1) await this.page.press(BACKSPACE);
		if (wanted.length > kept) await this.page.type(wanted.slice(kept));
		this.standing = wanted;
		return scene;
	}
}

/** How many letters two texts share from their start. */
function sharedStart(first: string, second: string): number {
	const shortest = Math.min(first.length, second.length);
	const differing = [...Array(shortest).keys()].find((place) => first[place] !== second[place]);
	return differing ?? shortest;
}
