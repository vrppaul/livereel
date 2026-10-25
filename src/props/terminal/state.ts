/**
 * An agent's terminal drawn on the stage: its log above the line being typed.
 *
 * What moves of itself in it — the spinner of an agent at work, the caret's blink — is worked out from the film's
 * moment here, so the stage draws a terminal as it is handed and keeps no time of its own.
 */

/** What a line of the terminal is: what was asked, a tool at work, what the agent said, a count done, thinking. */
export type LineKind = 'asked' | 'work' | 'said' | 'done' | 'thinking';

export interface TerminalLine {
	readonly kind: LineKind;
	readonly text: string;
}

export interface Terminal {
	readonly title: string;
	readonly lines: readonly TerminalLine[];
	readonly typed: string;
	// As it gives way to what comes after it: 0 standing, 1 gone
	readonly leaving: number;
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
	readonly leaving: number;
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
	return { title, lines: [], typed: '', leaving: 0 };
}

export function drawnTerminal(terminal: Terminal, moment: number): DrawnTerminal {
	const spinner = SPINNER[Math.floor(moment * SPINNER_GLYPHS_PER_SECOND) % SPINNER.length] ?? '';
	const halfBlinks = Math.floor(moment * CARET_BLINKS_PER_SECOND * HALVES_OF_A_BLINK);
	return {
		title: terminal.title,
		lines: terminal.lines.map((line) => shownLine(line, spinner)),
		typed: terminal.typed,
		caret: halfBlinks % HALVES_OF_A_BLINK === 0,
		leaving: terminal.leaving
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
