/**
 * The screen the page is shown on, how far it has come up out of the ground, and what it shows: the filmed page, or a
 * page of the film's own, written whole in HTML, as a slide is, shown in its place — framed by the camera, leant with
 * the window, seen and blurred by the eye as the filmed page is. A page of the film's own is known by a key its move
 * works out from its HTML (`src/direction/page.ts`), so the scene and every frame drawn carry the key alone.
 *
 * A band of light may sweep away the picture the screen showed, the page as it stands showing behind it: the picture,
 * held as the sweep began, lies over the page, under the light, the holes and the cursor, cut along the band. The band
 * crosses what the window shows of the screen, from a side of it to the other, slanted as the film has it, as the
 * camera frames the page there, wherever the camera goes meanwhile; it comes on from half its width past the near side
 * and goes as far past the far one, so its light comes onto the page and leaves it whole. Or a disc opens round a point
 * of the screen, its ring of light growing from its middle to past the farthest corner of what the window shows, the
 * picture kept outside it alone.
 */
import { type Camera, type SeenBetween, screenPointShift, viewOnTheScreen } from '../domain/camera.ts';
import { type Fraction, NONE, WHOLE } from '../domain/fraction.ts';
import type { Format } from '../domain/format.ts';
import {
	type Box,
	type FrameSide,
	type Point,
	UNMOVED,
	boxOf,
	cornersOf,
	diagonalOf,
	distanceBetween,
	nearestInTheBox,
	middleX,
	middleY,
	overlapOf
} from '../domain/geometry.ts';
import { A_NUMBER, type Kind, Plain } from '../domain/handed.ts';
import { between } from '../domain/time.ts';

/** What the screen shows: the filmed page, or a page of the film's own by its key. */
export type Shows = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string };

/**
 * The colours a sweep's crest runs through: a band's from its start, the end nearer the top, or its left where it lies
 * level, to its end; a disc's ring's from its start at the top round to its end at the bottom and back; none at an end
 * the film names no colour for, drawn in the look's accent as it stands.
 */
interface Crest {
	readonly start: string | null;
	readonly end: string | null;
}

/**
 * Light sweeping away the picture the screen showed: the picture, held by its number as the sweep began; how wide the
 * light is, in pixels of a frame 1080 high; its crest; and how far it has swept the window. A band comes from a side of
 * the window, slanted from that side, degrees clockwise as the upright screen shows it; a disc opens round a point of
 * the screen, in its pixels.
 */
export type Sweep = SweepShape & SweepOfAnyShape;

/** The shape light sweeps the screen in: a band from a side of the window, slanted; or a disc round a point of it. */
export type SweepShape = BandShape | DiscShape;

interface BandShape {
	readonly kind: 'band';
	readonly from: FrameSide;
	readonly slant: number;
}

interface DiscShape {
	readonly kind: 'disc';
	readonly round: Point;
}

interface SweepOfAnyShape {
	readonly picture: number;
	readonly width: number;
	readonly crest: Crest;
	readonly swept: Fraction;
}

type BandSweep = BandShape & SweepOfAnyShape;
type DiscSweep = DiscShape & SweepOfAnyShape;

/** How far the screen has come up, as a film may open on the ground alone, what it shows, and the sweep over it, if any. */
export interface Screen {
	readonly shown: Fraction;
	readonly shows: Shows;
	readonly sweep: Sweep | null;
}

/** A band's line across the window, in the screen's pixels: from its start, the end nearer the top, to its end. */
interface DrawnBand {
	readonly start: Point;
	readonly end: Point;
}

/**
 * A sweep as the stage draws it on the screen, in its pixels: the picture held; its shape; how wide its light is, in
 * pixels of a frame 1080 high; and its crest. A band's shape is its line, and how far from it the far side of the
 * picture still to sweep stands, across and down, past the window; a disc's, its middle and its radius, less than none
 * while its ring has still to come out of its middle.
 */
export interface DrawnSweep {
	readonly picture: number;
	readonly shape: DrawnSweepShape;
	readonly width: number;
	readonly crest: Crest;
}

type DrawnSweepShape =
	| { readonly kind: 'band'; readonly band: DrawnBand; readonly ahead: Point }
	| { readonly kind: 'disc'; readonly middle: Point; readonly radius: number };

/** The screen as the stage draws it: how far it has come up, what it shows, and the sweep over it as drawn, if any. */
export interface DrawnScreen {
	readonly shown: Fraction;
	readonly shows: Shows;
	readonly sweep: DrawnSweep | null;
}

// How far a band may stand slanted from the side it comes from, either way: short of a quarter turn, where it would lie
// along its own way
const QUARTER_TURN = 90;

/** How far a film slants a band from the side it comes from: short of a quarter turn either way. */
export const A_SLANT: Kind<number> = new Plain(
	(written): written is number => A_NUMBER.is(written) && Math.abs(written) < QUARTER_TURN,
	'a slant, degrees turned clockwise from the side it comes from, more than -90 and less than 90'
);

export const THE_FILMED_PAGE: Shows = { kind: 'filmed' };
export const SCREEN_UP: Screen = { shown: WHOLE, shows: THE_FILMED_PAGE, sweep: null };
export const SCREEN_DOWN: Screen = { shown: NONE, shows: THE_FILMED_PAGE, sweep: null };

// Which way a band coming from each side of the window goes across it, before it is slanted
const CROSSING_FROM: { readonly [Side in FrameSide]: Point } = {
	left: { left: 1, top: 0 },
	right: { left: -1, top: 0 },
	top: { left: 0, top: 1 },
	bottom: { left: 0, top: -1 }
};
const HALVES = 2;
const DEGREES_IN_A_HALF_TURN = 180;
// The ways from a disc's middle to the points of its ring its shift is measured by: up, right, down and left
const RING_WAYS: readonly Point[] = [
	{ left: 0, top: -1 },
	{ left: 1, top: 0 },
	{ left: 0, top: 1 },
	{ left: -1, top: 0 }
];
// No picture a screen swept by none holds
const NO_PICTURE: readonly number[] = [];

/** The screen as the stage draws it, the camera that shows it framing the page in its view, in a format. */
export function drawnScreen(screen: Screen, camera: Camera, format: Format): DrawnScreen {
	const sweep = screen.sweep === null ? null : drawnSweep(screen.sweep, partSwept(camera, format), camera.pose.zoom);
	return { shown: screen.shown, shows: screen.shows, sweep };
}

/**
 * A sweep as the stage draws it on the screen, where a part of it, in its pixels, shows in the window at a camera's
 * zoom: its shape there, as far along its way as it has swept, its light in pixels of a frame 1080 high, as many of the
 * screen's as a camera at a zoom of 1 shows.
 */
export function drawnSweep(sweep: Sweep, shown: Box, zoom: number): DrawnSweep {
	return { picture: sweep.picture, shape: drawnShapeOf(sweep, shown, zoom), width: sweep.width, crest: sweep.crest };
}

/**
 * How far a sweep's light moves on the frame from where it stood to where it stands, as each moment's camera shows it:
 * the way the point of it that goes farthest goes, a band's line's middle or one of a disc's ring's four, above, below
 * and either side of its middle, as a camera panning one way while the ring grows carries its far side farthest.
 */
export function sweepShift(seen: SeenBetween, format: Format, start: Sweep, end: Sweep): number {
	const startPoints = lightPointsOf(start, seen.start, format);
	const endPoints = lightPointsOf(end, seen.end, format);
	return Math.max(...startPoints.map((point, place) => screenPointShift(seen, point, pointAt(endPoints, place))));
}

/** The picture a screen's sweep holds, if any. */
export function pictureSweptBy(screen: Screen): readonly number[] {
	return screen.sweep === null ? NO_PICTURE : [screen.sweep.picture];
}

/** A sweep's shape on the screen, where a part of it shows in the window at a camera's zoom. */
function drawnShapeOf(sweep: Sweep, shown: Box, zoom: number): DrawnSweepShape {
	switch (sweep.kind) {
		case 'band':
			return drawnBand(sweep, shown, zoom);
		case 'disc':
			return drawnDisc(sweep, shown, zoom);
	}
}

/**
 * A band's line across a part of the screen, as far along its way as it has swept, from half its width behind the
 * part's nearest corner to as far beyond its farthest, as long as the part's corners stand apart, so it crosses the
 * part whole however it lies; and the picture still to sweep reaching from it as far beyond as the band's whole way.
 */
function drawnBand(sweep: BandSweep, shown: Box, zoom: number): DrawnSweepShape {
	const crossing = turnedClockwise(CROSSING_FROM[sweep.from], sweep.slant);
	const along = fromItsTop(quarterTurnedClockwise(crossing));
	// The band's whole way: from the part's nearest corner to its farthest along it, and half the band past each
	const wayAcross = shown.width * Math.abs(crossing.left) + shown.height * Math.abs(crossing.top) + sweep.width / zoom;
	const middle = movedAlong(
		{ left: middleX(shown), top: middleY(shown) },
		crossing,
		between(-wayAcross / HALVES, wayAcross / HALVES, sweep.swept)
	);
	const halfLong = diagonalOf(shown) / HALVES;
	return {
		kind: 'band',
		band: { start: movedAlong(middle, along, -halfLong), end: movedAlong(middle, along, halfLong) },
		ahead: movedAlong(UNMOVED, crossing, wayAcross)
	};
}

/**
 * A disc round its middle, its radius as far along its way as it has swept: from its ring, as wide as its light,
 * standing wholly in its middle, or wholly at the nearest point of a part of the screen where its middle stands past
 * it, so its light comes on at once as a band's does, to standing wholly past the part's farthest corner from it.
 */
function drawnDisc(sweep: DiscSweep, shown: Box, zoom: number): DrawnSweepShape {
	const halfTheRing = sweep.width / zoom / HALVES;
	const nearest = distanceBetween(sweep.round, nearestInTheBox(sweep.round, shown));
	const farthest = Math.max(...cornersOf(shown).map((corner) => distanceBetween(corner, sweep.round)));
	const radius = between(nearest - halfTheRing, farthest + halfTheRing, sweep.swept);
	return { kind: 'disc', middle: sweep.round, radius };
}

/**
 * The points of a sweep's light on the screen its shift is measured by, as a camera frames the page in its view, in a
 * format: the middle of a band's line; a disc's ring above, below and either side of its middle.
 */
function lightPointsOf(sweep: Sweep, camera: Camera, format: Format): readonly Point[] {
	const shape = drawnShapeOf(sweep, partSwept(camera, format), camera.pose.zoom);
	switch (shape.kind) {
		case 'band':
			return [
				{
					left: (shape.band.start.left + shape.band.end.left) / HALVES,
					top: (shape.band.start.top + shape.band.end.top) / HALVES
				}
			];
		case 'disc':
			return RING_WAYS.map((way) => movedAlong(shape.middle, way, shape.radius));
	}
}

/** The point of a sweep's light where it stands that one where it stood measures its shift by: its light's shape is kept. */
function pointAt(points: readonly Point[], place: number): Point {
	const point = points[place];
	if (point === undefined) throw new Error(`a sweep's light has no point ${place}: its shape changed as it swept`);
	return point;
}

/**
 * The part of the screen a sweep's light crosses, in its pixels: what a camera's view shows of it as the camera frames the
 * page, not the ground past its edges; the view's own part where it shows none of the screen, as nothing swept shows.
 */
function partSwept(camera: Camera, format: Format): Box {
	const view = viewOnTheScreen(camera, format.frame);
	return overlapOf(view, boxOf(format.screen)) ?? view;
}

/** A way across the screen turned clockwise, as the upright screen shows it, by so many degrees. */
function turnedClockwise(way: Point, degrees: number): Point {
	const radians = (degrees * Math.PI) / DEGREES_IN_A_HALF_TURN;
	return {
		left: way.left * Math.cos(radians) - way.top * Math.sin(radians),
		top: way.left * Math.sin(radians) + way.top * Math.cos(radians)
	};
}

/** A way across the screen turned a quarter clockwise, as the upright screen shows it, exactly. */
function quarterTurnedClockwise(way: Point): Point {
	return { left: -way.top, top: way.left };
}

/** A way along a band's line, from its end nearer the top to the other, or from its left where it lies level. */
function fromItsTop(way: Point): Point {
	const downward = way.top > 0 || (way.top === 0 && way.left > 0);
	return downward ? way : { left: -way.left, top: -way.top };
}

/** A point moved so far along a way across the screen. */
function movedAlong(point: Point, way: Point, distance: number): Point {
	return { left: point.left + way.left * distance, top: point.top + way.top * distance };
}
