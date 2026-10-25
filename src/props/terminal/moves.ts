/** An agent's terminal on the stage: a person typing into it, the agent at work, the terminal giving way. */
import { FilmError } from '#domain/errors';
import { type Ease, linear } from '#domain/time';
import { type Keystroke, typedBy, typingSeconds } from '#domain/typing';
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
import { type Scene, withProp } from '#scene';
import type { Terminal, TerminalLine } from './state.ts';

/** Of the agent's work, the share it only thinks before its first line. */
export interface WorkScript extends TimingScript {
	readonly thinkingShare?: number;
}

// Of the agent's work, the share it only thinks before its first line
const THINKING_SHARE = 0.22;
// Keys and lines come at the times they are given unless the film names a curve
const AT_ITS_TIMES: Ease = linear;

/** A person typing into the terminal, key by key. */
export class TypeInTerminal implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'terminal';
	readonly timing: Timing;
	readonly strokes: readonly Keystroke[];

	constructor(strokes: readonly Keystroke[], script: TimingScript) {
		this.timing = timingOf({ ease: AT_ITS_TIMES, ...script });
		this.strokes = strokes;
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		return Promise.resolve(new PropChange('terminal', new Typing(openOn(beginning.scene), this.strokes)));
	}
}

/** The agent at work: its spinner under the lines it writes, one after another, gone once it is done. */
export class AgentWorks implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'terminal';
	readonly timing: Timing;
	readonly lines: readonly TerminalLine[];
	readonly thinking: TerminalLine;
	readonly thinkingShare: number;

	constructor(lines: readonly TerminalLine[], thinking: TerminalLine, script: WorkScript) {
		this.timing = timingOf({ ease: AT_ITS_TIMES, ...script });
		this.lines = lines;
		this.thinking = thinking;
		this.thinkingShare = script.thinkingShare ?? THINKING_SHARE;
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		return Promise.resolve(new PropChange('terminal', new Working(openOn(beginning.scene), this)));
	}
}

/** The terminal giving way to what comes after it; once gone, there is none. */
export class TerminalLeaves implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'terminal';
	readonly timing: Timing;

	constructor(script: TimingScript) {
		this.timing = timingOf(script);
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		return Promise.resolve(new PropChange('terminal', new Leaving(openOn(beginning.scene))));
	}
}

class Typing implements PropMotion<Terminal> {
	readonly terminal: Terminal;
	readonly strokes: readonly Keystroke[];

	constructor(terminal: Terminal, strokes: readonly Keystroke[]) {
		this.terminal = terminal;
		this.strokes = strokes;
	}

	next(progress: number): Terminal {
		return { ...this.terminal, typed: typedBy(this.strokes, progress * typingSeconds(this.strokes)) };
	}
}

class Working implements PropMotion<Terminal> {
	readonly terminal: Terminal;
	readonly work: AgentWorks;

	constructor(terminal: Terminal, work: AgentWorks) {
		this.terminal = terminal;
		this.work = work;
	}

	next(progress: number): Terminal {
		const share = this.work.thinkingShare;
		const written = Math.max(0, (progress - share) / (1 - share));
		const shown = this.work.lines.slice(0, Math.floor(written * this.work.lines.length));
		const working = progress < 1 ? [this.work.thinking] : [];
		return { ...this.terminal, lines: [...this.terminal.lines, ...shown, ...working] };
	}
}

class Leaving implements PropMotion<Terminal | null> {
	readonly terminal: Terminal;

	constructor(terminal: Terminal) {
		this.terminal = terminal;
	}

	next(progress: number): Terminal | null {
		if (progress >= 1) return null;
		return { ...this.terminal, leaving: progress };
	}
}

export function type(strokes: readonly Keystroke[], script: TimingScript = {}): TypeInTerminal {
	return new TypeInTerminal(strokes, script);
}

export function works(lines: readonly TerminalLine[], thinking: TerminalLine, script: WorkScript = {}): AgentWorks {
	return new AgentWorks(lines, thinking, script);
}

export function leave(script: TimingScript = {}): TerminalLeaves {
	return new TerminalLeaves(script);
}

/** Enter: what the person typed goes up into the log, and the line is empty again. */
export function submit(scene: Scene): Scene {
	const terminal = openOn(scene);
	return withProp(scene, 'terminal', {
		...terminal,
		lines: [...terminal.lines, { kind: 'asked', text: terminal.typed }],
		typed: ''
	});
}

function openOn(scene: Scene): Terminal {
	if (scene.terminal === null) throw new FilmError('the terminal is used, but none is open');
	return scene.terminal;
}
