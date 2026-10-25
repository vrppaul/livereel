/** The cursor: along a slight arc to a block of the page, as a hand moves it; pressed in and let go; taken away. */
import { type Box, type Point, bowedArc, pointAlong } from '../domain/geometry.ts';
import { easeOutCubic } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import type { ActContext } from '../direction/page.ts';
import { type Step, act, play } from '../direction/steps.ts';

/** Where a cursor not yet on the screen comes in from, and how far its path bends off the straight line. */
export interface CursorScript extends TimingScript {
	readonly entering?: Point;
	readonly bow?: number;
}

// How far the arc bends off the straight line, as a share of its length
const BOW = 0.14;
// Where on a block the cursor comes to rest: a little into it from the left, at most so far, and just under its middle
const REST_ACROSS = 0.55;
const REST_ACROSS_AT_MOST = 60;
const REST_DOWN = 0.6;
// Where a cursor not yet on the screen comes in from, below and to the right of where it goes
const ENTERS_FROM_RIGHT = 260;
const ENTERS_FROM_BELOW = 220;
// How long a press goes in, and how long it takes to let go
const PRESS_SECONDS = 0.09;
const RELEASE_SECONDS = 0.12;
const PRESSED = 'the cursor is pressed, but it is not on the screen';
const HIDDEN: Change = propChange('cursor', () => null);

/** The cursor to a block of the page, from where it is, or from where it enters if it is not yet on the screen. */
export function to(target: string, script: CursorScript = {}): Move {
	return { part: 'cursor', timing: timingOf(script), begin: (beginning) => along(beginning, target, script) };
}

export function press(script: TimingScript = {}): Move {
	return { part: 'cursor', timing: timingOf(script), begin: (beginning) => pressing(beginning, true) };
}

export function release(script: TimingScript = {}): Move {
	return { part: 'cursor', timing: timingOf(script), begin: (beginning) => pressing(beginning, false) };
}

/** The cursor taken off the screen. */
export function hide(): Move {
	return { part: 'cursor', timing: timingOf({}), begin: () => HIDDEN };
}

/** The cursor pressed in, the page clicked as `action` does it, and the cursor let go. */
export function click(action: (context: ActContext) => Promise<void>): readonly Step[] {
	return [
		play({ seconds: PRESS_SECONDS, moves: [press()], ease: easeOutCubic }),
		act(action),
		play({ seconds: RELEASE_SECONDS, moves: [release()], ease: easeOutCubic })
	];
}

async function along(beginning: Beginning, target: string, script: CursorScript): Promise<Change> {
	const end = restingOn(await beginning.page.box(target, 1));
	const start = beginning.scene.cursor ?? script.entering ?? enteringFor(end);
	const arc = bowedArc({ left: start.left, top: start.top }, end, script.bow ?? BOW);
	return propChange('cursor', (progress) => ({ ...pointAlong(arc, progress), press: 0 }));
}

function pressing(beginning: Beginning, down: boolean): Change {
	const cursor = present(beginning, 'cursor', PRESSED);
	return propChange('cursor', (progress) => ({ ...cursor, press: down ? progress : 1 - progress }));
}

function restingOn(box: Box): Point {
	return {
		left: box.left + Math.min(box.width * REST_ACROSS, REST_ACROSS_AT_MOST),
		top: box.top + box.height * REST_DOWN
	};
}

function enteringFor(end: Point): Point {
	return { left: end.left + ENTERS_FROM_RIGHT, top: end.top + ENTERS_FROM_BELOW };
}
