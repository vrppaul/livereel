/** The agent's terminal on the stage: a window on the ground, its log above the line being typed. */
import { type Drawer, partOf, show } from '#stage/drawer';
import type { DrawnTerminal, ShownLine } from './state.ts';
import './terminal.css';

// How much the terminal shrinks as it leaves
const SHRINKS = 0.06;
const APART = ' ';

export class TerminalDrawer implements Drawer<DrawnTerminal | null> {
	readonly root: HTMLElement;
	readonly title: HTMLElement;
	readonly log: HTMLElement;
	readonly typed: HTMLElement;
	readonly caret: HTMLElement;

	constructor(root: HTMLElement) {
		this.root = root;
		this.title = partOf(root, 'title');
		this.log = partOf(root, 'log');
		this.typed = partOf(root, 'typed');
		this.caret = partOf(root, 'caret');
	}

	draw(terminal: DrawnTerminal | null): void {
		show(this.root, terminal !== null);
		if (terminal === null) return;
		this.root.style.opacity = String(1 - terminal.leaving);
		this.root.style.transform = `scale(${1 - SHRINKS * terminal.leaving})`;
		this.title.textContent = terminal.title;
		this.log.replaceChildren(...terminal.lines.map(lineElement));
		this.typed.textContent = terminal.typed;
		this.caret.style.visibility = terminal.caret ? 'visible' : 'hidden';
	}
}

/** A line of the log, its kind its class, what leads it set apart. */
function lineElement(line: ShownLine): HTMLElement {
	const row = document.createElement('div');
	row.className = line.kind;
	if (line.lead !== '') {
		const lead = document.createElement('b');
		lead.textContent = line.lead;
		row.append(lead, APART);
	}
	row.append(line.text);
	return row;
}
