import { expect, test } from 'vitest';
import { drawnCaption } from '../../src/props/caption.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';

test("a caption's words come up one after another", () => {
	const words = drawnCaption({ text: 'one two three four', shown: 0.2, gone: 0 }).words.map((word) => word.appeared);
	expect(words).toEqual([...words].sort((earlier, later) => later - earlier));
	expect([words[0]! > 0, words.at(-1)]).toEqual([true, 0]);
});

test('the ground under a caption goes as the caption goes', () => {
	expect(drawnCaption({ text: 'Words', shown: 1, gone: 1 }).ground).toBe(0);
});

test("a line of the agent's work leads with its tool, and the thinking line with the spinner of its moment", () => {
	const terminal = {
		...openTerminal('A terminal'),
		lines: [
			{ kind: 'work', text: 'Read app/api.py' },
			{ kind: 'thinking', text: 'Working…' }
		]
	} as const;
	const early = drawnTerminal(terminal, 0).lines;
	const later = drawnTerminal(terminal, 0.1).lines;
	expect(early[0]).toEqual({ kind: 'work', lead: 'Read', text: 'app/api.py' });
	expect(early[1]?.lead).not.toBe(later[1]?.lead);
});

test('the caret blinks with the moment', () => {
	const terminal = openTerminal('A terminal');
	expect([drawnTerminal(terminal, 0).caret, drawnTerminal(terminal, 0.5).caret]).toEqual([true, false]);
});
