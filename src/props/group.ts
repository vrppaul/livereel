/**
 * A group of objects (`src/props/object.ts`): how it stands is shared by every object standing in it, so a film turns,
 * grows or brings near a stack of pieces of the page, a ring of cards or a fan as one, while each object stands in it as
 * its own moves have it, as a layer stands under its parent in After Effects or three.js. A group holds objects and
 * nothing of its own, never another group. It stands on the frame in a box, which it grows, turns and comes near about
 * the middle of, and an object in it has its box in the group's pixels, from the box's top left corner; the box is as
 * large as the group was placed, so a group grows by its scale alone.
 *
 * An object joins a group only as it comes, while the group stands as it was placed, so where it would stand on the
 * frame is where it stands in the group, measured from the group's corner: nothing is carried from one holder to
 * another. A group goes with every object in it, fading them as it goes; the scene holds no object of a group gone.
 */
import { aboutTheMiddleOf } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { type Fraction, WHOLE } from '../domain/fraction.ts';
import type { Box, Point } from '../domain/geometry.ts';
import { type Matrix, carriesEveryPointWhereItStands } from '../domain/matrix.ts';
import { type Stance, stanceMatrix } from '../domain/stance.ts';
import { presentShare } from './way.ts';

/** The name a film gives a group. */
export type GroupName = string;

/** A group: its box on the frame, in the frame's pixels, how it stands about the box's middle, and how far it has gone. */
export interface Group extends Stance {
	readonly box: Box;
	readonly gone: Fraction;
}

/** Groups by name. */
export type Groups = ReadonlyMap<GroupName, Group>;

/** How a group stands about its middle, as a matrix about the middle of a box standing in it, in its pixels. */
export function groupStanceAbout(group: Group, box: Box): Matrix {
	return aboutTheMiddleOf(stanceMatrix(group), box, group.box);
}

/**
 * Whether a group stands as it was placed: its stance carries every point where it stands, as large as its box, on the
 * frame's plane and facing it upright, by whole turns or none, so a box in it stands on the frame where it is measured
 * from its corner.
 */
export function standsAsPlaced(group: Group): boolean {
	return carriesEveryPointWhereItStands(stanceMatrix(group));
}

/** The group of a name a move takes, as it finds it as it begins; refused where none stands, the move named. */
export function groupFound(groups: Groups, name: GroupName, move: string): Group {
	const group = groups.get(name);
	if (group === undefined) throw new FilmError(`${move} finds no group "${name}" standing`);
	return group;
}

/** The group of a name an object stands in: none is gone while anything stands in it, as it goes with all of it. */
export function groupNamed(groups: Groups, name: GroupName): Group {
	const group = groups.get(name);
	if (group === undefined) throw new Error(`an object stands in the group "${name}", which is gone`);
	return group;
}

/** The top left corner of a group's box on the frame, which a box in the group is measured from. */
export function cornerOf(group: Group): Point {
	return { left: group.box.left, top: group.box.top };
}

/** How much of what stands in a group the group lets show: all of it, but as far as it has gone. */
export function groupShare(group: Group): number {
	return presentShare({ shown: WHOLE, gone: group.gone });
}
