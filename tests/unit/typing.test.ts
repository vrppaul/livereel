import { expect, test } from 'vitest';
import { keystrokes, typedBy, typingSeconds } from '../../src/domain/typing.ts';

const TEXT = 'add rate limiting';

test('the typing ends with the whole text', () => {
	const strokes = keystrokes(TEXT, { seed: 1 });
	expect(typedBy(strokes, typingSeconds(strokes))).toBe(TEXT);
});

test('a slip stands and is rubbed out before the right letter', () => {
	expect(keystrokes('rate', { seed: 1, slipAt: 2 }).map((stroke) => stroke.typed)).toEqual([
		'r',
		'ra',
		'ray',
		'ra',
		'rat',
		'rate'
	]);
});

test('a slip on a capital letter types the key beside it as a capital, as a hand on Shift does', () => {
	expect(keystrokes('Rat', { seed: 1, slipAt: 0 }).map((stroke) => stroke.typed)).toEqual(['T', '', 'R', 'Ra', 'Rat']);
});

test('a letter with no key beside it is typed without a slip', () => {
	expect(keystrokes('a1b', { seed: 1, slipAt: 1 }).map((stroke) => stroke.typed)).toEqual(['a', 'a1', 'a1b']);
});

test('the same seed types the same, and another seed otherwise', () => {
	expect(keystrokes(TEXT, { seed: 7 })).toEqual(keystrokes(TEXT, { seed: 7 }));
	expect(keystrokes(TEXT, { seed: 7 })).not.toEqual(keystrokes(TEXT, { seed: 8 }));
});

test('keys come one after another in time', () => {
	const moments = keystrokes(TEXT, { seed: 3, slipAt: 5 }).map((stroke) => stroke.at);
	expect(moments).toEqual([...moments].sort((earlier, later) => earlier - later));
});

test('before the first key nothing stands typed', () => {
	expect(typedBy(keystrokes(TEXT, { seed: 1 }), 0)).toBe('');
});

test('a slower pace takes longer', () => {
	expect(typingSeconds(keystrokes(TEXT, { seed: 1, pace: 2 }))).toBeGreaterThan(
		typingSeconds(keystrokes(TEXT, { seed: 1 }))
	);
});
