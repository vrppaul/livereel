/**
 * livereel's own promo: a film of a live app first, and then the agent who made it.
 *
 *     pnpm livereel shoot examples/livereel-promo.ts --out out/promo --sheet
 *
 * Acme's analytics app is served by the film itself (`livereel-promo/`): the camera goes to its main number, a real
 * click on Refresh asks its server for today's count, and the camera leans back over the page. Then Claude Code's
 * terminal comes up over it, drawn on the stage, and is asked for the film just seen; the ending comes up over the
 * terminal, and the app is not shown again.
 */
import {
	type ActContext,
	type Pose,
	type Step,
	type TerminalLine,
	camera,
	caption,
	cursor,
	cut,
	defineFilm,
	easeInOutCubic,
	easeOutCubic,
	ending,
	hold,
	keystrokes,
	light,
	lookingAt,
	play,
	screen,
	terminal,
	typing
} from 'livereel';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A square frame, and the app as a laptop lays it out
const SQUARE = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };
// The main number's card, the number itself, the button that refreshes it, and the row of cards with that button
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const TOP_ROW = `${REFRESH}, [data-testid=kpis]`;
// The screen comes up from a little smaller than the whole of it
const OPENS_FROM = 0.86;
// The camera drawn back over the whole page, the screen leaning back and swung to the left, all of it behind where
// the terminal's window comes up
const LEANING_BACK: Pose = { focusX: 735, focusY: 560, zoom: 0.62, tilt: 14, turn: -9 };
const TITLE = 'acme — claude';
const TASK = 'make a 20-second promo of my app';
const WORK: readonly TerminalLine[] = [
	{ kind: 'work', text: 'Skill reel' },
	{ kind: 'work', text: 'Write promo.ts' },
	{ kind: 'work', text: 'Bash npx livereel shoot promo.ts --out out' },
	{ kind: 'said', text: 'The film is in out/promo.mp4, 20 s.' }
];
const THINKING = 'Working…';
const ENDING = { name: 'livereel', line: 'Your agent films your live app', command: 'npx livereel' };

/** The whole screen from a little further off, as it stands before it comes up. */
function fromAfar(whole: Pose): Pose {
	return lookingAt(whole, whole.focusX, whole.focusY, whole.zoom * OPENS_FROM);
}

function cardShown(context: ActContext): Promise<void> {
	return context.page.locator(VISITORS).waitFor();
}

/** Refresh clicked for real, until the page shows the count its server answered with. */
async function refreshed(context: ActContext, visitors: string): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: visitors }).waitFor();
}

/** The screen comes up out of the ground with the app on it, whole. */
function actOpening(whole: Pose): readonly Step[] {
	return [
		cut(screen.lower(), camera.to(fromAfar(whole))),
		play({ seconds: 1.4, moves: [screen.rise({ within: { end: 0.86 } }), camera.to(whole)], ease: easeOutCubic }),
		hold({ seconds: 0.6 })
	];
}

/** The camera goes to the main number, and the light comes on its card. */
function actTheNumber(): readonly Step[] {
	return [
		play({
			seconds: 2.2,
			moves: [
				camera.onto(VISITORS, { air: 80, zoomAtMost: 2.2, within: { end: 0.64 } }),
				caption.show('A camera that moves like a hand', { within: { start: 0.27, end: 0.82 } }),
				light.on(VISITORS, { within: { start: 0.64 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.7 })
	];
}

/** The camera draws back to the row with Refresh, the cursor clicks it, and the number comes back changed. */
function actTheClick(served: AppServed): readonly Step[] {
	return [
		play({
			seconds: 1.5,
			moves: [
				caption.hide({ within: { end: 0.27 } }),
				light.off({ within: { start: 0.07, end: 0.33 } }),
				camera.onto(TOP_ROW, { every: 2, air: 30, within: { start: 0.07, end: 0.87 } }),
				cursor.to(REFRESH, { within: { start: 0.33 } })
			],
			ease: easeInOutCubic
		}),
		...cursor.click((context) => refreshed(context, served.refreshed.visitors)),
		play({
			seconds: 1.7,
			moves: [
				caption.show('A real click, a real server', { within: { start: 0.17, end: 0.76 } }),
				camera.onto(VISITORS, { air: 80, zoomAtMost: 2.2, within: { start: 0.35 } }),
				light.on(VISITORS, { within: { start: 0.58 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.6 })
	];
}

/** The camera leans back over the whole page as the last caption comes. */
function actTheClock(): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({
			seconds: 2,
			moves: [
				caption.hide({ within: { end: 0.2 } }),
				light.off({ within: { start: 0.05, end: 0.25 } }),
				camera.to(LEANING_BACK, { within: { start: 0.05 } }),
				caption.show("Every frame on the film's own clock", { within: { start: 0.35, end: 0.9 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 })
	];
}

/** Claude Code's terminal comes up over the film, is asked for it, and its agent makes it. */
function actTheAgent(): readonly Step[] {
	return [
		play({
			seconds: 0.8,
			moves: [caption.hide({ within: { end: 0.5 } }), terminal.open(TITLE, { within: { start: 0.375 } })],
			ease: easeOutCubic
		}),
		...typing(terminal.type(keystrokes(TASK, { seed: 7, slipAt: 9, pace: 0.35 }))),
		hold({ seconds: 0.2 }),
		cut(terminal.submit()),
		play({ seconds: 2, moves: [terminal.works(WORK, THINKING)] }),
		hold({ seconds: 0.6 })
	];
}

/** The ending comes up over the terminal. */
function actEnding(): readonly Step[] {
	return [play({ seconds: 0.8, moves: [ending.show(ENDING)], ease: easeOutCubic }), hold({ seconds: 1.6 })];
}

function steps(served: AppServed, whole: Pose): readonly Step[] {
	return [
		...actOpening(whole),
		...actTheNumber(),
		...actTheClick(served),
		...actTheClock(),
		...actTheAgent(),
		...actEnding()
	];
}

export default defineFilm({ format: SQUARE, serve: servedApp, ready: cardShown, steps });
