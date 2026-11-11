import { expect, test } from 'vitest';
import { drawnGrain } from '../../src/props/grain.ts';

// A channel's levels in eight bits, and how far an even noise spanning a level either way spreads, in levels
const LEVELS = 255;
const SPREAD_OF_ONE_LEVEL = 1 / Math.sqrt(3);

test("the ground's grain is handed as how far an even noise spanning its levels either way spreads, in shares of a channel's whole: none where the world has none", () => {
	expect([drawnGrain(0), drawnGrain(1), drawnGrain(3)]).toEqual([
		null,
		expect.closeTo(SPREAD_OF_ONE_LEVEL / LEVELS),
		expect.closeTo((3 * SPREAD_OF_ONE_LEVEL) / LEVELS)
	]);
});
