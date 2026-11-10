import { expect, test } from 'vitest';
import { colourToward } from '../../src/domain/colour.ts';
import { valuesToward, valuesWith } from '../../src/domain/values.ts';
import { LIVEREELS_LOOK, LOOK_KINDS } from '../../src/props/look.ts';

test('colours mix in each channel and in their alpha, from any form of hex, and stand as written at either end', () => {
	expect([
		colourToward('#000', '#ffffff80', 0.5),
		colourToward('#0b0e14', '#ffffff', 0.25),
		colourToward('#0b0e14', '#fff', 0),
		colourToward('#0b0e14', '#fff', 1)
	]).toEqual(['#808080c0', '#484a4fff', '#0b0e14', '#fff']);
});

test("a theme's value written as undefined is left out, as a film whose types nobody checked may write it", () => {
	expect(valuesWith(LIVEREELS_LOOK, { font: undefined } as never, LOOK_KINDS).font).toBe(LIVEREELS_LOOK.font);
});

test("a look on its way to a theme's values: a colour mixed, a number between, a font changed half-way, the ground's layers fading into the theme's, what the theme leaves out as the look stands", () => {
	const dots = 'radial-gradient(#fff2 1px, transparent 1px) 0 0 / 24px 24px';
	const theme = { ground: '#ffffff', paneShadow: 0, font: 'Georgia', groundLayers: dots };
	const end = valuesWith(LIVEREELS_LOOK, theme, LOOK_KINDS);
	const standing = valuesWith(LIVEREELS_LOOK, { ink: '#000000' }, LOOK_KINDS);
	const names = ['ground', 'paneShadow', 'font', 'groundLayers'] as const;
	const moving = { start: LIVEREELS_LOOK, end, names };
	const quarter = valuesToward(standing, moving, LOOK_KINDS, 0.25);
	const half = valuesToward(standing, moving, LOOK_KINDS, 0.5);
	expect([quarter.ground, quarter.paneShadow, quarter.font, half.font, quarter.groundLayers, quarter.ink]).toEqual([
		'#484a4fff',
		0.75,
		LIVEREELS_LOOK.font,
		'Georgia',
		{ going: 'none', coming: dots, come: 0.25 },
		'#000000'
	]);
});

test("the ground's layers fade on from those that came in by a fade before, not from those they faded out", () => {
	const dots = 'radial-gradient(#fff2 1px, transparent 1px) 0 0 / 24px 24px';
	const lines = 'repeating-linear-gradient(45deg, #fff1 0 2px, transparent 2px 12px)';
	const dotted = valuesWith(LIVEREELS_LOOK, { groundLayers: dots }, LOOK_KINDS);
	const faded = valuesToward(
		LIVEREELS_LOOK,
		{ start: LIVEREELS_LOOK, end: dotted, names: ['groundLayers'] as const },
		LOOK_KINDS,
		1
	);
	const lined = valuesWith(faded, { groundLayers: lines }, LOOK_KINDS);
	const moving = { start: faded, end: lined, names: ['groundLayers'] } as const;
	expect(valuesToward(faded, moving, LOOK_KINDS, 0.5).groundLayers).toEqual({ going: dots, coming: lines, come: 0.5 });
});

test("the ground's layers a theme writes stand whole, as come", () => {
	const lines = 'repeating-linear-gradient(45deg, #fff1 0 2px, transparent 2px 12px)';
	expect(valuesWith(LIVEREELS_LOOK, { groundLayers: lines }, LOOK_KINDS).groundLayers).toEqual({
		going: lines,
		coming: lines,
		come: 1
	});
});
