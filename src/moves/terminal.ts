/** An agent's terminal on the stage: opened, a person typing into it, the agent at work, the terminal giving way. */
import { linear } from '../domain/time.ts';
import { type Keystroke, typedBy, typingSeconds } from '../domain/typing.ts';
import {
	type Beginning,
	type Change,
	type Move,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import type { Typed } from '../direction/steps.ts';
import { type Terminal, type TerminalLine, openTerminal } from '../props/terminal.ts';

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
const CLOSED = 'the terminal is used, but none is open';

/** A terminal with its title, nothing in its log yet, nothing typed. */
export function open(title: string): Move {
	return { part: 'terminal', timing: timingOf({}), begin: () => opened(title) };
}

/** A person typing into the terminal, key by key, at the times the strokes have them unless the film names a curve. */
export function type(strokes: readonly Keystroke[], script: TimingScript = {}): Move & Typed {
	return {
		part: 'terminal',
		timing: timingOf({ ease: linear, ...script }),
		strokes,
		begin: (beginning) => typingInto(beginning, strokes)
	};
}

/** Enter: what the person typed goes up into the log, and the line is empty again. */
export function submit(): Move {
	return { part: 'terminal', timing: timingOf({}), begin: submitted };
}

/** The agent at work: its spinner under the lines it writes, one after another, gone once it is done. */
export function works(lines: readonly TerminalLine[], thinking: TerminalLine, script: WorkScript = {}): Move {
	const thinkingShare = script.thinkingShare ?? THINKING_SHARE;
	return {
		part: 'terminal',
		timing: timingOf({ ease: linear, ...script }),
		begin: (beginning) => working({ terminal: openOn(beginning), lines, thinking, thinkingShare })
	};
}

/** The terminal giving way to what comes after it; once gone, there is none. */
export function leave(script: TimingScript = {}): Move {
	return { part: 'terminal', timing: timingOf(script), begin: leaving };
}

function opened(title: string): Change {
	const terminal = openTerminal(title);
	return propChange('terminal', () => terminal);
}

function typingInto(beginning: Beginning, strokes: readonly Keystroke[]): Change {
	const terminal = openOn(beginning);
	const seconds = typingSeconds(strokes);
	return propChange('terminal', (progress) => ({ ...terminal, typed: typedBy(strokes, progress * seconds) }));
}

function submitted(beginning: Beginning): Change {
	const terminal = openOn(beginning);
	const asked: TerminalLine = { kind: 'asked', text: terminal.typed };
	const after = { ...terminal, lines: [...terminal.lines, asked], typed: '' };
	return propChange('terminal', () => after);
}

function working(work: Work): Change {
	return propChange('terminal', (progress) => workedAt(work, progress));
}

function leaving(beginning: Beginning): Change {
	const terminal = openOn(beginning);
	return propChange('terminal', (progress) => leftAt(terminal, progress));
}

/** The lines written by `progress` of the work, after its share of thinking, and the thinking line until the end. */
function workedAt(work: Work, progress: number): Terminal {
	const written = Math.max(0, (progress - work.thinkingShare) / (1 - work.thinkingShare));
	const shown = work.lines.slice(0, Math.floor(written * work.lines.length));
	const working = progress < 1 ? [work.thinking] : [];
	return { ...work.terminal, lines: [...work.terminal.lines, ...shown, ...working] };
}

function leftAt(terminal: Terminal, progress: number): Terminal | null {
	if (progress >= 1) return null;
	return { ...terminal, leaving: progress };
}

function openOn(beginning: Beginning): Terminal {
	return present(beginning, 'terminal', CLOSED);
}
