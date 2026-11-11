/**
 * The page's window as a scene holds it: where it stands and how it stands, as the camera reads it (`Placing` in
 * `src/domain/camera.ts`), and how the page in it is shaded — dimmed, faded into the film's ground and blurred — so
 * what stands over it, a piece of the page lifted off, stands clear of it. A film moves the shade as it moves places,
 * by one move that sets the values it names (`window.shade` in `src/moves/window.ts`), the dim and the fade as strong
 * as a share from none to whole, the blur in pixels of a frame 1080 high; the window's edge and shadow keep as they
 * stand.
 * The blur may leave a part of the screen sharp, as a lens keeps sharp what the eye is drawn to: it is the page's own,
 * not the eye's, as the eye's lens blurs by depth and a page lies at one, and so what stands over the page, a title
 * carried with it or a piece lifted off it, stays as sharp as it stands wherever it stands over the blur. The part may
 * soften toward the blur by a share of its own while the page round it stays as soft as it is, as the claude-review
 * promo's page softens round a button lifted off the part it keeps sharp, as far as the button has risen: a share, not
 * pixels, so the part is never softer than the page round it, and it follows the blur as the blur moves.
 * The shade reaches the page alone, as livereel has it, so a film that fades one page over another keeps its slab
 * whole while the page goes; or the whole window, as the claude-review promo's lens softens and fades all of it but
 * what it keeps sharp: its fade and its blur then reach the window's body in a room, which blurs the page and its body
 * as one (`stage/body.js`), or its edge and shadow on the flat stage, as far as they reach the page, the dim staying
 * the dark laid over the screen. A choice, not a value with values between, so a move names it from its start, as it
 * names the part kept sharp.
 * One table, `SHADE_KINDS`, says of each value what a film may write for it and how it moves (`src/domain/values.ts`),
 * so a move's shade is checked by it and the window's moved by it, as the body's is by its own (`src/props/body.ts`).
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
import { type Matrix, type Spot, chained, inThreesAxes, longestScaleSeen, translation } from '../domain/matrix.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import { A_PIXELS, A_SHARE, OneOf } from '../domain/handed.ts';
import { type Box, type Size, boxAround, boxOf, frameScaleOf, middleX, middleY, withAir } from '../domain/geometry.ts';
import {
	type DrawnPlacement,
	ON_ITS_PLANE,
	type Placed,
	drawnPlacement,
	facesTheEye,
	windowInTheWorld
} from '../domain/placement.ts';
import { transformOf } from '../domain/stance.ts';
import { NO_PIXELS, amountToward, namesOf, shareToward, standsAtRest } from '../domain/toward.ts';
import { type KindsOf, ValueKind, asWritten } from '../domain/values.ts';
import type { Slab } from './body.ts';
import type { Look } from './look.ts';
import { type Screen, backPageSeen } from './screen.ts';
import type { WorldLook } from './world.ts';

/** How the page is shaded as the stage draws it: dimmed, faded and blurred. */
interface PageShade {
	readonly dim: Fraction;
	readonly fade: Fraction;
	readonly blur: number;
}

/**
 * The shade a film moves: the page's, and how far the part its blur leaves sharp softens toward the blur, from none,
 * wholly sharp, to whole, as soft as the page round it.
 */
export interface Shade extends PageShade {
	readonly sharpSoftens: Fraction;
}

/** The shade's values as a film writes them: every one a number. */
export type ShadeWritten = { readonly [Name in keyof Shade]: number };

// What the shade reaches: the page alone, or the whole window
const SHADE_REACHES = ['page', 'window'] as const;

/** What the shade reaches: the page alone, or the whole window, its body or its edge and shadow with the page. */
export type ShadeReach = (typeof SHADE_REACHES)[number];

export const A_SHADE_REACH = new OneOf(SHADE_REACHES, 'how far the shade reaches: "page" or "window"');

/** livereel's own reach of the shade: the page alone. */
export const LIVEREELS_REACH: ShadeReach = 'page';

// Where the shade's blur is as wide as written: on the page, so the frame shows it wider as it shows the page larger;
// or on the frame, as wide wherever the window and the eye stand
const BLUR_SEEN = ['on the page', 'on the frame'] as const;

/** Where the shade's blur is as wide as written: on the page, or on the frame. */
export type BlurSeen = (typeof BLUR_SEEN)[number];

export const A_BLUR_SEEN = new OneOf(
	BLUR_SEEN,
	'where the shade\'s blur is as wide as written: "on the page" or "on the frame"'
);

/** livereel's own blur of the shade: as wide as written on the page. */
export const LIVEREELS_BLUR_SEEN: BlurSeen = 'on the page';

/**
 * The window: where it stands, how it shades the page, the part of the screen its blur leaves sharp, how far its shade
 * reaches, where its blur is as wide as written, and its body.
 */
export interface PageWindow extends Placing, Shade {
	readonly sharp: Box | null;
	readonly reaching: ShadeReach;
	readonly blurSeen: BlurSeen;
	readonly body: Slab;
}

/**
 * The page's shade as the stage draws it: dimmed, faded, and blurred on the window's plane, and how far it reaches;
 * and how far a room blurs the page's picture apart, on the window's plane: by the blur, but none where the shade
 * blurs the window's body, as the room then blurs the page with its body as one, through the eye's lens
 * (`stage/body.js`): blurred apart, the page's outline stood sharp round a soft page.
 */
interface DrawnShade extends PageShade {
	readonly reaching: ShadeReach;
	readonly pictureBlur: number;
}

/**
 * The part of the screen the shade's blur leaves sharp as the stage draws it: its box, in the screen's pixels; how far
 * past it the page softens into the blur, and how far the part itself is blurred, none where it is wholly sharp, each
 * in pixels of a frame 1080 high, as the blur is; and the share of the page's blur it softens by, as a room's lens
 * blurs it where it blurs the page with the window's body.
 */
interface SharpPart {
	readonly box: Box;
	readonly edge: number;
	readonly blur: number | null;
	readonly softens: Fraction;
}

/**
 * The window as the stage draws it: where it is placed in the world, as the stage draws a placement
 * (`src/domain/placement.ts`), its box on the frame, drawn about its middle; how far the camera's picture reaches on
 * its plane, past the box where the page the screen shows stands past it, how far it stands off the ground, and
 * whether the eye sees the page's side of it or its back, read where it stands before the eye, behind the eye too; the
 * plane the room lays the page's surface on in its one scene; how round the corners of the page the camera's cut shows
 * are, in the frame's pixels, which the stylesheet cuts the page by and the body stands round; its shade and how far it
 * reaches, none where the page is shaded none, and the part of the screen its blur leaves sharp, none where it blurs
 * none or leaves none, the blur and the part's edge on the window's plane;
 * how soft the eye's focus draws it and all in it, none where sharp: as one, on the frame in pixels of a frame 1080
 * high, for the flat stage, and at its softest point the frame shows, as far as the room's blur of it gathers past the
 * frame's edge; how much of the page shows, from 0 to 1, as far as the screen has come up and its shade has not faded
 * it, which the stylesheet draws the screen as clear as, and the room reads whether the page is seen through by
 * (`stage/see-through.js`); how much of it has faded into what stands behind it, as far as the screen has come up and
 * its shade fades it, which the room lays in light (`stage/page-picture.js`); and its body, none where it has none.
 */
export interface DrawnWindow extends DrawnPlacement {
	readonly reach: Box;
	readonly lift: Fraction;
	readonly facingTheEye: boolean;
	readonly pageSurface: PlaneDrawn;
	readonly corner: number;
	readonly shade: DrawnShade | null;
	readonly sharp: SharpPart | null;
	readonly outOfFocus: number | null;
	readonly softestOutOfFocus: number | null;
	readonly pageShown: Fraction;
	readonly pageFaded: Fraction;
	readonly body: DrawnBody | null;
}

/**
 * A plane as the stage draws one, about the middle of the window's box: by the flat stage's matrix, and by the matrix
 * that carries a spot of it into the eye's own space, in three's axes. The page's surface lies on the window's own
 * plane, or, where the eye sees a page of the film's own on the window's back and the window has a body, on the slab's
 * back, its thickness behind.
 */
type PlaneDrawn = Pick<DrawnPlacement, 'transform' | 'inTheEyesSpace'>;

/**
 * The window's body as the room draws it round the page the camera's cut shows (`reach`), in the frame's pixels: how
 * far its rim reaches past the page and how thick it is; its metal's colour and how rough it is; how much of the
 * world's light the glass over the page reflects, and how bright the glint of its own near strip of light shines on it;
 * the matrix that carries the page's middle, its face toward three's z, into the eye's own space, in three's axes, the
 * body standing behind its face, lit by the world's lights where the scene's eye hands the room (`DrawnEye` in
 * `src/domain/eye.ts`); and how the window's shade reaches it, none where it reaches the page alone or neither fades
 * nor blurs.
 */
export interface DrawnBody {
	readonly rim: number;
	readonly thickness: number;
	readonly metal: string;
	readonly roughness: number;
	readonly glass: number;
	readonly glint: number;
	readonly placing: Matrix;
	readonly shade: BodyShade | null;
}

/**
 * The window's shade as it reaches its body: how far the body has faded into what stands behind it, as far as the page
 * has; how soft it is drawn, in pixels of a frame 1080 high as the shade's blur is written, and where it is as wide as
 * that: on the window's plane, which the room grows as the eye sees each point of the slab nearer, or on the frame, at
 * every point; and how soft at the softest the frame shows of the slab, as far as the room's blur of it gathers past
 * the frame's edge.
 */
export interface BodyShade {
	readonly fade: Fraction;
	readonly blur: number;
	readonly blurSeen: BlurSeen;
	readonly softestBlur: number;
}

/**
 * What stands round the window as it is drawn: the eye that sees it, the frame, how sharp the eye sees, how round the
 * look has the page's corners, which its body stands round, the world's light its glass reflects, and the screen: how
 * far it has come up in the window, and what the window's back shows.
 */
export interface AroundTheWindow {
	readonly eye: Eye;
	readonly frame: Size;
	readonly sharpness: Sharpness;
	readonly look: Pick<Look, 'paneCorner'>;
	readonly world: Pick<WorldLook, 'lights' | 'softBoxes'>;
	readonly screen: Pick<Screen, 'shown' | 'back'>;
}

export const UNSHADED: Shade = { dim: NONE, fade: NONE, blur: NO_PIXELS, sharpSoftens: NONE };

/**
 * The kind of each value of the shade, by its name: the dim, the fade and how far the part kept sharp softens, shares
 * held between none and whole, the blur pixels never below none, each between where it starts and ends however far
 * past its ends a curve takes it; the shares held as fractions, the blur as written.
 */
export const SHADE_KINDS: KindsOf<Shade, ShadeWritten> = {
	dim: new ValueKind(A_SHARE, fractionOf, shareToward),
	fade: new ValueKind(A_SHARE, fractionOf, shareToward),
	blur: new ValueKind(A_PIXELS, asWritten, amountToward),
	sharpSoftens: new ValueKind(A_SHARE, fractionOf, shareToward)
};

/** The names of the shade's values, in the order a refusal says them. */
export const SHADE_NAMES = namesOf(SHADE_KINDS);
// The names of the page's own shade, which the stage draws on the page as a whole; and of those that reach the
// window's body, where the shade reaches the window, the dim being the dark laid over the screen
const PAGE_SHADE_NAMES = ['dim', 'fade', 'blur'] as const satisfies readonly (keyof PageShade)[];
const BODY_SHADE_NAMES = ['fade', 'blur'] as const satisfies readonly (keyof PageShade)[];
// How many times as large a slab the frame shows none of is drawn: none, so its blur gathers nothing past the frame
const NOT_SEEN = 0;
// How many times as large a page the frame shows none of is taken to be drawn, its blur seen on the frame: once, so
// its blur on its plane stands as written till the frame shows some of it
const SEEN_AS_WRITTEN = 1;

// How far past the part the shade's blur leaves sharp the page softens into the blur, as a share of the blur: half, as
// the claude-review promo softens it, so a part whose edge lies between two rows of words is blurred whole before the
// next row's letters, and no row is sharp at one end and soft at the other
const SHARP_EDGE_PER_BLUR = 0.5;
// A body of no thickness, which is none
const NO_THICKNESS = 0;
// The slab's back, moved neither across nor down from the page
const UNMOVED = 0;
// A corner reaches at most half the page's shorter side, as CSS rounds a box no further
const HALVES = 2;

/**
 * The window as the stage draws it among what stands round it: standing as the camera's view, its picture cut as the
 * camera has it, seen from the eye, the page on the plane it lies on, its corners rounding as it lifts, shaded as it
 * is, its blur on its plane as the frame sees it where the film has it seen so, as soft as the eye sees it, its softest
 * point the frame shows read over its box or as far as its picture reaches, and with its body.
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
	const drawn = drawnPlacement(standing);
	const facingTheEye = facesTheEye(standing.inTheEyesSpace);
	const shadedOnItsPlane = blurredOnItsPlane(window, standing, reach, frame);
	const body = drawnBody(view, reach, standing, window, around);
	const onTheBack = body !== null && backPageSeen(around.screen.back, facingTheEye) !== null;
	const ownPlane = { transform: drawn.transform, inTheEyesSpace: drawn.inTheEyesSpace };
	return {
		...drawn,
		reach,
		lift: view.lift,
		facingTheEye,
		pageSurface: onTheBack ? behindItsPlane(standing, body.thickness) : ownPlane,
		corner: Math.min(around.look.paneCorner * frameScaleOf(frame) * view.lift, roundest),
		shade: drawnShade(shadedOnItsPlane, body),
		sharp: sharpPartDrawn(shadedOnItsPlane),
		outOfFocus: outOfFocusOnTheFrame(placing, view.box, sharpness, frame),
		softestOutOfFocus: softestOutOfFocusSeen(placing, view.box, boxAround([view.box, reach]), sharpness, frame),
		pageShown: fractionOf(around.screen.shown * (WHOLE - window.fade)),
		pageFaded: fractionOf(around.screen.shown * window.fade),
		body
	};
}

/**
 * The window's body as the room draws it, round the page the camera's cut shows, placed by the matrix that carries the
 * window's middle into the eye's own space: as thick, its rim as wide and its glass and glint as strong as the window's
 * slab has them, so far as the window stands off the ground and the screen has come up in it, so no glint comes with it
 * at once, its glass none where the world has no light to reflect, its glint its own light, and both faded as far as
 * the shade fades the body; shaded as the shade reaches it; none, where that leaves it no thickness.
 */
function drawnBody(
	view: View,
	page: Box,
	placed: Placed,
	window: Omit<PageWindow, keyof Placing>,
	around: AroundTheWindow
): DrawnBody | null {
	const slab = window.body;
	const scale = frameScaleOf(around.frame);
	const standing = view.lift * around.screen.shown;
	const thickness = slab.thickness * scale * standing;
	if (thickness <= NO_THICKNESS) return null;
	const pageMiddle: Spot = {
		across: middleX(page) - middleX(view.box),
		down: middleY(page) - middleY(view.box),
		out: ON_ITS_PLANE
	};
	const rim = slab.rim * scale * standing;
	const shade = bodyShaded(window, placed, withAir(page, rim), around.frame);
	const glass = isLit(around.world) ? slab.glass * standing : NONE;
	const unfaded = WHOLE - (shade?.fade ?? NONE);
	return {
		rim,
		thickness,
		metal: slab.metal,
		roughness: slab.roughness,
		glass: glass * unfaded,
		glint: slab.glint * standing * unfaded,
		placing: inThreesAxes(chained([placed.inTheEyesSpace, translation(pageMiddle)])),
		shade
	};
}

/**
 * The window's shade as it reaches the slab standing over a box of the window's plane: faded as the page, blurred by
 * the shade's blur as written, on the page or on the frame as the film has it seen; at its softest, the blur itself
 * where it is seen on the frame, and where it is seen on the page as many times the blur as the frame shows the slab
 * larger at its nearest part, none where the frame shows none of it; none where the shade reaches the page alone or
 * neither fades nor blurs.
 */
function bodyShaded(
	window: PageShade & Pick<PageWindow, 'reaching' | 'blurSeen'>,
	placed: Placed,
	slab: Box,
	frame: Size
): BodyShade | null {
	if (window.reaching !== 'window' || standsAtRest<PageShade>(window, UNSHADED, BODY_SHADE_NAMES)) return null;
	const softestBlur =
		window.blurSeen === 'on the frame'
			? window.blur
			: window.blur * (longestScaleSeen(placed.placing, placed.laid, slab, boxOf(frame)) ?? NOT_SEEN);
	return { fade: window.fade, blur: window.blur, blurSeen: window.blurSeen, softestBlur };
}

/**
 * The window with its shade's blur as wide on its plane as the stage blurs the page by: as written where the blur is
 * seen on the page; where it is seen on the frame, as many times narrower as the frame shows the page larger at its
 * nearest point the frame shows, so the blur is as wide as written there, and as written where the frame shows none of
 * it. One width for the whole page, as the flat stage and a picture blurred whole draw it: a page the eye sees aslant
 * is drawn softer on the frame where it stands farther; the room blurring the whole window draws each point as written.
 */
function blurredOnItsPlane<Shaded extends Pick<PageWindow, 'blur' | 'blurSeen'>>(
	window: Shaded,
	placed: Placed,
	page: Box,
	frame: Size
): Shaded {
	if (window.blurSeen === 'on the frame') {
		const largestSeen = longestScaleSeen(placed.placing, placed.laid, page, boxOf(frame)) ?? SEEN_AS_WRITTEN;
		return { ...window, blur: window.blur / largestSeen };
	}
	return window;
}

/** The plane so far behind the window's own, as the stage draws a plane: where the slab's back stands. */
function behindItsPlane(window: Placed, depth: number): PlaneDrawn {
	const behind = translation({ across: UNMOVED, down: UNMOVED, out: -depth });
	return {
		transform: transformOf(chained([window.stood, behind]), chained([window.placing, behind])),
		inTheEyesSpace: inThreesAxes(chained([window.inTheEyesSpace, behind]))
	};
}

/** Whether the world has light in it, a light or a soft box, which the glass could reflect. */
function isLit(world: Pick<WorldLook, 'lights' | 'softBoxes'>): boolean {
	return world.lights.length > NONE || world.softBoxes.length > NONE;
}

/**
 * The page's shade as the stage draws it, how far it reaches, and how far a room blurs the page's picture apart: as the
 * shade blurs the page, or none where it blurs the window's body; none where it is shaded none, so the stage draws no
 * filter, however far the part its blur would leave sharp softens.
 */
function drawnShade(window: PageShade & Pick<PageWindow, 'reaching'>, body: DrawnBody | null): DrawnShade | null {
	if (!shadesThePage(window)) return null;
	const { dim, fade, blur, reaching } = window;
	return { dim, fade, blur, reaching, pictureBlur: blursTheBody(body) ? NO_PIXELS : blur };
}

/** Whether the window's shade blurs its body, which a room blurs with the page through the eye's lens. */
function blursTheBody(body: DrawnBody | null): boolean {
	return body !== null && body.shade !== null && body.shade.blur > NO_PIXELS;
}

/** Whether the window shades the page at all: dims, fades or blurs it. */
export function shadesThePage(window: PageShade): boolean {
	return !standsAtRest(window, UNSHADED, PAGE_SHADE_NAMES);
}

/**
 * The part of the screen the shade's blur leaves sharp as the stage draws it, its edge softening over a share of the
 * blur, itself blurred by the share of the blur it softens by; none where the blur leaves none, or blurs none, as the
 * whole page is sharp then.
 */
function sharpPartDrawn(window: Pick<PageWindow, 'blur' | 'sharp' | 'sharpSoftens'>): SharpPart | null {
	if (window.sharp === null || window.blur <= NO_PIXELS) return null;
	const blur = window.blur * window.sharpSoftens;
	return {
		box: window.sharp,
		edge: window.blur * SHARP_EDGE_PER_BLUR,
		blur: blur > NO_PIXELS ? blur : null,
		softens: window.sharpSoftens
	};
}
