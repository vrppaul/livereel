/**
 * Code: a pane of the film's code coming up in a place the film names (`src/domain/place.ts`), beside the page's
 * window or alone, in place of any code shown; lines of it lit as they run; and going. Lines are counted from 1, as an
 * editor counts them, and a light past the last line shown is refused as it begins.
 */
import { FilmError } from '../domain/errors.ts';
import type { Box } from '../domain/geometry.ts';
import { A_COUNT, A_STRING, type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, wordsPlaced } from '../domain/place.ts';
import { between, linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import { type CodeLine, NOT_LIT, WHOLLY_LIT, type WrittenCode, codeOf } from '../props/code.ts';
import { going } from './words.ts';

/** Where code stands: `at` a place on the frame. */
export interface CodeScript extends TimingScript {
	readonly at: Place;
}

/** The last line lit, where the film lights more than one: lines from the one named through this one. */
export interface LightScript extends TimingScript {
	readonly through?: number;
}

const CODE_FORM: Form<CodeScript> = { at: needed(A_PLACE), ...TIMING_FORM };
const LIGHT_FORM: Form<LightScript> = { through: A_COUNT, ...TIMING_FORM };
// Lines are counted from 1, places in a list from 0
const FIRST_LINE = 1;

/** Code coming up in its place, its ground first, then its lines one after another at an even pace. */
export function show(text: string, script: CodeScript): Move {
	assertKind(text, A_STRING, "code.show's text");
	assertWritten(script, CODE_FORM, 'code.show');
	const written = codeOf(text);
	return {
		part: 'code',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => showing(written, wordsPlaced(beginning.format, script.at))
	};
}

/** A line of the code shown lit, or the lines from it through another; the rest dim, and any lit before go out. */
export function light(line: number, script: LightScript = {}): Move {
	assertKind(line, A_COUNT, "code.light's line");
	assertWritten(script, LIGHT_FORM, 'code.light');
	const through = script.through ?? line;
	return { part: 'code', timing: timingOf(script), begin: (beginning) => lighting(beginning, line, through) };
}

/** The code on the screen going, its pane with it; once gone, there is none. */
export function hide(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'code.hide');
	return { part: 'code', timing: timingOf(script), begin: (beginning) => going('code', beginning) };
}

function showing(written: WrittenCode, box: Box): Change {
	const lines = written.lines.map((pieces) => ({ pieces, lit: NOT_LIT }));
	const { key, columns } = written;
	return propChange('code', (progress) => ({ lines, key, columns, box, shown: progress, gone: 0 }));
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
