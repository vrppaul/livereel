/**
 * How an object stands out from what lies under it, apart from where it stands: a ring along its edge and a glow round
 * it, a shadow it casts toward its foot as though lifted off what lies under it, each as strong as a share from none to
 * whole, and how far it is blurred, in pixels of a frame 1080 high. The ring and the glow are drawn in the look's
 * accent as it stands, until the film names a colour of their own, which they go to from the colour they were seen in,
 * the accent's as it stood where they had none. It may melt into nothing toward a side of what it shows, from as far
 * in as a share of it, its shadow and glow following what is left, as they follow its shape; the side is kept while it
 * melts, and the melt is drawn apart from its filter, so one that only melts draws none. It may fade whole into what
 * lies behind it, a share from none to whole, as the window's shade fades the page into the film's ground, so a piece
 * lifted off a faded page comes up as faded as the page and clears as it rises; the fade is drawn apart from its filter
 * too, as how clear the object is. A film moves them as it moves places, with how large and how far out toward the eye
 * the object stands where it stands (`src/domain/stance.ts`), by one move that sets the values it names
 * (`objectEffects` in `src/moves/object.ts`): a block lifted off the page has no place a film knows, so only such a
 * move grows it or brings it near where it is. An object comes up standing out as its show names, so it comes soft or
 * faded from its first frame, and in no way, in the accent, melting none and unfaded, where its show names nothing.
 */
import { colourToward } from '../domain/colour.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import type { FrameSide } from '../domain/geometry.ts';
import type { Stance } from '../domain/stance.ts';
import {
	MOVES_AS_A_SHARE,
	MOVES_AS_PIXELS,
	MOVES_WITH_THE_CURVE,
	type MovingBy,
	NO_PIXELS,
	namesOf,
	shareToward,
	standsAtRest
} from '../domain/toward.ts';

/** How strongly an object stands out each way, and how far it is blurred. */
interface StandingOut {
	readonly ring: Fraction;
	readonly glow: Fraction;
	readonly shadow: Fraction;
	readonly blur: number;
}

/**
 * How far in from a side of what an object shows it melts into nothing at that side, a share of it, and the side:
 * none before a film names one.
 */
interface Melt {
	readonly toward: FrameSide | null;
	readonly share: Fraction;
}

/** A melt toward a side, as a film names it and the stage draws it. */
export interface Melting extends Melt {
	readonly toward: FrameSide;
}

/**
 * How an object stands out; the colour of its ring and glow, one of the film's own, or none, the look's accent; how it
 * melts toward a side of what it shows; and how far it has faded into what lies behind it.
 */
export interface Effects extends StandingOut {
	readonly colour: string | null;
	readonly melt: Melt;
	readonly fade: Fraction;
}

/**
 * What a move of an object's effects sets: how it stands out; the colour of its ring and glow, which moves from the
 * one they stand in, the accent's as it stands where they have none of their own; how it melts and fades; and how
 * large and how far out toward the eye it stands.
 */
export type EffectsInPlace = StandingOut & { readonly colour: string } & Pick<Effects, 'melt' | 'fade'> &
	Pick<Stance, 'scale' | 'depth'>;

/** An object's effects as the stage draws them, its filter's: how it stands out, and the colour of its ring and glow. */
export type DrawnEffects = Omit<Effects, 'melt' | 'fade'>;

// An object standing out in no way, the colour of its ring and glow where the film names none, the accent's, an object
// melting none, toward no side yet, and one faded none
const IN_NO_WAY: StandingOut = { ring: NONE, glow: NONE, shadow: NONE, blur: NO_PIXELS };
const IN_THE_ACCENT = null;
const NO_MELT: Melt = { toward: null, share: NONE };
export const NO_EFFECTS: Effects = { ...IN_NO_WAY, colour: IN_THE_ACCENT, melt: NO_MELT, fade: NONE };
// How far along its way a move stands as it begins
const NOT_ON_ITS_WAY = 0;

// How each moves: a share between none and whole and a blur between where it starts and ends, however far past its
// ends a curve takes them; the colour through the colours between; a melt as a share, toward the side it goes to; a
// fade as a share; the scale and the depth with the curve, as a carry moves them
export const EFFECTS_IN_PLACE: MovingBy<EffectsInPlace> = {
	ring: MOVES_AS_A_SHARE,
	glow: MOVES_AS_A_SHARE,
	shadow: MOVES_AS_A_SHARE,
	blur: MOVES_AS_PIXELS,
	colour: { toward: colourToward },
	melt: { toward: meltToward },
	fade: MOVES_AS_A_SHARE,
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
export function drawnEffects(object: Effects): DrawnEffects | null {
	if (standsAtRest(object, IN_NO_WAY, STANDING_OUT_NAMES)) return null;
	return { ring: object.ring, glow: object.glow, shadow: object.shadow, blur: object.blur, colour: object.colour };
}

/** How clear an object is as far as it has not faded, from 0 faded whole to 1 unfaded. */
export function unfaded(object: Pick<Effects, 'fade'>): Fraction {
	return fractionOf(WHOLE - object.fade);
}

/** How an object melts as the stage draws it; none where it melts none, so the stage lays no mask. */
export function drawnMelt(object: Effects): Melting | null {
	const { toward, share } = object.melt;
	if (share === NONE || toward === null) return null;
	return { toward, share };
}

/**
 * A melt `progress` of its way: its share as a share goes, and its side the one it goes to once on its way, as a melt
 * turned to another side while it shows is refused as its move begins.
 */
function meltToward(start: Melt, end: Melt, progress: number): Melt {
	return {
		toward: progress > NOT_ON_ITS_WAY ? end.toward : start.toward,
		share: shareToward(start.share, end.share, progress)
	};
}
