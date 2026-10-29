import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { keystrokes } from '../../src/domain/typing.ts';
import { act, cut, fontsIn, framesIn, hold, play } from '../../src/direction/steps.ts';
import { hide, show } from '../../src/moves/caption.ts';
import { hide as cursorGone } from '../../src/moves/cursor.ts';
import { on } from '../../src/moves/light.ts';
import { to as lookTo } from '../../src/moves/look.ts';
import { scrollBy, type } from '../../src/moves/page.ts';
import { play as playSound } from '../../src/moves/sound.ts';

test("the fonts a film's looks name in its steps are found before it is shot, each by its move, in a play or a cut", () => {
	const steps = [cut(lookTo({ font: 'Georgia' })), play({ seconds: 1, moves: [lookTo({ mono: 'Menlo' })] })];
	expect(fontsIn(steps)).toEqual([
		{ place: "look.to's font", family: 'Georgia' },
		{ place: "look.to's mono", family: 'Menlo' }
	]);
});

test('two moves of one prop at once in one step are refused as the step is written', () => {
	expect(() =>
		play({ seconds: 1, moves: [hide({ within: { end: 0.5 } }), show('Next', { within: { start: 0.4 } })] })
	).toThrow(new FilmError('two moves on the caption at once in one step'));
});

test('two moves of the page at once are refused, as two of one prop are, in a play or a cut', () => {
	const typed = type(keystrokes('words', { seed: 1 }));
	expect(() => play({ seconds: 1, moves: [scrollBy('html', { pixels: 100 }), typed] })).toThrow(
		new FilmError('two moves on the page at once in one step')
	);
	expect(() => cut(cursorGone(), cursorGone())).toThrow(new FilmError('two moves on the cursor at once in one step'));
});

test('moves of one prop one after the other share a step, moves of two props share it at once, and sounds any way', () => {
	const after = play({ seconds: 1, moves: [hide({ within: { end: 0.3 } }), show('Next', { within: { start: 0.4 } })] });
	const together = play({ seconds: 1, moves: [show('Words'), on('#block')] });
	const sounds = play({ seconds: 1, moves: [playSound('./one.wav'), playSound('./two.wav'), show('Words')] });
	expect([after.moves.length, together.moves.length, sounds.moves.length]).toEqual([2, 2, 3]);
});

test("a film's length is its plays' frames: a cut and an act take none", () => {
	const steps = [hold({ seconds: 1 }), cut(cursorGone()), act(() => Promise.resolve()), hold({ seconds: 0.35 })];
	expect(framesIn(steps)).toBe(41);
});

test('a step of no time, or of no length a clock can count, is refused', () => {
	expect(() => hold({ seconds: 0 })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.POSITIVE_INFINITY })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.NaN })).toThrow(FilmError);
});
