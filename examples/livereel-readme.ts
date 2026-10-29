/**
 * livereel's film for its README: its name and what it is, then what it does from the basics on, each beat named in a
 * caption and shown as the code that makes it beside what that code shoots.
 *
 *     pnpm livereel shoot examples/livereel-readme.ts --out out/readme --sheet
 *
 * Acme's analytics app is served by the film itself and shows in a window on the right; on the left, a pane of this
 * very file's code. Each line a beat shows is a region marked `// #region name` below (`livereel-promo/code.ts`), a
 * step of its own, lit as that step runs, so the code on the screen is the code that shot it.
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
	screen,
	window
} from 'livereel';
import { regionNamed, regionsOf } from './livereel-promo/code.ts';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A wide frame, as a README shows it, half of it the code's so its lines stand large, and the app laid out on a
// screen as wide as its window, so the window shows the app across
const WIDE = {
	frame: { width: 1920, height: 1080 },
	screen: { width: 1040, height: 1080 },
	split: { wordsShare: 0.5 }
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
// The lines of code each beat shows, the regions this file marks below, and their places, counted from 1 as an editor
// counts lines
const REGIONS = await regionsOf(new URL(import.meta.url));
const FIRST_LINE = 1;
const SECOND_LINE = 2;
const THIRD_LINE = 3;

/** Refresh clicked for real, until the page shows the count the app's server answered with. */
async function refreshed(context: ActContext, served: AppServed): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: served.refreshed.visitors }).waitFor();
}

/**
 * The lines of regions, one after another, as one piece of code. Each region here is one line, standing as deep in
 * the file as its step does, so each is set at the code's left edge on its own.
 */
function linesOf(regions: readonly string[]): string {
	return regions.map((region) => regionNamed(REGIONS, region).trim()).join('\n');
}

/** The lines of regions coming up on the left, beside the page's window on the right. */
function codeShown(regions: readonly string[]): Move {
	return code.show(linesOf(regions), { at: 'left' });
}

/** The lines of the next beat on the left in place of the last beat's, those going first. */
function codeSwapped(regions: readonly string[]): readonly Move[] {
	return [code.hide({ within: { end: 0.4 } }), code.show(linesOf(regions), { at: 'left', within: { start: 0.4 } })];
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
				window.to('right', { within: { start: 0.2 } }),
				camera.onto(CARDS, { air: 40, within: { start: 0.2 } })
			],
			ease: easeInOutCubic
		})
	];
}

/** The camera onto a block by its selector, and the light on it. */
function actTheCamera(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [codeShown(['onto', 'light']), caption.show('A camera and a light, by selector')],
			ease: easeOutCubic
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
		hold({ seconds: 1.2 })
	];
}

/** Pins on the path a person takes: the button, then the count it changes. */
function actThePins(): readonly Step[] {
	return [
		play({
			seconds: 1.2,
			moves: [
				...codeSwapped(['pin-refresh', 'pin-count']),
				caption.show('Pins on the path'),
				light.off({ within: { end: 0.4 } }),
				camera.onto(REFRESH_AND_VISITORS, { every: BOTH })
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

/** A real click on the real app: the cursor to the button, the click, its server answering, the count changed. */
function actTheClick(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				...codeSwapped(['cursor', 'click']),
				caption.show('A real click, a real server'),
				pin.clear({ within: { end: 0.4 } })
			],
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
		...cursor.click((context) => refreshed(context, served)),
		// #endregion
		play({
			seconds: 1.2,
			moves: [camera.onto(VISITORS), light.on(VISITORS, { within: { start: 0.5 } })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.2 })
	];
}

/** Words over the frame, set their own way: the caption that says so. */
function actTheWords(): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({ seconds: 1, moves: [...codeSwapped(['words']), caption.hide(), light.off()], ease: easeInOutCubic }),
		play({
			seconds: 1.6,
			moves: [
				code.light(FIRST_LINE, { within: { end: 0.2 } }),
				// #region words
				caption.show(['Words, set ', { text: 'your way', italic: true }])
				// #endregion
			]
		}),
		hold({ seconds: 1.4 })
	];
}

/** The look, value by value: a change at once, another, then a slow one. */
function actTheLook(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [...codeSwapped(['paper', 'serif', 'night']), caption.show('Every value of the look')],
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

/** The card again, over the app, the code and the caption gone. */
function actTheEnding(): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				code.hide({ within: { end: 0.5 } }),
				caption.hide({ within: { end: 0.5 } }),
				ending.show(CARD, { within: { start: 0.3 } })
			],
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
