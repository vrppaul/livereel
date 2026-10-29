/**
 * livereel's film for its README: its name and what it is, then what it does from the basics on, each beat shown as
 * the code that makes it beside what that code shoots.
 *
 *     pnpm livereel shoot examples/livereel-readme.ts --out out/readme --sheet
 *
 * Acme's analytics app is served by the film itself and shows in a window on the right; on the left, a pane of this
 * very file's code. Each region marked `// #region name` below is the code a beat shows (`livereel-promo/code.ts`),
 * its lines lit as they run, so the code on the screen is the code that shot it.
 */
import {
	type ActContext,
	type EndingCard,
	type Move,
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
	screen
} from 'livereel';
import { regionsOf } from './livereel-promo/code.ts';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A wide frame, as a README shows it, the code given a little more than livereel's share of it so its lines stand
// large, and the app laid out on a screen as wide as its window, so the window shows the app across
const WIDE = {
	frame: { width: 1920, height: 1080 },
	screen: { width: 1120, height: 1080 },
	split: { wordsShare: 0.46 }
};
// The app's main number, its card and the button that refreshes it, the row of cards, and the button and the card
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
const REFRESH_AND_VISITORS = `${REFRESH}, ${VISITORS}`;
const BOTH = 2;
const CARD: EndingCard = { name: 'livereel', line: 'Film your live web app from code', command: 'npx livereel' };
// The looks the film turns to, one after another: paper, a serif with square corners and a violet shadow, then night
const PAPER: Theme = { ground: '#f5efe6', ink: '#1a1a1a', windowEdge: '#00000033' };
const SERIF: Theme = { font: 'Georgia, serif', windowCorner: 0, windowShadowColour: '#7c3aed' };
const NIGHT: Theme = { ground: '#1e1b4b', glow: '#7c3aed', ink: '#f5f3ff', windowEdge: '#ffffff1a' };
// The code of each beat: the regions this file marks below, their lines counted from 1 as an editor counts them
const REGIONS = await regionsOf(new URL(import.meta.url));
const FIRST_LINE = 1;
const SECOND_LINE = 2;
const THIRD_LINE = 3;

/** Refresh clicked for real, until the page shows the count the app's server answered with. */
async function refreshed(context: ActContext, served: AppServed): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: served.refreshed.visitors }).waitFor();
}

/** The code of a region coming up on the left, beside the page's window on the right. */
function codeShown(region: string, within: { start: number } = { start: 0 }): Move {
	return code.show(REGIONS.named(region), { side: 'left', within });
}

/** The card first: the name and the line on the ground, then the app rising into a window as the card goes. */
function actTheCard(): readonly Step[] {
	return [
		cut(screen.lower()),
		play({ seconds: 1, moves: [ending.show(CARD)], ease: easeOutCubic }),
		hold({ seconds: 1.8 }),
		play({
			seconds: 1.6,
			moves: [
				ending.hide({ within: { end: 0.4 } }),
				screen.rise({ within: { start: 0.2 } }),
				camera.onto(CARDS, { side: 'right', air: 40, within: { start: 0.2 } })
			],
			ease: easeInOutCubic
		})
	];
}

/** The camera onto a block by its selector, and the light on it. */
function actTheCamera(): readonly Step[] {
	return [
		play({ seconds: 0.8, moves: [codeShown('camera')] }),
		hold({ seconds: 0.6 }),
		play({
			seconds: 1.8,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				code.light(SECOND_LINE, { within: { start: 0.55, end: 0.7 } }),
				// #region camera
				camera.onto(VISITORS, { side: 'right', air: 60 }),
				light.on(VISITORS, { within: { start: 0.6 } })
				// #endregion
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.2 })
	];
}

/** Pins on the path a person takes: the button, then the count it changes. */
function actThePins(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				code.hide({ within: { end: 0.4 } }),
				codeShown('pins', { start: 0.4 }),
				light.off({ within: { end: 0.4 } }),
				camera.onto(REFRESH_AND_VISITORS, { side: 'right', every: BOTH, air: 60 })
			],
			ease: easeInOutCubic
		}),
		play({
			seconds: 1.6,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				code.light(SECOND_LINE, { within: { start: 0.5, end: 0.7 } }),
				// #region pins
				pin.show(REFRESH, 'Refresh', { within: { end: 0.4 } }),
				pin.show(VISITORS_TODAY, 'The count', { within: { start: 0.5 } })
				// #endregion
			]
		}),
		hold({ seconds: 1 })
	];
}

/** A real click on the real app: its server answers, and the count changes. */
function actTheClick(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				code.hide({ within: { end: 0.4 } }),
				codeShown('click', { start: 0.4 }),
				pin.clear({ within: { end: 0.4 } }),
				cursor.to(REFRESH)
			],
			ease: easeInOutCubic
		}),
		play({ seconds: 0.4, moves: [code.light(FIRST_LINE)] }),
		// #region click
		...cursor.click((context) => refreshed(context, served)),
		// #endregion
		play({
			seconds: 1.2,
			moves: [camera.onto(VISITORS, { side: 'right', air: 60 }), light.on(VISITORS, { within: { start: 0.5 } })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.2 })
	];
}

/** Words over the frame, set their own way. */
function actTheWords(): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({
			seconds: 1,
			moves: [code.hide({ within: { end: 0.4 } }), codeShown('words', { start: 0.4 }), light.off()],
			ease: easeInOutCubic
		}),
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

/** The look, value by value: a quick change after another, then a slow one. */
function actTheLook(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [code.hide({ within: { end: 0.4 } }), codeShown('look', { start: 0.4 }), caption.hide()],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 }),
		play({
			seconds: 3,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.05 } }),
				code.light(SECOND_LINE, { within: { start: 0.33, end: 0.38 } }),
				code.light(THIRD_LINE, { within: { start: 0.66, end: 0.71 } }),
				// #region look
				look.to(PAPER, { within: { end: 0.05 } }),
				look.to(SERIF, { within: { start: 0.33, end: 0.38 } }),
				look.to(NIGHT, { within: { start: 0.66 } })
				// #endregion
			]
		}),
		hold({ seconds: 1 })
	];
}

/** The card again, over the app, the code gone. */
function actTheEnding(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [code.hide({ within: { end: 0.5 } }), ending.show(CARD, { within: { start: 0.3 } })],
			ease: easeOutCubic
		}),
		hold({ seconds: 2 })
	];
}

function steps(served: AppServed): readonly Step[] {
	return [
		...actTheCard(),
		...actTheCamera(),
		...actThePins(),
		...actTheClick(served),
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
	steps
});
