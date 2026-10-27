/**
 * What is done to the page itself between frames: its own scroll, and keys a person types into it.
 *
 * These change the page, not the scene: each frame sets the page's scroll, or presses the keys due by then, so the
 * page renders a little each frame as a person's scroll and typing make it.
 */
import {
	A_NUMBER,
	A_NUMBER_OR_ENDLESS,
	A_SELECTOR,
	type Form,
	assertKind,
	assertWritten,
	needed
} from '../domain/handed.ts';
import { between, linear } from '../domain/time.ts';
import { A_STROKES, type Keystroke, typedAlong } from '../domain/typing.ts';
import { type Beginning, type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import type { FilmedPage, ScrollAim, ScrollCourse } from '../direction/page.ts';
import { keysHeard } from '../direction/sound.ts';
import type { Typed } from '../direction/steps.ts';
import type { Scene } from '../scene.ts';

/** How far a block scrolls: so many pixels down its scroll, up where below none. */
export interface ScrollByScript extends TimingScript {
	readonly pixels: number;
}

/** Where the scroll ends: the target's top so many pixels below the top of what scrolls it. */
export interface ScrollToScript extends TimingScript {
	readonly top: number;
}

const BACKSPACE = 'Backspace';
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

/** A person typing into whatever holds the page's keyboard: real keys, each heard, when the strokes have them. */
export function type(strokes: readonly Keystroke[], script: TimingScript = {}): Move & Typed {
	assertKind(strokes, A_STROKES, "page.type's strokes");
	assertWritten(script, TIMING_FORM, 'page.type');
	return {
		part: 'page',
		timing: timingOf({ ease: linear, ...script }),
		strokes,
		sounds: keysHeard(strokes),
		begin: (beginning) => keysInto(beginning.page, strokes)
	};
}

async function scrolling(beginning: Beginning, target: string, aim: ScrollAim): Promise<Change> {
	const course = await beginning.page.scrollCourse(target, aim);
	return (scene, progress) => scrolledAlong(course, scene, progress);
}

async function scrolledAlong(course: ScrollCourse, scene: Scene, progress: number): Promise<Scene> {
	await course.scroll(between(course.start, course.end, progress));
	return scene;
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
