import { expect, test } from 'vitest';
import {
	type Camera,
	FACE_ON,
	onTheFrame,
	placedIn,
	underTheFrame,
	wholeView,
	windowView
} from '../../src/domain/camera.ts';
import { linear } from '../../src/domain/time.ts';
import { FilmError } from '../../src/domain/errors.ts';
import type { Format } from '../../src/domain/format.ts';
import { type Point, boxOf, boxToward, frameScaleOf, middleX, middleY } from '../../src/domain/geometry.ts';
import { windowOn, wordsOn } from '../../src/domain/split.ts';
import type { Beginning, Move } from '../../src/direction/move.ts';
import { play } from '../../src/direction/steps.ts';
import { onto } from '../../src/moves/camera.ts';
import { hide as windowHide, lean, show as windowShow, to as windowTo } from '../../src/moves/window.ts';
import { lower, rise } from '../../src/moves/screen.ts';
import * as callout from '../../src/moves/callout.ts';
import * as caption from '../../src/moves/caption.ts';
import * as code from '../../src/moves/code.ts';
import * as ending from '../../src/moves/ending.ts';
import { type DrawnObject, type Surroundings, drawnObject } from '../../src/props/object.ts';
import { SCREEN_UP } from '../../src/props/screen.ts';
import { pastTheEdge, wordsPlaced } from '../../src/domain/place.ts';
import * as keys from '../../src/moves/keys.ts';
import * as look from '../../src/moves/look.ts';
import * as note from '../../src/moves/note.ts';
import { speed } from '../../src/moves/page.ts';
import * as pin from '../../src/moves/pins.ts';
import * as title from '../../src/moves/title.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { drawnNote } from '../../src/props/note.ts';
import { drawnPins } from '../../src/props/pins.ts';
import { press, release, to as cursorTo } from '../../src/moves/cursor.ts';
import { off, on as lightOn, to as lightTo } from '../../src/moves/light.ts';
import { leave, open, submit, to as terminalTo, type as typeInto, works } from '../../src/moves/terminal.ts';
import { keystrokes } from '../../src/domain/typing.ts';
import type { TerminalLine } from '../../src/props/terminal.ts';
import { saidOf } from '../../src/props/words.ts';
import { type Scene, cameraOf, drawn, openingScene, withObject, withProp } from '../../src/scene.ts';
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
// No caption standing round an object drawn alone, and the screen up
const NOTHING_AROUND: Surroundings = { caption: null, screen: SCREEN_UP };
const TYPED = withObject(openingScene(SMALL, LIVEREELS_LOOK), 'terminal', {
	inside: 'frame',
	box: BLOCK,
	angle: FACE_ON,
	shown: 1,
	gone: 0,
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

function beginningOf(scene: Scene): Beginning {
	return beginningIn(scene, SMALL);
}

function beginningIn(scene: Scene, format: Format): Beginning {
	return { scene, page: PAGE, format };
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

/** The objects of a scene as the stage draws them, in a format, by the scene's own camera. */
function drawnObjectsIn(scene: Scene, format: Format): readonly DrawnObject[] {
	return drawn(scene, cameraOf(scene, format), 0, format).objects;
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
	const titled = await setAt(title.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const captioned = await setAt(caption.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		[...(await setAt(caption.hide(), captioned, 1)).objects.keys()],
		[...(await setAt(keys.hide(), pressed, 1)).objects.keys()],
		[...(await setAt(leave(), TYPED, 1)).objects.keys()],
		[...(await setAt(ending.hide(), carded, 1)).objects.keys()],
		[...(await setAt(title.hide(), titled, 1)).objects.keys()],
		[...(await setAt(code.hide(), coded, 1)).objects.keys()]
	]).toEqual([null, null, null, null, [], [], [], [], [], []]);
});

test('code and a title stand in the places the film names, the title then with no ground of its own', async () => {
	const heading = { of: 'left', height: 0.2 } as const;
	const below = { of: 'left', top: 0.25, height: 0.75 } as const;
	const titled = await setAt(title.show('Here', { at: heading }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const coded = await setAt(code.show('light.on(VISITORS)', { at: below }), titled, 1);
	const shownTitle = coded.objects.get('title')!;
	expect([
		shownTitle.box,
		drawnObject('title', shownTitle, 0, NOTHING_AROUND).content.ground,
		coded.objects.get('code')!.box
	]).toEqual([wordsPlaced(SMALL, heading), 0, wordsPlaced(SMALL, below)]);
});

test('code and a title card move to another place through the boxes between, growing or shrinking along the way', async () => {
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
	const titled = await setAt(title.show('Here', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
	const keysTyped = keystrokes('ab cd', typed).length;
	const titled = await setAt(title.show('ab cd', { at: 'left', typed }), openingScene(SMALL, LIVEREELS_LOOK), 0);
	const captioned = await setAt(caption.show('ab cd', { typed }), openingScene(SMALL, LIVEREELS_LOOK), 0);
	const lettersShown = [titled, captioned].map((scene) =>
		drawnObjectsIn(scene, SMALL).map((object) => object.content.words.map((word) => word.letters))
	);
	expect([
		lettersShown,
		title.show('ab cd', { typed }).sounds!.length,
		caption.show('ab cd', { typed }).sounds!.length
	]).toEqual([[[[0, 0]], [[0, 0]]], keysTyped, keysTyped]);
});

test('a title typed never slides in from a side', () => {
	expect(() => title.show('ab', { typed: { seed: 1 }, from: 'left' })).toThrow(
		new FilmError('title.show types its words where they come up: it slides in whole from a side, or is typed')
	);
});

test('a title or code shown from a side slides in whole from a frame past its place, and one hidden toward a side slides out as far, then is gone', async () => {
	const place = wordsPlaced(SMALL, 'left');
	const coming = (
		await setAt(title.show('Here', { at: 'left', from: 'right' }), openingScene(SMALL, LIVEREELS_LOOK), 0)
	).objects.get('title')!;
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const leaving = (await setAt(code.hide({ toward: 'top' }), coded, 0.5)).objects.get('code')!;
	const left = await setAt(code.hide({ toward: 'top' }), coded, 1);
	expect([coming.box, coming.shown, leaving.box, [...left.objects.keys()]]).toEqual([
		pastTheEdge(place, 'right', SMALL.frame),
		1,
		boxToward(place, pastTheEdge(place, 'top', SMALL.frame), 0.5),
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
	const coded = await setAt(code.show('light.on(VISITORS)', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		boxToward(pastTheEdge(right, 'right', SMALL.frame), right, 0.5),
		boxToward(frame, pastTheEdge(frame, 'left', SMALL.frame), 0.5),
		[],
		left,
		[]
	]);
});

test('a title over the whole frame stands on its ground over the frame, and slides in from a side and out toward one as one in a place does', async () => {
	const frame = boxOf(SMALL.frame);
	const coming = await setAt(title.show('Here', { from: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 0.5);
	const shown = await setAt(title.show('Here'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const leaving = await setAt(title.hide({ toward: 'top' }), shown, 0.5);
	expect([
		coming.objects.get('title')!.box,
		drawnObject('title', shown.objects.get('title')!, 0, NOTHING_AROUND).content.ground,
		leaving.objects.get('title')!.box
	]).toEqual([
		boxToward(pastTheEdge(frame, 'left', SMALL.frame), frame, 0.5),
		1,
		boxToward(frame, pastTheEdge(frame, 'top', SMALL.frame), 0.5)
	]);
});

test('two titles stand at once by their names, in the order shown, each moved and put away by its own name', async () => {
	const first = await setAt(title.show('One', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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

test('an object is handed to the stage with its angle where it leans, and with none face-on, leant back to none too', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const leant = await setAt(code.lean({ turn: 8 }), coded, 1);
	const back = await setAt(code.lean({ turn: 0 }), leant, 1);
	expect(
		[coded, leant, back].map((scene) => drawnObject('code', scene.objects.get('code')!, 0, NOTHING_AROUND).angle)
	).toEqual([null, { tilt: 0, turn: 8 }, null]);
});

test('an object leans by a move of its own while another carries it and its content changes, each its own way along, a side of the angle left out kept', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		{ tilt: 10, turn: -10 },
		boxToward(wordsPlaced(SMALL, 'left'), wordsPlaced(SMALL, 'right'), 0.5),
		[0, 0.5, 0],
		moves
	]);
	expect(() => play({ seconds: 1, moves: [code.to('right'), code.hide()] })).toThrow(
		new FilmError('two moves on the code object at once in one step')
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
	const titled = await setAt(title.show('Here', { at: 'left', as: 'code' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	await expect(async () => title.lean({ tilt: 4 }).begin(beginningOf(titled))).rejects.toThrow(
		new FilmError('title.lean finds no title on the screen')
	);
	await expect(async () => code.light(1).begin(beginningOf(titled))).rejects.toThrow(
		new FilmError('code.light finds the code showing words, not code')
	);
});

test('a title in a place reads from the left, centred where it stands above, below or over the whole, unless the film names its way', async () => {
	const alignOf = async (script: title.TitleScript) =>
		(await setAt(title.show('Here', script), openingScene(SMALL, LIVEREELS_LOOK), 1)).objects.get('title')!.content
			.align;
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
	const lit = (await setAt(code.light(2, { through: 3 }), coded, 1)).objects.get('code')!;
	expect([
		lit.content.lines.map((line) => line.lit),
		drawnObject('code', lit, 0, NOTHING_AROUND).content.dimmed
	]).toEqual([[0, 1, 1], 1]);
});

test('while the light moves from one line to another, the lines not lit stay dimmed', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const first = await setAt(code.light(1), coded, 1);
	const moving = (await setAt(code.light(2), first, 0.5)).objects.get('code')!;
	expect(drawnObject('code', moving, 0, NOTHING_AROUND).content.dimmed).toBe(1);
});

test('a line lit by what it says is the one line that says it, through the one from it on that says the other; words no line from there says, or more than one says, are refused, and a line past the last before any words', async () => {
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
	const coded = await setAt(code.show(THREE_LINES, { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		pose: { focusX: 300, focusY: 200, zoom: 1 / frameScaleOf(SMALL.frame) },
		view: windowView({ left: 100, top: 100, width: 200, height: 200 })
	};
	const beside = { side: 'bottom', box: wordsOn(SMALL, 'bottom'), window: camera.view.box } as const;
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
	expect([clearest.beside.side, clearest.beside.box, named.beside.side, named.beside.box]).toEqual([
		'bottom',
		wordsOn(SMALL, 'bottom'),
		'left',
		wordsPlaced(SMALL, { of: 'left', height: 0.5 })
	]);
});

test('a note shown while the window moves keeps beside it on its way, and stands in its place once the window is there', async () => {
	const halfWay = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 0.5);
	const noted = await setAt(note.show('#block', 'Here'), halfWay, 1);
	const arrived = await setAt(windowTo('right'), noted, 1);
	expect(drawnNote(arrived.note!, cameraOf(arrived, SMALL), SMALL.frame).place).toEqual(wordsOn(SMALL, 'left'));
});

test("a window move that would carry a standing note's words off the frame, or under the window, is refused as it begins", async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const noted = await setAt(note.show('#block', 'Here'), windowed, 1);
	await expect(async () => windowTo('left').begin(beginningOf(noted))).rejects.toThrow(
		new FilmError(
			"window.to would carry the note's words off the frame, or under the window: hide the note first, with note.hide(), or move the window where its words keep beside it"
		)
	);
	await expect(async () => windowTo('whole').begin(beginningOf(noted))).rejects.toThrow(FilmError);
});

test("while a note stands the window moves, and the note's words keep beside it, as far as its edge facing them moves", async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
		{ box: boxToward(windowOn(SMALL, 'right'), boxOf(SMALL.frame), 0.5), lift: 0.5, angle: { tilt: 0, turn: 0 } },
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
	const setOff = (await setAt(title.to('left'), titled, 0)).objects.get('title')!.box;
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
	const opened = (await setAt(open('A terminal'), openingScene(SMALL, LIVEREELS_LOOK), 0.25)).objects.get('terminal')!;
	const leaving = (await setAt(leave(), TYPED, 0.25)).objects.get('terminal')!;
	expect([
		drawnObject('terminal', opened, 0, NOTHING_AROUND).content.shown,
		drawnObject('terminal', leaving, 0, NOTHING_AROUND).content.shown
	]).toEqual([0.25, 0.75]);
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
	const centred = await setAt(open('claude'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const placed = await setAt(open('claude', { at: 'left' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const carded = await setAt(ending.show(card), openingScene(SMALL, LIVEREELS_LOOK), 1);
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
	const opened = await setAt(open('claude', { as: 'second' }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const typed = await setAt(typeInto(keystrokes('ls', { seed: 1 }), { as: 'second' }), opened, 1);
	const asked = await setAt(submit({ as: 'second' }), typed, 1);
	const done = await setAt(works([SAID], THINKING, { as: 'second' }), asked, 1);
	expect(done.objects.get('second')!.content.lines).toEqual([{ kind: 'asked', text: 'ls' }, SAID]);
});

test('what stands over the whole frame — the ending card, a caption, keys — is never carried or leant', async () => {
	const card = { name: 'livereel', line: 'Film your app', command: 'npx livereel' };
	const carded = await setAt(ending.show(card), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const captioned = await setAt(caption.show('Words'), carded, 1);
	const pressed = await setAt(keys.show(['⌘', 'K']), captioned, 1);
	await expect(async () => title.lean({ as: 'ending', tilt: 20 }).begin(beginningOf(pressed))).rejects.toThrow(
		new FilmError('title.lean would move the ending object: what it shows stands over the whole frame alone')
	);
	await expect(async () => title.to('left', { as: 'caption' }).begin(beginningOf(pressed))).rejects.toThrow(
		new FilmError('title.to would move the caption object: what it shows stands over the whole frame alone')
	);
	await expect(async () => code.lean({ as: 'keys', tilt: 20 }).begin(beginningOf(pressed))).rejects.toThrow(
		new FilmError('code.lean would move the keys object: what it shows stands over the whole frame alone')
	);
});

test('a caption and keys never slide and take no name: one of each stands where it comes up', () => {
	expect(() => caption.show('Words', { from: 'left' } as never)).toThrow(FilmError);
	expect(() => caption.hide({ toward: 'left' } as never)).toThrow(FilmError);
	expect(() => keys.show(['⌘', 'K'], { as: 'second' } as never)).toThrow(FilmError);
	expect(() => keys.hide({ as: 'second' } as never)).toThrow(FilmError);
});

test("an object inside the page's window stands, and is carried, in the window's box read as a frame of that size", async () => {
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const windowBox = windowed.window.box.to;
	const insideTheWindow: Format = { ...SMALL, frame: { width: windowBox.width, height: windowBox.height } };
	const nested = await setAt(code.show('x', { at: LOWER_RIGHT, inside: 'window' }), windowed, 1);
	const carried = await setAt(code.to(UPPER_LEFT), nested, 1);
	expect([
		nested.objects.get('code')!.inside,
		nested.objects.get('code')!.box,
		carried.objects.get('code')!.box
	]).toEqual(['window', wordsPlaced(insideTheWindow, LOWER_RIGHT), wordsPlaced(insideTheWindow, UPPER_LEFT)]);
});

test("what stands inside the page's window shows no more than the screen it shows, what it holds as far along as its own moves have it: words typed stay typed", async () => {
	const opened = await setAt(
		open('claude', { at: LOWER_RIGHT, inside: 'window' }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
	const typed = await setAt(title.show('ab', { at: UPPER_LEFT, inside: 'window', typed: { seed: 1 } }), opened, 1);
	const [terminalDrawn, titleDrawn] = drawnObjectsIn(await setAt(lower(), typed, 0.5), SMALL);
	expect([
		terminalDrawn!.held,
		terminalDrawn!.content.shown,
		titleDrawn!.held,
		titleDrawn!.content.words.map((word) => word.letters)
	]).toEqual([0.5, 1, 0.5, [2]]);
});

test("an object inside the page's window leans with it, never alone", async () => {
	const nested = await setAt(
		code.show('x', { at: LOWER_RIGHT, inside: 'window' }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
	await expect(async () => code.lean({ turn: 10 }).begin(beginningOf(nested))).rejects.toThrow(
		new FilmError('code.lean would lean the code alone: it stands inside the window, and leans as it does')
	);
});

test("inside the page's window a place is a box in its shares, a name of the frame's refused as the move is written and as it begins", async () => {
	const nested = await setAt(
		code.show('x', { at: LOWER_RIGHT, inside: 'window' }),
		openingScene(SMALL, LIVEREELS_LOOK),
		1
	);
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
		(await setIn(showing, openingScene(SMALL, LIVEREELS_LOOK), 1, SMALL)).objects.get('caption')!.content.at,
		(await setIn(showing, openingScene(SMALL, LIVEREELS_LOOK), 1, CAPTIONS_AT_THE_TOP)).objects.get('caption')!.content
			.at
	]).toEqual(['bottom', 'top']);
});

test("keys rise clear of a caption at the frame's foot as its ground comes up, and stand at the foot with it at the top, or none", async () => {
	const pressed = keys.show(['⌘', 'K']);
	// A caption a quarter of the way up: its ground, coming up twice as fast as its words, half of the way
	const atTheFoot = await setIn(caption.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 0.25, SMALL);
	const atTheTop = await setIn(caption.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 0.25, CAPTIONS_AT_THE_TOP);
	expect([
		drawnObjectsIn(await setIn(pressed, atTheFoot, 1, SMALL), SMALL).at(-1)!.content.clearing,
		drawnObjectsIn(await setIn(pressed, atTheTop, 1, CAPTIONS_AT_THE_TOP), CAPTIONS_AT_THE_TOP).at(-1)!.content
			.clearing,
		drawnObjectsIn(await setAt(pressed, openingScene(SMALL, LIVEREELS_LOOK), 1), SMALL).at(-1)!.content.clearing
	]).toEqual([0.5, 0, 0]);
});

test("keys shown while a caption stands at the frame's foot are drawn over its words, on the frame with it at the top, or none", async () => {
	const pressed = keys.show(['⌘', 'K']);
	const atTheFoot = await setIn(caption.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 1, SMALL);
	const atTheTop = await setIn(caption.show('Words'), openingScene(SMALL, LIVEREELS_LOOK), 1, CAPTIONS_AT_THE_TOP);
	expect([
		drawnObjectsIn(await setIn(pressed, atTheFoot, 1, SMALL), SMALL).at(-1)!.over,
		drawnObjectsIn(await setIn(pressed, atTheTop, 1, CAPTIONS_AT_THE_TOP), CAPTIONS_AT_THE_TOP).at(-1)!.over,
		drawnObjectsIn(await setAt(pressed, openingScene(SMALL, LIVEREELS_LOOK), 1), SMALL).at(-1)!.over
	]).toEqual(['caption', null, null]);
});

test('a caption is drawn over every other object, and keys over it, whenever each came', async () => {
	const pressed = await setAt(keys.show(['⌘', 'K']), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const captioned = await setAt(caption.show('Words'), pressed, 1);
	const titled = await setAt(title.show('Here'), captioned, 1);
	const [pressedKeys, shownCaption, shownTitle] = drawnObjectsIn(titled, SMALL);
	expect([pressedKeys!.layer > shownCaption!.layer, shownCaption!.layer > shownTitle!.layer]).toEqual([true, true]);
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

test('a box of the screen stands for a block a page names by no selector: the camera frames it, the light lights it, the cursor rests on it, a pin, a callout and a note go to it, as on the block a selector names there, and one off the screen is refused alike', async () => {
	const opening = openingScene(SMALL, LIVEREELS_LOOK);
	const windowed = await setAt(windowTo('right'), opening, 1);
	const byBox = [
		cameraOf(await setAt(onto(BLOCK), opening, 1), SMALL),
		(await setAt(lightOn(BLOCK), opening, 1)).light,
		(await setAt(cursorTo(BLOCK), opening, 1)).cursor,
		(await setAt(pin.show(BLOCK, 'Here'), opening, 1)).pins,
		(await setAt(callout.show(BLOCK, 'Here'), opening, 1)).callout,
		(await setAt(note.show(BLOCK, 'Here'), windowed, 1)).note
	];
	const bySelector = [
		cameraOf(await setAt(onto('#block'), opening, 1), SMALL),
		(await setAt(lightOn('#block'), opening, 1)).light,
		(await setAt(cursorTo('#block'), opening, 1)).cursor,
		(await setAt(pin.show('#block', 'Here'), opening, 1)).pins,
		(await setAt(callout.show('#block', 'Here'), opening, 1)).callout,
		(await setAt(note.show('#block', 'Here'), windowed, 1)).note
	];
	expect(byBox).toEqual(bySelector);
	await expect(onto(BELOW).begin(beginningOf(opening))).rejects.toThrow(
		new FilmError(
			`camera.onto's box {"left":100,"top":900.4,"width":100,"height":40} stands off the page's screen, at left 100, top 900 of a screen 600 × 400: give a box that stands on it, in the screen's pixels`
		)
	);
	await expect(lightOn(HIDDEN).begin(beginningOf(opening))).rejects.toThrow(
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
	const windowed = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const faceOn = cameraOf(await setAt(onto('#half-on'), windowed, 1), SMALL);
	const leant = await setAt(lean({ tilt: 6, turn: -16 }), windowed, 1);
	const angled = cameraOf(await setAt(onto('#half-on'), leant, 1), SMALL);
	expect(angled).toEqual({ pose: faceOn.pose, view: { ...faceOn.view, angle: { tilt: 6, turn: -16 } } });
});

test("a block is framed on a page leant over the whole frame as on a face-on one, kept off the screen's edge", async () => {
	const faceOn = cameraOf(await setAt(onto('#block'), openingScene(SMALL, LIVEREELS_LOOK), 1), SMALL);
	const leant = await setAt(lean({ turn: -16 }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	expect(cameraOf(await setAt(onto('#block'), leant, 1), SMALL).pose).toEqual(faceOn.pose);
});

test('the window leans by a move of its own while another carries it, each its own way along, and a side of the angle left out stays', async () => {
	const leaning = await setAt(lean({ tilt: 10 }), openingScene(SMALL, LIVEREELS_LOOK), 1);
	const halfLeant = await setAt(lean({ turn: -20 }), leaning, 0.5);
	const carried = await setAt(windowTo('right'), halfLeant, 1);
	const halfCarried = await setAt(windowTo('right'), openingScene(SMALL, LIVEREELS_LOOK), 0.5);
	const leantAfter = await setAt(lean({ tilt: 6 }), halfCarried, 1);
	expect([cameraOf(carried, SMALL).view, cameraOf(leantAfter, SMALL).view]).toEqual([
		{ ...windowView(windowOn(SMALL, 'right')), angle: { tilt: 10, turn: -10 } },
		{ box: boxToward(boxOf(SMALL.frame), windowOn(SMALL, 'right'), 0.5), lift: 0.5, angle: { tilt: 6, turn: 0 } }
	]);
});

test("a face-on camera onto a block at the screen's foot stops short of showing the edge", async () => {
	const camera = cameraOf(
		await setAt(onto('#half-on', { air: 0, zoomAtMost: 4 }), openingScene(SMALL, LIVEREELS_LOOK), 1),
		SMALL
	);
	const frameFootMiddle: Point = { left: SMALL.frame.width / 2, top: SMALL.frame.height };
	expect(underTheFrame(camera, SMALL.frame, frameFootMiddle)!.top).toBeLessThanOrEqual(SMALL.screen.height);
});
