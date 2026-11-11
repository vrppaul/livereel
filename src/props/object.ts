/**
 * An object on the frame: something that stands in a box, grows, comes near, turns, comes up and goes, and shows what
 * it holds, its content — a title's words, a pane of code, an agent's terminal, the ending card, a piece of the page,
 * an outline round a part of it, a lens over it, a picture of the film's own (`src/props/picture.ts`), or a thing of
 * the film's own three.js (`src/props/thing.ts`), which
 * the room draws and the stage's markup does not. Where it stands, how it stands about its middle
 * (`src/domain/stance.ts`), how it stands out (`src/props/effects.ts`) and how far it has come and gone are the
 * object's, alike for every content, so a move that carries, leans, sets apart or slides one is written once
 * (`src/moves/object.ts`); what it shows, how that comes up in its box and what lights in it are its content's. Each of
 * where it stands, which way it faces, how it stands out and what it shows is set by its own moves, so moves of one
 * object that set different values share a step. A caption and keys are no objects: they lie over the frame alone, over
 * every object, props of the scene of their own (`src/props/caption.ts`, `src/props/keys.ts`).
 *
 * An object comes up and goes in its own way, as what it shows comes up of itself, or in a way of livereel's, faded,
 * masked, wiped, opened or grown (`src/props/way.ts`): then its figure — its words, its pane, the card's lines —
 * stands whole and comes as the way has it, while a ground it stands on comes in its own way.
 *
 * An object stands on the frame, in the world, inside the page's window, on the page in it, or in a group of objects
 * (`src/props/group.ts`). On the frame, as a caption does, it rides with the eye (`src/domain/eye.ts`) and is seen as
 * from where the eye rests, wherever it moves; in the world its box is the frame's plane's as the eye at rest sees it,
 * and the eye moves past it as it moves past the window, always drawn over the window, wherever it stands. Inside the
 * window, as a small window of code stands over the site's, its box is in the window's pixels, and it travels and leans
 * with the window, grows and rolls flat on it, shows no more than the screen does, and is cut at the window's edge, as
 * an element laid in another is on a page. On the page, as a piece carried
 * onto a block of it lies there, its box is in the screen's pixels, which the camera frames as it frames the page, so
 * it keeps its place on the screen wherever the camera goes, and lies inside the window as one there does. In a group
 * its box is in the group's pixels, and the group's stance carries its own, so it is drawn on the frame as the two make
 * one matrix, and shows as far as the group has not gone. The window and the page are one each, and never go; a group
 * goes with what stands in it.
 *
 * The object that came last stands over the rest, but the objects of a group stand together where the first of them
 * came, ordered as the film names: by each one's zIndex, the higher over the lower and as they came where it is alike,
 * so a stack's layers stand as the film lays them however the group leans; or, in a group ordered by depth, the farther
 * behind the nearer, so a ring of cards turning shows the near ones over the far.
 *
 * What a piece drawn from the page's picture, or a lens, shows of the page is the page as it stands; a piece that holds
 * its picture shows it as it stood as the piece was lifted. Each shows the holes other pieces leave in it
 * (`src/props/lifted.ts`) as they stand, so a piece of the whole screen under the pieces lifted off it shows where they
 * were.
 *
 * The eye's focus (`src/domain/focus.ts`) blurs an object in the world by where its middle stands; one inside the
 * window or on the page is blurred with the window it lies in, and one on the frame or in a group rides with the eye
 * and stays sharp, as words laid over a film do. Where the eye focuses to see an object sharp is where its middle
 * stands as the focus is put on it, in what it stands in, so the focus holds there as the eye, the window and the
 * camera move, and stays there as the object moves on.
 */
import { type Camera, ZOOM_AT_MOST } from '../domain/camera.ts';
import type { Focus } from '../domain/eye.ts';
import {
	type Sharpness,
	distanceOfItsMiddle,
	outOfFocusBeforeItsMatrix,
	softestOutOfFocusSeen
} from '../domain/focus.ts';
import type { Fraction } from '../domain/fraction.ts';
import type { PartAsked, SharperPicture } from '../domain/picture.ts';
import {
	type Box,
	CORNER_SHARES,
	type FrameSide,
	MIDDLE_SHARE,
	type Point,
	type PointMoved,
	type Size,
	UNMOVED,
	boxOf,
	distanceBetween,
	frameScaleOf,
	middleX,
	middleY,
	pointAt
} from '../domain/geometry.ts';
import { type Kind, OneOf } from '../domain/handed.ts';
import { ITS_MIDDLE, carried, longestScaleSeen } from '../domain/matrix.ts';
import { ONE_FRAME, pastTheEdge } from '../domain/place.ts';
import {
	type DrawnPlacement,
	type GroupName,
	type Holder,
	type Holders,
	IN_THE_WORLD,
	type Placed,
	type Scrolled,
	carriedAboutItsMiddle,
	drawnPlacement,
	groupNamed,
	placed,
	planeOf,
	pointOnTheFrame,
	screenBoxUnder,
	whereItStands
} from '../domain/placement.ts';
import { type Face, type Stance, faceOf, middleMovedBy, transformOf } from '../domain/stance.ts';
import { type Code, type DrawnCode, drawnCode, scrolledShareOf } from './code.ts';
import { type DrawnEffects, type Effects, type Melting, drawnEffects, drawnMelt } from './effects.ts';
import { type DrawnEnding, type Ending, drawnEnding } from './ending.ts';
import { type Groups, groupShare } from './group.ts';
import { type DrawnLens, type Lens, drawnLens, lensFit, pageMovedIn } from './lens.ts';
import type { Look } from './look.ts';
import { type DrawnOutline, type Outline, drawnOutline } from './outline.ts';
import { type DrawnHole, type DrawnPiece, type Piece, drawnPiece, pageFitOfPiece } from './piece.ts';
import { type DrawnFilmPicture, type FilmPicture, drawnFilmPicture } from './picture.ts';
import { type OnItsWay, type Way, alongItsWay, figureMoved, presencesIn, presentShare } from './way.ts';
import type { Screen } from './screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './terminal.ts';
import { type DrawnThing, type Thing, drawnThing } from './thing.ts';
import { type DrawnTitleWords, type TitleWords, drawnTitleWords } from './title.ts';

/** The name an object is known by: one a film gives, or its kind's own. */
export type ObjectName = string;

/** What a film may stand an object inside: the page's window, or the world. */
export type Inside = 'window' | 'world';

/** What a film names to stand an object inside: the page's window or the world, by the name each is known by. */
export const AN_INSIDE: Kind<Inside> = new OneOf(
	['window', 'world'],
	`the page's window, "window", or the world, "world"`
);

/**
 * What stands round an object as it is drawn: the window's screen, the frame, which the eye sees it before, the camera
 * the page is seen by, which a lens shows it past and frames what lies on the page, the groups standing, how far each
 * has gone, the holes pieces of the page leave on the screen, which what shows the page shows, how sharp the eye sees
 * as the frame is drawn, and the pictures of parts of the screen the stage holds sharper than the page's, which a piece
 * drawn past it is drawn from.
 */
export interface Surroundings extends Holders {
	readonly groups: Groups;
	readonly screen: Screen;
	readonly frame: Size;
	readonly holes: readonly DrawnHole[];
	readonly sharpness: Sharpness;
	readonly sharper: readonly SharperPicture[];
}

/** What an object shows. */
export type Content = TitleWords | Code | Terminal | Ending | Piece | Outline | Lens | Thing | FilmPicture;

/** What an object shows, as the stage draws it. */
export type DrawnContent =
	| DrawnTitleWords
	| DrawnCode
	| DrawnTerminal
	| DrawnEnding
	| DrawnPiece
	| DrawnOutline
	| DrawnLens
	| DrawnThing
	| DrawnFilmPicture;

/**
 * An object: what it stands inside, its box in the pixels of that from its top left corner, how it stands about the
 * box's middle, how it stands out, how far it has come up and how far it has gone, the way it comes up or goes, and
 * what it shows.
 */
export interface FrameObject extends Stance, Effects {
	readonly inside: Holder;
	readonly box: Box;
	readonly shown: Fraction;
	readonly gone: Fraction;
	readonly way: Way;
	readonly content: Content;
}

/** Objects by name, in the order they first came. */
export type Objects = ReadonlyMap<ObjectName, FrameObject>;

/**
 * An object as the stage draws it: where it is placed, as the stage draws a placement (`src/domain/placement.ts`); the
 * name it is known by, the side of it the eye sees in what it is laid in, how much of it what it stands in lets show,
 * from 0 to 1, how far its figure's way has come, none where it is on no way, how it stands out, none where it stands
 * out in no way, how it melts toward a side of its figure, none where it melts none, how soft the eye's focus draws it,
 * in pixels of a frame 1080 high of its box before its matrix, none where sharp, for the flat stage; how soft it draws
 * the softest point of its box the frame shows, on the frame in pixels of a frame 1080 high, none where sharp, which
 * bounds how far past the frame's edge the room's lens gathers it, as the window's softest point does; how many times
 * the eye magnifies it, the most of the frame's pixels a pixel of its box takes where the frame shows it, so the room
 * draws its surface that many times as densely; and its content as drawn. Both blurs are none, and it is magnified
 * once, but for what stands in the world.
 */
export interface DrawnObject extends DrawnPlacement {
	readonly name: ObjectName;
	readonly face: Face;
	readonly held: number;
	readonly onItsWay: OnItsWay | null;
	readonly effects: DrawnEffects | null;
	readonly melt: Melting | null;
	readonly outOfFocus: number | null;
	readonly softestOutOfFocus: number | null;
	readonly magnified: number;
	readonly content: DrawnContent;
}

/** An object and the name it is known by. */
export type ObjectEntry = readonly [ObjectName, FrameObject];

// Where an object in no group stands in a group's order: anywhere, as its place among objects is its own; and the
// zIndex of one in a group the film names none for, so all such are drawn as they came
const NO_GROUP_ORDER = 0;
const AS_THEY_CAME = 0;
// An object on the frame, which lets all of it show
const WHOLLY_HELD = 1;
// Where the left and top edges of what an object stands in are, in its own pixels
const NEAR_EDGE = 0;
// An object the eye sees no larger than its box: a pixel of its box takes one of the frame's, or fewer
const UNMAGNIFIED = 1;

/**
 * An object as it stood or stands at a moment of a frame's time: itself, what it stood in then, and the look it was
 * drawn in, which sets how tall its lines of code stand.
 */
export interface ObjectThen {
	readonly object: FrameObject;
	readonly holders: Holders;
	readonly look: Look;
}

/** An object at a moment of a frame's time, and where it stood then. */
interface StandingThen extends ObjectThen {
	readonly standing: Placed;
}

/**
 * How far an object moves on the frame from where it stood to where it stands: the farthest any corner of its box goes,
 * where its ground stands, any corner of what it shows, as its way shifts and grows it and as what it shows moves in
 * its box — lines of code scrolling, the page under a lens — or a side of its way's cut, each as the object stands
 * about its middle, and as the window or the group it stands in carries it.
 */
export function frameShiftOf(start: ObjectThen, end: ObjectThen, frame: Size): number {
	const startThen = { ...start, standing: placedInItsHolder(start.object, start.holders, frame) };
	const endThen = { ...end, standing: placedInItsHolder(end.object, end.holders, frame) };
	const moved = shownMoved(startThen, endThen, frame);
	const points: readonly PointMoved[] = [
		...CORNER_SHARES.map((corner) => ({ start: corner, end: corner })),
		...figureMoved(start.object, end.object, endThen.standing.laid, moved)
	];
	return Math.max(
		...points.map((point) =>
			distanceBetween(shareOnTheFrame(startThen.standing, point.start), shareOnTheFrame(endThen.standing, point.end))
		)
	);
}

/**
 * How far what an object shows moves in its box from where it stood to where it stands, in shares of its box as it
 * stands: lines of code as they scroll, and the page under a lens as the lens or the camera moves. What any other
 * shows stands in its box, but for words and lines rising a little as they come up, which is not counted; and what
 * stands in place of something else of its name has come, not moved.
 */
function shownMoved(start: StandingThen, end: StandingThen, frame: Size): Point {
	const before = start.object.content;
	const after = end.object.content;
	switch (after.kind) {
		case 'code':
			return before.kind === 'code' ? linesScrolled(before, after, end, frame) : UNMOVED;
		case 'lens':
			return before.kind === 'lens' ? pageMovedUnder(after, start, end, frame) : UNMOVED;
		case 'title':
		case 'terminal':
		case 'ending':
		case 'piece':
		case 'outline':
		case 'thing':
		case 'picture':
			return UNMOVED;
	}
}

/** How far code's lines scroll up its box, in shares of its box as it stands. */
function linesScrolled(before: Code, after: Code, end: StandingThen, frame: Size): Point {
	return { left: UNMOVED.left, top: -scrolledShareOf(before, after, end.look, end.standing.laid, frame) };
}

/** How far the page a lens shows moves in it, as far as the point of the screen under its middle moves. */
function pageMovedUnder(lens: Lens, start: StandingThen, end: StandingThen, frame: Size): Point {
	const startMiddle = shareOnTheFrame(start.standing, MIDDLE_SHARE);
	const endMiddle = shareOnTheFrame(end.standing, MIDDLE_SHARE);
	const seen = { start: start.holders.camera, end: end.holders.camera, frame };
	return pageMovedIn(lens, end.standing.laid, startMiddle, endMiddle, seen);
}

/**
 * Where an object stands, as a frame is drawn: placed on the plane of what it stands in, as the holders stand
 * (`src/domain/placement.ts`).
 */
function placedInItsHolder(object: FrameObject, holders: Holders, frame: Size): Placed {
	return placed(object, planeOf(object.inside, holders, frame), frame);
}

/**
 * How many of a frame's widths, or heights, an object moves toward a side of what it stands in for all of it as drawn
 * to stand past the edge there: one where it is drawn within its box, more where it is drawn past it, grown, rolled,
 * near or leant. A point of it as drawn moves in step with its box, faster where the eye sees it nearer, so each
 * corner's share of the way is read off where it is drawn now and a frame away, one in the world as the eye sees it
 * where it stands, on a frame of a size. An object on the page or in a group never slides.
 */
export function framesPastTheEdge(
	object: FrameObject,
	toward: FrameSide,
	within: Size,
	holders: Holders,
	frame: Size
): number {
	const away = { ...object, box: pastTheEdge(object.box, toward, within, ONE_FRAME) };
	const here = placedInItsHolder(object, holders, frame);
	const there = placedInItsHolder(away, holders, frame);
	return Math.max(
		ONE_FRAME,
		...CORNER_SHARES.map((corner) =>
			shareOfTheWayToTheEdge(drawnPointOf(here, corner), drawnPointOf(there, corner), toward, within)
		)
	);
}

/** The share of the way from one point to another at which it meets the edge of what it stands in, on a side. */
function shareOfTheWayToTheEdge(here: Point, there: Point, side: FrameSide, within: Size): number {
	switch (side) {
		case 'left':
			return (NEAR_EDGE - here.left) / (there.left - here.left);
		case 'right':
			return (within.width - here.left) / (there.left - here.left);
		case 'top':
			return (NEAR_EDGE - here.top) / (there.top - here.top);
		case 'bottom':
			return (within.height - here.top) / (there.top - here.top);
	}
}

/**
 * Where a point of an object, in shares of its box, is drawn on the frame, what it stands in as it stands given: where
 * it stands on the frame, in the world or in a group, there; inside the window or on the page, as the window shows that
 * point of its plane.
 */
export function drawnOnTheFrame(object: FrameObject, holders: Holders, frame: Size, share: Point): Point {
	return shareOnTheFrame(placedInItsHolder(object, holders, frame), share);
}

/** Where a point of something placed, in shares of its box, stands on the frame (`pointOnTheFrame`). */
function shareOnTheFrame(standing: Placed, share: Point): Point {
	return pointOnTheFrame(standing, pointAt(boxOf(standing.laid), share));
}

/**
 * Where a point of something placed, in shares of its box, is drawn in what it is laid in, the frame or the window,
 * which a slide past that's edge is measured in.
 */
function drawnPointOf(standing: Placed, share: Point): Point {
	return carriedAboutItsMiddle(standing.placing, standing.laid, pointAt(boxOf(standing.laid), share));
}

/** An object as the stage draws it at a moment of the film, among what stands round it. */
export function drawnObject(name: ObjectName, object: FrameObject, moment: number, around: Surroundings): DrawnObject {
	const standing = placedInItsHolder(object, around, around.frame);
	const face = faceOf(standing.placing);
	const held = heldIn(object, around);
	const onItsWay = alongItsWay(object.way, presentShare(object));
	const content = drawnContent(name, object, standing, moment, around);
	const effects = drawnEffects(object);
	const melt = drawnMelt(object);
	const { placing, laid } = standing;
	const inTheWorld = whereItStands(standing) === 'world';
	const { sharpness, frame } = around;
	const outOfFocus = inTheWorld ? outOfFocusBeforeItsMatrix(placing, laid, sharpness, frame) : null;
	const softestOutOfFocus = inTheWorld ? softestOutOfFocusSeen(placing, laid, laid, sharpness, frame) : null;
	const magnified = inTheWorld ? magnifiedSeen(standing, frame) : UNMAGNIFIED;
	const drawn = { ...drawnPlacement(standing), name, face, held };
	return { ...drawn, onItsWay, effects, melt, outOfFocus, softestOutOfFocus, magnified, content };
}

/**
 * How many times the eye magnifies something placed on a frame of a size: the most of the frame's pixels a pixel of its
 * box takes where the frame shows it, at its nearest part there; once where it is drawn no larger, or the frame shows
 * none of it.
 */
function magnifiedSeen(standing: Placed, frame: Size): number {
	const longest = longestScaleSeen(standing.placing, standing.laid, standing.laid, boxOf(frame));
	return Math.max(UNMAGNIFIED, longest ?? UNMAGNIFIED);
}

/**
 * Where an object stands in the world as a frame is drawn, among the holders as they stand; none where it stands
 * elsewhere.
 */
export function standingInTheWorld(object: FrameObject, holders: Holders, frame: Size): Placed | null {
	const standing = placedInItsHolder(object, holders, frame);
	return whereItStands(standing) === 'world' ? standing : null;
}

/**
 * Where the eye focuses to see an object sharp, its middle where it stands now: at that spot of what it stands in, its
 * box's middle where its stance moves it, brought out by its depth and round the point it turns about, placed as each
 * frame is drawn; in a group, which goes with what stands in it, or beside a point, so far before the eye, as either
 * rides with it; riding a block's scroll, at the spot of the world it stands at now, which the scroll carries no more.
 */
export function focusOn(object: FrameObject, holders: Holders, frame: Size): Focus {
	const holder = object.inside;
	const moved = middleMovedBy(object, object.box);
	const point = { left: middleX(object.box) + moved.across, top: middleY(object.box) + moved.down };
	switch (holder.kind) {
		case 'group':
		case 'point':
			return { kind: 'distance', distance: distanceOfItsMiddle(placedInItsHolder(object, holders, frame), frame) };
		case 'scroll': {
			const carriedPlane = planeOf(holder, holders, frame).box;
			const inTheWorld = { left: point.left + carriedPlane.left, top: point.top + carriedPlane.top };
			return { kind: 'spot', holder: IN_THE_WORLD, point: inTheWorld, depth: moved.out };
		}
		case 'frame':
		case 'world':
		case 'window':
		case 'page':
		case 'pageInTheWorld':
			return { kind: 'spot', holder, point, depth: moved.out };
	}
}

/**
 * Objects by name in the order the stage draws them, the later over the earlier: in the order they came, but for the
 * objects of a group, drawn together where the first of them came, in the order the group names, and as they came
 * where that is alike (the sort keeps the order of what it finds alike), among what stands round them.
 */
export function inDrawingOrder(objects: Objects, around: Surroundings): readonly ObjectEntry[] {
	const standing = [...objects.values()];
	return [...objects]
		.map(([name, object], came) => ({
			name,
			object,
			place: drawingPlaceOf(object, came, standing),
			inItsGroup: orderInItsGroup(object, around)
		}))
		.toSorted((first, second) => first.place - second.place || first.inItsGroup - second.inItsGroup)
		.map(({ name, object }) => [name, object] as const);
}

/**
 * Where an object is drawn among the others of its group, the lower first: by its zIndex, or, in a group ordered by
 * depth, by how far out toward the eye its middle stands, as it and the group stand before the eye at rest.
 */
function orderInItsGroup(object: FrameObject, around: Surroundings): number {
	const holder = object.inside;
	if (holder.kind !== 'group') return NO_GROUP_ORDER;
	switch (groupNamed(around.groups, holder.name).order) {
		case 'zIndex':
			return holder.zIndex ?? AS_THEY_CAME;
		case 'depth':
			return carried(placedInItsHolder(object, around, around.frame).inTheEyesSpace, ITS_MIDDLE).out;
	}
}

/** Whether an object stands in a group of a name. */
export function standsInGroup(object: FrameObject, group: GroupName): boolean {
	return object.inside.kind === 'group' && object.inside.name === group;
}

/** Whether an object stands beside an object of a name, off a point of it. */
export function standsBeside(object: FrameObject, name: ObjectName): boolean {
	const holder = object.inside;
	return holder.kind === 'point' && holder.of.kind === 'object' && holder.of.name === name;
}

/** Where among objects an object is drawn: where it came, or where the first of its group came. */
function drawingPlaceOf(object: FrameObject, came: number, objects: readonly FrameObject[]): number {
	const holder = object.inside;
	return holder.kind === 'group' ? objects.findIndex((other) => standsInGroup(other, holder.name)) : came;
}

/**
 * How close what an object draws from the page's picture shows the page, as a pose's zoom has it, the page seen by a
 * camera: none for what draws none of it, a piece past livereel's bound drawn from a picture of its own among them.
 */
export function pictureZoomOf(object: FrameObject, holders: Holders, frame: Size): number | null {
	const zoom = pageZoomOf(object, holders, frame);
	return partPastTheBound(object, zoom, holders.scrolled) === null ? zoom : null;
}

/**
 * The part of the screen a piece drawn from the page's picture shows past livereel's bound, as close as it shows it,
 * which it is drawn from a picture of its own of; none for any other object, nor a piece drawn within the bound,
 * leant, or from a picture it holds.
 */
export function partAskedSharper(object: FrameObject, holders: Holders, frame: Size): readonly PartAsked[] {
	const part = partPastTheBound(object, pageZoomOf(object, holders, frame), holders.scrolled);
	return part === null ? [] : [part];
}

/**
 * The part of the screen an object shows past livereel's bound at a zoom: a piece's source, where the block it rides
 * stands now; none for any other.
 */
function partPastTheBound(object: FrameObject, zoom: number | null, scrolled: Scrolled): PartAsked | null {
	const content = object.content;
	if (content.kind !== 'piece' || zoom === null || zoom <= ZOOM_AT_MOST) return null;
	return { part: screenBoxUnder(content.source, object.inside, scrolled), zoom };
}

/**
 * How close what an object shows of the page's picture shows it, as a pose's zoom has it, the page seen by a camera:
 * none for what shows none of it; else the frame's pixels a screen's pixel takes in its box, grown and brought near as
 * it stands, and as its group grows and brings it near; where it leans, its nearer side shows the page larger still,
 * so at livereel's bound.
 */
function pageZoomOf(object: FrameObject, holders: Holders, frame: Size): number | null {
	const standing = placedInItsHolder(object, holders, frame);
	const fit = pageFitOf(object, standing.laid, holders.camera, frame);
	if (fit === null) return null;
	const transform = transformOf(standing.stood, standing.placing);
	switch (transform.kind) {
		case 'flat': {
			const grown = Math.hypot(transform.matrix.m11, transform.matrix.m12);
			return (fit * grown) / frameScaleOf(frame);
		}
		case 'leant':
			return ZOOM_AT_MOST;
	}
}

/** The number of the picture an object holds, a piece that holds one; none for any other. */
export function pictureHeldBy(object: FrameObject): readonly number[] {
	const content = object.content;
	return content.kind === 'piece' && content.picture.kind === 'held' ? [content.picture.number] : [];
}

/**
 * How many of the frame's pixels a screen's pixel of the page's picture takes in what an object laid in a box shows of
 * it, the page seen by a camera: a piece as large as the box holds its source, a lens as its magnification has it; none
 * for what shows no page, or a piece drawn from a picture it holds.
 */
function pageFitOf(object: FrameObject, laid: Box, camera: Camera, frame: Size): number | null {
	const content = object.content;
	switch (content.kind) {
		case 'piece':
			return pageFitOfPiece(content, laid);
		case 'lens':
			return lensFit(content, camera, frame);
		case 'title':
		case 'code':
		case 'terminal':
		case 'ending':
		case 'outline':
		case 'thing':
		case 'picture':
			return null;
	}
}

/**
 * How much of an object what it stands in lets show, among what stands round it: all of it on the frame, in the world,
 * riding a block's scroll there, and beside a point; in the page's window, on the page in it, or on the page in the
 * world, as a piece falls onto a block, as much as the screen has come up out of the ground; in a group, as much as
 * the group has not gone. It fades the object whole, and what it shows stands as far along as its own moves have it:
 * words typed stay typed as their key was heard.
 */
function heldIn(object: FrameObject, around: Surroundings): number {
	switch (object.inside.kind) {
		case 'frame':
		case 'world':
		case 'scroll':
		case 'point':
			return WHOLLY_HELD;
		case 'window':
		case 'page':
		case 'pageInTheWorld':
			return around.screen.shown;
		case 'group':
			return groupShare(groupNamed(around.groups, object.inside.name));
	}
}

/**
 * What an object of a name shows, standing as it does, drawn as far as its ground and its figure have come up and gone
 * in the way it comes, at a moment of the film, among what stands round it: the camera, which a lens shows the page
 * past, the holes on the screen, which a piece or a lens shows but for the piece's own, and how far the film has
 * scrolled each block, which carries the source of a piece riding one. What has no ground of its own is its figure
 * alone.
 */
function drawnContent(
	name: ObjectName,
	object: FrameObject,
	standing: Placed,
	moment: number,
	around: Surroundings
): DrawnContent {
	const content = object.content;
	const presences = presencesIn(object.way, object);
	const figure = presences.figure;
	switch (content.kind) {
		case 'title':
			return drawnTitleWords(content, presences, moment);
		case 'code':
			return drawnCode(content, figure.shown, figure.gone);
		case 'terminal':
			return drawnTerminal(content, moment, presentShare(figure));
		case 'ending':
			return drawnEnding(content, object.way, object);
		case 'piece':
			return drawnPiece(
				{ ...content, source: screenBoxUnder(content.source, object.inside, around.scrolled) },
				standing.laid,
				object,
				presentShare(figure),
				holesOfOthers(name, around.holes),
				around.sharper
			);
		case 'outline':
			return drawnOutline(content, presentShare(figure));
		case 'lens': {
			const middle = shareOnTheFrame(standing, MIDDLE_SHARE);
			const shown = presentShare(figure);
			return drawnLens(content, standing.laid, middle, around.camera, around.frame, shown, around.holes);
		}
		case 'thing': {
			return drawnThing(content, standing, object.scale, presentShare(figure), around);
		}
		case 'picture':
			return drawnFilmPicture(content, standing.laid, presentShare(figure));
	}
}

/** The holes on the screen other objects than one of a name leave: a piece stands over the page in place of its own. */
function holesOfOthers(name: ObjectName, holes: readonly DrawnHole[]): readonly DrawnHole[] {
	return holes.filter((hole) => hole.name !== name);
}
