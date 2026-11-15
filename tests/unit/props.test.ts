import { expect, test } from 'vitest';
import { codeOf } from '../../src/props/code.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { LIVEREELS_WORLD } from '../../src/props/world.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import {
	CUT_AT_THE_SCREEN,
	DRAWN_TO_ITS_DOCUMENT,
	type OwnDocument,
	SCREEN_UP,
	type Screen,
	type Scroll,
	type Shows,
	type Sweep,
	drawnScreen,
	drawnSweep,
	ownPageStanding,
	pastTheScreen
} from '../../src/props/screen.ts';
import { cameraOf, drawn, openingScene } from '../../src/scene.ts';
import { THE_FIGURE, type Way, alongItsWay, sheenAlong, stillCovered } from '../../src/props/way.ts';
import { NONE, WHOLE, fractionOf } from '../../src/domain/fraction.ts';
import {
	type DrawnWords,
	type Piece,
	comingUpIn,
	drawnWords,
	saidOf,
	typedComingUp,
	wordByWordAt
} from '../../src/props/words.ts';
import { easeOutCubic } from '../../src/domain/curves.ts';
import { type Keystroke, lettersOf } from '../../src/domain/typing.ts';
import { FOCAL_LENGTH, SMALL } from './fakes.ts';
import { type Camera, wholeView } from '../../src/domain/camera.ts';
import { onTheFrame } from '../../src/domain/placement.ts';
import { eyeAtRest } from '../../src/domain/eye.ts';
import type { Format } from '../../src/domain/format.ts';
import { FACE_ON } from '../../src/domain/stance.ts';

// The side of the page's window the eye sees: its front, or its back
const SEES_THE_FRONT = true;
const SEES_THE_BACK = false;
// How round a pane's corners are, in film pixels
const PANE_CORNER = 24;
// The moment a screen is drawn at where no page of it runs
const AT_THE_START = 0;
// Words on their way two at a time
const TWO_AT_ONCE = 2;
// A page drawn on the screen alone, nothing of it past
const NOTHING_PAST = null;
// The screen up with the pages of the film's own the tests name laid on it, nothing typed in each: each 200000 of its
// pixels longer than the screen holds
const LONG_DOCUMENT = 200000;
const LAID_LONG: OwnDocument = { typed: new Map(), scrollLength: LONG_DOCUMENT };
const LAID_UP: Screen = {
	...SCREEN_UP,
	documents: new Map([
		['front', LAID_LONG],
		['behind', LAID_LONG],
		['page', LAID_LONG],
		['sheet', LAID_LONG]
	])
};

/** How much of a word stands typed, and whether the caret follows it. */
interface StandingTyped {
	readonly letters: number;
	readonly caret: boolean;
}

// Two words typed a key a second, the space before the second typed as its first letter
const TYPING: readonly Keystroke[] = [
	{ at: 1, typed: 'a' },
	{ at: 2, typed: 'ab' },
	{ at: 3, typed: 'ab ' },
	{ at: 4, typed: 'ab c' },
	{ at: 5, typed: 'ab cd' }
];

/** A piece of a word, its letters, set in the styles named, in no ink and on no marker of its own. */
function piece(text: string, ...styles: Piece['styles']): Piece {
	return { text, letters: lettersOf(text), styles, ink: null, marker: null };
}

/** How much of each of two words stands typed, the whole come up `shown` of the way. */
function typedAt(shown: number): readonly StandingTyped[] {
	const said = saidOf('ab cd');
	const words = drawnWords({ ...said, shown, gone: 0 }, typedComingUp(said, TYPING), 0).words;
	return words.map((word) => ({ letters: word.letters, caret: word.caret }));
}

/** How far each of three words rising two at a time has come up, the whole come up `shown` of the way. */
function appearedAt(shown: number): readonly number[] {
	const said = saidOf('ab cd ef');
	return drawnWords({ ...said, shown, gone: 0 }, wordByWordAt('rise', TWO_AT_ONCE), 0).words.map(
		(word) => word.appeared
	);
}

/** Two words scrambled, the whole come up `shown` of the way, at a moment of the film; 'ab cd' where none are named. */
function scrambledAt(shown: number, moment: number, text = 'ab cd'): DrawnWords['words'] {
	const said = saidOf(text);
	return drawnWords({ ...said, shown, gone: 0 }, comingUpIn('scramble', said), moment).words;
}

/** The signs two words scrambled stand as, the whole come up `shown` of the way, at a moment of the film. */
function signsAt(shown: number, moment: number, text = 'ab cd'): readonly (readonly (string | null)[])[] {
	return scrambledAt(shown, moment, text).map((word) => word.signs);
}

test("a caption's words come up one after another", () => {
	const said = saidOf('one two three four');
	const words = drawnWords({ ...said, shown: 0.2, gone: 0 }, comingUpIn('rise', said), 0).words;
	const appeared = words.map((word) => word.appeared);
	expect(appeared).toEqual([...appeared].sort((earlier, later) => later - earlier));
	expect([appeared[0]! > 0, appeared.at(-1)]).toEqual([true, 0]);
});

test('words come up with as many on their way at once as the film names, each setting off as the one so many before it arrives, the last arriving as the way ends', () => {
	expect([appearedAt(0.5), appearedAt(0.75), appearedAt(1)]).toEqual([
		[1, easeOutCubic(0.5), 0],
		[1, 1, easeOutCubic(0.5)],
		[1, 1, 1]
	]);
});

test('words that came up word by word go one after another, the first first, each as it came run back; words laid out by letters go together', () => {
	const said = saidOf('ab cd ef');
	const going = { ...said, shown: 1, gone: 0.5 };
	expect([
		drawnWords(going, wordByWordAt('rise', TWO_AT_ONCE), 0).words.map((word) => word.gone),
		drawnWords(going, comingUpIn('letters', said), 0).words.map((word) => word.gone)
	]).toEqual([
		[1, 1 - easeOutCubic(0.5), 0],
		[0.5, 0.5, 0.5]
	]);
});

test('the ground under words goes as they go', () => {
	const said = saidOf('Words');
	expect(drawnWords({ ...said, shown: 1, gone: 1 }, comingUpIn('rise', said), 0).ground).toBe(0);
});

test('words that come up word by word are drawn by the name of their way', () => {
	const said = saidOf('Words');
	const ways = (['rise', 'sharp', 'fade', 'blur', 'mask'] as const).map(
		(way) => drawnWords({ ...said, shown: 0.5, gone: 0 }, comingUpIn(way, said), 0).way
	);
	expect(ways).toEqual(['rise', 'sharp', 'fade', 'blur', 'mask']);
});

test('words that come up by letters stand letter by letter at an even pace, the space before a word its first, with no caret', () => {
	const said = saidOf('ab cd');
	const words = drawnWords({ ...said, shown: 0.6, gone: 0 }, comingUpIn('letters', said), 0).words;
	expect(words.map((word) => ({ letters: word.letters, caret: word.caret }))).toEqual([
		{ letters: 2, caret: false },
		{ letters: 1, caret: false }
	]);
});

test('scrambled letters come up each as a sign drawn anew as the film goes on, a space as itself, and settle into their own a few behind those coming', () => {
	const midway = scrambledAt(0.5, 0);
	expect([
		midway.map((word) => word.letters),
		midway.map((word) => word.signs),
		scrambledAt(1, 0).map((word) => word.signs)
	]).toEqual([
		[2, 3],
		[
			[expect.any(String), expect.any(String)],
			[null, expect.any(String), expect.any(String)]
		],
		[
			[null, null],
			[null, null, null]
		]
	]);
	expect(midway.map((word) => word.signs)).not.toEqual(scrambledAt(0.5, 0.1).map((word) => word.signs));
});

test('a scrambled letter keeps its sign a fifteenth of a second before another is drawn, and other words draw signs of their own', () => {
	const firstFrame = signsAt(0.5, 0);
	expect(signsAt(0.5, 1 / 30)).toEqual(firstFrame);
	expect(signsAt(0.5, 2 / 30)).not.toEqual(firstFrame);
	expect(signsAt(0.5, 0, 'xy zw')).not.toEqual(firstFrame);
});

test('typed words stand letter by letter as the strokes have typed them, the space before a word its first, the caret after the last letter typed until all are', () => {
	expect([typedAt(0.6), typedAt(1)]).toEqual([
		[
			{ letters: 2, caret: false },
			{ letters: 1, caret: true }
		],
		[
			{ letters: 2, caret: false },
			{ letters: 3, caret: false }
		]
	]);
});

test('the space between two words is set as the run it was written in, and none stands before the first or after the last', () => {
	expect(saidOf([' Film ', { text: 'your  live', underline: true }, ' app. ']).words).toEqual([
		{ spaceBefore: null, pieces: [piece('Film')] },
		{ spaceBefore: piece(' '), pieces: [piece('your', 'underline')] },
		{ spaceBefore: piece(' ', 'underline'), pieces: [piece('live', 'underline')] },
		{ spaceBefore: piece(' '), pieces: [piece('app.')] }
	]);
});

test('a line break the film writes between two words stands in place of the space there, as many as it writes, whichever run holds it; none stands before the first word or after the last', () => {
	expect(saidOf(['\nEach step:\r\n', { text: ' why,\n \nthen', italic: true }, ' code\n']).words).toEqual([
		{ spaceBefore: null, pieces: [piece('Each')] },
		{ spaceBefore: piece(' '), pieces: [piece('step:')] },
		{ spaceBefore: piece('\n'), pieces: [piece('why,', 'italic')] },
		{ spaceBefore: piece('\n\n', 'italic'), pieces: [piece('then', 'italic')] },
		{ spaceBefore: piece(' '), pieces: [piece('code')] }
	]);
});

test('a word written across two runs is one word, each part set as its run is', () => {
	expect(saidOf(['un', { text: 'missable', italic: true, strike: true }]).words).toEqual([
		{ spaceBefore: null, pieces: [piece('un'), piece('missable', 'italic', 'strike')] }
	]);
});

test('code is set as pieces each of its kind, the indent its lines share dropped, a tab as two spaces, its widest line counted', () => {
	const written = codeOf("\t\tlight.on('#a', { air: 60 }), // lit\n\t\t\tawait shot");
	expect([written.lines, written.columns]).toEqual([
		[
			[
				{ text: 'light.', kind: null },
				{ text: 'on', kind: 'call' },
				{ text: '(', kind: null },
				{ text: "'#a'", kind: 'string' },
				{ text: ', { ', kind: null },
				{ text: 'air', kind: 'key' },
				{ text: ': ', kind: null },
				{ text: '60', kind: 'number' },
				{ text: ' }), ', kind: null },
				{ text: '// lit', kind: 'comment' }
			],
			[
				{ text: '  ', kind: null },
				{ text: 'await', kind: 'keyword' },
				{ text: ' shot', kind: null }
			]
		],
		35
	]);
});

test("a line of the agent's work leads with its tool, and the thinking line with the spinner of its moment", () => {
	const terminal = {
		...openTerminal('A terminal'),
		lines: [
			{ kind: 'work', text: 'Read app/api.py' },
			{ kind: 'thinking', text: 'Working…' }
		]
	} as const;
	const early = drawnTerminal(terminal, 0).lines;
	const later = drawnTerminal(terminal, 0.1).lines;
	expect(early[0]).toEqual({ kind: 'work', lead: 'Read', text: 'app/api.py' });
	expect(early[1]?.lead).not.toBe(later[1]?.lead);
});

test("a block of a page of the film's own that blinks stands whole as its blink begins, fades out on a cosine to none half its seconds on, and comes back whole a blink on", () => {
	const card: Screen = {
		...SCREEN_UP,
		documents: new Map([['card', { typed: new Map(), scrollLength: 0 }]]),
		blinks: new Map([['card', new Map([['.caret', { since: 18, seconds: 1.06 }]])]])
	};
	expect([18, 18.265, 18.53, 19.06].map((moment) => ownPageStanding(card, 'card', moment).blinking)).toEqual([
		[{ into: '.caret', clear: 1 }],
		[{ into: '.caret', clear: expect.closeTo(0.5) }],
		[{ into: '.caret', clear: 0 }],
		[{ into: '.caret', clear: 1 }]
	]);
});

test('the caret blinks with the moment', () => {
	const terminal = openTerminal('A terminal');
	expect([drawnTerminal(terminal, 0).caret, drawnTerminal(terminal, 0.5).caret]).toEqual([true, false]);
});

test("a figure a quarter of its way in a way of livereel's stands as the way has it: faded; out from behind its foot or its left edge, its cut standing where the figure stands whole; wiped in from its left; opened from its middle; grown from its middle; its shadow a quarter as strong where it is cut; on no way at the end, nor in its own way", () => {
	const unshifted = { across: 0, down: 0 };
	const uncut = { kind: 'inset', top: 0, right: 0, bottom: 0, left: 0 };
	expect([
		alongItsWay({ kind: 'fade' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'bottom' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'left' }, 0.25),
		alongItsWay({ kind: 'wipe', edge: 'left', sheen: null, crossing: THE_FIGURE }, 0.25),
		alongItsWay({ kind: 'iris' }, 0.25),
		alongItsWay({ kind: 'grow' }, 0.25),
		alongItsWay({ kind: 'mask', edge: 'top' }, 1),
		alongItsWay({ kind: 'own' }, 0.25)
	]).toEqual([
		{ shift: unshifted, scale: 1, clear: 0.25, shadow: 1, cut: null },
		{
			shift: { across: 0, down: 0.75 },
			scale: 1,
			clear: 1,
			shadow: 0.25,
			cut: { ...uncut, top: -0.75, bottom: 0.75 }
		},
		{
			shift: { across: -0.75, down: 0 },
			scale: 1,
			clear: 1,
			shadow: 0.25,
			cut: { ...uncut, right: -0.75, left: 0.75 }
		},
		{ shift: unshifted, scale: 1, clear: 1, shadow: 0.25, cut: { ...uncut, right: 0.75 } },
		{ shift: unshifted, scale: 1, clear: 1, shadow: 0.25, cut: { kind: 'circle', radius: 0.25 } },
		{ shift: unshifted, scale: 0.25, clear: 1, shadow: 1, cut: null },
		null,
		null
	]);
});

test('a wipe with a sheen cuts its figure on past its far side as far as the light trails, so the light runs off it: a quarter gone back to its right edge, trailing a quarter of the figure, its edge 0.3125 in from the left and the light back to 0.0625; a wipe with none, and one at the end of its way, has no light', () => {
	const lit: Way = { kind: 'wipe', edge: 'right', sheen: { colour: '#59c470', trail: 0.25 }, crossing: THE_FIGURE };
	expect([
		alongItsWay(lit, 0.75)?.cut,
		sheenAlong(lit, 0.75),
		sheenAlong({ kind: 'wipe', edge: 'right', sheen: null, crossing: THE_FIGURE }, 0.75),
		sheenAlong(lit, 1)
	]).toEqual([
		{ kind: 'inset', top: 0, right: 0, bottom: 0, left: 0.3125 },
		{ from: 'left', faded: 0.0625, edge: 0.3125, colour: '#59c470', crossing: THE_FIGURE },
		null,
		null
	]);
});

test("a wipe crossing a box wider than its figure sets off from the box's near side and runs past its far side and the light's trail, its light in shares of the box, and leaves of a block what its edge has not crossed: three figures wide from one before it, a quarter gone back to its right edge, its edge 0.1875 of the figure short of its left and the light back to 0.4375 short, 0.2708 and 0.1875 of the box; a block from 100 before the figure, 100 wide, covered from 18.75 before it; from its left edge with no light, to 25 past its right; the whole block on no way and in a fade, none once the edge has passed it", () => {
	const crossing = { left: -1, top: -0.2, width: 3, height: 1.6 };
	const fromTheLeft: Way = { kind: 'wipe', edge: 'right', sheen: { colour: null, trail: 0.25 }, crossing };
	const fromTheRight: Way = { kind: 'wipe', edge: 'left', sheen: null, crossing };
	const figure = { left: 1200, top: 605, width: 100, height: 50 };
	const block = { left: 1100, top: 590, width: 300, height: 80 };
	expect([
		alongItsWay(fromTheLeft, 0.75)?.cut,
		sheenAlong(fromTheLeft, 0.75),
		stillCovered(fromTheLeft, 0.75, figure, block),
		stillCovered(fromTheRight, 0.75, figure, block),
		stillCovered(fromTheLeft, 1, figure, block),
		stillCovered({ kind: 'fade' }, 0.25, figure, block),
		stillCovered(fromTheRight, 0, figure, block)
	]).toEqual([
		{ kind: 'inset', top: 0, right: 0, bottom: 0, left: -0.1875 },
		{ from: 'left', faded: 0.1875, edge: expect.closeTo(0.2708), colour: null, crossing },
		{ left: 1181.25, top: 590, width: 218.75, height: 80 },
		{ left: 1100, top: 590, width: 225, height: 80 },
		block,
		block,
		null
	]);
});

test("a band sweeping the screen's picture away crosses the window from the side the film names to the other, slanted as it names: past the near side at none, through the middle half-way, past the far side at whole, by half its width each; the picture still to sweep reaching from it past the window's far corner; its ends as far apart as the window's corners, the one nearer the top first", () => {
	// A window showing 600 × 800 of the screen from its corner, its corners 1000 apart, the camera at a zoom of 1, so
	// the band's half width, 60, stands as many of the screen's pixels past a side
	const shown = { left: 0, top: 0, width: 600, height: 800 };
	const crest = { start: '#5b8def', end: '#bca6ea' };
	const fromTheLeft: Sweep = { kind: 'band', picture: 1, from: 'left', slant: 0, width: 120, crest, swept: NONE };
	const slantedFromTheRight: Sweep = { ...fromTheLeft, from: 'right', slant: -30, swept: fractionOf(0.5) };
	expect([
		drawnSweep(fromTheLeft, shown, 1),
		drawnSweep({ ...fromTheLeft, swept: fractionOf(0.5) }, shown, 1).shape.band,
		drawnSweep({ ...fromTheLeft, swept: WHOLE }, shown, 1).shape.band,
		drawnSweep(slantedFromTheRight, shown, 1)
	]).toEqual([
		{
			picture: 1,
			shape: {
				kind: 'band',
				band: { start: { left: -60, top: -100 }, end: { left: -60, top: 900 } },
				ahead: { left: 720, top: 0 }
			},
			width: 120,
			crest
		},
		{ start: { left: 300, top: -100 }, end: { left: 300, top: 900 } },
		{ start: { left: 660, top: -100 }, end: { left: 660, top: 900 } },
		{
			picture: 1,
			shape: {
				kind: 'band',
				band: {
					start: { left: expect.closeTo(50), top: expect.closeTo(-33.01) },
					end: { left: expect.closeTo(550), top: expect.closeTo(833.01) }
				},
				ahead: { left: expect.closeTo(-900.33), top: expect.closeTo(519.81) }
			},
			width: 120,
			crest
		}
	]);
});

test("a band sweeping the screen crosses what the window shows of the screen, not the ground past the screen's edges", () => {
	// The whole screen, 600 × 400, fitted to a frame 400 square, 1.8 film pixels a page's: the view shows 100 of ground
	// above the screen and below it, which the band does not cross. Its way down is the screen's 400 and its own width,
	// 160 / 1.8, so it sets off half of that above the screen's top; it is as long as the screen's corners stand apart,
	// 721.11
	const sweep: Sweep = {
		kind: 'band',
		picture: 1,
		from: 'top',
		slant: 0,
		width: 160,
		crest: { start: '#5b8def', end: '#bca6ea' },
		swept: NONE
	};
	const drawn = drawnScreen(
		{ ...SCREEN_UP, sweep },
		cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL),
		SMALL,
		SEES_THE_FRONT,
		PANE_CORNER,
		AT_THE_START,
		NOTHING_PAST
	);
	expect(drawn.sweep!.shape.band).toEqual({
		start: { left: expect.closeTo(-60.56), top: expect.closeTo(-44.44) },
		end: { left: expect.closeTo(660.56), top: expect.closeTo(-44.44) }
	});
});

test("the screen shows the page on the window's back where the eye sees the window's back, standing as its mount says, the page in front where the eye sees the front, and the front seen through where the back shows none", () => {
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	const front: Shows = { kind: 'own', key: 'front', reach: CUT_AT_THE_SCREEN };
	const backed: Screen = { ...LAID_UP, shows: front, back: { kind: 'own', key: 'behind', upright: 'over' } };
	const bare: Screen = { ...LAID_UP, shows: front };
	const drawn = [
		drawnScreen(backed, camera, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START, NOTHING_PAST),
		drawnScreen(backed, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START, NOTHING_PAST),
		drawnScreen(bare, camera, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START, NOTHING_PAST)
	];
	expect(drawn.map((screen) => [screen.shows, screen.backUpright])).toEqual([
		[{ kind: 'own', key: 'behind', scrolled: 0, typed: [], blinking: [], sheet: null }, 'over'],
		[{ kind: 'own', key: 'front', scrolled: 0, typed: [], blinking: [], sheet: null }, null],
		[{ kind: 'own', key: 'front', scrolled: 0, typed: [], blinking: [], sheet: null }, null]
	]);
});

test("a page of the film's own keeps its run whichever face of the window shows it", () => {
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	// One page in front and behind, run 40 pixels down by 0 s and on at 10 a second: 60 down at 2 s
	const running: Scroll = { knots: [{ moment: 0, top: 40, pace: 10 }] };
	const both: Screen = {
		...LAID_UP,
		shows: { kind: 'own', key: 'page', reach: CUT_AT_THE_SCREEN },
		back: { kind: 'own', key: 'page', upright: 'over' },
		scrolls: new Map([['page', running]])
	};
	expect([
		drawnScreen(both, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, 2, NOTHING_PAST).shows,
		drawnScreen(both, camera, SMALL, SEES_THE_BACK, PANE_CORNER, 2, NOTHING_PAST).shows
	]).toEqual([
		{ kind: 'own', key: 'page', scrolled: 60, typed: [], blinking: [], sheet: null },
		{ kind: 'own', key: 'page', scrolled: 60, typed: [], blinking: [], sheet: null }
	]);
});

// A frame whose screen is as large: the camera at a zoom of 1 on its middle shows the whole screen edge to edge
const SCREEN_AS_LARGE: Format = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
const ON_THE_WHOLE_SCREEN = { focusX: 960, focusY: 540, zoom: 1 };
// The whole frame face-on; and leant back 64° about its foot's middle, as the promo's crawl leans
const FACE_ON_WHOLE: Camera = {
	pose: ON_THE_WHOLE_SCREEN,
	view: wholeView(SCREEN_AS_LARGE.frame),
	eye: eyeAtRest(FOCAL_LENGTH)
};
const LEANT_BACK: Camera = {
	...FACE_ON_WHOLE,
	view: { ...FACE_ON_WHOLE.view, angle: { ...FACE_ON, tilt: 64 }, about: { left: 0.5, top: 1 } }
};
// The scene a film in that format opens on; and no picture the stage holds sharper
const OPENING_AS_LARGE = openingScene(SCREEN_AS_LARGE, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH);
const NONE_SHARPER: readonly never[] = [];
// A page drawn as far as its document runs, 200000 of its pixels longer than the screen holds, run so far down
const DRAWN_PAST: Shows = { kind: 'own', key: 'sheet', reach: DRAWN_TO_ITS_DOCUMENT };

/** A screen showing the long page drawn as far as its document runs, standing so far down it. */
function sheetRunTo(top: number): Screen {
	const standing: Scroll = { knots: [{ moment: AT_THE_START, top, pace: 0 }] };
	return { ...LAID_UP, shows: DRAWN_PAST, scrolls: new Map([['sheet', standing]]) };
}

test("a page of the film's own drawn as far as its document runs is drawn on the screen alone where the frame sees nothing past the screen, face-on and whole", () => {
	expect(pastTheScreen(sheetRunTo(100000), FACE_ON_WHOLE, SCREEN_AS_LARGE, AT_THE_START)).toBeNull();
});

test("a page of the film's own drawn as far as its document runs, leant back, is drawn above the screen as far as the frame sees, its top standing at the frame's top edge, and no farther than what has run past the screen's top", () => {
	const far = pastTheScreen(sheetRunTo(100000), LEANT_BACK, SCREEN_AS_LARGE, AT_THE_START)!;
	const near = pastTheScreen(sheetRunTo(300), LEANT_BACK, SCREEN_AS_LARGE, AT_THE_START)!;
	const sheetsTop = onTheFrame(LEANT_BACK, SCREEN_AS_LARGE.frame, { left: 960, top: -far.above });
	expect([sheetsTop.top, near.above]).toEqual([expect.closeTo(0), 300]);
});

test("a page of the film's own drawn as far as its document runs is drawn below the screen no farther than its document's end, and on the screen alone run to its end where the frame sees nothing above", () => {
	const leantAboutItsTop: Camera = { ...LEANT_BACK, view: { ...LEANT_BACK.view, about: { left: 0.5, top: 0 } } };
	const nearItsEnd = pastTheScreen(sheetRunTo(LONG_DOCUMENT - 40), leantAboutItsTop, SCREEN_AS_LARGE, AT_THE_START)!;
	const atItsEnd = pastTheScreen(sheetRunTo(LONG_DOCUMENT), leantAboutItsTop, SCREEN_AS_LARGE, AT_THE_START);
	expect([nearItsEnd.below, atItsEnd]).toEqual([40, null]);
});

test("the camera's cut stands at the edges of a sheet laid past the screen, not at the screen's", () => {
	// Leant back about its foot, the page run far down: the sheet runs up to the frame's top edge, the cut with it
	const scene = { ...OPENING_AS_LARGE, screen: sheetRunTo(100000) };
	const past = pastTheScreen(scene.screen, LEANT_BACK, SCREEN_AS_LARGE, AT_THE_START)!;
	const cut = drawn(scene, LEANT_BACK, AT_THE_START, SCREEN_AS_LARGE, NONE_SHARPER).camera.cut;
	expect([cut.top, cut.bottom]).toEqual([expect.closeTo(-past.above), 0]);
});

test("where the eye sees a page on the window's back, the page in front is drawn on its screen alone, no sheet laid and the camera's cut at the screen", () => {
	// Leant back and turned over round its width, the window shows the eye its back, the frame seeing far past its
	// screen's top
	const turnedOver: Camera = {
		...LEANT_BACK,
		view: { ...LEANT_BACK.view, angle: { ...FACE_ON, tilt: 64, over: 180 } }
	};
	const backed: Screen = { ...sheetRunTo(100000), back: { kind: 'own', key: 'behind', upright: 'over' } };
	const cutAtTheScreen: Screen = { ...backed, shows: { ...DRAWN_PAST, reach: CUT_AT_THE_SCREEN } };
	const [drawnPast, drawnCut] = [backed, cutAtTheScreen].map((screen) =>
		drawn({ ...OPENING_AS_LARGE, screen }, turnedOver, AT_THE_START, SCREEN_AS_LARGE, NONE_SHARPER)
	);
	expect([drawnPast!.screen.shows, drawnPast!.camera]).toEqual([
		{ kind: 'own', key: 'behind', scrolled: 0, typed: [], blinking: [], sheet: null },
		drawnCut!.camera
	]);
});

test('what a film typed into a page of its own drawn past its screen is handed with its sheet, so the stage writes it there too', () => {
	const typed: OwnDocument = { typed: new Map([['#typed', 'ls']]), scrollLength: LONG_DOCUMENT };
	const typedInto: Screen = { ...sheetRunTo(100000), documents: new Map([['sheet', typed]]) };
	const past = pastTheScreen(typedInto, LEANT_BACK, SCREEN_AS_LARGE, AT_THE_START);
	const drawn = drawnScreen(typedInto, LEANT_BACK, SCREEN_AS_LARGE, SEES_THE_FRONT, PANE_CORNER, AT_THE_START, past);
	expect(drawn.shows).toEqual({
		kind: 'own',
		key: 'sheet',
		scrolled: 100000,
		typed: [{ into: '#typed', text: 'ls' }],
		blinking: [],
		sheet: { ...past, scrolled: 100000 - past!.above }
	});
});

test("the filmed page lies on the window's plane where the camera frames it, as round as a pane at the frame's scale; nowhere where the screen shows a page of the film's own, in front or on the window's back", () => {
	// The whole frame, 400 square, a pixel of it 1080 / 400 film pixels: the whole screen, 600 × 400, fitted to it stands
	// 400 × 266.67 in its middle; a camera at a zoom of 2.7, a page's pixel to a frame's, on the screen's point 150
	// across and 200 down stands the screen 50 in from the frame's left
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	const close: Camera = { ...camera, pose: { focusX: 150, focusY: 200, zoom: 2.7 } };
	const backed: Screen = { ...LAID_UP, back: { kind: 'own', key: 'behind', upright: 'round' } };
	const drawn = [
		drawnScreen(SCREEN_UP, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START, NOTHING_PAST),
		drawnScreen(SCREEN_UP, close, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START, NOTHING_PAST),
		drawnScreen(backed, close, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START, NOTHING_PAST),
		drawnScreen(
			{ ...LAID_UP, shows: { kind: 'own', key: 'front', reach: CUT_AT_THE_SCREEN } },
			close,
			SMALL,
			SEES_THE_FRONT,
			PANE_CORNER,
			AT_THE_START,
			NOTHING_PAST
		)
	];
	expect(drawn.map((screen) => screen.filmed)).toEqual([
		{
			box: { left: 0, top: expect.closeTo(66.67), width: 400, height: expect.closeTo(266.67) },
			corner: expect.closeTo(8.89)
		},
		{
			box: { left: expect.closeTo(50), top: 0, width: expect.closeTo(600), height: expect.closeTo(400) },
			corner: expect.closeTo(8.89)
		},
		null,
		null
	]);
});

// A disc 90 wide, its crest in the look's accent, round a point of a part of the screen a window shows, 600 × 800 from
// its corner
const DISC: Sweep = {
	kind: 'disc',
	picture: 1,
	round: { left: 150, top: 120 },
	width: 90,
	crest: { start: null, end: null },
	swept: NONE
};
const PART_SHOWN = { left: 0, top: 0, width: 600, height: 800 };

test('a disc opens from its ring standing wholly in its middle, or at the nearest point the window shows where its middle stands past it, to standing wholly past the farthest corner the window shows, its ring as wide on the frame at any zoom', () => {
	// At a zoom of 2 half the ring's 90 is 22.5 of the screen's pixels. From (150, 120) the part's farthest corner, its
	// bottom right, stands 815.41 away; from (900, 120), past its right side, its nearest point 300, and its farthest
	// corner, its bottom left, 1,128.01
	const pastTheRight: Sweep = { ...DISC, round: { left: 900, top: 120 } };
	expect([
		drawnSweep(DISC, PART_SHOWN, 2).shape,
		drawnSweep({ ...DISC, swept: WHOLE }, PART_SHOWN, 2).shape,
		drawnSweep(pastTheRight, PART_SHOWN, 2).shape,
		drawnSweep({ ...pastTheRight, swept: WHOLE }, PART_SHOWN, 2).shape
	]).toEqual([
		{ kind: 'disc', middle: { left: 150, top: 120 }, radius: -22.5 },
		{ kind: 'disc', middle: { left: 150, top: 120 }, radius: expect.closeTo(815.41 + 22.5) },
		{ kind: 'disc', middle: { left: 900, top: 120 }, radius: 300 - 22.5 },
		{ kind: 'disc', middle: { left: 900, top: 120 }, radius: expect.closeTo(1128.01 + 22.5) }
	]);
});
