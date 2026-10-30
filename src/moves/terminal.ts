/**
 * An agent's terminal on the stage: opened, a person typing into it, the agent at work, the terminal giving way. It
 * comes up and goes where it stands, or slides in or out whole past a side of the frame, a whole frame as the card
 * does, so what slides the other way in the same step pushes it as one sheet.
 */
import { type FrameSide, IN_PLACE, pointToward } from '../domain/geometry.ts';
import { A_NUMBER, A_STRING, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { frameToward } from '../domain/place.ts';
import { linear } from '../domain/time.ts';
import { A_STROKES, type Keystroke, typedAlong } from '../domain/typing.ts';
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
import { TYPING_FORM, type TypingScript, keysHeard } from '../direction/sound.ts';
import type { Typed } from '../direction/steps.ts';
import { A_LINES, type Terminal, type TerminalLine, openTerminal } from '../props/terminal.ts';
import { SHOWN_WHOLE, SLIDE_IN_FORM, SLIDE_OUT_FORM, type SlideInScript, type SlideOutScript } from './words.ts';

/** Of the agent's work, the share it only thinks before its first line. */
export interface WorkScript extends TimingScript {
	readonly thinkingShare?: number;
}

/** The agent at work: the terminal it works in, what it writes, and the line it thinks on until it is done. */
interface Work {
	readonly terminal: Terminal;
	readonly lines: readonly TerminalLine[];
	readonly thinking: TerminalLine;
	readonly thinkingShare: number;
}

// Of the agent's work, the share it only thinks before its first line
const THINKING_SHARE = 0.22;
const WORK_FORM: Form<WorkScript> = { thinkingShare: A_NUMBER, ...TIMING_FORM };

/**
 * A terminal with its title coming up over the frame, or sliding in whole from past a side of it, nothing in its log
 * yet, nothing typed; in a cut, there at once.
 */
export function open(title: string, script: SlideInScript = {}): Move {
	assertKind(title, A_STRING, "terminal.open's title");
	assertWritten(script, SLIDE_IN_FORM, 'terminal.open');
	const from = script.from ?? null;
	return {
		part: 'terminal',
		timing: timingOf(script),
		begin: (beginning) => (from === null ? opening(title) : slidingIn(title, from, beginning))
	};
}

/**
 * A person typing into the terminal, key by key, each heard on the film's keyboard or the one named, at the times the
 * strokes have them unless the film names a curve.
 */
export function type(strokes: readonly Keystroke[], script: TypingScript = {}): Move & Typed {
	assertKind(strokes, A_STROKES, "terminal.type's strokes");
	assertWritten(script, TYPING_FORM, 'terminal.type');
	return {
		part: 'terminal',
		timing: timingOf({ ease: linear, ...script }),
		strokes,
		sounds: keysHeard(strokes, script.keyboard),
		begin: (beginning) => typingInto(beginning, strokes)
	};
}

/** Enter: what the person typed goes up into the log, and the line is empty again. */
export function submit(): Move {
	return { part: 'terminal', timing: timingOf({}), begin: submitted };
}

/** The agent at work: its spinner and `thinking` under the lines it writes, one after another, gone once it is done. */
export function works(lines: readonly TerminalLine[], thinking: string, script: WorkScript = {}): Move {
	assertKind(lines, A_LINES, "terminal.works's lines");
	assertKind(thinking, A_STRING, "terminal.works's thinking");
	assertWritten(script, WORK_FORM, 'terminal.works');
	const thinkingLine: TerminalLine = { kind: 'thinking', text: thinking };
	const thinkingShare = script.thinkingShare ?? THINKING_SHARE;
	return {
		part: 'terminal',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) =>
			working({ terminal: openOn(beginning, 'worked in'), lines, thinking: thinkingLine, thinkingShare })
	};
}

/**
 * The terminal giving way to what comes after it where it stands, or sliding out whole past a side of the frame; once
 * gone, there is none.
 */
export function leave(script: SlideOutScript = {}): Move {
	assertWritten(script, SLIDE_OUT_FORM, 'terminal.leave');
	const toward = script.toward ?? null;
	return {
		part: 'terminal',
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? leaving(beginning) : slidingOut(beginning, toward))
	};
}

function opening(title: string): Change {
	const terminal = openTerminal(title);
	return propChange('terminal', (progress) => ({ ...terminal, shown: progress }));
}

/** The terminal sliding in whole from a frame past its place on a side. */
function slidingIn(title: string, from: FrameSide, beginning: Beginning): Change {
	const terminal = openTerminal(title);
	const start = frameToward(from, beginning.format.frame);
	return propChange('terminal', (progress) => ({
		...terminal,
		shown: SHOWN_WHOLE,
		shift: pointToward(start, IN_PLACE, progress)
	}));
}

function typingInto(beginning: Beginning, strokes: readonly Keystroke[]): Change {
	const terminal = openOn(beginning, 'typed into');
	return propChange('terminal', (progress) => ({ ...terminal, typed: typedAlong(strokes, progress) }));
}

function submitted(beginning: Beginning): Change {
	const terminal = openOn(beginning, 'submitted');
	const asked: TerminalLine = { kind: 'asked', text: terminal.typed };
	const after = { ...terminal, lines: [...terminal.lines, asked], typed: '' };
	return propChange('terminal', () => after);
}

function working(work: Work): Change {
	return propChange('terminal', (progress) => workedAt(work, progress));
}

function leaving(beginning: Beginning): Change {
	const terminal = openOn(beginning, 'left');
	return propChange('terminal', (progress) => untilTheEnd(progress, { ...terminal, shown: 1 - progress }));
}

/** The terminal sliding out whole to a frame past its place on a side; once there, none. */
function slidingOut(beginning: Beginning, toward: FrameSide): Change {
	const terminal = openOn(beginning, 'left');
	const end = frameToward(toward, beginning.format.frame);
	return propChange('terminal', (progress) =>
		untilTheEnd(progress, { ...terminal, shift: pointToward(terminal.shift, end, progress) })
	);
}

/** The lines written by `progress` of the work, after its share of thinking, and the thinking line until the end. */
function workedAt(work: Work, progress: number): Terminal {
	const writtenShare = Math.max(0, (progress - work.thinkingShare) / (1 - work.thinkingShare));
	const writtenLines = work.lines.slice(0, Math.floor(writtenShare * work.lines.length));
	const working = progress < 1 ? [work.thinking] : [];
	return { ...work.terminal, lines: [...work.terminal.lines, ...writtenLines, ...working] };
}

/** The terminal a move finds open; one not open is refused, saying what the move does to it. */
function openOn(beginning: Beginning, done: string): Terminal {
	return present(beginning, 'terminal', `the terminal is ${done}, but none is open`);
}
