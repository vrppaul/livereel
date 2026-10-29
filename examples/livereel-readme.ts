/**
 * livereel's film for its README, directed as a presentation: its card, the live app across the frame, then what
 * livereel does, beat by beat, each a heading over the code that shoots it beside the page it shoots, the page's
 * window travelling about the frame as the words make room; where the code is about words or the look, a slide with
 * no window; the card again.
 *
 *     pnpm livereel shoot examples/livereel-readme.ts --out out/readme --sheet
 *
 * Acme's analytics app is served by the film itself. Each line of code a beat shows is a region marked
 * `// #region name` below (`livereel-promo/code.ts`), a step of its own, lit as that step runs, so the code on the
 * screen is the code that shot it.
 */
import {
	type ActContext,
	type EndingCard,
	type Move,
	type Place,
	type Step,
	type Theme,
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
	light,
	look,
	pin,
	play,
	title,
	window
} from 'livereel';
import { regionNamed, regionsOf } from './livereel-promo/code.ts';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A wide frame, as a README shows it, half of it the words' so the code stands large, and the app laid out on a
// screen as wide as its window, so the window shows the app across
const WIDE = {
	frame: { width: 1920, height: 1080 },
	screen: { width: 1040, height: 1080 },
	split: { wordsShare: 0.5 }
};
// The app's main number, its card and the button that refreshes it, and the row of cards
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
// The button and the count it changes, framed together so the cursor's way to the button stays in the window
const REFRESH_AND_VISITORS = `${REFRESH}, ${VISITORS}`;
const BOTH = 2;
const CARD: EndingCard = { name: 'livereel', line: 'Film your live web app from code', command: 'npx livereel' };
// The film's code is what it shows off, so it stands large enough to read on a README's frame
const LARGE_CODE: Theme = { codeSize: 40 };
// The looks the film turns to, one after another: paper, a serif with square corners and a violet shadow, then night
const PAPER: Theme = { ground: '#f5efe6', ink: '#1a1a1a', windowEdge: '#00000033' };
const SERIF: Theme = { font: 'Georgia, serif', windowCorner: 0, windowShadowColour: '#7c3aed' };
const NIGHT: Theme = { ground: '#1e1b4b', glow: '#7c3aed', ink: '#f5f3ff', windowEdge: '#ffffff1a' };
// Where the words of a beat stand: a heading over its code, beside the window on either side, above a window that
// runs off the frame's foot, or on a slide of their own with no window
const BESIDE_THE_WINDOW_ON_THE_RIGHT = 'left';
const BESIDE_THE_WINDOW_ON_THE_LEFT = 'right';
const ABOVE_THE_WINDOW: Place = { left: 0.06, top: 0.06, width: 0.88, height: 0.32 };
const ON_A_SLIDE: Place = { left: 0.18, top: 0.12, width: 0.64, height: 0.62 };
const HEADING_SHARE = 0.22;
const CODE_TOP = 0.28;
const CODE_SHARE = 0.72;
// The window low on the frame, wider than its room and running off the frame's foot
const LOW_AND_OFF_THE_FOOT: Place = { left: 0.03, top: 0.42, width: 0.94, height: 0.8 };
// The lines of code each beat shows, the regions this file marks below, and their places, counted from 1 as an editor
// counts lines
const REGIONS = await regionsOf(new URL(import.meta.url));
const FIRST_LINE = 1;
const SECOND_LINE = 2;
const THIRD_LINE = 3;

/** Where a beat's heading stands in its words' place: across the top of it. */
function headingIn(words: Place): Place {
	return { of: words, height: HEADING_SHARE };
}

/** Where a beat's code stands in its words' place: under the heading. */
function codeIn(words: Place): Place {
	return { of: words, top: CODE_TOP, height: CODE_SHARE };
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

/**
 * The lines of regions, one after another, as one piece of code. Each region here is one line, standing as deep in
 * the file as its step does, so each is set at the code's left edge on its own.
 */
function linesOf(regions: readonly string[]): string {
	return regions.map((region) => regionNamed(REGIONS, region).trim()).join('\n');
}

/** A beat's heading and code coming up in their place, the heading first. */
function beatShown(heading: string, regions: readonly string[], words: Place): readonly Move[] {
	return [
		title.show(heading, { at: headingIn(words), within: { start: 0.4 } }),
		code.show(linesOf(regions), { at: codeIn(words), within: { start: 0.55 } })
	];
}

/** The last beat's words going where they stand, and the next beat's coming up in their place. */
function beatSwapped(heading: string, regions: readonly string[], words: Place): readonly Move[] {
	return [
		title.hide({ within: { end: 0.35 } }),
		code.hide({ within: { end: 0.35 } }),
		title.show(heading, { at: headingIn(words), within: { start: 0.4 } }),
		code.show(linesOf(regions), { at: codeIn(words), within: { start: 0.5 } })
	];
}

/** The card on the film's ground, then the app sliding in across the whole frame as the card goes. */
function actTheCard(): readonly Step[] {
	return [
		cut(window.hide({ toward: 'right' }), camera.onto(CARDS, { air: 160 })),
		play({ seconds: 1, moves: [ending.show(CARD)], ease: easeOutCubic }),
		hold({ seconds: 1.8 }),
		play({
			seconds: 1,
			moves: [ending.hide({ within: { end: 0.5 } }), window.show({ at: 'whole', from: 'right' })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1 })
	];
}

/** The app drawn back into a window on the right, a heading and code coming up on the left; the camera, the light. */
function actTheCamera(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.to('right'),
				camera.onto(CARDS, { air: 40 }),
				...beatShown('Point the camera at any block', ['onto', 'light'], BESIDE_THE_WINDOW_ON_THE_RIGHT)
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1.4,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				// #region onto
				camera.onto(VISITORS)
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1,
			moves: [
				code.light(SECOND_LINE, { within: { end: 0.2 } }),
				// #region light
				light.on(VISITORS)
				// #endregion
			]
		}),
		hold({ seconds: 1.4 })
	];
}

/** The window across to the left, the words making room on the right; a real click on the real app. */
function actTheClick(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				light.off({ within: { end: 0.3 } }),
				window.to('left'),
				camera.onto(REFRESH_AND_VISITORS, { every: BOTH }),
				title.to(headingIn(BESIDE_THE_WINDOW_ON_THE_LEFT)),
				code.to(codeIn(BESIDE_THE_WINDOW_ON_THE_LEFT))
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 0.9,
			moves: beatSwapped('Click it for real', ['cursor', 'click'], BESIDE_THE_WINDOW_ON_THE_LEFT),
			ease: easeInOutCubic
		}),
		play({
			seconds: 1,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				// #region cursor
				cursor.to(REFRESH)
				// #endregion
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 0.3, moves: [code.light(SECOND_LINE)] }),
		// #region click
		...cursor.click(refreshing(served)),
		// #endregion
		play({
			seconds: 1.2,
			moves: [camera.onto(VISITORS), light.on(VISITORS, { within: { start: 0.5 } })],
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
				camera.onto(CARDS, { air: 40 }),
				...beatSwapped('Mark the path', ['pin-refresh', 'pin-count'], ABOVE_THE_WINDOW)
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 0.8,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				// #region pin-refresh
				pin.show(REFRESH, 'Refresh')
				// #endregion
			]
		}),
		play({
			seconds: 0.8,
			moves: [
				code.light(SECOND_LINE, { within: { end: 0.2 } }),
				// #region pin-count
				pin.show(VISITORS_TODAY, 'The count')
				// #endregion
			]
		}),
		hold({ seconds: 1 })
	];
}

/** The window and its words pushed off to the left, a slide of words coming in from the right: the caption it says. */
function actTheWords(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				window.hide({ toward: 'left', within: { end: 0.55 } }),
				title.hide({ toward: 'left', within: { end: 0.5 } }),
				code.hide({ toward: 'left', within: { end: 0.5 } }),
				title.show('Say it in words', { at: headingIn(ON_A_SLIDE), from: 'right', within: { start: 0.5 } }),
				code.show(linesOf(['words']), { at: codeIn(ON_A_SLIDE), from: 'right', within: { start: 0.5 } })
			],
			ease: easeInOutCubic
		}),
		cut(pin.clear()),
		play({
			seconds: 1.6,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				// #region words
				caption.show(['Your app, ', { text: 'live', italic: true }])
				// #endregion
			]
		}),
		hold({ seconds: 1.4 })
	];
}

/** The look, value by value, on a slide of its own: a change at once, another, then a slow one. */
function actTheLook(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				caption.hide({ within: { end: 0.4 } }),
				...beatSwapped('Change the whole look', ['paper', 'serif', 'night'], ON_A_SLIDE)
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 }),
		cut(
			code.light(FIRST_LINE),
			// #region paper
			look.to(PAPER)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		cut(
			code.light(SECOND_LINE),
			// #region serif
			look.to(SERIF)
			// #endregion
		),
		hold({ seconds: 0.9 }),
		play({
			seconds: 1.6,
			moves: [
				code.light(THIRD_LINE, { within: { end: 0.1 } }),
				// #region night
				look.to(NIGHT)
				// #endregion
			]
		}),
		hold({ seconds: 1 })
	];
}

/** The slide pushed off to the left, and the card again. */
function actTheEnding(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				title.hide({ toward: 'left', within: { end: 0.5 } }),
				code.hide({ toward: 'left', within: { end: 0.5 } }),
				ending.show(CARD, { within: { start: 0.4 } })
			],
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
		...actTheWords(),
		...actTheLook(),
		...actTheEnding()
	];
}

function appShown(context: ActContext): Promise<void> {
	return context.page.locator(REFRESH).waitFor();
}

export default defineFilm({
	formats: { wide: WIDE },
	serve: servedApp,
	ready: appShown,
	theme: LARGE_CODE,
	steps
});
