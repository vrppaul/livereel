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
 *
 * The window's back may show a page of the film's own too, as a slab's back wears a picture of its own: where the eye
 * sees the window's back, the screen shows it in place of what it shows in front, framed by the camera as the front
 * is, mounted so it stands upright once the window is turned over round its width or round its upright; with none,
 * the eye sees the screen through the window's back, mirrored, as before.
 *
 * A page of the film's own runs down its scroll as the film runs it, never of itself: its run is the page's, held by
 * its key, so it goes on as the page is shown on the other face. The run is the knots of the film's time it passes
 * through, where the page stands and how fast it runs at each, joined by a cubic Hermite curve: a pace changing over a
 * move's share lays knots at even points of it, a run brought to rest lays two, the pace it sets off at and rest where
 * it ends, so a move that takes the run over goes on from where it stands and as fast. Where it stands is worked out
 * from the moment, as what else changes with time of itself is, so each exposure of a frame draws it where it stood then
 * and a fast run smears.
 */
import { type Camera, type SeenBetween, screenInTheView, screenPointShift, viewOnTheScreen } from '../domain/camera.ts';
import { type Stretch, hermiteBetween, hermiteSpeedBetween } from '../domain/curves.ts';
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
	frameScaleOf,
	nearestInTheBox,
	middleX,
	middleY,
	overlapOf
} from '../domain/geometry.ts';
import { A_NUMBER, type Kind, OneOf, Plain } from '../domain/handed.ts';
import { between } from '../domain/toward.ts';

/** What the screen shows: the filmed page, or a page of the film's own by its key. */
export type Shows = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string };

/**
 * What the screen shows as the stage draws it: the filmed page, or a page of the film's own by its key, and how far
 * down its scroll it stands, in its pixels.
 */
type DrawnShows =
	{ readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string; readonly scrolled: number };

/**
 * A point of the film's time a page's run passes through: the moment, how far down its scroll the page stands then, in
 * its pixels, and how fast it runs there, its pixels a second. A run's knots may lie past its top or its end, where the
 * page is held.
 */
export interface Knot {
	readonly moment: number;
	readonly top: number;
	readonly pace: number;
}

/**
 * How a page of the film's own runs down its scroll, which it moves by only as the film runs it: the knots its run
 * passes through, the earliest first, as a cubic Hermite curve in time between each two, standing at the first before
 * it and running on at the last's pace after it; and how far it scrolls at most, measured as its move began.
 */
export interface Scroll {
	readonly knots: readonly [Knot, ...Knot[]];
	readonly length: number;
}

/**
 * How a page on the window's back is mounted: upright once the window is turned over round its width, or round its
 * upright.
 */
export type Upright = 'over' | 'round';

/**
 * What the window's back shows: the screen seen through it, or a page of the film's own by its key, mounted as named.
 */
export type Back = { readonly kind: 'seen through' } | BackPage;

/** A page of the film's own on the window's back, by its key, mounted as named. */
type BackPage = { readonly kind: 'own'; readonly key: string; readonly upright: Upright };

/** How a film mounts a page on the window's back. */
export const AN_UPRIGHT: Kind<Upright> = new OneOf<Upright>(
	['over', 'round'],
	'how the page stands upright: once the window is turned over round its width, "over", or round its upright, "round"'
);

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

/**
 * How far the screen has come up, as a film may open on the ground alone, what it shows, the sweep over it, if any,
 * what the window's back shows, and how each page of the film's own the film has run runs, by its key.
 */
export interface Screen {
	readonly shown: Fraction;
	readonly shows: Shows;
	readonly sweep: Sweep | null;
	readonly back: Back;
	readonly scrolls: ReadonlyMap<string, Scroll>;
}

/** Two moments of a frame's time, the earlier first. */
export interface MomentsBetween {
	readonly start: number;
	readonly end: number;
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

/**
 * The screen as the stage draws it: how far it has come up, what it shows on the side of the window the eye sees, the
 * sweep over it as drawn, if any; how the page it shows is mounted where it is the window's back's, which then shows
 * it alone, none where the eye sees the front or the screen through the back; and where the filmed page lies, none
 * where it shows a page of the film's own.
 */
export interface DrawnScreen {
	readonly shown: Fraction;
	readonly shows: DrawnShows;
	readonly sweep: DrawnSweep | null;
	readonly backUpright: Upright | null;
	readonly filmed: FilmedLaid | null;
}

/**
 * Where the filmed page lies on the window's plane, as the camera frames it: its box, in the frame's pixels as the
 * window's box is, and how round its corners are there, which the room lays the page's picture by (`stage/room.js`).
 */
interface FilmedLaid {
	readonly box: Box;
	readonly corner: number;
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
export const SEEN_THROUGH: Back = { kind: 'seen through' };
// No page of the film's own run, each standing at its top
const NONE_RUN: ReadonlyMap<string, Scroll> = new Map();
export const SCREEN_UP: Screen = {
	shown: WHOLE,
	shows: THE_FILMED_PAGE,
	sweep: null,
	back: SEEN_THROUGH,
	scrolls: NONE_RUN
};
export const SCREEN_DOWN: Screen = { ...SCREEN_UP, shown: NONE };

// A page's top, where one the film never ran stands, and the pace it stands still at
export const AT_ITS_TOP = 0;
const STANDING = 0;
// How many even stretches a pace changing over a move's share is laid in knots at, its curve read at each knot, each
// knot as far down as a pace changing evenly from the knot before carries it, which the Hermite curve between them then
// runs exactly: the page's run strays from the curve's by at most its change in pace times its seconds times a curve's
// sharpest bend over 8 × 64², 0.06 pixels for 480 pixels a second gathered over 0.8 s on easeInOutSine
const STRETCHES_OF_A_CHANGE = 64;
// The knot a change of pace sets off from and the first one past it; and a stretch of no seconds, as a pace changed at
// once has
const SETTING_OFF = 0;
const FIRST_ONWARD = 1;
const NO_SECONDS = 0;
// A page the film never ran: at its top since the film began, standing still, scrolling nowhere
const THE_FILMS_START = 0;
const STANDING_AT_ITS_TOP: Scroll = {
	knots: [{ moment: THE_FILMS_START, top: AT_ITS_TOP, pace: STANDING }],
	length: AT_ITS_TOP
};
// How far a page runs on the frame where none of the screen's runs
const NOTHING_RUN = 0;

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

/**
 * The screen as the stage draws it at a moment of the film, the camera that shows it framing the page in its view, in
 * a format, the eye seeing the window's front or its back, a pane's corners as round as the look has them in pixels of
 * a frame 1080 high: the page on the back, with no sweep, where the eye sees the back and the back has a page of its
 * own; the screen as it stands where not; a page of the film's own as far down as the film has run it then.
 */
export function drawnScreen(
	screen: Screen,
	camera: Camera,
	format: Format,
	facingTheEye: boolean,
	paneCorner: number,
	moment: number
): DrawnScreen {
	const backPage = backPageSeen(screen.back, facingTheEye);
	if (backPage !== null) {
		const shows = ownPageDrawn(screen, backPage.key, moment);
		return { shown: screen.shown, shows, sweep: null, backUpright: backPage.upright, filmed: null };
	}
	const sweep = screen.sweep === null ? null : drawnSweep(screen.sweep, partSwept(camera, format), camera.pose.zoom);
	const filmed = screen.shows.kind === 'filmed' ? filmedLaid(camera, format, paneCorner) : null;
	return { shown: screen.shown, shows: frontDrawn(screen, moment), sweep, backUpright: null, filmed };
}

/** What the screen shows in front as the stage draws it at a moment: a page of the film's own as far as it has run. */
function frontDrawn(screen: Screen, moment: number): DrawnShows {
	switch (screen.shows.kind) {
		case 'filmed':
			return screen.shows;
		case 'own':
			return ownPageDrawn(screen, screen.shows.key, moment);
	}
}

/** A page of the film's own, by its key, as the stage draws it at a moment: as far down as the film has run it. */
function ownPageDrawn(screen: Screen, key: string, moment: number): DrawnShows {
	return { kind: 'own', key, scrolled: standingAt(runOf(screen, key), moment).top };
}

/** How a page of the film's own runs on the screen, by its key: standing at its top where the film never ran it. */
export function runOf(screen: Screen, key: string): Scroll {
	return screen.scrolls.get(key) ?? STANDING_AT_ITS_TOP;
}

/**
 * Where a running page stands at a moment and how fast it runs there: on its run, held between its top and its end,
 * standing still where it is held at an end it runs into.
 */
export function standingAt(run: Scroll, moment: number): Knot {
	const unheld = unheldAt(run, moment);
	const top = Math.min(Math.max(unheld.top, AT_ITS_TOP), run.length);
	const heldAtAnEnd = (top >= run.length && unheld.pace > STANDING) || (top <= AT_ITS_TOP && unheld.pace < STANDING);
	return { moment, top, pace: heldAtAnEnd ? STANDING : unheld.pace };
}

/**
 * A page set off running at a pace from where it stands as its move begins, over a stretch of the film's time: its
 * pace changing from what it is there to the one named along the stretch, on its curve, in knots at even points of
 * it, at once where the stretch takes no time; as far as it scrolls at most, measured as it sets off.
 */
export function setOff(from: Knot, stretch: Stretch, pace: number, length: number): Scroll {
	if (stretch.seconds === NO_SECONDS) return { knots: [{ ...from, pace }], length };
	const knotSeconds = stretch.seconds / STRETCHES_OF_A_CHANGE;
	const first: Knot = { ...from, pace: paceOfAChange(from.pace, pace, stretch, SETTING_OFF) };
	const later: Knot[] = [];
	let before = first;
	for (let point = FIRST_ONWARD; point <= STRETCHES_OF_A_CHANGE; point += 1) {
		const pacedAt = paceOfAChange(from.pace, pace, stretch, point);
		// The pace changing evenly from the knot before, the page runs the mean of the two paces over the time
		const top = before.top + ((before.pace + pacedAt) / HALVES) * knotSeconds;
		const knot = { moment: stretch.moment + point * knotSeconds, top, pace: pacedAt };
		later.push(knot);
		before = knot;
	}
	return { knots: [first, ...later], length };
}

/**
 * A page brought to rest at a scroll from where it stands as its move begins, over a stretch of the film's time:
 * setting off at the pace it runs there and slowing on a cubic Hermite curve to stand still there as the stretch ends;
 * at once where the stretch takes no time; as far as it scrolls at most, measured as it sets off.
 */
export function runToRest(from: Knot, stretch: Stretch, rest: number, length: number): Scroll {
	const resting: Knot = { moment: stretch.moment + stretch.seconds, top: rest, pace: STANDING };
	if (stretch.seconds === NO_SECONDS) return { knots: [resting], length };
	return { knots: [from, resting], length };
}

/** A page's pace at an even point of a change from one pace to another over a stretch, on the stretch's curve. */
function paceOfAChange(from: number, to: number, stretch: Stretch, point: number): number {
	return between(from, to, stretch.ease(point / STRETCHES_OF_A_CHANGE));
}

/**
 * Where a running page stands at a moment and how fast it runs, unheld by its top or its end: at its first knot
 * before it, on the curve between the two knots around it, and on at its last knot's pace after it.
 */
function unheldAt(run: Scroll, moment: number): Knot {
	const [first, ...later] = run.knots;
	if (moment <= first.moment) return { ...first, moment };
	let before = first;
	for (const knot of later) {
		if (moment < knot.moment) return betweenKnots(before, knot, moment);
		before = knot;
	}
	return { moment, top: before.top + before.pace * (moment - before.moment), pace: before.pace };
}

/** Where a running page stands and how fast it runs at a moment between two knots: on a cubic Hermite curve in time. */
function betweenKnots(start: Knot, end: Knot, moment: number): Knot {
	const seconds = end.moment - start.moment;
	const progress = (moment - start.moment) / seconds;
	// The curve's speeds are so much of the page's way over its whole time
	const from = { value: start.top, speed: start.pace * seconds };
	const to = { value: end.top, speed: end.pace * seconds };
	return { moment, top: hermiteBetween(from, to, progress), pace: hermiteSpeedBetween(from, to, progress) / seconds };
}

/**
 * How far the pages of the film's own on the screen's faces run on the frame between two moments, as a camera shows
 * the screen, apart from how far the camera carries it, which it counts itself: the farthest of them, by the point at
 * the middle of what the camera shows of the screen, carried up the screen as far as its page ran. Both faces' pages
 * are measured, as which face the eye sees is the window's to say: a page run unseen costs exposures, never a frame.
 */
export function runShift(camera: Camera, format: Format, start: Screen, end: Screen, moments: MomentsBetween): number {
	const shown = viewOnTheScreen(camera, format.frame);
	const middle: Point = { left: middleX(shown), top: middleY(shown) };
	const ran = pagesOnItsFaces(end).map(
		(key) => standingAt(runOf(end, key), moments.end).top - standingAt(runOf(start, key), moments.start).top
	);
	return Math.max(NOTHING_RUN, ...ran.map((pixels) => ranOnTheFrame(camera, format, middle, pixels)));
}

/** How far a point of the screen moves on the frame as a camera shows it, carried up the screen so many pixels. */
function ranOnTheFrame(camera: Camera, format: Format, point: Point, pixels: number): number {
	const still: SeenBetween = { start: camera, end: camera, frame: format.frame };
	return screenPointShift(still, point, { left: point.left, top: point.top - pixels });
}

/** The keys of the pages of the film's own the screen's faces show: in front, and on the window's back. */
function pagesOnItsFaces(screen: Screen): readonly string[] {
	return [screen.shows, screen.back].flatMap((face) => (face.kind === 'own' ? [face.key] : []));
}

/**
 * Where the filmed page lies on the window's plane, as a camera frames it in a format: the whole screen in the view,
 * carried from the view's corner to where the view stands, its corners as round as a pane's at the frame's scale.
 */
function filmedLaid(camera: Camera, format: Format, paneCorner: number): FilmedLaid {
	const inTheView = screenInTheView(camera, format);
	const view = camera.view.box;
	return {
		box: { ...inTheView, left: view.left + inTheView.left, top: view.top + inTheView.top },
		corner: paneCorner * frameScaleOf(format.frame)
	};
}

/**
 * The page of the film's own the screen shows on the window's back, where the eye sees the back and the back has one;
 * none where the eye sees the window's front, or the screen through its back.
 */
export function backPageSeen(back: Back, facingTheEye: boolean): BackPage | null {
	return !facingTheEye && back.kind === 'own' ? back : null;
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
