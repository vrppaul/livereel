import { expect, test } from 'vitest';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import { type Piece, drawnWords, wordsOf } from '../../src/props/words.ts';

/** A piece of a word, set in the styles named, in no ink and on no marker of its own. */
function piece(text: string, ...styles: Piece['styles']): Piece {
	return { text, styles, ink: null, marker: null };
}

test("a caption's words come up one after another", () => {
	const shown = { words: wordsOf('one two three four'), shown: 0.2, gone: 0 };
	const words = drawnWords(shown).words.map((word) => word.appeared);
	expect(words).toEqual([...words].sort((earlier, later) => later - earlier));
	expect([words[0]! > 0, words.at(-1)]).toEqual([true, 0]);
});

test('the ground under words goes as they go', () => {
	expect(drawnWords({ words: wordsOf('Words'), shown: 1, gone: 1 }).ground).toBe(0);
});

test('the space after a word is set as the run it was written in, and the last word ends with none', () => {
	expect(wordsOf(['Film ', { text: 'your  live', underline: true }, ' app. '])).toEqual([
		[piece('Film'), piece(' ')],
		[piece('your', 'underline'), piece(' ', 'underline')],
		[piece('live', 'underline'), piece(' ')],
		[piece('app.')]
	]);
});

test('a word written across two runs is one word, each part set as its run is', () => {
	expect(wordsOf(['un', { text: 'missable', italic: true, bold: true }])).toEqual([
		[piece('un'), piece('missable', 'bold', 'italic')]
	]);
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
