/**
 * An agent's terminal, shown by an object (`src/moves/object.ts`): opened in a place, across most of the frame in its
 * middle where the film names none, a person typing into it, the agent at work, the terminal giving way. It comes up
 * and goes where it stands, or slides in or out whole past a side of the frame, a whole frame, so what slides the other
 * way in the same step pushes it as one sheet; it moves to another place and leans as any object does. What is typed
 * into it and what the agent writes is what it shows, so typing shares a step with a move that carries it. Every move
 * of it takes the terminal named `terminal`, or the one the film names `as`.
 */
import { A_NUMBER, A_STRING, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place } from '../domain/place.ts';
import { linear } from '../domain/time.ts';
import { A_STROKES, type Keystroke, typedAlong } from '../domain/typing.ts';
import { type Beginning, type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { keysHeard } from '../direction/sound.ts';
import type { Typed } from '../direction/steps.ts';
import type { ObjectName } from '../props/object.ts';
import { A_LINES, type Terminal, type TerminalLine, openTerminal } from '../props/terminal.ts';
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
import { TYPING_FORM, type TypingScript } from './typing.ts';

/** Where the terminal opens, `at` a place on the frame or in what it stands `inside`, and how it comes there. */
export interface TerminalScript extends ShowScript, NestedScript {
	readonly at?: Place;
}

/** Keys typed into the terminal, and which terminal. */
export interface TerminalTypingScript extends TypingScript, NamedScript {}

/** Of the agent's work, the share it only thinks before its first line; and which terminal it works in. */
export interface WorkScript extends TimingScript, NamedScript {
	readonly thinkingShare?: number;
}

/** The agent at work: the terminal it works in, what it writes, and the line it thinks on until it is done. */
interface Work {
	readonly name: ObjectName;
	readonly terminal: Terminal;
	readonly lines: readonly TerminalLine[];
	readonly thinking: TerminalLine;
	readonly thinkingShare: number;
}

const TERMINAL: ObjectKind = 'terminal';
// Where the terminal opens where the film names no place: across most of the frame and down it, in its middle
const MOST_OF_THE_FRAME: Place = { left: 0.07, top: 0.11, width: 0.86, height: 0.78 };
// Of the agent's work, the share it only thinks before its first line
const THINKING_SHARE = 0.22;
const TERMINAL_FORM: Form<TerminalScript> = { at: A_PLACE, ...SHOW_FORM, ...NESTED_FORM };
const TYPING_INTO_FORM: Form<TerminalTypingScript> = { ...TYPING_FORM, ...NAMED_FORM };
const WORK_FORM: Form<WorkScript> = { thinkingShare: A_NUMBER, ...TIMING_FORM, ...NAMED_FORM };

/**
 * A terminal with its title coming up in its place, or sliding in whole from past a side of the frame, nothing in its
 * log yet, nothing typed; in a cut, there at once.
 */
export function open(title: string, script: TerminalScript = {}): Move {
	assertKind(title, A_STRING, "terminal.open's title");
	assertWritten(script, TERMINAL_FORM, 'terminal.open');
	const terminal = openTerminal(title);
	const named = script.at ?? null;
	return objectShow(TERMINAL, 'terminal.open', script, named, (beginning) => ({
		content: terminal,
		box: placedFor(terminal.kind, beginning.format, named ?? MOST_OF_THE_FRAME)
	}));
}

/**
 * A person typing into the terminal, key by key, each heard on the film's keyboard or the one named, at the times the
 * strokes have them unless the film names a curve.
 */
export function type(strokes: readonly Keystroke[], script: TerminalTypingScript = {}): Move & Typed {
	assertKind(strokes, A_STROKES, "terminal.type's strokes");
	assertWritten(script, TYPING_INTO_FORM, 'terminal.type');
	const name = script.as ?? TERMINAL;
	return {
		...contentMove(name, timingOf({ ease: linear, ...script }), (beginning) => typingInto(beginning, name, strokes)),
		strokes,
		sounds: keysHeard(strokes, script.keyboard)
	};
}

/** Enter: what the person typed goes up into the log, and the line is empty again. */
export function submit(script: NamedScript = {}): Move {
	assertWritten(script, NAMED_FORM, 'terminal.submit');
	const name = script.as ?? TERMINAL;
	return contentMove(name, timingOf({}), (beginning) => submitted(beginning, name));
}

/** The agent at work: its spinner and `thinking` under the lines it writes, one after another, gone once it is done. */
export function works(lines: readonly TerminalLine[], thinking: string, script: WorkScript = {}): Move {
	assertKind(lines, A_LINES, "terminal.works's lines");
	assertKind(thinking, A_STRING, "terminal.works's thinking");
	assertWritten(script, WORK_FORM, 'terminal.works');
	const name = script.as ?? TERMINAL;
	const thinkingLine: TerminalLine = { kind: 'thinking', text: thinking };
	const thinkingShare = script.thinkingShare ?? THINKING_SHARE;
	return contentMove(name, timingOf({ ease: linear, ...script }), (beginning) =>
		working({ name, terminal: openOn(beginning, name, 'terminal.works'), lines, thinking: thinkingLine, thinkingShare })
	);
}

/** The terminal carried to another place, through the boxes between. */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(TERMINAL, 'terminal.to', place, script);
}

/** The terminal leant back from its top edge by `tilt` and swung about its middle by `turn`. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(TERMINAL, 'terminal.lean', script);
}

/**
 * The terminal giving way to what comes after it where it stands, or sliding out whole past a side of the frame; once
 * gone, there is none.
 */
export function leave(script: HideScript = {}): Move {
	return objectHide(TERMINAL, 'terminal.leave', script);
}

function typingInto(beginning: Beginning, name: ObjectName, strokes: readonly Keystroke[]): Change {
	const terminal = openOn(beginning, name, 'terminal.type');
	return showing(name, (progress) => ({ ...terminal, typed: typedAlong(strokes, progress) }));
}

function submitted(beginning: Beginning, name: ObjectName): Change {
	const terminal = openOn(beginning, name, 'terminal.submit');
	const asked: TerminalLine = { kind: 'asked', text: terminal.typed };
	const after = { ...terminal, lines: [...terminal.lines, asked], typed: '' };
	return showing(name, () => after);
}

function working(work: Work): Change {
	return showing(work.name, (progress) => workedAt(work, progress));
}

/** The lines written by `progress` of the work, after its share of thinking, and the thinking line until the end. */
function workedAt(work: Work, progress: number): Terminal {
	const writtenShare = Math.max(0, (progress - work.thinkingShare) / (1 - work.thinkingShare));
	const writtenLines = work.lines.slice(0, Math.floor(writtenShare * work.lines.length));
	const working = progress < 1 ? [work.thinking] : [];
	return { ...work.terminal, lines: [...work.terminal.lines, ...writtenLines, ...working] };
}

/** The terminal of a name a move of it finds open; one not open is refused, the move named. */
function openOn(beginning: Beginning, name: ObjectName, move: string): Terminal {
	return contentOf(beginning, name, move, 'terminal');
}
