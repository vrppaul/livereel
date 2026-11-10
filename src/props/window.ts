/**
 * The page's window as a scene holds it: where it stands and how it stands, as the camera reads it (`Placing` in
 * `src/domain/camera.ts`), and how the page in it is shaded — dimmed, faded into the film's ground and blurred — so
 * what stands over it, a piece of the page lifted off, stands clear of it. A film moves the shade as it moves places, by
 * one move that sets the values it names (`window.shade` in `src/moves/window.ts`), the dim and the fade as strong as a
 * share from none to whole, the blur in pixels of a frame 1080 high; the window's edge and shadow keep as they stand.
 *
 * The window stands as an object does, by a stance (`src/domain/stance.ts`), and the stage draws it by the matrix the
 * engine sees its points through (`windowOnTheFrame`), as it draws an object: flat while it faces the frame, in 3D
 * only where it leans, so its projection is written once and a face-on window costs the graphics card no 3D layer in
 * an exposure. The window stands in the world, so the eye's focus blurs it, with all that lies in it, by where it
 * stands (`src/domain/focus.ts`): the flat stage as one, as soft as its point nearest the focus, and the room each
 * point of it by how far that stands from the focus.
 *
 * In a room the window may have a body, as the look has it: a slab of metal round the page, as a tablet is made, its
 * sides square to the page and its corners as round as the page's grown by its rim, lit by the world's light
 * (`src/props/lighting.ts`). It comes as the window's edge and shadow do, as far as the window stands off the ground
 * and the screen has come up in it, growing thicker and its rim wider, where they grow darker; and it takes their
 * place, as the slab is the window's edge, and a shadow drawn on the window's plane would lie over its sides. The
 * engine hands it as the window stands, in three's axes, and which of its sides the eye sees, so the stage lays it
 * under the page or over it; the flat stage draws the window's edge and shadow in its place.
 */
import {
	type Cut,
	type Placing,
	type View,
	inTheEyesSpaceAbout,
	pictureReachOf,
	windowOnTheFrame
} from '../domain/camera.ts';
import { type Eye, inTheEyesSpace, turnOf } from '../domain/eye.ts';
import { type OutOfFocusAt, type Sharpness, outOfFocusAt, outOfFocusOnTheFrame } from '../domain/focus.ts';
import {
	ITS_MIDDLE,
	type Matrix,
	type Spot,
	carried,
	chained,
	dotOf,
	inThreesAxes,
	translation,
	wayBetween
} from '../domain/matrix.ts';
import { type Fraction, NONE } from '../domain/fraction.ts';
import { type Box, type Size, boxAround, frameScaleOf, middleX, middleY } from '../domain/geometry.ts';
import type { Look } from './look.ts';
import type { WorldLook } from './world.ts';
import { type Transform, stanceMatrix, transformOf } from '../domain/stance.ts';
import {
	MOVES_AS_A_SHARE,
	MOVES_AS_PIXELS,
	type MovingBy,
	NO_PIXELS,
	namesOf,
	standsAtRest
} from '../domain/toward.ts';

export interface Shade {
	readonly dim: Fraction;
	readonly fade: Fraction;
	readonly blur: number;
}

export interface PageWindow extends Placing, Shade {}

/**
 * The window as the stage draws it: its box on the frame, how far the camera's picture reaches on its plane, past the
 * box where the screen stands past it, how far it stands off the ground, how it is drawn about its box's middle,
 * standing as it stands and seen from the eye, and the matrix that carries it from that middle into the eye's own
 * space, in three's axes, by whose surface the room parts a thing in the world, and whether the eye sees the page's
 * side of that surface or its back; how round the corners of the page the camera's cut shows are, in the frame's
 * pixels, which the stylesheet cuts the page by and the body stands round; its shade, none where the page is shaded
 * none, and how soft the eye's focus draws it and all in it, none where sharp: as one, on the frame in pixels of a frame
 * 1080 high, for the flat stage, and at each point of the frame, for the room; and its body, none where it has none.
 */
export interface DrawnWindow {
	readonly box: Box;
	readonly reach: Box;
	readonly lift: Fraction;
	readonly transform: Transform;
	readonly inTheEyesSpace: Matrix;
	readonly facingTheEye: boolean;
	readonly corner: number;
	readonly shade: Shade | null;
	readonly outOfFocus: number | null;
	readonly outOfFocusAt: OutOfFocusAt | null;
	readonly body: DrawnBody | null;
}

/**
 * The window's body as the room draws it round the page the camera's cut shows (`reach`), in the frame's pixels: how
 * far its rim reaches past the page and how thick it is; its metal's colour and how rough it is; how much of the
 * world's light the glass over the page reflects; the matrix that carries the page's middle, its face toward three's
 * z, into the eye's own space, in three's axes, the body standing behind its face; the matrix that carries the room
 * into that space, where the world's lights stand; how far the eye stands before the frame, which the stage sees it in
 * perspective from; and the slab's back as the stage draws a plane, as the window's transform draws the page, its
 * thickness behind it, where a page on the window's back lies.
 */
export interface DrawnBody {
	readonly rim: number;
	readonly thickness: number;
	readonly metal: string;
	readonly roughness: number;
	readonly glass: number;
	readonly placing: Matrix;
	readonly roomInTheEyesSpace: Matrix;
	readonly eyeDistance: number;
	readonly back: Transform;
}

/**
 * What stands round the window as it is drawn: the eye that sees it, the frame, how sharp the eye sees, how the look
 * makes its body — the page's corners and the body's own values — the world's light its glass reflects, and how far
 * the screen has come up in it.
 */
export interface AroundTheWindow {
	readonly eye: Eye;
	readonly frame: Size;
	readonly sharpness: Sharpness;
	readonly look: Pick<
		Look,
		'paneCorner' | 'windowThickness' | 'windowRim' | 'windowMetal' | 'windowRoughness' | 'windowGlass'
	>;
	readonly world: Pick<WorldLook, 'lights' | 'softBoxes'>;
	readonly screenShown: Fraction;
}

export const UNSHADED: Shade = { dim: NONE, fade: NONE, blur: NO_PIXELS };

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them
export const SHADING: MovingBy<Shade> = { dim: MOVES_AS_A_SHARE, fade: MOVES_AS_A_SHARE, blur: MOVES_AS_PIXELS };

// The names of the shade's values, in the order a refusal says them
export const SHADE_NAMES = namesOf(SHADING);

// A body of no thickness, which is none
const NO_THICKNESS = 0;
// The way out of the page's face, toward three's z, from its middle; a spot on the page's plane; and the slab's back,
// moved neither across nor down from the page
const A_UNIT_OUT: Spot = { across: 0, down: 0, out: 1 };
const ON_ITS_PLANE = 0;
const UNMOVED = 0;
// A corner reaches at most half the page's shorter side, as CSS rounds a box no further
const HALVES = 2;

/**
 * The window as the stage draws it among what stands round it: standing as the camera's view, its picture cut as the
 * camera has it, seen from the eye, its corners rounding as it lifts, shaded as it is, as soft as the eye sees it, the
 * room's blur as soft at most as the window's softest point the frame shows, its box or as far as its picture reaches,
 * and with its body.
 */
export function drawnWindow(view: View, cut: Cut, window: Shade, around: AroundTheWindow): DrawnWindow {
	const { eye, frame, sharpness } = around;
	const placing = windowOnTheFrame(view, eye, frame);
	const own = stanceMatrix(view);
	const stood = chained([turnOf(eye), own]);
	const reach = pictureReachOf(view.box, cut);
	const intoTheEyesSpace = chained([inTheEyesSpaceAbout(view.box, eye, frame), own]);
	const roundest = Math.min(reach.width, reach.height) / HALVES;
	return {
		box: view.box,
		reach,
		lift: view.lift,
		transform: transformOf(stood, placing),
		inTheEyesSpace: inThreesAxes(intoTheEyesSpace),
		facingTheEye: facesTheEye(intoTheEyesSpace),
		corner: Math.min(around.look.paneCorner * frameScaleOf(frame) * view.lift, roundest),
		shade: drawnShade(window),
		outOfFocus: outOfFocusOnTheFrame(placing, view.box, sharpness, frame),
		outOfFocusAt: outOfFocusAt(placing, view.box, boxAround([view.box, reach]), sharpness, frame),
		body: drawnBody(view, reach, { intoTheEyesSpace, stood, placing }, around)
	};
}

/**
 * How the window stands for its body: the matrix that carries its middle into the eye's own space; how it stands before
 * the eye, and the matrix the stage draws it by, as `transformOf` reads them.
 */
interface WindowStanding {
	readonly intoTheEyesSpace: Matrix;
	readonly stood: Matrix;
	readonly placing: Matrix;
}

/**
 * The window's body as the room draws it, round the page the camera's cut shows, placed by the matrix that carries the
 * window's middle into the eye's own space: as thick, its rim as wide and its glass as strong as the look has them, so
 * far as the window stands off the ground and the screen has come up in it, so no glint comes with it at once, its
 * glass none where the world has no light to reflect; none, where that leaves it no thickness.
 */
function drawnBody(view: View, page: Box, window: WindowStanding, around: AroundTheWindow): DrawnBody | null {
	const scale = frameScaleOf(around.frame);
	const standing = view.lift * around.screenShown;
	const thickness = around.look.windowThickness * scale * standing;
	if (thickness <= NO_THICKNESS) return null;
	const pageMiddle: Spot = {
		across: middleX(page) - middleX(view.box),
		down: middleY(page) - middleY(view.box),
		out: ON_ITS_PLANE
	};
	const placing = chained([window.intoTheEyesSpace, translation(pageMiddle)]);
	const behind = translation({ across: UNMOVED, down: UNMOVED, out: -thickness });
	return {
		rim: around.look.windowRim * scale * standing,
		thickness,
		metal: around.look.windowMetal,
		roughness: around.look.windowRoughness,
		glass: isLit(around.world) ? around.look.windowGlass * standing : NONE,
		placing: inThreesAxes(placing),
		roomInTheEyesSpace: inThreesAxes(inTheEyesSpace(around.eye, around.frame)),
		eyeDistance: around.sharpness.focalLength * scale,
		back: transformOf(chained([window.stood, behind]), chained([window.placing, behind]))
	};
}

/** Whether the world has light in it, a light or a soft box, which the glass could reflect. */
function isLit(world: Pick<WorldLook, 'lights' | 'softBoxes'>): boolean {
	return world.lights.length > NONE || world.softBoxes.length > NONE;
}

/**
 * Whether the eye sees a face, by the matrix that carries the face's middle into the eye's own space: the eye stands at
 * that space's middle, on the side the face looks out to; edge-on, it sees neither.
 */
function facesTheEye(intoTheEyesSpace: Matrix): boolean {
	const middle = carried(intoTheEyesSpace, ITS_MIDDLE);
	const outward = wayBetween(middle, carried(intoTheEyesSpace, A_UNIT_OUT));
	return dotOf(outward, middle) < NONE;
}

/** The page's shade as the stage draws it; none where it is shaded none, so the stage draws no filter. */
function drawnShade(window: Shade): Shade | null {
	if (standsAtRest(window, UNSHADED, SHADE_NAMES)) return null;
	return { dim: window.dim, fade: window.fade, blur: window.blur };
}
