/**
 * The cursor: along a slight arc to a block of the page, as a hand moves it; pressed in with a click, and let go;
 * taken away.
 */
import { A_POINT, type Box, type Point, bowedArc, pointAlong } from '../domain/geometry.ts';
import { A_NUMBER, A_PATH, A_SELECTOR, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { easeOutCubic } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	shownBox,
	timingOf
} from '../direction/move.ts';
import type { ActContext } from '../direction/page.ts';
import { type SoundScript, heardAsItBegins, soundOf } from '../direction/sound.ts';
import { AN_ACTION, type Step, act, play } from '../direction/steps.ts';

/** Where a cursor not yet on the screen comes in from, and how far its path bends off the straight line. */
export interface CursorScript extends TimingScript {
	readonly entering?: Point;
	readonly bow?: number;
}

/** A press's timing, and the file of its click where it is not livereel's own. */
export interface PressScript extends TimingScript, SoundScript {}

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
const HIDDEN: Change = propChange('cursor', () => null);
const CURSOR_FORM: Form<CursorScript> = { entering: A_POINT, bow: A_NUMBER, ...TIMING_FORM };
const CLICK_FORM: Form<SoundScript> = { sound: A_PATH };
const PRESS_FORM: Form<PressScript> = { ...CLICK_FORM, ...TIMING_FORM };

/** The cursor to a block of the page, from where it is, or from where it enters if it is not yet on the screen. */
export function to(target: string, script: CursorScript = {}): Move {
	assertKind(target, A_SELECTOR, "cursor.to's selector");
	assertWritten(script, CURSOR_FORM, 'cursor.to');
	return { part: 'cursor', timing: timingOf(script), begin: (beginning) => along(beginning, target, script) };
}

/** The cursor pressed in, with a click as it begins: livereel's own, or the file the film gives as `sound`. */
export function press(script: PressScript = {}): Move {
	assertWritten(script, PRESS_FORM, 'cursor.press');
	return {
		part: 'cursor',
		timing: timingOf(script),
		sounds: [heardAsItBegins(soundOf(script, 'click'))],
		begin: pressingIn
	};
}

export function release(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'cursor.release');
	return { part: 'cursor', timing: timingOf(script), begin: lettingGo };
}

/** The cursor taken off the screen. */
export function hide(): Move {
	return { part: 'cursor', timing: timingOf({}), begin: () => HIDDEN };
}

/** The cursor pressed in with its click, the page clicked as `action` does it, and the cursor let go. */
export function click(action: (context: ActContext) => Promise<void>, script: SoundScript = {}): readonly Step[] {
	assertKind(action, AN_ACTION, "cursor.click's action");
	assertWritten(script, CLICK_FORM, 'cursor.click');
	return [
		play({ seconds: PRESS_SECONDS, moves: [press(script)], ease: easeOutCubic }),
		act(action),
		play({ seconds: RELEASE_SECONDS, moves: [release()], ease: easeOutCubic })
	];
}

async function along(beginning: Beginning, target: string, script: CursorScript): Promise<Change> {
	const end = restingOn(await shownBox(beginning, target, 1, 'cursor.to'));
	const start = beginning.scene.cursor ?? script.entering ?? enteringFor(end);
	const arc = bowedArc({ left: start.left, top: start.top }, end, script.bow ?? BOW);
	return propChange('cursor', (progress) => ({ ...pointAlong(arc, progress), press: 0 }));
}

function pressingIn(beginning: Beginning): Change {
	const cursor = present(beginning, 'cursor', 'the cursor is pressed, but it is not on the screen');
	return propChange('cursor', (progress) => ({ ...cursor, press: progress }));
}

function lettingGo(beginning: Beginning): Change {
	const cursor = present(beginning, 'cursor', 'the cursor is let go, but it is not on the screen');
	return propChange('cursor', (progress) => ({ ...cursor, press: 1 - progress }));
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
