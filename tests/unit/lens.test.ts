import { Box3, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { type DrawnEye, drawnEye, eyeAtRest } from '../../src/domain/eye.ts';
import { lensLawOf } from '../../src/domain/focus.ts';
import type { Size } from '../../src/domain/geometry.ts';
import { Lens } from '../../stage/lens.js';

// A frame 1080 high, drawn at twice its pixels, as a still is
const FRAME: Size = { width: 1920, height: 1080 };
const FRAME_SCALE = 1;
const DRAWN_AT_TWICE = 2;
// The eye's focal length and how wide it is open, in pixels of a frame 1080 high
const FOCAL_LENGTH = 1300;
const APERTURE = 60;
// How far across and up a box of what stands reaches about the eye's sight, which does not count
const ACROSS = 100;

/** Something standing in the world, by its name, over a reach of distances before the eye, in the eye's own space. */
interface Standing {
	readonly name: string;
	readonly box: Box3;
}

/** What stands so far before the eye, at its nearest and its farthest, the eye seeing down three's −z. */
function standing(name: string, nearest: number, farthest: number): Standing {
	return { name, box: new Box3(new Vector3(-ACROSS, -ACROSS, -farthest), new Vector3(ACROSS, ACROSS, -nearest)) };
}

/** The eye at rest, focused so far before it. */
function focusedAt(distance: number): DrawnEye {
	const law = lensLawOf({ focusedAt: distance, focalLength: FOCAL_LENGTH, aperture: APERTURE });
	return drawnEye(eyeAtRest(FOCAL_LENGTH), FRAME, law);
}

const PINHOLE = drawnEye(eyeAtRest(FOCAL_LENGTH), FRAME, null);
const PAGE = standing('page', 2000, 2000);
const CUBE = standing('cube', 800, 1100);
const CASES = [
	{ eye: focusedAt(2000), standing: [PAGE, CUBE], apart: ['cube'] },
	{ eye: focusedAt(800), standing: [PAGE, CUBE], apart: [] },
	{ eye: focusedAt(2500), standing: [standing('leant page', 1900, 2300), standing('cube', 1800, 2100)], apart: [] },
	{ eye: focusedAt(2000), standing: [PAGE, CUBE, standing('nearer cube', 500, 700)], apart: ['nearer cube', 'cube'] },
	{ eye: focusedAt(2000), standing: [PAGE, standing('sharp cube', 1950, 1990), CUBE], apart: ['cube'] },
	{ eye: focusedAt(2000), standing: [standing('leant page', 700, 2500), CUBE], apart: [] },
	{
		eye: focusedAt(2000),
		standing: [
			standing('title before', 900, 900),
			standing('leant page', 1700, 2300),
			standing('title behind', 2500, 2500)
		],
		apart: ['title before']
	},
	{ eye: focusedAt(2000), standing: [CUBE], apart: [] },
	{ eye: PINHOLE, standing: [PAGE, CUBE], apart: [] }
];

test('what stands nearer the eye than all the rest is a world apart, its nearest while any of it is blurred near and each farther while all of it is', () => {
	const lens = new Lens(FRAME_SCALE * DRAWN_AT_TWICE, FRAME_SCALE, DRAWN_AT_TWICE);
	const apart = CASES.map((each) => lens.apartBeforeTheRest(each.eye, each.standing).map((one) => one.name));
	expect(apart).toEqual(CASES.map((each) => each.apart));
});
