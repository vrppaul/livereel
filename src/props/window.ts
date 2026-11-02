/**
 * The page's window as a scene holds it: where it stands and how it leans, as the camera reads it (`Placing` in
 * `src/domain/camera.ts`), and how the page in it is shaded — dimmed, faded into the film's ground and blurred — so
 * what stands over it, a piece of the page lifted off, stands clear of it. A film moves the shade as it moves places, by
 * one move that sets the values it names (`window.shade` in `src/moves/window.ts`), the dim and the fade as strong as a
 * share from none to whole, the blur in pixels of a frame 1080 high; the window's edge and shadow keep as they stand.
 */
import type { Placing, View } from '../domain/camera.ts';
import { type Fraction, NONE } from '../domain/fraction.ts';
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

/** The window as the stage draws it: as the camera shows it, and its shade; none where the page is shaded none. */
export interface DrawnWindow extends View {
	readonly shade: Shade | null;
}

export const UNSHADED: Shade = { dim: NONE, fade: NONE, blur: NO_PIXELS };

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them
export const SHADING: MovingBy<Shade> = { dim: MOVES_AS_A_SHARE, fade: MOVES_AS_A_SHARE, blur: MOVES_AS_PIXELS };

// The names of the shade's values, in the order a refusal says them
export const SHADE_NAMES = namesOf(SHADING);

/** The page's shade as the stage draws it; none where it is shaded none, so the stage draws no filter. */
export function drawnShade(window: Shade): Shade | null {
	if (standsAtRest(window, UNSHADED, SHADE_NAMES)) return null;
	return { dim: window.dim, fade: window.fade, blur: window.blur };
}
