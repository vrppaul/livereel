import { expect, test } from 'vitest';
import { colourToward } from '../../src/domain/colour.ts';
import { LIVEREELS_LOOK, lookToward, lookWith } from '../../src/props/look.ts';

test('colours mix in each channel and in their alpha, from any form of hex, and stand as written at either end', () => {
	expect([
		colourToward('#000', '#ffffff80', 0.5),
		colourToward('#0b0e14', '#ffffff', 0.25),
		colourToward('#0b0e14', '#fff', 0),
		colourToward('#0b0e14', '#fff', 1)
	]).toEqual(['#808080c0', '#484a4fff', '#0b0e14', '#fff']);
});

test("a theme's value written as undefined is left out, as a film whose types nobody checked may write it", () => {
	expect(lookWith(LIVEREELS_LOOK, { font: undefined } as never).font).toBe(LIVEREELS_LOOK.font);
});

test("a look on its way to a theme's values: a colour mixed, a number between, a font changed half-way, what the theme leaves out as the look stands", () => {
	const end = lookWith(LIVEREELS_LOOK, { ground: '#ffffff', windowShadow: 0, font: 'Georgia' });
	const standing = lookWith(LIVEREELS_LOOK, { ink: '#000000' });
	const quarter = lookToward(standing, LIVEREELS_LOOK, end, 0.25);
	const half = lookToward(standing, LIVEREELS_LOOK, end, 0.5);
	expect([quarter.ground, quarter.windowShadow, quarter.font, half.font, quarter.ink]).toEqual([
		'#484a4fff',
		0.75,
		LIVEREELS_LOOK.font,
		'Georgia',
		'#000000'
	]);
});
