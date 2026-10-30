import { expect, test } from 'vitest';
import { codeOf } from '../../src/props/code.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import { type Piece, WORD_BY_WORD, drawnWords, saidOf, typedComingUp } from '../../src/props/words.ts';
import { type Keystroke, lettersOf } from '../../src/domain/typing.ts';
import { SMALL } from './fakes.ts';

/** How much of a word stands typed, and whether the caret follows it. */
interface StandingTyped {
	readonly letters: number;
	readonly caret: boolean;
}

// Two words typed a key a second, the space before the second typed as its first letter
const TYPING: readonly Keystroke[] = [
	{ at: 1, typed: 'a' },
	{ at: 2, typed: 'ab' },
	{ at: 3, typed: 'ab ' },
	{ at: 4, typed: 'ab c' },
	{ at: 5, typed: 'ab cd' }
];

/** A piece of a word, its letters, set in the styles named, in no ink and on no marker of its own. */
function piece(text: string, ...styles: Piece['styles']): Piece {
	return { text, letters: lettersOf(text), styles, ink: null, marker: null };
}

/** How much of each of two words stands typed, the whole come up `shown` of the way. */
function typedAt(shown: number): readonly StandingTyped[] {
	const said = saidOf('ab cd');
	const words = drawnWords({ ...said, shown, gone: 0 }, typedComingUp(said, TYPING)).words;
	return words.map((word) => ({ letters: word.letters, caret: word.caret }));
}

test("a caption's words come up one after another", () => {
	const shown = { ...saidOf('one two three four'), shown: 0.2, gone: 0 };
	const words = drawnWords(shown, WORD_BY_WORD).words.map((word) => word.appeared);
	expect(words).toEqual([...words].sort((earlier, later) => later - earlier));
	expect([words[0]! > 0, words.at(-1)]).toEqual([true, 0]);
});

test('the ground under words goes as they go', () => {
	expect(drawnWords({ ...saidOf('Words'), shown: 1, gone: 1 }, WORD_BY_WORD).ground).toBe(0);
});

test('typed words stand letter by letter as the strokes have typed them, the space before a word its first, the caret after the last letter typed until all are', () => {
	expect([typedAt(0.6), typedAt(1)]).toEqual([
		[
			{ letters: 2, caret: false },
			{ letters: 1, caret: true }
		],
		[
			{ letters: 2, caret: false },
			{ letters: 3, caret: false }
		]
	]);
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

test('code is set as pieces each of its kind, the indent its lines share dropped, a tab as two spaces, its widest line counted', () => {
	const written = codeOf("\t\tlight.on('#a', { air: 60 }), // lit\n\t\t\tawait shot");
	expect([written.lines, written.columns]).toEqual([
		[
			[
				{ text: 'light.', kind: null },
				{ text: 'on', kind: 'call' },
				{ text: '(', kind: null },
				{ text: "'#a'", kind: 'string' },
				{ text: ', { ', kind: null },
				{ text: 'air', kind: 'key' },
				{ text: ': ', kind: null },
				{ text: '60', kind: 'number' },
				{ text: ' }), ', kind: null },
				{ text: '// lit', kind: 'comment' }
			],
			[
				{ text: '  ', kind: null },
				{ text: 'await', kind: 'keyword' },
				{ text: ' shot', kind: null }
			]
		],
		35
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
