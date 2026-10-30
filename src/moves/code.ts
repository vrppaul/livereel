/**
 * Code: a pane of the film's code, shown by an object (`src/moves/object.ts`), coming up in a place the film names
 * (`src/domain/place.ts`), beside the page's window or alone, in place of the code of its name shown, from past a side
 * of the frame where the film names one, pushing the code of its name shown off past the side across as it comes;
 * moving to another place; leaning; lines of it lit as they run; scrolled until a line stands at its top; and going,
 * or leaving past a side. Code is the object named `code`, or one the film names `as`, so several panes stand at once.
 * A line lit or scrolled to is named by its number, counted from 1 as an editor counts them, or by words only it says,
 * so lines may be added round it and the move still finds it; a line past the last shown, or words no line or more
 * than one says, are refused as the move begins, in its own words.
 */
import { FilmError } from '../domain/errors.ts';
import { A_COUNT, A_STRING, type Form, type Kind, Plain, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place } from '../domain/place.ts';
import { between } from '../domain/time.ts';
import { type Beginning, type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import {
	A_WAY_OF_LONG_LINES,
	type Code,
	type CodeLine,
	type LongLines,
	NOT_LIT,
	NOT_SCROLLED,
	WHOLLY_LIT,
	codeOf
} from '../props/code.ts';
import type { ObjectName } from '../props/object.ts';
import {
	type HideScript,
	NAMED_FORM,
	NESTED_FORM,
	type NamedScript,
	type NestedScript,
	type ObjectKind,
	type ObjectLeanScript,
	SHOW_FORM,
	type ShowScript,
	type ToScript,
	contentMove,
	contentOf,
	objectHide,
	objectLean,
	objectShow,
	objectTo,
	placedFor,
	showing
} from './object.ts';

/**
 * Where code stands, `at` a place on the frame or in what it stands `inside`, how it comes there, and how its pane fits
 * a line too long, `longLines`: its letters smaller until the widest fits, `'shrink'`, where the film names none, or
 * as large as the look has them, the line cut at the pane's edge, `'cut'`.
 */
export interface CodeScript extends ShowScript, NestedScript {
	readonly at: Place;
	readonly longLines?: LongLines;
}

/** A line of code as a film names it: by its number, from 1, or by words it says. */
type LineNamed = number | string;

/** The last line lit, where the film lights more than one, from the one named through this one; and which code. */
export interface LightScript extends TimingScript, NamedScript {
	readonly through?: LineNamed;
}

/** Which code scrolls, and how. */
export interface ScrollScript extends TimingScript, NamedScript {}

const CODE: ObjectKind = 'code';
const A_LINE_NAMED: Kind<LineNamed> = new Plain(
	isLineNamed,
	'a line: its number, a whole count from 1, or words it says, a string with something in it'
);
const CODE_FORM: Form<CodeScript> = {
	at: needed(A_PLACE),
	longLines: A_WAY_OF_LONG_LINES,
	...SHOW_FORM,
	...NESTED_FORM
};
const LIGHT_FORM: Form<LightScript> = { through: A_LINE_NAMED, ...NAMED_FORM, ...TIMING_FORM };
const SCROLL_FORM: Form<ScrollScript> = { ...NAMED_FORM, ...TIMING_FORM };
// Lines are counted from 1, places in a list from 0
const FIRST_LINE = 1;
// A pane fits a line too long as the look's letters made smaller, where the film names no way
const SHRINKING: LongLines = 'shrink';
// What each move that names a line says it does to it, where it refuses the line
const LIGHTS = 'code.light lights';
const SCROLLS_TO = 'code.scrollTo scrolls to';

/**
 * Code coming up in its place, its ground first, then its lines one after another at an even pace unless the film
 * names a curve; sliding in whole from past a side of the frame where the film names one.
 */
export function show(text: string, script: CodeScript): Move {
	assertKind(text, A_STRING, "code.show's text");
	assertWritten(script, CODE_FORM, 'code.show');
	const { lines, key, columns } = codeOf(text);
	const code: Code = {
		kind: 'code',
		lines: lines.map((pieces) => ({ pieces, lit: NOT_LIT })),
		key,
		columns,
		longLines: script.longLines ?? SHRINKING,
		scrolled: NOT_SCROLLED
	};
	return objectShow(CODE, 'code.show', script, script.at, (beginning) => ({
		content: code,
		box: placedFor(code.kind, beginning.format, script.at)
	}));
}

/** The code shown carried to another place, through the boxes between. */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(CODE, 'code.to', place, script);
}

/**
 * A line of the code shown lit, by its number or by what it says, or the lines from it through another; the rest dim,
 * and any lit before go out.
 */
export function light(line: LineNamed, script: LightScript = {}): Move {
	assertKind(line, A_LINE_NAMED, "code.light's line");
	assertWritten(script, LIGHT_FORM, 'code.light');
	const name = script.as ?? CODE;
	const through = script.through ?? line;
	return contentMove(name, timingOf(script), (beginning) => lighting(beginning, name, line, through));
}

/**
 * The code shown scrolled through the lines between until a line, by its number or by what it says, stands at its
 * top; it shares a step with a move that carries the code, and with one that lights its lines one after the other.
 */
export function scrollTo(line: LineNamed, script: ScrollScript = {}): Move {
	assertKind(line, A_LINE_NAMED, "code.scrollTo's line");
	assertWritten(script, SCROLL_FORM, 'code.scrollTo');
	const name = script.as ?? CODE;
	return contentMove(name, timingOf(script), (beginning) => scrolling(beginning, name, line));
}

/** The code shown leant back from its top edge by `tilt` and swung about its middle by `turn`, its pane with it. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(CODE, 'code.lean', script);
}

/** The code on the screen going, its pane with it, or sliding out past a side of the frame; once gone, none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(CODE, 'code.hide', script);
}

function lighting(beginning: Beginning, name: ObjectName, firstNamed: LineNamed, lastNamed: LineNamed): Change {
	const shown = contentOf(beginning, name, 'code.light', 'code');
	const count = shown.lines.length;
	const first = numberShown(shown.lines, firstNamed, LIGHTS);
	const last = numberOf(shown.lines, lastNamed, first, LIGHTS);
	if (last < first || last > count) {
		throw new FilmError(
			`${LIGHTS} lines ${first} through ${last}, but the code shown has ${count}: name lines from 1 to ${count}, the last no earlier than the first`
		);
	}
	return showing(name, (progress) => ({
		...shown,
		lines: shown.lines.map((line, place) => litToward(line, place + FIRST_LINE, first, last, progress))
	}));
}

/** The code on its way from where it stood scrolled to the line named standing at its top. */
function scrolling(beginning: Beginning, name: ObjectName, named: LineNamed): Change {
	const shown = contentOf(beginning, name, 'code.scrollTo', 'code');
	const top = numberShown(shown.lines, named, SCROLLS_TO);
	return showing(name, (progress) => ({ ...shown, scrolled: between(shown.scrolled, top - FIRST_LINE, progress) }));
}

/** The number of a line a film names, as `numberOf` finds it from the first line on; a line past the last is refused. */
function numberShown(lines: readonly CodeLine[], named: LineNamed, moveSays: string): number {
	const count = lines.length;
	const number = numberOf(lines, named, FIRST_LINE, moveSays);
	if (number > count) {
		throw new FilmError(`${moveSays} line ${number}, but the code shown has ${count}: name lines from 1 to ${count}`);
	}
	return number;
}

/**
 * The number of a line a film names: the number it gives, or that of the one line from `from` on that says the words
 * it gives. Words no line from there says are refused, and so are words more than one says, so a line said again
 * above the one meant never takes the move without a word; the refusal says what the move does to the line.
 */
function numberOf(lines: readonly CodeLine[], named: LineNamed, from: number, moveSays: string): number {
	if (typeof named === 'number') return named;
	const [only, ...others] = lines
		.map((line, place) => ({ line, number: place + FIRST_LINE }))
		.filter((numbered) => numbered.number >= from && textOf(numbered.line).includes(named))
		.map((numbered) => numbered.number);
	const said = `${moveSays} the line that says "${named}"`;
	if (only === undefined) throw new FilmError(`${said}, but no line from line ${from} on says it`);
	if (others.length > 0) {
		throw new FilmError(`${said}, but lines ${[only, ...others].join(', ')} say it: name words one line says`);
	}
	return only;
}

/** What a line of code says, its pieces read one after another. */
function textOf(line: CodeLine): string {
	return line.pieces.map((piece) => piece.text).join('');
}

function isLineNamed(written: unknown): written is LineNamed {
	return A_COUNT.is(written) || (typeof written === 'string' && written.length > 0);
}

/** A line `progress` of the way to lit, where it is among those named, or to out. */
function litToward(line: CodeLine, number: number, first: number, last: number, progress: number): CodeLine {
	const named = number >= first && number <= last;
	return { ...line, lit: between(line.lit, named ? WHOLLY_LIT : NOT_LIT, progress) };
}
