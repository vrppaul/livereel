import { expect, test } from 'vitest';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import { type Piece, drawnWords, saidOf } from '../../src/props/words.ts';

/** A piece of a word, set in the styles named, in no ink and on no marker of its own. */
function piece(text: string, ...styles: Piece['styles']): Piece {
	return { text, styles, ink: null, marker: null };
}

test("a caption's words come up one after another", () => {
	const shown = { ...saidOf('one two three four'), shown: 0.2, gone: 0 };
	const words = drawnWords(shown).words.map((word) => word.appeared);
	expect(words).toEqual([...words].sort((earlier, later) => later - earlier));
	expect([words[0]! > 0, words.at(-1)]).toEqual([true, 0]);
});

test('the ground under words goes as they go', () => {
	expect(drawnWords({ ...saidOf('Words'), shown: 1, gone: 1 }).ground).toBe(0);
});

test('the space between two words is set as the run it was written in, and none stands before the first or after the last', () => {
	expect(saidOf([' Film ', { text: 'your  live', underline: true }, ' app. ']).words).toEqual([
		{ spaceBefore: null, pieces: [piece('Film')] },
		{ spaceBefore: piece(' '), pieces: [piece('your', 'underline')] },
		{ spaceBefore: piece(' ', 'underline'), pieces: [piece('live', 'underline')] },
		{ spaceBefore: piece(' '), pieces: [piece('app.')] }
	]);
});

test('a word written across two runs is one word, each part set as its run is', () => {
	expect(saidOf(['un', { text: 'missable', italic: true, strike: true }]).words).toEqual([
		{ spaceBefore: null, pieces: [piece('un'), piece('missable', 'italic', 'strike')] }
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
