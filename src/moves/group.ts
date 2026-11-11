/**
 * Groups of objects (`src/props/group.ts`): one placed in a box of the frame, the whole frame where the film names none,
 * before anything stands in it, as an object comes up in it only as it is shown (`group: 'stack'`). Then carried, its
 * middle to another place's, grown, brought near and leant, as an object is (`src/moves/object.ts`), with everything in
 * it, and put away with everything in it, which fades as it goes. A group shows nothing of its own, so it stands whole from the
 * start of the move that places it. Every move of it takes the group named `group`, or the one the film names `as`.
 */
import { FilmError } from '../domain/errors.ts';
import { NONE, fractionOf } from '../domain/fraction.ts';
import { BOX_SPACE, type Box, resizedAbout } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, placesNamed, windowPlaced } from '../domain/place.ts';
import { pathOf } from '../domain/path.ts';
import { AS_PLACED, angleToward, depthAsked, depthsNamed } from '../domain/stance.ts';
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
import type { GroupName } from '../domain/placement.ts';
import { A_GROUP_ORDER, type Group, type GroupOrder, groupFound } from '../props/group.ts';
import { type Scene, withGroup } from '../scene.ts';
import {
	type Carried,
	type Carrying,
	LEANT,
	LEAN_OBJECT_FORM,
	NAMED_FORM,
	type NamedScript,
	type ObjectLeanScript,
	TO_FORM,
	type ToScript,
	carriedOnPath,
	carryingWritten,
	placesOnTheWay
} from './object.ts';
import { leantFrom } from './lean.ts';

/**
 * Which group comes, the place it stands in, `at`, the whole frame where the film names none, and how it orders what
 * stands in it as it is drawn, `order`: by each object's zIndex where the film names none.
 */
export interface GroupShowScript extends TimingScript, NamedScript {
	readonly at?: Place;
	readonly order?: GroupOrder;
}

/** Which group goes, with everything in it. */
export interface GroupHideScript extends TimingScript, NamedScript {}

/** A group's values a move that leans it writes. */
type Leant = Pick<Group, (typeof LEANT)[number]>;

// The group a move takes where the film names none
const GROUP: GroupName = 'group';
// What a refusal names the moves that carry and lean a group by
const GROUP_TO = 'group.to';
const GROUP_LEAN = 'group.lean';
// The place a group stands in where the film names none, and how it orders what stands in it
const THE_WHOLE_FRAME: Place = 'whole';
const BY_Z_INDEX: GroupOrder = 'zIndex';
const SHOW_FORM: Form<GroupShowScript> = { at: A_PLACE, order: A_GROUP_ORDER, ...NAMED_FORM, ...TIMING_FORM };
const HIDE_FORM: Form<GroupHideScript> = { ...NAMED_FORM, ...TIMING_FORM };

/**
 * A group placed in a place, read as the window reads one, the whole frame where the film names none: face-on, as
 * large as its box and on the frame's plane, ordering what stands in it as the film names. One of its name standing is
 * refused, as a group comes once in its place.
 */
export function show(script: GroupShowScript = {}): Move {
	assertWritten(script, SHOW_FORM, 'group.show');
	const name = script.as ?? GROUP;
	const place = script.at ?? THE_WHOLE_FRAME;
	const order = script.order ?? BY_Z_INDEX;
	return {
		part: groupPart(name),
		timing: timingOf(script),
		places: placesNamed("group.show's at", script.at ?? null),
		begin: (beginning) => placed(beginning, name, place, order)
	};
}

/**
 * The group carried with everything in it till its middle stands at a place's, read as the window reads one, its middle
 * passing those of the places the film names on its way, growing to `scale` and coming `depth` toward the eye on the
 * way, about its middle; it stays as large as it was placed, as it grows by its scale alone.
 */
export function to(place: Place, script: ToScript = {}): Move {
	assertKind(place, A_PLACE, `${GROUP_TO}'s place`);
	assertWritten(script, TO_FORM, GROUP_TO);
	const carrying = carryingWritten(place, script, GROUP_TO);
	const name = script.as ?? GROUP;
	return {
		part: groupPart(name),
		valueNames: carrying.names,
		timing: timingOf(script),
		places: placesOnTheWay(GROUP_TO, carrying),
		depths: depthsNamed(`${GROUP_TO}'s depth`, script.depth),
		begin: (beginning) => carried(beginning, name, carrying)
	};
}

/**
 * The group leant back from its top edge by `tilt`, swung by `turn`, rolled by `roll` and turned over by `over`, about
 * a point of its box, with everything in it.
 */
export function lean(script: ObjectLeanScript): Move {
	assertWritten(script, LEAN_OBJECT_FORM, GROUP_LEAN);
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

/** A group standing in a place as the move begins, ordering what stands in it so; refused where one of its name stands. */
function placed(beginning: Beginning, name: GroupName, place: Place, order: GroupOrder): Change {
	if (beginning.scene.groups.has(name)) {
		throw new FilmError(
			`group.show finds the group "${name}" standing: a group comes once in its place; hide it first`
		);
	}
	const group: Group = { box: windowPlaced(beginning.format, place), ...AS_PLACED, gone: NONE, order };
	return (scene) => withGroup(scene, name, group);
}

/**
 * The group on its way to stand as large as it is about a place's middle, through those of the places on its way, and
 * to the film's scale and depth where it names them: the values named written into it.
 */
function carried(beginning: Beginning, name: GroupName, carrying: Carrying): Change {
	const group = groupFound(beginning.scene.groups, name, GROUP_TO);
	const { place, through, script } = carrying;
	const to: Carried = {
		box: aboutAPlace(beginning, place, group),
		scale: script.scale ?? group.scale,
		depth: depthAsked(script.depth, group.depth, beginning.format.frame)
	};
	const keys = through.keys.map((key) => aboutAPlace(beginning, key, group));
	const boxPath = pathOf(group.box, { ...through, keys }, to.box, BOX_SPACE);
	return writing(name, (progress) => carriedOnPath(boxPath, group, to, carrying, progress));
}

/** The box a group stands in about a place's middle, as large as it stands, the place read as the window reads one. */
function aboutAPlace(beginning: Beginning, place: Place, group: Group): Box {
	return resizedAbout(windowPlaced(beginning.format, place), group.box);
}

/** The group's angle on its way from how it faces to the film's, about the point of its box it turns about. */
function leaning(beginning: Beginning, name: GroupName, script: ObjectLeanScript): Change {
	const group = groupFound(beginning.scene.groups, name, GROUP_LEAN);
	const to = leantFrom(group, script, GROUP_LEAN, `group "${name}"`);
	return writing(name, (progress): Leant => ({ angle: angleToward(group.angle, to.angle, progress), about: to.about }));
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
