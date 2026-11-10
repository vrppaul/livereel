import { expect, test } from 'vitest';
import { type Angle, type Cut, FACE_ON, type View, leaningOnTheFrame, windowView } from '../../src/domain/camera.ts';
import { type Eye, eyeAtRest } from '../../src/domain/eye.ts';
import type { Sharpness } from '../../src/domain/focus.ts';
import type { Box, Size } from '../../src/domain/geometry.ts';
import { ITS_MIDDLE, type Matrix, type Spot, carried, chained, flatOf, translation } from '../../src/domain/matrix.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
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
// A body as the look has it: as thick, as wide a rim and the page's corners as round as these, in pixels of a frame
// 1080 high, of a dark metal this rough
const BODY = {
	windowThickness: 24,
	windowRim: 6,
	windowMetal: '#454b56',
	windowRoughness: 0.45,
	windowGlass: 0.4,
	paneCorner: 24
};
// A soft box of the world the glass reflects, overhead
const OVERHEAD = { colour: '#ffffff', brightness: 12, round: 0, up: 75, width: 33, height: 33, lean: 0 };
const WITH_A_BODY = { ...LIVEREELS_LOOK, ...BODY, softBoxes: [OVERHEAD] };
const SHARP: Sharpness = { focusedAt: FOCAL_LENGTH, focalLength: FOCAL_LENGTH, aperture: 0 };
const AT_REST = eyeAtRest(FOCAL_LENGTH);
// An eye moved up, to the right and nearer, in pixels of a frame 1080 high; where it stands in the room in three's
// axes, up the frame, in the frame's pixels
const MOVED: Eye = { ...AT_REST, at: { across: 300, down: -150, out: 900 } };
const WHERE_THE_MOVED_EYE_STANDS: Spot = { across: 600, down: 300, out: 1800 };
const AROUND: AroundTheWindow = {
	eye: AT_REST,
	frame: TWICE_THE_LOOK,
	sharpness: SHARP,
	look: WITH_A_BODY,
	screenShown: 1
};
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

test("the body's back is drawn where the slab's back stands, its thickness behind the page: leant in 3D, and flat where it faces the frame from behind, smaller as it stands farther from the eye", () => {
	const turnedOver: View = { ...LIFTED, angle: { ...FACE_ON, over: 180 } };
	const leant: View = { ...LIFTED, angle: { ...FACE_ON, over: 160 } };
	const [flatBack, leantBack] = [turnedOver, leant].map(
		(view) => drawnWindow(view, AT_ITS_EDGES, UNSHADED, AROUND).body!
	);
	const behind = (view: View): Matrix =>
		chained([
			leaningOnTheFrame(view, AT_REST, TWICE_THE_LOOK),
			translation({ across: 0, down: 0, out: -flatBack!.thickness })
		]);
	expect([flatBack!.back, leantBack!.back]).toEqual([
		{ kind: 'flat', matrix: flatOf(behind(turnedOver)) },
		{ kind: 'leant', matrix: behind(leant) }
	]);
});

test("a window lifted whole, of a look with a body, hands the stage its slab: the rim and the thickness in the frame's pixels, the metal, the glass over the page, placed as the window is, round a page whose corners are the look's in the frame's pixels", () => {
	const window = drawnWindow(LIFTED, AT_ITS_EDGES, UNSHADED, AROUND);
	const body = window.body!;
	expect([
		window.corner,
		{ ...body, placing: carriedTo(body.placing, ITS_TOP_RIGHT), roomInTheEyesSpace: null, back: null }
	]).toEqual([
		BODY.paneCorner * TWICE,
		{
			rim: BODY.windowRim * TWICE,
			thickness: BODY.windowThickness * TWICE,
			metal: BODY.windowMetal,
			roughness: BODY.windowRoughness,
			glass: BODY.windowGlass,
			placing: carriedTo(window.inTheEyesSpace, ITS_TOP_RIGHT),
			roomInTheEyesSpace: null,
			eyeDistance: FOCAL_LENGTH * TWICE,
			back: null
		}
	]);
});

test('a body is lit by the room as the eye sees it: a spot of the room where the eye stands is the middle of its space', () => {
	const body = drawnWindow(LIFTED, AT_ITS_EDGES, UNSHADED, { ...AROUND, eye: MOVED }).body!;
	expect(carriedTo(body.roomInTheEyesSpace, WHERE_THE_MOVED_EYE_STANDS)).toEqual(ITS_MIDDLE);
});

test('a window turned past edge-on shows the eye its back, not its page', () => {
	const turned = TURNED.map((angle) => drawnWindow({ ...LIFTED, angle }, AT_ITS_EDGES, UNSHADED, AROUND));
	expect(turned.map((window) => window.facingTheEye)).toEqual([true, true, false, false]);
});

test("a body comes as far as the window lifts and the screen comes up in it, round the page the cut shows, whose corners round as the window lifts, no rounder than half the page's shorter side", () => {
	const view = { ...LIFTED, lift: 0.5 };
	const around = { ...AROUND, screenShown: 0.5 };
	const window = drawnWindow(view, STANDING_OUT, UNSHADED, around);
	const body = window.body!;
	expect([
		window.reach,
		window.corner,
		body.rim,
		body.thickness,
		body.glass,
		carriedTo(body.placing, ITS_MIDDLE),
		drawnWindow(LOW, AT_ITS_EDGES, UNSHADED, AROUND).corner
	]).toEqual([
		SHOWN_PAST_ITS_EDGES,
		BODY.paneCorner * TWICE * 0.5,
		BODY.windowRim * TWICE * 0.25,
		BODY.windowThickness * TWICE * 0.25,
		BODY.windowGlass * 0.25,
		carriedTo(window.inTheEyesSpace, SHOWN_MIDDLE_FROM_THE_WINDOWS),
		LOW.box.height / 2
	]);
});

test('the glass reflects nothing where the world has no light in it, no lights and no soft boxes', () => {
	const unlit = { ...WITH_A_BODY, softBoxes: [] };
	expect(drawnWindow(LIFTED, AT_ITS_EDGES, UNSHADED, { ...AROUND, look: unlit }).body!.glass).toBe(0);
});

test('no body where the look has a window of no thickness, where the window is the frame itself, or where the screen has not come up', () => {
	expect([
		drawnWindow(LIFTED, AT_ITS_EDGES, UNSHADED, { ...AROUND, look: LIVEREELS_LOOK }).body,
		drawnWindow({ ...LIFTED, lift: 0 }, AT_ITS_EDGES, UNSHADED, AROUND).body,
		drawnWindow(LIFTED, AT_ITS_EDGES, UNSHADED, { ...AROUND, screenShown: 0 }).body
	]).toEqual([null, null, null]);
});
