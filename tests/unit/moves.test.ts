import { expect, test } from 'vitest';
import { type Camera, onTheFrame, placedIn, underTheFrame, wholeView, windowView } from '../../src/domain/camera.ts';
import { FilmError } from '../../src/domain/errors.ts';
import { type Point, boxOf, boxToward, frameScaleOf, middleX, middleY } from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';
import type { Beginning, Move } from '../../src/direction/move.ts';
import { onto } from '../../src/moves/camera.ts';
import { hide as windowHide, show as windowShow, to as windowTo } from '../../src/moves/window.ts';
import { lower, rise } from '../../src/moves/screen.ts';
import { drawnTitle } from '../../src/props/title.ts';
import * as callout from '../../src/moves/callout.ts';
import * as caption from '../../src/moves/caption.ts';
import * as code from '../../src/moves/code.ts';
import * as ending from '../../src/moves/ending.ts';
import { drawnCode } from '../../src/props/code.ts';
import { pastTheEdge, wordsPlaced } from '../../src/domain/place.ts';
import * as keys from '../../src/moves/keys.ts';
import * as look from '../../src/moves/look.ts';
import * as note from '../../src/moves/note.ts';
import * as pin from '../../src/moves/pins.ts';
import * as title from '../../src/moves/title.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { drawnNote } from '../../src/props/note.ts';
import { drawnPins } from '../../src/props/pins.ts';
import { press, release, to as cursorTo } from '../../src/moves/cursor.ts';
import { off, on as lightOn, to as lightTo } from '../../src/moves/light.ts';
import { leave, open, submit, works } from '../../src/moves/terminal.ts';
import type { TerminalLine } from '../../src/props/terminal.ts';
import { saidOf } from '../../src/props/words.ts';
import { type Scene, cameraOf, openingScene, withProp } from '../../src/scene.ts';
import { PageOfBoxes, SMALL } from './fakes.ts';

const BLOCK = { left: 100, top: 100, width: 100, height: 40 };
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
		['#wide', WIDE]
	])
);
const SCROLLED_IN = "scroll it in with page.scrollTo, ending before this move's share begins";
const ACTED_IN = 'bring it in with an act, as no move of livereel scrolls the page sideways';
const LIT = { box: BLOCK, strength: 1, dim: 0.6 };
const TYPED = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'terminal', {
	title: 'A terminal',
	lines: [],
	typed: 'add a test',
	shown: 1
});
const READ: TerminalLine = { kind: 'work', text: 'Read app.py' };
const SAID: TerminalLine = { kind: 'said', text: 'Done.' };
const THINKING = 'Working…';
const THREE_LINES = 'play({\n\tmoves: [camera.onto(VISITORS)]\n})';

function beginningOf(scene: Scene): Beginning {
	return { scene, page: PAGE, format: SMALL };
}

/** The scene a move sets, begun on a scene, at a progress of its way. */
async function setAt(move: Move, scene: Scene, progress: number): Promise<Scene> {
	const change = await move.begin(beginningOf(scene));
	return change(scene, progress);
}

test('a callout points at what the screen shows of its block, on the side the film names', async () => {
	const pointing = (
		await setAt(callout.show('#reaching-below', 'Here', { side: 'below' }), openingScene(SMALL, LIVEREELS_LOOK), 1)
	).callout;
	expect([pointing?.box, pointing?.side]).toEqual([SHOWN_BELOW, 'below']);
});

test('a look moves to the values named and keeps the rest; a ground named alone takes its glow with it', async () => {
	const looked = await setAt(look.to({ ground: '#ffffff', titleSize: 120 }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	expect(looked.look).toEqual({ ...LIVEREELS_LOOK, ground: '#ffffff', glow: '#ffffff', titleSize: 120 });
});

test('a look in no form of one is refused as its move is made, where it stands: none, a colour not in hex', () => {
	expect(() => look.to(null as never)).toThrow(FilmError);
	expect(() => look.to({ ground: 'navy' })).toThrow(
		new FilmError(`look.to's ground is "navy": it is a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa`)
	);
});

test('the light is carried or put out only where one is on', async () => {
	const unlit = beginningOf(openingScene(SMALL, LIVEREELS_LOOK));
	await expect(async () => lightTo('#block').begin(unlit)).rejects.toThrow(FilmError);
	await expect(async () => off().begin(unlit)).rejects.toThrow(FilmError);
});

test('what is put away — the light, a callout, pins, a note, a title, a caption, keys, code, the terminal, the ending — is gone at its end', async () => {
	const said = saidOf('Words');
	const lit = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'light', LIT);
	const pointed = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'callout', {
		...said,
		box: BLOCK,
		side: 'above',
		shown: 1,
		gone: 0
	});
	const pinned = await setAt(pin.show('#block', 'Here'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const beside = { side: 'left', box: BLOCK } as const;
	const noted = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'note', {
		...said,
		box: BLOCK,
		beside,
		shown: 1,
		gone: 0
	});
	const titled = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'title', { ...said, box: null, shown: 1, gone: 0 });
	const captioned = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'caption', { ...said, shown: 1, gone: 0 });
	const pressed = await setAt(keys.show(['⌘', 'K']), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const carded = await setAt(
		ending.show({ name: 'livereel', line: 'Film your app', command: 'npx livereel' }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
	expect([
		(await setAt(off(), lit, 1)).light,
		(await setAt(callout.hide(), pointed, 1)).callout,
		(await setAt(pin.clear(), pinned, 1)).pins,
		(await setAt(note.hide(), noted, 1)).note,
		(await setAt(title.hide(), titled, 1)).title,
		(await setAt(caption.hide(), captioned, 1)).caption,
		(await setAt(keys.hide(), pressed, 1)).keys,
		(await setAt(code.hide(), coded, 1)).code,
		(await setAt(leave(), TYPED, 1)).terminal,
		(await setAt(ending.hide(), carded, 1)).ending
	]).toEqual([null, null, null, null, null, null, null, null, null, null]);
});

test('code and a title stand in the places the film names, the title then with no ground of its own', async () => {
	const heading = { of: 'left', height: 0.2 } as const;
	const below = { of: 'left', top: 0.25, height: 0.75 } as const;
	const titled = await setAt(title.show('Here', { at: heading }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const coded = (await setAt(code.show('light.on(VISITORS)', { at: below }), titled, 1)).code!;
	expect([titled.title!.box, drawnTitle(titled.title!).ground, coded.box]).toEqual([
		wordsPlaced(SMALL, heading),
		0,
		wordsPlaced(SMALL, below)
	]);
});

test('a title and code move to another place through the boxes between', async () => {
	const titled = await setAt(title.show('Here', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), titled, 1);
	const halfWay = await setAt(title.to('right'), await setAt(code.to('bottom'), coded, 0.5), 0.5);
	expect([halfWay.title!.box, halfWay.code!.box]).toEqual([
		boxToward(wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'right'), 0.5),
		boxToward(wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'bottom'), 0.5)
	]);
});

test("a title travelling to a place of another size takes that place's size as it sets off, so its words wrap once, and travels its middle along the way", async () => {
	const titled = await setAt(title.show('Here', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const [start, end] = [wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'bottom')];
	const setOff = (await setAt(title.to('bottom'), titled, 0)).title!.box!;
	const halfWay = (await setAt(title.to('bottom'), titled, 0.5)).title!.box!;
	expect([setOff, [halfWay.width, halfWay.height, middleY(halfWay)]]).toEqual([
		{ left: start.left, top: middleY(start) - end.height / 2, width: end.width, height: end.height },
		[end.width, end.height, (middleY(start) + middleY(end)) / 2]
	]);
});

test('a title or code shown from a side slides in whole from a frame past its place, and one hidden toward a side slides out as far, then is gone', async () => {
	const place = wordsPlaced(SMALL, 'left');
	const coming = (
		await setAt(title.show('Here', { at: 'left', from: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 0)
	).title!;
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const leaving = (await setAt(code.hide({ toward: 'top' }), coded, 0.5)).code!;
	const left = await setAt(code.hide({ toward: 'top' }), coded, 1);
	expect([coming.box, coming.shown, leaving.box, left.code]).toEqual([
		pastTheEdge(place, 'right', SMALL.frame),
		1,
		boxToward(place, pastTheEdge(place, 'top', SMALL.frame), 0.5),
		null
	]);
});

test('a title or code shown from a side while one stands in a place pushes it off past the side across, as one sheet, and it is gone at the end', async () => {
	const [left, right] = [wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'right')];
	const titled = await setAt(title.show('Here', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), titled, 1);
	const halfWay = await setAt(
		title.show('Next', { at: 'right', from: 'right' }),
		await setAt(code.show('cursor.to(REFRESH)', { at: 'right', from: 'right' }), coded, 0.5),
		0.5
	);
	const pushed = await setAt(title.show('Next', { at: 'right', from: 'right' }), coded, 1);
	expect([
		halfWay.title!.box,
		halfWay.title!.pushedOff!.box,
		halfWay.code!.pushedOff!.box,
		pushed.title!.pushedOff
	]).toEqual([
		boxToward(pastTheEdge(right, 'right', SMALL.frame), right, 0.5),
		boxToward(left, pastTheEdge(left, 'left', SMALL.frame), 0.5),
		boxToward(left, pastTheEdge(left, 'left', SMALL.frame), 0.5),
		null
	]);
});

test('the ending card slides in whole from past a side of the frame, and out past one, then is gone', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const coming = await setAt(ending.show(card, { from: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 0);
	const shown = await setAt(ending.show(card), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const leaving = await setAt(ending.hide({ toward: 'left' }), shown, 0.5);
	const gone = await setAt(ending.hide({ toward: 'left' }), shown, 1);
	expect([coming.ending, leaving.ending, gone.ending]).toEqual([
		{ card, shown: 1, shift: { left: SMALL.frame.width, top: 0 } },
		{ card, shown: 1, shift: { left: -SMALL.frame.width / 2, top: 0 } },
		null
	]);
});

test('a title over the whole frame is refused a move in from a side as it is made, and a move to a place or toward a side as it begins', async () => {
	expect(() => title.show('Here', { from: 'left' })).toThrow(FilmError);
	const whole = await setAt(title.show('Here'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	await expect(async () => title.to('left').begin(beginningOf(whole))).rejects.toThrow(FilmError);
	await expect(async () => title.hide({ toward: 'left' }).begin(beginningOf(whole))).rejects.toThrow(FilmError);
});

test('a title in a place reads from the left, centred where it stands above, below or over the whole, unless the film names its way', async () => {
	const alignOf = async (script: title.TitleScript) =>
		(await setAt(title.show('Here', script), openingScene(SMALL, LIVEREELS_LOOK), 1)).title!.align;
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
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const lit = (await setAt(code.light(2, { through: 3 }), coded, 1)).code!;
	expect([lit.lines.map((line) => line.lit), drawnCode(lit).dimmed]).toEqual([[0, 1, 1], 1]);
});

test('while the light moves from one line to another, the lines not lit stay dimmed', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const first = await setAt(code.light(1), coded, 1);
	expect(drawnCode((await setAt(code.light(2), first, 0.5)).code!).dimmed).toBe(1);
});

test('lines lit past the last of the code, or with no code shown, are refused as the move begins', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	await expect(async () => code.light(3, { through: 4 }).begin(beginningOf(coded))).rejects.toThrow(FilmError);
	await expect(async () => code.light(1).begin(beginningOf(openingScene(SMALL, LIVEREELS_LOOK)))).rejects.toThrow(
		FilmError
	);
});

test("pins are numbered along their path, the labels before the latest quietened, each running toward the view's middle, or over a wide block", async () => {
	const first = await setAt(pin.show('#block', 'Open it'), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		pose: { focusX: 300, focusY: 200, zoom: 1 / frameScaleOf(SMALL.frame), tilt: 0, turn: 0 },
		view: windowView({ left: 100, top: 100, width: 200, height: 200 })
	};
	const beside = { side: 'bottom', box: wordsOn(SMALL, 'bottom') } as const;
	const drawnOne = drawnNote({ ...saidOf('Here'), box: BLOCK, beside, shown: 1, gone: 0 }, camera, SMALL.frame);
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
		openingScene(SMALL, LIVEREELS_LOOK),
		'window',
		placedIn(windowView({ left: 300, top: 20, width: 80, height: 60 }))
	);
	const clearest = (await setAt(note.show('#block', 'Here'), windowed, 1)).note!;
	const named = (await setAt(note.show('#block', 'Here', { at: { of: 'left', height: 0.5 } }), windowed, 1)).note!;
	expect([clearest.beside, named.beside]).toEqual([
		{ side: 'bottom', box: wordsOn(SMALL, 'bottom') },
		{ side: 'left', box: wordsPlaced(SMALL, { of: 'left', height: 0.5 }) }
	]);
});

test('a note shown while the window moves stands beside where the window goes', async () => {
	const halfWay = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 0.5);
	const noted = (await setAt(note.show('#block', 'Here'), halfWay, 1)).note!;
	expect(noted.beside).toEqual({ side: 'left', box: wordsOn(SMALL, 'left') });
});

test('while a note stands the window stays beside it: a move of the window is refused as it begins', async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 1);
	await expect(async () => windowTo('left').begin(beginningOf(noted))).rejects.toThrow(FilmError);
	await expect(async () => windowHide({ toward: 'left' }).begin(beginningOf(noted))).rejects.toThrow(FilmError);
	await expect(async () => windowShow({ at: 'left', from: 'left' }).begin(beginningOf(noted))).rejects.toThrow(
		FilmError
	);
});

test('a note with no window to stand beside, with its words over the window, or beside a window off the frame, is refused as it begins', async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const offTheFrame = await setAt(windowHide({ toward: 'left' }), windowed, 1);
	await expect(async () =>
		note.show('#block', 'Here').begin(beginningOf(openingScene(SMALL, LIVEREELS_LOOK)))
	).rejects.toThrow(FilmError);
	await expect(async () => note.show('#block', 'Here', { at: 'whole' }).begin(beginningOf(windowed))).rejects.toThrow(
		FilmError
	);
	await expect(async () => note.show('#block', 'Here').begin(beginningOf(offTheFrame))).rejects.toThrow(FilmError);
});

test('what has nothing to start from is refused as it begins: a screen raised that is up, lowered that is down, a window hidden that is off the frame', async () => {
	const opening = openingScene(SMALL, LIVEREELS_LOOK);
	const lowered = await setAt(lower(), opening, 1);
	const offTheFrame = await setAt(windowHide({ toward: 'left' }), opening, 1);
	await expect(async () => rise().begin(beginningOf(opening))).rejects.toThrow(FilmError);
	await expect(async () => lower().begin(beginningOf(lowered))).rejects.toThrow(FilmError);
	await expect(async () => windowHide({ toward: 'left' }).begin(beginningOf(offTheFrame))).rejects.toThrow(FilmError);
});

test('the window moves to a place, lifted off the ground, and back over the whole frame, flat on it, however the whole frame is named', async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const halfWay = await setAt(windowTo('whole'), windowed, 0.5);
	const back = await setAt(windowTo('whole'), windowed, 1);
	const backAsABox = await setAt(windowTo({ of: 'whole' }), windowed, 1);
	expect([windowed, halfWay, back, backAsABox].map((scene) => cameraOf(scene, SMALL).view)).toEqual([
		windowView(windowOn(SMALL, 'right')),
		{ box: boxToward(windowOn(SMALL, 'right'), boxOf(SMALL.frame), 0.5), lift: 0.5 },
		wholeView(SMALL.frame),
		wholeView(SMALL.frame)
	]);
});

test('the window shown from a side slides in whole from a frame past its place, and one hidden toward a side slides out as far and stays there', async () => {
	const room = windowOn(SMALL, 'right');
	const coming = await setAt(windowShow({ at: 'right', from: 'bottom' }), openingScene(SMALL, LIVEREELS_LOOK), 0);
	const shown = await setAt(windowShow({ at: 'right', from: 'bottom' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const gone = await setAt(windowHide({ toward: 'left' }), shown, 1);
	expect([coming, shown, gone].map((scene) => cameraOf(scene, SMALL).view)).toEqual([
		windowView(pastTheEdge(room, 'bottom', SMALL.frame)),
		windowView(room),
		windowView(pastTheEdge(room, 'left', SMALL.frame))
	]);
});

test('the screen rises and goes down into the ground from where it stands, over its move', async () => {
	const halfDown = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'screen', { shown: 0.5 });
	expect([(await setAt(rise(), halfDown, 0.5)).screen, (await setAt(lower(), halfDown, 0.5)).screen]).toEqual([
		{ shown: 0.75 },
		{ shown: 0.25 }
	]);
});

test('a block the camera frames stands across the middle of whatever window stands: one moved after it, or in the same step, set before it or after', async () => {
	const opening = openingScene(SMALL, LIVEREELS_LOOK);
	const framing = await onto('#block').begin(beginningOf(opening));
	const moving = await windowTo('right').begin(beginningOf(opening));
	const cameraFirst = await moving(await framing(opening, 1), 1);
	const windowFirst = await framing(await moving(opening, 1), 1);
	const blockMiddle: Point = { left: middleX(BLOCK), top: middleY(BLOCK) };
	const windowMiddle = middleX(windowOn(SMALL, 'right'));
	expect(
		[cameraFirst, windowFirst].map((scene) => onTheFrame(cameraOf(scene, SMALL), SMALL.frame, blockMiddle).left)
	).toEqual([windowMiddle, windowMiddle]);
});

test('a block the camera frames in a window running off the frame stands at the middle of the part of the window on the frame', async () => {
	const offTheFoot = await setAt(
		windowTo({ left: 0.25, top: 0.6, width: 0.5, height: 0.8 }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
	const framed = await setAt(onto('#block', { air: 0, zoomAtMost: 10 }), offTheFoot, 1);
	const blockMiddle: Point = { left: middleX(BLOCK), top: middleY(BLOCK) };
	expect(onTheFrame(cameraOf(framed, SMALL), SMALL.frame, blockMiddle)).toEqual({
		left: expect.closeTo(200, 6),
		top: expect.closeTo(320, 6)
	});
});

test('a block framed in a window running off the frame keeps its place in the window as the window slides away', async () => {
	const offTheFoot = await setAt(
		windowTo({ left: 0.25, top: 0.6, width: 0.5, height: 0.8 }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
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
	const titled = await setAt(title.show('Here', { at: 'top' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const setOff = (await setAt(title.to('left'), titled, 0)).title!.box!;
	expect(middleX(setOff)).toEqual(middleX(wordsPlaced(SMALL, 'top')));
});

test('a cursor pressed goes in as the press goes on, and comes back out as it is let go', async () => {
	const pointed = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'cursor', { left: 10, top: 10, press: 0 });
	const pressed = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'cursor', { left: 10, top: 10, press: 1 });
	expect([
		(await setAt(press(), pointed, 0.4)).cursor?.press,
		(await setAt(release(), pressed, 0.25)).cursor?.press
	]).toEqual([0.4, 0.75]);
});

test('a terminal opened comes up as its move goes on, and one left goes as its move goes on', async () => {
	expect([
		(await setAt(open('A terminal'), openingScene(SMALL, LIVEREELS_LOOK), 0.25)).terminal?.shown,
		(await setAt(leave(), TYPED, 0.25)).terminal?.shown
	]).toEqual([0.25, 0.75]);
});

test('Enter puts the typed line up into the log, and the line is empty again', async () => {
	const terminal = (await setAt(submit(), TYPED, 1)).terminal;
	expect([terminal?.lines, terminal?.typed]).toEqual([[{ kind: 'asked', text: 'add a test' }], '']);
});

test('the agent thinks first, writes its lines one after another, and stops thinking once done', async () => {
	const work = works([READ, SAID], THINKING, { thinkingShare: 0.5 });
	const thinking: TerminalLine = { kind: 'thinking', text: THINKING };
	expect([
		(await setAt(work, TYPED, 0.25)).terminal?.lines,
		(await setAt(work, TYPED, 0.75)).terminal?.lines,
		(await setAt(work, TYPED, 1)).terminal?.lines
	]).toEqual([[thinking], [READ, thinking], [READ, SAID]]);
});

/** How a move refuses the block below the screen. */
function offBelow(move: string): FilmError {
	return new FilmError(
		`${move}'s #below stands off the page's screen, at left 100, top 900 of a screen 600 × 400: ${SCROLLED_IN}`
	);
}

test('every move that goes to a block refuses one standing off the screen as it begins, saying how to bring it in', async () => {
	const opening = beginningOf(openingScene(SMALL, LIVEREELS_LOOK));
	await expect(onto('#below').begin(opening)).rejects.toThrow(offBelow('camera.onto'));
	await expect(lightOn('#below').begin(opening)).rejects.toThrow(offBelow('light.on'));
	await expect(
		lightTo('#below').begin(beginningOf(withProp(openingScene(SMALL, LIVEREELS_LOOK), 'light', LIT)))
	).rejects.toThrow(offBelow('light.to'));
	await expect(cursorTo('#below').begin(opening)).rejects.toThrow(offBelow('cursor.to'));
});

test('a block off the screen is told by its side: scrolled in above, sideways brought in by an act; one half on it is framed', async () => {
	const opening = beginningOf(openingScene(SMALL, LIVEREELS_LOOK));
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
	await expect(onto('#hidden').begin(beginningOf(openingScene(SMALL, LIVEREELS_LOOK)))).rejects.toThrow(
		new FilmError("camera.onto's #hidden has no size on the page: it is hidden, or holds others alone")
	);
});

test('a cursor not yet on the screen comes in from below and to the right of where it goes', async () => {
	const start = (await setAt(cursorTo('#block'), openingScene(SMALL, LIVEREELS_LOOK), 0)).cursor;
	const end = (await setAt(cursorTo('#block'), openingScene(SMALL, LIVEREELS_LOOK), 1)).cursor;
	expect([start!.left > end!.left, start!.top > end!.top]).toEqual([true, true]);
});

test('a cursor comes to rest on what the screen shows of a block reaching off it, past any of its sides', async () => {
	const targets = ['#reaching-above', '#reaching-below', '#reaching-left', '#reaching-right'];
	const rests = await Promise.all(
		targets.map(async (target) => (await setAt(cursorTo(target), openingScene(SMALL, LIVEREELS_LOOK), 1)).cursor)
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
	return cameraOf(await setAt(onto(target), openingScene(SMALL, LIVEREELS_LOOK), 1), SMALL);
}

test('a camera onto a block reaching off the screen frames what the screen shows of it, past any of its sides', async () => {
	const reaching = ['#reaching-above', '#reaching-below', '#reaching-left', '#reaching-right'];
	const shown = ['#shown-above', '#shown-below', '#shown-left', '#shown-right'];
	expect(await Promise.all(reaching.map(cameraOnto))).toEqual(await Promise.all(shown.map(cameraOnto)));
});

test('an angled camera frames a block in its window as a face-on one does, the window leant and the screen filling it', async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const faceOn = cameraOf(await setAt(onto('#half-on'), windowed, 1), SMALL);
	const angled = cameraOf(await setAt(onto('#half-on', { tilt: 6, turn: -16 }), windowed, 1), SMALL);
	expect(angled).toEqual({ pose: { ...faceOn.pose, tilt: 6, turn: -16 }, view: faceOn.view });
});

test('an angled camera in the whole frame stands where the film puts it, the screen leant past the frame', async () => {
	const angled = cameraOf(await setAt(onto('#block', { turn: -16 }), openingScene(SMALL, LIVEREELS_LOOK), 1), SMALL);
	expect([angled.pose.focusX, angled.pose.focusY]).toEqual([150, 120]);
});

test("a face-on camera onto a block at the screen's foot stops short of showing the edge", async () => {
	const camera = cameraOf(
		await setAt(onto('#half-on', { air: 0, zoomAtMost: 4 }), openingScene(SMALL, LIVEREELS_LOOK), 1),
		SMALL
	);
	const frameFootMiddle: Point = { left: SMALL.frame.width / 2, top: SMALL.frame.height };
	expect(underTheFrame(camera, SMALL.frame, frameFootMiddle)!.top).toBeLessThanOrEqual(SMALL.screen.height);
});
