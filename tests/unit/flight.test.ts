// A flight's way and gaze, worked out alone: how legs join, how a heading turns, how an eye at rest is read
import { CatmullRomCurve3, EllipseCurve, LineCurve3, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { eyeAtRest } from '../../src/domain/eye.ts';
import { EVENLY, type Flight, type Leg, type Way, flownAt, gazeOf, paceOf, wayOf } from '../../src/domain/flight.ts';
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
const UP_THE_PAGE = { kind: 'degrees', degrees: 0 } as const;
// Two legs straight across, a long one and a short one after it
const LONG_THEN_SHORT: readonly Leg[] = [
	{ kind: 'to', to: { across: 1000, down: 0, out: 1000 } },
	{ kind: 'to', to: { across: 1100, down: 0, out: 1000 } }
];

/** How near a way's heading just before its first leg's end points along its heading just after: 1 for one way. */
function headingKeptThrough(way: Way): number {
	const turnsAt = way.legsEnd[0]!;
	return way.curve.getTangentAt(turnsAt - ASIDE).dot(way.curve.getTangentAt(turnsAt + ASIDE));
}

/** The lowest a way goes over the page. */
function lowestOf(way: Way): number {
	return Math.min(...[...Array(STEPS + 1).keys()].map((step) => way.curve.getPoint(step / STEPS).z));
}

/** A flight along a way, heading as its keys say, looking straight down all the way, as far in each share of its time. */
function flightAlong(way: Way, heading: Flight['heading']): Flight {
	return { way, pace: EVENLY, heading, tip: [{ moment: 0, rule: STRAIGHT_DOWN }], roll: 0, eye: THE_EYE };
}

/** A flight along a way, looking straight down up the page, each leg taking its time beside the others'. */
function flightTimed(way: Way, takes: readonly number[]): Flight {
	return { ...flightAlong(way, [{ moment: 0, rule: UP_THE_PAGE }]), pace: paceOf({ kind: 'apart', takes }, way) };
}

/** How far across the eye stands flying a flight, at each of so many even steps of its time, its ends among them. */
function acrossAtSteps(flight: Flight, steps: number): readonly number[] {
	return [...Array(steps + 1).keys()].map((step) => flownAt(flight, step / steps).at.across);
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

test("a smooth leg to a point before a figure of the film's arrives heading the way the figure leaves, with no corner", () => {
	const intoAFigure: readonly Leg[] = [
		{ kind: 'to', to: { across: 500, down: 0, out: 1000 } },
		{ kind: 'along', figure: new LineCurve3(new Vector3(0, 0, 0), new Vector3(0, 500, 0)) }
	];
	expect(headingKeptThrough(wayOf(SETTING_OFF, intoAFigure, 'smooth', 'eye.fly'))).toBeCloseTo(1, 2);
});

test('a figure that closes on itself is flown round it and back to where it set off', () => {
	const square = [new Vector3(0, 0, 0), new Vector3(400, 0, 0), new Vector3(400, 400, 0), new Vector3(0, 400, 0)];
	const round = wayOf(
		SETTING_OFF,
		[{ kind: 'along', figure: new CatmullRomCurve3(square, true) }],
		'smooth',
		'eye.fly'
	);
	const back = round.curve.getPoint(1);
	expect([back.x, back.y, back.z, round.curve.getLength() > 1200]).toEqual([
		expect.closeTo(0),
		expect.closeTo(0),
		expect.closeTo(1000),
		true
	]);
});

test('a figure that gives a point of no numbers anywhere along it, or flat with no out, is refused', () => {
	// Its out the root of a number below none round its middle
	const brokenInTheMiddle = {
		getPoint: (share: number) => new Vector3(100 * share, 0, Math.sqrt((share - 0.5) ** 2 - 0.01))
	};
	const flat = new EllipseCurve(0, 0, 300, 300, 0, Math.PI);
	const refusal = new FilmError(
		"eye.fly's leg 0's figure gives a point of no numbers: draw it in three dimensions, through numbers, x across, y down and z out"
	);
	expect(() => wayOf(SETTING_OFF, [{ kind: 'along', figure: brokenInTheMiddle }], 'smooth', 'eye.fly')).toThrow(
		refusal
	);
	expect(() => wayOf(SETTING_OFF, [{ kind: 'along', figure: flat as never }], 'smooth', 'eye.fly')).toThrow(refusal);
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
		{ moment: 0, rule: { kind: 'degrees', degrees: 350 } },
		{ moment: 1, rule: { kind: 'degrees', degrees: 10 } }
	]);
	const top = flownAt(flight, 0.5).up;
	expect([top.across, top.down]).toEqual([expect.closeTo(0), expect.closeTo(-1)]);
});

test('a heading along the way turns the top of an eye looking down the way it flies', () => {
	const way = wayOf(SETTING_OFF, [TURNING[0]!], 'straight', 'eye.fly');
	const top = flownAt(flightAlong(way, [{ moment: 0, rule: { kind: 'along' } }]), 0.5).up;
	expect([top.across, top.down]).toEqual([expect.closeTo(1), expect.closeTo(0)]);
});

test("a flight whose legs take their time apart passes each leg's end at its share of the time, however long the leg: a leg of 1000 taking 3, one of 100 taking 1", () => {
	const timed = flightTimed(wayOf(SETTING_OFF, LONG_THEN_SHORT, 'straight', 'eye.fly'), [3, 1]);
	expect([flownAt(timed, 0.75).at.across, flownAt(timed, 1).at.across]).toEqual([
		expect.closeTo(1000),
		expect.closeTo(1100)
	]);
});

test('a flight whose legs take their time apart sets off from rest and comes to rest: a thousandth of its time from either end, it stands within a twentieth of a pixel of it', () => {
	const timed = flightTimed(wayOf(SETTING_OFF, LONG_THEN_SHORT, 'straight', 'eye.fly'), [3, 1]);
	expect([flownAt(timed, 0.001).at.across, 1100 - flownAt(timed, 0.999).at.across]).toEqual([
		expect.closeTo(0, 1),
		expect.closeTo(0, 1)
	]);
});

test('a flight whose legs take their time apart never goes back along its way: a leg of 10 after one of 1000, each taking as long, is flown on to its end and no farther', () => {
	const longThenTiny: readonly Leg[] = [LONG_THEN_SHORT[0]!, { kind: 'to', to: { across: 1010, down: 0, out: 1000 } }];
	const across = acrossAtSteps(flightTimed(wayOf(SETTING_OFF, longThenTiny, 'straight', 'eye.fly'), [1, 1]), STEPS);
	expect([across, Math.max(...across)]).toEqual([
		[...across].sort((before, after) => before - after),
		expect.closeTo(1010)
	]);
});

test('the eye at rest, read as it rides a window standing whole and face-on, heads up the page looking straight down onto it, unrolled', () => {
	expect(gazeOf(eyeAtRest(FOCAL_LENGTH))).toEqual({
		heading: expect.closeTo(0),
		tip: expect.closeTo(-90),
		roll: expect.closeTo(0)
	});
});
