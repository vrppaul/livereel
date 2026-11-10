import { expect, test } from 'vitest';
import type { Size } from '../../src/domain/geometry.ts';
import { ITS_MIDDLE, type Spot, carried } from '../../src/domain/matrix.ts';
import { type SoftBox, type WorldLight, drawnBloom, drawnLighting } from '../../src/props/lighting.ts';

// A frame twice as large as the look was made on, so the room stands in its pixels, twice the film's
const TWICE_THE_LOOK: Size = { width: 3840, height: 2160 };
// How many decimals of a pixel, or of a unit, a spot carried keeps
const DECIMALS = 6;
// A white light of its whole strength, a narrow cone with a soft edge, standing above the frame's left, out toward the
// eye, and aiming at the frame's middle
const LIGHT: WorldLight = {
	colour: '#ffffff',
	strength: 1,
	angle: 20,
	softness: 1,
	at: { across: -300, down: -800, out: 600 },
	aim: { across: 0, down: 0, out: 0 }
};
// A white soft box of its whole brightness, 40° wide and 60° high, unleant
const SOFT_BOX = { colour: '#ffffff', brightness: 1, width: 40, height: 60, lean: 0 };
// Spots on a soft box's face: the middle of its right edge, its top right corner, and one a unit behind its middle
const ITS_RIGHT_EDGE: Spot = { across: 0.5, down: 0, out: 0 };
const ITS_TOP_RIGHT_CORNER: Spot = { across: 0.5, down: 0.5, out: 0 };
const BEHIND_ITS_FACE: Spot = { across: 0, down: 0, out: 1 };
// Half a soft box's width and height a unit off, as the angles it spans say: tan 20° and tan 30°
const HALF_ITS_WIDTH = Math.tan(Math.PI / 9);
const HALF_ITS_HEIGHT = Math.tan(Math.PI / 6);

/** A spot rounded to so many decimals, each way, so arithmetic's last digits and a zero's sign do not count. */
function rounded(spot: Spot): Spot {
	return {
		across: Number(spot.across.toFixed(DECIMALS)) + 0,
		down: Number(spot.down.toFixed(DECIMALS)) + 0,
		out: Number(spot.out.toFixed(DECIMALS)) + 0
	};
}

test("a light stands and aims in the room in three's axes, up the frame, in the frame's pixels", () => {
	const [light] = drawnLighting([LIGHT], [], TWICE_THE_LOOK).lights;
	expect([rounded(carried(light!.standing, ITS_MIDDLE)), rounded(carried(light!.aimedAt, ITS_MIDDLE))]).toEqual([
		{ across: -600, down: 1600, out: 1200 },
		ITS_MIDDLE
	]);
});

test("a soft box stands a unit from the room's middle the way it is turned, toward the eye at rest, the frame's right, up it or up from its right, in three's axes, facing the middle, as wide as the angle it spans, leant clockwise seen from beyond it; the farthest corner of any, as far as it stands", () => {
	const boxes: readonly SoftBox[] = [
		{ ...SOFT_BOX, round: 0, up: 0 },
		{ ...SOFT_BOX, round: 90, up: 0 },
		{ ...SOFT_BOX, round: 0, up: 90 },
		{ ...SOFT_BOX, round: 90, up: 45 },
		{ ...SOFT_BOX, round: 0, up: 0, lean: 90 }
	];
	const lighting = drawnLighting([], boxes, TWICE_THE_LOOK);
	const [towardTheEye, right, above, upFromTheRight, leant] = lighting.softBoxes;
	expect([
		rounded(carried(towardTheEye!.placing, ITS_MIDDLE)),
		rounded(carried(right!.placing, ITS_MIDDLE)),
		rounded(carried(above!.placing, ITS_MIDDLE)),
		rounded(carried(upFromTheRight!.placing, ITS_MIDDLE)),
		rounded(carried(right!.placing, BEHIND_ITS_FACE)),
		rounded(carried(towardTheEye!.placing, ITS_RIGHT_EDGE)),
		rounded(carried(towardTheEye!.placing, ITS_TOP_RIGHT_CORNER)),
		rounded(carried(leant!.placing, ITS_RIGHT_EDGE)),
		lighting.softBoxesReach
	]).toEqual([
		{ across: 0, down: 0, out: 1 },
		{ across: 1, down: 0, out: 0 },
		{ across: 0, down: 1, out: 0 },
		rounded({ across: Math.SQRT1_2, down: Math.SQRT1_2, out: 0 }),
		{ across: 2, down: 0, out: 0 },
		rounded({ across: HALF_ITS_WIDTH, down: 0, out: 1 }),
		rounded({ across: HALF_ITS_WIDTH, down: HALF_ITS_HEIGHT, out: 1 }),
		rounded({ across: 0, down: -HALF_ITS_WIDTH, out: 1 }),
		expect.closeTo(Math.hypot(1, HALF_ITS_WIDTH, HALF_ITS_HEIGHT))
	]);
});

test("a frame glows round its brightest light only where the look gives the glow a strength, as far as the look spreads it, from light brighter than the page's white alone", () => {
	expect([drawnBloom(0, 0.4), drawnBloom(0.45, 0.4)]).toEqual([null, { strength: 0.45, radius: 0.4, threshold: 1.01 }]);
});
