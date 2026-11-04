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
 * and goes as far past the far one, so its light comes onto the page and leaves it whole.
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
	diagonalOf,
	middleX,
	middleY,
	overlapOf
} from '../domain/geometry.ts';
import { A_NUMBER, type Kind, Plain } from '../domain/handed.ts';
import { between } from '../domain/time.ts';

/** What the screen shows: the filmed page, or a page of the film's own by its key. */
export type Shows = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string };

/**
 * The colours a band of light's crest runs through: from its start, the end nearer the top, or its left where it lies
 * level, to its end; none at an end the film names no colour for, drawn in the look's accent as it stands.
 */
interface Crest {
	readonly start: string | null;
	readonly end: string | null;
}

/**
 * A band of light sweeping away the picture the screen showed: the picture, held by its number as the sweep began; the
 * side of the window the band comes from, how far it stands slanted from that side, degrees clockwise as the upright
 * screen shows it, and how wide it is, in pixels of a frame 1080 high; its crest; and how far it has swept the window.
 */
export interface Sweep {
	readonly picture: number;
	readonly from: FrameSide;
	readonly slant: number;
	readonly width: number;
	readonly crest: Crest;
	readonly swept: Fraction;
}

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
 * A sweep as the stage draws it on the screen, in its pixels: the picture held; the band's line; how far from it the
 * far side of the picture still to sweep stands, across and down, past the window; how wide the band is, in pixels of
 * a frame 1080 high; and its crest.
 */
export interface DrawnSweep {
	readonly picture: number;
	readonly band: DrawnBand;
	readonly ahead: Point;
	readonly width: number;
	readonly crest: Crest;
}

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
// No picture a screen swept by none holds
const NO_PICTURE: readonly number[] = [];

/** The screen as the stage draws it, the camera that shows it framing the page in its view, in a format. */
export function drawnScreen(screen: Screen, camera: Camera, format: Format): DrawnScreen {
	const sweep = screen.sweep === null ? null : drawnSweep(screen.sweep, partSwept(camera, format), camera.pose.zoom);
	return { shown: screen.shown, shows: screen.shows, sweep };
}

/**
 * A sweep as the stage draws it on the screen, where a part of it, in its pixels, shows in the window at a camera's
 * zoom: the band's line across that part, as far along its way as it has swept, from half its width behind the part's
 * nearest corner to as far beyond its farthest, as long as the part's corners stand apart, so it crosses the part
 * whole however it lies; and the picture still to sweep reaching from it as far beyond as the band's whole way.
 */
export function drawnSweep(sweep: Sweep, shown: Box, zoom: number): DrawnSweep {
	const crossing = turnedClockwise(CROSSING_FROM[sweep.from], sweep.slant);
	const along = fromItsTop(quarterTurnedClockwise(crossing));
	// The band's whole way: from the part's nearest corner to its farthest along it, and half the band past each, the
	// band in pixels of a frame 1080 high, as many of the screen's as a camera at a zoom of 1 shows
	const wayAcross = shown.width * Math.abs(crossing.left) + shown.height * Math.abs(crossing.top) + sweep.width / zoom;
	const middle = movedAlong(
		{ left: middleX(shown), top: middleY(shown) },
		crossing,
		between(-wayAcross / HALVES, wayAcross / HALVES, sweep.swept)
	);
	const halfLong = diagonalOf(shown) / HALVES;
	return {
		picture: sweep.picture,
		band: { start: movedAlong(middle, along, -halfLong), end: movedAlong(middle, along, halfLong) },
		ahead: movedAlong(UNMOVED, crossing, wayAcross),
		width: sweep.width,
		crest: sweep.crest
	};
}

/**
 * How far a band sweeping the screen moves on the frame from where it stood to where it stands, as each moment's camera
 * shows it: the way its line's middle goes.
 */
export function sweepShift(seen: SeenBetween, format: Format, start: Sweep, end: Sweep): number {
	return screenPointShift(seen, bandMiddleOf(start, seen.start, format), bandMiddleOf(end, seen.end, format));
}

/** The picture a screen's sweep holds, if any. */
export function pictureSweptBy(screen: Screen): readonly number[] {
	return screen.sweep === null ? NO_PICTURE : [screen.sweep.picture];
}

/** The middle of a band's line on the screen, as a camera frames the page in its view, in a format. */
function bandMiddleOf(sweep: Sweep, camera: Camera, format: Format): Point {
	const band = drawnSweep(sweep, partSwept(camera, format), camera.pose.zoom).band;
	return { left: (band.start.left + band.end.left) / HALVES, top: (band.start.top + band.end.top) / HALVES };
}

/**
 * The part of the screen a band sweeps across, in its pixels: what a camera's view shows of it as the camera frames the
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
