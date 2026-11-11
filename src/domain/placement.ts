/**
 * Where anything stands, said one way: a placement — a box and a stance (`src/domain/stance.ts`) — in a holder, worked
 * out by one function for every holder, so the window, an object, a group and a thing stand by the same arithmetic and
 * a new holder is a case of `planeOf`, not of every function that asks where something stands.
 *
 * Every holder is a plane: the frame, which rides with the eye and is seen as from where it rests; the world, which the
 * eye moves past; the page's window, a placement in the world, in its box's own pixels; the page in it, the window's
 * plane with a box of the screen framed onto it as the camera frames the page; over the page, that plane standing in the
 * world, where what stands on it stands off it as freely as in the world, as a piece falls onto a block; a group of
 * objects, a placement on the frame, in its box's pixels from its corner; a point of the screen or of an object, the
 * frame's plane in its pixels
 * from where the eye sees that point on each frame, which words beside a part stand on; and a block's scroll, the
 * world's plane carried up as far as the film scrolls the block, which a piece lifted off it rides. Something placed
 * on a plane stands about its box's middle as the plane's stance carries it there and as its own stance does. The flat
 * stage lays it in the frame, seen from the eye in perspective about its box's middle, or, on the window's plane, in
 * the window, by those stances alone, as the window's element carries what is laid in it; the room reads where it
 * stands in the eye's own space. Where a point of anything placed is seen on the frame is one function,
 * `pointOnTheFrame`, which the motion blur, a lens, a note, the pins and a piece's lines read through the camera's
 * module or the object's, and a point of the screen `onTheFrame`. Something carried from one holder into another, a
 * piece from the world over the page or an object joining a leant group, is placed there where it stood by one function
 * too, `carriedInto`; and something on the frame's plane, which rides with the eye, handed into the world where the
 * eye sees it, as far before the eye as what it stands on, by `handedIntoTheWorld`.
 *
 * The camera's module builds on this one, as it reads where the window stands; this one reads of the camera only how
 * it frames the page in its view (`src/domain/framing.ts`), and holds the arithmetic of a box about its middle on the
 * frame's plane, which both use.
 *
 * Each matrix is chained in the one order its products have always had, the plane's stance about the box's middle
 * before the box's own and the eye after both: chained otherwise, an entry moves by its last bit, and a box a move
 * works out from it, a slide past the frame's edge, moves with it.
 */
import type { Camera, View } from './camera.ts';
import { type Eye, eyeAtRest, inTheEyesSpace, seenByTheEye, turnOf } from './eye.ts';
import { boxInTheView, boxOfTheScreenIn, pointInTheView } from './framing.ts';
import {
	type Box,
	HALVES,
	type Point,
	type Size,
	boxCentredOn,
	boxOf,
	middleX,
	middleY,
	placedFrom,
	pointAt
} from './geometry.ts';
import {
	ITS_MIDDLE,
	type Matrix,
	type Spot,
	carried,
	chained,
	crossOf,
	dotOf,
	inThreesAxes,
	inverseOf,
	lengthOf,
	scalingAlong,
	translation,
	unitOf,
	wayBetween,
	waysAlongItsPlane
} from './matrix.ts';
import {
	AS_PLACED,
	type Stance,
	type Transform,
	middleMovedBy,
	stanceCarriedBy,
	stanceMatrix,
	transformOf
} from './stance.ts';

/** Where something stands on the plane of what holds it: its box, in that plane's own pixels, and its stance. */
export interface Placement extends Stance {
	readonly box: Box;
}

/** The name a film gives a group of objects. */
export type GroupName = string;

/**
 * What a placement is read in: one that lasts the whole film; a group of objects by its name, with the zIndex of what
 * stands in it there, how high it is drawn among the others of the group, where the film names one, a group going with
 * what stands in it; a point of something that stands in the world, where the eye sees it on the frame as each frame
 * is drawn, which words beside a part stand off; or the world as a block of the page scrolls it, which carries what
 * rides it up the world as far as the film scrolls the block, so a piece lifted off the block rides it.
 */
export type Holder =
	| LastingHolder
	| { readonly kind: 'group'; readonly name: GroupName; readonly zIndex: number | null }
	| { readonly kind: 'point'; readonly of: PointOf }
	| { readonly kind: 'scroll'; readonly ride: Ride };

/**
 * How far the film has scrolled each block of the page it scrolls by `page.scrollBy` or `page.scrollTo`, by the
 * selector it names the block by: down its scroll, in the page's pixels, from where the block stood as the film began.
 */
export type Scrolled = ReadonlyMap<string, number>;

/**
 * What something riding a block's scroll rides: the selector the film names the block by, how far the film had
 * scrolled it as the rider was placed on it, in the page's pixels, and how many of the world's pixels a pixel of the
 * screen took then, as the camera showed the page from the eye at rest, which a pixel of the scroll carries the rider.
 */
export interface Ride {
	readonly scroller: string;
	readonly from: number;
	readonly scale: number;
}

/**
 * A point of something that stands in the world: of the page's screen, in its pixels, or of an object by its name, in
 * shares of its box, wherever it stands and however it moves.
 */
type PointOf =
	| { readonly kind: 'screen'; readonly at: Point }
	| { readonly kind: 'object'; readonly name: string; readonly share: Point };

/**
 * A point of something that stands in the world, as a frame is drawn: what it is a point of, placed, and the point, in
 * the pixels of its box from that box's top left corner.
 */
interface PointStanding {
	readonly on: Placed;
	readonly at: Point;
}

/**
 * A holder whose plane is the frame's own, riding with the eye: the frame itself, or a point that plane stands off; not
 * a group, whose plane stands as the group does.
 */
export type OnTheFramesPlane = Extract<Holder, { readonly kind: 'frame' | 'point' }>;

/** Where something stands that a holder can be read off: its placement, and what it stands in. */
interface HeldPlacement extends Placement {
	readonly inside: Holder;
}

/**
 * What a placement is read in that lasts the whole film, its plane worked out from the camera alone: the frame, which
 * rides with the eye, the world, which the eye moves through, the page's window, the page in it, or the page's plane
 * standing in the world, over the page, which carries what stands on it as the camera frames the page and the window
 * stands, as the page in the window does, while it stands in the world, off that plane as freely as anywhere there.
 */
export type LastingHolder =
	| { readonly kind: 'frame' }
	| { readonly kind: 'world' }
	| { readonly kind: 'window' }
	| { readonly kind: 'page' }
	| { readonly kind: 'overThePage' };

/**
 * What the flat stage lays something in: the frame; or the page's window, placed in the world, which carries what is
 * laid in it as it stands.
 */
type LaidIn = { readonly kind: 'frame' } | { readonly kind: 'window'; readonly window: Placed };

/** What a plane rides with: the eye, for the frame and what stands on it; else the world, which the eye moves past. */
type Rider = 'eye' | 'world';

/**
 * What holders are read off as a frame is drawn: the camera, which shows the window and frames the page in it, where
 * each group standing stands, where each object standing stands, by its name, and how far the film has scrolled each
 * block it scrolls, which carries what rides the block.
 */
export interface Holders {
	readonly camera: Camera;
	readonly groups: ReadonlyMap<GroupName, Placement>;
	readonly objects: ReadonlyMap<string, HeldPlacement>;
	readonly scrolled: Scrolled;
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
	readonly laidIn: LaidIn;
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
	readonly laidIn: LaidIn;
	readonly laid: Box;
	readonly stood: Matrix;
	readonly placing: Matrix;
	readonly inTheEyesSpace: Matrix;
	readonly rides: Rider;
}

/**
 * Where something placed stands, as the stage lays it: on the frame, riding with the eye; in the world, laid in the
 * frame while the eye moves past it, where the eye's focus blurs it by where it stands and the room stands it in its
 * one scene; or in the page's window, whose element carries it, and whose blur takes it with it.
 */
export type StandsIn = 'frame' | 'world' | 'window';

/**
 * Something placed, as the stage draws it: where it stands, its box in what the flat stage lays it in, the frame or the
 * window, and how it draws it about that box's middle (`src/domain/stance.ts`); and the matrix that carries a spot of
 * it, from its middle, into the eye's own space in three's axes, where the room stands it.
 */
export interface DrawnPlacement {
	readonly standsIn: StandsIn;
	readonly box: Box;
	readonly transform: Transform;
	readonly inTheEyesSpace: Matrix;
}

// Where something stands that a film shows inside nothing, one it shows inside the page's window or the world, one
// carried onto a block of the page from the frame, and one carried there from the world
export const ON_THE_FRAME: LastingHolder = { kind: 'frame' };
export const IN_THE_WINDOW: LastingHolder = { kind: 'window' };
export const IN_THE_WORLD: LastingHolder = { kind: 'world' };
export const ON_THE_PAGE: LastingHolder = { kind: 'page' };
export const OVER_THE_PAGE: LastingHolder = { kind: 'overThePage' };

// How far out of its own plane a spot of a box's plane stands
export const ON_ITS_PLANE = 0;

// A box read on its plane as it is; something laid in the frame; and the size of a point's box, whose corner is the
// point, as a box on its plane is measured from that
const AS_IT_IS: Measure = { kind: 'asItIs' };
const IN_THE_FRAME: LaidIn = { kind: 'frame' };
const NO_SIZE: Size = { width: 0, height: 0 };
// Two things laid in the order they come; and how much farther from the eye one plane may stand than another, in the
// frame's pixels, while the two are taken as one plane, and how far two planes' facings may stand apart, as a sine,
// while they are taken to face alike: arithmetic leaves under a millionth of a pixel and 1e-12
const AS_THEY_COME = 0;
const ON_ONE_PLANE_WITHIN = 1e-6;
const FACING_ALIKE_WITHIN = 1e-9;
// The way out of a face, toward three's z, from its middle; and the sign of a way's share along another that turns
// from it
const A_UNIT_OUT: Spot = { across: 0, down: 0, out: 1 };
const TURNED_AWAY = 0;
// How far the film has scrolled a block it never scrolled
const NOT_SCROLLED = 0;
// How far before the eye a spot stands at the eye
const AT_THE_EYE = 0;

/**
 * The plane of a holder, as the holders stand: a group's, the frame's carried by the group's box and stance; a point's,
 * the frame's, its corner where the eye sees the point now, so what stands off it rides with the eye and goes with the
 * point as the point moves on the frame; a block's scroll's, the world's carried up it as far as the film has scrolled
 * the block since the ride began, as many of its pixels a pixel of the scroll as the ride's scale.
 */
export function planeOf(holder: Holder, holders: Holders, frame: Size): Plane {
	switch (holder.kind) {
		case 'group': {
			const group = groupNamed(holders.groups, holder.name);
			return { ...lastingPlaneOf(ON_THE_FRAME, holders.camera, frame), box: group.box, stance: group };
		}
		case 'point': {
			const corner = pointSeenOnTheFrame(holder.of, holders, frame);
			return { ...lastingPlaneOf(ON_THE_FRAME, holders.camera, frame), box: { ...corner, ...NO_SIZE } };
		}
		case 'scroll': {
			const world = lastingPlaneOf(IN_THE_WORLD, holders.camera, frame);
			const carriedUp = scrolledSince(holder.ride, holders.scrolled) * holder.ride.scale;
			return { ...world, box: { ...world.box, top: world.box.top - carriedUp } };
		}
		case 'frame':
		case 'world':
		case 'window':
		case 'page':
		case 'overThePage':
			return lastingPlaneOf(holder, holders.camera, frame);
	}
}

/** Where the eye sees a point of something that stands in the world on the frame, as the holders stand. */
function pointSeenOnTheFrame(point: PointOf, holders: Holders, frame: Size): Point {
	const standing = pointStanding(point, holders, frame);
	return pointOnTheFrame(standing.on, standing.at);
}

/**
 * A point of something that stands in the world, as the holders stand: of the screen, on the page's window where the
 * camera frames it; of an object, on the object as it stands in what it stands in.
 */
function pointStanding(point: PointOf, holders: Holders, frame: Size): PointStanding {
	switch (point.kind) {
		case 'screen':
			return screenPointStanding(holders.camera, frame, point.at);
		case 'object': {
			const object = objectNamed(holders.objects, point.name);
			const standing = placed(object, planeOf(object.inside, holders, frame), frame);
			return { on: standing, at: pointAt(boxOf(standing.laid), point.share) };
		}
	}
}

/** How far the film has scrolled a block, by the selector it names the block by: none, where it never scrolled it. */
export function scrolledSoFar(scrolled: Scrolled, scroller: string): number {
	return scrolled.get(scroller) ?? NOT_SCROLLED;
}

/** How far the film has scrolled the block a ride rides since the ride began, in the page's pixels. */
function scrolledSince(ride: Ride, scrolled: Scrolled): number {
	return scrolledSoFar(scrolled, ride.scroller) - ride.from;
}

/**
 * A box of the screen as it stands now under something placed over it in a holder: riding a block's scroll, carried up
 * the screen as far as the film has scrolled the block since the ride began, as the block's own parts are; in any other
 * holder, as it is.
 */
export function screenBoxUnder(box: Box, holder: Holder, scrolled: Scrolled): Box {
	if (holder.kind !== 'scroll') return box;
	return { ...box, top: box.top - scrolledSince(holder.ride, scrolled) };
}

/**
 * Where a point of the screen stands on the frame from a camera: where the camera frames it in its view, carried as the
 * window stands and seen from the eye.
 */
export function onTheFrame(camera: Camera, frame: Size, point: Point): Point {
	const standing = screenPointStanding(camera, frame, point);
	return pointOnTheFrame(standing.on, standing.at);
}

/** A point of the screen from a camera: on the page's window where the camera frames it in its view. */
function screenPointStanding(camera: Camera, frame: Size, point: Point): PointStanding {
	return { on: windowInTheWorld(camera.view, camera.eye, frame), at: pointInTheView(camera, frame, point) };
}

/** The plane of a holder that lasts the whole film, as the camera shows the page and its eye sees. */
export function lastingPlaneOf(holder: LastingHolder, camera: Camera, frame: Size): Plane {
	switch (holder.kind) {
		case 'frame':
			return { ...worldSeenBy(eyeAtRest(camera.eye.focalLength), frame), rides: 'eye' };
		case 'world':
			return worldSeenBy(camera.eye, frame);
		case 'window':
			return windowsPlane(camera, frame);
		case 'page':
			return { ...windowsPlane(camera, frame), measures: { kind: 'framed', camera } };
		case 'overThePage':
			return pagesPlaneInTheWorld(camera, frame);
	}
}

/**
 * The page's plane standing in the world: the world's plane carried by the window's box and stance, as a group's is the
 * frame's, laid in the frame, a box of the screen read on it as the camera frames the page in the window; so what
 * stands on it stands over the page as the window carries what lies in it, and the room draws it in its one scene.
 */
function pagesPlaneInTheWorld(camera: Camera, frame: Size): Plane {
	const world = worldSeenBy(camera.eye, frame);
	return { ...world, box: camera.view.box, stance: camera.view, measures: { kind: 'framed', camera } };
}

/** The world as an eye sees it: the frame's plane, laid in the frame, the eye moving past it. */
function worldSeenBy(eye: Eye, frame: Size): Plane {
	return {
		laidIn: IN_THE_FRAME,
		rides: 'world',
		eye,
		box: boxOf(frame),
		stance: AS_PLACED,
		measures: AS_IT_IS,
		inTheEyesSpace: inTheEyesSpace(eye, frame)
	};
}

/** The page's window where it stands: the camera's view placed in the world, seen by an eye. */
export function windowInTheWorld(view: View, eye: Eye, frame: Size): Placed {
	return placed(view, worldSeenBy(eye, frame), frame);
}

/**
 * Whether the eye sees a face, by the matrix that carries the face's middle into the eye's own space: the eye stands at
 * that space's middle, on the side the face looks out to; edge-on, it sees neither.
 */
export function facesTheEye(intoTheEyesSpace: Matrix): boolean {
	const middle = carried(intoTheEyesSpace, ITS_MIDDLE);
	const outward = wayBetween(middle, carried(intoTheEyesSpace, A_UNIT_OUT));
	return dotOf(outward, middle) < TURNED_AWAY;
}

/**
 * The page's window's own plane, in its box's own pixels, laid in the window, whose element carries what is laid in it
 * as the window stands in the world.
 */
function windowsPlane(camera: Camera, frame: Size): Plane {
	const window = windowInTheWorld(camera.view, camera.eye, frame);
	return {
		laidIn: { kind: 'window', window },
		rides: 'world',
		eye: camera.eye,
		box: boxOf(camera.view.box),
		stance: AS_PLACED,
		measures: AS_IT_IS,
		inTheEyesSpace: window.inTheEyesSpace
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
	const own = chained([
		aboutTheMiddleOf(stanceMatrix(plane.stance, plane.box), onThePlane, plane.box),
		stanceMatrix(placement, onThePlane)
	]);
	const standing = { laidIn: plane.laidIn, laid, rides: plane.rides };
	switch (plane.laidIn.kind) {
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

/**
 * A placement in one holder carried into another, standing where it stood as the holders stand: the matrix that carries
 * it into the eye's own space read on the other's plane, and taken apart there into a box as large in what it is laid
 * in as it was and a stance (`stanceCarriedBy`), each value of its angle at its nearest whole turn to where it stood,
 * turning about the point of its box it turned about, the box's middle where the matrix carries it, less how far that
 * stance moves it. None where the other's plane would stretch it: grown and leant from where it
 * stands at once, as a plane grows across and down alone. Every matrix here carries into the eye's own space, before
 * the eye sees anything in perspective, so no plane is ever seen edge-on.
 */
export function carriedInto(
	placement: Placement,
	from: Holder,
	to: Holder,
	holders: Holders,
	frame: Size
): Placement | null {
	const standing = placed(placement, planeOf(from, holders, frame), frame);
	return standingOn(planeOf(to, holders, frame), standing.inTheEyesSpace, placement, standing.laid, frame);
}

/**
 * A placement on the frame's own plane handed into the world, standing where the eye sees it now: carried along the
 * eye's sight, about the eye, from the frame's plane to as far before the eye as what it stands on, so it stands as
 * large on the frame as it stood, square to the eye as the frame is. On the frame, what it stands on is the frame's
 * plane, so it stands there; beside a point, the point, so words beside a part stand beside it in the world too. None
 * where that point stands at the eye or behind it.
 */
export function handedIntoTheWorld(
	placement: Placement,
	from: OnTheFramesPlane,
	holders: Holders,
	frame: Size
): Placement | null {
	const plane = planeOf(from, holders, frame);
	const standing = placed(placement, plane, frame);
	const depth = depthBeforeTheEye(spotItStandsOn(from, plane, holders, frame));
	if (depth <= AT_THE_EYE) return null;
	const timesAsFar = depth / depthBeforeTheEye(carried(plane.inTheEyesSpace, ITS_MIDDLE));
	const alongTheSight = chained([scalingAlong(timesAsFar, timesAsFar, timesAsFar), standing.inTheEyesSpace]);
	const world = lastingPlaneOf(IN_THE_WORLD, holders.camera, frame);
	const handed = standingOn(world, alongTheSight, placement, standing.laid, frame);
	// Grown alike every way about the eye, it stands unstretched on the world's plane, which faces the frame unstretched
	if (handed === null) throw new Error('a placement handed into the world would stand stretched there');
	return handed;
}

/**
 * The spot, in the eye's own space, of what a placement on the frame's own plane stands on: the plane's middle, on the
 * frame; the point, beside one.
 */
function spotItStandsOn(holder: OnTheFramesPlane, plane: Plane, holders: Holders, frame: Size): Spot {
	switch (holder.kind) {
		case 'frame':
			return carried(plane.inTheEyesSpace, ITS_MIDDLE);
		case 'point': {
			const point = pointStanding(holder.of, holders, frame);
			return carried(point.on.inTheEyesSpace, fromItsMiddle(point.on.laid, point.at));
		}
	}
}

/**
 * A placement standing on a plane where the matrix that carries it into the eye's own space carries it, a box as large
 * in what it is laid in as `laid` and a stance, as `carriedInto` has it; none where the plane would stretch it.
 */
function standingOn(
	plane: Plane,
	inTheEyesSpace: Matrix,
	placement: Placement,
	laid: Box,
	frame: Size
): Placement | null {
	const onThePlane = chained([inverseOf(ownSpaceOf(plane, frame)), inTheEyesSpace]);
	const stance = stanceCarriedBy(onThePlane, placement, laid);
	if (stance === null) return null;
	// Where the box's middle stands on the plane: where the matrix carries it, less how far the stance moves it
	const middle = wayBetween(middleMovedBy(stance, laid), carried(onThePlane, ITS_MIDDLE));
	const laidMiddle = { left: plane.box.width / HALVES + middle.across, top: plane.box.height / HALVES + middle.down };
	return { ...stance, box: boxOfItsHolder(boxCentredOn(laidMiddle, laid), plane.measures, frame) };
}

/**
 * The matrix that carries a spot of a plane, from its box's middle in its own pixels, into the eye's own space: the
 * plane's middle in what it is laid in, then its stance. `placed` chains the same products with a placement's own in
 * each holder's order of before, which keeps the stage's bytes, so it does not build on this.
 */
function ownSpaceOf(plane: Plane, frame: Size): Matrix {
	return chained([
		plane.inTheEyesSpace,
		translation(middleInTheRoom(plane.box, sizeOfWhatItIsLaidIn(plane.laidIn, frame))),
		stanceMatrix(plane.stance, plane.box)
	]);
}

/** The size of what the flat stage lays something in: the frame, or the window's box. */
function sizeOfWhatItIsLaidIn(laidIn: LaidIn, frame: Size): Size {
	switch (laidIn.kind) {
		case 'frame':
			return frame;
		case 'window':
			return laidIn.window.laid;
	}
}

/** Something placed as the stage draws it: flat or leant as how it stands before the eye has it, in three's axes. */
export function drawnPlacement(standing: Placed): DrawnPlacement {
	return {
		standsIn: whereItStands(standing),
		box: standing.laid,
		transform: transformOf(standing.stood, standing.placing),
		inTheEyesSpace: inThreesAxes(standing.inTheEyesSpace)
	};
}

/** Where something placed stands: by what it is laid in, and, laid in the frame, by what it rides with. */
export function whereItStands(standing: Placed): StandsIn {
	switch (standing.laidIn.kind) {
		case 'frame':
			return standing.rides === 'world' ? 'world' : 'frame';
		case 'window':
			return 'window';
	}
}

/**
 * Where a point of something placed, in its box's pixels from the top left corner, stands on the frame: carried about
 * the box's middle as it is drawn in what it is laid in, and, laid in the window, on as the window is drawn, so where
 * the engine sees a point is where the stage draws it.
 */
export function pointOnTheFrame(standing: Placed, point: Point): Point {
	const drawn = carriedAboutItsMiddle(standing.placing, standing.laid, point);
	switch (standing.laidIn.kind) {
		case 'frame':
			return drawn;
		case 'window':
			return pointOnTheFrame(standing.laidIn.window, drawn);
	}
}

/**
 * Where a point of a box, in its pixels from the box's top left corner, stands once a matrix carries it about the box's
 * middle, as CSS carries an element about its middle: in the pixels the box is placed in.
 */
export function carriedAboutItsMiddle(matrix: Matrix, box: Box, point: Point): Point {
	const spot = carried(matrix, fromItsMiddle(box, point));
	return { left: middleX(box) + spot.across, top: middleY(box) + spot.down };
}

/** A point of a box, in its pixels from the box's top left corner, as a spot of its plane from the box's middle. */
export function fromItsMiddle(box: Size, point: Point): Spot {
	return { across: point.left - box.width / HALVES, down: point.top - box.height / HALVES, out: ON_ITS_PLANE };
}

/**
 * Where the middle of a box on the frame, or in anything else it stands in, stands in the room: across and down from
 * that's middle, on its plane.
 */
export function middleInTheRoom(box: Box, frame: Size): Spot {
	return {
		across: middleX(box) - frame.width / HALVES,
		down: middleY(box) - frame.height / HALVES,
		out: ON_ITS_PLANE
	};
}

/**
 * The matrix that carries what stands in a box on the frame's plane, about the box's middle, to where an eye sees it:
 * at rest, from before the frame's middle, a nearer spot larger and farther from that middle.
 */
export function seenFromTheEye(box: Box, eye: Eye, frame: Size): Matrix {
	return aboutTheMiddleOf(seenByTheEye(eye, frame), box, frame);
}

/**
 * The matrix that carries what stands in a box on the frame's plane, about the box's middle, into the eye's own space
 * (`inTheEyesSpace`): where it stands before `seenFromTheEye` sees it in perspective.
 */
export function inTheEyesSpaceAbout(box: Box, eye: Eye, frame: Size): Matrix {
	return chained([inTheEyesSpace(eye, frame), translation(middleInTheRoom(box, frame))]);
}

/**
 * A matrix that acts about the middle of what a box stands in, as a matrix about the box's own middle: moved from the
 * box's middle to that middle, acted, and moved back.
 */
function aboutTheMiddleOf(matrix: Matrix, box: Box, within: Size): Matrix {
	const middle = middleInTheRoom(box, within);
	return chained([
		translation({ across: -middle.across, down: -middle.down, out: ON_ITS_PLANE }),
		matrix,
		translation(middle)
	]);
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

/** A box of a plane's own pixels in its holder's: as it is, or, on the page, the box of the screen the camera frames there. */
function boxOfItsHolder(box: Box, measure: Measure, frame: Size): Box {
	switch (measure.kind) {
		case 'asItIs':
			return box;
		case 'framed':
			return boxOfTheScreenIn(measure.camera, frame, box);
	}
}

/**
 * How two things placed are laid one over the other where neither hides the other by depth, as the room lays what is
 * seen through: the farther first. Of two whose planes face alike or opposite ways, the farther is the one whose plane
 * stands farther from the eye, wherever on its plane each stands: a middle seen from aside stands farther before the
 * eye than another on a plane behind it. So two on one plane are laid as they come, the later over the earlier,
 * wherever the eye stands. Of two whose planes cross, the farther is the one whose middle stands farther before the eye
 * along where it looks. Less than none where the first is laid first, none where they keep the order they come in.
 */
export function laidFartherFirst(first: Placed, second: Placed): number {
	const firstFacing = facingOf(first.inTheEyesSpace);
	const secondFacing = facingOf(second.inTheEyesSpace);
	if (lengthOf(crossOf(firstFacing, secondFacing)) > FACING_ALIKE_WITHIN) {
		return depthOfItsMiddle(second) - depthOfItsMiddle(first);
	}
	const fartherPlane = eyesDistanceToItsPlane(second, secondFacing) - eyesDistanceToItsPlane(first, firstFacing);
	return Math.abs(fartherPlane) <= ON_ONE_PLANE_WITHIN ? AS_THEY_COME : fartherPlane;
}

/** How far the eye stands from the plane of something placed, which faces this way, in the frame's pixels. */
function eyesDistanceToItsPlane(standing: Placed, facing: Spot): number {
	return Math.abs(dotOf(facing, carried(standing.inTheEyesSpace, ITS_MIDDLE)));
}

/** The way a plane carried into the eye's own space faces, as long as one: square to its across and its down. */
function facingOf(inTheEyesSpace: Matrix): Spot {
	const ways = waysAlongItsPlane(inTheEyesSpace);
	return unitOf(crossOf(ways.across, ways.down));
}

/** How far before the eye the middle of something placed stands along where it looks, in the frame's pixels. */
function depthOfItsMiddle(standing: Placed): number {
	return depthBeforeTheEye(carried(standing.inTheEyesSpace, ITS_MIDDLE));
}

/** How far before the eye a spot of its own space stands along where it looks, in the frame's pixels. */
function depthBeforeTheEye(spot: Spot): number {
	return -spot.out;
}

/** The group of a name something stands in: none is gone while anything stands in it, as it goes with all of it. */
export function groupNamed<Group extends Placement>(groups: ReadonlyMap<GroupName, Group>, name: GroupName): Group {
	const group = groups.get(name);
	if (group === undefined) throw new Error(`an object stands in the group "${name}", which is gone`);
	return group;
}

/** The object of a name something stands beside: none is gone while anything stands beside it, as it goes with it. */
function objectNamed(objects: ReadonlyMap<string, HeldPlacement>, name: string): HeldPlacement {
	const object = objects.get(name);
	if (object === undefined) throw new Error(`an object stands beside the ${name}, which is gone`);
	return object;
}
