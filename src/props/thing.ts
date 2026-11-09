/**
 * A thing: a film's own, built in three.js by a module the film names (`defineFilm({ things })`), for what no prop of
 * livereel's draws and three draws in a few tens of lines — an end card standing in the world, a sheen, a sheet leant
 * on the page. It is what an object shows (`src/props/object.ts`), so it stands at a place, on the frame or in the
 * world, travels, grows, comes near and turns as any object does. How far it reaches across and up from its middle is
 * the film's, `reach`, in pixels of a frame 1080 high: its box is that footprint about the place's middle, from whose
 * middle it is built, one of its units a pixel of a frame 1080 high; the box's corners say how far it moves for the
 * motion blur and how near the eye's focus it stands. What it shows is the film's: numbers by name, `values`, handed
 * to its module each frame, which sets the three objects it built whole from them and from how far it has come up, and
 * keeps nothing else; a move of its numbers moves nothing the motion blur counts.
 *
 * The room draws a thing alone, carried about its box's middle into the eye's own space, written in three's own axes,
 * up the frame, so its faces turn as three's do, and seen from there in perspective; as soft as the eye's focus draws
 * its box's point nearest the focus; and, in the world, parted by the page's window, what stands behind it laid under
 * the window and what stands before it over. On the frame, as a caption does, it rides with the eye, stays
 * sharp and stands before the window.
 */
import { type Sharpness, outOfFocusOnTheFrame } from '../domain/focus.ts';
import { type Box, type Size, frameScaleOf } from '../domain/geometry.ts';
import { A_NUMBER, A_SIZE, type Kind, OfForm, RecordOf, needed } from '../domain/handed.ts';
import { type Matrix, chained, inThreesAxes, scalingAlong } from '../domain/matrix.ts';
import { between } from '../domain/toward.ts';

/** A thing's numbers by name, as its module reads them. */
export type ThingValues = Readonly<Record<string, number>>;

/** How far a thing reaches across and up, whole, in pixels of a frame 1080 high: its footprint on the frame. */
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
 * A thing as the stage draws it: the name its module builds it by, its numbers, how far it has come up and not gone in
 * its own way, from 0 to 1; the matrix that carries a point of it, in three's own axes — x across, y up, z toward the
 * eye — in pixels of a frame 1080 high from its box's middle, into the eye's own space in the frame's pixels, in
 * three's axes too, the eye at its middle looking down its z; the matrix that carries the room, about the frame's
 * middle in its pixels, into the same space, in three's axes, where the world's lights stand
 * (`src/props/lighting.ts`); how far the eye stands before the frame, in the frame's pixels, which the stage sees it
 * in perspective from; how soft the eye's focus draws it on the frame, in pixels of a frame 1080 high, none where
 * sharp; and whether it stands in the world, where the page's window parts it.
 */
export interface DrawnThing {
	readonly kind: 'thing';
	readonly made: string;
	readonly values: ThingValues;
	readonly shown: number;
	readonly inTheEyesSpace: Matrix;
	readonly roomInTheEyesSpace: Matrix;
	readonly eyeDistance: number;
	readonly outOfFocus: number | null;
	readonly inTheWorld: boolean;
}

/** What stands round a thing as it is drawn: how sharp the eye sees, and the frame. */
export interface AroundAThing {
	readonly sharpness: Sharpness;
	readonly frame: Size;
}

/**
 * How a thing stands as it is drawn: its box; the matrices that carry it about the box's middle to where the eye sees
 * it on the frame and into the eye's own space, each of which grows it across and down alone, as an object's stance
 * does; the matrix that carries the room into that eye's own space; how much its stance grows it; and where it stands.
 */
export interface ThingStanding {
	readonly laid: Box;
	readonly placing: Matrix;
	readonly inTheEyesSpace: Matrix;
	readonly roomInTheEyesSpace: Matrix;
	readonly scale: number;
	readonly inTheWorld: boolean;
}

/** A thing's numbers by name, as a film hands them. */
export const THING_VALUES = new RecordOf(A_NUMBER, "numbers by name, as the thing's module reads them");
/** How far a thing reaches, as a film hands it. */
export const A_REACH: Kind<Reach> = new OfForm<Reach>(
	{ width: needed(A_SIZE), height: needed(A_SIZE) },
	'how far it reaches, whole: { width, height }, in pixels of a frame 1080 high'
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
 * A thing as the stage draws it, standing as it does, as far as it has come up and not gone, among what stands round
 * it: the eye's own space it stands in written in three's axes, the frame's pixels out of three's units, so it turns a
 * face as it turns, grown toward the eye as much as across, as a stance grows a flat object across and down alone, and
 * in the world blurred as the focus has its box.
 */
export function drawnThing(thing: Thing, standing: ThingStanding, shown: number, around: AroundAThing): DrawnThing {
	const scale = frameScaleOf(around.frame);
	const outOfFocus = standing.inTheWorld
		? outOfFocusOnTheFrame(standing.placing, standing.laid, around.sharpness, around.frame)
		: null;
	const units = scalingAlong(scale, scale, scale * standing.scale);
	return {
		kind: 'thing',
		made: thing.made,
		values: thing.values,
		shown,
		inTheEyesSpace: chained([inThreesAxes(standing.inTheEyesSpace), units]),
		roomInTheEyesSpace: inThreesAxes(standing.roomInTheEyesSpace),
		eyeDistance: around.sharpness.focalLength * scale,
		outOfFocus,
		inTheWorld: standing.inTheWorld
	};
}
