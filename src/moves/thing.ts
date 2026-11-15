/**
 * Things, shown by an object (`src/moves/object.ts`): a film's own, built in three.js by the module the film names
 * (`src/props/thing.ts`), standing in a box at a place on the frame, where it rides with the eye, or in the world,
 * where the eye moves past it. As any object it is carried, grown, brought near, leant and taken away by the moves
 * objects share; its numbers go to new ones by `set`, each from where it stood. It comes up and goes in its own way
 * alone, which its module draws from how far it has come, as livereel's ways and effects are drawn by the stage's
 * markup, which draws nothing of a thing. Every move of it takes the thing named `thing`, or the one the film names
 * `as`.
 */
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import {
	A_FRAME_SIDE,
	type Box,
	type FrameSide,
	boxCentredOn,
	frameScaleOf,
	middleX,
	middleY
} from '../domain/geometry.ts';
import { A_NAME, type Form, Literal, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, windowPlaced } from '../domain/place.ts';
import { namesOf } from '../domain/toward.ts';
import { type Beginning, type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { A_REACH, type Reach, THING_VALUES, type Thing, type ThingValues, valuesToward } from '../props/thing.ts';
import {
	type Coming,
	GOES_AS_IT_STANDS,
	NAMED_FORM,
	type NamedScript,
	type PlaceReading,
	type ShownKind,
	THE_STEPS_CURVE,
	contentMove,
	fromItsBox,
	objectHide,
	objectMovesOf,
	objectShow,
	showing,
	standingOfKind
} from './object.ts';

/**
 * How a thing comes: the place its middle stands at and how far it reaches about it, in film pixels; its numbers; which
 * thing it is, `as`; sliding in whole `from` past a side of the frame where the film names one; and standing `inside`
 * the world where the film names it, on the frame where it names nothing.
 */
export interface ThingScript extends TimingScript, NamedScript {
	readonly at: Place;
	readonly reach: Reach;
	readonly values?: ThingValues;
	readonly from?: FrameSide;
	readonly inside?: 'world';
}

/** How a thing goes: which one, and the side of the frame it slides out past, if any. */
export interface ThingHideScript extends TimingScript, NamedScript {
	readonly toward?: FrameSide;
}

/** Which thing's numbers go to new ones, and when. */
export interface ThingSetScript extends TimingScript, NamedScript {}

const THING = 'thing' satisfies ShownKind;
const THING_FORM: Form<ThingScript> = {
	at: needed(A_PLACE),
	reach: needed(A_REACH),
	values: THING_VALUES,
	from: A_FRAME_SIDE,
	inside: new Literal('world'),
	...NAMED_FORM,
	...TIMING_FORM
};
const THING_HIDE_FORM: Form<ThingHideScript> = { toward: A_FRAME_SIDE, ...NAMED_FORM, ...TIMING_FORM };
const THING_SET_FORM: Form<ThingSetScript> = { ...NAMED_FORM, ...TIMING_FORM };
// A thing shown with no numbers, as one its module builds whole from nothing
const NO_VALUES: ThingValues = {};
// A thing reads a place as `reachedIn` has it, and sets off toward one from its box as it stands
const THING_READING: PlaceReading<typeof THING> = { placed: reachedIn, settingOff: fromItsBox };

/**
 * A thing its module builds by a name coming up as far as it reaches about a place, in place of any thing of its name,
 * in its own way, or sliding in whole from past a side of the frame; refused as it begins where the film's things
 * module builds none of that name, as a film drawn flat has none.
 */
export function show(made: string, script: ThingScript): Move {
	assertKind(made, A_NAME, "thing.show's made");
	assertWritten(script, THING_FORM, 'thing.show');
	const thing: Thing = { kind: THING, made, reach: script.reach, values: script.values ?? NO_VALUES };
	return objectShow(THING, 'thing.show', script, script.at, THE_STEPS_CURVE, (beginning) =>
		builtIn(beginning, thing, script.at)
	);
}

/** A thing coming up at a place, refused where the film's things module builds none of its name. */
function builtIn(beginning: Beginning, thing: Thing, at: Place): Coming {
	if (!beginning.thingsBuilt.includes(thing.made)) {
		throw new FilmError(
			`thing.show shows ${thing.made}, which the film's things module builds none of: draw the film as a room, name its things module, and export a builder of ${thing.made} from it`
		);
	}
	return { content: thing, box: THING_READING.placed(beginning.format, at, thing) };
}

const THING_MOVES = objectMovesOf(THING, THING_READING);

/** The thing carried to a place, through the places the film names on its way, growing and coming near as it names. */
export const to = THING_MOVES.to;

/** The thing leant back, swung, rolled and turned over as the film names, about its box's middle. */
export const lean = THING_MOVES.lean;

/** The thing's numbers going to those the film names, each from where it stood; the rest kept as they stand. */
export function set(values: ThingValues, script: ThingSetScript = {}): Move {
	assertKind(values, THING_VALUES, "thing.set's values");
	assertWritten(script, THING_SET_FORM, 'thing.set');
	const name = script.as ?? THING;
	return contentMove(name, timingOf(script), (beginning) => setting(beginning, name, values));
}

/** The thing on the screen going where it stands, in its own way, or sliding out past a side of the frame. */
export function hide(script: ThingHideScript = {}): Move {
	assertWritten(script, THING_HIDE_FORM, 'thing.hide');
	return objectHide(THING, 'thing.hide', script, GOES_AS_IT_STANDS);
}

/**
 * The thing's numbers on their way from those it shows to those named, refused where a name is none it was shown with,
 * as its module reads no other.
 */
function setting(beginning: Beginning, name: string, values: ThingValues): Change {
	const thing = standingOfKind(beginning, name, 'thing.set', THING).content;
	const unknown = namesOf(values).filter((value) => !Object.hasOwn(thing.values, value));
	if (unknown.length > 0) {
		throw new FilmError(
			`thing.set sets ${unknown.join(', ')}, which the ${name} was not shown with: show it with every number its module reads`
		);
	}
	return showing(name, (progress) => ({ ...thing, values: valuesToward(thing.values, values, progress) }));
}

/**
 * The box a thing stands in at a place: as far as it reaches, about the middle of where the window would stand there,
 * its reach in film pixels grown to the format's frame.
 */
function reachedIn(format: Format, place: Place, thing: Thing): Box {
	const placed = windowPlaced(format, place);
	const scale = frameScaleOf(format.frame);
	const middle = { left: middleX(placed), top: middleY(placed) };
	return boxCentredOn(middle, { width: thing.reach.width * scale, height: thing.reach.height * scale });
}
