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
import { FilmError } from '../domain/errors.ts';
import { type Fraction, WHOLE } from '../domain/fraction.ts';
import { type Kind, OneOf } from '../domain/handed.ts';
import { carriesEveryPointWhereItStands } from '../domain/matrix.ts';
import type { GroupName, Placement } from '../domain/placement.ts';
import { stanceMatrix } from '../domain/stance.ts';
import { presentShare } from './way.ts';

/**
 * How a group orders what stands in it as it is drawn: by each object's zIndex, the higher over the lower and as they
 * came where it is alike, so a stack's layers stand as the film lays them however the group leans; or by depth, the
 * farther behind the nearer, for a ring whose near side changes as it turns.
 */
const GROUP_ORDERS = ['zIndex', 'depth'] as const;

export type GroupOrder = (typeof GROUP_ORDERS)[number];

/**
 * A group: where it stands on the frame, its box in the frame's pixels and how it stands about the box's middle
 * (`src/domain/placement.ts`), how far it has gone, and how it orders what stands in it.
 */
export interface Group extends Placement {
	readonly gone: Fraction;
	readonly order: GroupOrder;
}

export const A_GROUP_ORDER: Kind<GroupOrder> = new OneOf(
	GROUP_ORDERS,
	'how a group orders what stands in it: "zIndex", each by its zIndex, or "depth", the farther behind the nearer'
);

/** Groups by name. */
export type Groups = ReadonlyMap<GroupName, Group>;

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

/** How much of what stands in a group the group lets show: all of it, but as far as it has gone. */
export function groupShare(group: Group): number {
	return presentShare({ shown: WHOLE, gone: group.gone });
}
