/**
 * livereel's film for its README, directed as a presentation: its card, the live app in a window on the film's
 * ground, then what livereel does, beat by beat, each a heading over the code that shoots it beside the page it
 * shoots, the page's window travelling about the frame as the words make room; where the code is about words or the
 * look, a slide with no window; the agent that writes such a film; the card again. It is heard as it goes: the click,
 * every key, three keyboards one after another, the ending's chime.
 *
 *     pnpm livereel shoot examples/livereel-readme.ts --format wide --out out/readme --sheet
 *
 * Acme's analytics app is served by the film itself. Each line of code a beat shows is a region of this file marked
 * `// #region name` below, read by `regionsOf` (`livereel-promo/code.ts`), a step of its own, lit as that step runs,
 * so the code on the screen is the code that shot it. The film is shot wide for the README and square for a feed;
 * each format says where its words and its window stand.
 */
import {
	type ActContext,
	type EndingCard,
	type Format,
	type Move,
	type Place,
	type Step,
	type TerminalLine,
	type Theme,
	act,
	camera,
	caption,
	code,
	cursor,
	cut,
	defineFilm,
	easeInOutCubic,
	easeOutCubic,
	ending,
	hold,
	keys,
	keystrokes,
	light,
	look,
	page,
	pin,
	play,
	terminal,
	title,
	typing,
	window
} from 'livereel';
import { regionNamed, regionsOf } from './livereel-promo/code.ts';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// The page laid out on a screen as wide as its window, so a window shows the app across
const SCREEN = { width: 1040, height: 1080 };
// How a beat's heading and its code share their place down it, the code right under the heading: about the middle
// of a tall place, from the top of a short one; in a square's short place beside the window, a heading of two lines
// takes a taller band
const TALL: Stacking = { heading: { top: 0.18, height: 0.22 }, code: { top: 0.42, height: 0.3 } };
const SHORT: Stacking = { heading: { top: 0, height: 0.3 }, code: { top: 0.34, height: 0.66 } };
const HIGH: Stacking = { heading: { top: 0, height: 0.16 }, code: { top: 0.2, height: 0.58 } };
const TWO_LINES_OVER_CODE: Stacking = { heading: { top: 0, height: 0.4 }, code: { top: 0.44, height: 0.56 } };
// The names each format gives a beat's heading and code beside the window, and across from it
const BESIDE_THE_WINDOW: WordsNamed = { heading: 'heading', code: 'code' };
const ACROSS_FROM_THE_WINDOW: WordsNamed = { heading: 'headingAcross', code: 'codeAcross' };
// The app in a window in the middle of the frame, the ground on either side of it; the window gone square, beside the
// words that say the film is shot square too
const MIDDLE_OF_THE_WIDE: Place = { left: 0.156, top: 0.067, width: 0.688, height: 0.867 };
const SQUARE_IN_THE_WIDE: Place = { left: 0.525, top: 0.11, width: 0.4375, height: 0.78 };
const MIDDLE_OF_THE_SQUARE: Place = { left: 0.067, top: 0.16, width: 0.867, height: 0.68 };
const SQUARE_IN_THE_SQUARE: Place = { left: 0.25, top: 0.44, width: 0.5, height: 0.5 };
// The window the search is typed in, ending above the frame's foot, where the keys of the app's shortcut come up
const ABOVE_THE_KEYS_IN_THE_WIDE: Place = { left: 0.525, top: 0.067, width: 0.44, height: 0.76 };
const ABOVE_THE_KEYS_IN_THE_SQUARE: Place = { left: 0.067, top: 0.5, width: 0.867, height: 0.33 };
// The window under words that stand above it, whole on the frame and narrow enough that the top pages stand whole in
// it, as the camera cannot frame them closer than a window filled
const UNDER_THE_WORDS_IN_THE_WIDE: Place = { left: 0.2, top: 0.42, width: 0.6, height: 0.54 };
const UNDER_THE_WORDS_IN_THE_SQUARE: Place = { left: 0.1, top: 0.42, width: 0.8, height: 0.54 };
// A wide frame, as a README shows it, half of it the words' so the code stands large, beside the window; a square, as
// a feed shows it, the words above the window and below it
const WIDE: Format = {
	frame: { width: 1920, height: 1080 },
	screen: SCREEN,
	split: { wordsShare: 0.5 },
	places: {
		words: 'left',
		page: 'right',
		wordsAcross: 'right',
		pageAcross: 'left',
		...headingsAndCodeIn(TALL),
		middle: MIDDLE_OF_THE_WIDE,
		square: SQUARE_IN_THE_WIDE,
		aboveTheKeys: ABOVE_THE_KEYS_IN_THE_WIDE,
		underTheWords: UNDER_THE_WORDS_IN_THE_WIDE
	}
};
const SQUARE: Format = {
	frame: { width: 1080, height: 1080 },
	screen: SCREEN,
	split: { wordsShare: 0.48 },
	places: {
		words: 'top',
		page: 'bottom',
		wordsAcross: 'bottom',
		pageAcross: 'top',
		...headingsAndCodeIn(TWO_LINES_OVER_CODE),
		middle: MIDDLE_OF_THE_SQUARE,
		square: SQUARE_IN_THE_SQUARE,
		aboveTheKeys: ABOVE_THE_KEYS_IN_THE_SQUARE,
		underTheWords: UNDER_THE_WORDS_IN_THE_SQUARE
	}
};
// #region formats
const FORMATS = { wide: WIDE, square: SQUARE };
// #endregion
// The app's main number, its card, how it stands against yesterday, the button that refreshes it, and the row of
// cards; its top pages, their list that scrolls of its own, and the search over them
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const VISITORS_CHANGE = '[data-testid=visitors-change]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
const TOP_PAGES = '[data-testid=top-pages]';
const PAGES = '[data-testid=pages]';
const SEARCH = '[data-testid=search]';
// The search once it holds the keys, and the page itself, where the app's shortcut is pressed
const SEARCH_HOLDING_THE_KEYS = `${SEARCH}:focus`;
const THE_PAGE = 'body';
// The button and the count it changes, framed together so the cursor's way to the button stays in the window
const REFRESH_AND_VISITORS = `${REFRESH}, ${VISITORS}`;
const BOTH = 2;
// The keys that take the reader to the search, ⌘ K on a Mac and Ctrl K elsewhere, as the app's own shortcut
const TO_THE_SEARCH = 'ControlOrMeta+K';
// What is typed into the search: a page with a slip on the way, then three more, each on a keyboard of its own
const PRICING = keystrokes('pricing', { seed: 4, slipAt: 3 });
const BLOG = keystrokes('blog', { seed: 5 });
const CAREERS = keystrokes('careers', { seed: 6 });
const DOCS = keystrokes('docs', { seed: 7 });
// The agent asked for this film in its terminal, and what it does; the terminal across most of the frame and as tall
// as its few lines ask, in the middle down it, so they do not sit under an empty screen
const TERMINAL = 'claude — acme';
const TERMINAL_PLACE: Place = { left: 0.07, top: 0.22, width: 0.86, height: 0.56 };
const ASKED = keystrokes('Film our analytics app for the README', { seed: 8, slipAt: 11, pace: 0.5 });
const THINKING = 'Directing…';
const WORK: readonly TerminalLine[] = [
	{ kind: 'work', text: 'Read the app: three cards, Refresh, Top pages' },
	{ kind: 'work', text: 'Write films/readme.ts' },
	{ kind: 'work', text: 'Bash npx livereel shoot films/readme.ts --sheet' },
	{ kind: 'said', text: 'Shot it, wide and square. I checked every frame on the sheet.' },
	{ kind: 'done', text: '✓ out/readme-wide.mp4, out/readme-square.mp4' }
];
const CARD: EndingCard = { name: 'livereel', line: 'Film your live web app from code', command: 'npx livereel' };
// The film's code is what it shows off, so it stands large enough to read on a README's frame
const THEME: Theme = { codeSize: 40 };
// The looks the film turns to on a slide of their own: paper and night at once, then, slowly, a serif with square
// corners and a violet shadow, over a ground that stays, so the words read all the way; night's glow and quieter
// words stay readable on its ground, where the film ends
const PAPER: Theme = { ground: '#f5efe6', ink: '#1a1a1a', windowEdge: '#00000033' };
const NIGHT: Theme = {
	ground: '#1e1b4b',
	glow: '#312e81',
	ink: '#f5f3ff',
	quietInk: '#c7d2fe',
	windowEdge: '#ffffff1a'
};
const SERIF: Theme = { font: 'Georgia, serif', windowCorner: 0, windowShadowColour: '#7c3aed' };
// The glow drifting up and across while the serif comes in, two moves of the look at once
const DRIFT: Theme = { glowX: 0.85, glowY: 0.1 };
// Then, at once, a cyan accent under the line lit, corners rounded again, and the terminal's colours in an editor's
// light theme, the code's colours by kind with them (Solarized light): the code's pane, and the agent's terminal and
// the closing card's command after it
const CYAN: Theme = { accent: '#22d3ee' };
const ROUNDED: Theme = { windowCorner: 40 };
const SOLARIZED: Theme = {
	terminal: '#fdf6e3',
	terminalInk: '#073642',
	codeComment: '#93a1a1',
	codeString: '#2aa198',
	codeNumber: '#d33682',
	codeKeyword: '#859900',
	codeCall: '#b58900',
	codeKey: '#268bd2'
};
// Where the words of a beat stand besides: above a window low on the frame, or on a slide of their own with no window
const ABOVE_THE_WINDOW = stackedIn({ left: 0.06, top: 0.06, width: 0.88, height: 0.32 }, SHORT);
const ON_A_SLIDE = stackedIn({ left: 0.18, top: 0.12, width: 0.64, height: 0.62 }, TALL);
// The look's slide: taller, the heading high in it, so its seven lines of code stand clear below
const ON_THE_LOOKS_SLIDE = stackedIn({ left: 0.18, top: 0.06, width: 0.64, height: 0.88 }, HIGH);
// The window low on the frame, wider than its room and running off the frame's foot
const LOW_AND_OFF_THE_FOOT: Place = { left: 0.03, top: 0.42, width: 0.94, height: 0.8 };
// The lines of code each beat shows, the regions this file marks below; each is lit by what it says
const REGIONS = await regionsOf(new URL(import.meta.url));
// The comma a move in a list of moves stands before when another follows it
const AFTER_AN_ITEM = /,$/u;

/** A band down a place: where it starts and how much of it it takes, each a share of the place's height. */
interface Band {
	readonly top: number;
	readonly height: number;
}

/** How a beat's words share their place down it: the heading's band, and the code's under it. */
interface Stacking {
	readonly heading: Band;
	readonly code: Band;
}

/** Where a beat's words stand: its heading's place, and its code's. */
interface Words {
	readonly heading: Place;
	readonly code: Place;
}

/** A beat's words where a format names their places, by those names. */
interface WordsNamed extends Words {
	readonly heading: string;
	readonly code: string;
}

/** A beat's heading and code in a place, each in its band of it. */
function stackedIn(place: Place, stacking: Stacking): Words {
	return { heading: { of: place, ...stacking.heading }, code: { of: place, ...stacking.code } };
}

/**
 * The places a format names for a beat's heading and code beside the window and across from it, stacked so in the
 * words' places it names.
 */
function headingsAndCodeIn(stacking: Stacking): Readonly<Record<string, Place>> {
	const beside = stackedIn('words', stacking);
	const across = stackedIn('wordsAcross', stacking);
	return {
		[BESIDE_THE_WINDOW.heading]: beside.heading,
		[BESIDE_THE_WINDOW.code]: beside.code,
		[ACROSS_FROM_THE_WINDOW.heading]: across.heading,
		[ACROSS_FROM_THE_WINDOW.code]: across.code
	};
}

/** Refresh clicked for real, until the page shows the count the app's server answered with. */
async function refreshed(context: ActContext, served: AppServed): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: served.refreshed.visitors }).waitFor();
}

/** The act of a click on Refresh, for the app served: short, as the film shows it in its code. */
function refreshing(served: AppServed): (context: ActContext) => Promise<void> {
	return (context) => refreshed(context, served);
}

/** The app's own shortcut pressed on the page, until the search holds its keys. */
async function searchOpened(context: ActContext): Promise<void> {
	await context.page.press(THE_PAGE, TO_THE_SEARCH);
	await context.page.locator(SEARCH_HOLDING_THE_KEYS).waitFor();
}

/** The search emptied, every top page listed again, the search still holding the keys. */
function searchCleared(context: ActContext): Promise<void> {
	return context.page.locator(SEARCH).fill('');
}

/**
 * The lines of regions, one after another, as one piece of code. Each region here is one line, standing as deep in
 * the file as its step does, so each is set at the code's left edge on its own, and the comma after a move that has
 * another after it in its list dropped, so it reads as the move alone.
 */
function linesOf(regions: readonly string[]): string {
	return regions.map((region) => regionNamed(REGIONS, region).trim().replace(AFTER_AN_ITEM, '')).join('\n');
}

/** A beat's heading and code coming up in their place, the heading first. */
function beatShown(heading: string, regions: readonly string[], words: Words): readonly Move[] {
	return [
		title.show(heading, { at: words.heading, within: { start: 0.4 } }),
		code.show(linesOf(regions), { at: words.code, within: { start: 0.55 } })
	];
}

/** A beat's words going where they stand, over the first third of the step. */
function beatGoing(): readonly Move[] {
	return [title.hide({ within: { end: 0.35 } }), code.hide({ within: { end: 0.35 } })];
}

/** The last beat's words going where they stand, and the next beat's coming up in their place. */
function beatSwapped(heading: string, regions: readonly string[], words: Words): readonly Move[] {
	return [...beatGoing(), ...beatShown(heading, regions, words)];
}

/** The search emptied and typed into again, its line of code lit: the keys heard on the keyboard that line names. */
function searchedAgain(line: string, typed: readonly Step[]): readonly Step[] {
	return [act(searchCleared), cut(code.light(line)), ...typed, hold({ seconds: 0.5 })];
}

/** The card on the film's ground, then the app pushing it off to the left as it slides in to the frame's middle. */
function actTheCard(): readonly Step[] {
	return [
		cut(window.hide({ toward: 'right' }), camera.onto(CARDS, { air: 160 })),
		play({ seconds: 1, moves: [ending.show(CARD)], ease: easeOutCubic }),
		hold({ seconds: 1.8 }),
		play({
			seconds: 1,
			moves: [ending.hide({ toward: 'left' }), window.show({ at: 'middle', from: 'right' })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1 })
	];
}

/**
 * The window across to its side, a heading and code coming up beside it; the window leaning over the cards, then
 * face-on again as the camera goes to the count, which it lights.
 */
function actTheCamera(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.to('page'),
				camera.onto(CARDS, { air: 40 }),
				...beatShown('Point the camera at any block', ['lean', 'onto', 'light'], BESIDE_THE_WINDOW)
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1.4,
			moves: [
				code.light('lean', { within: { end: 0.2 } }),
				camera.onto(CARDS),
				// #region lean
				window.lean({ tilt: 12, turn: -7 })
				// #endregion
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 }),
		play({
			seconds: 1.4,
			moves: [
				code.light('onto(VISITORS', { within: { end: 0.2 } }),
				window.lean({ tilt: 0, turn: 0 }),
				// #region onto
				camera.onto(VISITORS)
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1,
			moves: [
				code.light('light.on', { within: { end: 0.2 } }),
				// #region light
				light.on(VISITORS)
				// #endregion
			]
		}),
		hold({ seconds: 1.4 })
	];
}

/**
 * The window across to the other side, the light carried with the page, the last beat's words going as it sets off
 * and the next coming up once it has left room; the light carried to Refresh, a real click on the real app, and the
 * light carried back to the count it changed.
 */
function actTheClick(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [...beatGoing(), window.to('pageAcross'), camera.onto(REFRESH_AND_VISITORS, { every: BOTH })],
			ease: easeInOutCubic
		}),
		play({
			seconds: 0.8,
			moves: beatShown(
				'Click it for real',
				['light-refresh', 'cursor', 'click', 'light-visitors'],
				ACROSS_FROM_THE_WINDOW
			),
			ease: easeOutCubic
		}),
		play({
			seconds: 0.8,
			moves: [
				code.light('light.to(REFRESH)', { within: { end: 0.2 } }),
				// #region light-refresh
				light.to(REFRESH)
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1,
			moves: [
				code.light('cursor.to', { within: { end: 0.2 } }),
				// #region cursor
				cursor.to(REFRESH)
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 0.3, moves: [code.light('cursor.click')] }),
		// #region click
		...cursor.click(refreshing(served)),
		// #endregion
		play({
			seconds: 1.2,
			moves: [
				code.light('light.to(VISITORS)', { within: { end: 0.2 } }),
				// #region light-visitors
				light.to(VISITORS),
				// #endregion
				camera.onto(VISITORS)
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.2 })
	];
}

/** The window low and wide, running off the frame's foot, the words above it; pins on the path a person takes. */
function actThePins(): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({
			seconds: 1.3,
			moves: [
				light.off({ within: { end: 0.3 } }),
				window.to(LOW_AND_OFF_THE_FOOT),
				camera.onto(REFRESH_AND_VISITORS, { every: BOTH }),
				...beatSwapped('Mark the path', ['pin-count', 'pin-change'], ABOVE_THE_WINDOW)
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 0.8,
			moves: [
				code.light('The count', { within: { end: 0.2 } }),
				// #region pin-count
				pin.show(VISITORS, 'The count')
				// #endregion
			]
		}),
		play({
			seconds: 0.8,
			moves: [
				code.light('Against yesterday', { within: { end: 0.2 } }),
				// #region pin-change
				pin.show(VISITORS_CHANGE, 'Against yesterday')
				// #endregion
			]
		}),
		hold({ seconds: 1 })
	];
}

/**
 * The window back up to its side, the words beside it, the camera on the top pages; their list scrolled, the app's
 * shortcut pressed with its keys on the frame, and a page searched for, a slip on the way.
 */
function actTheSearch(): readonly Step[] {
	return [
		cut(pin.clear()),
		play({
			seconds: 1.2,
			moves: [
				window.to('aboveTheKeys'),
				camera.onto(TOP_PAGES),
				...beatSwapped('Scroll and type, for real', ['scroll', 'shortcut', 'search', 'type'], BESIDE_THE_WINDOW)
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1.2,
			moves: [
				code.light('scrollBy', { within: { end: 0.2 } }),
				// Four rows of the list, as many as the app shows of it at once (its --pages-shown)
				// #region scroll
				page.scrollBy(PAGES, { pixels: 224 })
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 0.6,
			moves: [
				code.light('keys.show', { within: { end: 0.2 } }),
				// #region shortcut
				keys.show(['⌘', 'K'])
				// #endregion
			],
			ease: easeOutCubic
		}),
		cut(code.light('searchOpened')),
		// #region search
		act(searchOpened),
		// #endregion
		hold({ seconds: 0.6 }),
		play({ seconds: 0.4, moves: [keys.hide()] }),
		cut(code.light('PRICING')),
		// #region type
		...typing(page.type(PRICING)),
		// #endregion
		hold({ seconds: 1.2 })
	];
}

/** The window under the words, the top pages whole in it: the search typed into three times, on three keyboards. */
function actTheKeyboards(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.to('underTheWords'),
				camera.onto(TOP_PAGES),
				...beatSwapped('Hear every key', ['mechanical', 'butterfly', 'clicky'], ABOVE_THE_WINDOW)
			],
			ease: easeInOutCubic
		}),
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
		),
		hold({ seconds: 0.8 })
	];
}

/** The window and its words pushed off to the left, a slide of words coming in from the right: the caption it says. */
function actTheWords(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.hide({ toward: 'left' }),
				title.show('Say it in words', { at: ON_A_SLIDE.heading, from: 'right' }),
				code.show(linesOf(['words']), { at: ON_A_SLIDE.code, from: 'right' })
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1.6,
			moves: [
				code.light('caption.show', { within: { end: 0.2 } }),
				// #region words
				caption.show(['Your app, ', { text: 'live', italic: true }])
				// #endregion
			]
		}),
		hold({ seconds: 1.4 })
	];
}

/**
 * The look, value by value, on a slide of its own: a change at once, another, then a slow one with the glow drifting
 * beside it, then three at once, the last the code's own pane.
 */
function actTheLook(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				caption.hide({ within: { end: 0.4 } }),
				...beatSwapped(
					'Change the whole look',
					['paper', 'night', 'serif', 'drift', 'cyan', 'rounded', 'solarized'],
					ON_THE_LOOKS_SLIDE
				)
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 }),
		cut(
			code.light('PAPER'),
			// #region paper
			look.to(PAPER)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		cut(
			code.light('NIGHT'),
			// #region night
			look.to(NIGHT)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		play({
			seconds: 1.8,
			moves: [
				code.light('SERIF', { through: 'DRIFT', within: { end: 0.1 } }),
				// #region serif
				look.to(SERIF),
				// #endregion
				// #region drift
				look.to(DRIFT)
				// #endregion
			]
		}),
		hold({ seconds: 0.6 }),
		cut(
			code.light('CYAN'),
			// #region cyan
			look.to(CYAN)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		cut(
			code.light('ROUNDED'),
			// #region rounded
			look.to(ROUNDED)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		cut(
			code.light('SOLARIZED'),
			// #region solarized
			look.to(SOLARIZED)
			// #endregion
		),
		hold({ seconds: 1.4 })
	];
}

/** The look's slide going, the window coming in square beside the words that say the film is shot square too. */
function actTheFormats(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				...beatSwapped('One script, every feed', ['formats'], BESIDE_THE_WINDOW),
				window.show({ at: 'square', from: 'right' }),
				camera.onto(CARDS, { air: 40 })
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 0.6, moves: [code.light('FORMATS')] }),
		hold({ seconds: 1.6 })
	];
}

/** The window and its words pushed off to the left by the agent's terminal: it is asked for this film, and makes it. */
function actTheAgent(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.hide({ toward: 'left' }),
				title.hide({ toward: 'left' }),
				code.hide({ toward: 'left' }),
				terminal.open(TERMINAL, { at: TERMINAL_PLACE, from: 'right' })
			],
			ease: easeInOutCubic
		}),
		...typing(terminal.type(ASKED)),
		hold({ seconds: 0.2 }),
		cut(terminal.submit()),
		play({ seconds: 3, moves: [terminal.works(WORK, THINKING)] }),
		hold({ seconds: 1.5 })
	];
}

/** The terminal pushed off to the left by the card coming in from the right. */
function actTheEnding(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [terminal.leave({ toward: 'left' }), ending.show(CARD, { from: 'right' })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 2.5 })
	];
}

function steps(served: AppServed): readonly Step[] {
	return [
		...actTheCard(),
		...actTheCamera(),
		...actTheClick(served),
		...actThePins(),
		...actTheSearch(),
		...actTheKeyboards(),
		...actTheWords(),
		...actTheLook(),
		...actTheFormats(),
		...actTheAgent(),
		...actTheEnding()
	];
}

function appShown(context: ActContext): Promise<void> {
	return context.page.locator(REFRESH).waitFor();
}

export default defineFilm({
	formats: FORMATS,
	serve: servedApp,
	ready: appShown,
	theme: THEME,
	steps
});
