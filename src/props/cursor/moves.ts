/** The cursor: along a slight arc to a block of the page, as a hand moves it, and pressed in and let go. */
import { FilmError } from '#domain/errors';
import { type Arc, type Point, bowedArc, pointAlong } from '#domain/geometry';
import { easeOutCubic } from '#domain/time';
import {
	type Beginning,
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';
import type { ActContext } from '#direction/page';
import { type Step, act, play } from '#direction/steps';
import type { Cursor } from './state.ts';

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

/** The cursor to a block of the page, from where it is, or from where it enters if it is not yet on the screen. */
export class CursorTo implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'cursor';
	readonly timing: Timing;
	readonly target: string;
	readonly entering: Point | null;
	readonly bow: number;

	constructor(target: string, script: CursorScript) {
		this.timing = timingOf(script);
		this.target = target;
		this.entering = script.entering ?? null;
		this.bow = script.bow ?? BOW;
	}

	async begin(beginning: Beginning): Promise<SceneChange> {
		const box = await beginning.page.box(this.target, 1);
		const end = {
			left: box.left + Math.min(box.width * REST_ACROSS, REST_ACROSS_AT_MOST),
			top: box.top + box.height * REST_DOWN
		};
		const start = beginning.scene.cursor ?? this.entering ?? enteringFor(end);
		return new PropChange('cursor', new Along(bowedArc({ left: start.left, top: start.top }, end, this.bow)));
	}
}

/** The cursor pressed in, or let go. */
export class Press implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'cursor';
	readonly timing: Timing;
	readonly down: boolean;

	constructor(down: boolean, script: TimingScript) {
		this.timing = timingOf(script);
		this.down = down;
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		const cursor = beginning.scene.cursor;
		if (cursor === null) return Promise.reject(new FilmError('the cursor is pressed, but it is not on the screen'));
		return Promise.resolve(new PropChange('cursor', new Pressing(cursor, this.down)));
	}
}

class Along implements PropMotion<Cursor> {
	readonly arc: Arc;

	constructor(arc: Arc) {
		this.arc = arc;
	}

	next(progress: number): Cursor {
		const point = pointAlong(this.arc, progress);
		return { left: point.left, top: point.top, press: 0 };
	}
}

class Pressing implements PropMotion<Cursor> {
	readonly cursor: Cursor;
	readonly down: boolean;

	constructor(cursor: Cursor, down: boolean) {
		this.cursor = cursor;
		this.down = down;
	}

	next(progress: number): Cursor {
		return { left: this.cursor.left, top: this.cursor.top, press: this.down ? progress : 1 - progress };
	}
}

export function to(target: string, script: CursorScript = {}): CursorTo {
	return new CursorTo(target, script);
}

export function press(script: TimingScript = {}): Press {
	return new Press(true, script);
}

export function release(script: TimingScript = {}): Press {
	return new Press(false, script);
}

/** The cursor pressed in, the page clicked as `action` does it, and the cursor let go. */
export function click(action: (context: ActContext) => Promise<void>): readonly Step[] {
	return [
		play({ seconds: PRESS_SECONDS, moves: [press()], ease: easeOutCubic }),
		act(action),
		play({ seconds: RELEASE_SECONDS, moves: [release()], ease: easeOutCubic })
	];
}

function enteringFor(end: Point): Point {
	return { left: end.left + ENTERS_FROM_RIGHT, top: end.top + ENTERS_FROM_BELOW };
}
