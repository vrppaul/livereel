/**
 * An object on the frame: something that stands in a box, grows, comes near, turns, comes up and goes, and shows what
 * it holds, its content — a title's words, a pane of code, an agent's terminal, the ending card, a caption, the keys
 * of a shortcut or a piece of the page. Where it stands, how it stands about its middle (`src/domain/stance.ts`) and
 * how far it has come and gone are the object's, alike for every content, so a move that carries, leans or slides one
 * is written once (`src/moves/object.ts`); what it shows, how that comes up in its box and what lights in it are its
 * content's. Each of where it stands, which way it faces and what it shows is set by its own moves, so moves of one
 * object that set different values share a step.
 *
 * An object comes up and goes in its own way, as what it shows comes up of itself, or in a way of livereel's, faded,
 * masked, wiped, opened or grown (`src/props/way.ts`): then its figure — its words, its pane, the card's lines, the
 * caps — stands whole and comes as the way has it, while a ground it stands on comes in its own way.
 *
 * An object stands on the frame, or inside the page's window, as a small window of code stands over the site's: its
 * box is then in the window's pixels, and it travels and leans with the window, grows and rolls flat on it, shows no
 * more than the screen does, and is cut at the window's edge, as an element laid in another is on a page. The window
 * is one, and never goes, so nothing stands inside what may be replaced or put away; an object inside another waits
 * for a film that needs it.
 * Keys over a caption's words are only drawn over them, laid out by the caption, as only the page knows how tall the
 * words stand; they stand on the frame, and keep standing when the caption goes.
 *
 * What an object shows sets the layer it is drawn on: a caption stands over every other object, as words said over a
 * film do, and keys over the caption's ground; within a layer the one that came last stands over the rest.
 */
import { type View, ZOOM_AT_MOST, carriedAboutItsMiddle, leantOnTheFrame, seenFromTheEye } from '../domain/camera.ts';
import type { Fraction } from '../domain/fraction.ts';
import {
	type Box,
	type FrameSide,
	type Point,
	type Size,
	cornersOf,
	distanceBetween,
	frameScaleOf
} from '../domain/geometry.ts';
import { type Kind, OneOf, Plain } from '../domain/handed.ts';
import { IDENTITY, type Matrix, chained } from '../domain/matrix.ts';
import { ONE_FRAME, pastTheEdge } from '../domain/place.ts';
import { type DrawnStance, type Stance, drawnStance, stanceMatrix } from '../domain/stance.ts';
import { type Caption, type DrawnCaption, drawnCaption } from './caption.ts';
import { type Code, type DrawnCode, drawnCode } from './code.ts';
import { type DrawnEnding, type Ending, drawnEnding } from './ending.ts';
import { type CaptionStanding, type DrawnKeys, type Keys, drawnKeys, standOver } from './keys.ts';
import { type DrawnPiece, type Piece, drawnPiece, fitIn } from './piece.ts';
import { type OnItsWay, type Way, alongItsWay, presencesIn, presentShare } from './way.ts';
import type { Screen } from './screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './terminal.ts';
import { type DrawnTitleWords, type TitleWords, drawnTitleWords } from './title.ts';

/** The name an object is known by: one a film gives, or its kind's own. */
export type ObjectName = string;

/** The name a film gives an object: any with something in it. */
export const AN_OBJECT_NAME: Kind<ObjectName> = new Plain(isSomeName, 'a name, a string with something in it');

/** What an object stands in: the frame, or the page's window. */
export type Holder = 'frame' | 'window';

/** What a film may stand an object inside: the page's window. */
export type Inside = Exclude<Holder, 'frame'>;

/** What a film names to stand an object inside: the page's window, by the one name it is known by. */
export const INSIDE_THE_WINDOW: Kind<Inside> = new OneOf(['window'], `the page's window, "window"`);

/**
 * What stands round an object as it is drawn: the caption standing on the frame, if any, the window's screen, and the
 * frame, which the eye sees it before.
 */
export interface Surroundings {
	readonly caption: CaptionStanding | null;
	readonly screen: Screen;
	readonly frame: Size;
}

/** What an object shows. */
export type Content = TitleWords | Code | Terminal | Ending | Caption | Keys | Piece;

/** What an object shows, as the stage draws it. */
export type DrawnContent =
	DrawnTitleWords | DrawnCode | DrawnTerminal | DrawnEnding | DrawnCaption | DrawnKeys | DrawnPiece;

/**
 * An object: what it stands inside, its box in the pixels of that from its top left corner, how it stands about the
 * box's middle, how far it has come up and how far it has gone, the way it comes up or goes, and what it shows.
 */
export interface FrameObject extends Stance {
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
 * An object as the stage draws it: the name it is known by, what it stands in, the object whose words it is laid over
 * by that one — keys over a caption's, its box then the caption's to lay out — or none, its box in what it stands in,
 * its transform about the box's middle and the side of it the eye sees, the layer it is drawn on, the higher over the
 * lower, how much of it what it stands in lets show, from 0 to 1, how far its figure's way has come, none where it is
 * on no way, and its content as drawn.
 */
export interface DrawnObject extends DrawnStance {
	readonly name: ObjectName;
	readonly inside: Holder;
	readonly over: ObjectName | null;
	readonly box: Box;
	readonly layer: number;
	readonly held: number;
	readonly onItsWay: OnItsWay | null;
	readonly content: DrawnContent;
}

// The layer an object is drawn on by what it shows: a caption over every other, keys over the caption's ground
const LAYER_OF: { readonly [Kind in Content['kind']]: number } = {
	words: 0,
	code: 0,
	terminal: 0,
	ending: 0,
	caption: 1,
	keys: 2,
	piece: 0
};
// The corners of a box, in shares of it
const CORNERS = cornersOf({ left: 0, top: 0, width: 1, height: 1 });
// An object on the frame, which lets all of it show
const WHOLLY_HELD = 1;
// Where the left and top edges of what an object stands in are, in its own pixels
const NEAR_EDGE = 0;

/**
 * How far an object moves on the frame from where it stood to where it stands, the page's window as it stood and as it
 * stands given: the farthest any corner of its box goes, as the object stands about its middle, and as the window it
 * stands inside shows it, travelling and leaning with it.
 */
export function frameShiftOf(
	start: FrameObject,
	end: FrameObject,
	startWindow: View,
	endWindow: View,
	frame: Size
): number {
	const startPlacing = placingOf(start, frame);
	const endPlacing = placingOf(end, frame);
	return Math.max(
		...CORNERS.map((corner) =>
			distanceBetween(
				onTheFrameOf(start, startPlacing, startWindow, frame, corner),
				onTheFrameOf(end, endPlacing, endWindow, frame, corner)
			)
		)
	);
}

/**
 * The matrix that carries an object about its box's middle to where it is drawn: seen from the eye where it stands on
 * the frame, flat on the window's plane where it stands inside it.
 */
function placingOf(object: FrameObject, frame: Size): Matrix {
	return chained([eyeOf(object, frame), stanceMatrix(object)]);
}

/**
 * How many of a frame's widths, or heights, an object moves toward a side of what it stands in for all of it as drawn
 * to stand past the edge there: one where it is drawn within its box, more where it is drawn past it, grown, rolled,
 * near or leant. A point of it as drawn moves in step with its box, faster where the eye sees it nearer, so each
 * corner's share of the way is read off where it is drawn now and a frame away.
 */
export function framesPastTheEdge(object: FrameObject, toward: FrameSide, holder: Size): number {
	const away = { ...object, box: pastTheEdge(object.box, toward, holder, ONE_FRAME) };
	const placingHere = placingOf(object, holder);
	const placingAway = placingOf(away, holder);
	return Math.max(
		ONE_FRAME,
		...CORNERS.map((corner) =>
			shareOfTheWayToTheEdge(
				drawnPointOf(object, placingHere, corner),
				drawnPointOf(away, placingAway, corner),
				toward,
				holder
			)
		)
	);
}

/** The share of the way from one point to another at which it meets the edge of what it stands in, on a side. */
function shareOfTheWayToTheEdge(here: Point, there: Point, side: FrameSide, holder: Size): number {
	switch (side) {
		case 'left':
			return (NEAR_EDGE - here.left) / (there.left - here.left);
		case 'right':
			return (holder.width - here.left) / (there.left - here.left);
		case 'top':
			return (NEAR_EDGE - here.top) / (there.top - here.top);
		case 'bottom':
			return (holder.height - here.top) / (there.top - here.top);
	}
}

/**
 * Where a point of an object, in shares of its box, stands on the frame, carried by its placing: where it stands on the
 * frame, there; inside the window, as the page's window shows that point of its plane.
 */
function onTheFrameOf(object: FrameObject, placing: Matrix, window: View, frame: Size, share: Point): Point {
	const drawn = drawnPointOf(object, placing, share);
	switch (object.inside) {
		case 'frame':
			return drawn;
		case 'window':
			return leantOnTheFrame(window, frame, drawn);
	}
}

/** Where a point of an object, in shares of its box, is drawn in what it stands in, carried by its placing. */
function drawnPointOf(object: FrameObject, placing: Matrix, share: Point): Point {
	const box = object.box;
	return carriedAboutItsMiddle(placing, box, { left: share.left * box.width, top: share.top * box.height });
}

/**
 * The matrix an object is seen through about its middle: the eye's where it stands on the frame; none in the window,
 * flat on its plane, which the window carries to the eye as it leans.
 */
function eyeOf(object: FrameObject, frame: Size): Matrix {
	switch (object.inside) {
		case 'frame':
			return seenFromTheEye(object.box, frame);
		case 'window':
			return IDENTITY;
	}
}

/** An object as the stage draws it at a moment of the film, among what stands round it. */
export function drawnObject(name: ObjectName, object: FrameObject, moment: number, around: Surroundings): DrawnObject {
	const stance = drawnStance(object.angle, placingOf(object, around.frame));
	const layer = LAYER_OF[object.content.kind];
	const held = heldIn(object, around.screen);
	const onItsWay = alongItsWay(object.way, presentShare(object));
	const content = drawnContent(object, moment, around.caption);
	const over = drawnOver(object, around.caption);
	return { name, inside: object.inside, over, box: object.box, ...stance, layer, held, onItsWay, content };
}

/**
 * How close a piece of the page shows it, as a pose's zoom has it: the frame's pixels a screen's pixel takes in its
 * box, grown and brought near as it stands; where it leans, its nearer side shows it larger still, so at livereel's
 * bound.
 */
export function pictureZoomOf(object: FrameObject, piece: Piece, frame: Size): number {
	const transform = drawnStance(object.angle, placingOf(object, frame)).transform;
	switch (transform.kind) {
		case 'flat': {
			const grown = Math.hypot(transform.matrix.m11, transform.matrix.m12);
			return (fitIn(piece.source, object.box) * grown) / frameScaleOf(frame);
		}
		case 'leant':
			return ZOOM_AT_MOST;
	}
}

/** The object whose words an object is laid over: keys over a caption's standing at the frame's foot; else none. */
function drawnOver(object: FrameObject, caption: CaptionStanding | null): ObjectName | null {
	return object.content.kind === 'keys' && standOver(caption) ? caption.name : null;
}

/**
 * How much of an object what it stands inside lets show: all of it on the frame; in the page's window, as much as the
 * screen the window shows has come up out of the ground. It fades the object whole, and what it shows stands as far
 * along as its own moves have it: words typed stay typed as their key was heard.
 */
function heldIn(object: FrameObject, screen: Screen): number {
	switch (object.inside) {
		case 'frame':
			return WHOLLY_HELD;
		case 'window':
			return screen.shown;
	}
}

/**
 * What an object shows, drawn as far as its ground and its figure have come up and gone in the way it comes, at a
 * moment of the film, by the caption standing on the frame, if any. What has no ground of its own is its figure alone.
 */
function drawnContent(object: FrameObject, moment: number, caption: CaptionStanding | null): DrawnContent {
	const content = object.content;
	const presences = presencesIn(object.way, object);
	const figure = presences.figure;
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
			return drawnPiece(content, object.box, presentShare(figure));
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

function isSomeName(written: unknown): written is ObjectName {
	return typeof written === 'string' && written !== '';
}
