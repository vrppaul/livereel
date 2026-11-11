import { CubicBezierCurve3, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { AS_PLACED, FACE_ON } from '../../src/domain/stance.ts';
import { type Camera, placedIn, underTheFrame, wholeView, windowView } from '../../src/domain/camera.ts';
import { type EyePlace, type Focus, eyeAtRest } from '../../src/domain/eye.ts';
import { gazeOf } from '../../src/domain/flight.ts';
import * as eye from '../../src/moves/eye.ts';
import { easeOutCubic, linear } from '../../src/domain/curves.ts';
import { FilmError } from '../../src/domain/errors.ts';
import type { Format } from '../../src/domain/format.ts';
import {
	type Box,
	CORNER_SHARES,
	type Point,
	boxOf,
	boxToward,
	cornersOf,
	distanceBetween,
	frameScaleOf,
	middleX,
	middleY,
	pointAt
} from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';
import { type Beginning, type Move, ownPagesOf } from '../../src/direction/move.ts';
import { pageKeyOf } from '../../src/direction/page.ts';
import { play } from '../../src/direction/steps.ts';
import { onto, to as cameraTo } from '../../src/moves/camera.ts';
import * as group from '../../src/moves/group.ts';
import * as lens from '../../src/moves/lens.ts';
import * as outline from '../../src/moves/outline.ts';
import * as piece from '../../src/moves/piece.ts';
import * as picture from '../../src/moves/picture.ts';
import {
	body as windowBody,
	hide as windowHide,
	lean,
	shade as windowShade,
	show as windowShow,
	to as windowTo
} from '../../src/moves/window.ts';
import {
	behind as screenBehind,
	lower,
	rise,
	scrollTo as screenScrollTo,
	scrolls as screenScrolls,
	shows as screenShows,
	sweep as screenSweep,
	type as screenType
} from '../../src/moves/screen.ts';
import * as callout from '../../src/moves/callout.ts';
import * as caption from '../../src/moves/caption.ts';
import * as code from '../../src/moves/code.ts';
import * as ending from '../../src/moves/ending.ts';
import {
	type DrawnObject,
	type Surroundings,
	drawnObject,
	drawnOnTheFrame,
	focusOn,
	standingInTheWorld
} from '../../src/props/object.ts';
import {
	type Sharpness,
	distanceOfItsMiddle,
	focusDistanceOf,
	outOfFocusAt,
	sharpnessOf
} from '../../src/domain/focus.ts';
import {
	IN_THE_WINDOW,
	ON_THE_PAGE,
	fromItsMiddle,
	onTheFrame,
	placed,
	planeOf,
	pointOnTheFrame,
	windowInTheWorld
} from '../../src/domain/placement.ts';
import type { DrawnPiece, Piece } from '../../src/props/piece.ts';
import { SCREEN_UP, THE_FILMED_PAGE, drawnScreen, pastTheScreen } from '../../src/props/screen.ts';
import type { DrawnWindow } from '../../src/props/window.ts';
import { ONE_FRAME, pastTheEdge, windowPlaced, wordsPlaced } from '../../src/domain/place.ts';
import * as keys from '../../src/moves/keys.ts';
import * as look from '../../src/moves/look.ts';
import * as note from '../../src/moves/note.ts';
import { scrollBy, speed } from '../../src/moves/page.ts';
import * as pin from '../../src/moves/pins.ts';
import * as thing from '../../src/moves/thing.ts';
import * as title from '../../src/moves/title.ts';
import * as world from '../../src/moves/world.ts';
import type { DrawnThing } from '../../src/props/thing.ts';
import type { DrawnTitleWords } from '../../src/props/title.ts';
import { drawnLighting } from '../../src/props/lighting.ts';
import {
	ITS_MIDDLE,
	type Matrix,
	type Spot,
	carried,
	chained,
	longestScaleAtItsMiddle,
	translation,
	waysAlongItsPlane
} from '../../src/domain/matrix.ts';
import { LIVEREELS_SLAB } from '../../src/props/body.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { LIVEREELS_WORLD } from '../../src/props/world.ts';
import { drawnNote } from '../../src/props/note.ts';
import { drawnPins } from '../../src/props/pins.ts';
import { press, release, to as cursorTo } from '../../src/moves/cursor.ts';
import { off, on as lightOn, to as lightTo } from '../../src/moves/light.ts';
import {
	effects as terminalEffects,
	leave,
	open,
	submit,
	to as terminalTo,
	type as typeInto,
	works
} from '../../src/moves/terminal.ts';
import { type TypedText, keystrokes } from '../../src/domain/typing.ts';
import type { TerminalLine } from '../../src/props/terminal.ts';
import { NO_EFFECTS } from '../../src/props/effects.ts';
import { OWN_WAY } from '../../src/props/way.ts';
import { ON_THEIR_WAY_AT_ONCE, appearedOf, comingUpIn, groundOf, saidOf } from '../../src/props/words.ts';
import {
	type DrawnScene,
	type Scene,
	type SceneAt,
	cameraOf,
	drawn,
	frameShiftBetween,
	holdersIn,
	openingScene,
	partsAskedSharperIn,
	pictureZoomsIn,
	withObject,
	withPagesLaid,
	withProp
} from '../../src/scene.ts';
import { FOCAL_LENGTH, PageOfBoxes, PageScrollingBy, PicturesHeld, SMALL } from './fakes.ts';

const BLOCK = { left: 100, top: 100, width: 100, height: 40 };
// How far along a curve that passes its ends may stand, past its end and before its start
const PAST_ITS_END = 1.12;
const BEFORE_ITS_START = -0.12;
// Blocks off the small format's screen, 600 × 400: below its foot, above its top, beside it to the right and to the
// left; one only half on it; and one the page lays out at no size, as a hidden block
const BELOW = { left: 100, top: 900.4, width: 100, height: 40 };
const ABOVE = { left: 100, top: -3097, width: 100, height: 40 };
const RIGHT = { left: 1208, top: 100, width: 100, height: 40 };
const LEFT = { left: -200, top: 100, width: 200, height: 40 };
const HALF_ON = { left: 100, top: 380, width: 100, height: 40 };
const HIDDEN = { left: 0, top: 0, width: 0, height: 0 };
// A block as wide as most of the screen
const WIDE = { left: 50, top: 300, width: 500, height: 40 };
// Blocks partly on the screen, reaching off it past its top, its foot, its left and its right
const REACHING_ABOVE = { left: 100, top: -1000, width: 100, height: 1200 };
const REACHING_BELOW = { left: 100, top: 300, width: 100, height: 2000 };
const REACHING_LEFT = { left: -500, top: 100, width: 700, height: 40 };
const REACHING_RIGHT = { left: 580, top: 100, width: 1000, height: 40 };
// What the screen shows of each of those
const SHOWN_ABOVE = { left: 100, top: 0, width: 100, height: 200 };
const SHOWN_BELOW = { left: 100, top: 300, width: 100, height: 100 };
const SHOWN_LEFT = { left: 0, top: 100, width: 200, height: 40 };
const SHOWN_RIGHT = { left: 580, top: 100, width: 20, height: 40 };
// Blocks of a screen as large as a 1080 frame: a card on a light ground, and another block below to its right
const CARD = { left: 400, top: 300, width: 200, height: 100 };
const CARDS_GROUND = '#f6f7f9';
// Colours of a film's own, the blue claude-review draws its reader's parts in and a green, and the colours half the way
// to the blue from livereel's amber accent, #ffb224, and from the blue to the green
const READERS_BLUE = '#5b8def';
const GREEN = '#00ff00';
const HALF_WAY_FROM_THE_ACCENT_TO_BLUE = '#ada08aff';
const HALF_WAY_FROM_BLUE_TO_GREEN = '#2ec678ff';
const OTHER = { left: 1200, top: 600, width: 100, height: 60 };
// No move here acts on the page: an act at a moment of a play is the take's, tested there; nor holds a picture of a
// part of the screen, but where a test hands it a stand-in that does
const NO_ACT = undefined as never;
const NO_PICTURE_HELD = undefined as never;
// The things the film's module builds, as a room loaded it: a card
const THINGS_BUILT = ['card'];
// The film's own pictures the stage laid, by their paths, as their files were decoded: a mark four times as wide as
// tall
const FILMS_PICTURES = new Map([['mark.png', { width: 400, height: 100 }]]);
const PAGE = new PageOfBoxes(
	new Map([
		['#block', BLOCK],
		['#below', BELOW],
		['#above', ABOVE],
		['#right', RIGHT],
		['#left', LEFT],
		['#half-on', HALF_ON],
		['#hidden', HIDDEN],
		['#reaching-above', REACHING_ABOVE],
		['#reaching-below', REACHING_BELOW],
		['#reaching-left', REACHING_LEFT],
		['#reaching-right', REACHING_RIGHT],
		['#shown-above', SHOWN_ABOVE],
		['#shown-below', SHOWN_BELOW],
		['#shown-left', SHOWN_LEFT],
		['#shown-right', SHOWN_RIGHT],
		['#wide', WIDE],
		['#card', CARD],
		['#other', OTHER]
	]),
	new Map([['#card', CARDS_GROUND]])
);
const SCROLLED_IN = "scroll it in with page.scrollTo, ending before this move's share begins";
const ACTED_IN = 'bring it in with an act, as no move of livereel scrolls the page sideways';
const LIT = { box: BLOCK, strength: 1, dim: 0.6 };
// The eye at rest, open none, seeing all sharp
const ALL_SHARP: Sharpness = { focusedAt: FOCAL_LENGTH, focalLength: FOCAL_LENGTH, aperture: 0 };
// The scene a film shot in the small format opens on: livereel's look and world, the eye of its focal length at rest
const OPENING_IN_SMALL = openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH);
// Round an object drawn alone, the screen up, on the small frame, the camera on the whole screen, no group and no
// hole, the eye seeing all sharp, and no picture of a part of the screen taken sharper than the page's
const NOTHING_AROUND: Surroundings = {
	screen: SCREEN_UP,
	frame: SMALL.frame,
	camera: cameraOf(OPENING_IN_SMALL, SMALL),
	groups: new Map(),
	objects: new Map(),
	holes: [],
	sharpness: ALL_SHARP,
	sharper: []
};
const TYPED = withObject(OPENING_IN_SMALL, 'terminal', {
	inside: { kind: 'frame' },
	box: BLOCK,
	...AS_PLACED,
	...NO_EFFECTS,
	shown: 1,
	gone: 0,
	way: OWN_WAY,
	content: { kind: 'terminal', title: 'A terminal', lines: [], typed: 'add a test' }
});
const READ: TerminalLine = { kind: 'work', text: 'Read app.py' };
const SAID: TerminalLine = { kind: 'said', text: 'Done.' };
const THINKING = 'Working…';
const THREE_LINES = 'play({\n\tmoves: [camera.onto(VISITORS)]\n})';
// A frame whose captions stand at its top
const CAPTIONS_AT_THE_TOP: Format = { ...SMALL, captionAt: 'top' };
// The lower right quarter of what an object stands in, and the upper left
const LOWER_RIGHT = { left: 0.5, top: 0.5, width: 0.5, height: 0.5 } as const;
const UPPER_LEFT = { left: 0, top: 0, width: 0.5, height: 0.5 } as const;
// A band across the whole frame's width, which code stands in edge to edge
const ACROSS_THE_FRAME = { left: 0, top: 0.3, width: 1, height: 0.4 } as const;
// A frame as large as the stage's look was made on, its screen as large: a camera at a zoom of 1 shows the screen's
// pixels as its own, and one at 2 its middle half twice as large
const FULL_HD: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
// A page of the film's own
const OWN_PAGE = { html: '<p id="card">Ours</p>' };
// How much longer than the screen that page is, as far as it scrolls, and a block of it, its top 900 down the page
const OWN_PAGE_LENGTH = 1000;
// The scene a film shot in that format opens on: livereel's look and world, the eye of its focal length at rest, that
// page laid as the stage lays it
const OPENING_IN_FULL_HD = withPagesLaid(
	openingScene(FULL_HD, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH),
	new Map([[pageKeyOf(OWN_PAGE.html), OWN_PAGE_LENGTH]])
);
const INPUT = '#input';
const OWN_PAGE_BLOCKS = new Map([[INPUT, { left: 0, top: 900, width: 1920, height: 60 }]]);
// Two blocks of that page a film types into, each holding text alone, and a typist striking ten letters a second
const TYPED_INTO = '#typed';
const OTHER_TYPED_INTO = '#asked';
const TYPED_BLOCKS_HOLD = new Map([
	[TYPED_INTO, 'text alone'],
	[OTHER_TYPED_INTO, 'text alone']
]);
const TEN_A_SECOND = { lettersPerSecond: 10 };
// A line of text typed that wraps, 16 letters, on a page that grows by a line 40 pixels high for each 10 letters typed
const WRAPPING = 'echo hello world';
const LINE_HEIGHT = 40;
const LETTERS_A_LINE = 10;
// The whole screen face-on, leant back 64° about its middle: the frame sees past the screen's top and its foot
const LEANT_ABOUT_ITS_MIDDLE: Camera = {
	pose: { focusX: 960, focusY: 540, zoom: 1 },
	view: { ...wholeView(FULL_HD.frame), angle: { ...FACE_ON, tilt: 64 } },
	eye: eyeAtRest(FOCAL_LENGTH)
};
// The scene that opens on with the page laid as one the screen holds all of: it scrolls nowhere
const OPENING_ON_A_FITTING_PAGE = withPagesLaid(OPENING_IN_FULL_HD, new Map([[pageKeyOf(OWN_PAGE.html), 0]]));
// A page drawn on the screen alone, nothing of it past
const NOTHING_PAST = null;
const WHOLE_AT_ONE = { focusX: 960, focusY: 540, zoom: 1 };
const MIDDLE_AT_TWO = { focusX: 960, focusY: 540, zoom: 2 };
// A box of that screen reaching past the left edge of what the camera at 2 shows, which is 480 to 1440 across, and
// the part of it the camera shows
const PAST_THE_SHOWN_EDGE = { left: 400, top: 300, width: 200, height: 100 };
const SHOWN_AT_TWO = { left: 480, top: 300, width: 120, height: 100 };
// Nothing standing round an object drawn alone on that frame, the screen up, the camera on the whole screen, the eye
// seeing all sharp
const AROUND_IN_FULL_HD: Surroundings = {
	screen: SCREEN_UP,
	frame: FULL_HD.frame,
	camera: cameraOf(OPENING_IN_FULL_HD, FULL_HD),
	groups: new Map(),
	objects: new Map(),
	holes: [],
	sharpness: ALL_SHARP,
	sharper: []
};
// A box in the upper right corner of a frame, a quarter of it across and down, and one in its middle, half of it
const UPPER_RIGHT_CORNER = { left: 0.75, top: 0, width: 0.25, height: 0.25 } as const;
const MIDDLE_HALF = { left: 0.25, top: 0.25, width: 0.5, height: 0.5 } as const;
// The whole of that screen, as a box of it
const WHOLE_SCREEN = { left: 0, top: 0, width: 1920, height: 1080 };
// A piece's corners where neither the film nor the window rounds them
const SQUARE_CORNERS = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
// A piece drawn from the page's picture as the stage shows it, as one is where the film names no picture of its own,
// and as the stage draws it where no picture of its source is taken sharper
const FOLLOWING = { kind: 'following' };
const DRAWN_FROM_THE_PAGE = { kind: 'page' };
// No picture of a part of the screen the stage holds sharper than the page's
const NONE_SHARPER: readonly never[] = [];
// The middle of an object's box, in shares of it
const BOX_MIDDLE: Point = { left: 0.5, top: 0.5 };
// How a group grown and leant at once refuses an object joining it
const JOINS_THE_STACK_STRETCHED =
	'code.show joins the group "stack" while it stands grown and leant from the frame at once: what joins it would stand stretched there, as a group grows across and down its own plane alone; join it while the group stands as large as its box, or faces the frame';

function beginningOf(scene: Scene): Beginning {
	return beginningIn(scene, SMALL);
}

/** What a move drawn from the page's picture says, refused while the screen shows the film's own page. */
function ownPageRefusal(move: string): FilmError {
	return new FilmError(
		`${move} draws from the filmed page's picture, and the screen shows the film's own page: show the filmed page first, with screen.shows('filmed')`
	);
}

function beginningIn(scene: Scene, format: Format): Beginning {
	return {
		scene,
		page: PAGE,
		format,
		pageShown: 'pictured',
		act: NO_ACT,
		holdPicture: NO_PICTURE_HELD,
		thingsBuilt: THINGS_BUILT,
		filmsPictures: FILMS_PICTURES
	};
}

/** A beginning in a format whose take holds each picture of a part of the screen a move asks it for in a stand-in. */
function beginningHolding(scene: Scene, format: Format, pictures: PicturesHeld): Beginning {
	return { ...beginningIn(scene, format), holdPicture: (part) => pictures.hold(part) };
}

/** The scene a move sets, begun on a scene shot in a format whose take holds pictures in a stand-in, at its end. */
async function heldIn(move: Move, scene: Scene, format: Format, pictures: PicturesHeld): Promise<Scene> {
	const change = await move.begin(beginningHolding(scene, format, pictures));
	return change(scene, 1);
}

/** The scene a move sets, begun on a scene, at a progress of its way. */
async function setAt(move: Move, scene: Scene, progress: number): Promise<Scene> {
	return setIn(move, scene, progress, SMALL);
}

/** The scene a move sets, begun on a scene shot in a format, at a progress of its way. */
async function setIn(move: Move, scene: Scene, progress: number, format: Format): Promise<Scene> {
	const change = await move.begin(beginningIn(scene, format));
	return change(scene, progress);
}

/**
 * A beginning in full HD at a moment, its move's share so many seconds long on a straight curve, the film's own page
 * it names 1000 pixels longer than the screen, its block 900 down it.
 */
function scrollingFrom(scene: Scene, moment: number, seconds: number): Beginning {
	return {
		...beginningIn(scene, FULL_HD),
		stretch: { moment, seconds, ease: linear },
		ownPage: () => Promise.resolve(new PageOfBoxes(OWN_PAGE_BLOCKS, new Map(), OWN_PAGE_LENGTH))
	};
}

/** A beginning in full HD whose page of the film's own holds the blocks typed into, each holding text alone. */
function typingFrom(scene: Scene): Beginning {
	return {
		...beginningIn(scene, FULL_HD),
		ownPage: () => Promise.resolve(new PageOfBoxes(new Map(), new Map(), OWN_PAGE_LENGTH, TYPED_BLOCKS_HOLD))
	};
}

/** A typing of the line that wraps into a block of the page of the film's own, ten letters a second. */
function typingWrapped(): Move {
	return screenType(OWN_PAGE, keystrokes(WRAPPING, TEN_A_SECOND), { into: TYPED_INTO });
}

/**
 * A beginning in full HD at a moment whose page of the film's own holds the blocks typed into and grows by a line for
 * each ten letters typed.
 */
function typingWrappedFrom(scene: Scene, moment: number): Beginning {
	return {
		...scrollingFrom(scene, moment, 0),
		ownPage: () =>
			Promise.resolve(new PageOfBoxes(new Map(), new Map(), OWN_PAGE_LENGTH, TYPED_BLOCKS_HOLD, grownByLines))
	};
}

/** How much longer a page is with text typed into it: a line for each ten letters typed. */
function grownByLines(typed: readonly TypedText[]): number {
	const letters = typed.reduce((count, block) => count + block.text.length, 0);
	return LINE_HEIGHT * Math.floor(letters / LETTERS_A_LINE);
}

/** The scene with a text typed whole into a block of its page of the film's own. */
async function typedWhole(scene: Scene, text: string, into: string): Promise<Scene> {
	const typing = await screenType(OWN_PAGE, keystrokes(text, TEN_A_SECOND), { into }).begin(typingFrom(scene));
	return typing(scene, 1);
}

/** What stands typed in the page of the film's own a scene's screen shows, as the stage draws it. */
function typedDrawnIn(scene: Scene): unknown {
	return drawnSceneIn(scene, FULL_HD).screen.shows.typed;
}

/** A scene whose page of the film's own runs at 100 pixels a second from the film's start, 300 down at 3 s. */
async function runningFromTheStart(): Promise<Scene> {
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	return (await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(shown, 0, 0)))(shown, 1);
}

/** How far down the page of the film's own a scene's screen shows stands at a moment, as the stage draws it. */
function scrolledIn(scene: Scene, moment: number): number {
	return drawn(scene, cameraOf(scene, FULL_HD), moment, FULL_HD, NONE_SHARPER).screen.shows.scrolled;
}

/** A scene whose page of the film's own stands at its top from the film's start. */
async function standingFromTheStart(): Promise<Scene> {
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	return (await screenScrolls(OWN_PAGE, { pace: 0 }).begin(scrollingFrom(shown, 0, 0)))(shown, 1);
}

/**
 * A beginning like `scrollingFrom` whose frame will stand at each moment as a camera on the whole screen, face-on, its
 * middle on the screen's, at the zoom a curve of the moment gives.
 */
function judgedFrom(scene: Scene, moment: number, seconds: number, zoomAt: (at: number) => number): Beginning {
	return { ...scrollingFrom(scene, moment, seconds), cameraAt: (at) => Promise.resolve(wholeScreenAt(zoomAt(at))) };
}

/** A camera on the whole full-HD screen, face-on, its middle on the screen's, at a zoom. */
function wholeScreenAt(zoom: number): Camera {
	return { pose: { ...MIDDLE_AT_TWO, zoom }, view: wholeView(FULL_HD.frame), eye: eyeAtRest(FOCAL_LENGTH) };
}

/** A zoom coming evenly from 1 at 3 s to 2 at 5 s. */
function comingCloser(moment: number): number {
	return 1 + (moment - 3) / 2;
}

/** A zoom of 8 at 3 s, drawing back to 1 within 0.05 s. */
function drawingBack(moment: number): number {
	return Math.max(1, 8 - 140 * (moment - 3));
}

/**
 * How far what the frame's middle shows runs across the frame between two moments, the frame at a zoom of the moment,
 * on the whole screen face-on: each of a thousand steps of the page's run as large as the zoom half way through it.
 */
function runAcrossTheMiddle(scene: Scene, start: number, end: number, zoomAt: (at: number) => number): number {
	const step = (end - start) / 1000;
	return Array.from({ length: 1000 }, (_, place) => start + place * step).reduce(
		(way, from) => way + zoomAt(from + step / 2) * (scrolledIn(scene, from + step) - scrolledIn(scene, from)),
		0
	);
}

/** A scene at the film's first moment, where what a test measures is worked out from none. */
function atTheStart(scene: Scene): SceneAt {
	return { scene, moment: 0 };
}

/** A scene as the stage draws it, in a format, by the scene's own camera. */
function drawnSceneIn(scene: Scene, format: Format): DrawnScene {
	return drawn(scene, cameraOf(scene, format), 0, format, NONE_SHARPER);
}

/** The objects of a scene as the stage draws them, in a format, by the scene's own camera. */
function drawnObjectsIn(scene: Scene, format: Format): readonly DrawnObject[] {
	return drawnSceneIn(scene, format).objects;
}

/** Where the middle of an object of a scene shot in the small format is drawn on the frame. */
function drawnMiddleOf(scene: Scene, name: string): Point {
	const holders = holdersIn(scene, cameraOf(scene, SMALL));
	return drawnOnTheFrame(scene.objects.get(name)!, holders, SMALL.frame, BOX_MIDDLE);
}

/** A point carried so many times as far from another, across it where less than none. */
function scaledAbout(about: Point, point: Point, times: number): Point {
	return { left: about.left + times * (point.left - about.left), top: about.top + times * (point.top - about.top) };
}

/** A point as a test takes it: each of its numbers close to the one named. */
function closeToPoint(point: Point): Point {
	return { left: expect.closeTo(point.left), top: expect.closeTo(point.top) };
}

/** A box as a test takes it: each of its numbers close to the one named. */
function closeToBox(box: Box): Box {
	return {
		left: expect.closeTo(box.left),
		top: expect.closeTo(box.top),
		width: expect.closeTo(box.width),
		height: expect.closeTo(box.height)
	};
}

function middleOf(box: Box): Point {
	return { left: middleX(box), top: middleY(box) };
}

/** A box of the frame as measured from a corner of it, a box's top left one. */
function measuredFromCorner(box: Box, corner: Point): Box {
	return { ...box, left: box.left - corner.left, top: box.top - corner.top };
}

/** The names of the objects of a scene shot in the small format, in the order the stage draws them. */
function drawnNamesIn(scene: Scene): readonly string[] {
	return drawnObjectsIn(scene, SMALL).map((object) => object.name);
}

test('a callout points at what the screen shows of its block, on the side the film names', async () => {
	const pointing = (await setAt(callout.show('#reaching-below', 'Here', { side: 'below' }), OPENING_IN_SMALL, 1))
		.callout;
	expect([pointing?.box, pointing?.side]).toEqual([SHOWN_BELOW, 'below']);
});

test('a look moves to the values named and keeps the rest; a ground named alone takes its glow with it', async () => {
	const looked = await setAt(look.to({ ground: '#ffffff', titleSize: 120 }), OPENING_IN_SMALL, 1);
	expect(looked.look).toEqual({ ...LIVEREELS_LOOK, ground: '#ffffff', glow: '#ffffff', titleSize: 120 });
});

test("a look in no form of one is refused as its move is made, where it stands: none, a colour not in hex, a value of the world's look or of the window's body by its name", () => {
	expect(() => look.to(null as never)).toThrow(FilmError);
	expect(() => look.to({ ground: 'navy' })).toThrow(
		new FilmError(`look.to's ground is "navy": it is a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa`)
	);
	expect(() => look.to({ bloom: 0.5 } as never)).toThrow(/^look\.to names bloom: it names ground, .*, or fewer$/);
	expect(() => look.to({ windowMetal: '#000' } as never)).toThrow(
		/^look\.to names windowMetal: it names ground, .*, or fewer$/
	);
});

test("window.body sets the values of the window's body it names and keeps the rest, over the window as it stands each frame, so a travel and a lean share its step whichever is set first: its numbers through the values between, its metal through the colours between, with no alpha", async () => {
	const beginning = beginningOf(OPENING_IN_SMALL);
	const [reshaping, travelling, leaning] = await Promise.all(
		[windowBody({ thickness: 40, metal: '#ffffff' }), windowTo('right'), lean({ tilt: 10 })].map((move) =>
			move.begin(beginning)
		)
	);
	const reshapedFirst = await leaning(await travelling(await reshaping(OPENING_IN_SMALL, 0.5), 0.5), 0.5);
	const reshapedLast = await reshaping(await leaning(await travelling(OPENING_IN_SMALL, 0.5), 0.5), 0.5);
	expect(reshapedFirst.window).toEqual(reshapedLast.window);
	expect([reshapedLast.window.body, reshapedLast.window.angle]).toEqual([
		{ ...LIVEREELS_SLAB, thickness: 20, metal: '#a2a5ab' },
		{ ...FACE_ON, tilt: 5 }
	]);
});

test('a body in no form of one is refused as its move is made, where it stands: none, a thickness below none, a metal with an alpha, a name the look gave it, one that names none', () => {
	expect(() => windowBody(null as never)).toThrow(
		new FilmError('window.body is handed null for an object of thickness, rim, metal, roughness, glass')
	);
	expect(() => windowBody({ thickness: -1 })).toThrow(
		new FilmError("window.body's thickness is -1: it is a number of pixels, 0 or more")
	);
	expect(() => windowBody({ metal: '#454b5680' })).toThrow(
		new FilmError(`window.body's metal is "#454b5680": it is a colour in hex with no alpha: #rgb or #rrggbb`)
	);
	expect(() => windowBody({ windowThickness: 24 } as never)).toThrow(
		new FilmError('window.body names windowThickness: it names thickness, rim, metal, roughness, glass, or fewer')
	);
	expect(() => windowBody({})).toThrow(
		new FilmError('window.body names none of thickness, rim, metal, roughness, glass')
	);
});

test("the world's look moves to the values named and keeps the rest: its glow through the strengths between, lights of another number than those standing changed whole half-way", async () => {
	const overhead = {
		colour: '#fff',
		strength: 1,
		at: { across: 0, down: -800, out: 600 },
		aim: { across: 0, down: 0, out: 0 },
		angle: 30,
		softness: 1
	};
	const lit = world.to({ bloom: 0.8, lights: [overhead] });
	const [quarter, half] = [await setAt(lit, OPENING_IN_SMALL, 0.25), await setAt(lit, OPENING_IN_SMALL, 0.5)];
	expect([quarter.world, half.world]).toEqual([
		{ ...LIVEREELS_WORLD, bloom: 0.2, lights: [] },
		{ ...LIVEREELS_WORLD, bloom: 0.4, lights: [overhead] }
	]);
});

test("the world's lights as many as those they go to move light by light, each value a share of the way to its own, a colour mixed with no alpha, a strength, a cone and a softness never past where they go, however far a curve takes them", async () => {
	const dim = {
		colour: '#000000',
		strength: 0,
		at: { across: 0, down: -800, out: 600 },
		aim: { across: 0, down: 0, out: 0 },
		angle: 20,
		softness: 0
	};
	const bright = {
		colour: '#ffffff',
		strength: 2,
		at: { across: 400, down: -400, out: 200 },
		aim: { across: 100, down: 0, out: 0 },
		angle: 40,
		softness: 1
	};
	const darkened = withProp(OPENING_IN_SMALL, 'world', { ...LIVEREELS_WORLD, lights: [dim, bright] });
	const swapped = world.to({ lights: [bright, dim] });
	const [quarter, past] = [await setAt(swapped, darkened, 0.25), await setAt(swapped, darkened, 1.5)];
	expect([quarter.world.lights, past.world.lights]).toEqual([
		[
			{
				colour: '#404040',
				strength: 0.5,
				at: { across: 100, down: -700, out: 500 },
				aim: { across: 25, down: 0, out: 0 },
				angle: 25,
				softness: 0.25
			},
			{
				colour: '#bfbfbf',
				strength: 1.5,
				at: { across: 300, down: -500, out: 300 },
				aim: { across: 75, down: 0, out: 0 },
				angle: 35,
				softness: 0.75
			}
		],
		[
			{ ...bright, at: { across: 600, down: -200, out: 0 }, aim: { across: 150, down: 0, out: 0 } },
			{ ...dim, at: { across: -200, down: -1000, out: 800 }, aim: { across: -50, down: 0, out: 0 } }
		]
	]);
});

test("the world's grain moves through the levels between, from none where it is turned off, never past where it starts and ends however far a curve takes it", async () => {
	const grained = withProp(OPENING_IN_SMALL, 'world', { ...LIVEREELS_WORLD, grain: 2 });
	const [fading, coming] = [world.to({ grain: { enabled: false } }), world.to({ grain: { levels: 1 } })];
	const moved = [
		await setAt(fading, grained, 0.25),
		await setAt(fading, grained, 1.5),
		await setAt(coming, OPENING_IN_SMALL, 0.5),
		await setAt(coming, OPENING_IN_SMALL, -0.5)
	];
	expect(moved.map((scene) => scene.world.grain)).toEqual([1.5, 0, 0.5, 0]);
});

test("the world's look in no form of one is refused as its move is made, where it stands: none, a glow of a strength below none, a value of the film's look by its name", () => {
	expect(() => world.to(null as never)).toThrow(
		new FilmError('world.to is handed null for an object of lights, softBoxes, bloom, bloomRadius, grain')
	);
	expect(() => world.to({ bloom: -1 })).toThrow(
		new FilmError(
			"world.to's bloom is -1: it is how strongly light past white glows, a number, 0 or more, as three's bloom takes it"
		)
	);
	expect(() => world.to({ ground: '#000' } as never)).toThrow(
		new FilmError('world.to names ground: it names lights, softBoxes, bloom, bloomRadius, grain, or fewer')
	);
});

test('the light is carried or put out only where one is on', async () => {
	const unlit = beginningOf(OPENING_IN_SMALL);
	await expect(async () => lightTo('#block').begin(unlit)).rejects.toThrow(FilmError);
	await expect(async () => off().begin(unlit)).rejects.toThrow(FilmError);
});

test('what is put away — the light, a callout, pins, a note, a title, a caption, keys, code, the terminal, the ending — is gone at its end', async () => {
	const said = saidOf('Words');
	const lit = withProp(OPENING_IN_SMALL, 'light', LIT);
	const pointed = withProp(OPENING_IN_SMALL, 'callout', {
		...said,
		box: BLOCK,
		side: 'above',
		shown: 1,
		gone: 0
	});
	const pinned = await setAt(pin.show('#block', 'Here'), OPENING_IN_SMALL, 1);
	const beside = { side: 'left', box: BLOCK } as const;
	const noted = withProp(OPENING_IN_SMALL, 'note', {
		...said,
		box: BLOCK,
		beside,
		shown: 1,
		gone: 0
	});
	const titled = await setAt(title.show('Words'), OPENING_IN_SMALL, 1);
	const captioned = await setAt(caption.show('Words'), OPENING_IN_SMALL, 1);
	const pressed = await setAt(keys.show(['⌘', 'K']), OPENING_IN_SMALL, 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), OPENING_IN_SMALL, 1);
	const carded = await setAt(
		ending.show({ name: 'livereel', line: 'Film your app', command: 'npx livereel' }),
		OPENING_IN_SMALL,
		1
	);
	expect([
		(await setAt(off(), lit, 1)).light,
		(await setAt(callout.hide(), pointed, 1)).callout,
		(await setAt(pin.clear(), pinned, 1)).pins,
		(await setAt(note.hide(), noted, 1)).note,
		(await setAt(caption.hide(), captioned, 1)).caption,
		(await setAt(keys.hide(), pressed, 1)).keys,
		[...(await setAt(leave(), TYPED, 1)).objects.keys()],
		[...(await setAt(ending.hide(), carded, 1)).objects.keys()],
		[...(await setAt(title.hide(), titled, 1)).objects.keys()],
		[...(await setAt(code.hide(), coded, 1)).objects.keys()]
	]).toEqual([null, null, null, null, null, null, [], [], [], []]);
});

test('what comes up or goes stands between none and whole along a curve that passes its ends: the light, the cursor, pins, a callout, a title, a caption, the screen, a line of code lit, the window lifted', async () => {
	const lit = withProp(OPENING_IN_SMALL, 'light', LIT);
	const pointed = withProp(OPENING_IN_SMALL, 'cursor', { left: 10, top: 10, press: 0 });
	const titled = await setAt(title.show('Words'), OPENING_IN_SMALL, 1);
	const lowered = await setAt(lower(), OPENING_IN_SMALL, 1);
	const coded = await setAt(code.show('first\nsecond', { at: 'left' }), OPENING_IN_SMALL, 1);
	const firstLit = await setAt(code.light(1), coded, 1);
	expect([
		(await setAt(code.light(2), firstLit, PAST_ITS_END)).objects.get('code'),
		cameraOf(await setAt(windowTo('left'), OPENING_IN_SMALL, PAST_ITS_END), SMALL).view,
		(await setAt(lightOn('#block'), OPENING_IN_SMALL, PAST_ITS_END)).light,
		(await setAt(off(), lit, BEFORE_ITS_START)).light,
		(await setAt(press(), pointed, PAST_ITS_END)).cursor,
		(await setAt(pin.show('#block', 'Here'), OPENING_IN_SMALL, PAST_ITS_END)).pins,
		(await setAt(callout.show('#block', 'Words'), OPENING_IN_SMALL, PAST_ITS_END)).callout,
		(await setAt(title.show('Words'), OPENING_IN_SMALL, PAST_ITS_END)).objects.get('title'),
		(await setAt(caption.show('Words'), OPENING_IN_SMALL, PAST_ITS_END)).caption,
		(await setAt(title.hide(), titled, BEFORE_ITS_START)).objects.get('title'),
		(await setAt(rise(), lowered, PAST_ITS_END)).screen
	]).toMatchObject([
		{ content: { lines: [{ lit: 0 }, { lit: 1 }] } },
		{ lift: 1 },
		{ strength: 1 },
		{ strength: 1 },
		{ press: 1 },
		{ pins: [{ shown: 1 }] },
		{ shown: 1 },
		{ shown: 1 },
		{ shown: 1 },
		{ gone: 0 },
		{ shown: 1 }
	]);
});

test("a value of the look, or the page's speed, along a curve that passes its ends stays within what its kind takes: a share, pixels, a speed", async () => {
	expect([
		(await setAt(look.to({ paneShadow: 0, titleMargin: 0 }), OPENING_IN_SMALL, PAST_ITS_END)).look,
		await setAt(speed(0), OPENING_IN_SMALL, PAST_ITS_END)
	]).toMatchObject([{ paneShadow: 0, titleMargin: 0 }, { pageSpeed: 0 }]);
});

test("a light's dim outside none and whole is refused as its move is made", () => {
	expect(() => lightOn('#block', { dim: 1.5 })).toThrow(FilmError);
	expect(() => lightOn('#block', { dim: -0.2 })).toThrow(FilmError);
});

test('code and a title stand in the places the film names, the title then with no ground of its own', async () => {
	const heading = { of: 'left', height: 0.2 } as const;
	const below = { of: 'left', top: 0.25, height: 0.75 } as const;
	const titled = await setAt(title.show('Here', { at: heading }), OPENING_IN_SMALL, 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: below }), titled, 1);
	const shownTitle = coded.objects.get('title')!;
	expect([
		shownTitle.box,
		drawnObject('title', shownTitle, 0, NOTHING_AROUND).content.ground,
		coded.objects.get('code')!.box
	]).toEqual([wordsPlaced(SMALL, heading), 0, wordsPlaced(SMALL, below)]);
});

test('code and a title card move to another place through the boxes between, growing or shrinking along the way', async () => {
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), OPENING_IN_SMALL, 1);
	const carded = await setAt(title.show('Card'), coded, 1);
	const codeHalfWay = await setAt(code.to('bottom'), carded, 0.5);
	const cardSetOff = await setAt(title.to('left'), carded, 0);
	const cardHalfWay = await setAt(title.to('left'), carded, 0.5);
	expect([
		codeHalfWay.objects.get('code')!.box,
		cardSetOff.objects.get('title')!.box,
		cardHalfWay.objects.get('title')!.box
	]).toEqual([
		boxToward(wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'bottom'), 0.5),
		boxOf(SMALL.frame),
		boxToward(boxOf(SMALL.frame), wordsPlaced(SMALL, 'left'), 0.5)
	]);
});

test("a title travelling to a place of another size takes that place's size as it sets off, so its words wrap once, and travels its middle along the way", async () => {
	const titled = await setAt(title.show('Here', { at: 'left' }), OPENING_IN_SMALL, 1);
	const [start, end] = [wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'bottom')];
	const setOff = (await setAt(title.to('bottom'), titled, 0)).objects.get('title')!.box;
	const halfWay = (await setAt(title.to('bottom'), titled, 0.5)).objects.get('title')!.box;
	expect([setOff, [halfWay.width, halfWay.height, middleY(halfWay)]]).toEqual([
		{ left: start.left, top: middleY(start) - end.height / 2, width: end.width, height: end.height },
		[end.width, end.height, (middleY(start) + middleY(end)) / 2]
	]);
});

test('a title or a caption shown typed shows no letter before its first key, and each key is heard', async () => {
	const typed = { seed: 1 };
	const words = { typed };
	const keysTyped = keystrokes('ab cd', typed).length;
	const titled = await setAt(title.show('ab cd', { at: 'left', words }), OPENING_IN_SMALL, 0);
	const captioned = await setAt(caption.show('ab cd', { words }), OPENING_IN_SMALL, 0);
	expect([
		drawnObjectsIn(titled, SMALL)[0]!.content.words.map((word) => word.letters),
		drawnSceneIn(captioned, SMALL).caption!.words.map((word) => word.letters),
		title.show('ab cd', { words }).sounds!.length,
		caption.show('ab cd', { words }).sounds!.length
	]).toEqual([[0, 0], [0, 0], keysTyped, keysTyped]);
});

test("a title's or a caption's words come up in the way the film names, and in the theme's where it names none", async () => {
	const fading = openingScene(SMALL, { ...LIVEREELS_LOOK, words: 'fade' }, LIVEREELS_WORLD, FOCAL_LENGTH);
	const titles = await Promise.all(
		[title.show('ab', { words: 'mask' }), title.show('ab')].map((move) => setAt(move, fading, 0.5))
	);
	const captions = await Promise.all(
		[caption.show('ab', { words: 'scramble' }), caption.show('ab')].map((move) => setAt(move, fading, 0.5))
	);
	expect([
		...titles.map((scene) => drawnObjectsIn(scene, SMALL)[0]!.content.way),
		...captions.map((scene) => drawnSceneIn(scene, SMALL).caption!.way)
	]).toEqual(['mask', 'fade', 'scramble', 'fade']);
});

test("a title's or a caption's words come up with as many on their way at once as the film names, and go one after another at that pace", async () => {
	const words = { way: 'mask', atOnce: 2 } as const;
	const titled = title.show('ab cd ef', { words });
	const captioned = caption.show('ab cd ef', { words });
	const titleStanding = await setAt(titled, OPENING_IN_SMALL, 1);
	const captionStanding = await setAt(captioned, OPENING_IN_SMALL, 1);
	const titleGoing = await setAt(title.hide(), titleStanding, 0.5);
	const captionGoing = await setAt(caption.hide(), captionStanding, 0.5);
	expect([
		drawnObjectsIn(await setAt(titled, OPENING_IN_SMALL, 0.5), SMALL)[0]!.content.words.map((word) => word.appeared),
		drawnSceneIn(await setAt(captioned, OPENING_IN_SMALL, 0.5), SMALL).caption!.words.map((word) => word.appeared),
		drawnObjectsIn(titleGoing, SMALL)[0]!.content.words.map((word) => word.gone),
		drawnSceneIn(captionGoing, SMALL).caption!.words.map((word) => word.gone)
	]).toEqual([
		[1, easeOutCubic(0.5), 0],
		[1, easeOutCubic(0.5), 0],
		[1, 1 - easeOutCubic(0.5), 0],
		[1, 1 - easeOutCubic(0.5), 0]
	]);
});

test("a title's or a caption's words go with as many on their way at once as the hide names, whatever the pace they came at", async () => {
	const titleStanding = await setAt(title.show('ab cd ef', { words: 'rise' }), OPENING_IN_SMALL, 1);
	const captionStanding = await setAt(caption.show('ab cd ef', { words: 'rise' }), OPENING_IN_SMALL, 1);
	const words = { atOnce: 2 };
	expect([
		drawnObjectsIn(await setAt(title.hide({ words }), titleStanding, 0.5), SMALL)[0]!.content.words.map(
			(word) => word.gone
		),
		drawnSceneIn(await setAt(caption.hide({ words }), captionStanding, 0.5), SMALL).caption!.words.map(
			(word) => word.gone
		)
	]).toEqual([
		[1, 1 - easeOutCubic(0.5), 0],
		[1, 1 - easeOutCubic(0.5), 0]
	]);
});

test('words that go whole, sliding out, in a way of livereel’s or laid out by letters, are named no pace to go at', async () => {
	const lettered = await setAt(title.show('ab cd', { words: 'letters' }), OPENING_IN_SMALL, 1);
	expect(() => title.hide({ words: { atOnce: 2 }, toward: 'left' })).toThrow(
		new FilmError('title.hide slides out whole toward a side, its words with it: it names no pace for its words')
	);
	expect(() => caption.hide({ words: { atOnce: 2 }, leave: 'fade' })).toThrow(
		new FilmError('caption.hide goes whole in a way, its words with it: it names no pace for its words')
	);
	await expect(setAt(title.hide({ words: { atOnce: 2 } }), lettered, 0.5)).rejects.toThrow(
		new FilmError('title.hide names a pace for words that came letter by letter: they go together')
	);
});

test("a callout's and a note's words come up in the theme's way", async () => {
	const blurred = openingScene(SMALL, { ...LIVEREELS_LOOK, words: 'blur' }, LIVEREELS_WORLD, FOCAL_LENGTH);
	const windowed = withProp(blurred, 'window', placedIn(windowView({ left: 300, top: 20, width: 80, height: 60 })));
	const pointed = await setAt(callout.show('#reaching-below', 'Here'), blurred, 0.5);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 0.5);
	expect([pointed.callout?.comingUp, noted.note?.comingUp]).toEqual([
		{ kind: 'word by word', way: 'blur', atOnce: ON_THEIR_WAY_AT_ONCE },
		{ kind: 'word by word', way: 'blur', atOnce: ON_THEIR_WAY_AT_ONCE }
	]);
});

test("an object that slides in or comes up in a way of livereel's brings its words whole: it names no way for them", () => {
	expect(() => title.show('ab', { words: { typed: { seed: 1 } }, from: 'left' })).toThrow(
		new FilmError('title.show slides in whole from a side, its words with it: it names no way for its words')
	);
	expect(() => caption.show('ab', { words: 'mask', enter: 'fade' })).toThrow(
		new FilmError('caption.show comes up whole in a way, its words with it: it names no way for its words')
	);
});

test('a title or code shown from a side slides in whole from a frame past its place, and one hidden toward a side slides out as far, then is gone', async () => {
	const place = wordsPlaced(SMALL, 'left');
	const coming = (await setAt(title.show('Here', { at: 'left', from: 'right' }), OPENING_IN_SMALL, 0)).objects.get(
		'title'
	)!;
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), OPENING_IN_SMALL, 1);
	const leaving = (await setAt(code.hide({ toward: 'top' }), coded, 0.5)).objects.get('code')!;
	const left = await setAt(code.hide({ toward: 'top' }), coded, 1);
	expect([coming.box, coming.shown, leaving.box, [...left.objects.keys()]]).toEqual([
		pastTheEdge(place, 'right', SMALL.frame, ONE_FRAME),
		1,
		boxToward(place, pastTheEdge(place, 'top', SMALL.frame, ONE_FRAME), 0.5),
		[]
	]);
});

test("a speed of the page's time below none is refused as its move is made", () => {
	expect(() => speed(-1)).toThrow(
		new FilmError("page.speed's speed is -1: it is how many of the page's seconds a second of the film runs, 0 or more")
	);
});

test("a title's size of none is refused as its move is made", () => {
	expect(() => title.show('Here', { size: 0 })).toThrow(
		new FilmError("title.show's size is 0: it is a number of pixels, more than 0")
	);
});

test("a title's letters and lines stand as far apart as the film names, each a share of the letters' size, and as the look has them where it names none", async () => {
	const own = await setAt(
		title.show('claude review', { at: 'left', letterSpacing: -0.03, lineHeight: 0.967, as: 'own' }),
		OPENING_IN_SMALL,
		1
	);
	const both = await setAt(title.show('Plain', { at: 'right', as: 'plain' }), own, 1);
	expect(
		['own', 'plain'].map((name) => drawnObject(name, both.objects.get(name)!, 0, NOTHING_AROUND).content)
	).toMatchObject([
		{ letterSpacing: -0.03, lineHeight: 0.967 },
		{ letterSpacing: null, lineHeight: null }
	]);
});

test("a title's letters and lines move apart as the look's values move, through the values between", async () => {
	const looked = await setAt(look.to({ titleLetterSpacing: -0.05, titleLineHeight: 0.9 }), OPENING_IN_SMALL, 0.5);
	expect([looked.look.titleLetterSpacing, looked.look.titleLineHeight]).toEqual([
		(LIVEREELS_LOOK.titleLetterSpacing - 0.05) / 2,
		(LIVEREELS_LOOK.titleLineHeight + 0.9) / 2
	]);
});

test("a title's lines standing no distance apart, or its letters spaced by no number, are refused as the move is made, by the title and by the look", () => {
	expect(() => title.show('Here', { lineHeight: 0 })).toThrow(
		new FilmError("title.show's lineHeight is 0: it is a number of times the letters' size, more than 0")
	);
	expect(() => title.show('Here', { letterSpacing: Number.NaN })).toThrow(
		new FilmError(
			"title.show's letterSpacing is NaN: it is a share of the letters' size, 0 as the font sets them, below 0 closer"
		)
	);
	expect(() => look.to({ titleLineHeight: -1 })).toThrow(
		new FilmError("look.to's titleLineHeight is -1: it is a number of times the letters' size, more than 0")
	);
});

test('an object shown from a side pushes the one of its name off past the side across, however it stands, as one sheet, and it is gone at the end; one of another name stays', async () => {
	const [left, right, frame] = [wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'right'), boxOf(SMALL.frame)];
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), OPENING_IN_SMALL, 1);
	const carded = await setAt(title.show('Card'), coded, 1);
	const halfWay = await setAt(title.show('Next', { at: 'right', from: 'right' }), carded, 0.5);
	const named = await setAt(code.show('cursor.to(REFRESH)', { at: 'right', from: 'right', as: 'second' }), carded, 0.5);
	const pushed = await setAt(title.show('Next', { at: 'right', from: 'right' }), carded, 1);
	expect([
		halfWay.objects.get('title')!.box,
		halfWay.leaving.get('title')!.box,
		[...named.leaving.keys()],
		named.objects.get('code')!.box,
		[...pushed.leaving.keys()]
	]).toEqual([
		boxToward(pastTheEdge(right, 'right', SMALL.frame, ONE_FRAME), right, 0.5),
		boxToward(frame, pastTheEdge(frame, 'left', SMALL.frame, ONE_FRAME), 0.5),
		[],
		left,
		[]
	]);
});

test('a title over the whole frame stands on its ground over the frame, and slides in from a side and out toward one as one in a place does', async () => {
	const frame = boxOf(SMALL.frame);
	const coming = await setAt(title.show('Here', { from: 'left' }), OPENING_IN_SMALL, 0.5);
	const shown = await setAt(title.show('Here'), OPENING_IN_SMALL, 1);
	const leaving = await setAt(title.hide({ toward: 'top' }), shown, 0.5);
	expect([
		coming.objects.get('title')!.box,
		drawnObject('title', shown.objects.get('title')!, 0, NOTHING_AROUND).content.ground,
		leaving.objects.get('title')!.box
	]).toEqual([
		boxToward(pastTheEdge(frame, 'left', SMALL.frame, ONE_FRAME), frame, 0.5),
		1,
		boxToward(frame, pastTheEdge(frame, 'top', SMALL.frame, ONE_FRAME), 0.5)
	]);
});

test('two titles stand at once by their names, in the order shown, each moved and put away by its own name', async () => {
	const first = await setAt(title.show('One', { at: 'left' }), OPENING_IN_SMALL, 1);
	const both = await setAt(title.show('Two', { at: 'right', as: 'second' }), first, 1);
	const moved = await setAt(title.to('bottom', { as: 'second' }), both, 1);
	const one = await setAt(title.hide(), moved, 1);
	expect([
		[...both.objects.keys()],
		moved.objects.get('second')!.box,
		moved.objects.get('title')!.box,
		[...one.objects.keys()]
	]).toEqual([['title', 'second'], wordsPlaced(SMALL, 'bottom'), wordsPlaced(SMALL, 'left'), ['second']]);
});

test('an object facing the frame is drawn flat however large, near or rolled it stands, in 3D where it leans, and flat again a whole turn round', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const grown = await setAt(code.to('left', { scale: 1.5, depth: 300 }), coded, 1);
	const rolled = await setAt(code.lean({ roll: 30 }), grown, 1);
	const leant = await setAt(code.lean({ turn: 8 }), rolled, 1);
	const turnedWhole = await setAt(code.lean({ turn: 360, tilt: -360 }), rolled, 1);
	expect(
		[coded, grown, rolled, leant, turnedWhole].map(
			(scene) => drawnObject('code', scene.objects.get('code')!, 0, NOTHING_AROUND).transform.kind
		)
	).toEqual(['flat', 'flat', 'flat', 'leant', 'flat']);
});

test('an object turned half way round, by a tilt or a turn, shows the eye its back, and its front rolled over or a whole turn round', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const turned = await Promise.all(
		[{ turn: 180 }, { tilt: 180 }, { turn: 120 }, { roll: 180 }, { turn: 360 }].map((angle) =>
			setAt(code.lean(angle), coded, 1)
		)
	);
	expect(turned.map((scene) => drawnObject('code', scene.objects.get('code')!, 0, NOTHING_AROUND).face)).toEqual([
		'back',
		'back',
		'back',
		'front',
		'front'
	]);
});

test('an object rolls as it leans, and grows and comes toward the eye as it is carried, what a move leaves out kept as it stands', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const leant = await setAt(code.lean({ tilt: 10, roll: 30 }), coded, 1);
	const turned = await setAt(code.lean({ turn: 20 }), leant, 1);
	const grown = await setAt(code.to('right', { scale: 2, depth: 100 }), turned, 1);
	const carried = (await setAt(code.to('left'), grown, 1)).objects.get('code')!;
	// A depth given in pixels of a frame 1080 high stands in the frame's own
	expect([carried.angle, carried.scale, carried.depth, carried.box]).toEqual([
		{ ...FACE_ON, tilt: 10, turn: 20, roll: 30 },
		2,
		100 * frameScaleOf(SMALL.frame),
		wordsPlaced(SMALL, 'left')
	]);
});

test("an object brought half way to the eye is drawn twice as large, and twice as far from the frame's middle", async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const near = (await setAt(code.to('left', { depth: 1000 }), coded, 1)).objects.get('code')!;
	const drawnAs = drawnObject('code', near, 0, NOTHING_AROUND).transform.matrix;
	// Twice as far from the frame's middle, its middle moves as far again as it stood from it
	expect([drawnAs.m11, drawnAs.m22, drawnAs.m41, drawnAs.m42]).toEqual([
		expect.closeTo(2),
		expect.closeTo(2),
		expect.closeTo(middleX(near.box) - SMALL.frame.width / 2),
		expect.closeTo(middleY(near.box) - SMALL.frame.height / 2)
	]);
});

// An eye of a longer lens, which stands twice as far from the frame at rest
const TWICE_THE_FOCAL_LENGTH = 2 * FOCAL_LENGTH;

test('an eye of twice the focal length stands twice as far at rest, so an object brought 1000 toward it is drawn a third larger, not twice; aslant, it sees under each point of the frame the point of the screen drawn there', async () => {
	const longer = openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, TWICE_THE_FOCAL_LENGTH);
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), longer, 1);
	const near = (await setAt(code.to('left', { depth: 1000 }), coded, 1)).objects.get('code')!;
	const around = { ...NOTHING_AROUND, camera: cameraOf(longer, SMALL) };
	expect([longer.eye.at.out, drawnObject('code', near, 0, around).transform.matrix.m11]).toEqual([
		TWICE_THE_FOCAL_LENGTH,
		expect.closeTo(4 / 3)
	]);
	const aslant = cameraOf(await setAt(eye.to(EYE_ASIDE), longer, 1), SMALL);
	const point: Point = { left: 330, top: 180 };
	expect(roundedPoint(underTheFrame(aslant, SMALL.frame, onTheFrame(aslant, SMALL.frame, point))!)).toEqual(point);
});

test('an object drawn larger than its box slides out, or is pushed off, until all of it stands past the edge, the one pushing it in step', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: ACROSS_THE_FRAME }), OPENING_IN_SMALL, 1);
	const grown = await setAt(code.to(ACROSS_THE_FRAME, { scale: 1.5 }), coded, 1);
	const sliding = await setAt(code.hide({ toward: 'right' }), grown, 0.5);
	const pushing = await setAt(code.show(THREE_LINES, { at: ACROSS_THE_FRAME, from: 'left' }), grown, 0.5);
	// Its box as wide as the frame of 400, drawn from -100 to 500: it goes 500 to the right, half of it half way
	expect([
		sliding.objects.get('code')!.box.left,
		pushing.leaving.get('code')!.box.left,
		pushing.objects.get('code')!.box.left
	]).toEqual([250, 250, -250]);
});

test('a piece of the page is born over its block as the camera shows it, cut to the part the camera shows', async () => {
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = (await setIn(piece.show(PAST_THE_SHOWN_EDGE), close, 1, FULL_HD)).objects.get('piece')!;
	// Of 400 to 600 across the camera shows 480 to 600, at twice its size from the frame's left edge
	expect([lifted.box, lifted.content]).toEqual([
		{ left: 0, top: 60, width: 240, height: 200 },
		{
			kind: 'piece',
			source: SHOWN_AT_TWO,
			liftedOff: THE_FILMED_PAGE,
			corners: SQUARE_CORNERS,
			hole: null,
			lines: null,
			picture: FOLLOWING,
			body: null
		}
	]);
});

test("a piece lifted holding its picture is drawn from a picture of its source the take holds as it is lifted, one lifted naming none from the page's picture as it changes", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const pictures = new PicturesHeld();
	const held = await heldIn(piece.show('#card', { picture: 'held' }), wide, FULL_HD, pictures);
	const following = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	expect([held.objects.get('piece')!.content, following.objects.get('piece')!.content, pictures.parts]).toEqual([
		expect.objectContaining({ picture: { kind: 'held', number: 1 } }),
		expect.objectContaining({ picture: FOLLOWING }),
		[CARD]
	]);
});

test("a piece drawn from a picture it holds asks the page's picture no closer, however large it shows its source", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const held = await heldIn(piece.show(PAST_THE_SHOWN_EDGE, { picture: 'held' }), wide, FULL_HD, new PicturesHeld());
	const filling = await setIn(piece.to({ left: 0, top: 0, width: 1, height: 1 }, { scale: 2 }), held, 1, FULL_HD);
	expect(pictureZoomsIn(filling, cameraOf(filling, FULL_HD), FULL_HD.frame)).toEqual([]);
});

test("a piece lifted with air takes so many of the page's pixels round its block, cut to the part the camera shows", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const airy = piece.show(PAST_THE_SHOWN_EDGE, { air: 20 });
	const [whole, cut] = [await setIn(airy, wide, 1, FULL_HD), await setIn(airy, close, 1, FULL_HD)].map(
		(scene) => scene.objects.get('piece')!.content
	);
	// 400 to 600 across and 300 to 400 down, 20 more on every side; the camera at 2 shows 480 to 1440 across
	expect([whole, cut]).toEqual([
		expect.objectContaining({ source: { left: 380, top: 280, width: 240, height: 140 } }),
		expect.objectContaining({ source: { left: 480, top: 280, width: 140, height: 140 } })
	]);
});

test('an outline is born round its block as the camera shows it, cut to the part the camera shows, in the line the film names, on a page framed live as on a picture', async () => {
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const ringed = (await setIn(outline.show(PAST_THE_SHOWN_EDGE, { line: 'dashed' }), close, 1, FULL_HD)).objects;
	const framed = await outline.show(PAST_THE_SHOWN_EDGE).begin({ ...beginningIn(close, FULL_HD), pageShown: 'framed' });
	expect([
		ringed.get('outline')!.box,
		ringed.get('outline')!.content,
		(await framed(close, 1)).objects.get('outline')!.content
	]).toEqual([
		{ left: 0, top: 60, width: 240, height: 200 },
		{ kind: 'outline', source: SHOWN_AT_TWO, line: 'dashed' },
		{ kind: 'outline', source: SHOWN_AT_TWO, line: 'solid' }
	]);
});

test("a picture of the film's comes up in its place, or over the whole frame, drawn as large as its box holds all of it as its file was decoded, in the box's middle, fading up whole", async () => {
	const placed = (
		await setIn(picture.show('mark.png', { at: MIDDLE_HALF }), OPENING_IN_FULL_HD, 0.5, FULL_HD)
	).objects.get('picture')!;
	const whole = (await setIn(picture.show('mark.png', { as: 'card' }), OPENING_IN_FULL_HD, 1, FULL_HD)).objects.get(
		'card'
	)!;
	expect([
		placed.content,
		placed.box,
		drawnObject('picture', placed, 0, AROUND_IN_FULL_HD).content,
		drawnObject('card', whole, 0, AROUND_IN_FULL_HD).content
	]).toEqual([
		{ kind: 'picture', file: 'mark.png', aspect: 4 },
		{ left: 480, top: 270, width: 960, height: 540 },
		{ kind: 'picture', file: 'mark.png', figure: { left: 0, top: 150, width: 960, height: 240 }, shown: 0.5 },
		{ kind: 'picture', file: 'mark.png', figure: { left: 0, top: 300, width: 1920, height: 480 }, shown: 1 }
	]);
});

test("a picture's file is refused where the film names no path", () => {
	expect(() => picture.show(42 as never)).toThrow(
		new FilmError("picture.show's file is 42: it is a file's path, from the film's file")
	);
});

test('a piece, or an outline, goes back over its block as the camera shows it then, face-on by its nearest whole turn, as large as it was and on its plane', async () => {
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show(PAST_THE_SHOWN_EDGE), close, 1, FULL_HD);
	const ringed = await setIn(outline.show(PAST_THE_SHOWN_EDGE), lifted, 1, FULL_HD);
	const grown = await setIn(piece.to('whole', { scale: 1.5, depth: 100 }), ringed, 1, FULL_HD);
	const spun = await setIn(piece.lean({ tilt: 30, turn: 360 }), grown, 1, FULL_HD);
	const ringMoved = await setIn(outline.to('left'), spun, 1, FULL_HD);
	const wider = await setIn(cameraTo(WHOLE_AT_ONE), ringMoved, 1, FULL_HD);
	const back = (await setIn(piece.back(), wider, 1, FULL_HD)).objects.get('piece')!;
	const ringBack = (await setIn(outline.back(), wider, 1, FULL_HD)).objects.get('outline')!;
	// The camera at 1 shows the screen's pixels as the frame's: each stands over the part it was cut to
	expect([back.box, back.content, back.scale, back.depth, back.angle, ringBack.box]).toEqual([
		SHOWN_AT_TWO,
		{
			kind: 'piece',
			source: SHOWN_AT_TWO,
			liftedOff: THE_FILMED_PAGE,
			corners: SQUARE_CORNERS,
			hole: null,
			lines: null,
			picture: FOLLOWING,
			body: null
		},
		1,
		0,
		{ ...FACE_ON, turn: 360 },
		SHOWN_AT_TWO
	]);
});

test('a piece carried onto a block of the page sets off from where it stands on the frame, lies on the block, and stays on it as the camera moves', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const cornered = await setIn(piece.to(UPPER_RIGHT_CORNER), lifted, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), cornered, 1, FULL_HD);
	const settingOff = await setIn(piece.onto('#other'), close, 0, FULL_HD);
	const landed = await setIn(piece.onto('#other'), close, 1, FULL_HD);
	const wider = await setIn(cameraTo(WHOLE_AT_ONE), landed, 1, FULL_HD);
	// The camera at 2 on the screen's middle shows the other block, 1200 to 1300 across and 600 to 660 down, twice as
	// large from 1440 and 660; at 1, where it stands
	expect([settingOff, landed, wider].map((scene) => drawnObjectsIn(scene, FULL_HD)[0]!.box)).toEqual([
		closeToBox(drawnObjectsIn(close, FULL_HD)[0]!.box),
		closeToBox({ left: 1440, top: 660, width: 200, height: 120 }),
		closeToBox(OTHER)
	]);
});

test("a piece lying on the page is laid in the page's window where the camera frames its block, so under what stands on the frame and cut at the window's edge", async () => {
	const windowed = await setIn(windowTo(MIDDLE_HALF), OPENING_IN_FULL_HD, 1, FULL_HD);
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), windowed, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	// The window, 960 × 540 in the frame's middle, shows the screen from 480 across and 270 down at 1: the other block,
	// from 1200 and 600, stands at 720 and 330 in it
	expect(drawnObjectsIn(landed, FULL_HD)[0]).toEqual(
		expect.objectContaining({ standsIn: 'window', box: closeToBox({ left: 720, top: 330, width: 100, height: 60 }) })
	);
});

test('a piece lying on the page shows its source as large as the camera frames the block it lies on, and has the picture taken as close', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), landed, 1, FULL_HD);
	// The card, 200 × 100, in the other block, 100 × 60, at half its size; twice as large as the camera at 2 frames it
	expect([
		drawnObjectsIn(close, FULL_HD)[0]!.content,
		pictureZoomsIn(close, cameraOf(close, FULL_HD), FULL_HD.frame)
	]).toEqual([expect.objectContaining({ fit: 1 }), [1]]);
});

test('a piece lying on the page stands over the point of the page it lies on as the window leans', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	const leant = await setIn(lean({ tilt: 20, turn: 30 }), landed, 1, FULL_HD);
	const camera = cameraOf(leant, FULL_HD);
	expect(
		drawnOnTheFrame(leant.objects.get('piece')!, { camera, groups: leant.groups }, FULL_HD.frame, BOX_MIDDLE)
	).toEqual(closeToPoint(onTheFrame(camera, FULL_HD.frame, { left: middleX(OTHER), top: middleY(OTHER) })));
});

test('a piece lying on the page goes back over its source there, wherever the camera has gone', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), landed, 1, FULL_HD);
	const back = await setIn(piece.back(), close, 1, FULL_HD);
	const further = await setIn(cameraTo(WHOLE_AT_ONE), back, 1, FULL_HD);
	// The card, 400 to 600 across and 300 to 400 down, as the camera at 2 shows it from -160 and 60; at 1, as it stands
	expect([back, further].map((scene) => drawnObjectsIn(scene, FULL_HD)[0]!.box)).toEqual([
		closeToBox({ left: -160, top: 60, width: 400, height: 200 }),
		closeToBox(CARD)
	]);
});

test('a piece on the frame is carried onto the page only lying flat there, while the window faces the frame front on: leant, turned over or near, in a group, or under a leant window, it is refused', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const tilted = await setIn(piece.lean({ tilt: 10 }), lifted, 1, FULL_HD);
	const turnedOver = await setIn(piece.lean({ over: 40 }), lifted, 1, FULL_HD);
	const near = await setIn(piece.effects({ depth: 100 }), lifted, 1, FULL_HD);
	const grouped = await setIn(group.show({ as: 'stack' }), wide, 1, FULL_HD);
	const stacked = await setIn(piece.show('#card', { group: 'stack' }), grouped, 1, FULL_HD);
	const underALeantWindow = await setIn(lean({ turn: 20 }), lifted, 1, FULL_HD);
	const notFlat = new FilmError(
		'piece.onto would lay the piece flat on the page while it leans or stands near the eye: bring it face-on and to no depth first'
	);
	await expect(async () => piece.onto('#other').begin(beginningIn(tilted, FULL_HD))).rejects.toThrow(notFlat);
	await expect(async () => piece.onto('#other').begin(beginningIn(turnedOver, FULL_HD))).rejects.toThrow(notFlat);
	await expect(async () => piece.onto('#other').begin(beginningIn(near, FULL_HD))).rejects.toThrow(notFlat);
	await expect(async () => piece.onto('#other').begin(beginningIn(stacked, FULL_HD))).rejects.toThrow(
		new FilmError('piece.onto would carry the piece out of its group onto the page: it goes with its group')
	);
	await expect(async () => piece.onto('#other').begin(beginningIn(underALeantWindow, FULL_HD))).rejects.toThrow(
		new FilmError(
			'piece.onto measures the piece on the page only while the window faces the frame front on, upright: bring it so, window.lean({ tilt: 0, turn: 0, roll: 0, over: 0 })'
		)
	);
});

test('a piece in the world carried onto the page stands where it stood as it sets off, wherever the eye stands, on a window brought near and rolled, and lands lying on it over the page in the world, its angle at its nearest whole turn to where it stood', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const spun = await setIn(piece.lean({ roll: 740 }), lifted, 1, FULL_HD);
	const raised = await setIn(piece.effects({ depth: 100 }), spun, 1, FULL_HD);
	const near = await setIn(windowTo(MIDDLE_HALF, { depth: 100 }), raised, 1, FULL_HD);
	const rolled = await setIn(lean({ roll: 20 }), near, 1, FULL_HD);
	const aside = await setIn(eye.to(EYE_ASIDE), rolled, 1, FULL_HD);
	const settingOff = await setIn(piece.onto('#other'), aside, 0, FULL_HD);
	const landed = await setIn(piece.onto('#other'), aside, 1, FULL_HD);
	const before = drawnObjectsIn(aside, FULL_HD)[0]!;
	const after = drawnObjectsIn(settingOff, FULL_HD)[0]!;
	// Spun 740 in the world on a window rolled 20, it stands rolled 720 on the page, two whole turns
	const spunTwice = { tilt: expect.closeTo(0), turn: expect.closeTo(0), roll: expect.closeTo(720), over: 0 };
	expect([
		after.standsIn,
		after.inTheEyesSpace,
		cornersDrawnIn(settingOff),
		landed.objects.get('piece')!.angle,
		landed.objects.get('piece')!.depth
	]).toEqual(['world', closeToMatrix(before.inTheEyesSpace), cornersDrawnIn(aside).map(closeToPoint), spunTwice, 0]);
});

test('a piece in the world standing off the page falls onto a block as it travels: it sets off where it stood, leant and near the eye, comes down on its way, and lies flat on the block over the page as the camera frames it', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const tilted = await setIn(piece.lean({ tilt: 10 }), lifted, 1, FULL_HD);
	const raised = await setIn(piece.effects({ depth: 150 }), tilted, 1, FULL_HD);
	const settingOff = await setIn(piece.onto('#other'), raised, 0, FULL_HD);
	const halfWay = await setIn(piece.onto('#other'), raised, 0.5, FULL_HD);
	const landed = await setIn(piece.onto('#other'), raised, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), landed, 1, FULL_HD);
	const halfWayPiece = halfWay.objects.get('piece')!;
	const landedPiece = landed.objects.get('piece')!;
	// The camera at 1 shows the other block where it stands on the screen; at 2 on the screen's middle, from 1440 and
	// 660, twice as large
	expect([
		drawnObjectsIn(settingOff, FULL_HD)[0]!.inTheEyesSpace,
		[halfWayPiece.depth, halfWayPiece.angle.tilt],
		[landedPiece.depth, landedPiece.angle.tilt],
		drawnObjectsIn(landed, FULL_HD)[0]!.box,
		drawnObjectsIn(close, FULL_HD)[0]!.box,
		drawnObjectsIn(close, FULL_HD)[0]!.standsIn
	]).toEqual([
		closeToMatrix(drawnObjectsIn(raised, FULL_HD)[0]!.inTheEyesSpace),
		[expect.closeTo(75), expect.closeTo(5)],
		[0, 0],
		closeToBox(OTHER),
		closeToBox({ left: 1440, top: 660, width: 200, height: 120 }),
		'world'
	]);
});

/** Where the corners of the piece of a scene shot full HD are drawn on the frame. */
function cornersDrawnIn(scene: Scene): readonly Point[] {
	const holders = holdersIn(scene, cameraOf(scene, FULL_HD));
	return CORNER_SHARES.map((corner) => drawnOnTheFrame(scene.objects.get('piece')!, holders, FULL_HD.frame, corner));
}

/** A matrix as a test takes it: each of its entries close to the one named. */
function closeToMatrix(matrix: Matrix): Matrix {
	return Object.fromEntries(Object.entries(matrix).map(([entry, value]) => [entry, expect.closeTo(value)])) as Matrix;
}

test('a piece lying on the page leans with the window, flat on it: a tilt, a turn or a depth of its own is refused', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	await expect(async () => piece.lean({ turn: 30 }).begin(beginningIn(landed, FULL_HD))).rejects.toThrow(
		new FilmError(
			'piece.lean would tilt, turn or turn over the piece alone: it lies on the page, and leans as it does; it rolls in it'
		)
	);
	await expect(async () => piece.effects({ depth: 100 }).begin(beginningIn(landed, FULL_HD))).rejects.toThrow(
		new FilmError('piece.effects would bring the piece toward the eye alone: it lies on the page, flat on it')
	);
});

test('a piece lying on the page never slides: out toward a side, or pushed off by one sliding in', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card'), wide, 1, FULL_HD);
	const landed = await setIn(piece.onto('#other'), lifted, 1, FULL_HD);
	await expect(async () => piece.hide({ toward: 'left' }).begin(beginningIn(landed, FULL_HD))).rejects.toThrow(
		new FilmError('piece.hide would slide the piece out toward a side from the page: it goes in its place')
	);
	await expect(async () =>
		title.show('Over', { at: 'left', as: 'piece', from: 'right' }).begin(beginningIn(landed, FULL_HD))
	).rejects.toThrow(
		new FilmError("title.show would push the piece off past the frame's edge from the page: hide it first")
	);
});

test('what stands over a block of the page stands there only while the window faces the frame front on, upright: leant, turned half round, rolled or turned over, it is refused', async () => {
	const lifted = await setIn(piece.show(PAST_THE_SHOWN_EDGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const magnified = await setIn(lens.show('#card'), lifted, 1, FULL_HD);
	const leant = await setIn(lean({ turn: 20 }), magnified, 1, FULL_HD);
	const turnedHalfRound = await setIn(lean({ turn: 180 }), magnified, 1, FULL_HD);
	const rolled = await setIn(lean({ roll: 90 }), magnified, 1, FULL_HD);
	const turnedOver = await setIn(lean({ over: 180 }), magnified, 1, FULL_HD);
	const refusal = (move: string) =>
		new FilmError(
			`${move} stands over its source only while the window faces the frame front on, upright: bring it so, window.lean({ tilt: 0, turn: 0, roll: 0, over: 0 })`
		);
	await expect(async () => piece.show(PAST_THE_SHOWN_EDGE).begin(beginningIn(rolled, FULL_HD))).rejects.toThrow(
		refusal('piece.show')
	);
	await expect(async () => lens.to('#card').begin(beginningIn(turnedOver, FULL_HD))).rejects.toThrow(
		refusal('lens.to')
	);
	await expect(async () => piece.show(PAST_THE_SHOWN_EDGE).begin(beginningIn(leant, FULL_HD))).rejects.toThrow(
		refusal('piece.show')
	);
	await expect(async () => piece.back().begin(beginningIn(turnedHalfRound, FULL_HD))).rejects.toThrow(
		refusal('piece.back')
	);
	await expect(async () => outline.show(PAST_THE_SHOWN_EDGE).begin(beginningIn(leant, FULL_HD))).rejects.toThrow(
		refusal('outline.show')
	);
	await expect(async () => lens.show('#card').begin(beginningIn(leant, FULL_HD))).rejects.toThrow(refusal('lens.show'));
	await expect(async () => lens.to('#card').begin(beginningIn(turnedHalfRound, FULL_HD))).rejects.toThrow(
		refusal('lens.to')
	);
});

test('a lens and a sweep of the screen are refused on a page framed live, which has no picture to draw them from', async () => {
	const framed: Beginning = {
		...beginningIn(OPENING_IN_FULL_HD, FULL_HD),
		pageShown: 'framed'
	};
	await expect(async () => lens.show('#card').begin(framed)).rejects.toThrow(
		new FilmError(
			"lens.show draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'"
		)
	);
	await expect(async () => screenSweep().begin(framed)).rejects.toThrow(
		new FilmError(
			"screen.sweep draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'"
		)
	);
});

test("a sweep holds a picture of the whole screen as it begins, which its band sweeps away as far as it has come, from the side, at the slant and as wide as the film names, its crest in the colours it names, and none, the look's accent as it stands, at an end it names none for; gone at its end; from the left, slanted 30° and 160 wide where the film names none of these", async () => {
	const pictures = new PicturesHeld();
	const named = await screenSweep({ from: 'right', slant: -28, width: 90, crest: { start: '#5b8def' } }).begin(
		beginningHolding(OPENING_IN_FULL_HD, FULL_HD, pictures)
	);
	const plain = await screenSweep().begin(beginningHolding(OPENING_IN_FULL_HD, FULL_HD, pictures));
	expect([
		pictures.parts,
		(await named(OPENING_IN_FULL_HD, 0.25)).screen.sweep,
		(await named(OPENING_IN_FULL_HD, 1)).screen.sweep,
		(await plain(OPENING_IN_FULL_HD, 0.5)).screen.sweep
	]).toEqual([
		[WHOLE_SCREEN, WHOLE_SCREEN],
		{
			kind: 'band',
			picture: 1,
			from: 'right',
			slant: -28,
			width: 90,
			crest: { start: '#5b8def', end: null },
			swept: 0.25
		},
		null,
		{ kind: 'band', picture: 2, from: 'left', slant: 30, width: 160, crest: { start: null, end: null }, swept: 0.5 }
	]);
});

test('a sweep opening round a block of the page holds a picture of the whole screen and opens round the middle of the block as far as it has come, as wide as the film names', async () => {
	const pictures = new PicturesHeld();
	const begun = await screenSweep({ round: '#block', width: 90 }).begin(
		beginningHolding(OPENING_IN_FULL_HD, FULL_HD, pictures)
	);
	expect([pictures.parts, (await begun(OPENING_IN_FULL_HD, 0.25)).screen.sweep]).toEqual([
		[WHOLE_SCREEN],
		{
			kind: 'disc',
			picture: 1,
			round: { left: 150, top: 120 },
			width: 90,
			crest: { start: null, end: null },
			swept: 0.25
		}
	]);
});

test('a sweep named both a block to open round and a side or a slant to come from is refused as the move is made', () => {
	const said =
		'screen.sweep opens round a block or comes from a side of the window: give it `round`, or `from` and `slant`, not both';
	expect(() => screenSweep({ round: '#block', from: 'left' })).toThrow(new FilmError(said));
	expect(() => screenSweep({ round: '#block', slant: 10 })).toThrow(new FilmError(said));
});

test("a disc sweeping the screen moves on the frame as far as its ring grows, so a fast one is drawn at moments of a frame's time", async () => {
	// Its ring grows from 45 inside the block's middle to 45 past the screen's farthest corner, a quarter of that way
	const begun = await screenSweep({ round: '#block', width: 90 }).begin(
		beginningHolding(OPENING_IN_FULL_HD, FULL_HD, new PicturesHeld())
	);
	const quarterOfTheWay = (Math.hypot(1920 - 150, 1080 - 120) + 90) / 4;
	expect(
		frameShiftBetween(
			atTheStart(await begun(OPENING_IN_FULL_HD, 0.25)),
			atTheStart(await begun(OPENING_IN_FULL_HD, 0.5)),
			FULL_HD
		)
	).toBeCloseTo(quarterOfTheWay);
});

test("a disc's ring growing while the camera pans down moves on the frame as far as its point that goes farthest, its top", async () => {
	// The camera at a zoom of 2 over the screen's middle, the disc 160 wide round it, its ring 40 of the screen's pixels
	// half: at a quarter of its way with the camera at 540, its radius 117.68 and its top at 304.64 on the frame; at
	// 0.28 with the camera 30 lower, 140.89 and 198.22. Its top goes 106.42; its point right of its middle 75.86
	const atTheMiddle = await setIn(cameraTo({ focusX: 960, focusY: 540, zoom: 2 }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lower = await setIn(cameraTo({ focusX: 960, focusY: 570, zoom: 2 }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const round = { left: 940, top: 520, width: 40, height: 40 };
	const begun = await screenSweep({ round }).begin(beginningHolding(atTheMiddle, FULL_HD, new PicturesHeld()));
	expect(
		frameShiftBetween(atTheStart(await begun(atTheMiddle, 0.25)), atTheStart(await begun(lower, 0.28)), FULL_HD)
	).toBeCloseTo(106.42);
});

test("a band sweeping the screen moves on the frame as far as it crosses the window, so a fast one is drawn at moments of a frame's time", async () => {
	// The whole screen, 1920 × 1080, on a frame as large, the band 160 wide: from 80 past the window's left side to 80
	// past its right, 2080 in all, a quarter of it 520
	const begun = await screenSweep({ slant: 0 }).begin(
		beginningHolding(OPENING_IN_FULL_HD, FULL_HD, new PicturesHeld())
	);
	expect(
		frameShiftBetween(
			atTheStart(await begun(OPENING_IN_FULL_HD, 0.25)),
			atTheStart(await begun(OPENING_IN_FULL_HD, 0.5)),
			FULL_HD
		)
	).toBeCloseTo(520);
});

test("a piece following the page's picture and a lens are refused while the screen shows the film's own page, as they are drawn from the filmed page's picture, the piece told to hold its picture", async () => {
	const own = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	await expect(async () => piece.show('#card').begin(beginningIn(own, FULL_HD))).rejects.toThrow(
		new FilmError(
			"piece.show follows the filmed page's picture, and the screen shows the film's own page: lift it holding a picture of its source, picture: 'held'"
		)
	);
	await expect(async () => lens.show('#card').begin(beginningIn(own, FULL_HD))).rejects.toThrow(
		ownPageRefusal('lens.show')
	);
});

test("a piece holding its picture and a sweep of the screen are drawn from pictures the take holds while the screen shows the film's own page", async () => {
	const own = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const pictures = new PicturesHeld();
	const held = await heldIn(piece.show('#card', { picture: 'held' }), own, FULL_HD, pictures);
	await screenSweep().begin(beginningHolding(own, FULL_HD, pictures));
	expect([held.objects.get('piece')!.content, pictures.parts]).toEqual([
		expect.objectContaining({ picture: { kind: 'held', number: 1 } }),
		[CARD, { left: 0, top: 0, ...FULL_HD.screen }]
	]);
});

test('a piece holding its picture is refused on a page framed live, which has no picture to draw it from', async () => {
	const framed: Beginning = { ...beginningIn(OPENING_IN_FULL_HD, FULL_HD), pageShown: 'framed' };
	await expect(async () => piece.show('#card', { picture: 'held' }).begin(framed)).rejects.toThrow(
		new FilmError(
			"piece.show draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'"
		)
	);
});

test("the screen showing the film's own page is refused while a lens stands, which shows the filmed page", async () => {
	const magnified = await setIn(lens.show('#card'), OPENING_IN_FULL_HD, 1, FULL_HD);
	await expect(async () => screenShows(OWN_PAGE).begin(beginningIn(magnified, FULL_HD))).rejects.toThrow(
		new FilmError(
			"screen.shows shows the film's own page while a lens stands, which shows the filmed page under it: hide the lens first, with lens.hide()"
		)
	);
});

test("the window's back shows a page of the film's own, laid by the stage as the screen's are, standing as its mount says, until it shows none and the screen is seen through it; it shares a step with what the screen shows", async () => {
	const backed = await setAt(screenBehind(OWN_PAGE, { upright: 'round' }), OPENING_IN_SMALL, 1);
	const bare = await setAt(screenBehind('none'), backed, 1);
	expect([
		ownPagesOf(screenBehind(OWN_PAGE, { upright: 'over' })).length,
		backed.screen.back,
		bare.screen.back
	]).toEqual([1, { kind: 'own', key: expect.any(String), upright: 'round' }, { kind: 'seen through' }]);
	expect(() => play({ seconds: 1, moves: [screenShows(OWN_PAGE), screenBehind('none')] })).not.toThrow();
});

test("a page of the film's own runs from its move's moment, gathering its pace over its share, running on at it, and holding at its end", async () => {
	// A page 1000 pixels longer than the screen, from standing to 100 pixels a second over two seconds from 1 s: 25
	// pixels down at 2 s, 100 at 3 s, 300 at 5 s, at its end from 10 s on
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const change = await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(shown, 1, 2));
	const running = await change(shown, 1);
	expect([1, 2, 3, 5, 20].map((moment) => scrolledIn(running, moment))).toEqual([0, 25, 100, 300, 1000]);
});

test("a page of the film's own shown drawn past its screen with nothing past it is refused as it is shown, in the words of the move", async () => {
	const fitting = scrollingFrom(OPENING_ON_A_FITTING_PAGE, 0, 0);
	await expect(async () => screenShows(OWN_PAGE, { reaches: 'document' }).begin(fitting)).rejects.toThrow(
		new FilmError(
			"screen.shows draws a page past its screen that has nothing past it: the screen holds all of it, or its own styles hide what runs past the screen, as overflow: hidden on its body does; give it more than the screen holds, or show it with reaches: 'screen'"
		)
	);
});

test('a page drawn past its screen, typed longer, then run past the length it was shown with, runs on to its new end and is drawn past its foot by none there, never less', async () => {
	// 1000 pixels longer than the screen as shown, 1040 once the line typed wraps; run at 100 a second from 0 s, it
	// stands at its new end from 10.4 s
	const shown = await setIn(screenShows(OWN_PAGE, { reaches: 'document' }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const typed = await (await typingWrapped().begin(typingWrappedFrom(shown, 0)))(shown, 1);
	const running = await (await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(typed, 0, 0)))(typed, 1);
	const past = pastTheScreen(running.screen, LEANT_ABOUT_ITS_MIDDLE, FULL_HD, 20)!;
	expect([scrolledIn(running, 20), past.below]).toEqual([1040, 0]);
});

test('while a typing lengthens a page drawn past its screen, the sheet reaches below the screen as far as the text standing typed at each stroke makes it', async () => {
	// Run at 100 a second from 0 s, 990 down at 9.9 s, 10 short of its end as shown: 8 letters typed half way, the line
	// not yet wrapped, and 16 at the end, wrapped, the page 40 longer
	const shown = await setIn(screenShows(OWN_PAGE, { reaches: 'document' }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const running = await (await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(shown, 0, 0)))(shown, 1);
	const typing = await typingWrapped().begin(typingWrappedFrom(running, 9.9));
	const typedTo = await Promise.all([0.5, 1].map(async (progress) => typing(running, progress)));
	expect(typedTo.map((scene) => pastTheScreen(scene.screen, LEANT_ABOUT_ITS_MIDDLE, FULL_HD, 9.9)!.below)).toEqual([
		expect.closeTo(10),
		expect.closeTo(50)
	]);
});

test("a page of the film's own takes its pace from where its run stands and as fast as it runs there, and stops at a pace of none", async () => {
	// Running at 100 pixels a second from 0 s, then slowing to none over two seconds from 3 s: 300 pixels down then, 375
	// at 4 s, and 400 from 5 s on
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const running = await (await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(shown, 0, 0)))(shown, 1);
	const stopped = await (await screenScrolls(OWN_PAGE, { pace: 0 }).begin(scrollingFrom(running, 3, 2)))(running, 1);
	expect([3, 4, 9].map((moment) => scrolledIn(stopped, moment))).toEqual([300, 375, 400]);
});

test("a page of the film's own that scrolls nowhere is refused as its run begins, in the words of the move", async () => {
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_ON_A_FITTING_PAGE, 1, FULL_HD);
	const fitting = scrollingFrom(shown, 0, 0);
	await expect(async () => screenScrolls(OWN_PAGE, { pace: 100 }).begin(fitting)).rejects.toThrow(
		new FilmError(
			'screen.scrolls runs a page that scrolls nowhere: the screen holds all of it, or its own styles hide what runs past the screen, as overflow: hidden on its body does; give it more than the screen holds and let it scroll'
		)
	);
});

test("a page of the film's own that runs moves on the frame as far as it runs while the shutter is open, as the camera shows the screen", async () => {
	// Face-on, the whole screen at a zoom of 1 on a frame as large: 100 pixels a second, 10 over a tenth of a second
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const running = await (await screenScrolls(OWN_PAGE, { pace: 100 }).begin(scrollingFrom(shown, 0, 0)))(shown, 1);
	expect(frameShiftBetween({ scene: running, moment: 3 }, { scene: running, moment: 3.1 }, FULL_HD)).toBeCloseTo(10);
});

test("a page of the film's own comes to rest with a block that far below the screen's top as its move's share ends, at once in a cut", async () => {
	// 300 down at 3 s; #input, 900 down the page, brought 200 below the screen's top: the page 700 down
	const running = await runningFromTheStart();
	const toRest = screenScrollTo(OWN_PAGE, INPUT, { top: 200 });
	const inAPlay = await (await toRest.begin(scrollingFrom(running, 3, 2)))(running, 1);
	const inACut = await (await toRest.begin(scrollingFrom(running, 3, 0)))(running, 1);
	expect([3, 5, 9].map((moment) => scrolledIn(inAPlay, moment))).toEqual([300, 700, 700]);
	expect([3, 9].map((moment) => scrolledIn(inACut, moment))).toEqual([700, 700]);
});

test("a page of the film's own coming to rest sets off at the pace it ran", async () => {
	// At 100 pixels a second, a tenth of a pixel over the first thousandth of a second of its way to rest 400 on
	const running = await runningFromTheStart();
	const toRest = await screenScrollTo(OWN_PAGE, INPUT, { top: 200 }).begin(scrollingFrom(running, 3, 2));
	const resting = await toRest(running, 1);
	expect(scrolledIn(resting, 3.001) - scrolledIn(resting, 3)).toBeCloseTo(0.1, 3);
});

test("a page of the film's own taken over while its pace changes sets off as fast as it ran there", async () => {
	// Gathering pace evenly from standing to 200 pixels a second over 2 s, it runs at 99 at 0.99 s, between two of
	// its run's knots: 0.099 of a pixel over the first thousandth of a second of its way to rest from there
	const shown = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const gathering = (await screenScrolls(OWN_PAGE, { pace: 200 }).begin(scrollingFrom(shown, 0, 2)))(shown, 1);
	const toRest = await screenScrollTo(OWN_PAGE, INPUT, { top: 200 }).begin(scrollingFrom(gathering, 0.99, 2));
	const resting = await toRest(gathering, 1);
	expect(scrolledIn(resting, 0.991) - scrolledIn(resting, 0.99)).toBeCloseTo(0.099, 3);
});

test('screen.scrollTo refuses a rest past where its page scrolls, above its top or past its end, as it begins', async () => {
	const running = await runningFromTheStart();
	const aboveItsTop = screenScrollTo(OWN_PAGE, INPUT, { top: 1000 }).begin(scrollingFrom(running, 3, 2));
	const pastItsEnd = screenScrollTo(OWN_PAGE, INPUT, { top: -200 }).begin(scrollingFrom(running, 3, 2));
	await expect(aboveItsTop).rejects.toThrow(
		new FilmError(
			"screen.scrollTo would bring #input 1000 pixels below the screen's top with its page scrolled -100 down, and it scrolls from 0 to 1000: name a top it reaches"
		)
	);
	await expect(pastItsEnd).rejects.toThrow(
		new FilmError(
			"screen.scrollTo would bring #input -200 pixels below the screen's top with its page scrolled 1100 down, and it scrolls from 0 to 1000: name a top it reaches"
		)
	);
});

test('screen.scrollTo refuses, as it begins, a run that would turn back to come to rest: one running away from its rest, and one too fast to stop short of it', async () => {
	// Running 100 pixels a second down from 300 at 3 s: a rest at 100 lies behind it; one at 350, over 2 s, at a mean of
	// 25 a second, is too near for a run that sets off at more than 3 times that
	const running = await runningFromTheStart();
	const behindIt = screenScrollTo(OWN_PAGE, INPUT, { top: 800 }).begin(scrollingFrom(running, 3, 2));
	const tooNear = screenScrollTo(OWN_PAGE, INPUT, { top: 550 }).begin(scrollingFrom(running, 3, 2));
	await expect(behindIt).rejects.toThrow(
		new FilmError(
			'screen.scrollTo would turn the page back: it runs 100 pixels a second down its scroll, and the rest that brings #input there lies 200 up it: stop it first, with screen.scrolls(page, { pace: 0 })'
		)
	);
	await expect(tooNear).rejects.toThrow(
		new FilmError(
			'screen.scrollTo would carry the page past the rest that brings #input there and back: it runs 100 pixels a second, more than 3 times the 25 a second its way to rest takes on average: give the move a longer share, or slow the page first'
		)
	);
});

test("a page of the film's own brought to rest with its pace judged at a point of the frame has run half its way across the frame there by half its share, from standing, as the frame comes closer", async () => {
	// Standing at its top at 3 s, brought to rest 700 down by 5 s while the frame comes from a zoom of 1 to 2: what the
	// frame's middle shows has run half its way across the frame by 4 s; run on the page alone, 0.4375 of it
	const standing = await standingFromTheStart();
	const toRest = screenScrollTo(OWN_PAGE, INPUT, { top: 200, judged: { left: 0.5, top: 0.5 } });
	const resting = await (await toRest.begin(judgedFrom(standing, 3, 2, comingCloser)))(standing, 1);
	const halfWay = runAcrossTheMiddle(resting, 3, 4, comingCloser) / runAcrossTheMiddle(resting, 3, 5, comingCloser);
	expect(halfWay).toBeCloseTo(0.5, 3);
});

test("a page of the film's own brought to rest with its pace judged on the frame sets off at the pace it ran and stands at its rest as its share ends", async () => {
	// 300 down and running 100 pixels a second at 3 s: a tenth of a pixel over the first thousandth of a second, and 700
	// down, where #input stands 200 below the screen's top, from 5 s on
	const running = await runningFromTheStart();
	const toRest = screenScrollTo(OWN_PAGE, INPUT, { top: 200, judged: { left: 0.5, top: 0.5 } });
	const resting = await (await toRest.begin(judgedFrom(running, 3, 2, comingCloser)))(running, 1);
	const setOff = scrolledIn(resting, 3.001) - scrolledIn(resting, 3);
	expect([setOff, scrolledIn(resting, 5), scrolledIn(resting, 9)]).toEqual([expect.closeTo(0.1, 3), 700, 700]);
});

test('screen.scrollTo refuses, as it begins, a run judged on the frame that would turn back across the frame there, though on the page alone it would not', async () => {
	// Running 100 pixels a second, 800 across the frame at a zoom of 8, as the frame draws back to 1 at once: its way to
	// rest 400 down the page over 2 s is about 400 across the frame, which it cannot set off on at 800 and not pass
	const running = await runningFromTheStart();
	const toRest = screenScrollTo(OWN_PAGE, INPUT, { top: 200, judged: { left: 0.5, top: 0.5 } });
	await expect(toRest.begin(judgedFrom(running, 3, 2, drawingBack))).rejects.toThrow(
		new FilmError(
			"screen.scrollTo would carry the page past the rest that brings #input there and back: it runs 800 pixels a second across the frame where its pace is judged, too fast to slow to rest there within the move's share: give the move a longer share, or slow the page first"
		)
	);
});

test("screen.scrollTo refuses, as it begins, a pace judged at a point of the frame where the eye sees past the window's plane", async () => {
	// Leant back 89° about its middle, the window's plane lies below the frame's top
	const running = await runningFromTheStart();
	const edgeOn = {
		...LEANT_ABOUT_ITS_MIDDLE,
		view: { ...LEANT_ABOUT_ITS_MIDDLE.view, angle: { ...FACE_ON, tilt: 89 } }
	};
	const toRest = screenScrollTo(OWN_PAGE, INPUT, { top: 200, judged: { left: 0.5, top: 0 } });
	await expect(
		toRest.begin({ ...scrollingFrom(running, 3, 2), cameraAt: () => Promise.resolve(edgeOn) })
	).rejects.toThrow(
		new FilmError(
			"screen.scrollTo judges its pace at a point of the frame where the eye sees past the window's plane while the page runs: judge it where the eye sees that plane all through the move"
		)
	);
});

test('what a film types into a block of a page of its own stands as far as the typing has come, on whichever face of the window shows the page', async () => {
	// Two letters, at 0.1 s and 0.2 s: half way through, the first stands typed
	const front = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const typing = await screenType(OWN_PAGE, keystrokes('ls', TEN_A_SECOND), { into: TYPED_INTO }).begin(
		typingFrom(front)
	);
	const halfWay = await typing(front, 0.5);
	const behind = await setIn(screenBehind(OWN_PAGE, { upright: 'over' }), halfWay, 1, FULL_HD);
	const camera = cameraOf(halfWay, FULL_HD);
	expect([
		drawnScreen(halfWay.screen, camera, FULL_HD, true, 0, 0, NOTHING_PAST).shows,
		drawnScreen({ ...behind.screen, shows: THE_FILMED_PAGE }, camera, FULL_HD, false, 0, 0, NOTHING_PAST).shows.typed
	]).toEqual([
		{ kind: 'own', key: expect.any(String), scrolled: 0, typed: [{ into: TYPED_INTO, text: 'l' }], sheet: null },
		[{ into: TYPED_INTO, text: 'l' }]
	]);
});

test("a typing into another block of a page of the film's own keeps what stands typed in the first, and one into the same block takes its place", async () => {
	const front = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const first = await typedWhole(front, 'ls', TYPED_INTO);
	const second = await typedWhole(first, 'cd', OTHER_TYPED_INTO);
	const again = await typedWhole(second, 'pwd', TYPED_INTO);
	expect([typedDrawnIn(second), typedDrawnIn(again)]).toEqual([
		[
			{ into: TYPED_INTO, text: 'ls' },
			{ into: OTHER_TYPED_INTO, text: 'cd' }
		],
		[
			{ into: TYPED_INTO, text: 'pwd' },
			{ into: OTHER_TYPED_INTO, text: 'cd' }
		]
	]);
});

test('screen.type refuses, as it begins, a block that holds elements of its own, which what it types would take the place of, and an input, which shows its value, not its text, where what it types would show nothing', async () => {
	const front = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const holdings = new Map([
		['#line', 'elements'],
		['#field', 'its value']
	]);
	const holding: Beginning = {
		...beginningIn(front, FULL_HD),
		ownPage: () => Promise.resolve(new PageOfBoxes(new Map(), new Map(), OWN_PAGE_LENGTH, holdings))
	};
	const intoTheLine = screenType(OWN_PAGE, keystrokes('ls', TEN_A_SECOND), { into: '#line' }).begin(holding);
	const intoTheField = screenType(OWN_PAGE, keystrokes('ls', TEN_A_SECOND), { into: '#field' }).begin(holding);
	await expect(intoTheLine).rejects.toThrow(
		new FilmError(
			'screen.type types into #line, which holds elements of its own that what it types would take the place of: name a span of text alone, as <span id="typed"></span> beside <span class="caret"></span>'
		)
	);
	await expect(intoTheField).rejects.toThrow(
		new FilmError(
			'screen.type types into #field, an <input>, which shows its value, not its text, so what it types would show nothing: name a span of text alone, as <span id="typed"></span> beside <span class="caret"></span>'
		)
	);
});

test('screen.type shares a step with what the screen shows and how its page runs, and two typings at once are refused', () => {
	const typed = screenType(OWN_PAGE, keystrokes('ls', TEN_A_SECOND), { into: TYPED_INTO });
	expect(() =>
		play({ seconds: 1, moves: [screenShows(OWN_PAGE), screenScrolls(OWN_PAGE, { pace: 100 }), typed] })
	).not.toThrow();
	expect(() => play({ seconds: 1, moves: [typed, typed] })).toThrow(
		new FilmError("two moves on the screen's documents at once in one step")
	);
});

test('the screen coming up or going down keeps showing what it shows, and shares a step with a move that changes it and one that sweeps it', async () => {
	const own = await setAt(screenShows(OWN_PAGE), OPENING_IN_SMALL, 1);
	expect((await setAt(lower(), own, 1)).screen.shows.kind).toBe('own');
	expect(() => play({ seconds: 1, moves: [rise(), screenShows('filmed'), screenSweep()] })).not.toThrow();
});

test("a piece is drawn as large as its box holds all of its source, in its middle, and asks its source as close as that and its scale bring it, from a picture of its own past livereel's bound, and the page's picture at the bound leant", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show(PAST_THE_SHOWN_EDGE), wide, 1, FULL_HD);
	const filling = await setIn(piece.to({ left: 0, top: 0, width: 1, height: 1 }, { scale: 2 }), lifted, 1, FULL_HD);
	const leant = await setIn(piece.lean({ turn: 20 }), filling, 1, FULL_HD);
	const object = filling.objects.get('piece')!;
	// The whole frame, 1920 × 1080, holds the source of 200 × 100 at most 9.6 times as large across: 960 high, 60 in
	expect([
		drawnObject('piece', object, 0, AROUND_IN_FULL_HD).content,
		partsAskedSharperIn(filling, cameraOf(filling, FULL_HD), FULL_HD.frame),
		pictureZoomsIn(filling, cameraOf(filling, FULL_HD), FULL_HD.frame),
		pictureZoomsIn(leant, cameraOf(leant, FULL_HD), FULL_HD.frame)
	]).toEqual([
		{
			kind: 'piece',
			source: PAST_THE_SHOWN_EDGE,
			fit: 9.6,
			figure: { left: 0, top: 60, width: 1920, height: 960 },
			corners: SQUARE_CORNERS,
			holes: [],
			shown: 1,
			picture: DRAWN_FROM_THE_PAGE,
			body: null
		},
		[{ part: PAST_THE_SHOWN_EDGE, zoom: 19.2 }],
		[],
		[2.2]
	]);
});

test('a hole is drawn only while the screen shows the page its piece was lifted off', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { hole: {} }), wide, 1, FULL_HD);
	const ownShown = await setIn(screenShows(OWN_PAGE), lifted, 1, FULL_HD);
	const filmedAgain = await setIn(screenShows('filmed'), ownShown, 1, FULL_HD);
	const holesIn = (scene: Scene) => drawn(scene, cameraOf(scene, FULL_HD), 0, FULL_HD, NONE_SHARPER).holes.length;
	expect([lifted, ownShown, filmedAgain].map(holesIn)).toEqual([1, 0, 1]);
});

test("a piece lifted with a hole leaves on the screen, where it was lifted, the ground the page draws behind its block or the film's colour, ringed in the line the film names, as far as the piece has come and not gone", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const coming = await setIn(piece.show('#card', { hole: {} }), wide, 0.5, FULL_HD);
	const area = piece.show(OTHER, { hole: { ground: '#112233', line: 'dashed' }, as: 'area' });
	const both = await setIn(area, coming, 1, FULL_HD);
	expect(drawn(both, cameraOf(both, FULL_HD), 0, FULL_HD, NONE_SHARPER).holes).toEqual([
		{ name: 'piece', box: CARD, ground: CARDS_GROUND, line: null, corner: 0, shown: 0.5, pit: null },
		{ name: 'area', box: OTHER, ground: '#112233', line: 'dashed', corner: 0, shown: 1, pit: null }
	]);
});

test("a piece's hole reaching past it is as much wider each way and as much rounder; one sunk into the page as a pit is as deep, its walls its piece's body's colour, lit from within as faintly as the film names, none where it names none; a piece of the page shows it flat", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const socket = piece.show('#card', {
		inside: 'world',
		corner: 6,
		body: { thickness: 12, walls: '#e6e8ec' },
		hole: { ground: '#07090d', reach: 3 }
	});
	const sunk = piece.show(OTHER, {
		inside: 'world',
		body: { thickness: 14, walls: '#1d2a44' },
		hole: { ground: '#112233', reach: 2, pit: { depth: 14 } },
		as: 'part'
	});
	const both = await setIn(sunk, await setIn(socket, wide, 1, FULL_HD), 1, FULL_HD);
	const page = await setIn(piece.show(WHOLE_SCREEN, { as: 'page' }), both, 1, FULL_HD);
	const scene = drawn(page, cameraOf(page, FULL_HD), 0, FULL_HD, NONE_SHARPER);
	const pageShows = scene.objects.find((object) => object.name === 'page')!.content;
	// The card, 400 to 600 across and 300 to 400 down, the other 1200 to 1300 and 600 to 660; the screen's pixels the
	// frame's in the page lifted whole
	const socketBox = { left: 397, top: 297, width: 206, height: 106 };
	const pitBox = { left: 1198, top: 598, width: 104, height: 64 };
	expect([scene.holes, pageShows.holes]).toEqual([
		[
			{ name: 'piece', box: socketBox, ground: '#07090d', line: null, corner: 9, shown: 1, pit: null },
			{
				name: 'part',
				box: pitBox,
				ground: '#112233',
				line: null,
				corner: 2,
				shown: 1,
				pit: { depth: 14, walls: '#1d2a44', glow: 0 }
			}
		],
		[
			{ name: 'piece', box: socketBox, ground: '#07090d', line: null, corner: 9, shown: 1, pit: null },
			{ name: 'part', box: pitBox, ground: '#112233', line: null, corner: 2, shown: 1, pit: null }
		]
	]);
});

test("a hole's pit is refused on a piece with no body, whose colour its walls take", () => {
	expect(() => piece.show('#card', { inside: 'world', hole: { pit: { depth: 14 } } })).toThrow(
		new FilmError(
			"piece.show sinks a hole's pit with walls of the piece's body's colour: give the piece a body, body: { thickness, walls }"
		)
	);
});

test('a piece lifted with a corner is drawn with its corners so round, as large as it shows the page, and leaves its hole as round on the screen and in a piece that shows it', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const screenLifted = await setIn(piece.show(WHOLE_SCREEN, { as: 'screen' }), wide, 1, FULL_HD);
	const cardLifted = await setIn(piece.show('#card', { corner: 18, hole: {} }), screenLifted, 1, FULL_HD);
	const cardFilling = await setIn(piece.to({ left: 0, top: 0, width: 1, height: 1 }), cardLifted, 1, FULL_HD);
	const screenSmaller = await setIn(piece.to(UPPER_RIGHT_CORNER, { as: 'screen' }), cardFilling, 1, FULL_HD);
	const scene = drawn(screenSmaller, cameraOf(screenSmaller, FULL_HD), 0, FULL_HD, NONE_SHARPER);
	const contents = new Map(scene.objects.map((object) => [object.name, object.content]));
	// The card, 200 × 100, fills the frame's 1920 × 1080 at 9.6 times as large; the whole screen stands in a quarter of
	// the frame across and down, a quarter as large; the screen shows the page's pixels as the frame's
	const cardCorner = expect.closeTo(172.8);
	expect([contents.get('piece'), contents.get('screen'), scene.holes]).toEqual([
		expect.objectContaining({
			corners: { topLeft: cardCorner, topRight: cardCorner, bottomRight: cardCorner, bottomLeft: cardCorner }
		}),
		expect.objectContaining({ holes: [expect.objectContaining({ name: 'piece', corner: 4.5 })] }),
		[expect.objectContaining({ name: 'piece', corner: 18 })]
	]);
});

test('a piece lifted into the world with a body is drawn with walls as thick as its fit and scale show its thickness and as far as it has come, its face as high over where it was lifted as it stands out', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const bodied = piece.show(PAST_THE_SHOWN_EDGE, { inside: 'world', body: { thickness: 12, walls: '#e6e8ec' } });
	const coming = await setIn(bodied, wide, 0.5, FULL_HD);
	const risen = await setIn(piece.effects({ depth: 40, scale: 2 }), await setIn(bodied, wide, 1, FULL_HD), 1, FULL_HD);
	const bodyOf = (scene: Scene) => drawnObject('piece', scene.objects.get('piece')!, 0, AROUND_IN_FULL_HD).content.body;
	const risenBody = bodyOf(risen);
	// The screen's pixels are the frame's at the camera at 1: 12 thick, half come up 6, twice as large 24
	expect([bodyOf(coming), risenBody]).toEqual([
		{ thickness: 6, walls: '#e6e8ec', glow: 0, height: 0 },
		{ thickness: 24, walls: '#e6e8ec', glow: 0, height: 40 }
	]);
});

test("a piece's body is refused anywhere but inside the world, as the frame, a group and the window are drawn flat", () => {
	const body = { thickness: 12, walls: '#e6e8ec' };
	const flatOnly = new FilmError(
		"piece.show draws a piece's body inside the world alone, as the frame, a group and the window are drawn flat over everything: lift it inside: 'world'"
	);
	expect(() => piece.show('#card', { body })).toThrow(flatOnly);
	expect(() => piece.show('#card', { body, group: 'stack' })).toThrow(flatOnly);
});

test("a piece whose corner stands on a corner of what the window shows is as round there as the window, the film's own corner where it is rounder", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const liftedContent = async (move: Move, scene: Scene) =>
		(await setIn(move, scene, 1, FULL_HD)).objects.get('piece')!.content;
	const alongTheTop = { left: 0, top: 0, width: 1920, height: 100 };
	// The camera at 2 shows 480 to 1440 across and 270 to 810 down: this box is cut to that corner of it
	const pastTheShownCorner = { left: 400, top: 200, width: 200, height: 200 };
	// The look rounds the window 24 pixels of a 1080 frame: 24 of the page's at the camera at 1, 12 at 2
	expect([
		await liftedContent(piece.show(WHOLE_SCREEN), wide),
		await liftedContent(piece.show(alongTheTop), wide),
		await liftedContent(piece.show(WHOLE_SCREEN, { corner: 30 }), wide),
		await liftedContent(piece.show(pastTheShownCorner), close)
	]).toEqual([
		expect.objectContaining({ corners: { topLeft: 24, topRight: 24, bottomRight: 24, bottomLeft: 24 } }),
		expect.objectContaining({ corners: { topLeft: 24, topRight: 24, bottomRight: 0, bottomLeft: 0 } }),
		expect.objectContaining({ corners: { topLeft: 30, topRight: 30, bottomRight: 30, bottomLeft: 30 } }),
		expect.objectContaining({ corners: { topLeft: 12, topRight: 0, bottomRight: 0, bottomLeft: 0 } })
	]);
});

test('a hole over a box of the screen, which has no block to read the ground behind, is refused unless the film names its colour', () => {
	expect(() => piece.show(OTHER, { hole: { line: 'dashed' } })).toThrow(
		new FilmError(
			"piece.show's hole over a box of the screen finds no block to read the ground behind: name its colour, hole: { ground: '#rrggbb' }"
		)
	);
});

test('a piece lifted with lines draws them along the two edges of the outline round it and its source that join one to the other, drawn out as far as it has come and not gone, and none while it stands over its source', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { lines: 'solid' }), wide, 1, FULL_HD);
	const aside = await setIn(piece.to(UPPER_RIGHT_CORNER), lifted, 1, FULL_HD);
	const going = await setIn(piece.hide(), aside, 0.25, FULL_HD);
	const linesOf = (scene: Scene) => drawn(scene, cameraOf(scene, FULL_HD), 0, FULL_HD, NONE_SHARPER).lines;
	// The card, 400 to 600 across and 300 to 400 down, drawn in 1440 to 1920 across and 15 to 255 down: from its top left
	// corner to the piece's, and from its bottom right corner to the piece's
	expect([linesOf(lifted), linesOf(aside), linesOf(going)[0]!.drawn]).toEqual([
		[],
		[
			{
				name: 'piece',
				line: 'solid',
				segments: [
					{ from: { left: 400, top: 300 }, length: expect.closeTo(1078.34, 2), angle: expect.closeTo(-15.33, 2) },
					{ from: { left: 600, top: 400 }, length: expect.closeTo(1327.94, 2), angle: expect.closeTo(-6.27, 2) }
				],
				drawn: 1
			}
		],
		0.75
	]);
});

test("a piece's lines cross neither it nor its source while it stands partly over its source, and are none while it holds its source whole", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { lines: 'solid' }), wide, 1, FULL_HD);
	const halfOver = await setIn(
		piece.to({ left: 500 / 1920, top: 350 / 1080, width: 200 / 1920, height: 100 / 1080 }),
		lifted,
		1,
		FULL_HD
	);
	const grown = await setIn(
		piece.to({ left: 300 / 1920, top: 250 / 1080, width: 400 / 1920, height: 200 / 1080 }),
		lifted,
		1,
		FULL_HD
	);
	const grownFromItsCorner = await setIn(
		piece.to({ left: 400 / 1920, top: 300 / 1080, width: 400 / 1920, height: 200 / 1080 }),
		lifted,
		1,
		FULL_HD
	);
	const linesOf = (scene: Scene) => drawn(scene, cameraOf(scene, FULL_HD), 0, FULL_HD, NONE_SHARPER).lines;
	// The card, 400 to 600 across and 300 to 400 down, and the piece 500 to 700 and 350 to 450: from its top right corner
	// to the piece's, and from its bottom left corner to the piece's, outside both; grown twice as large about the card's
	// middle, or from its top left corner, the piece holds it whole
	expect([linesOf(halfOver)[0]!.segments, linesOf(grown), linesOf(grownFromItsCorner)]).toEqual([
		[
			{ from: { left: 600, top: 300 }, length: expect.closeTo(111.8, 1), angle: expect.closeTo(26.57, 2) },
			{ from: { left: 400, top: 400 }, length: expect.closeTo(111.8, 1), angle: expect.closeTo(26.57, 2) }
		],
		[],
		[]
	]);
});

test("a lens is born round its block's middle as the camera shows it, 320 pixels of a 1080 frame across where the film names no size, or as wide as it names, as wide for its frame on any frame", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const shown = await setIn(lens.show('#card'), wide, 1, FULL_HD);
	const named = await setIn(lens.show('#card', { size: 150 }), wide, 1, FULL_HD);
	const onASmallFrame = await setAt(lens.show('#block'), OPENING_IN_SMALL, 1);
	// Round the card's middle, 500 across and 350 down; a frame 400 high draws what a 1080 frame does at 400 / 1080 of
	// its size
	expect([
		shown.objects.get('lens')!.box,
		named.objects.get('lens')!.box,
		onASmallFrame.objects.get('lens')!.box.width
	]).toEqual([
		{ left: 340, top: 190, width: 320, height: 320 },
		{ left: 425, top: 275, width: 150, height: 150 },
		expect.closeTo(118.52, 2)
	]);
});

test('a lens shows the screen under its middle twice as close as the camera does where the film names no magnification, or as many times as it names, and the page is pictured as sharp as that', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const shown = await setIn(lens.show('#card'), wide, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), shown, 1, FULL_HD);
	const thrice = await setIn(lens.show('#card', { magnification: 3 }), wide, 1, FULL_HD);
	const drawnLens = (scene: Scene) =>
		drawnObject('lens', scene.objects.get('lens')!, 0, { ...AROUND_IN_FULL_HD, camera: cameraOf(scene, FULL_HD) })
			.content;
	// The camera at 1 shows the card's middle, 500 across and 350 down, there; at 2, at 730 and 445
	expect([
		drawnLens(shown),
		drawnLens(close),
		pictureZoomsIn(close, cameraOf(close, FULL_HD), FULL_HD.frame),
		pictureZoomsIn(thrice, cameraOf(thrice, FULL_HD), FULL_HD.frame)
	]).toEqual([
		{
			kind: 'lens',
			source: { left: 420, top: 270, width: 160, height: 160 },
			fit: 2,
			figure: { left: 0, top: 0, width: 320, height: 320 },
			holes: [],
			shown: 1
		},
		{
			kind: 'lens',
			source: { left: 690, top: 405, width: 80, height: 80 },
			fit: 4,
			figure: { left: 0, top: 0, width: 320, height: 320 },
			holes: [],
			shown: 1
		},
		[4],
		[3]
	]);
});

test("a lens carried to another block stands round that block's middle as the camera shows it, as wide as it stood", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const shown = await setIn(lens.show('#card', { size: 150 }), wide, 1, FULL_HD);
	const moved = await setIn(lens.to('#other'), shown, 1, FULL_HD);
	// The other block's middle is 1250 across and 630 down
	expect(moved.objects.get('lens')!.box).toEqual({ left: 1175, top: 555, width: 150, height: 150 });
});

test("a lens whose middle sees past the screen's plane, the window swung far round after it came, shows nothing of the page", async () => {
	const shown = await setIn(lens.show('#card'), OPENING_IN_FULL_HD, 1, FULL_HD);
	const swung = await setIn(lean({ turn: 100 }), shown, 1, FULL_HD);
	const around = { ...AROUND_IN_FULL_HD, camera: cameraOf(swung, FULL_HD) };
	expect(drawnObject('lens', swung.objects.get('lens')!, 0, around).content).toMatchObject({
		kind: 'lens',
		source: null
	});
});

test('a piece comes up in its own way fading in whole as its move goes on, and goes fading out so', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const coming = (await setIn(piece.show(PAST_THE_SHOWN_EDGE), wide, 0.25, FULL_HD)).objects.get('piece')!;
	const lifted = await setIn(piece.show(PAST_THE_SHOWN_EDGE), wide, 1, FULL_HD);
	const going = (await setIn(piece.hide(), lifted, 0.25, FULL_HD)).objects.get('piece')!;
	expect([coming, going].map((object) => drawnObject('piece', object, 0, AROUND_IN_FULL_HD).content.shown)).toEqual([
		0.25, 0.75
	]);
});

test('an object leans by a move of its own while another carries it and its content changes, each its own way along, a side of the angle left out kept', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const leaning = await setAt(code.lean({ tilt: 10 }), coded, 1);
	const moves = [code.lean({ turn: -20 }), code.to('right'), code.light(2)];
	const turning = await setAt(code.lean({ turn: -20 }), leaning, 0.5);
	const travelling = await setAt(code.to('right'), turning, 0.5);
	const object = (await setAt(code.light(2), travelling, 0.5)).objects.get('code')!;
	expect([
		object.angle,
		object.box,
		object.content.lines.map((line) => line.lit),
		play({ seconds: 1, moves }).moves
	]).toEqual([
		{ ...FACE_ON, tilt: 10, turn: -10 },
		boxToward(wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'right'), 0.5),
		[0, 0.5, 0],
		moves
	]);
	expect(() => play({ seconds: 1, moves: [code.to('right'), code.hide()] })).toThrow(
		new FilmError('two moves on the code object at once in one step')
	);
});

test("an object shown into a group stands where it would on the frame, in the group's pixels, and the group rolled, grown or brought near carries it about the group's middle", async () => {
	const grouped = await setAt(group.show({ at: LOWER_RIGHT }), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const rolled = await setAt(group.lean({ roll: 180 }), joined, 1);
	const grown = await setAt(group.to(LOWER_RIGHT, { scale: 2 }), joined, 1);
	const near = await setAt(group.to(LOWER_RIGHT, { depth: 1000 }), joined, 1);
	const groupBox = windowPlaced(SMALL, LOWER_RIGHT);
	const onTheFrame = wordsPlaced(SMALL, 'left');
	const frameMiddle = middleOf(boxOf(SMALL.frame));
	// Rolled half round the group's middle, the code's middle stands across it; grown twice, twice as far from it;
	// brought half way to the eye, twice as far from the frame's middle
	expect([
		joined.objects.get('code')!.box,
		drawnObjectsIn(joined, SMALL)[0]!.box,
		drawnMiddleOf(joined, 'code'),
		drawnMiddleOf(rolled, 'code'),
		drawnMiddleOf(grown, 'code'),
		drawnMiddleOf(near, 'code')
	]).toEqual([
		measuredFromCorner(onTheFrame, groupBox),
		onTheFrame,
		closeToPoint(middleOf(onTheFrame)),
		closeToPoint(scaledAbout(middleOf(groupBox), middleOf(onTheFrame), -1)),
		closeToPoint(scaledAbout(middleOf(groupBox), middleOf(onTheFrame), 2)),
		closeToPoint(scaledAbout(frameMiddle, middleOf(onTheFrame), 2))
	]);
});

test("an object in a group turned toward the eye is drawn in 3D, and one turned back against its group's turn flat", async () => {
	const grouped = await setAt(group.show(), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const turned = await setAt(group.lean({ turn: 20 }), joined, 1);
	const turnedBack = await setAt(code.lean({ turn: -20 }), turned, 1);
	expect([joined, turned, turnedBack].map((scene) => drawnObjectsIn(scene, SMALL)[0]!.transform.kind)).toEqual([
		'flat',
		'leant',
		'flat'
	]);
});

test('an object joins a group as it comes, standing in it where it stands on the frame however the group stands, leant, grown, brought near or spun: none standing, or one grown and leant at once, is refused', async () => {
	const grouped = await setAt(group.show({ as: 'stack' }), OPENING_IN_SMALL, 1);
	const joining = code.show(THREE_LINES, { at: 'left', group: 'stack' });
	const onTheFrame = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const standing = await Promise.all(
		[
			group.lean({ as: 'stack', tilt: 10, turn: 20 }),
			group.to('whole', { as: 'stack', scale: 1.5 }),
			group.to('whole', { as: 'stack', depth: 100 }),
			group.lean({ as: 'stack', tilt: 180, turn: 180, roll: 180 })
		].map((move) => setAt(move, grouped, 1))
	);
	const grown = await setAt(group.to('whole', { as: 'stack', scale: 1.5 }), grouped, 1);
	const grownAndLeant = await setAt(group.lean({ as: 'stack', tilt: 10 }), grown, 1);
	await expect(async () => joining.begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(
		new FilmError('code.show finds no group "stack" standing')
	);
	await expect(async () => joining.begin(beginningOf(grownAndLeant))).rejects.toThrow(
		new FilmError(JOINS_THE_STACK_STRETCHED)
	);
	const joined = await Promise.all(standing.map((scene) => setAt(joining, scene, 1)));
	const asOnTheFrame = codesCornersDrawnIn(onTheFrame).map(closeToPoint);
	expect(joined.map(codesCornersDrawnIn)).toEqual([asOnTheFrame, asOnTheFrame, asOnTheFrame, asOnTheFrame]);
});

/** Where the corners of the code of a scene shot in the small format are drawn on the frame. */
function codesCornersDrawnIn(scene: Scene): readonly Point[] {
	const holders = holdersIn(scene, cameraOf(scene, SMALL));
	return CORNER_SHARES.map((corner) => drawnOnTheFrame(scene.objects.get('code')!, holders, SMALL.frame, corner));
}

test('an object stands inside the window or in a group, never both, and takes a zIndex only in a group', () => {
	expect(() => code.show(THREE_LINES, { at: LOWER_RIGHT, inside: 'window', group: 'stack' })).toThrow(
		new FilmError('code.show stands an object inside the window or the world, or in a group: not both')
	);
	expect(() => code.show(THREE_LINES, { at: LOWER_RIGHT, zIndex: 2 })).toThrow(
		new FilmError('code.show orders an object by its zIndex only in a group: name its group')
	);
});

test('the objects of a group are drawn by their zIndex, the higher over the lower, and as they came where it is alike, however near or turned each stands, where the group came among the rest', async () => {
	const before = await setAt(title.show('Before', { at: 'top', as: 'before' }), OPENING_IN_SMALL, 1);
	const grouped = await setAt(group.show(), before, 1);
	const top = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group', zIndex: 2, as: 'top' }), grouped, 1);
	const bottom = await setAt(code.show(THREE_LINES, { at: 'right', group: 'group', as: 'bottom' }), top, 1);
	const middle = await setAt(code.show(THREE_LINES, { at: 'top', group: 'group', as: 'middle' }), bottom, 1);
	const after = await setAt(title.show('After', { at: 'bottom', as: 'after' }), middle, 1);
	const farther = await setAt(code.to('left', { as: 'top', depth: -200 }), after, 1);
	const leant = await setAt(group.lean({ tilt: 60, turn: 180 }), farther, 1);
	expect([drawnNamesIn(after), drawnNamesIn(leant)]).toEqual([
		['before', 'bottom', 'middle', 'top', 'after'],
		['before', 'bottom', 'middle', 'top', 'after']
	]);
});

test('the objects of a group ordered by depth are drawn the farther behind the nearer, where they came among the rest', async () => {
	const before = await setAt(title.show('Before', { at: 'top', as: 'before' }), OPENING_IN_SMALL, 1);
	const grouped = await setAt(group.show({ order: 'depth' }), before, 1);
	const front = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group', as: 'front' }), grouped, 1);
	const back = await setAt(code.show(THREE_LINES, { at: 'right', group: 'group', as: 'back' }), front, 1);
	const after = await setAt(title.show('After', { at: 'bottom', as: 'after' }), back, 1);
	const apart = await setAt(code.to('left', { as: 'front', depth: 200 }), after, 1);
	const deep = await setAt(code.to('right', { as: 'back', depth: -200 }), apart, 1);
	const turned = await setAt(group.lean({ turn: 180 }), deep, 1);
	expect([drawnNamesIn(deep), drawnNamesIn(turned)]).toEqual([
		['before', 'back', 'front', 'after'],
		['before', 'front', 'back', 'after']
	]);
	await expect(async () =>
		code.show(THREE_LINES, { at: 'top', group: 'group', zIndex: 1, as: 'raised' }).begin(beginningOf(grouped))
	).rejects.toThrow(
		new FilmError(
			'code.show names a zIndex in the group "group", which draws by depth: leave it out, or order the group by zIndex'
		)
	);
});

test('a group put away fades what stands in it with it, and at its end is gone with all of it, what stands apart staying', async () => {
	const titled = await setAt(title.show('Apart', { at: 'top', as: 'apart' }), OPENING_IN_SMALL, 1);
	const grouped = await setAt(group.show(), titled, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const going = await setAt(group.hide(), joined, 0.25);
	const gone = await setAt(group.hide(), joined, 1);
	expect([
		drawnObjectsIn(going, SMALL).map((object) => object.held),
		[...gone.objects.keys()],
		gone.groups.size
	]).toEqual([[1, 0.75], ['apart'], 0]);
});

test('a group put away takes what stands in it whatever else moves it: a move of one running on, its own hide, or a show into the group brings nothing back', async () => {
	const grouped = await setAt(group.show(), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const carrying = await code.to('right').begin(beginningOf(joined));
	const hiding = await code.hide().begin(beginningOf(joined));
	const joining = await title.show('Late', { at: 'top', group: 'group', as: 'late' }).begin(beginningOf(joined));
	const gone = await setAt(group.hide(), joined, 1);
	const afterwards = await Promise.all([carrying, hiding, joining].map((change) => change(gone, 0.5)));
	expect(afterwards.map((scene) => [...scene.objects.keys()])).toEqual([[], [], []]);
});

test("a group carried to a place stands as large as it was placed about the place's middle, carrying what stands in it as far", async () => {
	const grouped = await setAt(group.show(), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const carried = await setAt(group.to(UPPER_RIGHT_CORNER), joined, 1);
	const placed = windowPlaced(SMALL, UPPER_RIGHT_CORNER);
	const wholeFrame = boxOf(SMALL.frame);
	const shift = { left: middleX(placed) - middleX(wholeFrame), top: middleY(placed) - middleY(wholeFrame) };
	const onTheFrame = middleOf(wordsPlaced(SMALL, 'left'));
	expect([carried.groups.get('group')!.box, drawnMiddleOf(carried, 'code')]).toEqual([
		{ ...wholeFrame, left: shift.left, top: shift.top },
		closeToPoint({ left: onTheFrame.left + shift.left, top: onTheFrame.top + shift.top })
	]);
});

test('a place or a block a move of an object in a group reads stands in the group where it would stand on the frame', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const grouped = await setIn(group.show({ at: LOWER_RIGHT }), wide, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { group: 'group' }), grouped, 1, FULL_HD);
	const magnified = await setIn(lens.show('#card', { group: 'group', size: 150 }), lifted, 1, FULL_HD);
	const carried = await setIn(piece.to(UPPER_LEFT), magnified, 1, FULL_HD);
	const back = await setIn(piece.back(), carried, 1, FULL_HD);
	const moved = await setIn(lens.to('#other'), magnified, 1, FULL_HD);
	const corner = windowPlaced(FULL_HD, LOWER_RIGHT);
	// The other block's middle is 1250 across and 630 down
	expect([carried.objects.get('piece')!.box, back.objects.get('piece')!.box, moved.objects.get('lens')!.box]).toEqual([
		measuredFromCorner(windowPlaced(FULL_HD, UPPER_LEFT), corner),
		measuredFromCorner(CARD, corner),
		measuredFromCorner({ left: 1175, top: 555, width: 150, height: 150 }, corner)
	]);
});

test("a lens in a group shows the page under its middle where its group carries it, and a piece's lines run to the piece there", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const grouped = await setIn(group.show(), wide, 1, FULL_HD);
	const magnified = await setIn(lens.show('#card', { group: 'group' }), grouped, 1, FULL_HD);
	const lifted = await setIn(piece.show('#other', { group: 'group', lines: 'solid' }), magnified, 1, FULL_HD);
	const rolled = await setIn(group.lean({ roll: 180 }), lifted, 1, FULL_HD);
	const drawnScene = drawn(rolled, cameraOf(rolled, FULL_HD), 0, FULL_HD, NONE_SHARPER);
	// Rolled half round the frame's middle, 960 across and 540 down: the lens's middle from the card's, 500 and 350, to
	// 1420 and 730; the piece from 1200 to 1300 across and 600 to 660 down to 620 to 720 and 420 to 480, its lines from
	// the source's top right and bottom left corners to the piece's
	expect([drawnScene.objects[0]!.content, drawnScene.lines[0]!.segments]).toMatchObject([
		{ kind: 'lens', source: { left: 1340, top: 650, width: 160, height: 160 } },
		[
			{ from: { left: 1300, top: 600 }, length: expect.closeTo(607.29, 2), angle: expect.closeTo(-162.76, 2) },
			{ from: { left: 1200, top: 660 }, length: expect.closeTo(607.29, 2), angle: expect.closeTo(-162.76, 2) }
		]
	]);
});

test('an object in a group never slides: in from a side, out toward one, or pushed off by one sliding in', async () => {
	const grouped = await setAt(group.show(), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	expect(() => code.show(THREE_LINES, { at: 'left', group: 'group', from: 'left' })).toThrow(
		new FilmError('code.show slides nothing in from a side into a group: an object in a group comes up in its place')
	);
	await expect(async () => code.hide({ toward: 'left' }).begin(beginningOf(joined))).rejects.toThrow(
		new FilmError(
			'code.hide would slide the code out toward a side from its group: it goes in its place, or with its group'
		)
	);
	await expect(async () =>
		title.show('Over', { at: 'left', as: 'code', from: 'right' }).begin(beginningOf(joined))
	).rejects.toThrow(
		new FilmError("title.show would push the code off past the frame's edge from its group: hide it first")
	);
});

test('a group comes once in its place, one of its name standing refused, and a move of a group not standing is refused as it begins', async () => {
	const grouped = await setAt(group.show(), OPENING_IN_SMALL, 1);
	await expect(async () => group.show().begin(beginningOf(grouped))).rejects.toThrow(
		new FilmError('group.show finds the group "group" standing: a group comes once in its place; hide it first')
	);
	await expect(async () => group.lean({ as: 'ring', turn: 10 }).begin(beginningOf(grouped))).rejects.toThrow(
		new FilmError('group.lean finds no group "ring" standing')
	);
});

test('what stands in a group moves on the frame as its group carries it, so a group turning fast smears it', async () => {
	const grouped = await setAt(group.show({ at: LOWER_RIGHT }), OPENING_IN_SMALL, 1);
	const joined = await setAt(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1);
	const rolled = await setAt(group.lean({ roll: 180 }), joined, 1);
	const groupMiddle = middleOf(windowPlaced(SMALL, LOWER_RIGHT));
	// Rolled half round the group's middle, each corner goes twice as far as it stood from it
	const farthest = Math.max(
		...cornersOf(wordsPlaced(SMALL, 'left')).map((corner) => 2 * distanceBetween(corner, groupMiddle))
	);
	expect(frameShiftBetween(atTheStart(joined), atTheStart(rolled), SMALL)).toBeCloseTo(farthest);
});

test('a piece of the page in a group is pictured as sharp as its group grows it', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const grouped = await setIn(group.show(), wide, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { group: 'group' }), grouped, 1, FULL_HD);
	const grown = await setIn(group.to('whole', { scale: 2 }), lifted, 1, FULL_HD);
	expect(pictureZoomsIn(grown, cameraOf(grown, FULL_HD), FULL_HD.frame)).toEqual([2]);
});

test('a piece of the page, or a lens, shows the holes other pieces leave in its part of the screen where they stand in it, and never its own', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { hole: {} }), wide, 1, FULL_HD);
	const page = await setIn(piece.show(WHOLE_SCREEN, { as: 'page' }), lifted, 1, FULL_HD);
	const magnified = await setIn(lens.show('#card'), page, 1, FULL_HD);
	const contents = new Map(drawnObjectsIn(magnified, FULL_HD).map((object) => [object.name, object.content]));
	// The card, 400 to 600 across and 300 to 400 down, in the page at its own size; the lens shows 420 to 580 across and
	// 270 to 430 down twice as large, the card's part of it from 30 down
	expect([contents.get('page'), contents.get('piece'), contents.get('lens')]).toMatchObject([
		{ holes: [{ name: 'piece', box: CARD, ground: CARDS_GROUND, line: null, shown: 1 }] },
		{ holes: [] },
		{ holes: [{ name: 'piece', box: { left: 0, top: 60, width: 320, height: 200 }, ground: CARDS_GROUND }] }
	]);
});

test('an object stands out as far as its move has come toward the values the film names, the rest as they stood; one come up, or gone back to none, is drawn standing out in no way', async () => {
	const titled = await setAt(title.show('Lifted', { at: 'left' }), OPENING_IN_SMALL, 1);
	const halfway = await setAt(title.effects({ shadow: 1, blur: 8 }), titled, 0.5);
	const glowing = await setAt(title.effects({ glow: 1, ring: 1 }), halfway, 1);
	const settled = await setAt(title.effects({ ring: 0, glow: 0, shadow: 0, blur: 0 }), glowing, 1);
	expect([titled, halfway, glowing, settled].map((scene) => drawnObjectsIn(scene, SMALL)[0]!.effects)).toEqual([
		null,
		{ ring: 0, glow: 0, shadow: 0.5, blur: 4, colour: null },
		{ ring: 1, glow: 1, shadow: 0.5, blur: 4, colour: null },
		null
	]);
});

test("an object's ring and glow are drawn in the look's accent as it stands, none named, and go to a colour the film names from the one they were seen in: the accent's as it stood, another of the film's, or, rising from none, the colour named all the way", async () => {
	const titled = await setAt(title.show('Lifted', { at: 'left' }), OPENING_IN_SMALL, 1);
	const ringed = await setAt(title.effects({ ring: 1 }), titled, 1);
	const halfwayToBlue = await setAt(title.effects({ colour: READERS_BLUE }), ringed, 0.5);
	const blue = await setAt(title.effects({ colour: READERS_BLUE }), ringed, 1);
	const halfwayToGreen = await setAt(title.effects({ colour: GREEN }), blue, 0.5);
	const risingInBlue = await setAt(title.effects({ ring: 1, colour: READERS_BLUE }), titled, 0.5);
	const scenes = [ringed, halfwayToBlue, blue, halfwayToGreen, risingInBlue];
	expect(scenes.map((scene) => drawnObjectsIn(scene, SMALL)[0]!.effects!.colour)).toEqual([
		null,
		HALF_WAY_FROM_THE_ACCENT_TO_BLUE,
		READERS_BLUE,
		HALF_WAY_FROM_BLUE_TO_GREEN,
		READERS_BLUE
	]);
});

test('an object melts into nothing toward a side of what it shows, from as far in as the film names, a share of it: as far as its move has come, standing out in no way for it, and drawn with no melt where it melts none', async () => {
	const titled = await setAt(title.show('Lifted', { at: 'left' }), OPENING_IN_SMALL, 1);
	const halfway = await setAt(title.effects({ melt: { toward: 'right', share: 0.6 } }), titled, 0.5);
	const melted = await setAt(title.effects({ melt: { toward: 'right', share: 0.6 } }), titled, 1);
	const back = await setAt(title.effects({ melt: { toward: 'right', share: 0 } }), melted, 1);
	const drawn = [halfway, melted, back].map((scene) => drawnObjectsIn(scene, SMALL)[0]!);
	expect(drawn.map((object) => [object.melt, object.effects])).toEqual([
		[{ toward: 'right', share: 0.3 }, null],
		[{ toward: 'right', share: 0.6 }, null],
		[null, null]
	]);
});

test('a melt turned to another side while the object melts is refused as its move begins', async () => {
	const titled = await setAt(title.show('Lifted', { at: 'left' }), OPENING_IN_SMALL, 1);
	const melted = await setAt(title.effects({ melt: { toward: 'right', share: 0.6 } }), titled, 1);
	await expect(async () =>
		title.effects({ melt: { toward: 'left', share: 0.6 } }).begin(beginningOf(melted))
	).rejects.toThrow(
		new FilmError('title.effects turns the title to melt toward another side while it melts: melt it to none first')
	);
});

test('a colour alone does not make an object stand out: one with no ring, glow, shadow or blur is drawn standing out in no way', async () => {
	const titled = await setAt(title.show('Lifted', { at: 'left' }), OPENING_IN_SMALL, 1);
	const coloured = await setAt(title.effects({ colour: READERS_BLUE }), titled, 1);
	expect(drawnObjectsIn(coloured, SMALL)[0]!.effects).toBeNull();
});

test('every object that is carried and leant stands out: a title, code, the terminal, a piece of the page, an outline, a lens', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const shown = await [
		title.show('Words', { at: 'top' }),
		code.show(THREE_LINES, { at: 'left' }),
		open('A terminal', { at: 'right' }),
		piece.show('#card'),
		outline.show('#other'),
		lens.show('#block')
	].reduce(async (scene, move) => setIn(move, await scene, 1, FULL_HD), Promise.resolve(wide));
	const ringed = await [
		title.effects({ ring: 1 }),
		code.effects({ ring: 1 }),
		terminalEffects({ ring: 1 }),
		piece.effects({ ring: 1 }),
		outline.effects({ ring: 1 }),
		lens.effects({ ring: 1 })
	].reduce(async (scene, move) => setIn(move, await scene, 1, FULL_HD), Promise.resolve(shown));
	const ring = { ring: 1, glow: 0, shadow: 0, blur: 0, colour: null };
	expect(drawnObjectsIn(ringed, FULL_HD).map((object) => [object.name, object.effects])).toEqual([
		['title', ring],
		['code', ring],
		['terminal', ring],
		['piece', ring],
		['outline', ring],
		['lens', ring]
	]);
});

test('an object brought toward the eye by its effects stands in its box, as near as a carry brings it, and a carry naming no depth, to a place or to a block, leaves the depth they set, whichever is written first', async () => {
	const titled = await setAt(title.show('Near', { at: 'left' }), OPENING_IN_SMALL, 1);
	const near = await setAt(title.effects({ depth: 1000 }), titled, 1);
	const carrying = await title.to('right').begin(beginningOf(titled));
	const nearing = await title.effects({ depth: 1000 }).begin(beginningOf(titled));
	const carriedFirst = await nearing(await carrying(titled, 1), 1);
	const nearedFirst = await carrying(await nearing(titled, 1), 1);
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const glassed = await setIn(lens.show('#block'), wide, 1, FULL_HD);
	const glassCarrying = await lens.to('#card').begin(beginningIn(glassed, FULL_HD));
	const glassNearing = await lens.effects({ depth: 1000 }).begin(beginningIn(glassed, FULL_HD));
	const glassCarriedFirst = await glassNearing(await glassCarrying(glassed, 1), 1);
	const glassNearedFirst = await glassCarrying(await glassNearing(glassed, 1), 1);
	const glassAtTheCard = (await glassCarrying(glassed, 1)).objects.get('lens')!.box;
	const placed = wordsPlaced(SMALL, 'left');
	const depth = 1000 * frameScaleOf(SMALL.frame);
	// Brought half way to the eye, its middle stands twice as far from the frame's middle
	expect([
		near.objects.get('title')!.box,
		drawnMiddleOf(near, 'title'),
		...[carriedFirst, nearedFirst].map((scene) => [scene.objects.get('title')!.box, scene.objects.get('title')!.depth]),
		...[glassCarriedFirst, glassNearedFirst].map((scene) => [
			scene.objects.get('lens')!.box,
			scene.objects.get('lens')!.depth
		])
	]).toEqual([
		placed,
		closeToPoint(scaledAbout(middleOf(boxOf(SMALL.frame)), middleOf(placed), 2)),
		[wordsPlaced(SMALL, 'right'), depth],
		[wordsPlaced(SMALL, 'right'), depth],
		[glassAtTheCard, 1000],
		[glassAtTheCard, 1000]
	]);
});

test('an object grown by its effects grows about its middle in its box, as large as a carry grows it, and a carry naming no scale leaves the scale they set, whichever is written first', async () => {
	const titled = await setAt(title.show('Grown', { at: 'left' }), OPENING_IN_SMALL, 1);
	const grown = await setAt(title.effects({ scale: 2 }), titled, 1);
	const carrying = await title.to('right').begin(beginningOf(titled));
	const growing = await title.effects({ scale: 2 }).begin(beginningOf(titled));
	const carriedFirst = await growing(await carrying(titled, 1), 1);
	const grownFirst = await carrying(await growing(titled, 1), 1);
	const placed = wordsPlaced(SMALL, 'left');
	expect([
		drawnMiddleOf(grown, 'title'),
		...[grown, carriedFirst, grownFirst].map((scene) => [
			scene.objects.get('title')!.box,
			scene.objects.get('title')!.scale
		])
	]).toEqual([
		closeToPoint(middleOf(placed)),
		[placed, 2],
		[wordsPlaced(SMALL, 'right'), 2],
		[wordsPlaced(SMALL, 'right'), 2]
	]);
});

test('how strongly an object stands out, and how far the page is dimmed and faded, stay between none and whole on a curve that passes its ends, a blur between where it starts and ends, while an object comes as near as the curve takes it', async () => {
	const titled = await setAt(title.show('Bouncing', { at: 'left' }), OPENING_IN_SMALL, 1);
	const lifted = await setAt(title.effects({ shadow: 1, blur: 8, depth: 100 }), titled, PAST_ITS_END);
	const settled = await setAt(title.effects({ shadow: 0, blur: 0 }), lifted, PAST_ITS_END);
	const shaded = await setAt(windowShade({ dim: 1, fade: 1, blur: 8 }), titled, PAST_ITS_END);
	const cleared = await setAt(windowShade({ dim: 0, fade: 0, blur: 0 }), shaded, PAST_ITS_END);
	const standingOut = [lifted, settled].map((scene) => scene.objects.get('title')!);
	expect([
		standingOut.map((object) => [object.shadow, object.blur, object.depth]),
		[shaded, cleared].map((scene) => [scene.window.dim, scene.window.fade, scene.window.blur])
	]).toEqual([
		[
			[1, 8, expect.closeTo(112 * frameScaleOf(SMALL.frame))],
			[0, 0, expect.closeTo(112 * frameScaleOf(SMALL.frame))]
		],
		[
			[1, 1, 8],
			[0, 0, 0]
		]
	]);
});

test('the page is shaded as far as its move has come toward the values the film names, the rest as they stood, and stays so as the window travels; one shaded none, or only softening the part its blur leaves sharp, is drawn with no shade', async () => {
	const dimming = await setAt(windowShade({ dim: 0.6 }), OPENING_IN_SMALL, 0.5);
	const blurred = await setAt(windowShade({ blur: 8, fade: 0.5 }), dimming, 1);
	const travelled = await setAt(windowTo('right'), blurred, 1);
	const cleared = await setAt(windowShade({ dim: 0, fade: 0, blur: 0 }), travelled, 1);
	const softeningAlone = await setAt(windowShade({ sharpSoftens: 0.5 }), OPENING_IN_SMALL, 1);
	expect(
		[OPENING_IN_SMALL, dimming, blurred, travelled, cleared, softeningAlone].map(
			(scene) => drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window.shade
		)
	).toEqual([
		null,
		{ dim: 0.3, fade: 0, blur: 0 },
		{ dim: 0.3, fade: 0.5, blur: 8 },
		{ dim: 0.3, fade: 0.5, blur: 8 },
		null,
		null
	]);
});

test("the shade's blur leaves a part of the screen sharp, a block or a box, the new part from the move's start as the blur goes on through the values between, and none where the film names none", async () => {
	const box = { left: 300, top: 50, width: 120, height: 60 };
	const onTheBlock = await setAt(windowShade({ blur: 8, sharp: '#block' }), OPENING_IN_SMALL, 0.5);
	const handedOn = await setAt(windowShade({ sharp: box }), onTheBlock, 0);
	const noneKept = await setAt(windowShade({ sharp: 'none' }), handedOn, 0);
	expect([onTheBlock, handedOn, noneKept].map((scene) => [scene.window.blur, scene.window.sharp])).toEqual([
		[4, BLOCK],
		[4, box],
		[4, null]
	]);
});

test("the stage is handed the part the shade's blur leaves sharp, its edge softening over half as far as the blur; none where the page is blurred none", async () => {
	const blurred = await setAt(windowShade({ blur: 8, sharp: '#block' }), OPENING_IN_SMALL, 1);
	const unblurred = await setAt(windowShade({ blur: 0 }), blurred, 1);
	expect(
		[blurred, unblurred].map((scene) => drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window.sharp)
	).toEqual([{ box: BLOCK, edge: 4, blur: null }, null]);
});

test("the part the shade's blur leaves sharp softens toward the blur as far as the film names, a share of the way through the values between, and the stage is handed it blurred by that share of the page's blur; wholly sharp where it softens none", async () => {
	const kept = await setAt(windowShade({ blur: 8, sharp: '#block' }), OPENING_IN_SMALL, 1);
	const softening = await setAt(windowShade({ sharpSoftens: 0.75 }), kept, 0.5);
	const softened = await setAt(windowShade({ sharpSoftens: 0.75 }), kept, 1);
	const sharpAgain = await setAt(windowShade({ sharpSoftens: 0 }), softened, 1);
	expect(
		[softening, softened, sharpAgain].map((scene) => [
			scene.window.sharpSoftens,
			drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window.sharp
		])
	).toEqual([
		[0.375, { box: BLOCK, edge: 4, blur: 3 }],
		[0.75, { box: BLOCK, edge: 4, blur: 6 }],
		[0, { box: BLOCK, edge: 4, blur: null }]
	]);
});

test("a part of the page kept sharp in the shade's blur is refused where the stage draws no picture of the filmed page to draw it from", async () => {
	const framed: Beginning = { ...beginningIn(OPENING_IN_SMALL, SMALL), pageShown: 'framed' };
	await expect(async () => windowShade({ sharp: '#block' }).begin(framed)).rejects.toThrow(
		new FilmError(
			"window.shade's sharp draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'"
		)
	);
	expect(() => windowShade({ sharp: 3 as unknown as string })).toThrow(
		new FilmError(
			"window.shade's sharp is 3: it is a selector: a string that names blocks of the page, or a box of the page's screen: { left, top, width, height }, in its pixels"
		)
	);
});

test("the page's window is drawn flat and unmoved while it faces the frame, wherever it stands and a whole turn round, and in 3D where it leans", async () => {
	const inAWindow = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const leant = await setAt(lean({ tilt: 12, turn: -8 }), inAWindow, 1);
	const turnedWhole = await setAt(lean({ tilt: 360, turn: -360 }), inAWindow, 1);
	const unmoved = { m11: 1, m12: 0, m21: 0, m22: 1, m41: 0, m42: 0 };
	const unmovedButForATurnsArithmetic = {
		m11: expect.closeTo(1, 9),
		m12: expect.closeTo(0, 9),
		m21: expect.closeTo(0, 9),
		m22: expect.closeTo(1, 9),
		m41: expect.closeTo(0, 9),
		m42: expect.closeTo(0, 9)
	};
	expect(
		[OPENING_IN_SMALL, inAWindow, leant, turnedWhole].map(
			(scene) => drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window.transform
		)
	).toEqual([
		{ kind: 'flat', matrix: unmoved },
		{ kind: 'flat', matrix: unmoved },
		{ kind: 'leant', matrix: expect.anything() },
		{ kind: 'flat', matrix: unmovedButForATurnsArithmetic }
	]);
});

test('the camera taken onto a block through another frames the other on its way, where a pace by keys puts it', async () => {
	const halfWay = await setAt(onto('#block', { through: ['#card'], pace: 'keys' }), OPENING_IN_SMALL, 0.5);
	const onTheCard = await setAt(onto('#card'), OPENING_IN_SMALL, 1);
	expect(cameraOf(halfWay, SMALL).pose).toEqual(cameraOf(onTheCard, SMALL).pose);
});

test("the camera's path through keys keeps every pose on it on the screen, where the curve between them bows past its edge", async () => {
	const tall: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 3000 } };
	// At a zoom of 2 the frame sees 960 of the screen across, so a focus stays within 480 and 1440 across
	const start = { focusX: 480, focusY: 400, zoom: 2 };
	const turn = { focusX: 1440, focusY: 800, zoom: 2 };
	const end = { focusX: 1440, focusY: 1600, zoom: 2 };
	const atTheStart = await setIn(
		cameraTo(start),
		openingScene(tall, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH),
		1,
		tall
	);
	const onTheWay = await Promise.all(
		[0.2, 0.4, 0.5, 0.6, 0.8].map((progress) => setIn(cameraTo(end, { through: [turn] }), atTheStart, progress, tall))
	);
	expect(Math.max(...onTheWay.map((scene) => cameraOf(scene, tall).pose.focusX))).toBeLessThanOrEqual(1440);
});

test('a camera zooming goes by even steps of scale, the point of the page that stands still on the frame at both ends standing still all the way', async () => {
	// From the whole screen at 1 to 4 round a point of it: the page's point 1600 across and 900 down stands 640 and 360
	// from the frame's middle at both ends, a page's pixel a frame's at 1
	const nearTheCorner = { focusX: 1440, focusY: 810, zoom: 4 };
	const [aQuarterOn, halfWay] = await Promise.all(
		[0.25, 0.5].map((progress) => setIn(cameraTo(nearTheCorner), OPENING_IN_FULL_HD, progress, FULL_HD))
	);
	const poses = [aQuarterOn!, halfWay!].map((scene) => cameraOf(scene, FULL_HD).pose);
	const pointOnTheFrame = poses.flatMap((pose) => [(1600 - pose.focusX) * pose.zoom, (900 - pose.focusY) * pose.zoom]);
	expect([poses[1]!.zoom, ...pointOnTheFrame].map((number) => Math.round(number * 1000) / 1000)).toEqual([
		2, 640, 360, 640, 360
	]);
});

test('a camera zooming in the whole frame from a screen too short to fill it shows no ground past its edge once the screen fills the frame', async () => {
	// A wide screen in a square frame: whole, it stands in the frame's middle with ground above and below it; at 2.6 the
	// frame shows 415 of its pixels down, so a focus 210 down shows its top edge at the frame's top. Half way, at 1.4,
	// the screen fills the frame from top to bottom, and the frame's top shows its top edge or below it
	const squareOfAWideScreen: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };
	const nearTheTop = { focusX: 720, focusY: 210, zoom: 2.6 };
	const opening = openingScene(squareOfAWideScreen, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH);
	const halfWay = await setIn(cameraTo(nearTheTop), opening, 0.5, squareOfAWideScreen);
	const { pose } = cameraOf(halfWay, squareOfAWideScreen);
	expect(pose.focusY - 540 / pose.zoom).toBeGreaterThanOrEqual(0);
});

test("a camera's path through keys of its zoom alone goes by even steps of scale between them", async () => {
	const throughTwo = cameraTo({ ...MIDDLE_AT_TWO, zoom: 4 }, { through: [MIDDLE_AT_TWO], pace: 'keys' });
	const aQuarterOn = await setIn(throughTwo, OPENING_IN_FULL_HD, 0.25, FULL_HD);
	expect(cameraOf(aQuarterOn, FULL_HD).pose.zoom).toBeCloseTo(Math.SQRT2, 9);
});

test('code or a group carried to a place through another stands there on its way, where a pace by keys puts it', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const grouped = await setAt(group.show({ at: 'left' }), coded, 1);
	const codeHalfWay = await setAt(code.to('right', { through: ['top'], pace: 'keys' }), grouped, 0.5);
	const groupHalfWay = await setAt(group.to('right', { through: ['top'], pace: 'keys' }), grouped, 0.5);
	const codeAtTheTop = await setAt(code.to('top'), grouped, 1);
	const groupAtTheTop = await setAt(group.to('top'), grouped, 1);
	expect([codeHalfWay.objects.get('code')!.box, groupHalfWay.groups.get('group')!.box]).toEqual([
		codeAtTheTop.objects.get('code')!.box,
		groupAtTheTop.groups.get('group')!.box
	]);
});

test('words carried through a place of another size stand as large as where they go all the way, so their lines break once', async () => {
	const titled = await setAt(title.show('Here', { at: 'left' }), OPENING_IN_SMALL, 1);
	const there = (await setAt(title.to('right'), titled, 1)).objects.get('title')!.box;
	const onTheWay = await Promise.all(
		[0.25, 0.5, 0.75].map((progress) => setAt(title.to('right', { through: ['top'] }), titled, progress))
	);
	expect(
		onTheWay.map((scene) => {
			const box = scene.objects.get('title')!.box;
			return { width: box.width, height: box.height };
		})
	).toEqual([0.25, 0.5, 0.75].map(() => ({ width: there.width, height: there.height })));
});

test('a shape or a pace with no keys to go through, and keys none, are refused as the move is made', () => {
	expect(() => onto('#block', { shape: 'straight' })).toThrow(
		"camera.onto's shape and pace say how a path goes through keys: name the keys in through, or leave them out"
	);
	expect(() => title.to('right', { through: [] })).toThrow(
		"title.to's through names no key: name one or more, or leave it out"
	);
	expect(() => group.to('right', { pace: 'keys' })).toThrow(
		"group.to's shape and pace say how a path goes through keys: name the keys in through, or leave them out"
	);
});

test("an object takes any name with something in it, its moves apart from a prop's or the page's of that name", () => {
	const moves = [title.show('Here', { as: 'light' }), lightOn('#block'), code.lean({ tilt: 4, as: 'page' })];
	expect(play({ seconds: 1, moves }).moves).toEqual(moves);
	expect(() => title.show('Here', { as: '' })).toThrow(
		new FilmError(`title.show's as is "": it is a name, a string with something in it`)
	);
});

test('a move of an object that is not on the screen, or a light on lines of what shows no code, is refused as it begins', async () => {
	const titled = await setAt(title.show('Here', { at: 'left', as: 'code' }), OPENING_IN_SMALL, 1);
	await expect(async () => title.lean({ tilt: 4 }).begin(beginningOf(titled))).rejects.toThrow(
		new FilmError('title.lean finds no title on the screen')
	);
	await expect(async () => code.light(1).begin(beginningOf(titled))).rejects.toThrow(
		new FilmError('code.light finds the code showing title, not code')
	);
});

test('a title in a place reads from the left, centred where it stands above, below or over the whole, unless the film names its way', async () => {
	const alignOf = async (script: title.TitleScript) =>
		(await setAt(title.show('Here', script), OPENING_IN_SMALL, 1)).objects.get('title')!.content.align;
	expect(
		await Promise.all([
			alignOf({ at: 'left' }),
			alignOf({ at: { of: 'right', height: 0.2 } }),
			alignOf({ at: 'top' }),
			alignOf({ at: 'whole' }),
			alignOf({ at: 'top', align: 'start' })
		])
	).toEqual(['start', 'start', 'center', 'center', 'start']);
});

test('the lines lit are the one named and those through the one named, and the rest dim', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const lit = (await setAt(code.light(2, { through: 3 }), coded, 1)).objects.get('code')!;
	expect([
		lit.content.lines.map((line) => line.lit),
		drawnObject('code', lit, 0, NOTHING_AROUND).content.dimmed
	]).toEqual([[0, 1, 1], 1]);
});

test('while the light moves from one line to another, the lines not lit stay dimmed', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const first = await setAt(code.light(1), coded, 1);
	const moving = (await setAt(code.light(2), first, 0.5)).objects.get('code')!;
	expect(drawnObject('code', moving, 0, NOTHING_AROUND).content.dimmed).toBe(1);
});

test('a line lit by what it says is the one line that says it, through the one from it on that says the other; words no line from there says, or more than one says, are refused, and a line past the last before any words', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const said = (await setAt(code.light('camera.onto'), coded, 1)).objects.get('code')!.content;
	const through = (await setAt(code.light('moves', { through: '})' }), coded, 1)).objects.get('code')!.content;
	expect([said.lines.map((line) => line.lit), through.lines.map((line) => line.lit)]).toEqual([
		[0, 1, 0],
		[0, 1, 1]
	]);
	await expect(async () => code.light('light.on').begin(beginningOf(coded))).rejects.toThrow(
		new FilmError('code.light lights the line that says "light.on", but no line from line 1 on says it')
	);
	await expect(async () => code.light('camera', { through: 'play' }).begin(beginningOf(coded))).rejects.toThrow(
		new FilmError('code.light lights the line that says "play", but no line from line 2 on says it')
	);
	await expect(async () => code.light('(').begin(beginningOf(coded))).rejects.toThrow(
		new FilmError('code.light lights the line that says "(", but lines 1, 2 say it: name words one line says')
	);
	await expect(async () => code.light(9, { through: '})' }).begin(beginningOf(coded))).rejects.toThrow(
		new FilmError('code.light lights line 9, but the code shown has 3: name lines from 1 to 3')
	);
});

test('code scrolls through the lines between until the line named, by its number or what it says, stands at its top, and back; a line past the last is refused, in the words of the move', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const halfway = (await setAt(code.scrollTo(3), coded, 0.5)).objects.get('code')!;
	const scrolled = await setAt(code.scrollTo('})'), coded, 1);
	const back = (await setAt(code.scrollTo(1), scrolled, 0.5)).objects.get('code')!;
	expect([
		halfway.content.scrolled,
		drawnObject('code', halfway, 0, NOTHING_AROUND).content.scrolled,
		back.content.scrolled
	]).toEqual([1, 1, 1]);
	await expect(async () => code.scrollTo(4).begin(beginningOf(coded))).rejects.toThrow(
		new FilmError('code.scrollTo scrolls to line 4, but the code shown has 3: name lines from 1 to 3')
	);
});

test('lines lit past the last of the code, or with no code shown, are refused as the move begins', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	await expect(async () => code.light(3, { through: 4 }).begin(beginningOf(coded))).rejects.toThrow(FilmError);
	await expect(async () => code.light(1).begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(FilmError);
});

test("pins are numbered along their path, the labels before the latest quietened, each running toward the view's middle, or over a wide block", async () => {
	const first = await setAt(pin.show('#block', 'Open it'), OPENING_IN_SMALL, 1);
	const both = await setAt(pin.show('#shown-right', 'Send it'), first, 1);
	const all = await setAt(pin.show('#wide', 'Read it'), both, 1);
	const drawnOnes = drawnPins(all.pins!, cameraOf(all, SMALL), SMALL.frame).pins;
	expect(drawnOnes.map((laid) => [laid.number, laid.label, laid.quiet, laid.runs])).toEqual([
		[1, 'Open it', true, 'right'],
		[2, 'Send it', true, 'left'],
		[3, 'Read it', false, 'over']
	]);
});

test("a note's line runs from the block's edge to the words' share across from the window, level with the block", () => {
	// Face-on, a page's pixel to a frame's pixel, in a window whose middle is the frame's: the screen drawn 100 to the left
	const camera: Camera = {
		pose: { focusX: 300, focusY: 200, zoom: 1 / frameScaleOf(SMALL.frame) },
		view: windowView({ left: 100, top: 100, width: 200, height: 200 }),
		eye: eyeAtRest(FOCAL_LENGTH)
	};
	const beside = { side: 'bottom', box: wordsOn(SMALL, 'bottom'), window: camera.view.box } as const;
	const said = saidOf('Here');
	const note = { ...said, comingUp: comingUpIn('rise', said), box: BLOCK, beside, shown: 1, gone: 0 };
	const drawnOne = drawnNote(note, camera, SMALL.frame, 0);
	expect([drawnOne.from, drawnOne.to, drawnOne.angle, drawnOne.place]).toEqual([
		{ left: expect.closeTo(50, 6), top: expect.closeTo(140, 6) },
		{ left: expect.closeTo(50, 6), top: 274 },
		expect.closeTo(90, 6),
		wordsOn(SMALL, 'bottom')
	]);
});

test("a note's words stand in the words' share on the side of the frame clearest of the window, or at the place the film names, beyond the window on that side", async () => {
	// A small window high on the right: more ground lies below it than to its left
	const windowed = withProp(
		OPENING_IN_SMALL,
		'window',
		placedIn(windowView({ left: 300, top: 20, width: 80, height: 60 }))
	);
	const clearest = (await setAt(note.show('#block', 'Here'), windowed, 1)).note!;
	const named = (await setAt(note.show('#block', 'Here', { at: { of: 'left', height: 0.5 } }), windowed, 1)).note!;
	expect([clearest.beside.side, clearest.beside.box, named.beside.side, named.beside.box]).toEqual([
		'bottom',
		wordsOn(SMALL, 'bottom'),
		'left',
		wordsPlaced(SMALL, { of: 'left', height: 0.5 })
	]);
});

test('a note shown while the window moves keeps beside it on its way, and stands in its place once the window is there', async () => {
	const halfWay = await setAt(windowTo('right'), OPENING_IN_SMALL, 0.5);
	const noted = await setAt(note.show('#block', 'Here'), halfWay, 1);
	const arrived = await setAt(windowTo('right'), noted, 1);
	expect(drawnNote(arrived.note!, cameraOf(arrived, SMALL), SMALL.frame).place).toEqual(wordsOn(SMALL, 'left'));
});

test("a note's words carried beside the window move on the frame as far as its edge facing them, though the eye, stood far back, sees the window move less", async () => {
	const steppedBack = await setAt(eye.to({ at: { across: 0, down: 0, out: 6000 } }), OPENING_IN_SMALL, 1);
	const windowed = await setAt(windowTo('right'), steppedBack, 1);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 1);
	const moved = await setAt(windowTo({ left: 0.6, top: 0.1, width: 0.35, height: 0.7 }), noted, 1);
	const wordsMoved = distanceBetween(
		drawnNote(noted.note!, cameraOf(noted, SMALL), SMALL.frame).place,
		drawnNote(moved.note!, cameraOf(moved, SMALL), SMALL.frame).place
	);
	expect(frameShiftBetween(atTheStart(noted), atTheStart(moved), SMALL)).toBeCloseTo(wordsMoved);
});

test("a window move that would carry a standing note's words off the frame, or under the window, is refused as it begins", async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 1);
	await expect(async () => windowTo('left').begin(beginningOf(noted))).rejects.toThrow(
		new FilmError(
			"window.to would carry the note's words off the frame, or under the window: hide the note first, with note.hide(), or move the window where its words keep beside it"
		)
	);
	await expect(async () => windowTo('whole').begin(beginningOf(noted))).rejects.toThrow(FilmError);
});

test("while a note stands the window moves, and the note's words keep beside it, as far as its edge facing them moves", async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 1);
	const moved = await setAt(windowTo({ left: 0.6, top: 0.1, width: 0.35, height: 0.7 }), noted, 1);
	const before = windowed.window.box.to;
	const after = moved.window.box.to;
	const words = noted.note!.beside.box;
	expect(drawnNote(moved.note!, cameraOf(moved, SMALL), SMALL.frame).place).toEqual({
		...words,
		left: words.left + after.left - before.left,
		top: words.top + middleY(after) - middleY(before)
	});
});

test('a note with no window to stand beside, with its words over the window, or beside a window off the frame, is refused as it begins', async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const offTheFrame = await setAt(windowHide({ toward: 'left' }), windowed, 1);
	await expect(async () => note.show('#block', 'Here').begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(FilmError);
	await expect(async () => note.show('#block', 'Here', { at: 'whole' }).begin(beginningOf(windowed))).rejects.toThrow(
		FilmError
	);
	await expect(async () => note.show('#block', 'Here').begin(beginningOf(offTheFrame))).rejects.toThrow(FilmError);
});

test('what has nothing to start from is refused as it begins: a screen raised that is up, lowered that is down, a window hidden that is off the frame', async () => {
	const lowered = await setAt(lower(), OPENING_IN_SMALL, 1);
	const offTheFrame = await setAt(windowHide({ toward: 'left' }), OPENING_IN_SMALL, 1);
	await expect(async () => rise().begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(FilmError);
	await expect(async () => lower().begin(beginningOf(lowered))).rejects.toThrow(FilmError);
	await expect(async () => windowHide({ toward: 'left' }).begin(beginningOf(offTheFrame))).rejects.toThrow(FilmError);
});

test('the window moves to a place, lifted off the ground, and back over the whole frame, flat on it, however the whole frame is named', async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const halfWay = await setAt(windowTo('whole'), windowed, 0.5);
	const back = await setAt(windowTo('whole'), windowed, 1);
	const backAsABox = await setAt(windowTo({ of: 'whole' }), windowed, 1);
	expect([windowed, halfWay, back, backAsABox].map((scene) => cameraOf(scene, SMALL).view)).toEqual([
		windowView(windowOn(SMALL, 'right')),
		{ ...AS_PLACED, box: boxToward(windowOn(SMALL, 'right'), boxOf(SMALL.frame), 0.5), lift: 0.5 },
		wholeView(SMALL.frame),
		wholeView(SMALL.frame)
	]);
});

test("a window brought half way to the eye is drawn twice as large about its middle and twice as far from the frame's middle, the point of the screen under each point of the frame the one drawn there; over the whole frame it stays the frame itself", async () => {
	const near = await setAt(windowTo('right', { depth: 1000 }), OPENING_IN_SMALL, 1);
	const camera = cameraOf(near, SMALL);
	const box = windowOn(SMALL, 'right');
	const drawnAs = drawn(near, camera, 0, SMALL, NONE_SHARPER).window.transform;
	const point: Point = { left: 330, top: 180 };
	const wholeNear = await setAt(windowTo('whole', { depth: 1000 }), OPENING_IN_SMALL, 1);
	expect([
		drawnAs.kind,
		drawnAs.matrix.m11,
		drawnAs.matrix.m22,
		drawnAs.matrix.m41,
		drawnAs.matrix.m42,
		underTheFrame(camera, SMALL.frame, onTheFrame(camera, SMALL.frame, point)),
		cameraOf(wholeNear, SMALL).view.lift
	]).toEqual([
		'flat',
		expect.closeTo(2),
		expect.closeTo(2),
		expect.closeTo(middleX(box) - SMALL.frame.width / 2),
		expect.closeTo(middleY(box) - SMALL.frame.height / 2),
		closeToPoint(point),
		0
	]);
});

test("the window's depth goes on its move's own curve, past its end where the curve takes it past, shares a step with a lean, and is kept where a move names none: carried to a place, slid out and shown again", async () => {
	const nearing = windowTo('right', { depth: 400 });
	const leaning = lean({ tilt: 10 });
	const leantMeanwhile = await setAt(leaning, await setAt(nearing, OPENING_IN_SMALL, 0.5), 1);
	const pastItsEnd = await setAt(nearing, OPENING_IN_SMALL, PAST_ITS_END);
	const near = await setAt(nearing, OPENING_IN_SMALL, 1);
	const carriedOn = await setAt(windowTo('left'), near, 1);
	const slidOut = await setAt(windowHide({ toward: 'left' }), near, 1);
	const shownAgain = await setAt(windowShow({ at: 'right', from: 'left' }), slidOut, 1);
	const inTheFramesPixels = frameScaleOf(SMALL.frame);
	expect(() => play({ seconds: 1, moves: [nearing, leaning] })).not.toThrow();
	expect([
		leantMeanwhile.window.depth,
		leantMeanwhile.window.angle,
		pastItsEnd.window.depth,
		carriedOn.window.depth,
		slidOut.window.depth,
		shownAgain.window.depth
	]).toEqual([
		200 * inTheFramesPixels,
		{ ...FACE_ON, tilt: 10 },
		expect.closeTo(400 * PAST_ITS_END * inTheFramesPixels),
		400 * inTheFramesPixels,
		400 * inTheFramesPixels,
		400 * inTheFramesPixels
	]);
});

test('the window shown from a side slides in whole from a frame past its place, and one hidden toward a side slides out as far and stays there', async () => {
	const room = windowOn(SMALL, 'right');
	const coming = await setAt(windowShow({ at: 'right', from: 'bottom' }), OPENING_IN_SMALL, 0);
	const shown = await setAt(windowShow({ at: 'right', from: 'bottom' }), OPENING_IN_SMALL, 1);
	const gone = await setAt(windowHide({ toward: 'left' }), shown, 1);
	expect([coming, shown, gone].map((scene) => cameraOf(scene, SMALL).view)).toEqual([
		windowView(pastTheEdge(room, 'bottom', SMALL.frame, ONE_FRAME)),
		windowView(room),
		windowView(pastTheEdge(room, 'left', SMALL.frame, ONE_FRAME))
	]);
});

test('the screen rises and goes down into the ground from where it stands, over its move', async () => {
	const halfDown = withProp(OPENING_IN_SMALL, 'screen', { shown: 0.5 });
	expect([(await setAt(rise(), halfDown, 0.5)).screen, (await setAt(lower(), halfDown, 0.5)).screen]).toEqual([
		{ shown: 0.75 },
		{ shown: 0.25 }
	]);
});

test('a block the camera frames stands across the middle of whatever window stands: one moved after it, or in the same step, set before it or after', async () => {
	const framing = await onto('#block').begin(beginningOf(OPENING_IN_SMALL));
	const moving = await windowTo('right').begin(beginningOf(OPENING_IN_SMALL));
	const cameraFirst = await moving(await framing(OPENING_IN_SMALL, 1), 1);
	const windowFirst = await framing(await moving(OPENING_IN_SMALL, 1), 1);
	const blockMiddle: Point = { left: middleX(BLOCK), top: middleY(BLOCK) };
	const windowMiddle = middleX(windowOn(SMALL, 'right'));
	expect(
		[cameraFirst, windowFirst].map((scene) => onTheFrame(cameraOf(scene, SMALL), SMALL.frame, blockMiddle).left)
	).toEqual([windowMiddle, windowMiddle]);
});

test('a block the camera frames in a window running off the frame stands at the middle of the part of the window on the frame', async () => {
	const offTheFoot = await setAt(windowTo({ left: 0.25, top: 0.6, width: 0.5, height: 0.8 }), OPENING_IN_SMALL, 1);
	const framed = await setAt(onto('#block', { air: 0, zoomAtMost: 10 }), offTheFoot, 1);
	const blockMiddle: Point = { left: middleX(BLOCK), top: middleY(BLOCK) };
	expect(onTheFrame(cameraOf(framed, SMALL), SMALL.frame, blockMiddle)).toEqual({
		left: expect.closeTo(200, 6),
		top: expect.closeTo(320, 6)
	});
});

test('a block framed in a window running off the frame keeps its place in the window as the window slides away', async () => {
	const offTheFoot = await setAt(windowTo({ left: 0.25, top: 0.6, width: 0.5, height: 0.8 }), OPENING_IN_SMALL, 1);
	const framed = await setAt(onto('#block', { air: 0, zoomAtMost: 10 }), offTheFoot, 1);
	const blockMiddle: Point = { left: middleX(BLOCK), top: middleY(BLOCK) };
	const inTheWindow = (scene: Scene) => {
		const camera = cameraOf(scene, SMALL);
		const onFrame = onTheFrame(camera, SMALL.frame, blockMiddle);
		return { left: onFrame.left - camera.view.box.left, top: onFrame.top - camera.view.box.top };
	};
	const halfWay = await setAt(windowHide({ toward: 'left' }), framed, 0.5);
	expect(inTheWindow(halfWay)).toEqual(inTheWindow(framed));
});

test('a centred title travelling to a place of another size keeps its middle as it sets off', async () => {
	const titled = await setAt(title.show('Here', { at: 'top' }), OPENING_IN_SMALL, 1);
	const setOff = (await setAt(title.to('left'), titled, 0)).objects.get('title')!.box;
	expect(middleX(setOff)).toEqual(middleX(wordsPlaced(SMALL, 'top')));
});

test('a cursor pressed goes in as the press goes on, and comes back out as it is let go', async () => {
	const pointed = withProp(OPENING_IN_SMALL, 'cursor', {
		left: 10,
		top: 10,
		press: 0
	});
	const pressed = withProp(OPENING_IN_SMALL, 'cursor', {
		left: 10,
		top: 10,
		press: 1
	});
	expect([
		(await setAt(press(), pointed, 0.4)).cursor?.press,
		(await setAt(release(), pressed, 0.25)).cursor?.press
	]).toEqual([0.4, 0.75]);
});

test('a terminal opened comes up as its move goes on, and one left goes as its move goes on', async () => {
	const opened = (await setAt(open('A terminal'), OPENING_IN_SMALL, 0.25)).objects.get('terminal')!;
	const leaving = (await setAt(leave(), TYPED, 0.25)).objects.get('terminal')!;
	expect([
		drawnObject('terminal', opened, 0, NOTHING_AROUND).content.shown,
		drawnObject('terminal', leaving, 0, NOTHING_AROUND).content.shown
	]).toEqual([0.25, 0.75]);
});

test('every object, a caption and keys come up in a way the film names, and go in one: a title, code, the terminal, the card, a caption, keys', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const shows = [
		title.show('Here', { enter: 'fade' }),
		code.show('x', { at: 'left', enter: 'fade' }),
		open('claude', { enter: 'fade' }),
		ending.show(card, { enter: 'fade' })
	];
	const hides = [
		title.hide({ leave: 'fade' }),
		code.hide({ leave: 'fade' }),
		leave({ leave: 'fade' }),
		ending.hide({ leave: 'fade' })
	];
	const coming = await Promise.all(shows.map((move) => setAt(move, OPENING_IN_SMALL, 0.25)));
	const standing = await Promise.all(shows.map((move) => setAt(move, OPENING_IN_SMALL, 1)));
	const going = await Promise.all(hides.map((move, place) => setAt(move, standing[place]!, 0.25)));
	const captionShown = caption.show('Here', { enter: 'fade' });
	const keysShown = keys.show(['⌘', 'K'], { enter: 'fade' });
	const captioned = await setAt(captionShown, OPENING_IN_SMALL, 1);
	const pressed = await setAt(keysShown, OPENING_IN_SMALL, 1);
	expect([
		coming.flatMap((scene) => drawnObjectsIn(scene, SMALL).map((object) => object.onItsWay.clear)),
		going.flatMap((scene) => drawnObjectsIn(scene, SMALL).map((object) => object.onItsWay.clear)),
		drawnSceneIn(await setAt(captionShown, OPENING_IN_SMALL, 0.25), SMALL).caption!.onItsWay.clear,
		drawnSceneIn(await setAt(keysShown, OPENING_IN_SMALL, 0.25), SMALL).keys!.onItsWay.clear,
		drawnSceneIn(await setAt(caption.hide({ leave: 'fade' }), captioned, 0.25), SMALL).caption!.onItsWay.clear,
		drawnSceneIn(await setAt(keys.hide({ leave: 'fade' }), pressed, 0.25), SMALL).keys!.onItsWay.clear
	]).toEqual([[0.25, 0.25, 0.25, 0.25], [0.75, 0.75, 0.75, 0.75], 0.25, 0.25, 0.75, 0.75]);
});

test('what an object shows stands whole while it comes up or goes in a way: words come up together, and go together', async () => {
	const masked = drawnObjectsIn(
		await setAt(title.show('Two words', { enter: 'mask' }), OPENING_IN_SMALL, 0.5),
		SMALL
	)[0]!;
	const standing = await setAt(title.show('Two words'), OPENING_IN_SMALL, 1);
	const leaving = drawnObjectsIn(await setAt(title.hide({ leave: 'iris' }), standing, 0.25), SMALL)[0]!;
	expect([masked.content.words.map((word) => word.appeared), leaving.content.words.map((word) => word.gone)]).toEqual([
		[1, 1],
		[0, 0]
	]);
});

test('an object coming up in its own way is on no way, its words coming up one after another', async () => {
	const own = drawnObjectsIn(await setAt(title.show('Two words'), OPENING_IN_SMALL, 0.5), SMALL)[0]!;
	expect([own.content.words.map((word) => word.appeared), own.onItsWay]).toEqual([
		[appearedOf(0.5, 0, 2, ON_THEIR_WAY_AT_ONCE), appearedOf(0.5, 1, 2, ON_THEIR_WAY_AT_ONCE)],
		null
	]);
});

test('the ending card coming up in its own way comes up whole, its ground and its lines one sheet', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const ended = drawnObjectsIn(await setAt(ending.show(card), OPENING_IN_SMALL, 0.25), SMALL)[0]!;
	expect([ended.content.shown, ended.content.grounded]).toEqual([0.25, 1]);
});

test('a title card or the ending card coming up in a way has its ground come up twice as fast as the way, under what the way brings whole', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const titled = drawnObjectsIn(
		await setAt(title.show('Two words', { enter: 'mask' }), OPENING_IN_SMALL, 0.25),
		SMALL
	)[0]!;
	const ended = drawnObjectsIn(await setAt(ending.show(card, { enter: 'mask' }), OPENING_IN_SMALL, 0.25), SMALL)[0]!;
	expect([
		titled.content.ground,
		titled.content.words.map((word) => word.appeared),
		ended.content.grounded,
		ended.content.shown
	]).toEqual([groundOf(0.25, 0), [1, 1], groundOf(0.25, 0), 1]);
});

test('a mask comes from the foot and a wipe from the left where the film names no edge, and from the edge it names', async () => {
	const masked = drawnObjectsIn(await setAt(title.show('ab', { enter: 'mask' }), OPENING_IN_SMALL, 0.25), SMALL)[0]!;
	const wiped = drawnObjectsIn(await setAt(title.show('ab', { enter: 'wipe' }), OPENING_IN_SMALL, 0.25), SMALL)[0]!;
	const fromTheLeft = drawnObjectsIn(
		await setAt(title.show('ab', { enter: 'mask', edge: 'left' }), OPENING_IN_SMALL, 0.25),
		SMALL
	)[0]!;
	expect([masked.onItsWay.shift, wiped.onItsWay.cut, fromTheLeft.onItsWay.shift]).toEqual([
		{ across: 0, down: 0.75 },
		{ kind: 'inset', top: 0, right: 0.75, bottom: 0, left: 0 },
		{ across: -0.75, down: 0 }
	]);
});

test('an edge goes only with a mask or a wipe', () => {
	expect(() => title.show('ab', { enter: 'fade', edge: 'left' })).toThrow(
		new FilmError('title.show names an edge, which goes only with a mask or a wipe')
	);
	expect(() => keys.hide({ edge: 'left' })).toThrow(
		new FilmError('keys.hide names an edge, which goes only with a mask or a wipe')
	);
});

test('an object comes up in its place in a way or slides from a side, and goes so: never both', () => {
	expect(() => title.show('ab', { enter: 'mask', from: 'left' })).toThrow(
		new FilmError('title.show comes up in its place in a way, or slides in from a side: not both')
	);
	expect(() => title.hide({ leave: 'wipe', toward: 'left' })).toThrow(
		new FilmError('title.hide goes from its place in a way, or slides out toward a side: not both')
	);
});

test('Enter puts the typed line up into the log, and the line is empty again', async () => {
	const terminal = (await setAt(submit(), TYPED, 1)).objects.get('terminal')!.content;
	expect([terminal.lines, terminal.typed]).toEqual([[{ kind: 'asked', text: 'add a test' }], '']);
});

test('the agent thinks first, writes its lines one after another, and stops thinking once done', async () => {
	const work = works([READ, SAID], THINKING, { thinkingShare: 0.5 });
	const thinking: TerminalLine = { kind: 'thinking', text: THINKING };
	expect([
		(await setAt(work, TYPED, 0.25)).objects.get('terminal')!.content.lines,
		(await setAt(work, TYPED, 0.75)).objects.get('terminal')!.content.lines,
		(await setAt(work, TYPED, 1)).objects.get('terminal')!.content.lines
	]).toEqual([[thinking], [READ, thinking], [READ, SAID]]);
});

test('a terminal stands where the film names, a place read as the window reads it, centred over most of the frame where none is named; the card over the whole frame', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const centred = await setAt(open('claude'), OPENING_IN_SMALL, 1);
	const placed = await setAt(open('claude', { at: 'left' }), OPENING_IN_SMALL, 1);
	const carded = await setAt(ending.show(card), OPENING_IN_SMALL, 1);
	const carried = await setAt(terminalTo('right'), centred, 1);
	expect([
		centred.objects.get('terminal')!.box,
		placed.objects.get('terminal')!.box,
		carried.objects.get('terminal')!.box,
		carded.objects.get('ending')!.box
	]).toEqual([
		{ left: 28, top: 44, width: 344, height: 312 },
		windowOn(SMALL, 'left'),
		windowOn(SMALL, 'right'),
		boxOf(SMALL.frame)
	]);
	expect(open('claude', { at: 'left' }).places).toEqual([{ place: 'left', by: "terminal.open's at" }]);
	expect(open('claude').places).toEqual([]);
});

test('a terminal named is typed into, submitted and worked in by its name', async () => {
	const opened = await setAt(open('claude', { as: 'second' }), OPENING_IN_SMALL, 1);
	const typed = await setAt(typeInto(keystrokes('ls', { seed: 1 }), { as: 'second' }), opened, 1);
	const asked = await setAt(submit({ as: 'second' }), typed, 1);
	const done = await setAt(works([SAID], THINKING, { as: 'second' }), asked, 1);
	expect(done.objects.get('second')!.content.lines).toEqual([{ kind: 'asked', text: 'ls' }, SAID]);
});

test("a kind's move takes only an object of its kind, refusing one that shows another as it begins: a thing laid on the page by a piece's, the card leant, code carried, a terminal hidden", async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const carded = await setAt(ending.show(card), OPENING_IN_SMALL, 1);
	const coded = await setAt(code.show('x', { at: 'left' }), carded, 1);
	const opened = await setAt(open('claude'), coded, 1);
	const built = await setAt(thing.show('card', A_CARD_SHOWN), opened, 1);
	await expect(async () => piece.onto('#other', { as: 'thing' }).begin(beginningOf(built))).rejects.toThrow(
		new FilmError('piece.onto finds the thing showing thing, not piece')
	);
	await expect(async () => title.lean({ as: 'ending', tilt: 20 }).begin(beginningOf(built))).rejects.toThrow(
		new FilmError('title.lean finds the ending showing ending, not title')
	);
	await expect(async () => title.to('left', { as: 'code' }).begin(beginningOf(built))).rejects.toThrow(
		new FilmError('title.to finds the code showing code, not title')
	);
	await expect(async () => code.hide({ as: 'terminal' }).begin(beginningOf(built))).rejects.toThrow(
		new FilmError('code.hide finds the terminal showing terminal, not code')
	);
});

test('a caption and keys never slide and take no name: one of each stands where it comes up', () => {
	expect(() => caption.show('Words', { from: 'left' } as never)).toThrow(FilmError);
	expect(() => caption.hide({ toward: 'left' } as never)).toThrow(FilmError);
	expect(() => keys.show(['⌘', 'K'], { as: 'second' } as never)).toThrow(FilmError);
	expect(() => keys.hide({ as: 'second' } as never)).toThrow(FilmError);
});

test('something lies over the page in the window while a callout, pins or an object inside the window stands; nothing where none does, nor where an object stands on the frame or in the world', async () => {
	const pointed = await setAt(callout.show('#block', 'Here'), OPENING_IN_SMALL, 1);
	const pinned = await setAt(pin.show('#block', 'Here'), OPENING_IN_SMALL, 1);
	const inTheWindow = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'window' }), OPENING_IN_SMALL, 1);
	const onTheFrame = await setAt(code.show('x', { at: LOWER_RIGHT }), OPENING_IN_SMALL, 1);
	const inTheWorld = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'world' }), OPENING_IN_SMALL, 1);
	const scenes = [OPENING_IN_SMALL, pointed, pinned, inTheWindow, onTheFrame, inTheWorld];
	expect(scenes.map((scene) => drawnSceneIn(scene, SMALL).overThePage)).toEqual([
		false,
		true,
		true,
		true,
		false,
		false
	]);
});

test("an object inside the page's window stands, and is carried, in the window's box read as a frame of that size", async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const windowBox = windowed.window.box.to;
	const insideTheWindow: Format = { ...SMALL, frame: { width: windowBox.width, height: windowBox.height } };
	const nested = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'window' }), windowed, 1);
	const carried = await setAt(code.to(UPPER_LEFT), nested, 1);
	expect([
		nested.objects.get('code')!.inside,
		nested.objects.get('code')!.box,
		carried.objects.get('code')!.box
	]).toEqual([{ kind: 'window' }, wordsPlaced(insideTheWindow, LOWER_RIGHT), wordsPlaced(insideTheWindow, UPPER_LEFT)]);
});

test("what stands inside the page's window shows no more than the screen it shows, what it holds as far along as its own moves have it: words typed stay typed", async () => {
	const opened = await setAt(open('claude', { at: LOWER_RIGHT, inside: 'window' }), OPENING_IN_SMALL, 1);
	const typed = await setAt(
		title.show('ab', { at: UPPER_LEFT, inside: 'window', words: { typed: { seed: 1 } } }),
		opened,
		1
	);
	const [terminalDrawn, titleDrawn] = drawnObjectsIn(await setAt(lower(), typed, 0.5), SMALL);
	expect([
		terminalDrawn!.held,
		terminalDrawn!.content.shown,
		titleDrawn!.held,
		titleDrawn!.content.words.map((word) => word.letters)
	]).toEqual([0.5, 1, 0.5, [2]]);
});

test("an object inside the page's window grows and rolls in the window's plane, and leans or comes toward the eye only with it", async () => {
	const nested = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'window' }), OPENING_IN_SMALL, 1);
	const rolled = await setAt(code.lean({ roll: 15 }), nested, 1);
	const grown = (await setAt(code.to(LOWER_RIGHT, { scale: 1.5 }), rolled, 1)).objects.get('code')!;
	expect([grown.angle.roll, grown.scale]).toEqual([15, 1.5]);
	await expect(async () => code.lean({ turn: 10 }).begin(beginningOf(nested))).rejects.toThrow(
		new FilmError(
			'code.lean would tilt, turn or turn over the code alone: it stands inside the window, and leans as it does; it rolls in it'
		)
	);
	await expect(async () => code.to(LOWER_RIGHT, { depth: 50 }).begin(beginningOf(nested))).rejects.toThrow(
		new FilmError('code.to would bring the code toward the eye alone: it stands inside the window, flat on it')
	);
	await expect(async () => code.effects({ depth: 50 }).begin(beginningOf(nested))).rejects.toThrow(
		new FilmError('code.effects would bring the code toward the eye alone: it stands inside the window, flat on it')
	);
});

test("inside the page's window a place is a box in its shares, a name of the frame's refused as the move is written and as it begins", async () => {
	const nested = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'window' }), OPENING_IN_SMALL, 1);
	expect(() => code.show('x', { at: 'left', inside: 'window' })).toThrow(
		new FilmError("code.show's at inside the window is a box in the window's shares, { left, top, width, height }")
	);
	await expect(async () => code.to({ of: 'left', height: 0.5 }).begin(beginningOf(nested))).rejects.toThrow(
		new FilmError("code.to's place inside the window is a box in the window's shares, { left, top, width, height }")
	);
});

test("a caption stands where its format puts it, at the frame's foot where it names no place", async () => {
	const showing = caption.show('Words');
	expect([
		(await setIn(showing, OPENING_IN_SMALL, 1, SMALL)).caption!.at,
		(await setIn(showing, OPENING_IN_SMALL, 1, CAPTIONS_AT_THE_TOP)).caption!.at
	]).toEqual(['bottom', 'top']);
});

test("keys rise clear of a caption at the frame's foot as its ground comes up, and stand at the foot with it at the top, or none", async () => {
	const pressed = keys.show(['⌘', 'K']);
	// A caption a quarter of the way up: its ground, coming up twice as fast as its words, half of the way
	const atTheFoot = await setIn(caption.show('Words'), OPENING_IN_SMALL, 0.25, SMALL);
	const atTheTop = await setIn(caption.show('Words'), OPENING_IN_SMALL, 0.25, CAPTIONS_AT_THE_TOP);
	expect([
		drawnSceneIn(await setIn(pressed, atTheFoot, 1, SMALL), SMALL).keys!.clearing,
		drawnSceneIn(await setIn(pressed, atTheTop, 1, CAPTIONS_AT_THE_TOP), CAPTIONS_AT_THE_TOP).keys!.clearing,
		drawnSceneIn(await setAt(pressed, OPENING_IN_SMALL, 1), SMALL).keys!.clearing
	]).toEqual([0.5, 0, 0]);
});

test("keys shown while a caption stands at the frame's foot are drawn over its words, on the frame with it at the top, or none", async () => {
	const pressed = keys.show(['⌘', 'K']);
	const atTheFoot = await setIn(caption.show('Words'), OPENING_IN_SMALL, 1, SMALL);
	const atTheTop = await setIn(caption.show('Words'), OPENING_IN_SMALL, 1, CAPTIONS_AT_THE_TOP);
	expect([
		drawnSceneIn(await setIn(pressed, atTheFoot, 1, SMALL), SMALL).keys!.overTheCaption,
		drawnSceneIn(await setIn(pressed, atTheTop, 1, CAPTIONS_AT_THE_TOP), CAPTIONS_AT_THE_TOP).keys!.overTheCaption,
		drawnSceneIn(await setAt(pressed, OPENING_IN_SMALL, 1), SMALL).keys!.overTheCaption
	]).toEqual([true, false, false]);
});

test('words, code and a caption come up in place at an even pace, the terminal, the card and keys on their step’s curve, unless the film names one', () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	expect([
		title.show('Here').timing.ease,
		code.show('x', { at: 'left' }).timing.ease,
		caption.show('Here').timing.ease,
		open('claude').timing.ease,
		ending.show(card).timing.ease,
		keys.show(['⌘', 'K']).timing.ease,
		open('claude', { ease: linear }).timing.ease
	]).toEqual([linear, linear, linear, null, null, null, linear]);
});

test("a title's or a caption's words go in place at an even pace, and whole in a way or sliding on their step's curve, unless the film names one", () => {
	expect([
		title.hide().timing.ease,
		caption.hide().timing.ease,
		title.hide({ leave: 'fade' }).timing.ease,
		title.hide({ toward: 'left' }).timing.ease,
		caption.hide({ leave: 'fade' }).timing.ease,
		title.hide({ ease: easeOutCubic }).timing.ease
	]).toEqual([linear, linear, null, null, null, easeOutCubic]);
});

/** How a move refuses the block below the screen. */
function offBelow(move: string): FilmError {
	return new FilmError(
		`${move}'s #below stands off the page's screen, at left 100, top 900 of a screen 600 × 400: ${SCROLLED_IN}`
	);
}

test('every move that goes to a block refuses one standing off the screen as it begins, saying how to bring it in', async () => {
	const opening = beginningOf(OPENING_IN_SMALL);
	await expect(onto('#below').begin(opening)).rejects.toThrow(offBelow('camera.onto'));
	await expect(lightOn('#below').begin(opening)).rejects.toThrow(offBelow('light.on'));
	await expect(lightTo('#below').begin(beginningOf(withProp(OPENING_IN_SMALL, 'light', LIT)))).rejects.toThrow(
		offBelow('light.to')
	);
	await expect(cursorTo('#below').begin(opening)).rejects.toThrow(offBelow('cursor.to'));
});

test('a block off the screen is told by its side: scrolled in above, sideways brought in by an act; one half on it is framed', async () => {
	const opening = beginningOf(OPENING_IN_SMALL);
	await expect(onto('#above').begin(opening)).rejects.toThrow(
		new FilmError(
			`camera.onto's #above stands off the page's screen, at left 100, top -3097 of a screen 600 × 400: ${SCROLLED_IN}`
		)
	);
	await expect(onto('#right').begin(opening)).rejects.toThrow(
		new FilmError(
			`camera.onto's #right stands off the page's screen, at left 1208, top 100 of a screen 600 × 400: ${ACTED_IN}`
		)
	);
	await expect(onto('#left').begin(opening)).rejects.toThrow(
		new FilmError(
			`camera.onto's #left stands off the page's screen, at left -200, top 100 of a screen 600 × 400: ${ACTED_IN}`
		)
	);
	await expect(onto('#half-on').begin(opening)).resolves.toBeTypeOf('function');
});

test('a move to a block the page lays out at no size is refused as it begins, as nothing of it shows', async () => {
	await expect(onto('#hidden').begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(
		new FilmError("camera.onto's #hidden has no size on the page: it is hidden, or holds others alone")
	);
});

test('a cursor not yet on the screen comes in from below and to the right of where it goes', async () => {
	const start = (await setAt(cursorTo('#block'), OPENING_IN_SMALL, 0)).cursor;
	const end = (await setAt(cursorTo('#block'), OPENING_IN_SMALL, 1)).cursor;
	expect([start!.left > end!.left, start!.top > end!.top]).toEqual([true, true]);
});

test('a cursor comes to rest on what the screen shows of a block reaching off it, past any of its sides', async () => {
	const targets = ['#reaching-above', '#reaching-below', '#reaching-left', '#reaching-right'];
	const rests = await Promise.all(
		targets.map(async (target) => (await setAt(cursorTo(target), OPENING_IN_SMALL, 1)).cursor)
	);
	expect(rests).toEqual([
		{ left: 155, top: 120, press: 0 },
		{ left: 155, top: 360, press: 0 },
		{ left: 60, top: 124, press: 0 },
		{ left: 591, top: 124, press: 0 }
	]);
});

/** Where the camera ends, onto a block from the opening scene. */
async function cameraOnto(target: string): Promise<Camera> {
	return cameraOf(await setAt(onto(target), OPENING_IN_SMALL, 1), SMALL);
}

test('a box of the screen stands for a block a page names by no selector: the camera frames it, the light lights it, the cursor rests on it, a pin, a callout and a note go to it, as on the block a selector names there, and one off the screen is refused alike', async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const byBox = [
		cameraOf(await setAt(onto(BLOCK), OPENING_IN_SMALL, 1), SMALL),
		(await setAt(lightOn(BLOCK), OPENING_IN_SMALL, 1)).light,
		(await setAt(cursorTo(BLOCK), OPENING_IN_SMALL, 1)).cursor,
		(await setAt(pin.show(BLOCK, 'Here'), OPENING_IN_SMALL, 1)).pins,
		(await setAt(callout.show(BLOCK, 'Here'), OPENING_IN_SMALL, 1)).callout,
		(await setAt(note.show(BLOCK, 'Here'), windowed, 1)).note
	];
	const bySelector = [
		cameraOf(await setAt(onto('#block'), OPENING_IN_SMALL, 1), SMALL),
		(await setAt(lightOn('#block'), OPENING_IN_SMALL, 1)).light,
		(await setAt(cursorTo('#block'), OPENING_IN_SMALL, 1)).cursor,
		(await setAt(pin.show('#block', 'Here'), OPENING_IN_SMALL, 1)).pins,
		(await setAt(callout.show('#block', 'Here'), OPENING_IN_SMALL, 1)).callout,
		(await setAt(note.show('#block', 'Here'), windowed, 1)).note
	];
	expect(byBox).toEqual(bySelector);
	await expect(onto(BELOW).begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(
		new FilmError(
			`camera.onto's box {"left":100,"top":900.4,"width":100,"height":40} stands off the page's screen, at left 100, top 900 of a screen 600 × 400: give a box that stands on it, in the screen's pixels`
		)
	);
	await expect(lightOn(HIDDEN).begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(
		new FilmError(`light.on's box {"left":0,"top":0,"width":0,"height":0} has no size: give it a width or a height`)
	);
	expect(() => onto(BLOCK, { every: 2 })).toThrow(
		new FilmError("camera.onto's every counts the blocks a selector matches: a box is one, so leave it out")
	);
});

test('a camera onto a block reaching off the screen frames what the screen shows of it, past any of its sides', async () => {
	const reaching = ['#reaching-above', '#reaching-below', '#reaching-left', '#reaching-right'];
	const shown = ['#shown-above', '#shown-below', '#shown-left', '#shown-right'];
	expect(await Promise.all(reaching.map(cameraOnto))).toEqual(await Promise.all(shown.map(cameraOnto)));
});

test('a block is framed in a leant window as in a face-on one, the window leant and the screen filling it', async () => {
	const windowed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const faceOn = cameraOf(await setAt(onto('#half-on'), windowed, 1), SMALL);
	const leant = await setAt(lean({ tilt: 6, turn: -16 }), windowed, 1);
	const angled = cameraOf(await setAt(onto('#half-on'), leant, 1), SMALL);
	expect(angled).toEqual({ ...faceOn, view: { ...faceOn.view, angle: { ...FACE_ON, tilt: 6, turn: -16 } } });
});

test("a block is framed on a page leant over the whole frame as on a face-on one, kept off the screen's edge", async () => {
	const faceOn = cameraOf(await setAt(onto('#block'), OPENING_IN_SMALL, 1), SMALL);
	const leant = await setAt(lean({ turn: -16 }), OPENING_IN_SMALL, 1);
	expect(cameraOf(await setAt(onto('#block'), leant, 1), SMALL).pose).toEqual(faceOn.pose);
});

test('the window leans by a move of its own while another carries it, each its own way along, and a side of the angle left out stays', async () => {
	const leaning = await setAt(lean({ tilt: 10 }), OPENING_IN_SMALL, 1);
	const halfLeant = await setAt(lean({ turn: -20 }), leaning, 0.5);
	const carried = await setAt(windowTo('right'), halfLeant, 1);
	const halfCarried = await setAt(windowTo('right'), OPENING_IN_SMALL, 0.5);
	const leantAfter = await setAt(lean({ tilt: 6 }), halfCarried, 1);
	expect([cameraOf(carried, SMALL).view, cameraOf(leantAfter, SMALL).view]).toEqual([
		{ ...windowView(windowOn(SMALL, 'right')), angle: { ...FACE_ON, tilt: 10, turn: -10 } },
		{
			...AS_PLACED,
			box: boxToward(boxOf(SMALL.frame), windowOn(SMALL, 'right'), 0.5),
			lift: 0.5,
			angle: { ...FACE_ON, tilt: 6 }
		}
	]);
});

test("a face-on camera onto a block at the screen's foot stops short of showing the edge", async () => {
	const camera = cameraOf(await setAt(onto('#half-on', { air: 0, zoomAtMost: 4 }), OPENING_IN_SMALL, 1), SMALL);
	const frameFootMiddle: Point = { left: SMALL.frame.width / 2, top: SMALL.frame.height };
	expect(underTheFrame(camera, SMALL.frame, frameFootMiddle)!.top).toBeLessThanOrEqual(SMALL.screen.height);
});

// An eye stood to the right, a little high and nearer the frame, looking at a spot 108 pixels of a frame 1080 high left
// of the frame's middle: on the small frame 40 of its pixels, a tenth of its width; and a box of the frame around it
const EYE_ASIDE: EyePlace = { at: { across: 900, down: -200, out: 1400 }, aim: { across: -108, down: 0, out: 0 } };
const AROUND_THE_AIM = { left: 0.3, top: 0.4, width: 0.2, height: 0.2 };
const AIM_AT_REST: Point = { left: 160, top: 200 };
const FRAMES_MIDDLE: Point = { left: 200, top: 200 };
// As far above the frame's middle as the aim at rest stands left of it
const ABOVE_THE_MIDDLE: Point = { left: 200, top: 160 };
// What a move of the eye that would lose its across, or flip over, is refused with
const EYE_REFUSAL = new FilmError(
	'eye.to sends the eye to look at where it stands, or within 5° of along its up, as over the top of what it looks at, where the picture would spin round: move its aim aside, or turn its up with it'
);
// The way into the frame, out of the watcher's sight; and the way to the frame's left
const INTO_THE_FRAME = { across: 0, down: 0, out: -1 };
const LEFTWARD = { across: -1, down: 0, out: 0 };

test("the eye sees the spot it aims at in the frame's middle, a title in the world there standing there; a title on the frame rides with the eye where it stood", async () => {
	const riding = await setAt(title.show('Words', { at: AROUND_THE_AIM, as: 'riding' }), OPENING_IN_SMALL, 1);
	const both = await setAt(title.show('Words', { at: AROUND_THE_AIM, as: 'staying', inside: 'world' }), riding, 1);
	const aside = await setAt(eye.to(EYE_ASIDE), both, 1);
	expect(
		[drawnMiddleOf(both, 'staying'), drawnMiddleOf(aside, 'staying'), drawnMiddleOf(aside, 'riding')].map(roundedPoint)
	).toEqual([AIM_AT_REST, FRAMES_MIDDLE, AIM_AT_REST]);
});

test('the eye keeps where it stands, what it looks at, or the way its top points, where a move leaves it out; its up as long as one', async () => {
	const aside = await setAt(eye.to(EYE_ASIDE), OPENING_IN_SMALL, 1);
	const lookingUp = { across: 0, down: -300, out: 0 };
	const steppedBack = { across: 0, down: 0, out: 2600 };
	const atRest = eyeAtRest(FOCAL_LENGTH);
	expect([
		(await setAt(eye.to({ aim: lookingUp }), aside, 1)).eye,
		(await setAt(eye.to({ at: steppedBack }), aside, 1)).eye,
		(await setAt(eye.to({ up: { across: -5, down: 0, out: 0 } }), aside, 1)).eye
	]).toEqual([
		{ ...atRest, at: EYE_ASIDE.at, aim: lookingUp },
		{ ...atRest, at: steppedBack, aim: EYE_ASIDE.aim },
		{ ...atRest, at: EYE_ASIDE.at, aim: EYE_ASIDE.aim, up: LEFTWARD }
	]);
});

test('an eye sent to look at where it stands, straight down with its top up the frame, or along its up, is refused as its move begins; an up of no way, as it is made', async () => {
	await expect(setAt(eye.to({ aim: { across: 0, down: 0, out: 2000 } }), OPENING_IN_SMALL, 1)).rejects.toThrow(
		EYE_REFUSAL
	);
	await expect(setAt(eye.to({ at: { across: 0, down: -900, out: 0 } }), OPENING_IN_SMALL, 1)).rejects.toThrow(
		EYE_REFUSAL
	);
	await expect(setAt(eye.to({ up: { across: 0, down: 0, out: 1 } }), OPENING_IN_SMALL, 1)).rejects.toThrow(EYE_REFUSAL);
	expect(() => eye.to({ up: { across: 0, down: 0, out: 0 } })).toThrow(
		new FilmError(
			`eye.to's place's up is {"across":0,"down":0,"out":0}: it is a direction: { across, down, out }, not all 0`
		)
	);
});

test('an eye sent back to rest stands where it rests for its focal length, exactly', async () => {
	const aside = await setAt(
		eye.to(EYE_ASIDE),
		openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, TWICE_THE_FOCAL_LENGTH),
		1
	);
	const back = await setAt(eye.to('rest'), aside, 1);
	expect(back.eye).toEqual(eyeAtRest(TWICE_THE_FOCAL_LENGTH));
});

test('an eye rolled a quarter round has rolled half of it half way, its up turning evenly', async () => {
	const rolling = await eye.to({ up: LEFTWARD }).begin(beginningOf(OPENING_IN_SMALL));
	const halfWay = (await rolling(OPENING_IN_SMALL, 0.5)).eye.up;
	expect([halfWay.across, halfWay.down, halfWay.out]).toEqual([
		expect.closeTo(-Math.SQRT1_2),
		expect.closeTo(-Math.SQRT1_2),
		expect.closeTo(0)
	]);
});

test("an eye's up turned half round from one place to the next is refused as its move begins, as which way it rolls is not said", async () => {
	await expect(setAt(eye.to({ up: { across: 0, down: 1, out: 0 } }), OPENING_IN_SMALL, 1)).rejects.toThrow(
		new FilmError(
			"eye.to turns the eye's up half round, or nearly, from one place to the next, where which way it rolls is not said: turn it through a place between"
		)
	);
});

test("an eye whose top points into the frame is let look straight down along it, a title on the frame's plane left of the frame's middle seen left of it still", async () => {
	const shown = await setAt(title.show('Words', { at: AROUND_THE_AIM, inside: 'world' }), OPENING_IN_SMALL, 1);
	const lookingDown = await setAt(eye.to({ at: { across: 0, down: -2000, out: 0 }, up: INTO_THE_FRAME }), shown, 1);
	expect(roundedPoint(drawnMiddleOf(lookingDown, 'title'))).toEqual(AIM_AT_REST);
});

test("an eye rolled by its up sees the world rolled: its top pointing left, a title left of the frame's middle drawn above it", async () => {
	const shown = await setAt(title.show('Words', { at: AROUND_THE_AIM, inside: 'world' }), OPENING_IN_SMALL, 1);
	const rolled = await setAt(eye.to({ up: LEFTWARD }), shown, 1);
	expect(roundedPoint(drawnMiddleOf(rolled, 'title'))).toEqual(ABOVE_THE_MIDDLE);
});

test('an eye circling half way round what it looks at, its across turning with it, is let', async () => {
	const behind = { across: 0, down: 0, out: -2000 };
	const circled = await setAt(
		eye.to({ at: behind }, { through: [{ at: { across: 2000, down: 0, out: 0 } }] }),
		OPENING_IN_SMALL,
		1
	);
	expect(circled.eye.at).toEqual(behind);
});

// A spot over the block, and how high over it: the eye at rest stands 2000 over the frame, so this is nearer
const OVER_THE_BLOCK = { over: '#block', height: 800 };
const BLOCKS_MIDDLE: Point = { left: BLOCK.left + BLOCK.width / 2, top: BLOCK.top + BLOCK.height / 2 };
const CARDS_MIDDLE: Point = { left: CARD.left + CARD.width / 2, top: CARD.top + CARD.height / 2 };

/** Where a point of the page is drawn on the small frame of a scene, by its own camera, rounded. */
function pagePointDrawn(scene: Scene, point: Point): Point {
	return roundedPoint(onTheFrame(cameraOf(scene, SMALL), SMALL.frame, point));
}

test('an eye flown over a block, looking straight down as it set off, ends with the block in the middle of the frame, riding the window', async () => {
	const flown = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	expect([flown.eye.inside, pagePointDrawn(flown, BLOCKS_MIDDLE)]).toEqual(['window', FRAMES_MIDDLE]);
});

test('an eye flown over the window rides it: the window leant in the same step, set first or after, carries it, the block still in the middle of the frame', async () => {
	const flying = await eye.fly([{ to: OVER_THE_BLOCK }]).begin(beginningOf(OPENING_IN_SMALL));
	const leaning = await lean({ tilt: 30, turn: -20 }).begin(beginningOf(OPENING_IN_SMALL));
	const flownFirst = await leaning(await flying(OPENING_IN_SMALL, 1), 1);
	const leantFirst = await flying(await leaning(OPENING_IN_SMALL, 1), 1);
	expect([pagePointDrawn(flownFirst, BLOCKS_MIDDLE), pagePointDrawn(leantFirst, BLOCKS_MIDDLE)]).toEqual([
		FRAMES_MIDDLE,
		FRAMES_MIDDLE
	]);
});

test('an eye flown over the window rides it as the window is brought toward the eye, a point of the page drawn where it was', async () => {
	const flown = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	const near = await setAt(windowTo('whole', { depth: 500 }), flown, 1);
	const blocksCorner: Point = { left: BLOCK.left, top: BLOCK.top };
	expect(pagePointDrawn(near, blocksCorner)).toEqual(pagePointDrawn(flown, blocksCorner));
});

test("an eye flown turning toward a block and lifting its sight to hold it three quarters down the frame draws it there, on the frame's middle line, and holds it there flying on ahead", async () => {
	const flying = await eye
		.fly([{ to: OVER_THE_BLOCK }, { ahead: 0.5 }], {
			heading: [{ by: 0, toward: '#card' }],
			tip: [{ by: 0, holding: '#card', at: 0.75 }]
		})
		.begin(beginningOf(OPENING_IN_SMALL));
	const overTheBlock = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	const legsEnd = 1 / 1.5;
	const atTheKey = await flying(OPENING_IN_SMALL, legsEnd);
	const flownOn = await flying(OPENING_IN_SMALL, 1);
	expect([
		overTheBlock.eye.at.across,
		pagePointDrawn(atTheKey, CARDS_MIDDLE),
		pagePointDrawn(flownOn, CARDS_MIDDLE)
	]).toEqual([expect.closeTo(atTheKey.eye.at.across), { left: 200, top: 300 }, { left: 200, top: 300 }]);
});

test('an eye rolled as a flight sets off flies on from it as it stood, the page drawn where it was, and its roll eases away by the end of the leg', async () => {
	const aslantAndRolled = { at: { across: 0, down: 1500, out: 1500 }, up: { across: -1, down: -0.5, out: 0.5 } };
	const rolled = await setAt(eye.to(aslantAndRolled), OPENING_IN_SMALL, 1);
	const flying = await eye.fly([{ to: OVER_THE_BLOCK }], { tip: [{ by: 0, degrees: -60 }] }).begin(beginningOf(rolled));
	const settingOff = await flying(rolled, 0);
	const arrived = cameraOf(await flying(rolled, 1), SMALL).eye;
	// Unrolled, its top stands in the upright plane its sight does: square to the way across that plane
	const sight = { across: arrived.aim.across - arrived.at.across, down: arrived.aim.down - arrived.at.down };
	const acrossThePlane = { across: -sight.down, down: sight.across };
	expect([
		pagePointDrawn(settingOff, CARDS_MIDDLE),
		arrived.up.across * acrossThePlane.across + arrived.up.down * acrossThePlane.down
	]).toEqual([pagePointDrawn(rolled, CARDS_MIDDLE), expect.closeTo(0)]);
});

test('an eye flown on a curve that passes its end, as one that bounces, goes on past its way and back, never stopping there', async () => {
	const flying = await eye.fly([{ to: OVER_THE_BLOCK }]).begin(beginningOf(OPENING_IN_SMALL));
	const [atTheEnd, past] = [(await flying(OPENING_IN_SMALL, 1)).eye.at, (await flying(OPENING_IN_SMALL, 1.1)).eye.at];
	expect(past.out).toBeLessThan(atTheEnd.out);
});

test('an eye flown on a bend arrives heading as the film names it, and goes on ahead as far again, passing over the block half way', async () => {
	const flying = await eye
		.fly([{ to: OVER_THE_BLOCK, arriving: 90, bend: 0.5 }, { ahead: 1 }])
		.begin(beginningOf(OPENING_IN_SMALL));
	const overTheBlock = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	const [nearTheEnd, atTheEnd] = [(await flying(OPENING_IN_SMALL, 0.99)).eye, (await flying(OPENING_IN_SMALL, 1)).eye];
	const legLength = Math.hypot(
		overTheBlock.eye.at.across - OPENING_IN_SMALL.eye.at.across,
		overTheBlock.eye.at.down - OPENING_IN_SMALL.eye.at.down,
		overTheBlock.eye.at.out - OPENING_IN_SMALL.eye.at.out
	);
	expect([
		Math.sign(atTheEnd.at.across - nearTheEnd.at.across),
		atTheEnd.at.down - nearTheEnd.at.down,
		atTheEnd.at.out - nearTheEnd.at.out
	]).toEqual([1, expect.closeTo(0), expect.closeTo(0)]);
	expect(atTheEnd.at.across - overTheBlock.eye.at.across).toBeGreaterThan(legLength);
});

test("an eye flown along a film's own curve sets off along it from where it stands, half its length flown half way", async () => {
	// A curve 300 across, wherever the film drew it, its own parameter bunched at its start: 300 × t³ across
	const bunched = new CubicBezierCurve3(
		new Vector3(1000, 500, 7),
		new Vector3(1000, 500, 7),
		new Vector3(1000, 500, 7),
		new Vector3(1300, 500, 7)
	);
	const flying = await eye.fly([{ along: bunched }]).begin(beginningOf(OPENING_IN_SMALL));
	const [halfWay, atTheEnd] = [
		(await flying(OPENING_IN_SMALL, 0.5)).eye.at,
		(await flying(OPENING_IN_SMALL, 1)).eye.at
	];
	expect([halfWay.across, halfWay.down, halfWay.out, atTheEnd.across]).toEqual([
		expect.closeTo(150, 0),
		expect.closeTo(0),
		expect.closeTo(FOCAL_LENGTH),
		expect.closeTo(300)
	]);
});

test("an eye flown on legs that take their time apart stands over the first leg's spot as that leg's share of the move ends, the move's progress its time unbent", async () => {
	const timed = eye.fly([
		{ to: OVER_THE_BLOCK, takes: 1 },
		{ ahead: 0.5, takes: 3 }
	]);
	const flying = await timed.begin(beginningOf(OPENING_IN_SMALL));
	const overTheBlock = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	const firstLegEnds = (await flying(OPENING_IN_SMALL, 0.25)).eye.at;
	expect([firstLegEnds.across, firstLegEnds.down, firstLegEnds.out, timed.timing.ease]).toEqual([
		expect.closeTo(overTheBlock.eye.at.across),
		expect.closeTo(overTheBlock.eye.at.down),
		expect.closeTo(overTheBlock.eye.at.out),
		linear
	]);
});

test('a flight on legs timed apart turns its gaze by its time: half way in time to a key by its last leg, its heading has turned half way, though the eye has flown nine tenths of its way', async () => {
	const flying = await eye
		.fly(
			[
				{ to: OVER_THE_BLOCK, takes: 1 },
				{ ahead: 0.1, takes: 1 }
			],
			{ heading: [{ by: 1, degrees: 90 }] }
		)
		.begin(beginningOf(OPENING_IN_SMALL));
	expect(gazeOf((await flying(OPENING_IN_SMALL, 0.5)).eye).heading).toBeCloseTo(45);
});

test("a gaze key between two legs' ends is reached that share of the later leg's time past the first: by 0.5, its heading has turned half way at three eighths of the move and wholly at three quarters", async () => {
	const flying = await eye
		.fly(
			[
				{ to: OVER_THE_BLOCK, takes: 1 },
				{ to: { over: '#card', height: 800 }, takes: 1 }
			],
			{ heading: [{ by: 0.5, degrees: 90 }] }
		)
		.begin(beginningOf(OPENING_IN_SMALL));
	expect([
		gazeOf((await flying(OPENING_IN_SMALL, 0.375)).eye).heading,
		gazeOf((await flying(OPENING_IN_SMALL, 0.75)).eye).heading
	]).toEqual([expect.closeTo(45), expect.closeTo(90)]);
});

test('a flight on legs timed apart refused as it is made: a leg taking no time, a leg naming none beside one that does, a curve of its own', () => {
	expect(() => eye.fly([{ to: OVER_THE_BLOCK, takes: 0 }])).toThrow(
		new FilmError("eye.fly's way[0]'s takes is 0: it is how long the leg takes beside the others, more than 0")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK, takes: 2 }, { ahead: 1 }])).toThrow(
		new FilmError("eye.fly's leg 1 names no time it takes, beside legs that do: name takes for every leg, or for none")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK, takes: 2 }], { ease: linear })).toThrow(
		new FilmError(
			"eye.fly's legs name how long each takes, which paces the flight from rest to rest: leave its ease out"
		)
	);
});

test('a flight refused as it is made: a way of no leg, a leg in no form of one, a tip past straight down, a key by a leg past the way or no farther than the key before', () => {
	expect(() => eye.fly([])).toThrow(new FilmError("eye.fly's way has no leg: name one or more"));
	expect(() => eye.fly([{ to: { over: '#block', height: 0 } }])).toThrow(
		new FilmError("eye.fly's way[0]'s to's height is 0: it is a number of pixels, more than 0")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK }, { ahead: 0 }])).toThrow(
		new FilmError("eye.fly's way[1]'s ahead is 0: it is how many times as long as the leg before, more than 0")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK, bend: 0.5 } as never])).toThrow(
		new FilmError("eye.fly's way[0]'s arriving is undefined: it is a number")
	);
	expect(() => eye.fly([{ along: [0, 300] as never }])).toThrow(
		new FilmError(
			"eye.fly's way[0]'s along is [0,300]: it is a figure, a curve of three.js whose points are x across, y down and z out in pixels of a frame 1080 high"
		)
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK }], { tip: [{ by: 0, degrees: -100 }] })).toThrow(
		new FilmError(
			"eye.fly's tip[0]'s degrees is -100: it is degrees from -90, looking straight down onto the page, to 90"
		)
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK }], { heading: [{ by: 1, degrees: 90 }] })).toThrow(
		new FilmError("eye.fly's heading key 0 is reached by leg 1, and the way's legs go from 0 to 0")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK }, { ahead: 1 }], { heading: [{ by: 1.5, degrees: 90 }] })).toThrow(
		new FilmError("eye.fly's heading key 0 is reached by leg 1.5, and the way's legs go from 0 to 1")
	);
	expect(() => eye.fly([{ to: OVER_THE_BLOCK }], { heading: [{ by: -0.5, degrees: 90 }] })).toThrow(
		new FilmError(
			"eye.fly's heading[0]'s by is -0.5: it is a leg's end by its number, 0 for the first, or past one by a share of the next leg, 1.5 half way through leg 2"
		)
	);
	expect(() =>
		eye.fly([{ to: OVER_THE_BLOCK }, { ahead: 1 }], {
			tip: [
				{ by: 1, degrees: 0 },
				{ by: 1, degrees: 10 }
			]
		})
	).toThrow(
		new FilmError(
			"eye.fly's tip key 1 is reached by leg 1, no farther than the key before it: name each by a later leg"
		)
	);
});

test('a flight refused as it begins: a leg ahead with none before it, a leg to where the eye stands, a heading toward the block the eye stands right over', async () => {
	await expect(
		setAt(eye.fly([{ to: OVER_THE_BLOCK }], { heading: [{ by: 0, toward: '#block' }] }), OPENING_IN_SMALL, 1)
	).rejects.toThrow(
		new FilmError(
			"eye.fly's heading key 0 turns toward a block the eye stands right over there: turn it toward one ahead of it"
		)
	);
	await expect(setAt(eye.fly([{ ahead: 1 }]), OPENING_IN_SMALL, 1)).rejects.toThrow(
		new FilmError("eye.fly's leg 0 goes ahead with no leg before it: send the eye somewhere first")
	);
	await expect(setAt(eye.fly([{ to: OVER_THE_BLOCK }, { to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1)).rejects.toThrow(
		new FilmError("eye.fly's leg 1 goes nowhere: send it somewhere the eye does not stand")
	);
});

test('an eye sent back to rest after a flight stands in the room again, where it rests', async () => {
	const flown = await setAt(eye.fly([{ to: OVER_THE_BLOCK }]), OPENING_IN_SMALL, 1);
	expect((await setAt(eye.to('rest'), flown, 1)).eye).toEqual(OPENING_IN_SMALL.eye);
});

// The eye onto a block filling half the small frame along the side it fills most, its middle three quarters down the
// frame; where the card's corners then stand on the frame, 200 by 100 of it, and those of the block above, 100 by 200
const HALF_THE_FRAME_LOW = { fills: 0.5, middleAt: { left: 0.5, top: 0.75 } };
const CARDS_TOP_LEFT: Point = { left: CARD.left, top: CARD.top };
const CARDS_FOOT_RIGHT: Point = { left: CARD.left + CARD.width, top: CARD.top + CARD.height };
const SHOWN_ABOVE_TOP_LEFT: Point = { left: SHOWN_ABOVE.left, top: SHOWN_ABOVE.top };
const SHOWN_ABOVE_FOOT_RIGHT: Point = {
	left: SHOWN_ABOVE.left + SHOWN_ABOVE.width,
	top: SHOWN_ABOVE.top + SHOWN_ABOVE.height
};
// The eye turned from square before a block: round toward the page's right, and up toward its top
const TURNED = { round: 30, up: 20 };

/** A spot as a test takes it: each of its numbers close to the one named. */
function closeToSpot(spot: Spot): Spot {
	return { across: expect.closeTo(spot.across), down: expect.closeTo(spot.down), out: expect.closeTo(spot.out) };
}

test('an eye onto a block stands square before it, riding the window: the block fills its share of the frame along the side it fills most, its middle where the film names', async () => {
	const ontoTheCard = await setAt(eye.onto('#card', HALF_THE_FRAME_LOW), OPENING_IN_SMALL, 1);
	const ontoATallBlock = await setAt(eye.onto('#shown-above', HALF_THE_FRAME_LOW), OPENING_IN_SMALL, 1);
	expect([
		ontoTheCard.eye.inside,
		pagePointDrawn(ontoTheCard, CARDS_TOP_LEFT),
		pagePointDrawn(ontoTheCard, CARDS_FOOT_RIGHT),
		pagePointDrawn(ontoATallBlock, SHOWN_ABOVE_TOP_LEFT),
		pagePointDrawn(ontoATallBlock, SHOWN_ABOVE_FOOT_RIGHT)
	]).toEqual([
		'window',
		{ left: 100, top: 250 },
		{ left: 300, top: 350 },
		{ left: 150, top: 200 },
		{ left: 250, top: 400 }
	]);
});

test("an eye onto a block turned round and up stands as far from the block's middle as square, round toward the page's right and up toward its top, looking at the middle", async () => {
	const square = cameraOf(await setAt(eye.onto('#card', { fills: 0.5 }), OPENING_IN_SMALL, 1), SMALL).eye;
	const turnedScene = await setAt(eye.onto('#card', { fills: 0.5, turned: TURNED }), OPENING_IN_SMALL, 1);
	const turned = cameraOf(turnedScene, SMALL).eye;
	const distance = square.at.out - square.aim.out;
	const [round, up] = [(TURNED.round * Math.PI) / 180, (TURNED.up * Math.PI) / 180];
	expect([turned.aim, turned.at, pagePointDrawn(turnedScene, CARDS_MIDDLE)]).toEqual([
		closeToSpot(square.aim),
		closeToSpot({
			across: square.aim.across + distance * Math.cos(up) * Math.sin(round),
			down: square.aim.down - distance * Math.sin(up),
			out: square.aim.out + distance * Math.cos(up) * Math.cos(round)
		}),
		FRAMES_MIDDLE
	]);
});

test('an eye onto a block rides the window: the window leant in the same step, set first or after, carries it, the block still where the film named', async () => {
	const coming = await eye.onto('#card', HALF_THE_FRAME_LOW).begin(beginningOf(OPENING_IN_SMALL));
	const leaning = await lean({ tilt: 30, turn: -20 }).begin(beginningOf(OPENING_IN_SMALL));
	const cameFirst = await leaning(await coming(OPENING_IN_SMALL, 1), 1);
	const leantFirst = await coming(await leaning(OPENING_IN_SMALL, 1), 1);
	expect([pagePointDrawn(cameFirst, CARDS_MIDDLE), pagePointDrawn(leantFirst, CARDS_MIDDLE)]).toEqual([
		{ left: 200, top: 300 },
		{ left: 200, top: 300 }
	]);
});

test('an eye onto a block refused as the move is made: no share of the frame to fill, a middle off the frame, a turn a quarter round from square or past, a pace of neither kind', () => {
	expect(() => eye.onto('#card', { fills: 0 })).toThrow(
		new FilmError(
			"eye.onto's fills is 0: it is the share of the frame the block fills along the side it fills most, more than 0"
		)
	);
	expect(() => eye.onto('#card', { fills: 0.5, middleAt: { left: 0.5, top: 1.2 } })).toThrow(
		new FilmError("eye.onto's middleAt's top is 1.2: it is a number from 0 to 1")
	);
	expect(() => eye.onto('#card', { fills: 0.5, turned: { round: 90 } })).toThrow(
		new FilmError("eye.onto's turned's round is 90: it is degrees turned from square, more than -90 and less than 90")
	);
	expect(() => eye.onto('#card', { fills: 0.5, turned: { up: -90 } })).toThrow(
		new FilmError("eye.onto's turned's up is -90: it is degrees turned from square, more than -90 and less than 90")
	);
	expect(() => eye.onto('#card', { fills: 0.5, pace: 'keys' as never })).toThrow(
		new FilmError('eye.onto\'s pace is "keys": it is "scale" or "even"')
	);
});

/** How wide the card is drawn on the small frame of a scene, by its own camera. */
function cardsWidthDrawn(scene: Scene): number {
	const camera = cameraOf(scene, SMALL);
	return onTheFrame(camera, SMALL.frame, CARDS_FOOT_RIGHT).left - onTheFrame(camera, SMALL.frame, CARDS_TOP_LEFT).left;
}

test('an eye onto a block grows the page by even steps of scale: half way, the card drawn the mean by scale of how wide it set off and ends; named even, the eye as far along its way in each share, the card half way the mean of the reciprocals', async () => {
	const byScale = await eye.onto('#card', { fills: 0.9 }).begin(beginningOf(OPENING_IN_SMALL));
	const evenly = await eye.onto('#card', { fills: 0.9, pace: 'even' }).begin(beginningOf(OPENING_IN_SMALL));
	const setOff = cardsWidthDrawn(OPENING_IN_SMALL);
	const ends = cardsWidthDrawn(await byScale(OPENING_IN_SMALL, 1));
	expect([
		cardsWidthDrawn(await byScale(OPENING_IN_SMALL, 0.5)),
		cardsWidthDrawn(await evenly(OPENING_IN_SMALL, 0.5))
	]).toEqual([expect.closeTo(Math.sqrt(setOff * ends)), expect.closeTo((2 * setOff * ends) / (setOff + ends))]);
});

test("an eye onto a block by steps of scale refused as it begins where the eye stands at or behind the page's plane, where it has no scale", async () => {
	const behind = await setAt(
		eye.to({ at: { across: 0, down: 0, out: -1000 }, aim: { across: 0, down: 0, out: -3000 } }),
		OPENING_IN_SMALL,
		1
	);
	await expect(setAt(eye.onto('#card', { fills: 0.5 }), behind, 1)).rejects.toThrow(
		new FilmError(
			"eye.onto goes by steps of scale, and the eye stands at or behind the page's plane as it begins, where it shows the page at no scale: bring it before the page first, or name pace: 'even'"
		)
	);
});

// A flight over the block, then onto the card as the eye onto it frames it
const FLOWN_ONTO_THE_CARD = [{ to: OVER_THE_BLOCK }, { onto: '#card', ...HALF_THE_FRAME_LOW }];

test('an eye flown onto a block as its last leg stands as the eye onto it stands, square before it, its middle where the film names, whatever gaze it flew with before', async () => {
	const flown = await setAt(
		eye.fly(FLOWN_ONTO_THE_CARD, { heading: [{ by: 0, toward: '#card' }], tip: [{ by: 0, degrees: -60 }] }),
		OPENING_IN_SMALL,
		1
	);
	expect([flown.eye.inside, pagePointDrawn(flown, CARDS_TOP_LEFT), pagePointDrawn(flown, CARDS_FOOT_RIGHT)]).toEqual([
		'window',
		{ left: 100, top: 250 },
		{ left: 300, top: 350 }
	]);
});

test('a leg onto a block refused as the flight is made: no share of the frame to fill, a middle off the frame, a key of the gaze by it, whose end the stand sets the gaze at', () => {
	expect(() => eye.fly([{ onto: '#card', fills: 0 }])).toThrow(
		new FilmError(
			"eye.fly's way[0]'s fills is 0: it is the share of the frame the block fills along the side it fills most, more than 0"
		)
	);
	expect(() => eye.fly([{ onto: '#card', fills: 0.5, middleAt: { left: -0.1, top: 0.5 } }])).toThrow(
		new FilmError("eye.fly's way[0]'s middleAt's left is -0.1: it is a number from 0 to 1")
	);
	expect(() => eye.fly(FLOWN_ONTO_THE_CARD, { tip: [{ by: 1, degrees: -60 }] })).toThrow(
		new FilmError(
			"eye.fly's tip key 0 is reached by leg 1, which stands before a block and sets the gaze at its end: name no key by it"
		)
	);
});

test('a piece is lifted off the page while the eye looks straight ahead, moved aside or not, and refused while it looks aslant', async () => {
	const steppedAside = await setIn(
		eye.to({ at: { across: 300, down: 0, out: 2000 }, aim: { across: 300, down: 0, out: 0 } }),
		OPENING_IN_FULL_HD,
		1,
		FULL_HD
	);
	const aslant = await setIn(eye.to(EYE_ASIDE), OPENING_IN_FULL_HD, 1, FULL_HD);
	expect((await setIn(piece.show('#card'), steppedAside, 1, FULL_HD)).objects.has('piece')).toBe(true);
	await expect(setIn(piece.show('#card'), aslant, 1, FULL_HD)).rejects.toThrow(
		new FilmError(
			"piece.show stands over its source only while the eye looks straight ahead at the window from before it, its top up the frame: send it so, eye.to({ at, aim, up }), or back where it rests, eye.to('rest')"
		)
	);
});

test('an eye half as far from the window shows it twice as large, and sees under each point of the frame the point of the screen drawn there, aslant too', async () => {
	const atRest = cameraOf(OPENING_IN_SMALL, SMALL);
	const near = cameraOf(await setAt(eye.to({ at: { across: 0, down: 0, out: 1000 } }), OPENING_IN_SMALL, 1), SMALL);
	const aslant = cameraOf(await setAt(eye.to(EYE_ASIDE), OPENING_IN_SMALL, 1), SMALL);
	const point: Point = { left: atRest.pose.focusX + 30, top: atRest.pose.focusY - 20 };
	const shownNear = onTheFrame(near, SMALL.frame, point);
	const shownAtRest = onTheFrame(atRest, SMALL.frame, point);
	expect([
		(shownNear.left - FRAMES_MIDDLE.left) / (shownAtRest.left - FRAMES_MIDDLE.left),
		(shownNear.top - FRAMES_MIDDLE.top) / (shownAtRest.top - FRAMES_MIDDLE.top)
	]).toEqual([2, 2]);
	expect(
		[
			underTheFrame(near, SMALL.frame, shownNear)!,
			underTheFrame(aslant, SMALL.frame, onTheFrame(aslant, SMALL.frame, point))!
		].map(roundedPoint)
	).toEqual([point, point]);
});

test('a window the eye stands behind is handed to the stage in 3D, which cuts away what the eye cannot see, never flat and turned over', async () => {
	const behind = await setAt(
		eye.to({ at: { across: 0, down: 0, out: -1500 }, aim: { across: 0, down: 0, out: -3500 } }),
		OPENING_IN_SMALL,
		1
	);
	expect(drawn(behind, cameraOf(behind, SMALL), 0, SMALL, NONE_SHARPER).window.transform.kind).toBe('leant');
});

test('an eye sent over the top of what it looks at, or just beside it, its top kept up the frame, is refused as its move begins, as the picture would spin round', async () => {
	const overhead = await setAt(eye.to({ at: { across: 0, down: -2000, out: 300 } }), OPENING_IN_SMALL, 1);
	// Its sight within 5° of its up while it stands less than 175 out either side of the top
	await expect(setAt(eye.to({ at: { across: 0, down: -2000, out: -300 } }), overhead, 1)).rejects.toThrow(EYE_REFUSAL);
	// Passing 60 beside the top, 2000 above it, its across would turn 152° in two frames of two seconds
	const besideTheTop = await setAt(eye.to({ at: { across: 60, down: -2000, out: 1000 } }), OPENING_IN_SMALL, 1);
	await expect(setAt(eye.to({ at: { across: 60, down: -2000, out: -1000 } }), besideTheTop, 1)).rejects.toThrow(
		EYE_REFUSAL
	);
});

test('a title in the world slides in from past the edge as the eye sees it, however far the eye stands', async () => {
	const far = await setAt(eye.to({ at: { across: 0, down: 0, out: 6000 } }), OPENING_IN_SMALL, 1);
	const settingOff = await setAt(title.show('Words', { from: 'left', inside: 'world' }), far, 0);
	const holders = { camera: cameraOf(settingOff, SMALL), groups: settingOff.groups };
	const rightEdge = drawnOnTheFrame(settingOff.objects.get('title')!, holders, SMALL.frame, { left: 1, top: 0.5 });
	expect(rightEdge.left).toBeLessThanOrEqual(0);
});

// An eye opened 40 pixels of a frame 1080 high wide: a point twice as far from it as its focus, or half as far, is
// drawn as a disc 40 across, blurred a quarter of that on the frame; a title in the world half way to the eye from the
// frame's plane, drawn twice as large there
const OPENED = 40;
const A_QUARTER_OF_THE_DISC = 10;
const HALF_WAY_TO_THE_EYE = 1000;
// How near two points on the frame stand to be drawn at one pixel
const HALF_A_PIXEL = 0.5;

/** A scene with a title named `near` in the world half way to the eye, and one riding on the frame as near. */
async function withNearTitles(scene: Scene): Promise<Scene> {
	const inTheWorld = await setAt(title.show('Near', { as: 'near', inside: 'world' }), scene, 1);
	const onTheFrame = await setAt(title.show('Riding', { as: 'riding' }), inTheWorld, 1);
	const near = await setAt(title.effects({ as: 'near', depth: HALF_WAY_TO_THE_EYE }), onTheFrame, 1);
	return setAt(title.effects({ as: 'riding', depth: HALF_WAY_TO_THE_EYE }), near, 1);
}

// Code in the world, and a title shown after it over its left part, both on the frame's plane; the eye moved to the
// right of the frame, and to its left, the title's middle farther from it than the code's, then nearer
const CODES_BOX = { left: 0.05, top: 0.25, width: 0.6, height: 0.5 } as const;
const OVER_ITS_LEFT = { left: 0.08, top: 0.42, width: 0.3, height: 0.12 } as const;
const EYE_MOVED_RIGHT: EyePlace = { at: { across: 700, down: 0, out: 2400 }, aim: { across: 0, down: 0, out: 0 } };
const EYE_MOVED_LEFT: EyePlace = { at: { across: -700, down: 0, out: 2400 }, aim: { across: 0, down: 0, out: 0 } };
const NEARER_THAN_THE_FRAMES_PLANE = 300;
// A title at the frame's left edge over the code's, on a plane a little nearer than the frame's: seen from the right
// its middle stands farther from the eye than the code's and the other title's, its plane nearer than theirs
const AT_THE_LEFT_EDGE = { left: 0.02, top: 0.42, width: 0.1, height: 0.12 } as const;
const A_LITTLE_NEARER = 20;

/** What stands in the world of a scene shot in the small format, by name, in the order the room lays it. */
function laidInTheWorldIn(scene: Scene): readonly string[] {
	return drawnSceneIn(scene, SMALL).laidInTheWorld.map((laid) => laid.name);
}

test("what stands in the world is laid in the scene's order on one plane wherever the eye stands, and of two planes apart the farther first, the farther plane where the two face alike", async () => {
	const pane = await setAt(
		code.show('const shown = await review(diff);', { at: CODES_BOX, inside: 'world' }),
		OPENING_IN_SMALL,
		1
	);
	const over = await setAt(title.show('Over the code', { at: OVER_ITS_LEFT, inside: 'world' }), pane, 1);
	const seenFromTheRight = await setAt(eye.to(EYE_MOVED_RIGHT), over, 1);
	const seenFromTheLeft = await setAt(eye.to(EYE_MOVED_LEFT), over, 1);
	const titleFirst = await setAt(title.show('Nearer', { at: OVER_ITS_LEFT, inside: 'world' }), OPENING_IN_SMALL, 1);
	const titleNearer = await setAt(title.effects({ depth: NEARER_THAN_THE_FRAMES_PLANE }), titleFirst, 1);
	const paneAfter = await setAt(code.show('await done();', { at: CODES_BOX, inside: 'world' }), titleNearer, 1);
	const aside = await setAt(
		title.show('Near', { at: AT_THE_LEFT_EDGE, inside: 'world', as: 'near' }),
		seenFromTheRight,
		1
	);
	const asideNearer = await setAt(title.effects({ as: 'near', depth: A_LITTLE_NEARER }), aside, 1);
	expect([seenFromTheRight, seenFromTheLeft, paneAfter, asideNearer].map(laidInTheWorldIn)).toEqual([
		['code', 'title'],
		['code', 'title'],
		['code', 'title'],
		['code', 'title', 'near']
	]);
});

/** How soft the stage blurs the window and each object of a scene shot in the small format, by its own camera. */
function outOfFocusIn(scene: Scene): readonly (number | null)[] {
	const shown = drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER);
	return [shown.window.outOfFocus, ...shown.objects.map((object) => object.outOfFocus)];
}

test('an eye focused on a title in the world draws it sharp, and the page twice as far as soft as a disc as wide as the eye is open', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const focused = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	expect(outOfFocusIn(focused)).toEqual([expect.closeTo(A_QUARTER_OF_THE_DISC), null, null]);
});

test('the room is handed the softest point the frame shows of a title in the world nearer than the focus, on the frame, and none of one riding on it', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onThePage = await setAt(eye.focus('#block', { aperture: OPENED }), near, 1);
	const objects = drawn(onThePage, cameraOf(onThePage, SMALL), 0, SMALL, NONE_SHARPER).objects;
	expect(objects.map((object) => object.softestOutOfFocus)).toEqual([expect.closeTo(A_QUARTER_OF_THE_DISC), null]);
});

test('a title in the world nearer than the focus is blurred in its own pixels, the less the larger it is drawn; what rides on the frame stays sharp', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onThePage = await setAt(eye.focus('#block', { aperture: OPENED }), near, 1);
	expect(outOfFocusIn(onThePage)).toEqual([null, expect.closeTo(A_QUARTER_OF_THE_DISC / 2), null]);
});

// A title in the world in the frame's middle, as large as a fifth of the frame high; leant back, its foot nearer the
// eye, and leant back so far, and brought so near, that its foot passes behind the eye
const IN_THE_MIDDLE = { left: 0.3, top: 0.4, width: 0.4, height: 0.2 } as const;
const LEANT_BACK = 50;
const LEANT_FAR_BACK = 80;
const ALMOST_AT_THE_EYE = FOCAL_LENGTH - 40;

/** How many times the eye magnifies each object of a scene shot in the small format, as the room is handed it. */
function magnifiedIn(scene: Scene): readonly number[] {
	return drawnObjectsIn(scene, SMALL).map((object) => object.magnified);
}

/** A scene with a title in the world in the frame's middle. */
function withATitleInTheMiddle(): Promise<Scene> {
	return setAt(title.show('Near', { at: IN_THE_MIDDLE, inside: 'world' }), OPENING_IN_SMALL, 1);
}

test("the room is handed how many times the eye magnifies a title in the world: twice brought half-way to the eye, once on the frame's plane; and once riding on the frame brought as near, or grown twice in the window", async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onItsPlane = await setAt(title.show('Here', { inside: 'world' }), OPENING_IN_SMALL, 1);
	const inTheWindow = await setAt(title.show('In', { inside: 'window' }), OPENING_IN_SMALL, 1);
	const grownInTheWindow = await setAt(title.effects({ scale: 2 }), inTheWindow, 1);
	expect([...magnifiedIn(near), ...magnifiedIn(onItsPlane), ...magnifiedIn(grownInTheWindow)]).toEqual([
		expect.closeTo(2),
		1,
		expect.closeTo(1),
		1
	]);
});

test('a title in the world grown by its stance is magnified as much: one and a half times grown, one and a half; shrunk to a half, once, never less', async () => {
	const titled = await withATitleInTheMiddle();
	const [grown, shrunk] = await Promise.all([1.5, 0.5].map((scale) => setAt(title.effects({ scale }), titled, 1)));
	expect([...magnifiedIn(grown!), ...magnifiedIn(shrunk!)]).toEqual([expect.closeTo(1.5), 1]);
});

test('a title in the world leant back is magnified as the eye sees its foot, the nearer edge, at its corner', async () => {
	const leant = await setAt(title.lean({ tilt: LEANT_BACK }), await withATitleInTheMiddle(), 1);
	const drawnTitle = drawnObjectsIn(leant, SMALL)[0]!;
	const footsCorner = translation({ across: -drawnTitle.box.width / 2, down: drawnTitle.box.height / 2, out: 0 });
	const atItsCorner = longestScaleAtItsMiddle(chained([drawnTitle.transform.matrix as Matrix, footsCorner]));
	expect(drawnTitle.magnified).toBeCloseTo(atItsCorner);
});

test("a title in the world whose foot passes behind the eye is magnified as much as what the frame shows of it, finite; one wholly past the frame's edge, once", async () => {
	const leant = await setAt(title.lean({ tilt: LEANT_FAR_BACK }), await withATitleInTheMiddle(), 1);
	const passing = await setAt(title.effects({ depth: ALMOST_AT_THE_EYE }), leant, 1);
	const pastTheEdge = await setAt(title.show('Words', { from: 'left', inside: 'world' }), OPENING_IN_SMALL, 0);
	const [passingTitle] = magnifiedIn(passing);
	expect([Number.isFinite(passingTitle), passingTitle! > 1, ...magnifiedIn(pastTheEdge)]).toEqual([true, true, 1]);
});

test('a focus pulled from a near title to the page goes evenly in how sharp it leaves things: half way, the page is half as soft', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onTheTitle = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	const halfWay = await setAt(eye.focus('#block'), onTheTitle, 0.5);
	expect(outOfFocusIn(halfWay)[0]).toBeCloseTo(A_QUARTER_OF_THE_DISC / 2);
});

test('a focus on a title in the world holds on it as the eye comes nearer, the page behind it softer', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onTheTitle = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	const nearer = await setAt(eye.to({ at: { across: 0, down: 0, out: 1500 } }), onTheTitle, 1);
	// The title 500 from the eye, the page 1500: a disc of 40 × 2000 × (1/500 − 1/1500) on the frame, blurred a quarter
	// of that
	const disc = OPENED * FOCAL_LENGTH * (1 / 500 - 1 / 1500);
	expect(outOfFocusIn(nearer)).toEqual([expect.closeTo(disc / 4), null, null]);
});

test('an eye of twice the focal length blurs by its own: the page behind a title it focuses on, a disc of aperture × focal length × |1/focus − 1/distance|', async () => {
	const near = await withNearTitles(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, TWICE_THE_FOCAL_LENGTH));
	const onTheTitle = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	// The title 3000 from the eye, the page 4000
	const disc = OPENED * TWICE_THE_FOCAL_LENGTH * (1 / 3000 - 1 / 4000);
	expect(outOfFocusIn(onTheTitle)).toEqual([expect.closeTo(disc / 4), null, null]);
});

test('a focus kept on a title in the world while the eye comes nearer in the same step keeps it sharp all the way', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onTheTitle = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	const comingNearer = await eye.to({ at: { across: 0, down: 0, out: 1500 } }).begin(beginningOf(onTheTitle));
	const keptOnIt = await eye.focus({ object: 'near' }).begin(beginningOf(onTheTitle));
	const halfWay = await keptOnIt(await comingNearer(onTheTitle, 0.5), 0.5);
	expect(outOfFocusIn(halfWay)[1]).toBeNull();
});

test('a focus on a title riding on the frame rides with the eye, as far before it as the title stands wherever it goes', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onTheRiding = await setAt(eye.focus({ object: 'riding' }, { aperture: OPENED }), near, 1);
	const nearer = await setAt(eye.to({ at: { across: 0, down: 0, out: 1500 } }), onTheRiding, 1);
	// The focus 1000 before the eye still, the page 1500: a disc of 40 × 2000 × (1/1000 − 1/1500) on the frame, blurred a
	// quarter of that
	const disc = OPENED * FOCAL_LENGTH * (1 / 1000 - 1 / 1500);
	expect(outOfFocusIn(nearer)[0]).toBeCloseTo(disc / 4);
});

test('a window leant back is drawn as sharp as the block of the page the eye focuses on', async () => {
	const leant = await setAt(lean({ tilt: 50 }), OPENING_IN_SMALL, 1);
	const onTheBlock = await setAt(eye.focus('#block', { aperture: OPENED }), leant, 1);
	expect(outOfFocusIn(onTheBlock)).toEqual([null]);
});

test('a title in the world turned nearly edge-on is blurred no more in its own pixels than face-on', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onThePage = await setAt(eye.focus('#block', { aperture: OPENED }), near, 1);
	const turned = await setAt(title.lean({ as: 'near', turn: 89.9 }), onThePage, 1);
	expect(outOfFocusIn(turned)[1]).toBeLessThanOrEqual(A_QUARTER_OF_THE_DISC / 2);
});

test('a blur a tenth of a pixel of the frame wide or less is drawn as none', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const barelyOpen = await setAt(eye.focus({ object: 'near' }, { aperture: 0.001 }), near, 1);
	expect(outOfFocusIn(barelyOpen)).toEqual([null, null, null]);
});

// A disc is blurred as a Gaussian a quarter of its width; and distances a focus stands at: as far as the frame, and
// half as far
const DISC_WIDTH_IN_SPREADS = 4;
const AS_FAR_AS_THE_FRAME = FOCAL_LENGTH;
const HALF_AS_FAR = 1000;

/** The window of a scene shot in the small format as the stage draws it, by the scene's own camera. */
function drawnWindowIn(scene: Scene): DrawnWindow {
	return drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window;
}

/**
 * How soft the eye opened `OPENED` wide and focused so far before it draws a point of the window or the page, seen by a
 * camera on the small frame: a quarter of a disc `aperture × focal length × |1/focus − 1/distance|` across.
 */
function spreadAt(camera: Camera, focusedAt: number, point: Focus): number {
	const distance = focusDistanceOf(point, camera, SMALL.frame);
	return (OPENED * FOCAL_LENGTH * Math.abs(1 / focusedAt - 1 / distance)) / DISC_WIDTH_IN_SPREADS;
}

test("the room is handed the eye's lens as the engine's law: a point at the focus spreads none, one at half and twice as far as soft as the eye draws a point there; an eye open none hands none", async () => {
	const opened = await setAt(eye.focus(AS_FAR_AS_THE_FRAME, { aperture: OPENED }), OPENING_IN_SMALL, 1);
	const camera = cameraOf(opened, SMALL);
	const lens = drawn(opened, camera, 0, SMALL, NONE_SHARPER).eye.lens!;
	const distances = [AS_FAR_AS_THE_FRAME, AS_FAR_AS_THE_FRAME / 2, AS_FAR_AS_THE_FRAME * 2];
	expect(distances.map((distance) => lens.perNearness * Math.abs(lens.inFocus - 1 / distance))).toEqual(
		distances.map((distance) => expect.closeTo(outOfFocusAt(sharpnessOf(camera, SMALL.frame), distance)))
	);
	expect(drawn(OPENING_IN_SMALL, cameraOf(OPENING_IN_SMALL, SMALL), 0, SMALL, NONE_SHARPER).eye.lens).toBeNull();
});

test('the room is handed the softest point of a window face-on out of focus as soft as the flat stage blurs it whole', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const focused = await setAt(eye.focus({ object: 'near' }, { aperture: OPENED }), near, 1);
	expect(drawnWindowIn(focused).softestOutOfFocus).toBeCloseTo(A_QUARTER_OF_THE_DISC);
});

test("the room is handed as the softest point of a window turned nearly edge-on its near edge, the frame's corner seeing the plane past it nearer still", async () => {
	const edgeOn = await setAt(lean({ turn: 89.8 }), OPENING_IN_SMALL, 1);
	const focused = await setAt(eye.focus(AS_FAR_AS_THE_FRAME, { aperture: OPENED }), edgeOn, 1);
	const nearEdge: Focus = { kind: 'spot', holder: IN_THE_WINDOW, point: { left: 0, top: 200 }, depth: 0 };
	const softest = spreadAt(cameraOf(focused, SMALL), AS_FAR_AS_THE_FRAME, nearEdge);
	expect(drawnWindowIn(focused).softestOutOfFocus).toBeCloseTo(softest);
});

test('the room is handed no softest point of the window where the eye is open none, or so little no point of the frame spreads past a tenth of a pixel', async () => {
	const barelyOpen = await setAt(eye.focus(HALF_AS_FAR, { aperture: 0.001 }), OPENING_IN_SMALL, 1);
	expect([OPENING_IN_SMALL, barelyOpen].map((scene) => drawnWindowIn(scene).softestOutOfFocus)).toEqual([null, null]);
});

test('eye.to and eye.focus share a step, the eye standing where one sends it and focused where the other does', async () => {
	const steps = play({ seconds: 1, moves: [eye.to(EYE_ASIDE), eye.focus(1000, { aperture: OPENED })] });
	const both = await setAt(
		eye.focus(1000, { aperture: OPENED }),
		await setAt(eye.to(EYE_ASIDE), OPENING_IN_SMALL, 1),
		1
	);
	expect(steps.kind).toBe('play');
	expect([both.eye.at, both.eye.aim, both.eye.aperture]).toEqual([EYE_ASIDE.at, EYE_ASIDE.aim, OPENED]);
});

test('a focus on an object that does not stand, or on what stands behind the eye, is refused as its move begins', async () => {
	const behind = new FilmError(
		'eye.focus focuses on what stands behind the eye, which it never sees: focus on what stands before it'
	);
	const pastTheTitle = await setAt(
		eye.to({ at: { across: 0, down: 0, out: 900 } }),
		await withNearTitles(OPENING_IN_SMALL),
		1
	);
	await expect(setAt(eye.focus({ object: 'gone' }), OPENING_IN_SMALL, 1)).rejects.toThrow(
		new FilmError('eye.focus finds no gone on the screen')
	);
	await expect(setAt(eye.focus({ across: 0, down: 0, out: 2500 }), OPENING_IN_SMALL, 1)).rejects.toThrow(behind);
	await expect(setAt(eye.focus({ object: 'near' }), pastTheTitle, 1)).rejects.toThrow(behind);
});

test('a focus at no distance, or in no form a focus takes, is refused as the move is made', () => {
	const forms =
		'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; an object, { object }; or under a point of the frame, { under: { left, top } } in shares of it';
	expect(() => eye.focus(0)).toThrow(new FilmError(`eye.focus's focus is 0: it is ${forms}`));
	expect(() => eye.focus(true as never)).toThrow(new FilmError(`eye.focus's focus is true: it is ${forms}`));
});

test('a piece in the world stands over its source wherever the eye stands, aslant too, lifted and taken back', async () => {
	const aslant = await setIn(eye.to(EYE_ASIDE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), aslant, 1, FULL_HD);
	const carried = await setIn(piece.to('top'), lifted, 1, FULL_HD);
	const back = await setIn(piece.back(), carried, 1, FULL_HD);
	expect([drawnOverItsSource(lifted), drawnOverItsSource(back)]).toEqual([true, true]);
});

test('a piece in the world lifted while the camera passes through a key stands over its source as the camera shows it', async () => {
	const aslant = await setIn(eye.to(EYE_ASIDE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const passing = await setIn(onto('#other', { through: ['#card'], air: 0, zoomAtMost: 2 }), aslant, 0.4, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), passing, 1, FULL_HD);
	expect(drawnOverItsSource(lifted)).toBe(true);
});

// A window standing lower than the frame, its foot past the frame's: the camera fills it with the whole screen at 0.8,
// so the frame shows its top 675 pixels of the screen; a part of the screen it shows below the frame's foot, and where
// that part stands on the window's plane; and the camera at twice that, its picture of the screen's middle half alone
const PAST_THE_FRAMES_FOOT = { left: 0.1, top: 0.5, width: 0.8, height: 0.8 } as const;
const THE_WHOLE_SCREEN_LOW = { focusX: 960, focusY: 540, zoom: 0.8 };
const BELOW_THE_FRAMES_FOOT = { left: 100, top: 900, width: 200, height: 100 };
const ON_THE_PLANE_BELOW = { left: 272, top: 1260, width: 160, height: 80 };
const AT_TWICE = { focusX: 960, focusY: 540, zoom: 1.6 };
const IN_THE_SCREENS_CORNER = { left: 0, top: 0, width: 100, height: 100 };

test("a piece lifted in the world is taken off any part of the screen the window's picture holds, wherever the eye stands; on the frame, off what the camera shows there alone", async () => {
	const placed = await setIn(windowTo(PAST_THE_FRAMES_FOOT), OPENING_IN_FULL_HD, 1, FULL_HD);
	const low = await setIn(cameraTo(THE_WHOLE_SCREEN_LOW), placed, 1, FULL_HD);
	const lifted = await setIn(piece.show(BELOW_THE_FRAMES_FOOT, { inside: 'world' }), low, 1, FULL_HD);
	expect([lifted.objects.get('piece')!.box, (lifted.objects.get('piece')!.content as Piece).source]).toEqual([
		closeToBox(ON_THE_PLANE_BELOW),
		BELOW_THE_FRAMES_FOOT
	]);
	await expect(setIn(piece.show(BELOW_THE_FRAMES_FOOT), low, 1, FULL_HD)).rejects.toThrow(
		new FilmError(
			`piece.show's box ${JSON.stringify(BELOW_THE_FRAMES_FOOT)} stands outside what the camera shows: frame it first`
		)
	);
});

test("a piece lifted in the world off a part of the screen the window's picture does not hold is refused", async () => {
	const low = await setIn(windowTo(PAST_THE_FRAMES_FOOT), OPENING_IN_FULL_HD, 1, FULL_HD);
	const close = await setIn(cameraTo(AT_TWICE), low, 1, FULL_HD);
	await expect(setIn(piece.show(IN_THE_SCREENS_CORNER, { inside: 'world' }), close, 1, FULL_HD)).rejects.toThrow(
		new FilmError(
			`piece.show's box ${JSON.stringify(IN_THE_SCREENS_CORNER)} stands outside what the window shows of the screen: frame it first`
		)
	);
});

/**
 * Whether the piece of a scene shot full HD is drawn with its middle on the frame where the camera shows its source's
 * middle, to the pixel.
 */
function drawnOverItsSource(scene: Scene): boolean {
	const camera = cameraOf(scene, FULL_HD);
	const lifted = scene.objects.get('piece')!;
	const source = (lifted.content as Piece).source;
	const drawnMiddle = drawnOnTheFrame(lifted, holdersIn(scene, camera), FULL_HD.frame, BOX_MIDDLE);
	const sourcesMiddle = onTheFrame(camera, FULL_HD.frame, { left: middleX(source), top: middleY(source) });
	return distanceBetween(drawnMiddle, sourcesMiddle) < HALF_A_PIXEL;
}

/** A point to the nearest pixel. */
function roundedPoint(point: Point): Point {
	return { left: Math.round(point.left), top: Math.round(point.top) };
}

// A card a film's things module builds, open none and glowing whole, 540 across and 270 up of a frame 1080 high, shown
// about the frame's middle
const A_CARD = { open: 0, glow: 1 };
const CARD_REACH = { width: 540, height: 270 };
const A_CARD_SHOWN = { at: 'whole', reach: CARD_REACH, values: A_CARD } as const;

/** A scene with a card shown in the world at the frame's middle, brought so far toward the eye. */
async function cardAt(depth: number): Promise<Scene> {
	const shown = await setAt(thing.show('card', { ...A_CARD_SHOWN, inside: 'world' }), OPENING_IN_SMALL, 1);
	return setAt(thing.to('whole', { depth }), shown, 1);
}

/** The 3 × 3 part of a matrix's determinant, which is less than none where the matrix turns faces over. */
function handednessOf(matrix: Matrix): number {
	return (
		matrix.m11 * (matrix.m22 * matrix.m33 - matrix.m32 * matrix.m23) -
		matrix.m21 * (matrix.m12 * matrix.m33 - matrix.m32 * matrix.m13) +
		matrix.m31 * (matrix.m12 * matrix.m23 - matrix.m22 * matrix.m13)
	);
}

/** What a scene's first object shows as the stage draws it, a thing. */
function drawnThingIn(scene: Scene): DrawnThing {
	return drawnObjectsIn(scene, SMALL)[0]!.content as DrawnThing;
}

test("a thing stands as far as it reaches about its place's middle, and is carried to another place's middle as large", async () => {
	// The small frame is 400 high, so the card reaches 200 across and 100 up about its middle, 200 and 200
	const shown = await cardAt(0);
	const carried = await setAt(thing.to('left'), shown, 1);
	const [atTheMiddle, onTheLeft] = [shown, carried].map((scene) => scene.objects.get('thing')!.box);
	expect([atTheMiddle, [onTheLeft!.width, onTheLeft!.height]]).toEqual([
		{ left: 100, top: 150, width: 200, height: 100 },
		[200, 100]
	]);
});

test("a thing shown in the world is drawn as one the page's window may hide, and one on the frame as one it never hides", async () => {
	const onTheFrame = await setAt(thing.show('card', A_CARD_SHOWN), OPENING_IN_SMALL, 1);
	const [inTheWorld, ridingTheEye] = [await cardAt(0), onTheFrame].map((scene) => drawnObjectsIn(scene, SMALL)[0]!);
	expect([inTheWorld!.standsIn, ridingTheEye!.standsIn]).toEqual(['world', 'frame']);
});

test('a scene hands the room as the eye sees it, for a thing in the world, and as the eye at rest does, for one on the frame, so a light standing where that eye stands and aiming where it looks is seen at its middle, straight down its sight', async () => {
	const inTheWorld = await setAt(eye.to(EYE_ASIDE), await cardAt(0), 1);
	const onTheFrame = await setAt(
		eye.to(EYE_ASIDE),
		await setAt(thing.show('card', A_CARD_SHOWN), OPENING_IN_SMALL, 1),
		1
	);
	const atRest = eyeAtRest(FOCAL_LENGTH);
	const light = { colour: '#fff', strength: 1, angle: 20, softness: 1 };
	const lights = [
		{ ...light, at: EYE_ASIDE.at, aim: EYE_ASIDE.aim },
		{ ...light, at: atRest.at, aim: atRest.aim }
	];
	const [atTheEye, atTheEyeAtRest] = drawnLighting(lights, [], SMALL.frame).lights;
	const [inTheWorldsEye, onTheFramesEye] = [inTheWorld, onTheFrame].map(
		(scene) => drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).eye
	);
	const worldsRoom = inTheWorldsEye!.roomInTheEyesSpace;
	const framesRoom = onTheFramesEye!.roomInTheRestingEyesSpace;
	const scale = SMALL.frame.height / 1080;
	const atItsMiddle = { across: expect.closeTo(0), down: expect.closeTo(0), out: expect.closeTo(0) };
	expect([
		carried(chained([worldsRoom!, atTheEye!.standing]), ITS_MIDDLE),
		carried(chained([worldsRoom!, atTheEye!.aimedAt]), ITS_MIDDLE),
		carried(chained([framesRoom!, atTheEyeAtRest!.standing]), ITS_MIDDLE),
		carried(chained([framesRoom!, atTheEyeAtRest!.aimedAt]), ITS_MIDDLE)
	]).toEqual([
		atItsMiddle,
		{ ...atItsMiddle, out: expect.closeTo(-Math.hypot(1008, 200, 1400) * scale) },
		atItsMiddle,
		{ ...atItsMiddle, out: expect.closeTo(-FOCAL_LENGTH * scale) }
	]);
});

test("a thing's numbers go from those it was shown with to those set, the rest kept as they stand", async () => {
	const shown = await cardAt(0);
	const halfWay = await setAt(thing.set({ open: 1 }), shown, 0.5);
	expect(drawnThingIn(halfWay).values).toEqual({ open: 0.5, glow: 1 });
});

test("a thing is carried into the eye's space by three's own axes on both sides, up the frame, its faces turning as three's do, a unit of it a pixel of a frame 1080 high", async () => {
	const inTheEyesSpace = drawnThingIn(await cardAt(0)).inTheEyesSpace;
	const scale = SMALL.frame.height / 1080;
	expect([inTheEyesSpace.m11, inTheEyesSpace.m22, handednessOf(inTheEyesSpace) > 0]).toEqual([
		expect.closeTo(scale),
		expect.closeTo(scale),
		true
	]);
});

test("a thing leant back by its stance takes three's top away from the eye, up the frame, as three would", async () => {
	const leant = drawnThingIn(await setAt(thing.lean({ tilt: 30 }), await cardAt(0), 1)).inTheEyesSpace;
	const [top, middle] = [{ across: 0, down: 1, out: 0 }, ITS_MIDDLE].map((spot) => carried(leant, spot));
	expect([top!.down > middle!.down, top!.out < middle!.out]).toEqual([true, true]);
});

test('a thing grown by its stance grows toward the eye as much as across and up', async () => {
	const grown = drawnThingIn(await setAt(thing.to('whole', { scale: 2 }), await cardAt(0), 1)).inTheEyesSpace;
	expect(grown.m33).toBeCloseTo(grown.m11);
});

test("the room is handed as the softest point of a thing in the world its box's point the frame shows farthest from the focus: turned toward edge-on about the focus, its near edge", async () => {
	const turned = await setAt(thing.lean({ turn: 80 }), await cardAt(0), 1);
	const focused = await setAt(eye.focus(FOCAL_LENGTH, { aperture: OPENED }), turned, 1);
	const nearEdge = FOCAL_LENGTH - (CARD_REACH.width / 2) * Math.sin((80 * Math.PI) / 180);
	const spread = (OPENED * FOCAL_LENGTH * (1 / nearEdge - 1 / FOCAL_LENGTH)) / 4;
	expect(drawnObjectsIn(focused, SMALL)[0]!.softestOutOfFocus).toBeCloseTo(spread);
});

test("a thing is refused standing inside the window, built by a name the film's module builds none of, and setting a number it was not shown with", async () => {
	expect(() => thing.show('card', { ...A_CARD_SHOWN, inside: 'window' as never })).toThrow(
		new FilmError('thing.show\'s inside is "window": it is "world"')
	);
	await expect(setAt(thing.show('sheen', A_CARD_SHOWN), OPENING_IN_SMALL, 1)).rejects.toThrow(
		new FilmError(
			"thing.show shows sheen, which the film's things module builds none of: draw the film as a room, name its things module, and export a builder of sheen from it"
		)
	);
	await expect(setAt(thing.set({ shine: 1 }), await cardAt(0), 1)).rejects.toThrow(
		new FilmError(
			'thing.set sets shine, which the thing was not shown with: show it with every number its module reads'
		)
	);
});

// Points of a box in shares of it: the middle of its foot and of its right edge, and one below it, left of its middle
const FOOT_MIDDLE: Point = { left: 0.5, top: 1 };
const RIGHT_MIDDLE: Point = { left: 1, top: 0.5 };
const BELOW_ITS_BOX: Point = { left: 0.2, top: 1.5 };

/** Where a point of the window, in shares of its box, is drawn on the frame of a scene shot in the small format. */
function windowsPointOf(scene: Scene, share: Point): Point {
	const camera = cameraOf(scene, SMALL);
	const window = windowInTheWorld(camera.view, camera.eye, SMALL.frame);
	return pointOnTheFrame(window, pointAt(boxOf(camera.view.box), share));
}

/** Where a point of an object of a scene shot in the small format, in shares of its box, is drawn on the frame. */
function drawnPointOf(scene: Scene, name: string, share: Point): Point {
	const holders = holdersIn(scene, cameraOf(scene, SMALL));
	return drawnOnTheFrame(scene.objects.get(name)!, holders, SMALL.frame, share);
}

test('a window or an object leant about a point of its box keeps that point where it stood on the frame: the window tilted 90° about its foot, a title rolled about the middle of its right edge, code tilted and rolled about a point below its box', async () => {
	const placed = await setAt(windowTo('right'), OPENING_IN_SMALL, 1);
	const tilted = await setAt(lean({ tilt: 90, about: 'bottom' }), placed, 1);
	const titled = await setAt(title.show('Words', { at: 'left' }), OPENING_IN_SMALL, 1);
	const rolled = await setAt(title.lean({ roll: 50, about: 'right' }), titled, 1);
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), OPENING_IN_SMALL, 1);
	const leant = await setAt(code.lean({ tilt: 30, roll: 20, about: BELOW_ITS_BOX }), coded, 1);
	expect([
		windowsPointOf(tilted, FOOT_MIDDLE),
		drawnPointOf(rolled, 'title', RIGHT_MIDDLE),
		drawnPointOf(leant, 'code', BELOW_ITS_BOX)
	]).toEqual([
		closeToPoint(windowsPointOf(placed, FOOT_MIDDLE)),
		closeToPoint(drawnPointOf(titled, 'title', RIGHT_MIDDLE)),
		closeToPoint(drawnPointOf(coded, 'code', BELOW_ITS_BOX))
	]);
});

test('a lean naming another point of the box to turn about is refused while what it leans is turned from face-on, rolled too, and taken where it faces the frame by whole turns', async () => {
	const tilted = await setAt(lean({ tilt: 20 }), OPENING_IN_SMALL, 1);
	const titled = await setAt(title.show('Words', { at: 'left' }), OPENING_IN_SMALL, 1);
	const rolled = await setAt(title.lean({ roll: 30 }), titled, 1);
	const spun = await setAt(lean({ turn: 360 }), OPENING_IN_SMALL, 1);
	await expect(setAt(lean({ tilt: 40, about: 'bottom' }), tilted, 1)).rejects.toThrow(
		new FilmError(
			'window.lean would turn the window about another point of its box while it is turned from face-on, where it would jump: lean it face-on first, or on about the point it turns about'
		)
	);
	await expect(setAt(title.lean({ about: 'top' }), rolled, 1)).rejects.toThrow(
		new FilmError(
			'title.lean would turn the title about another point of its box while it is turned from face-on, where it would jump: lean it face-on first, or on about the point it turns about'
		)
	);
	expect((await setAt(lean({ tilt: 10, about: 'bottom' }), spun, 1)).window.about).toEqual(FOOT_MIDDLE);
});

test('the eye sees under a point of the frame the point of the screen drawn there on a window leant about its foot', async () => {
	const leant = await setAt(lean({ tilt: 50, roll: 20, about: 'bottom' }), OPENING_IN_SMALL, 1);
	const camera = cameraOf(leant, SMALL);
	const point: Point = { left: 330, top: 180 };
	expect(underTheFrame(camera, SMALL.frame, onTheFrame(camera, SMALL.frame, point))).toEqual(closeToPoint(point));
});

test('the eye focused on an object leant about its foot focuses where its middle stands', async () => {
	const shown = await setAt(title.show('Words', { at: AROUND_THE_AIM, inside: 'world' }), OPENING_IN_SMALL, 1);
	const leant = await setAt(title.lean({ tilt: 60, about: 'bottom' }), shown, 1);
	const holders = { camera: cameraOf(leant, SMALL), groups: leant.groups };
	const object = leant.objects.get('title')!;
	const middle = distanceOfItsMiddle(standingInTheWorld(object, holders, SMALL.frame)!, SMALL.frame);
	expect(focusDistanceOf(focusOn(object, holders, SMALL.frame), holders.camera, SMALL.frame)).toBeCloseTo(middle);
});

// A point of the page a focus is put under, as the frame shows it; the crawl's turn away, rolled and lain back about a
// point under the window's foot; and a lean far back on its foot, whose plane the frame's top sees past
const UNDER_THE_LINE: Point = { left: 330, top: 120 };
const TURNED_AWAY = { tilt: 64, roll: 36, about: { left: 0.5, top: 1.02 } } as const;
const LYING_FAR_BACK = { tilt: 80, about: 'bottom' } as const;

/** A point of the small frame in shares of it. */
function shareOfTheSmallFrame(point: Point): Point {
	return { left: point.left / SMALL.frame.width, top: point.top / SMALL.frame.height };
}

/** How far before the eye a scene shot in the small format is focused, by its own camera. */
function focusedAtIn(scene: Scene): number {
	return sharpnessOf(cameraOf(scene, SMALL), SMALL.frame).focusedAt;
}

test("a focus under a point of the frame stands where the eye sees the window's plane there as each frame is drawn: on the frame's plane face-on, and on the block of the page drawn there once the window turns away under it", async () => {
	const turnedCamera = cameraOf(await setAt(lean(TURNED_AWAY), OPENING_IN_SMALL, 1), SMALL);
	const under = shareOfTheSmallFrame(onTheFrame(turnedCamera, SMALL.frame, UNDER_THE_LINE));
	const focused = await setAt(eye.focus({ under }, { aperture: OPENED }), OPENING_IN_SMALL, 1);
	const turnedUnderIt = await setAt(lean(TURNED_AWAY), focused, 1);
	const onTheBlock: Focus = { kind: 'spot', holder: ON_THE_PAGE, point: UNDER_THE_LINE, depth: 0 };
	expect([focusedAtIn(focused), focusedAtIn(turnedUnderIt)]).toEqual([
		expect.closeTo(FOCAL_LENGTH),
		expect.closeTo(focusDistanceOf(onTheBlock, turnedCamera, SMALL.frame))
	]);
});

test("a focus under a point off the frame is refused as the move is made, and under one where the eye sees past the window's plane as it begins", async () => {
	const lyingBack = await setAt(lean(LYING_FAR_BACK), OPENING_IN_SMALL, 1);
	expect(() => eye.focus({ under: { left: 1.2, top: 0.5 } })).toThrow(
		new FilmError("eye.focus's focus's under's left is 1.2: it is a number from 0 to 1")
	);
	await expect(setAt(eye.focus({ under: { left: 0.5, top: 0 } }), lyingBack, 1)).rejects.toThrow(
		new FilmError(
			"eye.focus focuses under a point of the frame where the eye sees past the window's plane: focus under a point where it sees that plane"
		)
	);
});

test('a piece in the world rolled about its foot, carried onto the page, stands where it stood as it sets off and still turns about its foot', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const rolled = await setIn(piece.lean({ roll: 30, about: 'bottom' }), lifted, 1, FULL_HD);
	const settingOff = await setIn(piece.onto('#other'), rolled, 0, FULL_HD);
	expect([drawnObjectsIn(settingOff, FULL_HD)[0]!.inTheEyesSpace, settingOff.objects.get('piece')!.about]).toEqual([
		closeToMatrix(drawnObjectsIn(rolled, FULL_HD)[0]!.inTheEyesSpace),
		FOOT_MIDDLE
	]);
});

// Words beside a part: to an object's right, the point a fifth down its right side, 70 pixels of a 1080 frame off it,
// their middle at the left of their box; over a block's top, its left corner, 30 off it, their foot at their box's
const BESIDE_THE_PIECE = { object: 'piece', side: 'right', along: 0.2, gap: 70 } as const;
const THE_PIECES_POINT: Point = { left: 1, top: 0.2 };
const WORDS_READ_FROM: Point = { left: 0, top: 0.5 };
const OVER_THE_CARD = { part: '#card', side: 'top', along: 0, gap: 30 } as const;
const WORDS_FOOT_FROM: Point = { left: 0, top: 1 };

/** Where a point of an object of a scene shot full HD, in shares of its box, is drawn on the frame. */
function drawnPointInFullHd(scene: Scene, name: string, share: Point): Point {
	return drawnOnTheFrame(scene.objects.get(name)!, holdersIn(scene, cameraOf(scene, FULL_HD)), FULL_HD.frame, share);
}

/** A point of the frame moved across and down by so many pixels. */
function movedBy(point: Point, across: number, down: number): Point {
	return { left: point.left + across, top: point.top + down };
}

test("a title beside an object stands on the frame, reading from so far right of the point of the object's right side the film names, level with it, as the object is lifted toward the eye and the eye moves", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const beside = await setIn(title.show('what you asked', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	const raised = await setIn(piece.effects({ depth: 100 }), beside, 1, FULL_HD);
	const aside = await setIn(eye.to(EYE_ASIDE), raised, 1, FULL_HD);
	const scenes = [beside, raised, aside];
	expect([
		...scenes.map((scene) => drawnPointInFullHd(scene, 'title', WORDS_READ_FROM)),
		drawnObjectsIn(aside, FULL_HD)[1]!.standsIn
	]).toEqual([
		...scenes.map((scene) => closeToPoint(movedBy(drawnPointInFullHd(scene, 'piece', THE_PIECES_POINT), 70, 0))),
		'frame'
	]);
});

test("a title over a block of the page stands its foot so far above the block's top, reading from its corner, as the camera shows the block wherever the window and the eye stand", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const over = await setIn(title.show('asked here', { beside: OVER_THE_CARD }), wide, 1, FULL_HD);
	const near = await setIn(windowTo(MIDDLE_HALF, { depth: 100 }), over, 1, FULL_HD);
	const aside = await setIn(eye.to(EYE_ASIDE), near, 1, FULL_HD);
	const scenes = [over, near, aside];
	const cardsCorner = { left: CARD.left, top: CARD.top };
	const words = drawnObjectsIn(aside, FULL_HD)[0]!.content as DrawnTitleWords;
	expect([
		...scenes.map((scene) => drawnPointInFullHd(scene, 'title', WORDS_FOOT_FROM)),
		[words.down, words.align]
	]).toEqual([
		...scenes.map((scene) =>
			closeToPoint(movedBy(onTheFrame(cameraOf(scene, FULL_HD), FULL_HD.frame, cardsCorner), 0, -30))
		),
		['foot', 'start']
	]);
});

test('a title beside an object goes with it, and with the group it stands in', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const beside = await setIn(title.show('what you asked', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	const grouped = await setIn(group.show(), wide, 1, FULL_HD);
	const coded = await setIn(code.show(THREE_LINES, { at: 'left', group: 'group' }), grouped, 1, FULL_HD);
	const besideCode = await setIn(
		title.show('lines', { beside: { ...BESIDE_THE_PIECE, object: 'code' } }),
		coded,
		1,
		FULL_HD
	);
	expect([
		[...(await setIn(piece.hide(), beside, 1, FULL_HD)).objects.keys()],
		[...(await setIn(group.hide(), besideCode, 1, FULL_HD)).objects.keys()]
	]).toEqual([[], []]);
});

test('a title beside a part is refused as its move is made where it names a place, what it stands in or how it reads as well, both a part and an object or neither, or itself', () => {
	const standsElsewhere = new FilmError(
		'title.show stands a title beside a part, on the frame off it: name no place, window, world or group as well'
	);
	const notOnePart = new FilmError(
		"title.show's beside names one part to stand beside: a part of the page, or an object"
	);
	expect(() => title.show('words', { beside: BESIDE_THE_PIECE, at: 'left' })).toThrow(standsElsewhere);
	expect(() => title.show('words', { beside: BESIDE_THE_PIECE, inside: 'world' })).toThrow(standsElsewhere);
	expect(() => title.show('words', { beside: BESIDE_THE_PIECE, group: 'group' })).toThrow(standsElsewhere);
	expect(() => title.show('words', { beside: BESIDE_THE_PIECE, align: 'center' })).toThrow(
		new FilmError('title.show reads a title beside a part from that part: name no align')
	);
	expect(() => title.show('words', { beside: { ...BESIDE_THE_PIECE, part: '#card' } })).toThrow(notOnePart);
	expect(() => title.show('words', { beside: { side: 'right', gap: 70 } })).toThrow(notOnePart);
	expect(() => title.show('words', { beside: BESIDE_THE_PIECE, as: 'piece' })).toThrow(
		new FilmError('title.show stands the piece beside itself: name another object')
	);
});

test('a title beside an object none of stands is refused as its move begins, and one standing beside a part is carried to no place', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const beside = await setIn(title.show('what you asked', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	await expect(setIn(title.show('words', { beside: BESIDE_THE_PIECE }), wide, 1, FULL_HD)).rejects.toThrow(
		new FilmError('title.show finds no piece on the screen')
	);
	await expect(setIn(title.to('left'), beside, 1, FULL_HD)).rejects.toThrow(
		new FilmError(
			"title.to's place is a place of the frame, and what stands beside a part stands off it: hide it, and show it at the place"
		)
	);
});

test('a title is refused as its move begins beside an object that stands beside it, straight or through another', async () => {
	const first = await setIn(title.show('one', { at: 'left', as: 'first' }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const second = await setIn(
		title.show('two', { beside: { ...BESIDE_THE_PIECE, object: 'first' }, as: 'second' }),
		first,
		1,
		FULL_HD
	);
	const third = await setIn(
		title.show('three', { beside: { ...BESIDE_THE_PIECE, object: 'second' }, as: 'third' }),
		second,
		1,
		FULL_HD
	);
	await expect(
		setIn(title.show('one', { beside: { ...BESIDE_THE_PIECE, object: 'second' }, as: 'first' }), second, 1, FULL_HD)
	).rejects.toThrow(
		new FilmError(
			'title.show stands the first beside the second, which stands beside the first, straight or through others: name an object that stands by itself'
		)
	);
	await expect(
		setIn(title.show('one', { beside: { ...BESIDE_THE_PIECE, object: 'third' }, as: 'first' }), third, 1, FULL_HD)
	).rejects.toThrow(
		new FilmError(
			'title.show stands the first beside the third, which stands beside the first, straight or through others: name an object that stands by itself'
		)
	);
});

// The far corner of a title's box, in shares of it; and the eye standing between the frame and a piece brought 100
// toward it, looking at the frame's middle, so the piece stands behind it
const FAR_CORNER: Point = { left: 1, top: 1 };
const EYE_BEFORE_THE_PIECE: EyePlace = { at: { across: 0, down: 0, out: 50 }, aim: { across: 0, down: 0, out: 0 } };

/** How far before the eye a point of an object of a scene shot full HD stands, in shares of its box, along its sight. */
function depthBeforeTheEyeInFullHd(scene: Scene, name: string, share: Point): number {
	const object = scene.objects.get(name)!;
	const holders = holdersIn(scene, cameraOf(scene, FULL_HD));
	const standing = placed(object, planeOf(object.inside, holders, FULL_HD.frame), FULL_HD.frame);
	return -carried(standing.inTheEyesSpace, fromItsMiddle(standing.laid, pointAt(boxOf(standing.laid), share))).out;
}

test("a title beside a piece handed into the world stands where the eye saw it, its words as they stood, square to the eye, as far before it as the piece's point", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const beside = await setIn(title.show('what you asked', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	const raised = await setIn(piece.effects({ depth: 100 }), beside, 1, FULL_HD);
	const aside = await setIn(eye.to(EYE_ASIDE), raised, 1, FULL_HD);
	const handed = await setIn(title.intoTheWorld(), aside, 1, FULL_HD);
	const drawnHanded = drawnObjectsIn(handed, FULL_HD)[1]!;
	const facing = waysAlongItsPlane(drawnHanded.inTheEyesSpace);
	expect([
		drawnHanded.standsIn,
		handed.objects.get('title')!.content,
		drawnPointInFullHd(handed, 'title', WORDS_READ_FROM),
		drawnPointInFullHd(handed, 'title', FAR_CORNER),
		[facing.across.out, facing.down.out],
		depthBeforeTheEyeInFullHd(handed, 'title', WORDS_READ_FROM)
	]).toEqual([
		'world',
		aside.objects.get('title')!.content,
		closeToPoint(drawnPointInFullHd(aside, 'title', WORDS_READ_FROM)),
		closeToPoint(drawnPointInFullHd(aside, 'title', FAR_CORNER)),
		[expect.closeTo(0), expect.closeTo(0)],
		expect.closeTo(depthBeforeTheEyeInFullHd(aside, 'piece', THE_PIECES_POINT))
	]);
});

test("a title on the frame handed into the world stands where the frame's plane stood before the eye, wherever the eye stands", async () => {
	const shown = await setIn(title.show('Words', { at: 'top' }), OPENING_IN_FULL_HD, 1, FULL_HD);
	const aside = await setIn(eye.to(EYE_ASIDE), shown, 1, FULL_HD);
	const handed = await setIn(title.intoTheWorld(), aside, 1, FULL_HD);
	const atRest = await setIn(title.intoTheWorld(), shown, 1, FULL_HD);
	const drawnHanded = drawnObjectsIn(handed, FULL_HD)[0]!;
	expect([
		drawnHanded.standsIn,
		drawnHanded.inTheEyesSpace,
		drawnObjectsIn(atRest, FULL_HD)[0]!.inTheEyesSpace
	]).toEqual([
		'world',
		closeToMatrix(drawnObjectsIn(aside, FULL_HD)[0]!.inTheEyesSpace),
		closeToMatrix(drawnObjectsIn(shown, FULL_HD)[0]!.inTheEyesSpace)
	]);
});

test('a title is handed into the world only from the frame or from beside a point the eye sees before it: in the world, the window or a group, or beside a point behind the eye, it is refused', async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const inTheWorld = await setIn(title.show('Words', { at: 'top', inside: 'world' }), wide, 1, FULL_HD);
	const inTheWindow = await setIn(title.show('Words', { at: MIDDLE_HALF, inside: 'window' }), wide, 1, FULL_HD);
	const grouped = await setIn(group.show(), wide, 1, FULL_HD);
	const inAGroup = await setIn(title.show('Words', { at: 'left', group: 'group' }), grouped, 1, FULL_HD);
	const lifted = await setIn(piece.show('#card', { inside: 'world' }), wide, 1, FULL_HD);
	const beside = await setIn(title.show('what you asked', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	const raised = await setIn(piece.effects({ depth: 100 }), beside, 1, FULL_HD);
	const pastThePiece = await setIn(eye.to(EYE_BEFORE_THE_PIECE), raised, 1, FULL_HD);
	await expect(setIn(title.intoTheWorld(), inTheWorld, 1, FULL_HD)).rejects.toThrow(
		new FilmError('title.intoTheWorld finds the title in the world already')
	);
	await expect(setIn(title.intoTheWorld(), inTheWindow, 1, FULL_HD)).rejects.toThrow(
		new FilmError('title.intoTheWorld would carry the title out of the window into the world: it stands in the window')
	);
	await expect(setIn(title.intoTheWorld(), inAGroup, 1, FULL_HD)).rejects.toThrow(
		new FilmError('title.intoTheWorld would carry the title out of its group into the world: it goes with its group')
	);
	await expect(setIn(title.intoTheWorld(), pastThePiece, 1, FULL_HD)).rejects.toThrow(
		new FilmError(
			'title.intoTheWorld would stand the title as far before the eye as the point it stands beside, which stands at the eye or behind it: hand it over while the eye sees that point'
		)
	);
});

// The block of the page whose scroll carries a piece riding it; how far the film scrolls it before the piece is lifted
// and after, in the page's pixels; and the camera at 2, which shows a pixel of the screen as two of the frame's
const COLUMN = '#column';
const SCROLLED_BEFORE = 50;
const SCROLLED_AFTER = 30;
const FRAME_PIXELS_A_SCREEN_PIXEL = 2;
const RIDING_THE_COLUMN = { inside: 'world', rides: COLUMN, hole: {} } as const;

/** The scene a scroll of the column so many pixels down sets at its end, begun on a scene shot full HD. */
async function columnScrolled(scene: Scene, pixels: number): Promise<Scene> {
	const beginning = { ...beginningIn(scene, FULL_HD), page: new PageScrollingBy(PAGE.boxes, pixels) };
	return (await scrollBy(COLUMN, { pixels }).begin(beginning))(scene, 1);
}

/** A scene shot full HD, the camera at 2 on the screen's middle, the column scrolled, a piece lifted riding it. */
async function liftedRiding(): Promise<Scene> {
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const scrolledFirst = await columnScrolled(close, SCROLLED_BEFORE);
	return setIn(piece.show('#other', RIDING_THE_COLUMN), scrolledFirst, 1, FULL_HD);
}

test("a piece lifted in the world riding a block's scroll is carried up the frame as far as the film scrolls the block after it is lifted, as the camera showed the page, its hole, what it shows and words beside it with it; one riding none keeps its place", async () => {
	const lifted = await liftedRiding();
	const beside = await setIn(title.show('what it did', { beside: BESIDE_THE_PIECE }), lifted, 1, FULL_HD);
	const still = await setIn(piece.show('#other', { inside: 'world', as: 'still' }), beside, 1, FULL_HD);
	const scrolled = await columnScrolled(still, SCROLLED_AFTER);
	const carriedUp = -SCROLLED_AFTER * FRAME_PIXELS_A_SCREEN_PIXEL;
	const sourceNow = { ...OTHER, top: OTHER.top - SCROLLED_AFTER };
	const drawnNow = drawnSceneIn(scrolled, FULL_HD);
	expect([
		cornersDrawnIn(scrolled),
		drawnPointInFullHd(scrolled, 'title', WORDS_READ_FROM),
		drawnNow.holes[0]!.box,
		(drawnNow.objects[0]!.content as DrawnPiece).source,
		drawnPointInFullHd(scrolled, 'still', BOX_MIDDLE)
	]).toEqual([
		cornersDrawnIn(still).map((corner) => closeToPoint(movedBy(corner, 0, carriedUp))),
		closeToPoint(movedBy(drawnPointInFullHd(still, 'title', WORDS_READ_FROM), 0, carriedUp)),
		sourceNow,
		sourceNow,
		closeToPoint(drawnPointInFullHd(still, 'still', BOX_MIDDLE))
	]);
});

test("a piece riding a block's scroll carried to a place stands there however far the block is scrolled, and goes back over its source where the block stands now", async () => {
	const lifted = await liftedRiding();
	const scrolled = await columnScrolled(lifted, SCROLLED_AFTER);
	const carried = await setIn(piece.to(UPPER_LEFT), scrolled, 1, FULL_HD);
	const back = await setIn(piece.back(), carried, 1, FULL_HD);
	const close = await setIn(cameraTo(MIDDLE_AT_TWO), OPENING_IN_FULL_HD, 1, FULL_HD);
	const ridingNone = await setIn(piece.show('#other', { inside: 'world' }), close, 1, FULL_HD);
	const carriedRidingNone = await setIn(piece.to(UPPER_LEFT), ridingNone, 1, FULL_HD);
	expect([cornersDrawnIn(carried), cornersDrawnIn(back)]).toEqual([
		cornersDrawnIn(carriedRidingNone).map(closeToPoint),
		cornersDrawnIn(scrolled).map(closeToPoint)
	]);
});

test("a piece rides a block's scroll in the world alone: on the frame or in a group it is refused as its move is made", () => {
	const inTheWorldAlone = new FilmError(
		"piece.show rides a block's scroll inside the world alone: name inside: 'world'"
	);
	expect(() => piece.show('#card', { rides: COLUMN })).toThrow(inTheWorldAlone);
	expect(() => piece.show('#card', { rides: COLUMN, group: 'stack' })).toThrow(inTheWorldAlone);
});
