/**
 * A value's way through keys: from where it stood, through the keys a film names, to where it goes — the camera past
 * blocks on its way to the one it frames, an object or a group past places on its way to its own. A film writes the
 * places a shot passes, not the times it passes them, as After Effects' roving keys and Motion Canvas' curves have
 * it; the move's curve eases the whole way at once.
 *
 * With no key between, a value goes as its kind goes from one end to the other (`toward`), as every move went before
 * a way had keys, so a move that names none draws as it drew. Through keys the way takes the film's course: its shape
 * `smooth`, a centripetal Catmull-Rom curve, which passes through every key with no corner and neither loops nor
 * cusps between keys close together, or `straight`, a line from key to key; its pace `even`, as long a stretch of the
 * way in each equal share of the move, measured as the kind measures a step on the frame, or `keys`, an equal share
 * of the move from each key to the next. The way stands on each key exactly where the film put it. Past either end, on
 * a curve that passes it, the value goes straight on along the way's first or last stretch, as two keys' way does.
 *
 * What a kind of value is on a way — its numbers, and how far apart two stand on the frame — is the kind's
 * (`PathSpace`): a box's in `src/domain/geometry.ts`, a pose's in `src/domain/camera.ts`.
 */
import { type Kind, OneOf } from './handed.ts';
import { between } from './time.ts';

/** How a way goes through its keys: curved through them, or straight from one to the next. */
export type Shape = 'smooth' | 'straight';

/** How a way is paced: as long a stretch in each equal share of the move, or an equal share from key to key. */
export type Pace = 'even' | 'keys';

/** How a way through keys goes: its shape and its pace. */
export interface Course {
	readonly shape: Shape;
	readonly pace: Pace;
}

/** The numbers a value stands for on a curve, in the order its kind lists them. */
type Numbers = readonly number[];

/** How a kind of value goes on a way: between two, by its numbers on a curve, and how far apart two stand. */
export interface PathSpace<Value> {
	/** Where a value stands `progress` of the way from one to another, as its kind goes. */
	readonly toward: (start: Value, end: Value, progress: number) => Value;
	/** The numbers a curve carries a value by, and the value those stand for. */
	readonly numbersOf: (value: Value) => Numbers;
	readonly valueOf: (numbers: Numbers) => Value;
	/** How far apart two values stand on the frame, in its pixels: the length of a step from one to the other. */
	readonly distance: (start: Value, end: Value) => number;
}

const SHAPES = ['smooth', 'straight'] as const satisfies readonly Shape[];
const PACES = ['even', 'keys'] as const satisfies readonly Pace[];
export const A_SHAPE: Kind<Shape> = new OneOf(SHAPES, `a way's shape: "smooth" or "straight"`);
export const A_PACE: Kind<Pace> = new OneOf(PACES, `a way's pace: "even" or "keys"`);

/** How a way through keys goes where a film names neither its shape nor its pace. */
export const RECOMMENDED_COURSE: Course = { shape: 'smooth', pace: 'even' };

// How many steps along each stretch of a way are measured to pace it evenly
const MEASURED_STEPS = 32;
// The power the distance between two keys is taken to for the span between their knots: a half, centripetal, so a
// curve neither loops nor cusps
const CENTRIPETAL = 0.5;
// A step this short between two keys is none: the two are one key
const NO_LENGTH = 1e-9;
// Where the way and each stretch of it start and end, as shares of them and as the curve's own parameter on a stretch
const ITS_START = 0;
const ITS_END = 1;
// How far a key mirrored past an end of the way stands: as far beyond the end as the key next to the end stands before it
const MIRRORED = 2;
// The length of each stretch where the pace is by keys
const ONE_STRETCH = 1;
// How many keys on from a stretch's start its neighbour past its end stands
const AFTER_THE_END = 2;

/**
 * Where a value stands `progress` of its way from where it stood, through keys, to where it goes, on a course: as its
 * kind goes from one end to the other where no key stands between.
 */
export function alongPath<Value>(
	from: Value,
	through: readonly Value[],
	to: Value,
	course: Course,
	space: PathSpace<Value>,
	progress: number
): Value {
	if (through.length === 0) return space.toward(from, to, progress);
	const keys = distinctKeys([from, ...through, to], space);
	if (keys.length === 1) return from;
	return new Way(keys, course, space).at(progress);
}

/** The keys of a way, a key standing where the one before it stands taken as that one. */
function distinctKeys<Value>(keys: readonly Value[], space: PathSpace<Value>): readonly Value[] {
	return keys.filter((key, index) => index === 0 || space.distance(itemAt(keys, index - 1), key) > NO_LENGTH);
}

/**
 * A way through two or more keys, none standing where the one before it stands, as stretches from each key to the
 * next: how far apart each stretch's knots stand on its curve, and how long each is by the pace.
 */
class Way<Value> {
	readonly keys: readonly Value[];
	readonly numbers: readonly Numbers[];
	readonly course: Course;
	readonly space: PathSpace<Value>;
	readonly spans: readonly number[];
	// For an even pace, how far along each stretch each of its measured steps ends, on the frame; none by keys
	readonly measured: readonly Numbers[];
	readonly lengths: readonly number[];

	constructor(keys: readonly Value[], course: Course, space: PathSpace<Value>) {
		this.keys = keys;
		this.numbers = keys.map((key) => space.numbersOf(key));
		this.course = course;
		this.space = space;
		this.spans = this.stretches().map(
			(stretch) => space.distance(itemAt(keys, stretch), itemAt(keys, stretch + 1)) ** CENTRIPETAL
		);
		this.measured = course.pace === 'even' ? this.stretches().map((stretch) => this.measuredAlong(stretch)) : [];
		this.lengths = course.pace === 'even' ? this.measured.map(lastOf) : this.stretches().map(() => ONE_STRETCH);
	}

	/** Where the value stands `progress` of the way along: on a key at either end, straight on past either. */
	at(progress: number): Value {
		if (progress === ITS_START) return itemAt(this.keys, 0);
		if (progress === ITS_END) return lastItemOf(this.keys);
		const reached = progress * sumOf(this.lengths);
		const stretch = this.stretchReaching(reached);
		const share = (reached - sumOf(this.lengths.slice(0, stretch))) / itemAt(this.lengths, stretch);
		if (share < ITS_START || share > ITS_END) return this.straightOn(stretch, share);
		return this.onStretch(stretch, this.parameterAt(stretch, share));
	}

	/** The stretches of the way, by the index of the key each starts at. */
	private stretches(): readonly number[] {
		return [...Array(this.keys.length - 1).keys()];
	}

	/** The stretch a length along the way falls on: the first or the last past either end. */
	private stretchReaching(reached: number): number {
		const lastStretch = this.lengths.length - 1;
		const ending = this.stretches().find((stretch) => reached < sumOf(this.lengths.slice(0, stretch + 1)));
		return ending ?? lastStretch;
	}

	/**
	 * How far along a stretch each of its measured steps ends, on the frame: what an even pace reads a share of the
	 * stretch's length back to the curve's own parameter by.
	 */
	private measuredAlong(stretch: number): Numbers {
		const points = [...Array(MEASURED_STEPS + 1).keys()].map((step) => this.onStretch(stretch, step / MEASURED_STEPS));
		const travelled = [0];
		for (let step = 1; step < points.length; step += 1) {
			travelled.push(lastOf(travelled) + this.space.distance(itemAt(points, step - 1), itemAt(points, step)));
		}
		return travelled;
	}

	/** The curve's own parameter on a stretch where a share of it stands, by the pace. */
	private parameterAt(stretch: number, share: number): number {
		if (this.course.pace === 'keys') return share;
		const ends = itemAt(this.measured, stretch);
		const reached = share * lastOf(ends);
		const step = Math.max(
			1,
			ends.findIndex((end) => end >= reached)
		);
		const stepStart = itemAt(ends, step - 1);
		const stepLength = itemAt(ends, step) - stepStart;
		const intoTheStep = stepLength > NO_LENGTH ? (reached - stepStart) / stepLength : 0;
		return (step - 1 + intoTheStep) / MEASURED_STEPS;
	}

	/** Where the value stands past an end of the way: straight on along the stretch it ends on, as two keys go. */
	private straightOn(stretch: number, share: number): Value {
		return this.space.toward(itemAt(this.keys, stretch), itemAt(this.keys, stretch + 1), share);
	}

	/** Where the value stands at the curve's own parameter on a stretch, by the way's shape: on a key at either end. */
	private onStretch(stretch: number, parameter: number): Value {
		const start = itemAt(this.keys, stretch);
		const end = itemAt(this.keys, stretch + 1);
		if (parameter === ITS_START) return start;
		if (parameter === ITS_END) return end;
		switch (this.course.shape) {
			case 'straight':
				return this.space.toward(start, end, parameter);
			case 'smooth':
				return this.space.valueOf(this.curvedAt(stretch, parameter));
		}
	}

	/**
	 * The numbers of the centripetal Catmull-Rom curve through a stretch's two keys and their neighbours, at its own
	 * parameter, by Barry and Goldman's blending; a neighbour past an end of the way is the key mirrored past it, its
	 * span as the stretch's own.
	 */
	private curvedAt(stretch: number, parameter: number): Numbers {
		const start = itemAt(this.numbers, stretch);
		const end = itemAt(this.numbers, stretch + 1);
		const before = this.numbers[stretch - 1] ?? mirrored(start, end);
		const after = this.numbers[stretch + AFTER_THE_END] ?? mirrored(end, start);
		const span = itemAt(this.spans, stretch);
		const knotBefore = 0;
		const knotStart = knotBefore + (this.spans[stretch - 1] ?? span);
		const knotEnd = knotStart + span;
		const knotAfter = knotEnd + (this.spans[stretch + 1] ?? span);
		const knot = between(knotStart, knotEnd, parameter);
		const firstBlend = numbersToward(before, start, shareBetween(knotBefore, knotStart, knot));
		const middleBlend = numbersToward(start, end, shareBetween(knotStart, knotEnd, knot));
		const lastBlend = numbersToward(end, after, shareBetween(knotEnd, knotAfter, knot));
		const leading = numbersToward(firstBlend, middleBlend, shareBetween(knotBefore, knotEnd, knot));
		const trailing = numbersToward(middleBlend, lastBlend, shareBetween(knotStart, knotAfter, knot));
		return numbersToward(leading, trailing, shareBetween(knotStart, knotEnd, knot));
	}
}

/** A key mirrored past the end it stands next to: as far beyond the end as it stands before it. */
function mirrored(end: Numbers, nextToTheEnd: Numbers): Numbers {
	return end.map((number, index) => MIRRORED * number - itemAt(nextToTheEnd, index));
}

/** Numbers `share` of the way from some to others, each as far along. */
function numbersToward(start: Numbers, end: Numbers, share: number): Numbers {
	return start.map((number, index) => between(number, itemAt(end, index), share));
}

/** How far along from one knot to another a knot between stands, as a share of the two's span. */
function shareBetween(start: number, end: number, knot: number): number {
	return (knot - start) / (end - start);
}

function sumOf(numbers: Numbers): number {
	return numbers.reduce((sum, number) => sum + number, 0);
}

function lastOf(numbers: Numbers): number {
	return lastItemOf(numbers);
}

function lastItemOf<Item>(items: readonly Item[]): Item {
	return itemAt(items, items.length - 1);
}

/** An item of a list a way holds one of at every index it asks for. */
function itemAt<Item>(items: readonly Item[], index: number): Item {
	const item = items[index];
	if (item === undefined) throw new Error(`a way has nothing at ${index} of its ${items.length}`);
	return item;
}
