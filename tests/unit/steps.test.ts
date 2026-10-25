import { expect, test } from 'vitest';
import { FilmError } from '#domain/errors';
import { act, cut, framesIn, hold, play } from '#direction/steps';
import { hide, show } from '#props/caption/moves';
import { on } from '#props/light/moves';

test('two moves of one prop at once in one step are refused as the step is written', () => {
	expect(() =>
		play({ seconds: 1, moves: [hide({ within: { end: 0.5 } }), show('Next', { within: { start: 0.4 } })] })
	).toThrow(new FilmError('two moves on the caption at once in one step'));
});

test('moves of one prop one after the other share a step, and moves of two props share it at once', () => {
	const after = play({ seconds: 1, moves: [hide({ within: { end: 0.3 } }), show('Next', { within: { start: 0.4 } })] });
	const together = play({ seconds: 1, moves: [show('Words'), on('#block')] });
	expect([after.moves.length, together.moves.length]).toEqual([2, 2]);
});

test("a film's length is its plays' frames: a cut and an act take none", () => {
	const steps = [hold({ seconds: 1 }), cut((scene) => scene), act(() => Promise.resolve()), hold({ seconds: 0.35 })];
	expect(framesIn(steps)).toBe(40);
});

test('a step of no time, or of no length a clock can count, is refused', () => {
	expect(() => hold({ seconds: 0 })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.POSITIVE_INFINITY })).toThrow(FilmError);
	expect(() => hold({ seconds: Number.NaN })).toThrow(FilmError);
});
