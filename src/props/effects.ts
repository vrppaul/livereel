/**
 * How an object stands out from what lies under it, apart from where it stands: a ring along its edge and a glow round
 * it in the look's accent, a shadow it casts toward its foot as though lifted off what lies under it, each as strong
 * as a share from none to whole, and how far it is blurred, in pixels of a frame 1080 high. A film moves them as it
 * moves places, with how large and how far out toward the eye the object stands where it stands
 * (`src/domain/stance.ts`), by one move that sets the values it names (`objectEffects` in `src/moves/object.ts`): a
 * block lifted off the page has no place a film knows, so only such a move grows it or brings it near where it is. An
 * object comes up standing out in no way.
 */
import { type Fraction, NONE } from '../domain/fraction.ts';
import type { Stance } from '../domain/stance.ts';
import {
	MOVES_AS_A_SHARE,
	MOVES_AS_PIXELS,
	MOVES_WITH_THE_CURVE,
	type MovingBy,
	NO_PIXELS,
	namesOf,
	standsAtRest
} from '../domain/toward.ts';

export interface Effects {
	readonly ring: Fraction;
	readonly glow: Fraction;
	readonly shadow: Fraction;
	readonly blur: number;
}

/** What a move of an object's effects sets: its effects, and how large and how far out toward the eye it stands. */
export type EffectsInPlace = Effects & Pick<Stance, 'scale' | 'depth'>;

export const NO_EFFECTS: Effects = { ring: NONE, glow: NONE, shadow: NONE, blur: NO_PIXELS };

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them; the scale and the depth with the curve, as a carry moves them
export const EFFECTS_IN_PLACE: MovingBy<EffectsInPlace> = {
	ring: MOVES_AS_A_SHARE,
	glow: MOVES_AS_A_SHARE,
	shadow: MOVES_AS_A_SHARE,
	blur: MOVES_AS_PIXELS,
	scale: MOVES_WITH_THE_CURVE,
	depth: MOVES_WITH_THE_CURVE
};

// The names of what a move of an object's effects may set, in the order a refusal says them, and of its effects
export const EFFECTS_IN_PLACE_NAMES = namesOf(EFFECTS_IN_PLACE);
const EFFECT_NAMES = namesOf(NO_EFFECTS);

/** An object's effects as the stage draws them; none where it stands out in no way, so the stage draws no filter. */
export function drawnEffects(object: Effects): Effects | null {
	if (standsAtRest(object, NO_EFFECTS, EFFECT_NAMES)) return null;
	return { ring: object.ring, glow: object.glow, shadow: object.shadow, blur: object.blur };
}
