/**
 * livereel's own promo: a film of a live app first, and then the agent who made it.
 *
 *     pnpm livereel shoot examples/livereel-promo.ts --format wide --out out/promo --sheet
 *
 * Acme's analytics app is served by the film itself (`livereel-promo/`): the camera goes to its main number, a real
 * click on Refresh asks its server for today's count, and the camera draws back as the page leans. Then Claude Code's
 * terminal comes up over it, drawn on the stage, and is asked for the film just seen, which its agent shoots in the
 * format the film is shot in; the ending comes up over the terminal, and the app is not shown again. It is shot wide
 * for the README, or square for a feed: every pose is a framing by selector or the whole screen's, moved.
 */
import {
	type ActContext,
	type Angle,
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
	play,
	screen,
	terminal,
	typing,
	window
} from 'livereel';
import { type AppServed, servedApp } from './livereel-promo/server.ts';

// A wide frame, as a README or a talk shows it, and the app laid out on a screen of the same size; and a square frame
// for a feed, with the app as a laptop lays it out
const WIDE = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
const SQUARE = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };
// The main number's card, the number itself, the button that refreshes it, and the row of cards with that button
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
const TOP_ROW = `${REFRESH}, ${CARDS}`;
// The film's one click on Refresh, the first the app's server answers
const FIRST_REFRESH = 1;
// The screen comes up from a little smaller than the whole of it
const OPENS_FROM = 0.86;
// How far the camera draws back over the whole page, and how the page leans back and swings to the left meanwhile,
// all of it behind where the terminal's window comes up
const DRAWN_BACK_BY = 0.7;
const LEANING_BACK: Angle = { tilt: 14, turn: -9 };
const TITLE = 'acme — claude';
const TASK = 'make a 20-second promo of my app';
const THINKING = 'Working…';
const ENDING = { name: 'livereel', line: 'Your agent films your live app', command: 'npx livereel' };

/** The whole screen from a little further off, as it stands before it comes up. */
function fromAfar(whole: Pose): Pose {
	return { ...whole, zoom: whole.zoom * OPENS_FROM };
}

/** The whole page from further back. */
function drawnBack(whole: Pose): Pose {
	return { ...whole, zoom: whole.zoom * DRAWN_BACK_BY };
}

/** The agent's work: the skill, the film written, and the film shot in this format as an MP4 and a GIF. */
function workIn(formatName: string): readonly TerminalLine[] {
	return [
		{ kind: 'work', text: 'Skill reel' },
		{ kind: 'work', text: 'Write promo.ts' },
		{ kind: 'work', text: `Bash npx livereel shoot promo.ts --format ${formatName} --as mp4 --as gif` },
		{ kind: 'said', text: `Made out/promo-${formatName}.mp4 and .gif, 20 s.` }
	];
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
				camera.onto(VISITORS, { within: { end: 0.64 } }),
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
		...cursor.click((context) => refreshed(context, served.refreshes.brought(FIRST_REFRESH).visitors)),
		play({
			seconds: 1.7,
			moves: [
				caption.show('A real click, a real server', { within: { start: 0.17, end: 0.76 } }),
				camera.onto(VISITORS, { within: { start: 0.35 } }),
				light.on(VISITORS, { within: { start: 0.58 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.6 })
	];
}

/** The camera draws back over the whole page as it leans and the last caption comes. */
function actTheClock(whole: Pose): readonly Step[] {
	return [
		cut(cursor.hide()),
		play({
			seconds: 2,
			moves: [
				caption.hide({ within: { end: 0.2 } }),
				light.off({ within: { start: 0.05, end: 0.25 } }),
				camera.to(drawnBack(whole), { within: { start: 0.05 } }),
				window.lean({ ...LEANING_BACK, within: { start: 0.05 } }),
				caption.show("Every frame on the film's own clock", { within: { start: 0.35, end: 0.9 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.4 })
	];
}

/** Claude Code's terminal comes up over the film, is asked for it, and its agent makes it in this format. */
function actTheAgent(formatName: string): readonly Step[] {
	return [
		play({
			seconds: 0.8,
			moves: [caption.hide({ within: { end: 0.5 } }), terminal.open(TITLE, { within: { start: 0.375 } })],
			ease: easeOutCubic
		}),
		...typing(terminal.type(keystrokes(TASK, { seed: 7, slipAt: 9, pace: 0.35 }))),
		hold({ seconds: 0.2 }),
		cut(terminal.submit()),
		play({ seconds: 2, moves: [terminal.works(workIn(formatName), THINKING)] }),
		hold({ seconds: 0.6 })
	];
}

/** The ending comes up over the terminal. */
function actEnding(): readonly Step[] {
	return [play({ seconds: 0.8, moves: [ending.show(ENDING)], ease: easeOutCubic }), hold({ seconds: 1.6 })];
}

function steps(served: AppServed, whole: Pose, formatName: string): readonly Step[] {
	return [
		...actOpening(whole),
		...actTheNumber(),
		...actTheClick(served),
		...actTheClock(whole),
		...actTheAgent(formatName),
		...actEnding()
	];
}

export default defineFilm({ formats: { wide: WIDE, square: SQUARE }, serve: servedApp, ready: cardShown, steps });
