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
 * Or the screen fades from the page it showed into the one it shows now: a picture of that page, held as the fade
 * began, lies over the screen as the camera framed the page then, whatever the camera frames now, so the page coming
 * may be framed closer or farther than the page going, and goes from whole to none over a stretch of the film's time,
 * on its curve, as clear as the screen has come up. It is the page going, not the screen: the window's shade dims,
 * fades and blurs the page coming alone, so that page may come up out of the dark under the one going, as the
 * claude-review promo's review comes up under its terminal; and the light, the cursor and the holes, which lie on the
 * page coming, lie under it. Its stretch is the film's time, not a move's share, so a fade begun in a cut, where the
 * camera may move at once to frame the page coming, goes on over the steps after it.
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
 * it ends, so a move that takes the run over goes on from where it stands and as fast. A run brought to rest with its
 * pace judged at a point of the frame lays knots at even points of its share too, so what the point shows comes to rest
 * on that curve across the frame, wherever the frame stands meanwhile. Where the page stands is worked out from the
 * moment, as what else changes with time of itself is, so each exposure of a frame draws it where it stood then and a
 * fast run smears.
 *
 * A film may type into a block of a page of its own, which then shows what stands typed as its text in place of what
 * the page wrote there. What stands typed is the page's too, held by its key and the block's selector until the film
 * types into that block again, so it stays as the page is shown on the other face, or not at all.
 *
 * How far a page of the film's own scrolls at most is held once, beside what stands typed in it, by its key: the two
 * are its document as it stands, and text typed may wrap and lengthen it. The take reads it as the stage lays the page,
 * nothing typed; a typing reads it for the text standing typed at each of its strokes as it begins, so it changes on
 * the frame a letter lands that wraps a line. Its run is held at its end and the sheet reaches below the screen by that
 * one length, so neither holds a copy that a typing after it leaves short.
 *
 * A page of the film's own the screen shows in front is cut at the screen's edges, or, where the film asks, drawn on
 * past the screen's top and foot as a sheet longer than the hand that holds it: as far as its document runs on there,
 * above what has run past the screen's top and below its foot, and as far as the frame sees the window's plane, which
 * bounds how much the stage lays. Its sides are the screen's, as a document laid out at the screen's width has nothing
 * past them. The page's run is where the screen's top stands in its document, as when it is cut, so a run and a rest
 * are the same either way; what is drawn above has run past already, and the stage lays it in a frame of its own,
 * scrolled that much less, what is typed into it written there as on the screen. The camera cuts its picture at the
 * sheet's edges where it cut it at the screen's.
 */
import {
	type Camera,
	type Pose,
	type SeenBetween,
	screenFramedBy,
	screenPlaneSeen,
	screenPointShift,
	viewOnTheScreen
} from '../domain/camera.ts';
import { type HermiteEnd, type Stretch, hermiteBetween, hermiteSpeedBetween } from '../domain/curves.ts';
import { type Fraction, NONE, WHOLE, fractionOf } from '../domain/fraction.ts';
import type { Format } from '../domain/format.ts';
import { boxInTheView } from '../domain/framing.ts';
import { facesTheEye, windowInTheWorld } from '../domain/placement.ts';
import {
	type Box,
	type FrameSide,
	type Point,
	type Size,
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
import type { OwnPageStanding } from '../domain/own-page.ts';
import { between } from '../domain/toward.ts';
import type { TypedText } from '../domain/typing.ts';

/** What the screen shows: the filmed page, or a page of the film's own by its key, drawn as far as it reaches. */
export type Shows = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string; readonly reach: Reach };

/** A page the screen may show, however far it is drawn: the filmed page, or a page of the film's own by its key. */
export type PageOfTheScreen = { readonly kind: 'filmed' } | { readonly kind: 'own'; readonly key: string };

/** The page the screen shows in front, however far it is drawn. */
export function pageShownBy(shows: Shows): PageOfTheScreen {
	switch (shows.kind) {
		case 'filmed':
			return shows;
		case 'own':
			return { kind: 'own', key: shows.key };
	}
}

/** Whether two pages of the screen are one: both the filmed page, or the film's own by one key. */
export function isOnePage(first: PageOfTheScreen, second: PageOfTheScreen): boolean {
	switch (first.kind) {
		case 'filmed':
			return second.kind === 'filmed';
		case 'own':
			return second.kind === 'own' && second.key === first.key;
	}
}

/**
 * How far a page of the film's own the screen shows in front is drawn: cut at the screen's edges, `'screen'`; or on
 * past its top and foot as far as its document runs and the frame sees, `'document'`.
 */
export type Reach = 'screen' | 'document';

/** How far a page of the film's own is drawn on past the screen's top and past its foot, in its pixels. */
export interface PastTheScreen {
	readonly above: number;
	readonly below: number;
}

/**
 * A page of the film's own drawn past its screen as the stage lays it: how far past the screen's top and foot, in its
 * pixels, and how far down its document the top of what is laid stands.
 */
export interface DrawnSheet extends PastTheScreen {
	readonly scrolled: number;
}

/**
 * What the screen shows as the stage draws it: the filmed page, or a page of the film's own as it stands, and the
 * sheet it is laid as past the screen, none where it is drawn on the screen alone.
 */
type DrawnShows =
	{ readonly kind: 'filmed' } | ({ readonly kind: 'own'; readonly sheet: DrawnSheet | null } & OwnPageStanding);

/**
 * What stands typed in a page of the film's own: the text a film typed into each block of it, by the block's selector,
 * in the order the film first typed into each.
 */
export type TypedBlocks = ReadonlyMap<string, string>;

/**
 * A page of the film's own as its document stands: what stands typed in it, and how far it then scrolls at most, in
 * its pixels, none where the screen holds all of it.
 */
export interface OwnDocument {
	readonly typed: TypedBlocks;
	readonly scrollLength: number;
}

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
 * it and running on at the last's pace after it. Where it is held, at its top and at its document's end as it stands
 * then, is the page's to say (`standingOn`).
 */
export interface Scroll {
	readonly knots: readonly [Knot, ...Knot[]];
}

/**
 * A run judged on the frame's way across the frame where it is judged, a cubic Hermite curve to rest: how fast what the
 * point shows sets off there and how far it goes, each in the frame's pixels, the speed so many of them over the run's
 * whole time.
 */
export interface WayOnTheFrame {
	readonly settingOff: number;
	readonly way: number;
}

/**
 * A page brought to rest with its pace judged on the frame: its run, and its way across the frame where it is judged.
 */
export interface JudgedRun {
	readonly run: Scroll;
	readonly onTheFrame: WayOnTheFrame;
}

/**
 * How far down its page a run judged on the frame goes by each of its knots for each pixel across the frame of each of
 * its curve's weights: its way to rest, and its setting off.
 */
interface CurveWays {
	readonly towardTheEnd: readonly number[];
	readonly settingOff: readonly number[];
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
 * The screen fading from a page it showed: a picture of that page, held by its number as the fade began; how the camera
 * framed it then; and the stretch of the film's time it goes from whole to none over, on its curve.
 */
export interface Fade {
	readonly picture: number;
	readonly framing: Pose;
	readonly over: Stretch;
}

/**
 * The page the screen fades from as the stage draws it: the picture held; where the whole screen stood as the camera
 * framed it as the fade began, in the screen's pixels as the camera frames them now; and how much of it still shows,
 * as far as the fade has left it and the screen has come up.
 */
interface DrawnFade {
	readonly picture: number;
	readonly box: Box;
	readonly shown: Fraction;
}

/**
 * How far the screen has come up, as a film may open on the ground alone, what it shows, the sweep over it, if any,
 * the page it fades from, if any, what the window's back shows, and, by its key, how each page of the film's own the
 * film has run runs and how each page the stage laid stands as a document.
 */
export interface Screen {
	readonly shown: Fraction;
	readonly shows: Shows;
	readonly sweep: Sweep | null;
	readonly fade: Fade | null;
	readonly back: Back;
	readonly scrolls: ReadonlyMap<string, Scroll>;
	readonly documents: ReadonlyMap<string, OwnDocument>;
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
 * sweep over it as drawn, if any, and the page it fades from, if any; how the page it shows is mounted where it is the
 * window's back's, which then shows it alone, none where the eye sees the front or the screen through the back; and
 * where the filmed page lies, none where it shows a page of the film's own.
 */
export interface DrawnScreen {
	readonly shown: Fraction;
	readonly shows: DrawnShows;
	readonly sweep: DrawnSweep | null;
	readonly fade: DrawnFade | null;
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
export const CUT_AT_THE_SCREEN: Reach = 'screen';
export const DRAWN_TO_ITS_DOCUMENT: Reach = 'document';
export const SEEN_THROUGH: Back = { kind: 'seen through' };
// No page of the film's own run, each standing at its top; none laid; and nothing typed in a page as the stage lays it
const NONE_RUN: ReadonlyMap<string, Scroll> = new Map();
const NONE_LAID: ReadonlyMap<string, OwnDocument> = new Map();
export const NOTHING_TYPED: TypedBlocks = new Map();
export const SCREEN_UP: Screen = {
	shown: WHOLE,
	shows: THE_FILMED_PAGE,
	sweep: null,
	fade: null,
	back: SEEN_THROUGH,
	scrolls: NONE_RUN,
	documents: NONE_LAID
};
export const SCREEN_DOWN: Screen = { ...SCREEN_UP, shown: NONE };

// A page's top, where one the film never ran stands, and the pace it stands still at
export const AT_ITS_TOP = 0;
export const STANDING = 0;
// How many even stretches a pace changing over a move's share is laid in knots at, its curve read at each knot, each
// knot as far down as a pace changing evenly from the knot before carries it, which the Hermite curve between them then
// runs exactly: the page's run strays from the curve's by at most its change in pace times its seconds times a curve's
// sharpest bend over 8 × 64², 0.06 pixels for 480 pixels a second gathered over 0.8 s on easeInOutSine
const STRETCHES_OF_A_CHANGE = 64;
// The knot a change of pace sets off from and the first one past it
const SETTING_OFF = 0;
const FIRST_ONWARD = 1;
// A run judged on the frame lays its knots as a change of pace does, at even points of its move's share, and measures
// the frame at each and half way to the next, summing the page's way over each stretch by Simpson's rule: its ends
// weigh 1 and its middle 4 of 6, exact for a frame that holds still, as the curve's speeds are of the second power;
// one measure past another, as the stretch's end is past its last half; the way a run has gone at its start; and the
// ends of the curve's weights: still at none and at 1, and setting off at 1
const SIMPSONS_MIDDLE_WEIGHT = 4;
const SIMPSONS_WHOLE = 6;
const ONE_MEASURE = 1;
const NO_WAY_YET = 0;
const STILL_AT_NONE: HermiteEnd = { value: 0, speed: 0 };
const STILL_AT_ONE: HermiteEnd = { value: 1, speed: 0 };
const SETTING_OFF_AT_ONE: HermiteEnd = { value: 0, speed: 1 };
/**
 * A stretch of no seconds, as a move done at once has, in a cut: its run changes at once and runs nowhere on its way.
 */
export const NO_SECONDS = 0;
// A page the film never ran: at its top since the film began, standing still
const THE_FILMS_START = 0;
const STANDING_AT_ITS_TOP: Scroll = { knots: [{ moment: THE_FILMS_START, top: AT_ITS_TOP, pace: STANDING }] };
// How far a page runs on the frame where none of the screen's runs
const NOTHING_RUN = 0;
// How far past the screen a page is drawn where nothing of it is; and the most that arithmetic leaves past it where the
// frame sees the screen's edge itself, under a millionth of a pixel, which is no page drawn past it
const NOTHING_PAST = 0;
const ARITHMETIC_LEFT = 1e-6;

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
// No picture a screen swept by none, or fading from none, holds
const NO_PICTURE: readonly number[] = [];
// How far through its stretch a fade stands before it and after it
const NOT_BEGUN = 0;
const THROUGH = 1;

/**
 * The screen as the stage draws it at a moment of the film, the camera that shows it framing the page in its view, in
 * a format, the eye seeing the window's front or its back, a pane's corners as round as the look has them in pixels of
 * a frame 1080 high: the page on the back, with no sweep and no fade, where the eye sees the back and the back has a
 * page of its own; the screen as it stands where not; a page of the film's own as far down as the film has run it
 * then, the one in front laid as far past the screen as it is drawn (`pastTheScreen`).
 */
export function drawnScreen(
	screen: Screen,
	camera: Camera,
	format: Format,
	facingTheEye: boolean,
	paneCorner: number,
	moment: number,
	past: PastTheScreen | null
): DrawnScreen {
	const backPage = backPageSeen(screen.back, facingTheEye);
	if (backPage !== null) {
		const shows = ownPageDrawn(screen, backPage.key, moment, null);
		return { shown: screen.shown, shows, sweep: null, fade: null, backUpright: backPage.upright, filmed: null };
	}
	const sweep = screen.sweep === null ? null : drawnSweep(screen.sweep, partSwept(camera, format), camera.pose.zoom);
	const fade = drawnFade(screen, camera.pose, format.screen, moment);
	const filmed = screen.shows.kind === 'filmed' ? filmedLaid(camera, format, paneCorner) : null;
	return { shown: screen.shown, shows: frontDrawn(screen, moment, past), sweep, fade, backUpright: null, filmed };
}

/**
 * The page a screen fades from as the stage draws it at a moment, the camera framing the screen of a size by a pose
 * now: none where the screen fades from none, or has faded from it whole by then.
 */
function drawnFade(screen: Screen, framedNow: Pose, size: Size, moment: number): DrawnFade | null {
	const fade = screen.fade;
	if (fade === null || !fadesAt(fade, moment)) return null;
	const gone = fade.over.ease(shareThrough(fade.over, moment));
	return {
		picture: fade.picture,
		box: screenFramedBy(fade.framing, framedNow, size),
		shown: fractionOf((WHOLE - gone) * screen.shown)
	};
}

/** Whether a screen still fades from a page at a moment: before its fade's end. */
export function fadesAt(fade: Fade, moment: number): boolean {
	return moment < fadeEndOf(fade);
}

/** The moment a screen has faded from a page whole. */
export function fadeEndOf(fade: Fade): number {
	return fade.over.moment + fade.over.seconds;
}

/** How far through a stretch of the film's time a moment stands, held from none before it to whole past it. */
function shareThrough(stretch: Stretch, moment: number): number {
	return Math.min(THROUGH, Math.max(NOT_BEGUN, (moment - stretch.moment) / stretch.seconds));
}

/**
 * What the screen shows in front as the stage draws it at a moment: a page of the film's own as far as it has run,
 * laid as far past the screen as it is drawn.
 */
function frontDrawn(screen: Screen, moment: number, past: PastTheScreen | null): DrawnShows {
	switch (screen.shows.kind) {
		case 'filmed':
			return screen.shows;
		case 'own':
			return ownPageDrawn(screen, screen.shows.key, moment, past);
	}
}

/**
 * A page of the film's own, by its key, as the stage draws it at a moment: as far down as the film has run it, with
 * what the film has typed into it, and laid as a sheet so far past the screen, its top as far above where the screen's
 * stands in its document, where it is drawn past the screen.
 */
function ownPageDrawn(screen: Screen, key: string, moment: number, past: PastTheScreen | null): DrawnShows {
	const standing = ownPageStanding(screen, key, moment);
	const sheet = past === null ? null : { ...past, scrolled: standing.scrolled - past.above };
	return { kind: 'own', sheet, ...standing };
}

/** A page of the film's own the stage laid, by its key, as it stands on a screen at a moment. */
export function ownPageStanding(screen: Screen, key: string, moment: number): OwnPageStanding {
	return { key, scrolled: standingOn(screen, key, moment).top, typed: typedTextsOf(documentOf(screen, key).typed) };
}

/** Blocks typed into as the stage writes them: each block's selector and its text, in the order first typed into. */
export function typedTextsOf(typed: TypedBlocks): readonly TypedText[] {
	return [...typed].map(([into, text]) => ({ into, text }));
}

/**
 * A page of the film's own the stage laid, by its key, as its document stands on the screen; one the stage never laid
 * is a fault of livereel's, as every page a move names is laid before the film.
 */
export function documentOf(screen: Screen, key: string): OwnDocument {
	const laid = screen.documents.get(key);
	if (laid === undefined) throw new Error(`the screen holds no page of the film's own laid by the key ${key}`);
	return laid;
}

/**
 * How far the page of the film's own the screen shows in front is drawn on past the screen's top and foot at a moment,
 * as a camera shows the window's plane in a format: as far as the frame sees the plane there, but no farther than the
 * document runs on above what has run past the screen's top and below its foot, and the whole of that where a corner of
 * the frame sees the plane on to its horizon. None where the page is cut at the screen, where the screen shows the
 * filmed page, where the eye sees a page on the window's back in its place, and where nothing of it is drawn past.
 */
export function pastTheScreen(screen: Screen, camera: Camera, format: Format, moment: number): PastTheScreen | null {
	const shows = screen.shows;
	if (shows.kind === 'filmed' || shows.reach === CUT_AT_THE_SCREEN || !seesTheFront(screen, camera, format)) {
		return null;
	}
	const scrolled = standingOn(screen, shows.key, moment).top;
	const runsOn: PastTheScreen = { above: scrolled, below: documentOf(screen, shows.key).scrollLength - scrolled };
	const seen = screenPlaneSeen(camera, format.frame);
	const past =
		seen === null
			? runsOn
			: {
					above: Math.min(runsOn.above, Math.max(NOTHING_PAST, AT_ITS_TOP - seen.top)),
					below: Math.min(runsOn.below, Math.max(NOTHING_PAST, seen.top + seen.height - format.screen.height))
				};
	return past.above + past.below > ARITHMETIC_LEFT ? past : null;
}

/**
 * Whether the eye sees the page the screen shows in front: always, but where the window's back shows a page of its own
 * and the eye sees the back, as a camera shows the window in a format.
 */
function seesTheFront(screen: Screen, camera: Camera, format: Format): boolean {
	if (screen.back.kind === 'seen through') return true;
	return facesTheEye(windowInTheWorld(camera.view, camera.eye, format.frame).inTheEyesSpace);
}

/**
 * The part of the window's plane the page the screen shows lies on, in the screen's pixels: the screen, and as far past
 * its top and foot as the page is drawn there.
 */
export function pageShownOn(format: Format, past: PastTheScreen | null): Box {
	const screen = boxOf(format.screen);
	if (past === null) return screen;
	return { ...screen, top: screen.top - past.above, height: screen.height + past.above + past.below };
}

/** How a page of the film's own runs on the screen, by its key: standing at its top where the film never ran it. */
function runOf(screen: Screen, key: string): Scroll {
	return screen.scrolls.get(key) ?? STANDING_AT_ITS_TOP;
}

/**
 * Where a page of the film's own, by its key, stands on a screen at a moment and how fast it runs there: on its run,
 * held between its top and its document's end as it stands on that screen.
 */
export function standingOn(screen: Screen, key: string, moment: number): Knot {
	return standingAt(runOf(screen, key), documentOf(screen, key).scrollLength, moment);
}

/**
 * Where a running page stands at a moment and how fast it runs there: on its run, held between its top and as far as
 * it scrolls, standing still where it is held at an end it runs into.
 */
function standingAt(run: Scroll, scrollLength: number, moment: number): Knot {
	const unheld = unheldAt(run, moment);
	const top = Math.min(Math.max(unheld.top, AT_ITS_TOP), scrollLength);
	const heldAtAnEnd = (top >= scrollLength && unheld.pace > STANDING) || (top <= AT_ITS_TOP && unheld.pace < STANDING);
	return { moment, top, pace: heldAtAnEnd ? STANDING : unheld.pace };
}

/**
 * A page set off running at a pace from where it stands as its move begins, over a stretch of the film's time: its
 * pace changing from what it is there to the one named along the stretch, on its curve, in knots at even points of
 * it, at once where the stretch takes no time.
 */
export function setOff(from: Knot, stretch: Stretch, pace: number): Scroll {
	if (stretch.seconds === NO_SECONDS) return { knots: [{ ...from, pace }] };
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
	return { knots: [first, ...later] };
}

/**
 * A page brought to rest at a scroll from where it stands as its move begins, over a stretch of the film's time:
 * setting off at the pace it runs there and slowing on a cubic Hermite curve to stand still there as the stretch ends;
 * at once where the stretch takes no time.
 */
export function runToRest(from: Knot, stretch: Stretch, rest: number): Scroll {
	const resting: Knot = { moment: stretch.moment + stretch.seconds, top: rest, pace: STANDING };
	if (stretch.seconds === NO_SECONDS) return { knots: [resting] };
	return { knots: [from, resting] };
}

/**
 * The moments of a stretch of the film's time a run judged on the frame measures how far the frame carries the page at:
 * evenly from the stretch's start to its end, at each knot the run lays and half way between each two.
 */
export function momentsJudgedAt(stretch: Stretch): readonly number[] {
	const measures = STRETCHES_OF_A_CHANGE * HALVES;
	return Array.from(
		{ length: measures + ONE_MEASURE },
		(_, measure) => stretch.moment + (measure / measures) * stretch.seconds
	);
}

/**
 * A page brought to rest at a scroll from where it stands as its move begins, over a stretch of the film's time, its
 * pace judged at a point of the frame: what the point shows sets off across the frame as fast as the page's pace
 * carries it there, and slows to rest on a cubic Hermite curve; each piece of that way is run on the page as far as the
 * frame then carries a pixel of the page there, so the page comes to rest at the scroll as the stretch ends however the
 * frame moves meanwhile. How far the frame carries a pixel is given at each of `momentsJudgedAt`. The page's run is
 * laid in knots at even points of the stretch, each as far down as the run's way there, summed by Simpson's rule, and
 * running as fast as its way across the frame goes there over how far the frame carries a pixel.
 */
export function judgedToRest(from: Knot, stretch: Stretch, rest: number, carried: readonly number[]): JudgedRun {
	const perPixel: CurveWays = {
		towardTheEnd: pageWayByKnots(carried, endsSpeedAt),
		settingOff: pageWayByKnots(carried, startsSpeedAt)
	};
	const onTheFrame = wayJudged(from, stretch, rest, valueAt(carried, SETTING_OFF), perPixel);
	const later: Knot[] = [];
	for (let point = FIRST_ONWARD; point < STRETCHES_OF_A_CHANGE; point += 1) {
		const share = point / STRETCHES_OF_A_CHANGE;
		const towardTheEnd = onTheFrame.way * valueAt(perPixel.towardTheEnd, point);
		const settingOff = onTheFrame.settingOff * valueAt(perPixel.settingOff, point);
		const speedOnTheFrame = onTheFrame.way * endsSpeedAt(share) + onTheFrame.settingOff * startsSpeedAt(share);
		later.push({
			moment: stretch.moment + share * stretch.seconds,
			top: from.top + towardTheEnd + settingOff,
			pace: speedOnTheFrame / (valueAt(carried, point * HALVES) * stretch.seconds)
		});
	}
	const resting: Knot = { moment: stretch.moment + stretch.seconds, top: rest, pace: STANDING };
	return { run: { knots: [from, ...later, resting] }, onTheFrame };
}

/**
 * A judged run's way across the frame where it is judged, as it comes to rest at a scroll: setting off as fast as the
 * page's pace and how far the frame carries a pixel of it as it sets off take it, and going as far as brings the page
 * to rest there, the page running so far for each pixel of the curve's way, beside so far for each of its setting off.
 */
function wayJudged(
	from: Knot,
	stretch: Stretch,
	rest: number,
	carriedAtTheStart: number,
	perPixel: CurveWays
): WayOnTheFrame {
	const settingOff = from.pace * carriedAtTheStart * stretch.seconds;
	const pageWayOfSettingOff = settingOff * valueAt(perPixel.settingOff, STRETCHES_OF_A_CHANGE);
	const pageWayPerPixel = valueAt(perPixel.towardTheEnd, STRETCHES_OF_A_CHANGE);
	return { settingOff, way: (rest - from.top - pageWayOfSettingOff) / pageWayPerPixel };
}

/**
 * How far down its page a run judged on the frame goes by each of its knots for each pixel across the frame of one of a
 * cubic Hermite curve's weights, from none at its start: the weight's speed over how far the frame carries a pixel of
 * the page, summed stretch by stretch by Simpson's rule from the frame measured at each knot and half way between.
 */
function pageWayByKnots(carried: readonly number[], speedAt: (share: number) => number): readonly number[] {
	const measures = carried.length - ONE_MEASURE;
	const perPixel = carried.map((carry, measure) => speedAt(measure / measures) / carry);
	const ways = [NO_WAY_YET];
	let ranBefore = NO_WAY_YET;
	for (let point = FIRST_ONWARD; point <= STRETCHES_OF_A_CHANGE; point += 1) {
		const middle = point * HALVES - ONE_MEASURE;
		const ends = valueAt(perPixel, middle - ONE_MEASURE) + valueAt(perPixel, middle + ONE_MEASURE);
		ranBefore += (ends + SIMPSONS_MIDDLE_WEIGHT * valueAt(perPixel, middle)) / SIMPSONS_WHOLE / STRETCHES_OF_A_CHANGE;
		ways.push(ranBefore);
	}
	return ways;
}

/** How fast a cubic Hermite curve from none to 1, standing still at both ends, goes at a share of its time. */
function endsSpeedAt(share: number): number {
	return hermiteSpeedBetween(STILL_AT_NONE, STILL_AT_ONE, share);
}

/**
 * How fast a cubic Hermite curve from none back to none, setting off at 1 and arriving still, goes at a share of its
 * time.
 */
function startsSpeedAt(share: number): number {
	return hermiteSpeedBetween(SETTING_OFF_AT_ONE, STILL_AT_NONE, share);
}

/**
 * A value a run judged on the frame works out at a place of its measures or its knots, each of which it measures or
 * lays; one it lacks is a fault of livereel's.
 */
function valueAt(values: readonly number[], place: number): number {
	const value = values[place];
	if (value === undefined) throw new Error(`a run judged on the frame works out no value at place ${place}`);
	return value;
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
		(key) => standingOn(end, key, moments.end).top - standingOn(start, key, moments.start).top
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
	const inTheView = boxInTheView(camera, format.frame, boxOf(format.screen));
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

/**
 * The pictures a screen holds at a moment, as a frame drawn then or later may draw them: its sweep's, and the page's it
 * fades from while it fades.
 */
export function picturesHeldOn(screen: Screen, moment: number): readonly number[] {
	const swept = screen.sweep === null ? NO_PICTURE : [screen.sweep.picture];
	const faded = screen.fade !== null && fadesAt(screen.fade, moment) ? [screen.fade.picture] : NO_PICTURE;
	return [...swept, ...faded];
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

/**
 * The point of a sweep's light where it stands that one where it stood measures its shift by: its light's shape is
 * kept.
 */
function pointAt(points: readonly Point[], place: number): Point {
	const point = points[place];
	if (point === undefined) throw new Error(`a sweep's light has no point ${place}: its shape changed as it swept`);
	return point;
}

/**
 * The part of the screen a sweep's light crosses, in its pixels: what a camera's view shows of it as the camera frames
 * the page, not the ground past its edges; the view's own part where it shows none of the screen, as nothing swept
 * shows.
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
