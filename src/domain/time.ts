/**
 * How a film counts its time, and how a move speeds up and settles.
 *
 * A film's time is its frames, so a wait for the page costs the film nothing. Every curve takes the share of time
 * gone and gives the share of the way gone, both from 0 to 1: a camera that eases in and out reads as a person's
 * hand, a linear one as a machine.
 */
import { FilmError } from './errors.ts';

export type Ease = (progress: number) => number;

export const FRAMES_PER_SECOND = 30;
// The half-way point of a curve that eases both in and out, and of a frame a moment falls between
const HALF_WAY = 0.5;
// Every other whole number is even
const EVERY_OTHER = 2;
// The powers the curves are drawn with
const CUBE = 3;
const FIFTH_POWER = 5;
// How steeply the cubic curve that eases both ways starts, and where its second half is drawn from
const CUBIC_START = 4;
const CUBIC_SECOND_HALF = 2;

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
	return (1 - Math.cos(Math.PI * progress)) / EVERY_OTHER;
}

export function easeInOutCubic(progress: number): number {
	if (progress < HALF_WAY) return CUBIC_START * progress ** CUBE;
	return 1 - (CUBIC_SECOND_HALF - CUBIC_SECOND_HALF * progress) ** CUBE / EVERY_OTHER;
}

/** How many frames so many seconds take, at least one; a half frame goes to the even count, as Python counted. */
export function framesOf(seconds: number): number {
	return Math.max(1, shotAt(seconds));
}

/** The frame at a moment of the film: a moment half-way between two frames is the even one's. */
export function shotAt(moment: number): number {
	const frames = moment * FRAMES_PER_SECOND;
	const whole = Math.floor(frames);
	if (frames - whole !== HALF_WAY) return Math.round(frames);
	return whole % EVERY_OTHER === 0 ? whole : whole + 1;
}

export function momentOf(shot: number): number {
	return shot / FRAMES_PER_SECOND;
}

/** Where a share of a step starts and ends, each a share of the step from 0 to 1; either may be left to its edge. */
export interface Bounds {
	readonly start?: number;
	readonly end?: number;
}

/** The part of its step a move takes: from `start` to `end`, each a share of the step. */
export class Share {
	readonly start: number;
	readonly end: number;

	private constructor(start: number, end: number) {
		this.start = start;
		this.end = end;
	}

	/** The share between these bounds; one that takes no time, or reaches past its step, is refused. */
	static of(bounds: Bounds = {}): Share {
		const start = bounds.start ?? 0;
		const end = bounds.end ?? 1;
		if (!(start >= 0 && end <= 1 && start < end)) {
			throw new FilmError(`a move's share runs from ${start} to ${end} of its step: it must start before it ends`);
		}
		return new Share(start, end);
	}

	/** How far along the move is when its step is `progress` along: none before its start, all after its end. */
	along(progress: number): number {
		return Math.min(1, Math.max(0, (progress - this.start) / (this.end - this.start)));
	}

	/** Whether two shares are taken at once at some moment; one that ends as the other starts is not. */
	overlaps(other: Share): boolean {
		return this.start < other.end && other.start < this.end;
	}
}
