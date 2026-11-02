/**
 * Groups of objects (`src/props/group.ts`): one placed in a box of the frame, the whole frame where the film names none,
 * before anything stands in it, as an object comes up in it only as it is shown (`group: 'stack'`). Then carried, its
 * middle to another place's, grown, brought near and leant, as an object is (`src/moves/object.ts`), with everything in
 * it, and put away with everything in it, which fades as it goes. A group shows nothing of its own, so it stands whole from the
 * start of the move that places it. Every move of it takes the group named `group`, or the one the film names `as`.
 */
import { FilmError } from '../domain/errors.ts';
import { NONE, fractionOf } from '../domain/fraction.ts';
import { resizedAbout } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, placesNamed, windowPlaced } from '../domain/place.ts';
import { AS_PLACED, orientationToward } from '../domain/stance.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	groupPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { type Group, type GroupName, groupFound } from '../props/group.ts';
import { type Scene, withGroup } from '../scene.ts';
import {
	CARRIED,
	type Carried,
	LEANT,
	LEAN_OBJECT_FORM,
	NAMED_FORM,
	type NamedScript,
	type ObjectLeanScript,
	TO_FORM,
	type ToScript,
	carriedAlong,
	depthAsked,
	orientedFrom
} from './object.ts';

/** Which group comes, and the place it stands in, `at`: the whole frame where the film names none. */
export interface GroupShowScript extends TimingScript, NamedScript {
	readonly at?: Place;
}

/** Which group goes, with everything in it. */
export interface GroupHideScript extends TimingScript, NamedScript {}

/** A group's values a move that leans it writes. */
type Leant = Pick<Group, (typeof LEANT)[number]>;

// The group a move takes where the film names none
const GROUP: GroupName = 'group';
// The place a group stands in where the film names none
const THE_WHOLE_FRAME: Place = 'whole';
const SHOW_FORM: Form<GroupShowScript> = { at: A_PLACE, ...NAMED_FORM, ...TIMING_FORM };
const HIDE_FORM: Form<GroupHideScript> = { ...NAMED_FORM, ...TIMING_FORM };

/**
 * A group placed in a place, read as the window reads one, the whole frame where the film names none: face-on, as
 * large as its box and on the frame's plane. One of its name standing is refused, as a group comes once in its place.
 */
export function show(script: GroupShowScript = {}): Move {
	assertWritten(script, SHOW_FORM, 'group.show');
	const name = script.as ?? GROUP;
	const place = script.at ?? THE_WHOLE_FRAME;
	return {
		part: groupPart(name),
		timing: timingOf(script),
		places: placesNamed("group.show's at", script.at ?? null),
		begin: (beginning) => placed(beginning, name, place)
	};
}

/**
 * The group carried with everything in it till its middle stands at a place's, read as the window reads one, growing
 * to `scale` and coming `depth` toward the eye on the way, about its middle; it stays as large as it was placed, as it
 * grows by its scale alone.
 */
export function to(place: Place, script: ToScript = {}): Move {
	assertKind(place, A_PLACE, "group.to's place");
	assertWritten(script, TO_FORM, 'group.to');
	const name = script.as ?? GROUP;
	return {
		part: groupPart(name),
		valueNames: CARRIED,
		timing: timingOf(script),
		places: placesNamed("group.to's place", place),
		begin: (beginning) => carried(beginning, name, place, script)
	};
}

/**
 * The group leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled by `roll`, with
 * everything in it.
 */
export function lean(script: ObjectLeanScript): Move {
	assertWritten(script, LEAN_OBJECT_FORM, 'group.lean');
	const name = script.as ?? GROUP;
	return {
		part: groupPart(name),
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, name, script)
	};
}

/** The group going with everything in it, which fades as it goes; once gone, there is none, nor anything that was in it. */
export function hide(script: GroupHideScript = {}): Move {
	assertWritten(script, HIDE_FORM, 'group.hide');
	const name = script.as ?? GROUP;
	return {
		part: groupPart(name),
		timing: timingOf(script),
		begin: (beginning) => going(beginning, name)
	};
}

/** A group standing in a place as the move begins; refused where one of its name stands. */
function placed(beginning: Beginning, name: GroupName, place: Place): Change {
	if (beginning.scene.groups.has(name)) {
		throw new FilmError(
			`group.show finds the group "${name}" standing: a group comes once in its place; hide it first`
		);
	}
	const group: Group = { box: windowPlaced(beginning.format, place), ...AS_PLACED, gone: NONE };
	return (scene) => withGroup(scene, name, group);
}

/** The group on its way to stand as large as it is about a place's middle, and to the film's scale and depth. */
function carried(beginning: Beginning, name: GroupName, place: Place, script: ToScript): Change {
	const group = groupFound(beginning.scene.groups, name, 'group.to');
	const to: Carried = {
		box: resizedAbout(windowPlaced(beginning.format, place), group.box),
		scale: script.scale ?? group.scale,
		depth: depthAsked(script.depth, group.depth, beginning.format.frame)
	};
	return writing(name, (progress) => carriedAlong(group, to, progress));
}

/** The group's orientation on its way from how it faces to the film's. */
function leaning(beginning: Beginning, name: GroupName, script: ObjectLeanScript): Change {
	const group = groupFound(beginning.scene.groups, name, 'group.lean');
	const to = orientedFrom(group.angle, script);
	return writing(name, (progress): Leant => ({ angle: orientationToward(group.angle, to, progress) }));
}

/** The group going, everything in it fading with it; once gone, none, with all of it. */
function going(beginning: Beginning, name: GroupName): Change {
	const group = groupFound(beginning.scene.groups, name, 'group.hide');
	return (scene, progress) => withGroup(scene, name, untilTheEnd(progress, { ...group, gone: fractionOf(progress) }));
}

/** A change that writes some of a group's values into it as it stands, leaving the rest as other moves set them. */
function writing(name: GroupName, valuesAt: (progress: number) => Partial<Group>): Change {
	return (scene, progress) => withGroup(scene, name, { ...standingIn(scene, name), ...valuesAt(progress) });
}

/**
 * The group of a name as the scene holds it, for a move that found it standing as it began and writes some of its
 * values: only its hide puts it away, and none does while another of its moves runs.
 */
function standingIn(scene: Scene, name: GroupName): Group {
	const group = scene.groups.get(name);
	if (group === undefined) throw new Error(`the group "${name}" is gone while a move of it runs`);
	return group;
}
