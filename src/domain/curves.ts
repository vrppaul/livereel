/**
 * How a move speeds up and settles: every curve a film's moves and steps take, livereel's and those a film makes of its
 * own numbers, and the kind a film's curve is checked by, in one place.
 *
 * Every curve takes the share of time gone, from 0 to 1, and gives the share of the way gone, from 0 at its start to 1
 * at its end, exactly at both: a camera that eases in and out reads as a person's hand, a linear one as a machine. One
 * that bounces passes its end on the way and comes back to it; how much of a prop has come up is held to its ends all
 * the same (`src/domain/fraction.ts`). A film makes its own by `cubicBezier`, `atSpeeds` or `softThenHeld`, each
 * checked as it is made, as a film's types are stripped.
 */
import { A_NUMBER, type Form, type Kind, Plain, aFunction, assertKind, assertWritten, needed } from './handed.ts';

/** A curve: the share of the way gone at a share of the time. */
export type Ease = (progress: number) => number;

/**
 * A stretch of the film's time a move goes over: the moment it begins, how many seconds it lasts, none for a move done
 * at once, as in a cut, and the curve the move goes along it on.
 */
export interface Stretch {
	readonly moment: number;
	readonly seconds: number;
	readonly ease: Ease;
}

/** How fast a move sets off and arrives, each in times its mean speed: 1 is as fast as an even move goes. */
export interface Speeds {
	readonly settingOff: number;
	readonly arriving: number;
}

/**
 * An end of a cubic Hermite curve: where its value stands there, and how fast it goes, so much of it over the curve's
 * whole time.
 */
export interface HermiteEnd {
	readonly value: number;
	readonly speed: number;
}

// A curve's start and end, by its own parameter and as shares of time and of the way; and its half-way point
const ITS_START = 0;
const ITS_END = 1;
const HALF_WAY = 0.5;
// A curve that eases both ways is drawn in two halves; a time is halved toward a share of it the same way
const HALVES = 2;
// The powers the curves are drawn with
const SQUARE = 2;
const CUBE = 3;
const FIFTH_POWER = 5;
// How steeply the cubic curve that eases both ways starts
const CUBIC_START = 4;
// Robert Penner's "back" constant, which takes the curve that bounces a tenth of the way past its end
const PENNERS_BACK = 1.70158;
// How many times the time a Bézier's handles leave either side of a share of time is halved to find it: down to the
// last bit a number holds, as its time runs on from its start to its end alone, its handles' times within its own
const HALVINGS = 52;
// The weights of a cubic's Bernstein form, in which a Bézier is drawn through its handles
const BERNSTEINS_WEIGHT = 3;
// The weights of a cubic Hermite curve's ends and speeds
const SPEEDS_SQUARE_WEIGHT = 2;
const ENDS_SQUARE_WEIGHT = 3;
const ENDS_CUBE_WEIGHT = 2;
// How fast a share of time grows by itself: the slope of the share in a Hermite weight, where it is differentiated
const TIMES_OWN_SLOPE = 1;
// The fastest a curve of speeds sets off or arrives, in times its mean speed: faster, it runs past its end or back
// before its start; and the slowest, at rest
export const FASTEST_SPEED = 3;
const AT_REST = 0;
// A sine's quarter turn, in which a soft start comes from rest to its fastest
const A_QUARTER_TURN = Math.PI / HALVES;

/** A curve as a film hands it: a function, livereel's or its own; what it gives is the film's. */
export const A_CURVE: Kind<Ease> = aFunction<Ease>('a curve: a function of progress, as easeInOutSine');

const A_HANDLES_SHARE = new Plain(isShareOfTime, 'a share of the time, from 0 to 1, as CSS takes it');
const A_SPEED = new Plain(
	isSpeed,
	'times the mean speed, from 0 to 3: faster, the curve runs past its end or back before its start'
);
const SPEEDS_FORM: Form<Speeds> = { settingOff: needed(A_SPEED), arriving: needed(A_SPEED) };
const A_TIME_WITHIN = new Plain(isWithinTheTime, 'a share of the time, more than 0 and at most 1');

export function linear(progress: number): number {
	return progress;
}

/** In slowly, gathering speed to the end, as a thing falls. */
export function easeInCubic(progress: number): number {
	return progress ** CUBE;
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

/** Out fast, past the end by a tenth of the way, and back to settle on it. */
export function easeOutBack(progress: number): number {
	const fromTheEnd = progress - 1;
	return 1 + (PENNERS_BACK + 1) * fromTheEnd ** CUBE + PENNERS_BACK * fromTheEnd ** SQUARE;
}

export function easeInOutCubic(progress: number): number {
	if (progress < HALF_WAY) return CUBIC_START * progress ** CUBE;
	return 1 - (HALVES - HALVES * progress) ** CUBE / HALVES;
}

/**
 * A curve drawn as CSS's `cubic-bezier(x1, y1, x2, y2)`: from the start to the end through two handles, each a share of
 * the time across and of the way up, the way up any number so a curve may pass its end.
 */
export function cubicBezier(firstTime: number, firstWay: number, secondTime: number, secondWay: number): Ease {
	assertKind(firstTime, A_HANDLES_SHARE, "cubicBezier's first handle's time");
	assertKind(firstWay, A_NUMBER, "cubicBezier's first handle's way");
	assertKind(secondTime, A_HANDLES_SHARE, "cubicBezier's second handle's time");
	assertKind(secondWay, A_NUMBER, "cubicBezier's second handle's way");
	return (progress) => bezierAt(parameterAt(progress, firstTime, secondTime), firstWay, secondWay);
}

/**
 * A curve that sets off and arrives at the speeds named, each in times its mean speed, smooth between: a cubic Hermite
 * curve. A move joins the one before at the speed it arrived at where it sets off at that speed in its own mean's
 * terms: the speed it arrived at, as how far it went a second, times this move's seconds over how far this one goes.
 */
export function atSpeeds(speeds: Speeds): Ease {
	assertWritten(speeds, SPEEDS_FORM, 'atSpeeds');
	const start = { value: ITS_START, speed: speeds.settingOff };
	const end = { value: ITS_END, speed: speeds.arriving };
	return (progress) => hermiteBetween(start, end, progress);
}

/**
 * A cubic Hermite curve between two ends at a share of its time, from 0 to 1: its value going smoothly from where it
 * stands at its start to where it stands at its end, as fast at each as that end names.
 */
export function hermiteBetween(start: HermiteEnd, end: HermiteEnd, progress: number): number {
	const squared = progress ** SQUARE;
	const cubed = progress ** CUBE;
	const towardTheEnd = ENDS_SQUARE_WEIGHT * squared - ENDS_CUBE_WEIGHT * cubed;
	return (
		(ITS_END - towardTheEnd) * start.value +
		(cubed - SPEEDS_SQUARE_WEIGHT * squared + progress) * start.speed +
		towardTheEnd * end.value +
		(cubed - squared) * end.speed
	);
}

/**
 * How fast a cubic Hermite curve between two ends goes at a share of its time: so much of its value over its whole
 * time, each of `hermiteBetween`'s weights differentiated by the power rule.
 */
export function hermiteSpeedBetween(start: HermiteEnd, end: HermiteEnd, progress: number): number {
	const squared = progress ** SQUARE;
	const towardTheEnd = SQUARE * ENDS_SQUARE_WEIGHT * progress - CUBE * ENDS_CUBE_WEIGHT * squared;
	return (
		towardTheEnd * (end.value - start.value) +
		(CUBE * squared - SQUARE * SPEEDS_SQUARE_WEIGHT * progress + TIMES_OWN_SLOPE) * start.speed +
		(CUBE * squared - SQUARE * progress) * end.speed
	);
}

/**
 * A curve that sets off softly, from rest, gathers speed as a sine does till a share of its time, its fastest, and
 * holds that speed to its end: π/2 over `fastestAt + π/2 × (1 − fastestAt)` times its mean speed, 1.17 at 0.4.
 */
export function softThenHeld(fastestAt: number): Ease {
	assertKind(fastestAt, A_TIME_WITHIN, "softThenHeld's fastestAt");
	return (progress) => softThenHeldAt(progress, fastestAt);
}

/**
 * Where a cubic Bézier's own parameter stands at a share of time: halved toward it from both ends, its time running on
 * from start to end alone while its handles' times stand within its own.
 */
function parameterAt(progress: number, firstTime: number, secondTime: number): number {
	let before = ITS_START;
	let after = ITS_END;
	for (let halving = 0; halving < HALVINGS; halving++) {
		const middle = (before + after) / HALVES;
		if (bezierAt(middle, firstTime, secondTime) < progress) before = middle;
		else after = middle;
	}
	return (before + after) / HALVES;
}

/** One coordinate of a cubic Bézier from 0 to 1 through two handles, at its own parameter: its Bernstein form. */
function bezierAt(along: number, first: number, second: number): number {
	const rest = ITS_END - along;
	return (
		BERNSTEINS_WEIGHT * rest ** SQUARE * along * first +
		BERNSTEINS_WEIGHT * rest * along ** SQUARE * second +
		along ** CUBE
	);
}

/**
 * The share of the way a curve soft then held has gone at a share of time: a sine's quarter from rest to its fastest at
 * `fastestAt`, then that speed held, the two scaled so it ends at the end; the held part measured back from the end, so
 * it stands there exactly.
 */
function softThenHeldAt(progress: number, fastestAt: number): number {
	const fastest = A_QUARTER_TURN / fastestAt;
	const scale = ITS_END / (ITS_END + fastest * (ITS_END - fastestAt));
	if (progress <= fastestAt) return scale * (ITS_END - Math.cos((A_QUARTER_TURN * progress) / fastestAt));
	return ITS_END - scale * fastest * (ITS_END - progress);
}

function isShareOfTime(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= ITS_START && written <= ITS_END;
}

function isSpeed(written: unknown): written is number {
	return A_NUMBER.is(written) && written >= AT_REST && written <= FASTEST_SPEED;
}

function isWithinTheTime(written: unknown): written is number {
	return A_NUMBER.is(written) && written > ITS_START && written <= ITS_END;
}
