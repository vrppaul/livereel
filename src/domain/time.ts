/**
 * How a film counts its time: its frames, so a wait for the page costs the film nothing; how many make a second is the
 * film's own, so a frame is counted at its rate. How a move goes over that time is its curve's
 * (`src/domain/curves.ts`).
 */

// A second in thousandths, the unit timers and delays are counted in
export const MILLISECONDS_A_SECOND = 1000;
// A moment is said to a tenth of a second: one digit after the point
const DIGITS_TO_A_TENTH = 1;

/** How many frames so many seconds take at a film's rate: the nearest count, and at least one. */
export function framesOf(seconds: number, framesPerSecond: number): number {
	return Math.max(1, shotAt(seconds, framesPerSecond));
}

/** The frame at a moment of a film at its rate: the nearest one. */
export function shotAt(moment: number, framesPerSecond: number): number {
	return Math.round(moment * framesPerSecond);
}

export function momentOf(shot: number, framesPerSecond: number): number {
	return shot / framesPerSecond;
}

/** A moment or a length of the film as a person reads it: seconds, to a tenth. */
export function secondsSaid(seconds: number): string {
	return seconds.toFixed(DIGITS_TO_A_TENTH);
}
