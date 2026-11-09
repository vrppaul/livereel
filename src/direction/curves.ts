/**
 * Curves a film makes of its own numbers, for a move's `ease` or a step's: one drawn as CSS draws `cubic-bezier()`, as
 * a designer's tool hands it; one that sets off and arrives at the speeds the film names, each in times its mean speed;
 * and one that sets off softly and holds its speed from a share of its time on, as a flight that dives and runs on
 * along a page does. Each is checked as it is made, as a film's types are stripped, and gives the share of the way gone
 * at a share of the time, read from 0 to 1 alone, exactly 0 and 1 at its ends, as livereel's curves are
 * (`src/domain/time.ts`).
 */
import { A_NUMBER, type Form, Plain, assertKind, assertWritten, needed } from '../domain/handed.ts';
import type { Ease } from '../domain/time.ts';

/** How fast a move sets off and arrives, each in times its mean speed: 1 is as fast as an even move goes. */
export interface Speeds {
	readonly settingOff: number;
	readonly arriving: number;
}

// How many times the time a Bézier's handles leave either side of a share of time is halved to find it: down to the
// last bit a number holds, as its time runs on from its start to its end alone, its handles' times within its own
const HALVINGS = 52;
// A curve's start and end, by its own parameter and as shares of time and of the way
const ITS_START = 0;
const ITS_END = 1;
// A cubic's powers, and the weights of its Bernstein form, in which a Bézier is drawn through its handles
const SQUARE = 2;
const CUBE = 3;
const BERNSTEINS_WEIGHT = 3;
// The weights of a cubic Hermite curve of its two speeds
const SPEEDS_SQUARE_WEIGHT = 2;
const ENDS_SQUARE_WEIGHT = 3;
const ENDS_CUBE_WEIGHT = 2;
// The fastest a curve of speeds sets off or arrives, in times its mean speed: faster, it runs past its end or back
// before its start; and the slowest, at rest
const FASTEST_SPEED = 3;
const AT_REST = 0;
// The time either side of a share of time is halved by; and a sine's quarter turn, in which a soft start comes from
// rest to its fastest
const HALVES = 2;
const A_QUARTER_TURN = Math.PI / HALVES;

const A_HANDLES_SHARE = new Plain(isShareOfTime, 'a share of the time, from 0 to 1, as CSS takes it');
const A_SPEED = new Plain(
	isSpeed,
	'times the mean speed, from 0 to 3: faster, the curve runs past its end or back before its start'
);
const SPEEDS_FORM: Form<Speeds> = { settingOff: needed(A_SPEED), arriving: needed(A_SPEED) };
const A_TIME_WITHIN = new Plain(isWithinTheTime, 'a share of the time, more than 0 and at most 1');

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
export function hermite(speeds: Speeds): Ease {
	assertWritten(speeds, SPEEDS_FORM, 'hermite');
	const { settingOff, arriving } = speeds;
	return (progress) => hermiteAt(progress, settingOff, arriving);
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

/** A cubic Hermite curve from 0 to 1, setting off and arriving at its speeds, at a share of time. */
function hermiteAt(progress: number, settingOff: number, arriving: number): number {
	const squared = progress ** SQUARE;
	const cubed = progress ** CUBE;
	return (
		(cubed - SPEEDS_SQUARE_WEIGHT * squared + progress) * settingOff +
		(ENDS_SQUARE_WEIGHT * squared - ENDS_CUBE_WEIGHT * cubed) +
		(cubed - squared) * arriving
	);
}

/**
 * The share of the way a curve soft then held has gone at a share of time: a sine's quarter from rest to its fastest
 * at `fastestAt`, then that speed held, the two scaled so it ends at the end; the held part measured back from the end,
 * so it stands there exactly.
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
