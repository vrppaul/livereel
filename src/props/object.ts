/**
 * An object on the frame: something that stands in a box, grows, comes near, turns, comes up and goes, and shows what
 * it holds, its content — a title's words, a pane of code, an agent's terminal, the ending card, a caption, the keys
 * of a shortcut, a piece of the page, an outline round a part of it or a lens over it. Where it stands, how it stands
 * about its middle (`src/domain/stance.ts`), how it stands out (`src/props/effects.ts`) and how far it has come and
 * gone are the object's, alike for every content, so a move that carries, leans, sets apart or slides one is written
 * once (`src/moves/object.ts`); what it shows, how that comes up in its box and what lights in it are its content's.
 * Each of where it stands, which way it faces, how it stands out and what it shows is set by its own moves, so moves
 * of one object that set different values share a step.
 *
 * An object comes up and goes in its own way, as what it shows comes up of itself, or in a way of livereel's, faded,
 * masked, wiped, opened or grown (`src/props/way.ts`): then its figure — its words, its pane, the card's lines, the
 * caps — stands whole and comes as the way has it, while a ground it stands on comes in its own way.
 *
 * An object stands on the frame, inside the page's window, or in a group of objects (`src/props/group.ts`). Inside the
 * window, as a small window of code stands over the site's, its box is in the window's pixels, and it travels and
 * leans with the window, grows and rolls flat on it, shows no more than the screen does, and is cut at the window's
 * edge, as an element laid in another is on a page. In a group its box is in the group's pixels, and the group's
 * stance carries its own, so it is drawn on the frame as the two make one matrix, and shows as far as the group has
 * not gone. The window is one, and never goes; a group goes with what stands in it.
 * Keys over a caption's words are only drawn over them, laid out by the caption, as only the page knows how tall the
 * words stand; they stand on the frame, and keep standing when the caption goes.
 *
 * What an object shows sets the layer it is drawn on: a caption stands over every other object, as words said over a
 * film do, and keys over the caption's ground; within a layer the one that came last stands over the rest, but the
 * objects of a group stand together where the first of them came, ordered as the film names: by each one's zIndex, the
 * higher over the lower and as they came where it is alike, so a stack's layers stand as the film lays them however
 * the group leans; or, in a group ordered by depth, the farther behind the nearer, so a ring of cards turning shows
 * the near ones over the far.
 *
 * What a piece of the page or a lens shows of the page is the page as it stands: the holes other pieces leave in it
 * (`src/props/lifted.ts`) with it, so a piece of the whole screen under the pieces lifted off it shows where they were.
 */
import {
	type Camera,
	type View,
	ZOOM_AT_MOST,
	carriedAboutItsMiddle,
	leantOnTheFrame,
	seenFromTheEye
} from '../domain/camera.ts';
import type { Fraction } from '../domain/fraction.ts';
import {
	type Box,
	type FrameSide,
	type Point,
	type Size,
	cornersOf,
	distanceBetween,
	frameScaleOf,
	placedFrom
} from '../domain/geometry.ts';
import { type Kind, OneOf } from '../domain/handed.ts';
import { type Matrix, type Spot, carried, chained } from '../domain/matrix.ts';
import { ONE_FRAME, pastTheEdge } from '../domain/place.ts';
import { type DrawnStance, type Stance, drawnStance, stanceMatrix } from '../domain/stance.ts';
import { type Caption, type DrawnCaption, drawnCaption } from './caption.ts';
import { type Code, type DrawnCode, drawnCode } from './code.ts';
import { type Effects, drawnEffects } from './effects.ts';
import { type DrawnEnding, type Ending, drawnEnding } from './ending.ts';
import { type GroupName, type Groups, cornerOf, groupNamed, groupShare, groupStanceAbout } from './group.ts';
import { type CaptionStanding, type DrawnKeys, type Keys, drawnKeys, standOver } from './keys.ts';
import { type DrawnLens, type Lens, drawnLens, lensFit } from './lens.ts';
import { type DrawnOutline, type Outline, drawnOutline } from './outline.ts';
import { type DrawnHole, type DrawnPiece, type Piece, drawnPiece, fitIn } from './piece.ts';
import { type OnItsWay, type Way, alongItsWay, presencesIn, presentShare } from './way.ts';
import type { Screen } from './screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './terminal.ts';
import { type DrawnTitleWords, type TitleWords, drawnTitleWords } from './title.ts';

/** The name an object is known by: one a film gives, or its kind's own. */
export type ObjectName = string;

/**
 * What an object stands in: the frame, the page's window, or a group of objects by its name, with its zIndex there, how
 * high it is drawn among the others of the group, where the film names one.
 */
export type Holder =
	| { readonly kind: 'frame' }
	| { readonly kind: 'window' }
	| { readonly kind: 'group'; readonly name: GroupName; readonly zIndex: number | null };

/** What the stage lays an object in: the frame, or the page's window; one in a group stands on the frame. */
type Laid = Exclude<Holder['kind'], 'group'>;

/** What a film may stand an object inside: the page's window. */
export type Inside = 'window';

/** What a film names to stand an object inside: the page's window, by the one name it is known by. */
export const INSIDE_THE_WINDOW: Kind<Inside> = new OneOf(['window'], `the page's window, "window"`);

// Where an object stands that a film shows inside nothing, and one it shows inside the page's window
export const ON_THE_FRAME: Holder = { kind: 'frame' };
export const IN_THE_WINDOW: Holder = { kind: 'window' };

/** What objects stand in, as a scene has them: the page's window as the camera shows it, and the groups standing. */
export interface Holders {
	readonly window: View;
	readonly groups: Groups;
}

/** What objects stand in, seen by a camera: the page's window as it shows it, and the groups standing. */
export function holdersSeenBy(camera: Camera, groups: Groups): Holders {
	return { window: camera.view, groups };
}

/**
 * What stands round an object as it is drawn: the caption standing on the frame, if any, the window's screen, the
 * frame, which the eye sees it before, the camera the page is seen by, which a lens shows it past, the groups
 * standing, and the holes pieces of the page leave on the screen, which what shows the page shows.
 */
export interface Surroundings {
	readonly caption: CaptionStanding | null;
	readonly screen: Screen;
	readonly frame: Size;
	readonly camera: Camera;
	readonly groups: Groups;
	readonly holes: readonly DrawnHole[];
}

/** What an object shows. */
export type Content = TitleWords | Code | Terminal | Ending | Caption | Keys | Piece | Outline | Lens;

/** What an object shows, as the stage draws it. */
export type DrawnContent =
	| DrawnTitleWords
	| DrawnCode
	| DrawnTerminal
	| DrawnEnding
	| DrawnCaption
	| DrawnKeys
	| DrawnPiece
	| DrawnOutline
	| DrawnLens;

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
 * An object as the stage draws it: the name it is known by, what it is laid in, the object whose words it is laid over
 * by that one — keys over a caption's, its box then the caption's to lay out — or none, its box in what it is laid in,
 * its transform about the box's middle and the side of it the eye sees, the layer it is drawn on, the higher over the
 * lower, how much of it what it stands in lets show, from 0 to 1, how far its figure's way has come, none where it is
 * on no way, how it stands out, none where it stands out in no way, and its content as drawn.
 */
export interface DrawnObject extends DrawnStance {
	readonly name: ObjectName;
	readonly inside: Laid;
	readonly over: ObjectName | null;
	readonly box: Box;
	readonly layer: number;
	readonly held: number;
	readonly onItsWay: OnItsWay | null;
	readonly effects: Effects | null;
	readonly content: DrawnContent;
}

/** An object and the name it is known by. */
export type ObjectEntry = readonly [ObjectName, FrameObject];

// The layer an object is drawn on by what it shows: a caption over every other, keys over the caption's ground
const LAYER_OF: { readonly [Kind in Content['kind']]: number } = {
	words: 0,
	code: 0,
	terminal: 0,
	ending: 0,
	caption: 1,
	keys: 2,
	piece: 0,
	outline: 0,
	lens: 0
};
// The corners of a box, in shares of it, and its middle
const CORNERS = cornersOf({ left: 0, top: 0, width: 1, height: 1 });
const MIDDLE: Point = { left: 0.5, top: 0.5 };
// A box's middle as a matrix about the middle takes a spot: none of the way from itself
const ITS_MIDDLE: Spot = { across: 0, down: 0, out: 0 };
// The groups an object that slides is placed by: none, as an object in a group never slides
const IN_NO_GROUP: Groups = new Map();
// Where an object in no group stands in a group's order: anywhere, as its place among objects is its own; and the
// zIndex of one in a group the film names none for, so all such are drawn as they came
const NO_GROUP_ORDER = 0;
const AS_THEY_CAME = 0;
// An object on the frame, which lets all of it show
const WHOLLY_HELD = 1;
// Where the left and top edges of what an object stands in are, in its own pixels
const NEAR_EDGE = 0;

/**
 * An object as the stage lays it: the box it is laid in, its own, or where its group places it on the frame; how it
 * stands about that box's middle before the eye, its group's stance and its own as one matrix; and the matrix that
 * carries it to where it is drawn.
 */
interface Standing {
	readonly laid: Box;
	readonly stood: Matrix;
	readonly placing: Matrix;
}

/**
 * How far an object moves on the frame from where it stood to where it stands, what it stands in as it stood and as it
 * stands given: the farthest any corner of its box goes, as the object stands about its middle, and as the window or
 * the group it stands in carries it.
 */
export function frameShiftOf(
	start: FrameObject,
	end: FrameObject,
	startHolders: Holders,
	endHolders: Holders,
	frame: Size
): number {
	const startStanding = standingOf(start, frame, startHolders.groups);
	const endStanding = standingOf(end, frame, endHolders.groups);
	return Math.max(
		...CORNERS.map((corner) =>
			distanceBetween(
				onTheFrameOf(start.inside, startStanding, startHolders.window, frame, corner),
				onTheFrameOf(end.inside, endStanding, endHolders.window, frame, corner)
			)
		)
	);
}

/**
 * How an object is laid and stands: seen from the eye where it stands on the frame; flat on the window's plane where it
 * stands inside it, which the window carries to the eye as it leans; carried by its group's stance about the group's
 * middle where it stands in one, and seen from the eye where the group places it on the frame.
 */
function standingOf(object: FrameObject, frame: Size, groups: Groups): Standing {
	const stood = stoodIn(object, groups);
	switch (object.inside.kind) {
		case 'frame':
			return { laid: object.box, stood, placing: chained([seenFromTheEye(object.box, frame), stood]) };
		case 'window':
			return { laid: object.box, stood, placing: stood };
		case 'group': {
			const laid = placedFrom(object.box, cornerOf(groupNamed(groups, object.inside.name)));
			return { laid, stood, placing: chained([seenFromTheEye(laid, frame), stood]) };
		}
	}
}

/** How an object stands about its box's middle before the eye: as its own stance has it, carried by its group's. */
function stoodIn(object: FrameObject, groups: Groups): Matrix {
	const own = stanceMatrix(object);
	switch (object.inside.kind) {
		case 'frame':
		case 'window':
			return own;
		case 'group':
			return chained([groupStanceAbout(groupNamed(groups, object.inside.name), object.box), own]);
	}
}

/** What the stage lays an object in: the frame, for one in a group, which places it on the frame. */
function laidIn(holder: Holder): Laid {
	switch (holder.kind) {
		case 'frame':
		case 'group':
			return 'frame';
		case 'window':
			return 'window';
	}
}

/**
 * How many of a frame's widths, or heights, an object moves toward a side of what it stands in for all of it as drawn
 * to stand past the edge there: one where it is drawn within its box, more where it is drawn past it, grown, rolled,
 * near or leant. A point of it as drawn moves in step with its box, faster where the eye sees it nearer, so each
 * corner's share of the way is read off where it is drawn now and a frame away. An object in a group never slides, so
 * one that slides is placed by no group.
 */
export function framesPastTheEdge(object: FrameObject, toward: FrameSide, within: Size): number {
	const away = { ...object, box: pastTheEdge(object.box, toward, within, ONE_FRAME) };
	const here = standingOf(object, within, IN_NO_GROUP);
	const there = standingOf(away, within, IN_NO_GROUP);
	return Math.max(
		ONE_FRAME,
		...CORNERS.map((corner) =>
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
 * it stands on the frame or in a group, there; inside the window, as the window shows that point of its plane.
 */
export function drawnOnTheFrame(object: FrameObject, holders: Holders, frame: Size, share: Point): Point {
	return onTheFrameOf(object.inside, standingOf(object, frame, holders.groups), holders.window, frame, share);
}

/**
 * Where a point of an object, in shares of its box, stands on the frame, as it stands: where it stands on the frame or
 * in a group, there; inside the window, as the page's window shows that point of its plane.
 */
function onTheFrameOf(holder: Holder, standing: Standing, window: View, frame: Size, share: Point): Point {
	const drawn = drawnPointOf(standing, share);
	switch (holder.kind) {
		case 'frame':
		case 'group':
			return drawn;
		case 'window':
			return leantOnTheFrame(window, frame, drawn);
	}
}

/** Where a point of an object, in shares of its box, is drawn in what it is laid in, as it stands. */
function drawnPointOf(standing: Standing, share: Point): Point {
	const laid = standing.laid;
	return carriedAboutItsMiddle(standing.placing, laid, { left: share.left * laid.width, top: share.top * laid.height });
}

/** An object as the stage draws it at a moment of the film, among what stands round it. */
export function drawnObject(name: ObjectName, object: FrameObject, moment: number, around: Surroundings): DrawnObject {
	const standing = standingOf(object, around.frame, around.groups);
	const stance = drawnStance(standing.stood, standing.placing);
	const layer = LAYER_OF[object.content.kind];
	const held = heldIn(object, around);
	const onItsWay = alongItsWay(object.way, presentShare(object));
	const content = drawnContent(name, object, standing, moment, around);
	const over = drawnOver(object, around.caption);
	const inside = laidIn(object.inside);
	const effects = drawnEffects(object);
	return { name, inside, over, box: standing.laid, ...stance, layer, held, onItsWay, effects, content };
}

/**
 * Objects by name in the order the stage draws them, the later over the earlier: in the order they came, but for the
 * objects of a group, drawn together where the first of them came, in the order the group names, and as they came
 * where that is alike (the sort keeps the order of what it finds alike).
 */
export function inDrawingOrder(objects: Objects, groups: Groups): readonly ObjectEntry[] {
	const standing = [...objects.values()];
	return [...objects]
		.map(([name, object], came) => ({
			name,
			object,
			place: drawingPlaceOf(object, came, standing),
			inItsGroup: orderInItsGroup(object, groups)
		}))
		.toSorted((first, second) => first.place - second.place || first.inItsGroup - second.inItsGroup)
		.map(({ name, object }) => [name, object] as const);
}

/**
 * Where an object is drawn among the others of its group, the lower first: by its zIndex, or, in a group ordered by
 * depth, by how far out toward the eye its middle stands.
 */
function orderInItsGroup(object: FrameObject, groups: Groups): number {
	const holder = object.inside;
	if (holder.kind !== 'group') return NO_GROUP_ORDER;
	switch (groupNamed(groups, holder.name).order) {
		case 'zIndex':
			return holder.zIndex ?? AS_THEY_CAME;
		case 'depth':
			return outOf(object, groups);
	}
}

/** Whether an object stands in a group of a name. */
export function standsIn(object: FrameObject, group: GroupName): boolean {
	return object.inside.kind === 'group' && object.inside.name === group;
}

/** Where among objects an object is drawn: where it came, or where the first of its group came. */
function drawingPlaceOf(object: FrameObject, came: number, objects: readonly FrameObject[]): number {
	const holder = object.inside;
	return holder.kind === 'group' ? objects.findIndex((other) => standsIn(other, holder.name)) : came;
}

/** How far out toward the eye an object's middle stands, as it and its group stand. */
function outOf(object: FrameObject, groups: Groups): number {
	return carried(stoodIn(object, groups), ITS_MIDDLE).out;
}

/**
 * How close what an object shows of the page shows it, as a pose's zoom has it, the page seen by a camera: none for
 * what shows none of it; else the frame's pixels a screen's pixel takes in its box, grown and brought near as it
 * stands, and as its group grows and brings it near; where it leans, its nearer side shows the page larger still, so
 * at livereel's bound.
 */
export function pictureZoomOf(object: FrameObject, camera: Camera, frame: Size, groups: Groups): number | null {
	const fit = pageFitOf(object, camera, frame);
	if (fit === null) return null;
	const standing = standingOf(object, frame, groups);
	const transform = drawnStance(standing.stood, standing.placing).transform;
	switch (transform.kind) {
		case 'flat': {
			const grown = Math.hypot(transform.matrix.m11, transform.matrix.m12);
			return (fit * grown) / frameScaleOf(frame);
		}
		case 'leant':
			return ZOOM_AT_MOST;
	}
}

/**
 * How many of the frame's pixels a screen's pixel takes in what an object shows of the page, the page seen by a camera:
 * a piece as large as its box holds its source, a lens as its magnification has it; none for what shows no page.
 */
function pageFitOf(object: FrameObject, camera: Camera, frame: Size): number | null {
	const content = object.content;
	switch (content.kind) {
		case 'piece':
			return fitIn(content.source, object.box);
		case 'lens':
			return lensFit(content, camera, frame);
		case 'words':
		case 'code':
		case 'terminal':
		case 'ending':
		case 'caption':
		case 'keys':
		case 'outline':
			return null;
	}
}

/** The object whose words an object is laid over: keys over a caption's standing at the frame's foot; else none. */
function drawnOver(object: FrameObject, caption: CaptionStanding | null): ObjectName | null {
	return object.content.kind === 'keys' && standOver(caption) ? caption.name : null;
}

/**
 * How much of an object what it stands in lets show, among what stands round it: all of it on the frame; in the page's
 * window, as much as the screen the window shows has come up out of the ground; in a group, as much as the group has
 * not gone. It fades the object whole, and what it shows stands as far along as its own moves have it: words typed
 * stay typed as their key was heard.
 */
function heldIn(object: FrameObject, around: Surroundings): number {
	switch (object.inside.kind) {
		case 'frame':
			return WHOLLY_HELD;
		case 'window':
			return around.screen.shown;
		case 'group':
			return groupShare(groupNamed(around.groups, object.inside.name));
	}
}

/**
 * What an object of a name shows, standing as it does, drawn as far as its ground and its figure have come up and gone
 * in the way it comes, at a moment of the film, among what stands round it: the caption standing on the frame, if any,
 * which keys rise clear of; the camera, which a lens shows the page past; and the holes on the screen, which a piece or
 * a lens shows but for the piece's own. What has no ground of its own is its figure alone.
 */
function drawnContent(
	name: ObjectName,
	object: FrameObject,
	standing: Standing,
	moment: number,
	around: Surroundings
): DrawnContent {
	const content = object.content;
	const presences = presencesIn(object.way, object);
	const figure = presences.figure;
	const caption = around.caption;
	switch (content.kind) {
		case 'words':
			return drawnTitleWords(content, presences, moment);
		case 'code':
			return drawnCode(content, figure.shown, figure.gone);
		case 'terminal':
			return drawnTerminal(content, moment, presentShare(figure));
		case 'ending':
			return drawnEnding(content, object.way, object);
		case 'caption':
			return drawnCaption(content, presences, moment);
		case 'keys':
			return drawnKeys(content, presentShare(figure), caption);
		case 'piece':
			return drawnPiece(content, object.box, presentShare(figure), holesOfOthers(name, around.holes));
		case 'outline':
			return drawnOutline(content, presentShare(figure));
		case 'lens': {
			const middle = onTheFrameOf(object.inside, standing, around.camera.view, around.frame, MIDDLE);
			const shown = presentShare(figure);
			return drawnLens(content, object.box, middle, around.camera, around.frame, shown, around.holes);
		}
	}
}

/**
 * The caption among the objects standing on the frame, as keys find it, as far as it has come up and gone, as its
 * ground has, which the keys rise clear of and which comes in its own way whatever way its words come; or none, its
 * moves letting one alone stand.
 */
export function captionAmong(standing: Objects): CaptionStanding | null {
	for (const [name, object] of standing) {
		if (object.content.kind === 'caption') {
			return { name, caption: object.content, shown: object.shown, gone: object.gone };
		}
	}
	return null;
}

/** The holes on the screen other objects than one of a name leave: a piece stands over the page in place of its own. */
function holesOfOthers(name: ObjectName, holes: readonly DrawnHole[]): readonly DrawnHole[] {
	return holes.filter((hole) => hole.name !== name);
}
