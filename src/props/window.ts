/**
 * The page's window as a scene holds it: where it stands and how it stands, as the camera reads it (`Placing` in
 * `src/domain/camera.ts`), and how the page in it is shaded — dimmed, faded into the film's ground and blurred — so
 * what stands over it, a piece of the page lifted off, stands clear of it. A film moves the shade as it moves places, by
 * one move that sets the values it names (`window.shade` in `src/moves/window.ts`), the dim and the fade as strong as a
 * share from none to whole, the blur in pixels of a frame 1080 high; the window's edge and shadow keep as they stand.
 *
 * The window stands as an object does, placed in the world by a box and a stance (`src/domain/placement.ts`), and the
 * stage draws it by the matrix that places it there, as it draws an object: flat while it faces the frame, in 3D
 * only where it leans, so its projection is written once and a face-on window costs the graphics card no 3D layer in
 * an exposure. The window stands in the world, so the eye's focus blurs it, with all that lies in it, by where it
 * stands (`src/domain/focus.ts`): the flat stage as one, as soft as its point nearest the focus, and the room each
 * pixel of it by how far what it shows stands from the focus.
 *
 * In a room the window may have a body, which it holds as it holds its shade, set by a move of its own (`window.body`;
 * `src/props/body.ts`): a slab of metal round the page, as a tablet is made, its sides square to the page and its
 * corners as round as the page's grown by its rim, lit by the world's light (`src/props/lighting.ts`). It comes as the
 * window's edge and shadow do, as far as the window stands off the ground and the screen has come up in it, growing
 * thicker and its rim wider, where they grow darker; and it takes their place, as the slab is the window's edge, and a
 * shadow drawn on the window's plane would lie over its sides. The engine hands it as the window stands, in three's
 * axes, and the room stands it round the page in its one scene, where depth hides the page behind the slab or the slab
 * behind the page; the flat stage draws the window's edge and shadow in its place.
 */
import { type Cut, type Placing, type View, pictureReachOf } from '../domain/camera.ts';
import type { Eye } from '../domain/eye.ts';
import { type Sharpness, outOfFocusOnTheFrame, softestOutOfFocusSeen } from '../domain/focus.ts';
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
import { type Fraction, NONE, WHOLE } from '../domain/fraction.ts';
import { type Box, type Size, boxAround, frameScaleOf, middleX, middleY } from '../domain/geometry.ts';
import {
	type DrawnPlacement,
	ON_ITS_PLANE,
	type Placed,
	drawnPlacement,
	windowInTheWorld
} from '../domain/placement.ts';
import { type Transform, transformOf } from '../domain/stance.ts';
import {
	MOVES_AS_A_SHARE,
	MOVES_AS_PIXELS,
	type MovingBy,
	NO_PIXELS,
	namesOf,
	standsAtRest
} from '../domain/toward.ts';
import type { Slab } from './body.ts';
import type { Look } from './look.ts';
import type { WorldLook } from './world.ts';

export interface Shade {
	readonly dim: Fraction;
	readonly fade: Fraction;
	readonly blur: number;
}

export interface PageWindow extends Placing, Shade {
	readonly body: Slab;
}

/**
 * The window as the stage draws it: where it is placed in the world, as the stage draws a placement
 * (`src/domain/placement.ts`), its box on the frame, drawn about its middle, and the matrix the room stands the page by
 * in its one scene; how far the camera's picture reaches on its plane, past the box where the screen stands past it,
 * how far it stands off the ground, and whether the eye sees the page's side of it or its back, read where it stands
 * before the eye, behind the eye too; how round the corners of the page the camera's cut shows are, in the frame's
 * pixels, which the stylesheet cuts the page by and the body stands round; its shade, none where the page is shaded
 * none, and how soft the eye's focus draws it and all in it, none where sharp: as one, on the frame in pixels of a frame
 * 1080 high, for the flat stage, and at its softest point the frame shows, as far as the room's blur of it gathers past
 * the frame's edge; whether the page is seen through, faded by its shade or still coming up on the screen, so the room
 * draws it apart from what writes depth (`stage/see-through.js`); and its body, none where it has none.
 */
export interface DrawnWindow extends DrawnPlacement {
	readonly reach: Box;
	readonly lift: Fraction;
	readonly facingTheEye: boolean;
	readonly corner: number;
	readonly shade: Shade | null;
	readonly outOfFocus: number | null;
	readonly softestOutOfFocus: number | null;
	readonly seeThrough: boolean;
	readonly body: DrawnBody | null;
}

/**
 * The window's body as the room draws it round the page the camera's cut shows (`reach`), in the frame's pixels: how
 * far its rim reaches past the page and how thick it is; its metal's colour and how rough it is; how much of the
 * world's light the glass over the page reflects; the matrix that carries the page's middle, its face toward three's
 * z, into the eye's own space, in three's axes, the body standing behind its face, lit by the world's lights where the
 * scene's eye hands the room (`DrawnEye` in `src/domain/eye.ts`); and the slab's back as the stage draws a plane, as
 * the window's transform draws the page, its thickness behind it, where a page on the window's back lies.
 */
export interface DrawnBody {
	readonly rim: number;
	readonly thickness: number;
	readonly metal: string;
	readonly roughness: number;
	readonly glass: number;
	readonly placing: Matrix;
	readonly back: Transform;
}

/**
 * What stands round the window as it is drawn: the eye that sees it, the frame, how sharp the eye sees, how round the
 * look has the page's corners, which its body stands round, the world's light its glass reflects, and how far the
 * screen has come up in it.
 */
export interface AroundTheWindow {
	readonly eye: Eye;
	readonly frame: Size;
	readonly sharpness: Sharpness;
	readonly look: Pick<Look, 'paneCorner'>;
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
// The way out of the page's face, toward three's z, from its middle; and the slab's back, moved neither across nor
// down from the page
const A_UNIT_OUT: Spot = { across: 0, down: 0, out: 1 };
const UNMOVED = 0;
// A corner reaches at most half the page's shorter side, as CSS rounds a box no further
const HALVES = 2;

/**
 * The window as the stage draws it among what stands round it: standing as the camera's view, its picture cut as the
 * camera has it, seen from the eye, its corners rounding as it lifts, shaded as it is, as soft as the eye sees it, its
 * softest point the frame shows read over its box or as far as its picture reaches, and with its body.
 */
export function drawnWindow(
	view: View,
	cut: Cut,
	window: Omit<PageWindow, keyof Placing>,
	around: AroundTheWindow
): DrawnWindow {
	const { eye, frame, sharpness } = around;
	const standing = windowInTheWorld(view, eye, frame);
	const placing = standing.placing;
	const reach = pictureReachOf(view.box, cut);
	const roundest = Math.min(reach.width, reach.height) / HALVES;
	return {
		...drawnPlacement(standing),
		reach,
		lift: view.lift,
		facingTheEye: facesTheEye(standing.inTheEyesSpace),
		corner: Math.min(around.look.paneCorner * frameScaleOf(frame) * view.lift, roundest),
		shade: drawnShade(window),
		outOfFocus: outOfFocusOnTheFrame(placing, view.box, sharpness, frame),
		softestOutOfFocus: softestOutOfFocusSeen(placing, view.box, boxAround([view.box, reach]), sharpness, frame),
		// As clear as the stylesheet draws the screen, as far as it has come up and not faded
		seeThrough: around.screenShown * (WHOLE - window.fade) < WHOLE,
		body: drawnBody(view, reach, standing, window.body, around)
	};
}

/**
 * The window's body as the room draws it, round the page the camera's cut shows, placed by the matrix that carries the
 * window's middle into the eye's own space: as thick, its rim as wide and its glass as strong as the window's slab has
 * them, so far as the window stands off the ground and the screen has come up in it, so no glint comes with it at once,
 * its glass none where the world has no light to reflect; none, where that leaves it no thickness.
 */
function drawnBody(view: View, page: Box, window: Placed, slab: Slab, around: AroundTheWindow): DrawnBody | null {
	const scale = frameScaleOf(around.frame);
	const standing = view.lift * around.screenShown;
	const thickness = slab.thickness * scale * standing;
	if (thickness <= NO_THICKNESS) return null;
	const pageMiddle: Spot = {
		across: middleX(page) - middleX(view.box),
		down: middleY(page) - middleY(view.box),
		out: ON_ITS_PLANE
	};
	const placing = chained([window.inTheEyesSpace, translation(pageMiddle)]);
	const behind = translation({ across: UNMOVED, down: UNMOVED, out: -thickness });
	return {
		rim: slab.rim * scale * standing,
		thickness,
		metal: slab.metal,
		roughness: slab.roughness,
		glass: isLit(around.world) ? slab.glass * standing : NONE,
		placing: inThreesAxes(placing),
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
