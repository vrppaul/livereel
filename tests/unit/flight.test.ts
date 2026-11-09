// A flight's way and gaze, worked out alone: how legs join, how a heading turns, how an eye at rest is read
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { eyeAtRest } from '../../src/domain/eye.ts';
import { type Flight, type Leg, type Way, flownAt, gazeOf, wayOf } from '../../src/domain/flight.ts';
import { FOCAL_LENGTH } from './fakes.ts';

const SETTING_OFF = { across: 0, down: 0, out: 1000 };
// Two legs that turn a right angle at the first one's end
const TURNING: readonly Leg[] = [
	{ kind: 'to', to: { across: 500, down: 0, out: 1000 } },
	{ kind: 'to', to: { across: 500, down: 500, out: 1000 } }
];
// How far either side of the first leg's end the way's heading is read, as a share of its length
const ASIDE = 0.001;
// How many steps of a way are read for its lowest point
const STEPS = 400;
// A frame 1080 high, as a flight's tip reads one
const THE_EYE = { focalLength: FOCAL_LENGTH, frameHeight: 1080 };
// Looking straight down, its top up the page
const STRAIGHT_DOWN = { kind: 'degrees', degrees: -90 } as const;

/** How near a way's heading just before its first leg's end points along its heading just after: 1 for one way. */
function headingKeptThrough(way: Way): number {
	const turnsAt = way.legsEnd[0]!;
	return way.curve.getTangentAt(turnsAt - ASIDE).dot(way.curve.getTangentAt(turnsAt + ASIDE));
}

/** The lowest a way goes over the page. */
function lowestOf(way: Way): number {
	return Math.min(...[...Array(STEPS + 1).keys()].map((step) => way.curve.getPoint(step / STEPS).z));
}

/** A flight along a way, heading as its keys say, looking straight down all the way. */
function flightAlong(way: Way, heading: Flight['heading']): Flight {
	return { way, heading, tip: [{ share: 0, rule: STRAIGHT_DOWN }], roll: 0, eye: THE_EYE };
}

test("a smooth way passes a leg's end heading on through it, where a straight one turns there at a corner", () => {
	expect([
		headingKeptThrough(wayOf(SETTING_OFF, TURNING, 'smooth', 'eye.fly')),
		headingKeptThrough(wayOf(SETTING_OFF, TURNING, 'straight', 'eye.fly'))
	]).toEqual([expect.closeTo(1, 2), expect.closeTo(0, 2)]);
});

test('a leg that bends after another leaves heading as that one arrived, with no corner', () => {
	const bending: readonly Leg[] = [
		{ kind: 'to', to: { across: 500, down: 0, out: 1000 } },
		{ kind: 'bending', to: { across: 500, down: 800, out: 1000 }, arriving: 90, bend: 0.5 }
	];
	expect(headingKeptThrough(wayOf(SETTING_OFF, bending, 'straight', 'eye.fly'))).toBeCloseTo(1, 2);
});

test('a smooth way that sinks to a point and runs on level never goes below it, where a Catmull-Rom curve dips under the page', () => {
	const sinkingThenRunning: readonly Leg[] = [
		{ kind: 'to', to: { across: 500, down: 0, out: 40 } },
		{ kind: 'to', to: { across: 1500, down: 0, out: 40 } }
	];
	expect(lowestOf(wayOf({ across: 0, down: 0, out: 2540 }, sinkingThenRunning, 'smooth', 'eye.fly'))).toBeCloseTo(40);
});

test('a way that reaches the page is refused, as one that goes on ahead as it sinks', () => {
	const sinkingOn: readonly Leg[] = [
		{ kind: 'to', to: { across: 0, down: 0, out: 100 } },
		{ kind: 'ahead', times: 2 }
	];
	expect(() => wayOf(SETTING_OFF, sinkingOn, 'smooth', 'eye.fly')).toThrow(
		new FilmError("eye.fly's way reaches the page about 37% along: fly it higher, or join its legs straight")
	);
});

test('a heading turns the short way round: from 350° to 10°, half way it heads up the page, the top of an eye looking down pointing up it', () => {
	const way = wayOf(SETTING_OFF, [TURNING[0]!], 'straight', 'eye.fly');
	const flight = flightAlong(way, [
		{ share: 0, rule: { kind: 'degrees', degrees: 350 } },
		{ share: 1, rule: { kind: 'degrees', degrees: 10 } }
	]);
	const top = flownAt(flight, 0.5).up;
	expect([top.across, top.down]).toEqual([expect.closeTo(0), expect.closeTo(-1)]);
});

test('a heading along the way turns the top of an eye looking down the way it flies', () => {
	const way = wayOf(SETTING_OFF, [TURNING[0]!], 'straight', 'eye.fly');
	const top = flownAt(flightAlong(way, [{ share: 0, rule: { kind: 'along' } }]), 0.5).up;
	expect([top.across, top.down]).toEqual([expect.closeTo(1), expect.closeTo(0)]);
});

test('the eye at rest, read as it rides a window standing whole and face-on, heads up the page looking straight down onto it, unrolled', () => {
	expect(gazeOf(eyeAtRest(FOCAL_LENGTH))).toEqual({
		heading: expect.closeTo(0),
		tip: expect.closeTo(-90),
		roll: expect.closeTo(0)
	});
});
