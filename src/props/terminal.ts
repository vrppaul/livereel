/**
 * An agent's terminal drawn on the stage: its log above the line being typed, coming up or giving way where it
 * stands, or sliding in or out whole past a side of the frame, as the ending card does, so it can be pushed.
 *
 * What moves of itself in it — the spinner of an agent at work, the caret's blink — is worked out from the film's
 * moment here, so the stage draws a terminal as it is handed and keeps no time of its own.
 */
import { IN_PLACE, type Point } from '../domain/geometry.ts';
import { A_STRING, type Kind, ListOf, OfForm, OneOf, needed } from '../domain/handed.ts';

/** What a line of the terminal is: what was asked, a tool at work, what the agent said, a count done, thinking. */
const LINE_KINDS = ['asked', 'work', 'said', 'done', 'thinking'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export interface TerminalLine {
	readonly kind: LineKind;
	readonly text: string;
}

const A_LINE_KIND = new OneOf(LINE_KINDS, `one of ${LINE_KINDS.join(', ')}`);

/** The agent's lines as a film hands them to its terminal. */
export const A_LINES: Kind<readonly TerminalLine[]> = new ListOf(
	new OfForm<TerminalLine>({ kind: needed(A_LINE_KIND), text: needed(A_STRING) }, 'a line: { kind, text }'),
	"the agent's lines: { kind, text }"
);

export interface Terminal {
	readonly title: string;
	readonly lines: readonly TerminalLine[];
	readonly typed: string;
	// How far it has come up over the frame, or how much of it is left as it gives way: 0 none, 1 standing
	readonly shown: number;
	// How far it stands from its place, across and down, in the frame's pixels, as it slides
	readonly shift: Point;
}

/** A line as the stage draws it: its kind, what leads it set apart, and the rest. */
export interface ShownLine {
	readonly kind: LineKind;
	readonly lead: string;
	readonly text: string;
}

export interface DrawnTerminal {
	readonly title: string;
	readonly lines: readonly ShownLine[];
	readonly typed: string;
	readonly caret: boolean;
	readonly shown: number;
	readonly shift: Point;
}

// What leads a line the person typed, and what parts a tool's name from what it is used on
const PROMPT = '>';
const SPACE = ' ';
// The spinner of an agent at work, how many of its glyphs go by a second, and how often the caret blinks
const SPINNER = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
const SPINNER_GLYPHS_PER_SECOND = 10;
const CARET_BLINKS_PER_SECOND = 1.1;
// A blink is the caret shown, then hidden
const HALVES_OF_A_BLINK = 2;

/** A terminal standing with its title, nothing in its log yet, nothing typed. */
export function openTerminal(title: string): Terminal {
	return { title, lines: [], typed: '', shown: 1, shift: IN_PLACE };
}

export function drawnTerminal(terminal: Terminal, moment: number): DrawnTerminal {
	const spinner = SPINNER[Math.floor(moment * SPINNER_GLYPHS_PER_SECOND) % SPINNER.length] ?? '';
	const halfBlinks = Math.floor(moment * CARET_BLINKS_PER_SECOND * HALVES_OF_A_BLINK);
	return {
		title: terminal.title,
		lines: terminal.lines.map((line) => shownLine(line, spinner)),
		typed: terminal.typed,
		caret: halfBlinks % HALVES_OF_A_BLINK === 0,
		shown: terminal.shown,
		shift: terminal.shift
	};
}

/** A line as drawn: what was asked after its prompt, a tool's name apart, the spinner while thinking. */
function shownLine(line: TerminalLine, spinner: string): ShownLine {
	switch (line.kind) {
		case 'asked':
			return { kind: line.kind, lead: PROMPT, text: line.text };
		case 'thinking':
			return { kind: line.kind, lead: spinner, text: line.text };
		case 'work':
			return toolAndUse(line);
		case 'said':
		case 'done':
			return { kind: line.kind, lead: '', text: line.text };
	}
}

function toolAndUse(line: TerminalLine): ShownLine {
	const apart = line.text.indexOf(SPACE);
	if (apart < 0) return { kind: line.kind, lead: line.text, text: '' };
	return { kind: line.kind, lead: line.text.slice(0, apart), text: line.text.slice(apart + 1) };
}
