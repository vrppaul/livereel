import { expect, test } from 'vitest';
import { type Cut, type View, windowView } from '../../src/domain/camera.ts';
import { windowInTheWorld } from '../../src/domain/placement.ts';
import { type Angle, FACE_ON } from '../../src/domain/stance.ts';
import { eyeAtRest } from '../../src/domain/eye.ts';
import type { Sharpness } from '../../src/domain/focus.ts';
import type { Box, Size } from '../../src/domain/geometry.ts';
import { ITS_MIDDLE, type Matrix, type Spot, carried, chained, flatOf, translation } from '../../src/domain/matrix.ts';
import { LIVEREELS_SLAB, type Slab } from '../../src/props/body.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { SCREEN_DOWN, SCREEN_UP } from '../../src/props/screen.ts';
import { LIVEREELS_WORLD } from '../../src/props/world.ts';
import { type AroundTheWindow, UNSHADED, drawnWindow } from '../../src/props/window.ts';
import { FOCAL_LENGTH } from './fakes.ts';

// A frame twice as large as the look was made on, so a body's lengths stand in its pixels, twice the look's
const TWICE_THE_LOOK: Size = { width: 3840, height: 2160 };
const TWICE = 2;
// A window standing in a place of that frame, lifted whole off the ground; and one lower than the page's corners
// are round twice over
const WINDOW: Box = { left: 1000, top: 600, width: 1800, height: 1000 };
const LIFTED: View = windowView(WINDOW);
const LOW: View = windowView({ ...WINDOW, height: 60 });
// A cut at the window's own edges, as a window lifted whole has it; and one standing out past its left and top, as a
// window half-lifted from the frame's corner has it
const AT_ITS_EDGES: Cut = { top: 0, right: 0, bottom: 0, left: 0 };
const STANDING_OUT: Cut = { top: -40, right: 0, bottom: 0, left: -100 };
// The page the cut standing out shows, and how far its middle stands from the window's, in three's axes, up the frame
const SHOWN_PAST_ITS_EDGES: Box = { left: 900, top: 560, width: 1900, height: 1040 };
const SHOWN_MIDDLE_FROM_THE_WINDOWS: Spot = { across: -50, down: 20, out: 0 };
// A window's body: as thick and as wide a rim as these, in pixels of a frame 1080 high, of a dark metal this rough,
// glass this strong over the page; and a window unshaded with it, and with livereel's, of no thickness
const BODY: Slab = { thickness: 24, rim: 6, metal: '#454b56', roughness: 0.45, glass: 0.4 };
const WITH_A_BODY = { ...UNSHADED, body: BODY };
const WITH_LIVEREELS_BODY = { ...UNSHADED, body: LIVEREELS_SLAB };
// The page's corners as round as livereel's look has them, in pixels of a frame 1080 high
const CORNER = LIVEREELS_LOOK.paneCorner;
// A world lit by a soft box the glass reflects, overhead
const OVERHEAD = { colour: '#ffffff', brightness: 12, round: 0, up: 75, width: 33, height: 33, lean: 0 };
const LIT = { ...LIVEREELS_WORLD, softBoxes: [OVERHEAD] };
const SHARP: Sharpness = { focusedAt: FOCAL_LENGTH, focalLength: FOCAL_LENGTH, aperture: 0 };
const AT_REST = eyeAtRest(FOCAL_LENGTH);
const AROUND: AroundTheWindow = {
	eye: AT_REST,
	frame: TWICE_THE_LOOK,
	sharpness: SHARP,
	look: LIVEREELS_LOOK,
	world: LIT,
	screen: SCREEN_UP
};
// The window's back showing a page of the film's own, upright once turned over
const SHOWING_A_BACK: AroundTheWindow = {
	...AROUND,
	screen: { ...SCREEN_UP, back: { kind: 'own', key: 'back', upright: 'over' } }
};
// The screen half come up
const HALF_UP = { ...SCREEN_UP, shown: 0.5 };
// The window turned about its upright, a little, short of edge-on, past it, and half round
const TURNED: readonly Angle[] = [30, 80, 100, 180].map((turn) => ({ ...FACE_ON, turn }));
// A corner of the window, from its middle, in three's axes, up the frame
const ITS_TOP_RIGHT: Spot = { across: 900, down: 500, out: 0 };
const DECIMALS = 6;

/** A spot rounded to so many decimals, each way, so arithmetic's last digits and a zero's sign do not count. */
function rounded(spot: Spot): Spot {
	return {
		across: Number(spot.across.toFixed(DECIMALS)) + 0,
		down: Number(spot.down.toFixed(DECIMALS)) + 0,
		out: Number(spot.out.toFixed(DECIMALS)) + 0
	};
}

/** Where a matrix carries a spot, rounded. */
function carriedTo(matrix: Matrix, spot: Spot): Spot {
	return rounded(carried(matrix, spot));
}

test("a page the window's back shows lies on its body's back, its thickness behind the page's plane: leant in 3D, and flat where it faces the frame from behind, smaller as it stands farther from the eye", () => {
	const turnedOver: View = { ...LIFTED, angle: { ...FACE_ON, over: 180 } };
	const leant: View = { ...LIFTED, angle: { ...FACE_ON, over: 160 } };
	const [flatBack, leantBack] = [turnedOver, leant].map((view) =>
		drawnWindow(view, AT_ITS_EDGES, WITH_A_BODY, SHOWING_A_BACK)
	);
	const thickness = flatBack!.body!.thickness;
	const behind = translation({ across: 0, down: 0, out: -thickness });
	const placedBehind = (view: View): Matrix =>
		chained([windowInTheWorld(view, AT_REST, TWICE_THE_LOOK).placing, behind]);
	expect([
		flatBack!.pageSurface.transform,
		leantBack!.pageSurface.transform,
		carriedTo(leantBack!.pageSurface.inTheEyesSpace, ITS_TOP_RIGHT)
	]).toEqual([
		{ kind: 'flat', matrix: flatOf(placedBehind(turnedOver)) },
		{ kind: 'leant', matrix: placedBehind(leant) },
		carriedTo(leantBack!.inTheEyesSpace, { ...ITS_TOP_RIGHT, out: -thickness })
	]);
});

test("a page lies on the window's own plane where the eye sees the window's front, or its back with no body, or its back showing no page of its own", () => {
	const turnedOver: View = { ...LIFTED, angle: { ...FACE_ON, over: 180 } };
	const windows = [
		drawnWindow(LIFTED, AT_ITS_EDGES, WITH_A_BODY, SHOWING_A_BACK),
		drawnWindow(turnedOver, AT_ITS_EDGES, WITH_LIVEREELS_BODY, SHOWING_A_BACK),
		drawnWindow(turnedOver, AT_ITS_EDGES, WITH_A_BODY, AROUND)
	];
	expect(windows.map((window) => window.pageSurface)).toEqual(
		windows.map((window) => ({ transform: window.transform, inTheEyesSpace: window.inTheEyesSpace }))
	);
});

test("a window lifted whole, with a body, hands the stage its slab: the rim and the thickness in the frame's pixels, the metal, the glass over the page, placed as the window is, round a page whose corners are the look's in the frame's pixels", () => {
	const window = drawnWindow(LIFTED, AT_ITS_EDGES, WITH_A_BODY, AROUND);
	const body = window.body!;
	expect([window.corner, { ...body, placing: carriedTo(body.placing, ITS_TOP_RIGHT) }]).toEqual([
		CORNER * TWICE,
		{
			rim: BODY.rim * TWICE,
			thickness: BODY.thickness * TWICE,
			metal: BODY.metal,
			roughness: BODY.roughness,
			glass: BODY.glass,
			placing: carriedTo(window.inTheEyesSpace, ITS_TOP_RIGHT)
		}
	]);
});

test('the page shows as far as its screen has come up and its shade has not faded it, whole where it stands whole', () => {
	const faded = drawnWindow(
		LIFTED,
		AT_ITS_EDGES,
		{ ...WITH_LIVEREELS_BODY, fade: 0.25 },
		{ ...AROUND, screen: HALF_UP }
	);
	const comingUp = drawnWindow(LIFTED, AT_ITS_EDGES, WITH_LIVEREELS_BODY, { ...AROUND, screen: HALF_UP });
	const whole = drawnWindow(LIFTED, AT_ITS_EDGES, WITH_LIVEREELS_BODY, AROUND);
	expect([faded.pageShown, comingUp.pageShown, whole.pageShown]).toEqual([0.375, 0.5, 1]);
});

test('the page has faded into what stands behind it as far as its screen has come up and its shade fades it, none where unfaded', () => {
	const fadedHalfUp = drawnWindow(
		LIFTED,
		AT_ITS_EDGES,
		{ ...WITH_LIVEREELS_BODY, fade: 0.25 },
		{ ...AROUND, screen: HALF_UP }
	);
	const fadedWhole = drawnWindow(LIFTED, AT_ITS_EDGES, { ...WITH_LIVEREELS_BODY, fade: 1 }, AROUND);
	const comingUp = drawnWindow(LIFTED, AT_ITS_EDGES, WITH_LIVEREELS_BODY, { ...AROUND, screen: HALF_UP });
	expect([fadedHalfUp.pageFaded, fadedWhole.pageFaded, comingUp.pageFaded]).toEqual([0.125, 1, 0]);
});

test('a window turned past edge-on shows the eye its back, not its page', () => {
	const turned = TURNED.map((angle) => drawnWindow({ ...LIFTED, angle }, AT_ITS_EDGES, WITH_A_BODY, AROUND));
	expect(turned.map((window) => window.facingTheEye)).toEqual([true, true, false, false]);
});

test("a body comes as far as the window lifts and the screen comes up in it, round the page the cut shows, whose corners round as the window lifts, no rounder than half the page's shorter side", () => {
	const view = { ...LIFTED, lift: 0.5 };
	const around = { ...AROUND, screen: HALF_UP };
	const window = drawnWindow(view, STANDING_OUT, WITH_A_BODY, around);
	const body = window.body!;
	expect([
		window.reach,
		window.corner,
		body.rim,
		body.thickness,
		body.glass,
		carriedTo(body.placing, ITS_MIDDLE),
		drawnWindow(LOW, AT_ITS_EDGES, WITH_A_BODY, AROUND).corner
	]).toEqual([
		SHOWN_PAST_ITS_EDGES,
		CORNER * TWICE * 0.5,
		BODY.rim * TWICE * 0.25,
		BODY.thickness * TWICE * 0.25,
		BODY.glass * 0.25,
		carriedTo(window.inTheEyesSpace, SHOWN_MIDDLE_FROM_THE_WINDOWS),
		LOW.box.height / 2
	]);
});

test('the glass reflects nothing where the world has no light in it, no lights and no soft boxes', () => {
	expect(drawnWindow(LIFTED, AT_ITS_EDGES, WITH_A_BODY, { ...AROUND, world: LIVEREELS_WORLD }).body!.glass).toBe(0);
});

test("no body where the window's is of no thickness, livereel's own, where the window is the frame itself, or where the screen has not come up", () => {
	expect([
		drawnWindow(LIFTED, AT_ITS_EDGES, WITH_LIVEREELS_BODY, AROUND).body,
		drawnWindow({ ...LIFTED, lift: 0 }, AT_ITS_EDGES, WITH_A_BODY, AROUND).body,
		drawnWindow(LIFTED, AT_ITS_EDGES, WITH_A_BODY, { ...AROUND, screen: SCREEN_DOWN }).body
	]).toEqual([null, null, null]);
});
