/**
 * How a film counts its time, and how a move speeds up and settles.
 *
 * A film's time is its frames, so a wait for the page costs the film nothing. Every curve takes the share of time
 * gone and gives the share of the way gone, both from 0 to 1: a camera that eases in and out reads as a person's
 * hand, a linear one as a machine.
 */

export type Ease = (progress: number) => number;

export const FRAMES_PER_SECOND = 30;
// The half-way point of a curve that eases both in and out
const HALF_WAY = 0.5;
// A curve that eases both ways is drawn in two halves
const HALVES = 2;
// The powers the curves are drawn with
const CUBE = 3;
const FIFTH_POWER = 5;
// How steeply the cubic curve that eases both ways starts
const CUBIC_START = 4;
// A moment is said to a tenth of a second
const TENTHS = 1;

export function between(start: number, end: number, progress: number): number {
	return start + (end - start) * progress;
}

export function linear(progress: number): number {
	return progress;
}

export function easeOutCubic(progress: number): number {
	return 1 - (1 - progress) ** CUBE;
}

export function easeOutQuint(progress: number): number {
	return 1 - (1 - progress) ** FIFTH_POWER;
}

export function easeInOutSine(progress: number): number {
	return (1 - Math.cos(Math.PI * progress)) / HALVES;
}

export function easeInOutCubic(progress: number): number {
	if (progress < HALF_WAY) return CUBIC_START * progress ** CUBE;
	return 1 - (HALVES - HALVES * progress) ** CUBE / HALVES;
}

/** How many frames so many seconds take: the nearest count, and at least one. */
export function framesOf(seconds: number): number {
	return Math.max(1, shotAt(seconds));
}

/** The frame at a moment of the film: the nearest one. */
export function shotAt(moment: number): number {
	return Math.round(moment * FRAMES_PER_SECOND);
}

export function momentOf(shot: number): number {
	return shot / FRAMES_PER_SECOND;
}

/** A moment or a length of the film as a person reads it: seconds, to a tenth. */
export function secondsSaid(seconds: number): string {
	return seconds.toFixed(TENTHS);
}
