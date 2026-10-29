/**
 * Code: a pane of the film's code coming up in a place the film names (`src/domain/place.ts`), beside the page's
 * window or alone, in place of any code shown, from past a side of the frame where the film names one; moving to
 * another place; lines of it lit as they run; and going, or leaving past a side. Lines are counted from 1, as an
 * editor counts them, and a light past the last line shown is refused as it begins.
 */
import { FilmError } from '../domain/errors.ts';
import type { Box } from '../domain/geometry.ts';
import { A_COUNT, A_STRING, type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, enteringFrom, wordsPlaced } from '../domain/place.ts';
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
	timingOf
} from '../direction/move.ts';
import { type CodeLine, NOT_LIT, WHOLLY_LIT, type WrittenCode, codeOf } from '../props/code.ts';
import {
	NOT_GONE,
	WORDS_HIDE_FORM,
	type WordsHideScript,
	going,
	leavingToward,
	shownComing,
	travelling
} from './words.ts';

/** Where code stands: `at` a place on the frame; and the side it slides in `from`, past the frame's edge, if any. */
export interface CodeScript extends TimingScript {
	readonly at: Place;
	readonly from?: FrameSide;
}

/** The last line lit, where the film lights more than one: lines from the one named through this one. */
export interface LightScript extends TimingScript {
	readonly through?: number;
}

const CODE_FORM: Form<CodeScript> = { at: needed(A_PLACE), from: A_FRAME_SIDE, ...TIMING_FORM };
const LIGHT_FORM: Form<LightScript> = { through: A_COUNT, ...TIMING_FORM };
// Lines are counted from 1, places in a list from 0
const FIRST_LINE = 1;

/**
 * Code coming up in its place, its ground first, then its lines one after another at an even pace unless the film
 * names a curve; sliding in whole from past a side of the frame where the film names one.
 */
export function show(text: string, script: CodeScript): Move {
	assertKind(text, A_STRING, "code.show's text");
	assertWritten(script, CODE_FORM, 'code.show');
	const written = codeOf(text);
	const from = script.from ?? null;
	const evenly = from === null ? { ease: linear } : {};
	return {
		part: 'code',
		timing: timingOf({ ...evenly, ...script }),
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

/** The code on the screen going, its pane with it, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: WordsHideScript = {}): Move {
	assertWritten(script, WORDS_HIDE_FORM, 'code.hide');
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
	return travelling(
		'code',
		(at, progress) => ({ lines, key, columns, box: at, shown: shownComing(from, progress), gone: NOT_GONE }),
		start,
		box
	);
}

function moving(beginning: Beginning, place: Place): Change {
	const code = present(beginning, 'code', 'code.to() moves what is not on the screen');
	return travelling('code', (at) => ({ ...code, box: at }), code.box, wordsPlaced(beginning.format, place));
}

/** The code in its place sliding out past a side of the frame, whole; once there, none. */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const code = present(beginning, 'code', 'code.hide() hides what is not on the screen');
	return leavingToward('code', (at) => ({ ...code, box: at }), code.box, toward, beginning);
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
