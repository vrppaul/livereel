import { expect, test } from 'vitest';
import { codeOf } from '../../src/props/code.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import { alongItsWay } from '../../src/props/way.ts';
import { type DrawnWords, type Piece, comingUpIn, drawnWords, saidOf, typedComingUp } from '../../src/props/words.ts';
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
	const words = drawnWords({ ...said, shown, gone: 0 }, typedComingUp(said, TYPING), 0).words;
	return words.map((word) => ({ letters: word.letters, caret: word.caret }));
}

/** Two words scrambled, the whole come up `shown` of the way, at a moment of the film; 'ab cd' where none are named. */
function scrambledAt(shown: number, moment: number, text = 'ab cd'): DrawnWords['words'] {
	const said = saidOf(text);
	return drawnWords({ ...said, shown, gone: 0 }, comingUpIn('scramble', said), moment).words;
}

/** The signs two words scrambled stand as, the whole come up `shown` of the way, at a moment of the film. */
function signsAt(shown: number, moment: number, text = 'ab cd'): readonly (readonly (string | null)[])[] {
	return scrambledAt(shown, moment, text).map((word) => word.signs);
}

test("a caption's words come up one after another", () => {
	const said = saidOf('one two three four');
	const words = drawnWords({ ...said, shown: 0.2, gone: 0 }, comingUpIn('rise', said), 0).words;
	const appeared = words.map((word) => word.appeared);
	expect(appeared).toEqual([...appeared].sort((earlier, later) => later - earlier));
	expect([appeared[0]! > 0, appeared.at(-1)]).toEqual([true, 0]);
});

test('the ground under words goes as they go', () => {
	const said = saidOf('Words');
	expect(drawnWords({ ...said, shown: 1, gone: 1 }, comingUpIn('rise', said), 0).ground).toBe(0);
});

test('words that come up word by word are drawn by the name of their way', () => {
	const said = saidOf('Words');
	const ways = (['rise', 'sharp', 'fade', 'blur', 'mask'] as const).map(
		(way) => drawnWords({ ...said, shown: 0.5, gone: 0 }, comingUpIn(way, said), 0).way
	);
	expect(ways).toEqual(['rise', 'sharp', 'fade', 'blur', 'mask']);
});

test('words that come up by letters stand letter by letter at an even pace, the space before a word its first, with no caret', () => {
	const said = saidOf('ab cd');
	const words = drawnWords({ ...said, shown: 0.6, gone: 0 }, comingUpIn('letters', said), 0).words;
	expect(words.map((word) => ({ letters: word.letters, caret: word.caret }))).toEqual([
		{ letters: 2, caret: false },
		{ letters: 1, caret: false }
	]);
});

test('scrambled letters come up each as a sign drawn anew as the film goes on, a space as itself, and settle into their own a few behind those coming', () => {
	const midway = scrambledAt(0.5, 0);
	expect([
		midway.map((word) => word.letters),
		midway.map((word) => word.signs),
		scrambledAt(1, 0).map((word) => word.signs)
	]).toEqual([
		[2, 3],
		[
			[expect.any(String), expect.any(String)],
			[null, expect.any(String), expect.any(String)]
		],
		[
			[null, null],
			[null, null, null]
		]
	]);
	expect(midway.map((word) => word.signs)).not.toEqual(scrambledAt(0.5, 0.05).map((word) => word.signs));
});

test('a scrambled letter keeps its sign two frames before another is drawn, and other words draw signs of their own', () => {
	const firstFrame = signsAt(0.5, 0);
	expect(signsAt(0.5, 1 / 30)).toEqual(firstFrame);
	expect(signsAt(0.5, 2 / 30)).not.toEqual(firstFrame);
	expect(signsAt(0.5, 0, 'xy zw')).not.toEqual(firstFrame);
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

test("a figure a quarter of its way in a way of livereel's stands as the way has it: faded; out from behind its foot or its left edge, its cut standing where the figure stands whole; wiped in from its left; opened from its middle; grown from its middle; its shadow a quarter as strong where it is cut; on no way at the end, nor in its own way", () => {
	const unshifted = { across: 0, down: 0 };
	const uncut = { kind: 'inset', top: 0, right: 0, bottom: 0, left: 0 };
	expect([
		alongItsWay({ kind: 'fade' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'bottom' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'left' }, 0.25),
		alongItsWay({ kind: 'wipe', edge: 'left' }, 0.25),
		alongItsWay({ kind: 'iris' }, 0.25),
		alongItsWay({ kind: 'grow' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'top' }, 1),
		alongItsWay({ kind: 'own' }, 0.25)
	]).toEqual([
		{ shift: unshifted, scale: 1, clear: 0.25, shadow: 1, cut: null },
		{
			shift: { across: 0, down: 0.75 },
			scale: 1,
			clear: 1,
			shadow: 0.25,
			cut: { ...uncut, top: -0.75, bottom: 0.75 }
		},
		{
			shift: { across: -0.75, down: 0 },
			scale: 1,
			clear: 1,
			shadow: 0.25,
			cut: { ...uncut, right: -0.75, left: 0.75 }
		},
		{ shift: unshifted, scale: 1, clear: 1, shadow: 0.25, cut: { ...uncut, right: 0.75 } },
		{ shift: unshifted, scale: 1, clear: 1, shadow: 0.25, cut: { kind: 'circle', radius: 0.25 } },
		{ shift: unshifted, scale: 0.25, clear: 1, shadow: 1, cut: null },
		null,
		null
	]);
});
