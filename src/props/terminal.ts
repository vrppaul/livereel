/**
 * An agent's terminal, what an object shows (`src/props/object.ts`): its log above the line being typed, a window on
 * the ground filling the object's box, a little smaller while it comes up or goes.
 *
 * What moves of itself in it — the spinner of an agent at work, the caret's blink — is worked out from the film's
 * moment here, so the stage draws a terminal as it is handed and keeps no time of its own.
 */
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

/** A terminal: its title, the lines of its log, and what is typed on its line. */
export interface Terminal {
	readonly kind: 'terminal';
	readonly title: string;
	readonly lines: readonly TerminalLine[];
	readonly typed: string;
}

/** A line as the stage draws it: its kind, what leads it set apart, and the rest. */
export interface ShownLine {
	readonly kind: LineKind;
	readonly lead: string;
	readonly text: string;
}

/** A terminal as the stage draws it: the caret shown or not, and how much of it stands, from 0 to 1. */
export interface DrawnTerminal {
	readonly kind: 'terminal';
	readonly title: string;
	readonly lines: readonly ShownLine[];
	readonly typed: string;
	readonly caret: boolean;
	readonly shown: number;
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

/** A terminal with its title, nothing in its log yet, nothing typed. */
export function openTerminal(title: string): Terminal {
	return { kind: 'terminal', title, lines: [], typed: '' };
}

/** A terminal as the stage draws it at a moment of the film, the object showing it standing `shown` of the way. */
export function drawnTerminal(terminal: Terminal, moment: number, shown: number): DrawnTerminal {
	const spinner = SPINNER[Math.floor(moment * SPINNER_GLYPHS_PER_SECOND) % SPINNER.length] ?? '';
	const halfBlinks = Math.floor(moment * CARET_BLINKS_PER_SECOND * HALVES_OF_A_BLINK);
	return {
		kind: terminal.kind,
		title: terminal.title,
		lines: terminal.lines.map((line) => shownLine(line, spinner)),
		typed: terminal.typed,
		caret: halfBlinks % HALVES_OF_A_BLINK === 0,
		shown
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
