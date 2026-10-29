import { expect, test } from 'vitest';
import { type Camera, underTheFrame, wholeView, windowView } from '../../src/domain/camera.ts';
import { FilmError } from '../../src/domain/errors.ts';
import { type Point, frameScaleOf } from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';
import type { Beginning, Move } from '../../src/direction/move.ts';
import { to as cameraTo, onto } from '../../src/moves/camera.ts';
import { drawnTitle } from '../../src/props/title.ts';
import * as callout from '../../src/moves/callout.ts';
import * as caption from '../../src/moves/caption.ts';
import * as code from '../../src/moves/code.ts';
import * as ending from '../../src/moves/ending.ts';
import { drawnCode } from '../../src/props/code.ts';
import { wordsPlaced } from '../../src/domain/place.ts';
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
import { type Scene, openingScene, withProp } from '../../src/scene.ts';
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
	const drawnOnes = drawnPins(all.pins!, all.camera, SMALL.frame).pins;
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
		view: windowView({ left: 100, top: 100, width: 200, height: 200 }, 'top')
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

test("a note's words stand across from the side the camera put the window on, though more ground lies beside it", async () => {
	// A window on the top side, standing far to the right: the most ground lies to its left
	const framed = withProp(openingScene(SMALL, LIVEREELS_LOOK), 'camera', {
		pose: openingScene(SMALL, LIVEREELS_LOOK).camera.pose,
		view: windowView({ left: 300, top: 20, width: 80, height: 60 }, 'top')
	});
	const noted = (await setAt(note.show('#block', 'Here'), framed, 1)).note!;
	expect(noted.beside).toEqual({ side: 'bottom', box: wordsOn(SMALL, 'bottom') });
});

test('a camera move that takes the window from beside a note is refused as it begins: to the other side, to the whole frame', async () => {
	const inTheWindow = await setAt(onto('#block', { side: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const noted = await setAt(note.show('#block', 'Here'), inTheWindow, 1);
	await expect(async () => onto('#block', { side: 'left' }).begin(beginningOf(noted))).rejects.toThrow(FilmError);
	await expect(async () => cameraTo(noted.camera.pose).begin(beginningOf(noted))).rejects.toThrow(FilmError);
});

test('the camera moves on inside the window a note stands beside', async () => {
	const inTheWindow = await setAt(onto('#block', { side: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const noted = await setAt(note.show('#block', 'Here'), inTheWindow, 1);
	const closer = await setAt(onto('#wide', { side: 'right', zoomAtMost: 4 }), noted, 1);
	expect(closer.camera.view).toEqual(inTheWindow.camera.view);
});

test('a note with no window to stand beside is refused as it begins', async () => {
	await expect(async () =>
		note.show('#block', 'Here').begin(beginningOf(openingScene(SMALL, LIVEREELS_LOOK)))
	).rejects.toThrow(FilmError);
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
	return (await setAt(onto(target), openingScene(SMALL, LIVEREELS_LOOK), 1)).camera;
}

test('a camera onto a block reaching off the screen frames what the screen shows of it, past any of its sides', async () => {
	const reaching = ['#reaching-above', '#reaching-below', '#reaching-left', '#reaching-right'];
	const shown = ['#shown-above', '#shown-below', '#shown-left', '#shown-right'];
	expect(await Promise.all(reaching.map(cameraOnto))).toEqual(await Promise.all(shown.map(cameraOnto)));
});

test('an angled camera frames a block in its window as a face-on one does, the window leant and the screen filling it', async () => {
	const faceOn = (await setAt(onto('#half-on', { side: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 1)).camera;
	const angled = (
		await setAt(onto('#half-on', { side: 'right', tilt: 6, turn: -16 }), openingScene(SMALL, LIVEREELS_LOOK), 1)
	).camera;
	expect(angled).toEqual({ pose: { ...faceOn.pose, tilt: 6, turn: -16 }, view: faceOn.view });
});

test('an angled camera in the whole frame stands where the film puts it, the screen leant past the frame', async () => {
	const angled = (await setAt(onto('#block', { turn: -16 }), openingScene(SMALL, LIVEREELS_LOOK), 1)).camera;
	expect([angled.pose.focusX, angled.pose.focusY]).toEqual([150, 120]);
});

test("a camera onto a block on a side stands in that side's window, and back in the whole frame by camera.to", async () => {
	const inTheWindow = await setAt(onto('#block', { side: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const backWhole = await setAt(cameraTo(inTheWindow.camera.pose), inTheWindow, 1);
	expect([inTheWindow.camera.view, backWhole.camera.view]).toEqual([
		windowView(windowOn(SMALL, 'right'), 'right'),
		wholeView(SMALL.frame)
	]);
});

test("a face-on camera onto a block at the screen's foot stops short of showing the edge", async () => {
	const camera = (await setAt(onto('#half-on', { air: 0, zoomAtMost: 4 }), openingScene(SMALL, LIVEREELS_LOOK), 1))
		.camera;
	const frameFootMiddle: Point = { left: SMALL.frame.width / 2, top: SMALL.frame.height };
	expect(underTheFrame(camera, SMALL.frame, frameFootMiddle)!.top).toBeLessThanOrEqual(SMALL.screen.height);
});
