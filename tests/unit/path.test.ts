import { expect, test } from 'vitest';
import { BOX_SPACE, type Box, boxToward, middleX, middleY } from '../../src/domain/geometry.ts';
import { type Course, alongPath } from '../../src/domain/path.ts';

// A box at three corners of a way that turns: 300 pixels across, then 100 down
const START: Box = { left: 0, top: 0, width: 100, height: 100 };
const TURN: Box = { left: 300, top: 0, width: 100, height: 100 };
const END: Box = { left: 300, top: 100, width: 100, height: 100 };
const SMOOTH_EVEN: Course = { shape: 'smooth', pace: 'even' };
const SMOOTH_BY_KEYS: Course = { shape: 'smooth', pace: 'keys' };
const STRAIGHT_EVEN: Course = { shape: 'straight', pace: 'even' };
const STRAIGHT_BY_KEYS: Course = { shape: 'straight', pace: 'keys' };
// How finely a way is read along, and how far either side of a key its direction is read
const STEPS = 40;
const NEAR_THE_KEY = 0.0001;

/** Where a box stands along the turning way, on a course, so far along. */
function onTheTurningWay(course: Course, progress: number): Box {
	return alongPath(START, [TURN], END, course, BOX_SPACE, progress);
}

/** How far a box's middle moved from one to another. */
function movedBetween(start: Box, end: Box): number {
	return Math.hypot(middleX(end) - middleX(start), middleY(end) - middleY(start));
}

/** The direction a box's middle moves from one to another, in degrees. */
function directionBetween(start: Box, end: Box): number {
	return (Math.atan2(middleY(end) - middleY(start), middleX(end) - middleX(start)) * 180) / Math.PI;
}

test('two keys go as their kind goes from one to the other, on any course and past either end', () => {
	const progresses = [-0.1, 0, 0.3, 1, 1.1];
	const courses = [SMOOTH_EVEN, STRAIGHT_BY_KEYS];
	expect(
		courses.map((course) => progresses.map((progress) => alongPath(START, [], END, course, BOX_SPACE, progress)))
	).toEqual(courses.map(() => progresses.map((progress) => boxToward(START, END, progress))));
});

test('a way through a key stands on it where its pace puts it, and ends on its last: half-way by keys, at its length by an even pace', () => {
	expect([
		onTheTurningWay(STRAIGHT_BY_KEYS, 0.5),
		onTheTurningWay(SMOOTH_BY_KEYS, 0.5),
		onTheTurningWay(STRAIGHT_EVEN, 0.75),
		onTheTurningWay(SMOOTH_EVEN, 0),
		onTheTurningWay(SMOOTH_EVEN, 1),
		onTheTurningWay(STRAIGHT_BY_KEYS, 1)
	]).toEqual([TURN, TURN, TURN, START, END, END]);
});

test('an even pace covers as much of the way in each equal share of the move, smooth or straight', () => {
	const stepLengths = [SMOOTH_EVEN, STRAIGHT_EVEN].map((course) =>
		[...Array(STEPS).keys()].map((step) =>
			movedBetween(onTheTurningWay(course, step / STEPS), onTheTurningWay(course, (step + 1) / STEPS))
		)
	);
	expect(stepLengths.map((lengths) => Math.max(...lengths) / Math.min(...lengths))).toEqual([
		expect.closeTo(1, 1),
		expect.closeTo(1, 1)
	]);
});

test('a smooth way turns through a key with no corner, and a straight one turns at it', () => {
	const turnAtTheKey = [SMOOTH_BY_KEYS, STRAIGHT_BY_KEYS].map(
		(course) =>
			directionBetween(TURN, onTheTurningWay(course, 0.5 + NEAR_THE_KEY)) -
			directionBetween(onTheTurningWay(course, 0.5 - NEAR_THE_KEY), TURN)
	);
	expect(turnAtTheKey).toEqual([expect.closeTo(0, 0), expect.closeTo(90, 6)]);
});

test('past its last key a way goes straight on the way it came into it, as a curve that passes its end takes it', () => {
	const past = [SMOOTH_EVEN, STRAIGHT_EVEN].map((course) => onTheTurningWay(course, 1.1));
	expect(past.map((box) => ({ left: box.left, below: box.top > END.top }))).toEqual([
		{ left: END.left, below: true },
		{ left: END.left, below: true }
	]);
});
