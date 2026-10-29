import { expect, test } from 'vitest';
import type { Format } from '../../src/domain/geometry.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import { type Piece, drawnWords, saidOf } from '../../src/props/words.ts';
import { drawn, openingScene, withProp } from '../../src/scene.ts';
import { SMALL } from './fakes.ts';

// A frame whose captions stand at its top
const CAPTIONS_AT_THE_TOP: Format = { ...SMALL, captionAt: 'top' };
// A caption a quarter of the way up: its ground, coming up twice as fast as its words, half of the way
const CAPTIONED = withProp(openingScene(SMALL), 'caption', { ...saidOf('Words'), shown: 0.25, gone: 0 });

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

test("a caption stands where its format puts it, at the frame's foot where it names no place", () => {
	expect([drawn(CAPTIONED, 0, SMALL).caption!.at, drawn(CAPTIONED, 0, CAPTIONS_AT_THE_TOP).caption!.at]).toEqual([
		'bottom',
		'top'
	]);
});

test("keys rise clear of a caption at the frame's foot as its ground comes up, and stay at the foot with none there", () => {
	const pressed = withProp(CAPTIONED, 'keys', { caps: ['⌘', 'K'], key: '⌘ K', shown: 1 });
	expect([
		drawn(pressed, 0, SMALL).keys!.clearing,
		drawn(pressed, 0, CAPTIONS_AT_THE_TOP).keys!.clearing,
		drawn(withProp(pressed, 'caption', null), 0, SMALL).keys!.clearing
	]).toEqual([0.5, 0, 0]);
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
