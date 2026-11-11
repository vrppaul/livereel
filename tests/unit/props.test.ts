import { expect, test } from 'vitest';
import { codeOf } from '../../src/props/code.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { LIVEREELS_WORLD } from '../../src/props/world.ts';
import { drawnTerminal, openTerminal } from '../../src/props/terminal.ts';
import {
	SCREEN_UP,
	type Screen,
	type Scroll,
	type Shows,
	type Sweep,
	drawnScreen,
	drawnSweep
} from '../../src/props/screen.ts';
import { cameraOf, openingScene } from '../../src/scene.ts';
import { alongItsWay } from '../../src/props/way.ts';
import { NONE, WHOLE, fractionOf } from '../../src/domain/fraction.ts';
import { type DrawnWords, type Piece, comingUpIn, drawnWords, saidOf, typedComingUp } from '../../src/props/words.ts';
import { type Keystroke, lettersOf } from '../../src/domain/typing.ts';
import { FOCAL_LENGTH, SMALL } from './fakes.ts';
import type { Camera } from '../../src/domain/camera.ts';

// The side of the page's window the eye sees: its front, or its back
const SEES_THE_FRONT = true;
const SEES_THE_BACK = false;
// How round a pane's corners are, in pixels of a frame 1080 high
const PANE_CORNER = 24;
// The moment a screen is drawn at where no page of it runs
const AT_THE_START = 0;

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
		alongItsWay({ kind: 'wipe', edge: 'left' }, 0.25),
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
	// The whole screen, 600 × 400, fitted to a frame 400 square, 1.8 of a frame 1080 high's pixels a page's: the view
	// shows 100 of ground above the screen and below it, which the band does not cross. Its way down is the screen's
	// 400 and its own width, 160 / 1.8, so it sets off half of that above the screen's top; it is as long as the
	// screen's corners stand apart, 721.11
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
		AT_THE_START
	);
	expect(drawn.sweep!.shape.band).toEqual({
		start: { left: expect.closeTo(-60.56), top: expect.closeTo(-44.44) },
		end: { left: expect.closeTo(660.56), top: expect.closeTo(-44.44) }
	});
});

test("the screen shows the page on the window's back where the eye sees the window's back, standing as its mount says, the page in front where the eye sees the front, and the front seen through where the back shows none", () => {
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	const front: Shows = { kind: 'own', key: 'front' };
	const backed: Screen = { ...SCREEN_UP, shows: front, back: { kind: 'own', key: 'behind', upright: 'over' } };
	const bare: Screen = { ...SCREEN_UP, shows: front };
	const drawn = [
		drawnScreen(backed, camera, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START),
		drawnScreen(backed, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START),
		drawnScreen(bare, camera, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START)
	];
	expect(drawn.map((screen) => [screen.shows, screen.backUpright])).toEqual([
		[{ kind: 'own', key: 'behind', scrolled: 0 }, 'over'],
		[{ ...front, scrolled: 0 }, null],
		[{ ...front, scrolled: 0 }, null]
	]);
});

test("a page of the film's own keeps its run whichever face of the window shows it", () => {
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	// One page in front and behind, run 40 pixels down by 0 s and on at 10 a second: 60 down at 2 s
	const running: Scroll = { top: 40, since: 0, paces: [10], seconds: 0, length: 1000 };
	const both: Screen = {
		...SCREEN_UP,
		shows: { kind: 'own', key: 'page' },
		back: { kind: 'own', key: 'page', upright: 'over' },
		scrolls: new Map([['page', running]])
	};
	expect([
		drawnScreen(both, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, 2).shows,
		drawnScreen(both, camera, SMALL, SEES_THE_BACK, PANE_CORNER, 2).shows
	]).toEqual([
		{ kind: 'own', key: 'page', scrolled: 60 },
		{ kind: 'own', key: 'page', scrolled: 60 }
	]);
});

test("the filmed page lies on the window's plane where the camera frames it, as round as a pane at the frame's scale; nowhere where the screen shows a page of the film's own, in front or on the window's back", () => {
	// The whole frame, 400 square, 400 / 1080 of a frame 1080 high's pixels: the whole screen, 600 × 400, fitted to it
	// stands 400 × 266.67 in its middle; a camera at a zoom of 2.7, a page's pixel to a frame's, on the screen's point
	// 150 across and 200 down stands the screen 50 in from the frame's left
	const camera = cameraOf(openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH), SMALL);
	const close: Camera = { ...camera, pose: { focusX: 150, focusY: 200, zoom: 2.7 } };
	const backed: Screen = { ...SCREEN_UP, back: { kind: 'own', key: 'behind', upright: 'round' } };
	const drawn = [
		drawnScreen(SCREEN_UP, camera, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START),
		drawnScreen(SCREEN_UP, close, SMALL, SEES_THE_FRONT, PANE_CORNER, AT_THE_START),
		drawnScreen(backed, close, SMALL, SEES_THE_BACK, PANE_CORNER, AT_THE_START),
		drawnScreen(
			{ ...SCREEN_UP, shows: { kind: 'own', key: 'front' } },
			close,
			SMALL,
			SEES_THE_FRONT,
			PANE_CORNER,
			AT_THE_START
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
