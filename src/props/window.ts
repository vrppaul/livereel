/**
 * The page's window as a scene holds it: where it stands and how it leans, as the camera reads it (`Placing` in
 * `src/domain/camera.ts`), and how the page in it is shaded — dimmed, faded into the film's ground and blurred — so
 * what stands over it, a piece of the page lifted off, stands clear of it. A film moves the shade as it moves places, by
 * one move that sets the values it names (`window.shade` in `src/moves/window.ts`), the dim and the fade as strong as a
 * share from none to whole, the blur in pixels of a frame 1080 high; the window's edge and shadow keep as they stand.
 *
 * The stage draws the window by the matrix the engine sees its points through (`leaningOnTheFrame`), as it draws an
 * object (`src/domain/stance.ts`): flat while it faces the frame, in 3D only where it leans, so its projection is
 * written once and a face-on window costs the graphics card no 3D layer in an exposure.
 */
import { type Placing, type View, angledAs, leaningOnTheFrame } from '../domain/camera.ts';
import { type Eye, turnOf } from '../domain/eye.ts';
import { chained } from '../domain/matrix.ts';
import { type Fraction, NONE } from '../domain/fraction.ts';
import type { Box, Size } from '../domain/geometry.ts';
import { type Transform, transformOf } from '../domain/stance.ts';
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
 * The window as the stage draws it: its box on the frame, how far it stands off the ground, how it is drawn about its
 * box's middle, leant as it is and seen from the eye, and its shade; none where the page is shaded none.
 */
export interface DrawnWindow {
	readonly box: Box;
	readonly lift: Fraction;
	readonly transform: Transform;
	readonly shade: Shade | null;
}

export const UNSHADED: Shade = { dim: NONE, fade: NONE, blur: NO_PIXELS };

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them
export const SHADING: MovingBy<Shade> = { dim: MOVES_AS_A_SHARE, fade: MOVES_AS_A_SHARE, blur: MOVES_AS_PIXELS };

// The names of the shade's values, in the order a refusal says them
export const SHADE_NAMES = namesOf(SHADING);

/**
 * The window as the stage draws it on a frame of this size: standing as the camera's view, seen from the eye, shaded
 * as it is.
 */
export function drawnWindow(view: View, eye: Eye, window: Shade, frame: Size): DrawnWindow {
	return {
		box: view.box,
		lift: view.lift,
		transform: transformOf(chained([turnOf(eye), angledAs(view.angle)]), leaningOnTheFrame(view, eye, frame)),
		shade: drawnShade(window)
	};
}

/** The page's shade as the stage draws it; none where it is shaded none, so the stage draws no filter. */
function drawnShade(window: Shade): Shade | null {
	if (standsAtRest(window, UNSHADED, SHADE_NAMES)) return null;
	return { dim: window.dim, fade: window.fade, blur: window.blur };
}
