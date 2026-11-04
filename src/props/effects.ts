/**
 * How an object stands out from what lies under it, apart from where it stands: a ring along its edge and a glow round
 * it, a shadow it casts toward its foot as though lifted off what lies under it, each as strong as a share from none to
 * whole, and how far it is blurred, in pixels of a frame 1080 high. The ring and the glow are drawn in the look's
 * accent as it stands, until the film names a colour of their own, which they go to from the colour they stood in, the
 * accent's as it stood where they had none. A film moves them as it moves places, with how large and how far out
 * toward the eye the object stands where it stands (`src/domain/stance.ts`), by one move that sets the values it names
 * (`objectEffects` in `src/moves/object.ts`): a block lifted off the page has no place a film knows, so only such a
 * move grows it or brings it near where it is. An object comes up standing out in no way, in the accent.
 */
import { colourToward } from '../domain/colour.ts';
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

/** How strongly an object stands out each way, and how far it is blurred. */
interface StandingOut {
	readonly ring: Fraction;
	readonly glow: Fraction;
	readonly shadow: Fraction;
	readonly blur: number;
}

/** How an object stands out, and the colour of its ring and glow: one of the film's own, or none, the look's accent. */
export interface Effects extends StandingOut {
	readonly colour: string | null;
}

/**
 * What a move of an object's effects sets: how it stands out; the colour of its ring and glow, which moves from the
 * one they stand in, the accent's as it stands where they have none of their own; and how large and how far out toward
 * the eye it stands.
 */
export type EffectsInPlace = StandingOut & { readonly colour: string } & Pick<Stance, 'scale' | 'depth'>;

// An object standing out in no way, and the colour of its ring and glow where the film names none: the accent's
const IN_NO_WAY: StandingOut = { ring: NONE, glow: NONE, shadow: NONE, blur: NO_PIXELS };
const IN_THE_ACCENT = null;
export const NO_EFFECTS: Effects = { ...IN_NO_WAY, colour: IN_THE_ACCENT };

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them; the colour through the colours between; the scale and the depth with the curve, as a carry
// moves them
export const EFFECTS_IN_PLACE: MovingBy<EffectsInPlace> = {
	ring: MOVES_AS_A_SHARE,
	glow: MOVES_AS_A_SHARE,
	shadow: MOVES_AS_A_SHARE,
	blur: MOVES_AS_PIXELS,
	colour: { toward: colourToward },
	scale: MOVES_WITH_THE_CURVE,
	depth: MOVES_WITH_THE_CURVE
};

// The names of what a move of an object's effects may set, in the order a refusal says them, and of how an object
// stands out, which its colour alone does not make it
export const EFFECTS_IN_PLACE_NAMES = namesOf(EFFECTS_IN_PLACE);
const STANDING_OUT_NAMES = namesOf(IN_NO_WAY);

/**
 * An object's effects as the stage draws them; none where it stands out in no way, whatever their colour, so the stage
 * draws no filter.
 */
export function drawnEffects(object: Effects): Effects | null {
	if (standsAtRest(object, IN_NO_WAY, STANDING_OUT_NAMES)) return null;
	return { ring: object.ring, glow: object.glow, shadow: object.shadow, blur: object.blur, colour: object.colour };
}
