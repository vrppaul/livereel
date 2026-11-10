/**
 * Where anything stands, said one way: a placement — a box and a stance (`src/domain/stance.ts`) — in a holder, worked
 * out by one function for every holder, so the window, an object, a group and a thing stand by the same arithmetic and
 * a new holder is a case of `planeOf`, not of every function that asks where something stands.
 *
 * Every holder is a plane: the frame, which rides with the eye and is seen as from where it rests; the world, which the
 * eye moves past; the page's window, a placement in the world, in its box's own pixels; the page in it, the window's
 * plane with a box of the screen framed onto it as the camera frames the page; and a group of objects, a placement on
 * the frame, in its box's pixels from its corner. Something placed on a plane stands about its box's middle as the
 * plane's stance carries it there and as its own stance does. The flat stage lays it in the frame, seen from the eye
 * in perspective about its box's middle, or, on the window's plane, in the window, by those stances alone, as the
 * window's element carries what is laid in it; the room reads where it stands in the eye's own space.
 *
 * Each matrix is chained in the one order its products have always had, the plane's stance about the box's middle
 * before the box's own and the eye after both: chained otherwise, an entry moves by its last bit, and a box a move
 * works out from it, a slide past the frame's edge, moves with it.
 */
import { type Camera, aboutTheMiddleOf, boxInTheView, middleInTheRoom, seenFromTheEye } from './camera.ts';
import { type Eye, eyeAtRest, inTheEyesSpace, turnOf } from './eye.ts';
import { type Box, type Size, boxOf, placedFrom } from './geometry.ts';
import { type Matrix, chained, inThreesAxes, translation } from './matrix.ts';
import { AS_PLACED, type Stance, type Transform, stanceMatrix, transformOf } from './stance.ts';

/** Where something stands on the plane of what holds it: its box, in that plane's own pixels, and its stance. */
export interface Placement extends Stance {
	readonly box: Box;
}

/** The name a film gives a group of objects. */
export type GroupName = string;

/**
 * What a placement is read in: the frame, which rides with the eye, the world, which the eye moves through, the page's
 * window, the page in it, or a group of objects by its name, with the zIndex of what stands in it there, how high it
 * is drawn among the others of the group, where the film names one.
 */
export type Holder =
	| { readonly kind: 'frame' }
	| { readonly kind: 'world' }
	| { readonly kind: 'window' }
	| { readonly kind: 'page' }
	| { readonly kind: 'group'; readonly name: GroupName; readonly zIndex: number | null };

/** What the flat stage lays something in: the frame, or the page's window, which carries what is laid in it. */
type Laid = 'frame' | 'window';

/** What a plane rides with: the eye, for the frame and what stands on it; else the world, which the eye moves past. */
type Rider = 'eye' | 'world';

/**
 * What holders are read off as a frame is drawn: the camera, which shows the window and frames the page in it, and
 * where each group standing stands.
 */
export interface Holders {
	readonly camera: Camera;
	readonly groups: ReadonlyMap<GroupName, Placement>;
}

/** How a box of a holder is read on its plane: in the plane's own pixels, or, on the page, framed by the camera there. */
type Measure = { readonly kind: 'asItIs' } | { readonly kind: 'framed'; readonly camera: Camera };

/**
 * A plane things stand on, as a frame is drawn: what the flat stage lays what stands on it in, what it rides with, the
 * eye it is seen by; its box in what it is laid in, whose pixels a box on it is measured in from its top left corner,
 * and how it stands about that box's middle, carrying what stands on it so; how a box of its holder is read on it; and
 * the matrix that carries a spot of what it is laid in, from that's middle, into the eye's own space (the eye at its
 * middle, the frame's pixels, across, down and out): the frame's, or the window's as it stands in the world.
 */
export interface Plane {
	readonly laidIn: Laid;
	readonly rides: Rider;
	readonly eye: Eye;
	readonly box: Box;
	readonly stance: Stance;
	readonly measures: Measure;
	readonly inTheEyesSpace: Matrix;
}

/**
 * Something placed, as a frame is drawn: what the flat stage lays it in and its box there; how it stands before the eye
 * about that box's middle, which the stage's transform is chosen by, and the matrix the flat stage draws it by about
 * that middle, each in what it is laid in; the matrix that carries a spot of it, from its middle, into the eye's own
 * space; and what it rides with.
 */
export interface Placed {
	readonly laidIn: Laid;
	readonly laid: Box;
	readonly stood: Matrix;
	readonly placing: Matrix;
	readonly inTheEyesSpace: Matrix;
	readonly rides: Rider;
}

/**
 * Something placed, as the stage draws it: what the flat stage lays it in, its box there and how it draws it about that
 * box's middle (`src/domain/stance.ts`); the matrix that carries a spot of it, from its middle, into the eye's own
 * space in three's axes, where the room stands it; and what it rides with, the eye or the world.
 */
export interface DrawnPlacement {
	readonly laidIn: Laid;
	readonly box: Box;
	readonly transform: Transform;
	readonly inTheEyesSpace: Matrix;
	readonly rides: Rider;
}

// Where something stands that a film shows inside nothing, one it shows inside the page's window or the world, and
// one carried onto a block of the page
export const ON_THE_FRAME: Holder = { kind: 'frame' };
export const IN_THE_WINDOW: Holder = { kind: 'window' };
export const IN_THE_WORLD: Holder = { kind: 'world' };
export const ON_THE_PAGE: Holder = { kind: 'page' };

// A box read on its plane as it is
const AS_IT_IS: Measure = { kind: 'asItIs' };

/** The plane of a holder, as the holders stand. */
export function planeOf(holder: Holder, holders: Holders, frame: Size): Plane {
	switch (holder.kind) {
		case 'frame':
			return { ...worldSeenBy(eyeAtRest(holders.camera.eye.focalLength), frame), rides: 'eye' };
		case 'world':
			return worldSeenBy(holders.camera.eye, frame);
		case 'window':
			return windowsPlane(holders.camera, frame);
		case 'page':
			return { ...windowsPlane(holders.camera, frame), measures: { kind: 'framed', camera: holders.camera } };
		case 'group': {
			const group = groupNamed(holders.groups, holder.name);
			return { ...planeOf(ON_THE_FRAME, holders, frame), box: group.box, stance: group };
		}
	}
}

/** The world as an eye sees it: the frame's plane, laid in the frame, the eye moving past it. */
export function worldSeenBy(eye: Eye, frame: Size): Plane {
	return {
		laidIn: 'frame',
		rides: 'world',
		eye,
		box: boxOf(frame),
		stance: AS_PLACED,
		measures: AS_IT_IS,
		inTheEyesSpace: inTheEyesSpace(eye, frame)
	};
}

/**
 * The page's window's own plane, in its box's own pixels, laid in the window, whose element carries what is laid in it
 * as the window stands in the world.
 */
function windowsPlane(camera: Camera, frame: Size): Plane {
	return {
		laidIn: 'window',
		rides: 'world',
		eye: camera.eye,
		box: boxOf(camera.view.box),
		stance: AS_PLACED,
		measures: AS_IT_IS,
		inTheEyesSpace: placed(camera.view, worldSeenBy(camera.eye, frame), frame).inTheEyesSpace
	};
}

/**
 * A placement on a plane as a frame is drawn: standing about its box's middle as the plane's stance carries it there
 * and as its own stance does; laid in the frame, carried into the eye's space from there and seen from the eye in
 * perspective about its box's middle; laid in the window, standing so in it, carried into the eye's space as the
 * window stands.
 */
export function placed(placement: Placement, plane: Plane, frame: Size): Placed {
	const onThePlane = boxOnThePlane(placement.box, plane.measures, frame);
	const laid = placedFrom(onThePlane, plane.box);
	const own = chained([aboutTheMiddleOf(stanceMatrix(plane.stance), onThePlane, plane.box), stanceMatrix(placement)]);
	const standing = { laidIn: plane.laidIn, laid, rides: plane.rides };
	switch (plane.laidIn) {
		case 'frame':
			return {
				...standing,
				stood: chained([turnOf(plane.eye), own]),
				placing: chained([seenFromTheEye(laid, plane.eye, frame), own]),
				inTheEyesSpace: chained([plane.inTheEyesSpace, translation(middleInTheRoom(laid, frame)), own])
			};
		case 'window':
			return {
				...standing,
				stood: own,
				placing: own,
				inTheEyesSpace: chained([plane.inTheEyesSpace, translation(middleInTheRoom(laid, plane.box)), own])
			};
	}
}

/** Something placed as the stage draws it: flat or leant as how it stands before the eye has it, in three's axes. */
export function drawnPlacement(standing: Placed): DrawnPlacement {
	return {
		laidIn: standing.laidIn,
		box: standing.laid,
		transform: transformOf(standing.stood, standing.placing),
		inTheEyesSpace: inThreesAxes(standing.inTheEyesSpace),
		rides: standing.rides
	};
}

/** A box of a holder in its plane's own pixels: as it is, or, on the page, framed by the camera in the window. */
function boxOnThePlane(box: Box, measure: Measure, frame: Size): Box {
	switch (measure.kind) {
		case 'asItIs':
			return box;
		case 'framed':
			return boxInTheView(measure.camera, frame, box);
	}
}

/** The group of a name something stands in: none is gone while anything stands in it, as it goes with all of it. */
export function groupNamed<Group extends Placement>(groups: ReadonlyMap<GroupName, Group>, name: GroupName): Group {
	const group = groups.get(name);
	if (group === undefined) throw new Error(`an object stands in the group "${name}", which is gone`);
	return group;
}
