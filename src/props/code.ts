/**
 * Code, what an object shows (`src/props/object.ts`): a pane of the film's code, beside the page's window, so the
 * viewer reads a line and sees what it does at once, or alone, about what the frame itself shows.
 *
 * A film hands its code as text. It is worked out once, as its move is made, into lines of pieces, each of a kind the
 * stage colours it by, read as TypeScript is written; the indent its lines share is dropped and a tab set as spaces,
 * so it reads as an editor sets it, and its widest line is counted, so the stage sets its letters no larger than that
 * line fits across; or, where the film has its long lines cut, as large as the look has them, a line too long cut at
 * the pane's edge, as an editor's window cuts it. The pane comes up its ground first and its lines one after another,
 * as words do (`src/props/words.ts`). A line lit stands on a bar of the accent, and while any is lit the rest dim.
 *
 * The pane stands no taller than its box, and code longer than that scrolls in it as an editor's does. How far is
 * counted in lines: the stage sets the letters' size, so lines are what the film knows of the pane's height.
 */
import { OneOf } from '../domain/handed.ts';
import { appearedOf, groundOf } from './words.ts';

// The kinds of the pieces of a line: a comment to the line's end, a string, a number, a word the language keeps, a
// function called, a name given a value. Anything else is plain
const KINDS = ['comment', 'string', 'number', 'keyword', 'call', 'key'] as const;

type CodeKind = (typeof KINDS)[number];

/** A piece of a line of code, and its kind; none where it is plain. */
export interface CodePiece {
	readonly text: string;
	readonly kind: CodeKind | null;
}

/** A film's code, worked out once: its lines, the key the stage knows them by, and how many letters its widest has. */
export interface WrittenCode {
	readonly lines: readonly (readonly CodePiece[])[];
	readonly key: string;
	readonly columns: number;
}

/** A line of the code shown, and how far it is lit, from 0 to 1. */
export interface CodeLine {
	readonly pieces: readonly CodePiece[];
	readonly lit: number;
}

/**
 * How a pane fits a line longer than it is wide: its letters made smaller until its widest line fits, or kept as large
 * as the look has them, the line cut at the pane's edge.
 */
const LONG_LINES = ['shrink', 'cut'] as const;

export type LongLines = (typeof LONG_LINES)[number];

export const A_WAY_OF_LONG_LINES = new OneOf(LONG_LINES, 'how long lines fit: "shrink" or "cut"');

/**
 * A pane of code: its lines, the key the stage knows them by, how many letters its widest has, how it fits a line too
 * long, and how many lines it has scrolled past its top.
 */
export interface Code {
	readonly kind: 'code';
	readonly lines: readonly CodeLine[];
	readonly key: string;
	readonly columns: number;
	readonly longLines: LongLines;
	readonly scrolled: number;
}

/** A line as the stage draws it, and how far it has come up, eased, from 0 to 1. */
interface DrawnLine extends CodeLine {
	readonly appeared: number;
}

/**
 * Code as the stage draws it: each line's progress, how far the pane's ground has come up, how far the lines not lit
 * are dimmed: as far as the light on all its lines comes to, at most whole, so a light moving from one line to
 * another, one going out as the other comes on, keeps the rest dimmed; how it fits a line too long, and how many lines
 * it has scrolled past its top.
 */
export interface DrawnCode {
	readonly kind: 'code';
	readonly lines: readonly DrawnLine[];
	readonly key: string;
	readonly columns: number;
	readonly ground: number;
	readonly dimmed: number;
	readonly longLines: LongLines;
	readonly scrolled: number;
}

// The pieces of a line, the first kind that matches at a place winning, a group named by each kind
const PIECES =
	/(?<comment>\/\/.*$)|(?<string>'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(?<number>\b\d+(?:\.\d+)?\b)|(?<keyword>\b(?:const|function|return|import|from|export|default|await|async|readonly)\b)|(?<call>\b[A-Za-z_]\w*(?=\())|(?<key>\b[A-Za-z_]\w*(?=:\s))/gu;
const NEW_LINE = '\n';
// A tab is set as two spaces, so an indent keeps the pane's narrow width for the code
const TAB = '\t';
const TAB_SET_AS = '  ';
const LINE_START = 0;
// A line written as it is, lit none; and one lit whole
export const NOT_LIT = 0;
export const WHOLLY_LIT = 1;
// Code as it comes up, its first line at the pane's top
export const NOT_SCROLLED = 0;

/** A film's code, worked out once as its move is made: its lines of pieces, their key and its widest line's length. */
export function codeOf(text: string): WrittenCode {
	const tabbed = text.split(NEW_LINE).map((line) => line.replaceAll(TAB, TAB_SET_AS));
	const shared = Math.min(...tabbed.filter((line) => line.trim() !== '').map(indentOf));
	const set = tabbed.map((line) => line.slice(shared));
	const lines = set.map(piecesOf);
	return { lines, key: JSON.stringify(lines), columns: Math.max(...set.map((line) => line.length)) };
}

/** Code as the stage draws it, the object showing it come up `shown` and gone `gone` so far. */
export function drawnCode(code: Code, shown: number, gone: number): DrawnCode {
	const count = code.lines.length;
	return {
		kind: code.kind,
		lines: code.lines.map((line, place) => ({ ...line, appeared: appearedOf(shown, place, count) })),
		key: code.key,
		columns: code.columns,
		ground: groundOf(shown, gone),
		dimmed: Math.min(
			WHOLLY_LIT,
			code.lines.reduce((light, line) => light + line.lit, NOT_LIT)
		),
		longLines: code.longLines,
		scrolled: code.scrolled
	};
}

function indentOf(line: string): number {
	return line.length - line.trimStart().length;
}

/** A line as its pieces, in order, each of its kind; no piece of no text. */
function piecesOf(line: string): CodePiece[] {
	const pieces: CodePiece[] = [];
	let reached = LINE_START;
	for (const found of line.matchAll(PIECES)) {
		const [text] = found;
		pieces.push({ text: line.slice(reached, found.index), kind: null }, { text, kind: kindOf(found.groups ?? {}) });
		reached = found.index + text.length;
	}
	pieces.push({ text: line.slice(reached), kind: null });
	return pieces.filter((piece) => piece.text !== '');
}

/** The kind whose group matched: the one with a value. */
function kindOf(groups: Readonly<Record<string, string | undefined>>): CodeKind | null {
	return KINDS.find((kind) => groups[kind] !== undefined) ?? null;
}
