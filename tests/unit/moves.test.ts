import { CubicBezierCurve3, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { AS_PLACED, FACE_ON } from '../../src/domain/stance.ts';
import { type Camera, onTheFrame, placedIn, underTheFrame, wholeView, windowView } from '../../src/domain/camera.ts';
import { type EyePlace, type Focus, eyeAtRest } from '../../src/domain/eye.ts';
import * as eye from '../../src/moves/eye.ts';
import { linear } from '../../src/domain/curves.ts';
import { FilmError } from '../../src/domain/errors.ts';
import type { Format } from '../../src/domain/format.ts';
import {
	type Box,
	type Point,
	boxOf,
	boxToward,
	cornersOf,
	distanceBetween,
	frameScaleOf,
	middleX,
	middleY
} from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';
import { type Beginning, type Move, ownPagesOf } from '../../src/direction/move.ts';
import { play } from '../../src/direction/steps.ts';
import { onto, to as cameraTo } from '../../src/moves/camera.ts';
import * as group from '../../src/moves/group.ts';
import * as lens from '../../src/moves/lens.ts';
import * as outline from '../../src/moves/outline.ts';
import * as piece from '../../src/moves/piece.ts';
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
	shows as screenShows,
	sweep as screenSweep
} from '../../src/moves/screen.ts';
import * as callout from '../../src/moves/callout.ts';
import * as caption from '../../src/moves/caption.ts';
import * as code from '../../src/moves/code.ts';
import * as ending from '../../src/moves/ending.ts';
import { type DrawnObject, type Surroundings, drawnObject, drawnOnTheFrame } from '../../src/props/object.ts';
import { type Sharpness, focusDistanceOf } from '../../src/domain/focus.ts';
import { IN_THE_WINDOW, ON_THE_PAGE } from '../../src/domain/placement.ts';
import type { Piece } from '../../src/props/piece.ts';
import { SCREEN_UP } from '../../src/props/screen.ts';
import type { DrawnWindow } from '../../src/props/window.ts';
import { ONE_FRAME, pastTheEdge, windowPlaced, wordsPlaced } from '../../src/domain/place.ts';
import * as keys from '../../src/moves/keys.ts';
import * as look from '../../src/moves/look.ts';
import * as note from '../../src/moves/note.ts';
import { speed } from '../../src/moves/page.ts';
import * as pin from '../../src/moves/pins.ts';
import * as thing from '../../src/moves/thing.ts';
import * as title from '../../src/moves/title.ts';
import * as world from '../../src/moves/world.ts';
import type { DrawnThing } from '../../src/props/thing.ts';
import { drawnLighting } from '../../src/props/lighting.ts';
import { ITS_MIDDLE, type Matrix, carried, chained } from '../../src/domain/matrix.ts';
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
import { keystrokes } from '../../src/domain/typing.ts';
import type { TerminalLine } from '../../src/props/terminal.ts';
import { NO_EFFECTS } from '../../src/props/effects.ts';
import { OWN_WAY } from '../../src/props/way.ts';
import { appearedOf, comingUpIn, groundOf, saidOf } from '../../src/props/words.ts';
import {
	type DrawnScene,
	type Scene,
	cameraOf,
	drawn,
	frameShiftBetween,
	openingScene,
	partsAskedSharperIn,
	pictureZoomsIn,
	withObject,
	withProp
} from '../../src/scene.ts';
import { FOCAL_LENGTH, PageOfBoxes, PicturesHeld, SMALL } from './fakes.ts';

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
// The scene a film shot in that format opens on: livereel's look and world, the eye of its focal length at rest
const OPENING_IN_FULL_HD = openingScene(FULL_HD, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH);
// A page of the film's own
const OWN_PAGE = { html: '<p id="card">Ours</p>' };
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
// How a group stands as it was placed refuses an object joining it otherwise
const JOINS_THE_STACK_PLACED =
	'code.show joins the group "stack" only while it stands as it was placed: face-on by whole turns, as large as its box, on the frame\'s plane';

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
		thingsBuilt: THINGS_BUILT
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
	const holders = { camera: cameraOf(scene, SMALL), groups: scene.groups };
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

test("the world's look moves to the values named and keeps the rest: its glow through the strengths between, its lights changed half-way", async () => {
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

test("the world's look in no form of one is refused as its move is made, where it stands: none, a glow of a strength below none, a value of the film's look by its name", () => {
	expect(() => world.to(null as never)).toThrow(
		new FilmError('world.to is handed null for an object of lights, softBoxes, bloom, bloomRadius')
	);
	expect(() => world.to({ bloom: -1 })).toThrow(
		new FilmError(
			"world.to's bloom is -1: it is how strongly light past white glows, a number, 0 or more, as three's bloom takes it"
		)
	);
	expect(() => world.to({ ground: '#000' } as never)).toThrow(
		new FilmError('world.to names ground: it names lights, softBoxes, bloom, bloomRadius, or fewer')
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

test("a callout's and a note's words come up in the theme's way", async () => {
	const blurred = openingScene(SMALL, { ...LIVEREELS_LOOK, words: 'blur' }, LIVEREELS_WORLD, FOCAL_LENGTH);
	const windowed = withProp(blurred, 'window', placedIn(windowView({ left: 300, top: 20, width: 80, height: 60 })));
	const pointed = await setAt(callout.show('#reaching-below', 'Here'), blurred, 0.5);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 0.5);
	expect([pointed.callout?.comingUp, noted.note?.comingUp]).toEqual([
		{ kind: 'word by word', way: 'blur' },
		{ kind: 'word by word', way: 'blur' }
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
		{ kind: 'piece', source: SHOWN_AT_TWO, corners: SQUARE_CORNERS, hole: null, lines: null, picture: FOLLOWING }
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
		{ kind: 'piece', source: SHOWN_AT_TWO, corners: SQUARE_CORNERS, hole: null, lines: null, picture: FOLLOWING },
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
		expect.objectContaining({ laidIn: 'window', box: closeToBox({ left: 720, top: 330, width: 100, height: 60 }) })
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

test('a piece is carried onto the page only from the frame, lying flat there, while the window faces the frame front on: leant, turned over or near, in a group, or under a leant window, it is refused', async () => {
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
		frameShiftBetween(await begun(OPENING_IN_FULL_HD, 0.25), await begun(OPENING_IN_FULL_HD, 0.5), FULL_HD)
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
	expect(frameShiftBetween(await begun(atTheMiddle, 0.25), await begun(lower, 0.28), FULL_HD)).toBeCloseTo(106.42);
});

test("a band sweeping the screen moves on the frame as far as it crosses the window, so a fast one is drawn at moments of a frame's time", async () => {
	// The whole screen, 1920 × 1080, on a frame as large, the band 160 wide: from 80 past the window's left side to 80
	// past its right, 2080 in all, a quarter of it 520
	const begun = await screenSweep({ slant: 0 }).begin(
		beginningHolding(OPENING_IN_FULL_HD, FULL_HD, new PicturesHeld())
	);
	expect(
		frameShiftBetween(await begun(OPENING_IN_FULL_HD, 0.25), await begun(OPENING_IN_FULL_HD, 0.5), FULL_HD)
	).toBeCloseTo(520);
});

test("a piece, a lens and a sweep of the screen are refused while the screen shows the film's own page, as they are drawn from the filmed page's picture", async () => {
	const own = await setIn(screenShows(OWN_PAGE), OPENING_IN_FULL_HD, 1, FULL_HD);
	await expect(async () => piece.show('#card').begin(beginningIn(own, FULL_HD))).rejects.toThrow(
		ownPageRefusal('piece.show')
	);
	await expect(async () => lens.show('#card').begin(beginningIn(own, FULL_HD))).rejects.toThrow(
		ownPageRefusal('lens.show')
	);
	await expect(async () => screenSweep().begin(beginningIn(own, FULL_HD))).rejects.toThrow(
		ownPageRefusal('screen.sweep')
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
			picture: DRAWN_FROM_THE_PAGE
		},
		[{ part: PAST_THE_SHOWN_EDGE, zoom: 19.2 }],
		[],
		[2.2]
	]);
});

test("a piece lifted with a hole leaves on the screen, where it was lifted, the ground the page draws behind its block or the film's colour, ringed in the line the film names, as far as the piece has come and not gone", async () => {
	const wide = await setIn(cameraTo(WHOLE_AT_ONE), OPENING_IN_FULL_HD, 1, FULL_HD);
	const coming = await setIn(piece.show('#card', { hole: {} }), wide, 0.5, FULL_HD);
	const area = piece.show(OTHER, { hole: { ground: '#112233', line: 'dashed' }, as: 'area' });
	const both = await setIn(area, coming, 1, FULL_HD);
	expect(drawn(both, cameraOf(both, FULL_HD), 0, FULL_HD, NONE_SHARPER).holes).toEqual([
		{ name: 'piece', box: CARD, ground: CARDS_GROUND, line: null, corner: 0, shown: 0.5 },
		{ name: 'area', box: OTHER, ground: '#112233', line: 'dashed', corner: 0, shown: 1 }
	]);
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

test('an object joins a group only as it comes, while the group stands as it was placed: none standing, or one leant, grown or brought near, is refused, one spun whole turns round, or half turns that cancel, taken', async () => {
	const grouped = await setAt(group.show({ as: 'stack' }), OPENING_IN_SMALL, 1);
	const joining = code.show(THREE_LINES, { at: 'left', group: 'stack' });
	const unplaced = await Promise.all(
		[
			group.lean({ as: 'stack', tilt: 10 }),
			group.to('whole', { as: 'stack', scale: 1.5 }),
			group.to('whole', { as: 'stack', depth: 100 })
		].map((move) => setAt(move, grouped, 1))
	);
	const spun = await Promise.all(
		[
			group.lean({ as: 'stack', turn: 360, roll: -360 }),
			group.lean({ as: 'stack', tilt: 180, turn: 180, roll: 180 })
		].map((move) => setAt(move, grouped, 1))
	);
	await expect(async () => joining.begin(beginningOf(OPENING_IN_SMALL))).rejects.toThrow(
		new FilmError('code.show finds no group "stack" standing')
	);
	await Promise.all(
		unplaced.map((scene) =>
			expect(async () => joining.begin(beginningOf(scene))).rejects.toThrow(new FilmError(JOINS_THE_STACK_PLACED))
		)
	);
	const joined = await Promise.all(spun.map((scene) => setAt(joining, scene, 1)));
	expect(joined.map((scene) => scene.objects.get('code')!.inside)).toEqual([
		{ kind: 'group', name: 'stack', zIndex: null },
		{ kind: 'group', name: 'stack', zIndex: null }
	]);
});

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
	expect(frameShiftBetween(joined, rolled, SMALL)).toBeCloseTo(farthest);
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

test('the page is shaded as far as its move has come toward the values the film names, the rest as they stood, and stays so as the window travels; one shaded none is drawn with no shade', async () => {
	const dimming = await setAt(windowShade({ dim: 0.6 }), OPENING_IN_SMALL, 0.5);
	const blurred = await setAt(windowShade({ blur: 8, fade: 0.5 }), dimming, 1);
	const travelled = await setAt(windowTo('right'), blurred, 1);
	const cleared = await setAt(windowShade({ dim: 0, fade: 0, blur: 0 }), travelled, 1);
	expect(
		[OPENING_IN_SMALL, dimming, blurred, travelled, cleared].map(
			(scene) => drawn(scene, cameraOf(scene, SMALL), 0, SMALL, NONE_SHARPER).window.shade
		)
	).toEqual([
		null,
		{ dim: 0.3, fade: 0, blur: 0 },
		{ dim: 0.3, fade: 0.5, blur: 8 },
		{ dim: 0.3, fade: 0.5, blur: 8 },
		null
	]);
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
	expect(frameShiftBetween(noted, moved, SMALL)).toBeCloseTo(wordsMoved);
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
	expect([masked.content.words.map((word) => word.appeared), leaving.content.gone]).toEqual([[1, 1], 0]);
});

test('an object coming up in its own way is on no way, its words coming up one after another', async () => {
	const own = drawnObjectsIn(await setAt(title.show('Two words'), OPENING_IN_SMALL, 0.5), SMALL)[0]!;
	expect([own.content.words.map((word) => word.appeared), own.onItsWay]).toEqual([
		[appearedOf(0.5, 0, 2), appearedOf(0.5, 1, 2)],
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

test('a title in the world nearer than the focus is blurred in its own pixels, the less the larger it is drawn; what rides on the frame stays sharp', async () => {
	const near = await withNearTitles(OPENING_IN_SMALL);
	const onThePage = await setAt(eye.focus('#block', { aperture: OPENED }), near, 1);
	expect(outOfFocusIn(onThePage)).toEqual([null, expect.closeTo(A_QUARTER_OF_THE_DISC / 2), null]);
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

test('the room is handed how the eye sees as the frame is drawn: focused as far as the block it is put on stands, its focal length and how wide it is open', async () => {
	const leant = await setAt(lean({ tilt: 50 }), OPENING_IN_SMALL, 1);
	const onTheBlock = await setAt(eye.focus('#block', { aperture: OPENED }), leant, 1);
	const camera = cameraOf(onTheBlock, SMALL);
	const blockMiddle: Focus = {
		kind: 'spot',
		holder: ON_THE_PAGE,
		point: { left: BLOCK.left + BLOCK.width / 2, top: BLOCK.top + BLOCK.height / 2 },
		depth: 0
	};
	expect(drawn(onTheBlock, camera, 0, SMALL, NONE_SHARPER).sharpness).toEqual({
		focusedAt: expect.closeTo(focusDistanceOf(blockMiddle, camera, SMALL.frame)),
		focalLength: FOCAL_LENGTH,
		aperture: OPENED
	});
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
		'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; or an object, { object }';
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

/**
 * Whether the piece of a scene shot full HD is drawn with its middle on the frame where the camera shows its source's
 * middle, to the pixel.
 */
function drawnOverItsSource(scene: Scene): boolean {
	const camera = cameraOf(scene, FULL_HD);
	const lifted = scene.objects.get('piece')!;
	const source = (lifted.content as Piece).source;
	const drawnMiddle = drawnOnTheFrame(lifted, { camera, groups: scene.groups }, FULL_HD.frame, BOX_MIDDLE);
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
	expect([inTheWorld!.rides, ridingTheEye!.rides]).toEqual(['world', 'eye']);
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
