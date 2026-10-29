/**
 * Code: a pane of the film's code coming up in a place the film names (`src/domain/place.ts`), beside the page's
 * window or alone, in place of any code shown, from past a side of the frame where the film names one; moving to
 * another place; lines of it lit as they run; and going, or leaving past a side. Lines are counted from 1, as an
 * editor counts them, and a light past the last line shown is refused as it begins.
 */
import { FilmError } from '../domain/errors.ts';
import { type Box, boxToward } from '../domain/geometry.ts';
import { A_COUNT, A_STRING, type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, enteringFrom, pastTheEdge, shownComing, wordsPlaced } from '../domain/place.ts';
import { A_FRAME_SIDE, type FrameSide } from '../domain/split.ts';
import { between, linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { type CodeLine, NOT_LIT, WHOLLY_LIT, type WrittenCode, codeOf } from '../props/code.ts';
import { going } from './words.ts';

/** Where code stands: `at` a place on the frame; and the side it comes in `from`, past the frame's edge, if any. */
export interface CodeScript extends TimingScript {
	readonly at: Place;
	readonly from?: FrameSide;
}

/** The side code slides out `toward`, past the frame's edge, rather than going where it stands. */
export interface CodeHideScript extends TimingScript {
	readonly toward?: FrameSide;
}

/** The last line lit, where the film lights more than one: lines from the one named through this one. */
export interface LightScript extends TimingScript {
	readonly through?: number;
}

const CODE_FORM: Form<CodeScript> = { at: needed(A_PLACE), from: A_FRAME_SIDE, ...TIMING_FORM };
const CODE_HIDE_FORM: Form<CodeHideScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM };
const LIGHT_FORM: Form<LightScript> = { through: A_COUNT, ...TIMING_FORM };
// Code travelling past the frame's edge stays whole, neither gone nor going
const NOT_GONE = 0;
// Lines are counted from 1, places in a list from 0
const FIRST_LINE = 1;

/**
 * Code coming up in its place, its ground first, then its lines one after another at an even pace; travelling in from
 * past a side of the frame where the film names one.
 */
export function show(text: string, script: CodeScript): Move {
	assertKind(text, A_STRING, "code.show's text");
	assertWritten(script, CODE_FORM, 'code.show');
	const written = codeOf(text);
	const from = script.from ?? null;
	return {
		part: 'code',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => showing(written, beginning, wordsPlaced(beginning.format, script.at), from)
	};
}

/** The code shown moving to another place, through the boxes between. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "code.to's place");
	assertWritten(script, TIMING_FORM, 'code.to');
	return { part: 'code', timing: timingOf(script), begin: (beginning) => moving(beginning, place) };
}

/** A line of the code shown lit, or the lines from it through another; the rest dim, and any lit before go out. */
export function light(line: number, script: LightScript = {}): Move {
	assertKind(line, A_COUNT, "code.light's line");
	assertWritten(script, LIGHT_FORM, 'code.light');
	const through = script.through ?? line;
	return { part: 'code', timing: timingOf(script), begin: (beginning) => lighting(beginning, line, through) };
}

/** The code on the screen going, its pane with it, or leaving past a side of the frame; once gone, there is none. */
export function hide(script: CodeHideScript = {}): Move {
	assertWritten(script, CODE_HIDE_FORM, 'code.hide');
	const toward = script.toward ?? null;
	return {
		part: 'code',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going('code', beginning) : leaving(beginning, toward))
	};
}

function showing(written: WrittenCode, beginning: Beginning, box: Box, from: FrameSide | null): Change {
	const lines = written.lines.map((pieces) => ({ pieces, lit: NOT_LIT }));
	const { key, columns } = written;
	const start = enteringFrom(box, from, beginning.format.frame);
	return propChange('code', (progress) => ({
		lines,
		key,
		columns,
		box: boxToward(start, box, progress),
		shown: shownComing(from, progress),
		gone: NOT_GONE
	}));
}

function moving(beginning: Beginning, place: Place): Change {
	const code = present(beginning, 'code', 'code.to moves code, but none is on the screen');
	const end = wordsPlaced(beginning.format, place);
	return propChange('code', (progress) => ({ ...code, box: boxToward(code.box, end, progress) }));
}

/** The code in its place travelling past a side of the frame, whole; once there, none. */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const code = present(beginning, 'code', 'code.hide hides what is not on the screen');
	const end = pastTheEdge(code.box, toward, beginning.format.frame);
	return propChange('code', (progress) => untilTheEnd(progress, { ...code, box: boxToward(code.box, end, progress) }));
}

function lighting(beginning: Beginning, first: number, last: number): Change {
	const shown = present(beginning, 'code', 'lines of code are lit, but no code is on the screen');
	const count = shown.lines.length;
	if (last < first || last > count) {
		throw new FilmError(
			`code.light lights lines ${first} through ${last}, but the code shown has ${count}: name lines from 1 to ${count}, the last no earlier than the first`
		);
	}
	return propChange('code', (progress) => ({
		...shown,
		lines: shown.lines.map((line, place) => litToward(line, place + FIRST_LINE, first, last, progress))
	}));
}

/** A line `progress` of the way to lit, where it is among those named, or to out. */
function litToward(line: CodeLine, number: number, first: number, last: number, progress: number): CodeLine {
	const named = number >= first && number <= last;
	return { ...line, lit: between(line.lit, named ? WHOLLY_LIT : NOT_LIT, progress) };
}
