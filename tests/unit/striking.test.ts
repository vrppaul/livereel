// A keyboard's strikes as a hand strikes them: which of them each key is, how hard it lands and how high it sounds
import { expect, test } from 'vitest';
import { type Strike, Striking } from '../../src/domain/striking.ts';

// A keyboard of four strikes, and a line long enough to hear a loop in
const STRIKES = 4;
const KEYS = 200;
// A step is read to so many digits, past which a share of a range worked out in floats may differ
const DIGITS = 6;

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

test('a key lands on one of five steps of loudness, from 0.7 of its file to its file, and one of seven of pitch, from 0.94 to 1.06', () => {
	const strikes = struck(KEYS, STRIKES);
	const loudness = [...new Set(strikes.map((strike) => strike.loudness))].sort();
	const pitches = [...new Set(strikes.map((strike) => strike.pitch))].sort();
	expect(loudness.map((step) => Number(step.toFixed(DIGITS)))).toEqual([0.7, 0.775, 0.85, 0.925, 1]);
	expect(pitches.map((step) => Number(step.toFixed(DIGITS)))).toEqual([0.94, 0.96, 0.98, 1, 1.02, 1.04, 1.06]);
});

test('a keyboard of one strike strikes it every time', () => {
	expect(struck(3, 1).map((strike) => strike.place)).toEqual([0, 0, 0]);
});

test('two hands strike the same keys alike, so a film heard twice is heard the same', () => {
	expect(struck(KEYS, STRIKES)).toEqual(struck(KEYS, STRIKES));
});
