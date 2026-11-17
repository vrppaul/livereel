// A keyboard's strikes as a hand strikes them: which of them each key is, how hard it lands and how high it sounds
import { expect, test } from 'vitest';
import { type Strike, Striking } from '../../src/domain/striking.ts';

// A keyboard of four strikes, and a line long enough to hear a loop in
const STRIKES = 4;
const KEYS = 200;

/** So many keys struck one after another by one hand on a keyboard of so many strikes. */
function struck(keys: number, strikes: number): readonly Strike[] {
	const striking = new Striking();
	return Array.from({ length: keys }, () => striking.next(strikes));
}

test('no key is the strike of the key before it, and every strike of the keyboard is struck', () => {
	const places = struck(KEYS, STRIKES).map((strike) => strike.place);
	const sameAsBefore = places.slice(1).map((place, before) => place === places[before]);
	expect(sameAsBefore).not.toContain(true);
	expect([...new Set(places)].sort()).toEqual([0, 1, 2, 3]);
});

test('the strikes follow no round of the keyboard: the key four on is not always the same strike', () => {
	const places = struck(KEYS, STRIKES).map((strike) => strike.place);
	const sameAsARoundBefore = places.slice(STRIKES).map((place, before) => place === places[before]);
	expect(sameAsARoundBefore).toContain(false);
});

test('a key lands no louder than its file and at most a little quieter, a little higher or lower than its file', () => {
	const strikes = struck(KEYS, STRIKES);
	const loudness = strikes.map((strike) => strike.loudness);
	const pitches = strikes.map((strike) => strike.pitch);
	expect(Math.max(...loudness)).toBeLessThanOrEqual(1);
	expect(Math.min(...loudness)).toBeGreaterThanOrEqual(0.7);
	expect(Math.max(...pitches)).toBeLessThanOrEqual(1.06);
	expect(Math.min(...pitches)).toBeGreaterThanOrEqual(0.94);
	expect(new Set(loudness).size).toBe(KEYS);
	expect(new Set(pitches).size).toBe(KEYS);
});

test('a keyboard of one strike strikes it every time', () => {
	expect(struck(3, 1).map((strike) => strike.place)).toEqual([0, 0, 0]);
});

test('two hands strike the same keys alike, so a film heard twice is heard the same', () => {
	expect(struck(KEYS, STRIKES)).toEqual(struck(KEYS, STRIKES));
});
