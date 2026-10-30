/**
 * livereel's ad for a feed, square, for developers: it opens on a finished frame that claims nobody filmed it, asks
 * how, answers with a real click, shows what the camera does shot by shot, then the file that shot it, a change made
 * to it, every value a film sets, the keyboards it is heard on, the prompts it took, and ends on the frame it opened
 * on, its words changed. It reads with the sound off; the click, the keys and the chime are for those who turn it on.
 *
 *     pnpm livereel shoot examples/livereel-ad.ts --out out/ad --sheet --renderer gpu
 *
 * Acme's analytics app is served by the film itself. The code on the screen is this file: regions of it marked
 * `// #region name`, read by `regionsOf`, or the whole of it, read by `sourceOf` (`livereel-promo/code.ts`), so it is
 * the code that shot the film.
 */
import {
	type ActContext,
	type Format,
	type Move,
	type Place,
	type Step,
	type TerminalLine,
	type Theme,
	type Wording,
	act,
	camera,
	code,
	cursor,
	cut,
	defineFilm,
	easeInOutCubic,
	easeOutCubic,
	hold,
	keystrokes,
	light,
	look,
	page,
	play,
	sound,
	terminal,
	title,
	typing,
	window
} from 'livereel';
import { regionNamed, regionsOf, sourceOf } from './livereel-promo/code.ts';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A square, as a feed shows it, the app laid out on a screen as wide as its window
const SQUARE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1040, height: 1080 } };
// Where the words stand: a headline across the top, a line under it, code under it or over most of the frame
const HEADLINE: Place = { left: 0.067, top: 0.045, width: 0.866, height: 0.22 };
const UNDER_THE_HEADLINE: Place = { left: 0.067, top: 0.255, width: 0.866, height: 0.08 };
const CODE_UNDER_THE_HEADLINE: Place = { left: 0.067, top: 0.24, width: 0.866, height: 0.27 };
const MOST_OF_THE_FRAME: Place = { left: 0.067, top: 0.2, width: 0.866, height: 0.75 };
// Where the window stands: under the headline, as the film opens and ends; low, under code
const UNDER_THE_HEADLINE_WINDOW: Place = { left: 0.1, top: 0.37, width: 0.8, height: 0.56 };
const LOW_WINDOW: Place = { left: 0.067, top: 0.55, width: 0.866, height: 0.39 };
// Where the window travels, the words taking the room it leaves: a half of the frame on either side, the words in the
// other, the window as near square as the screen, so the page fills it whole; then wide and low, past the frame's
// foot, the words over it
const RIGHT_HALF_WINDOW: Place = { left: 0.47, top: 0.25, width: 0.47, height: 0.49 };
const LEFT_HALF_WINDOW: Place = { left: 0.06, top: 0.25, width: 0.47, height: 0.49 };
const LEFT_OF_THE_WINDOW: Place = { left: 0.067, top: 0.36, width: 0.37, height: 0.28 };
const RIGHT_OF_THE_WINDOW: Place = { left: 0.583, top: 0.36, width: 0.37, height: 0.28 };
const PAST_THE_FOOT_WINDOW: Place = { left: 0.03, top: 0.36, width: 0.94, height: 0.84 };
// How far into a travel the last words are gone, before the window crosses them, and how far into it the window has
// left the room the next words come up in, each a share of the step
const WORDS_GONE = 0.3;
const ROOM_LEFT = 0.7;
// The app's blocks the film looks at. The row of cards is the camera's home: it frames them, Refresh above, in every
// shot but the question's rush to the count and the search the keys are typed into
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
const TOP_PAGES = '[data-testid=top-pages]';
const SEARCH = '[data-testid=search]';
// How dim the page goes round the block lit
const LIGHT_DIM = 0.35;
// The word set apart in a headline, in the accent's amber
const AMBER = '#fbbf24';
// The headlines' letters: the claim, the question set huge, and the rest
const CLAIM_SIZE = 96;
const QUESTION_SIZE = 230;
const LINE_SIZE = 72;
// What is typed into the search, each on a keyboard of its own
const BLOG = keystrokes('blog', { seed: 5 });
const CAREERS = keystrokes('careers', { seed: 6 });
const DOCS = keystrokes('docs', { seed: 7 });
// The window standing face-on, as it travels
const FACE_ON = { tilt: 0, turn: 0 };
// The agent's terminal, across most of the frame, from under the headline down to as near the frame's foot as its
// sides stand to its edges; the owner's prompts while this film was made, and the last one, typed
const TERMINAL = 'claude — livereel';
const TERMINAL_PLACE: Place = { left: 0.07, top: 0.27, width: 0.86, height: 0.66 };
const PROMPTS: readonly TerminalLine[] = [
	{ kind: 'asked', text: 'frame 2 — not the whole screen. show the background' },
	{ kind: 'asked', text: "why don't we push the terminal?" },
	{ kind: 'asked', text: "that's shit. do it" },
	{ kind: 'asked', text: 'add the sounds. and show them' },
	{ kind: 'asked', text: 'the first frame is the preview. make it hook' }
];
const SHIP_IT = keystrokes('ok. ship it', { seed: 9, pace: 0.6 });
// The credit typed as the last prompt was, by the same hand
const CREDIT_TYPED = { seed: 11 };
const NO_THINKING = 0;
const THINKING = 'Reading…';
// The chime as the film ends: livereel's own, from this file's folder
const CHIME = '../sounds/ending.ogg';
// The look the film opens and ends on: a night ground, its glow high on the right, a violet shadow under the window
const NIGHT: Theme = {
	ground: '#1e1b4b',
	glow: '#3730a3',
	glowX: 0.8,
	glowY: 0.12,
	ink: '#f5f3ff',
	quietInk: '#c7d2fe',
	paneEdge: '#ffffff24',
	paneShadowColour: '#7c3aed',
	paneCorner: 24,
	accent: '#ffb224'
};
// The code large enough to read in a feed, and the terminal's letters
const THEME: Theme = { ...NIGHT, codeSize: 34, terminalSize: 30 };
// The looks the film changes to at once, one after another, then back to the night
const PAPER: Theme = { ground: '#f5efe6', glow: '#fffaf2', ink: '#1a1a1a', paneEdge: '#00000033' };
const SQUARE_CORNERS: Theme = { paneCorner: 0 };
const CYAN: Theme = { accent: '#22d3ee' };
const REGIONS = await regionsOf(new URL(import.meta.url));
// This file whole, scrolled through to the film's acts
const SOURCE = await sourceOf(new URL(import.meta.url));
// The comma a move in a list of moves stands before when another follows it
const AFTER_AN_ITEM = /,$/u;

/** The lines of one-line regions, each set at the code's left edge, as one piece of code. */
function linesOf(regions: readonly string[]): string {
	return regions.map((region) => regionNamed(REGIONS, region).trim().replace(AFTER_AN_ITEM, '')).join('\n');
}

/** A headline in its place across the top, in place of any shown, at a size of its own. */
function headline(text: Wording, size: number): Move {
	return title.show(text, { at: HEADLINE, size, within: { start: 0.2 } });
}

/**
 * The window travelling to a place, face-on, straightening on its way where it leant, the camera framing the cards
 * anew in it, the last words gone before it crosses them, and the words of the travel coming up in the room it leaves
 * once it has left it; then a beat to read them.
 */
function travelled(text: string, windowPlace: Place, wordsPlace: Place): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [
				window.to(windowPlace),
				window.lean(FACE_ON),
				camera.onto(CARDS),
				title.hide({ within: { end: WORDS_GONE } }),
				title.show(text, { at: wordsPlace, size: LINE_SIZE, within: { start: ROOM_LEFT } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.6 })
	];
}

async function refreshed(context: ActContext, served: AppServed): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: served.refreshed.visitors }).waitFor();
}

/** The act of a click on Refresh, for the app served. */
function refreshing(served: AppServed): (context: ActContext) => Promise<void> {
	return (context) => refreshed(context, served);
}

/** The search holding the keys, so what is typed goes into it. */
function searchFocused(context: ActContext): Promise<void> {
	return context.page.locator(SEARCH).focus();
}

/** The search emptied, every top page listed again. */
function searchCleared(context: ActContext): Promise<void> {
	return context.page.locator(SEARCH).fill('');
}

/** The search emptied and typed into again, its line lit: the keys heard on the keyboard the line names. */
function searchedAgain(line: string, typed: readonly Step[]): readonly Step[] {
	return [act(searchCleared), cut(code.light(line)), ...typed, hold({ seconds: 0.6 })];
}

/**
 * Frame 0, the feed's preview, finished: the app in a window leaning under the claim, the cursor by Refresh, nothing
 * lit, as the light is a beat of its own; from frame 1 the camera creeps toward the count.
 */
function actTheClaim(): readonly Step[] {
	return [
		cut(
			window.to(UNDER_THE_HEADLINE_WINDOW),
			camera.onto(CARDS),
			window.lean({ tilt: 20, turn: -18 }),
			cursor.to(REFRESH),
			title.show('i have not filmed a single frame of this.', { at: HEADLINE, size: CLAIM_SIZE })
		),
		play({ seconds: 2.4, moves: [window.lean({ tilt: 14, turn: -12 })] })
	];
}

/** The question, one huge word, as the camera rushes to the count. */
function actTheQuestion(): readonly Step[] {
	return [
		play({
			seconds: 0.7,
			moves: [headline('how?', QUESTION_SIZE), camera.onto(VISITORS), window.lean({ tilt: 6, turn: -6 })],
			ease: easeOutCubic
		}),
		hold({ seconds: 1.3 })
	];
}

/** The answer: the camera draws back as the window turns face-on, a real click changes the count, and who made it. */
function actTheAnswer(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1.8,
			moves: [
				camera.onto(CARDS, { within: { end: 0.5 } }),
				window.lean({ tilt: 0, turn: 0, within: { end: 0.5 } }),
				headline(['claude code did this. using ', { text: 'livereel', italic: true, ink: AMBER }, '.'], LINE_SIZE)
			],
			ease: easeInOutCubic
		}),
		...cursor.click(refreshing(served)),
		hold({ seconds: 1.4 })
	];
}

/** The window leaning the other way from below, the camera still on the cards. */
function actTheLean(): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({
			seconds: 1,
			moves: [headline('it leans.', LINE_SIZE), window.lean({ tilt: -12, turn: 22 })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1 })
	];
}

/**
 * The window straightening as it sets off, then travelling across the frame and down past its foot, the words of the
 * travel taking the room it leaves each time and saying something new there.
 */
function actTheTravel(): readonly Step[] {
	return [
		...travelled('it travels.', RIGHT_HALF_WINDOW, LEFT_OF_THE_WINDOW),
		...travelled('anywhere.', LEFT_HALF_WINDOW, RIGHT_OF_THE_WINDOW),
		...travelled('even past the edge.', PAST_THE_FOOT_WINDOW, HEADLINE)
	];
}

/** The window back under the headline, a light coming up on the count, then carried to Refresh. */
function actTheLight(): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [headline('it lights one block.', LINE_SIZE), window.to(UNDER_THE_HEADLINE_WINDOW)],
			ease: easeInOutCubic
		}),
		play({ seconds: 0.6, moves: [light.on(VISITORS, { dim: LIGHT_DIM })], ease: easeOutCubic }),
		hold({ seconds: 0.4 }),
		play({ seconds: 0.8, moves: [light.to(REFRESH)], ease: easeInOutCubic }),
		hold({ seconds: 0.8 })
	];
}

/**
 * The light out, the film's file under the headline, the window low: a move it makes, then the same move made slower.
 */
function actTheFile(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				light.off({ within: { end: 0.4 } }),
				headline('this is the whole film. a typescript file.', LINE_SIZE),
				window.to(LOW_WINDOW),
				code.show(linesOf(['quick-seconds', 'quick-move']), {
					at: CODE_UNDER_THE_HEADLINE,
					within: { start: 0.4 }
				})
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 }),
		play({
			// #region quick-seconds
			seconds: 1.4,
			// #endregion
			moves: [
				code.light('seconds', { through: 'window', within: { end: 0.1 } }),
				// #region quick-move
				window.lean({ tilt: -12, turn: 18 })
				// #endregion
			]
		}),
		play({ seconds: 0.8, moves: [window.lean({ tilt: 0, turn: 0 })] }),
		hold({ seconds: 0.6 }),
		play({
			seconds: 1,
			moves: [
				headline('i asked for slower. it did.', LINE_SIZE),
				code.show(linesOf(['slow-seconds', 'slow-move']), { at: CODE_UNDER_THE_HEADLINE })
			],
			ease: easeInOutCubic
		}),
		play({
			// #region slow-seconds
			seconds: 4,
			// #endregion
			moves: [
				code.light('seconds', { through: 'window', within: { end: 0.1 } }),
				// #region slow-move
				window.lean({ tilt: -12, turn: 18 })
				// #endregion
			]
		}),
		hold({ seconds: 0.8 })
	];
}

/**
 * The window pushed off, this film's file over most of the frame, scrolled through fast to its acts, read one by one,
 * this one among them.
 */
function actTheCode(): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [
				headline('readable. diffable. yours.', LINE_SIZE),
				window.hide({ toward: 'left' }),
				code.show(SOURCE, { at: MOST_OF_THE_FRAME, from: 'right', longLines: 'cut' })
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 1.4, moves: [code.scrollTo(playing('Claim'))], ease: easeInOutCubic }),
		hold({ seconds: 0.4 }),
		cut(code.light(playing('Claim'))),
		hold({ seconds: 0.8 }),
		cut(code.light(playing('File'))),
		hold({ seconds: 0.8 }),
		cut(code.light(playing('Code'))),
		hold({ seconds: 1.4 }),
		cut(code.light(playing('End'))),
		hold({ seconds: 0.8 })
	];
}

/**
 * What the line of this film's steps that plays an act says, by the act's name: put together here, as the words
 * written out would stand in this file a second time.
 */
function playing(act: string): string {
	return `...actThe${act}()`;
}

/** The window back in from the right, low, the code of the look over it: each value changed at once, then night. */
function actTheLook(): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [
				headline('every value is yours.', LINE_SIZE),
				code.show(linesOf(['paper', 'corners', 'cyan', 'night']), { at: CODE_UNDER_THE_HEADLINE, from: 'right' }),
				window.show({ at: LOW_WINDOW, from: 'right' }),
				window.lean({ tilt: 8, turn: -10 })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.6 }),
		cut(
			code.light('PAPER'),
			// #region paper
			look.to(PAPER)
			// #endregion
		),
		hold({ seconds: 1 }),
		cut(
			code.light('SQUARE_CORNERS'),
			// #region corners
			look.to(SQUARE_CORNERS)
			// #endregion
		),
		hold({ seconds: 1 }),
		cut(
			code.light('CYAN'),
			// #region cyan
			look.to(CYAN)
			// #endregion
		),
		hold({ seconds: 1 }),
		play({
			seconds: 1,
			moves: [
				code.light('NIGHT', { within: { end: 0.1 } }),
				// #region night
				look.to(NIGHT)
				// #endregion
			]
		}),
		hold({ seconds: 0.8 })
	];
}

/** The search typed into three times, each on a keyboard of its own, its line lit. */
function actTheSound(): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [
				headline('sound on for this one.', LINE_SIZE),
				code.show(linesOf(['mechanical', 'butterfly', 'clicky']), { at: CODE_UNDER_THE_HEADLINE }),
				camera.onto(TOP_PAGES),
				window.lean({ tilt: 0, turn: 0 })
			],
			ease: easeInOutCubic
		}),
		act(searchFocused),
		...searchedAgain(
			'mechanical',
			// #region mechanical
			typing(page.type(BLOG, { keyboard: 'mechanical' }))
			// #endregion
		),
		...searchedAgain(
			'butterfly',
			// #region butterfly
			typing(page.type(CAREERS, { keyboard: 'butterfly' }))
			// #endregion
		),
		...searchedAgain(
			'clicky',
			// #region clicky
			typing(page.type(DOCS, { keyboard: 'clicky' }))
			// #endregion
		)
	];
}

/** The window and its code pushed off by the terminal: the prompts this film took, and the last one typed. */
function actThePrompts(): readonly Step[] {
	return [
		play({
			seconds: 0.9,
			moves: [
				headline('no. not one prompt. i lost count.', LINE_SIZE),
				window.hide({ toward: 'left' }),
				code.hide({ toward: 'left' }),
				terminal.open(TERMINAL, { at: TERMINAL_PLACE, from: 'right' })
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 2, moves: [terminal.works(PROMPTS, THINKING, { thinkingShare: NO_THINKING })] }),
		...typing(terminal.type(SHIP_IT)),
		cut(terminal.submit()),
		hold({ seconds: 1.4 })
	];
}

/** The terminal pushed off by the window, which leans the other way; then who wrote what, typed. */
function actTheCredit(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				terminal.leave({ toward: 'left' }),
				window.show({ at: UNDER_THE_HEADLINE_WINDOW, from: 'right' }),
				camera.onto(CARDS),
				window.lean({ tilt: 14, turn: 16 })
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 2.4,
			moves: [
				title.show('i wrote the tool. it wrote the film.', {
					at: HEADLINE,
					size: LINE_SIZE,
					typed: CREDIT_TYPED,
					within: { end: 0.8 }
				})
			]
		})
	];
}

/** The frame the film opened on again, the camera swung back to it, its words changed: where to get it. */
function actTheEnd(): readonly Step[] {
	return [
		play({
			seconds: 1.6,
			moves: [
				window.lean({ tilt: 20, turn: -18 }),
				cursor.to(REFRESH),
				headline([{ text: 'livereel', italic: true, ink: AMBER }, '. open source.'], CLAIM_SIZE),
				code.show('npx livereel  # github.com/vrppaul/livereel', {
					at: UNDER_THE_HEADLINE,
					within: { start: 0.6 }
				}),
				sound.play(CHIME, { within: { start: 0.6 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 4 })
	];
}

function steps(served: AppServed): readonly Step[] {
	return [
		...actTheClaim(),
		...actTheQuestion(),
		...actTheAnswer(served),
		...actTheLean(),
		...actTheTravel(),
		...actTheLight(),
		...actTheFile(),
		...actTheCode(),
		...actTheLook(),
		...actTheSound(),
		...actThePrompts(),
		...actTheCredit(),
		...actTheEnd()
	];
}

function appShown(context: ActContext): Promise<void> {
	return context.page.locator(REFRESH).waitFor();
}

export default defineFilm({ formats: { square: SQUARE }, serve: servedApp, ready: appShown, theme: THEME, steps });
