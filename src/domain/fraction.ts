/**
 * How much of something there is, from none to whole: how far a prop has come up and how far it has gone, how strongly
 * the light dims, how far the cursor is pressed in.
 *
 * A move sets one from how far along its curve it is, and a curve may pass its ends on its way, as one that bounces
 * does. A place or an angle set from such a curve passes them with it; how much of something there is never does. So a
 * fraction is a type of its own that `fractionOf` alone makes, holding it to none and whole, and the compiler refuses a
 * prop's presence set straight from a move's progress.
 */

declare const FRACTION: unique symbol;

/** A number from none to whole, which `fractionOf` alone makes. */
export type Fraction = number & { readonly [FRACTION]: true };

// None of it, and all of it
const NOTHING = 0;
const ALL = 1;

/** An amount held to none and whole: the nearer of them where it lies past one. */
export function fractionOf(amount: number): Fraction {
	// The one place a number is taken for a fraction: it has just been held to none and whole
	return Math.min(ALL, Math.max(NOTHING, amount)) as Fraction;
}

export const NONE: Fraction = fractionOf(NOTHING);
export const WHOLE: Fraction = fractionOf(ALL);
