/**
 * A thing: a film's own, built in three.js by a module the film names (`defineFilm({ things })`), for what no prop of
 * livereel's draws and three draws in a few tens of lines. It is what an object shows (`src/props/object.ts`). What is
 * its own, not its object's: `reach`, its footprint in film pixels about its middle, which is its box, one of its units
 * a film pixel; and its numbers, `values`, handed to its module every exposure, which sets the three objects it built
 * whole from them and from how far the thing has come up, and keeps nothing else.
 */
import { type Size, frameScaleOf } from '../domain/geometry.ts';
import { A_NUMBER, A_SIZE, type Kind, OfForm, RecordOf, needed } from '../domain/handed.ts';
import { type Matrix, chained, inThreesAxes, scalingAlong } from '../domain/matrix.ts';
import type { Placed } from '../domain/placement.ts';
import { between } from '../domain/toward.ts';

/** A thing's numbers by name, as its module reads them. */
export type ThingValues = Readonly<Record<string, number>>;

/** How far a thing reaches across and up, whole, in film pixels: its footprint on the frame. */
export interface Reach {
	readonly width: number;
	readonly height: number;
}

/** A thing: the name its module builds it by, how far it reaches, and its numbers. */
export interface Thing {
	readonly kind: 'thing';
	readonly made: string;
	readonly reach: Reach;
	readonly values: ThingValues;
}

/**
 * A thing as the stage draws it. The room blurs each point of it by how far it stands from the focus; its object's
 * softness, read by its box (`DrawnObject.softestOutOfFocus`), leaves out what it reaches toward or away from the eye
 * past the box's plane, which is the film's module's. Whether it stands in the world, where the eye sees it among the
 * window and every other thing there, is what its object rides.
 */
export interface DrawnThing {
	readonly kind: 'thing';
	readonly made: string;
	readonly values: ThingValues;
	/** How far it has come up and not gone in its own way, from 0 to 1. */
	readonly shown: number;
	/**
	 * The matrix that carries a point of it, in three's own axes — x across, y up, z toward the eye — in film pixels from
	 * its box's middle, into the eye's own space in the frame's pixels, in three's axes too, the eye at its middle
	 * looking down its z, the room standing there as the scene's eye hands it (`DrawnEye` in `src/domain/eye.ts`).
	 */
	readonly inTheEyesSpace: Matrix;
}

/** What stands round a thing as it is drawn: the frame. */
export interface AroundAThing {
	readonly frame: Size;
}

/** A thing's numbers by name, as a film hands them. */
export const THING_VALUES = new RecordOf(A_NUMBER, "numbers by name, as the thing's module reads them");
/** How far a thing reaches, as a film hands it. */
export const A_REACH: Kind<Reach> = new OfForm<Reach>(
	{ width: needed(A_SIZE), height: needed(A_SIZE) },
	'how far it reaches, whole: { width, height }, in film pixels'
);

/**
 * A thing's numbers `progress` of the way from those it showed to those a film names, each passing its ends with the
 * curve; a number the film names none for stays as it stood.
 */
export function valuesToward(start: ThingValues, named: ThingValues, progress: number): ThingValues {
	return Object.fromEntries(
		Object.entries(start).map(([name, from]) => [name, between(from, named[name] ?? from, progress)])
	);
}

/**
 * A thing as the stage draws it, placed as it stands (`src/domain/placement.ts`), grown by its stance's scale, as far
 * as it has come up and not gone, among what stands round it: the eye's own space it stands in written in three's axes,
 * the frame's pixels out of three's units, so it turns a face as it turns, grown toward the eye as much as across, as a
 * stance grows a flat object across and down alone. `thing.show` stands it on the frame or in the world alone.
 */
export function drawnThing(
	thing: Thing,
	standing: Placed,
	grown: number,
	shown: number,
	around: AroundAThing
): DrawnThing {
	const scale = frameScaleOf(around.frame);
	const units = scalingAlong(scale, scale, scale * grown);
	return {
		kind: 'thing',
		made: thing.made,
		values: thing.values,
		shown,
		inTheEyesSpace: chained([inThreesAxes(standing.inTheEyesSpace), units])
	};
}
