/**
 * livereel's film for its README: what it is and how, shown as the code that makes it and what that code shoots.
 *
 *     pnpm livereel shoot examples/livereel-readme.ts --out out/readme --sheet
 *
 * Acme's analytics app is served by the film itself, and beside it a page of this very file's code
 * (`livereel-promo/code.ts`): each region marked `// #region name` below is what the code page shows, and the film
 * goes from those lines, lit, to the app, where the same lines shoot what follows. So the code on the screen is the
 * code that shot it.
 */
import {
	type ActContext,
	type Pose,
	type Step,
	act,
	camera,
	caption,
	cursor,
	cut,
	defineFilm,
	easeInOutCubic,
	easeOutCubic,
	ending,
	hold,
	light,
	look,
	play,
	screen,
	title
} from 'livereel';
import { type AppServed, CODE_PAGE, servedAppWithCode } from './livereel-promo/server.ts';

// A wide frame, as a README shows it, and the app laid out on a screen of the same size
const WIDE = { frame: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 } };
// The app's main number, its card and the button that refreshes it, and the row of cards
const VISITORS = '[data-testid=visitors]';
const VISITORS_TODAY = '[data-testid=visitors-today]';
const REFRESH = '[data-testid=refresh]';
const CARDS = '[data-testid=kpis]';
// The code page, and its regions, by the names this file marks them with
const CODE = '[data-testid=code]';
const THE_FILM = '[data-testid=code-the-film]';
const THE_CAMERA = '[data-testid=code-camera]';
const THE_CLICK = '[data-testid=code-click]';
const THE_WINDOW = '[data-testid=code-window]';
const THE_LOOK = '[data-testid=code-look]';
const ACCENT = '#ffb224';
// The look the film turns to, value by value: a light ground, a serif, square corners, a violet shadow, a night ground
const LIGHT_GROUND = '#f5efe6';
const DARK_INK = '#1a1a1a';
const SERIF = 'Georgia, serif';
const SQUARE_CORNERS = 0;
const VIOLET = '#7c3aed';
const FAINT_EDGE = '#00000033';
const NIGHT = '#1e1b4b';
const LIGHT_INK = '#f5f3ff';
const ENDING = { name: 'livereel', line: 'Film your live app from code', command: 'npx livereel' };

/** The page in the stage's frame gone to an address of the app's server, once a block of it stands. */
async function wentTo(context: ActContext, served: AppServed, path: string, shown: string): Promise<void> {
	await context.page.goto(new URL(path, served.address).href);
	await context.page.locator(shown).waitFor();
}

/** Refresh clicked for real, until the page shows the count its server answered with. */
async function refreshed(context: ActContext, visitors: string): Promise<void> {
	await context.page.locator(REFRESH).click();
	await context.page.locator(VISITORS_TODAY, { hasText: visitors }).waitFor();
}

/** From lines of code, lit and named, to the app: the words and the light gone, the camera back over the whole. */
function fromTheLines(served: AppServed, whole: Pose): readonly Step[] {
	return [
		play({
			seconds: 0.8,
			moves: [
				caption.hide({ within: { end: 0.4 } }),
				light.off({ within: { end: 0.4 } }),
				camera.to(whole, { within: { start: 0.2 } })
			],
			ease: easeInOutCubic
		}),
		act((context) => wentTo(context, served, '/', REFRESH))
	];
}

/** From a lit block of the app to the code page: the light gone, the camera back over the whole. */
function fromTheApp(served: AppServed, whole: Pose): readonly Step[] {
	return [
		play({
			seconds: 0.8,
			moves: [light.off({ within: { end: 0.4 } }), camera.to(whole, { within: { start: 0.2 } })],
			ease: easeInOutCubic
		}),
		act((context) => wentTo(context, served, CODE_PAGE, CODE))
	];
}

/** From lines of code to the next lines on the code page: the words and the light gone as the camera goes on. */
function nextLines(region: string, words: string): readonly Step[] {
	return [
		play({ seconds: 0.5, moves: [caption.hide(), light.off()], ease: easeInOutCubic }),
		...linesShown(region, words)
	];
}

/** Lines of this file on the code page: the camera onto their block, the light on it, and words about them. */
function linesShown(region: string, words: string): readonly Step[] {
	return [
		play({
			seconds: 1.4,
			moves: [
				camera.onto(region, { air: 40, within: { end: 0.7 } }),
				light.on(region, { within: { start: 0.6 } }),
				caption.show(words, { within: { start: 0.4 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.8 })
	];
}

/** The claim on the bare ground, and the code page coming up under it as it goes. */
function actTheClaim(served: AppServed): readonly Step[] {
	return [
		cut(screen.lower()),
		play({
			seconds: 1.4,
			moves: [title.show(['Film your live app ', { text: 'from code', italic: true, ink: ACCENT }])]
		}),
		hold({ seconds: 1.4 }),
		act((context) => wentTo(context, served, CODE_PAGE, CODE)),
		play({ seconds: 1, moves: [title.hide({ within: { end: 0.6 } }), screen.rise()], ease: easeOutCubic })
	];
}

/** A film is a file: the line that defines this one. */
function actTheFile(): readonly Step[] {
	return linesShown(THE_FILM, 'A film is a file you write');
}

/** The camera and the light: their lines, then the camera onto the app's main number and the light on it. */
function actTheCamera(served: AppServed, whole: Pose): readonly Step[] {
	return [
		...nextLines(THE_CAMERA, 'A camera and a light, by selector'),
		...fromTheLines(served, whole),
		play({
			seconds: 1.6,
			moves: [
				// #region camera
				camera.onto(VISITORS, { air: 60 }),
				light.on(VISITORS, { within: { start: 0.6 } })
				// #endregion
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.2 })
	];
}

/** A real click: its lines, then the cursor clicking Refresh, the app's server answering, the number changed. */
function actTheClick(served: AppServed, whole: Pose): readonly Step[] {
	return [
		...fromTheApp(served, whole),
		...linesShown(THE_CLICK, 'A real click on your real app'),
		...fromTheLines(served, whole),
		play({ seconds: 1.2, moves: [camera.onto(CARDS, { air: 40 }), cursor.to(REFRESH)], ease: easeInOutCubic }),
		// #region click
		...cursor.click((context) => refreshed(context, served.refreshed.visitors)),
		// #endregion
		play({ seconds: 1.2, moves: [camera.onto(VISITORS, { air: 60 }), light.on(VISITORS)], ease: easeInOutCubic }),
		hold({ seconds: 1.2 })
	];
}

/** The window and the look: their lines, then the page drawn back into a window beside words, its look built up. */
function actTheWindowAndTheLook(served: AppServed, whole: Pose): readonly Step[] {
	return [
		cut(cursor.hide()),
		...fromTheApp(served, whole),
		...linesShown(THE_WINDOW, 'Your page in a window, beside words'),
		...nextLines(THE_LOOK, 'And every value of its look'),
		...fromTheLines(served, whole),
		play({
			seconds: 1.6,
			moves: [
				// #region window
				camera.onto(CARDS, { side: 'right', air: 60 }),
				title.show(['Every number, ', { text: 'live', italic: true }], { side: 'left', within: { start: 0.5 } })
				// #endregion
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.8 }),
		// #region look
		cut(look.to({ ground: LIGHT_GROUND, ink: DARK_INK })),
		hold({ seconds: 0.4 }),
		cut(look.to({ font: SERIF, windowCorner: SQUARE_CORNERS })),
		hold({ seconds: 0.4 }),
		cut(look.to({ windowShadowColour: VIOLET, windowEdge: FAINT_EDGE })),
		hold({ seconds: 0.4 }),
		play({ seconds: 1.6, moves: [look.to({ ground: NIGHT, glow: VIOLET, ink: LIGHT_INK })] }),
		// #endregion
		hold({ seconds: 1 })
	];
}

/** The ending over the app. */
function actEnding(): readonly Step[] {
	return [play({ seconds: 0.8, moves: [ending.show(ENDING)], ease: easeOutCubic }), hold({ seconds: 2 })];
}

function steps(served: AppServed, whole: Pose): readonly Step[] {
	return [
		...actTheClaim(served),
		...actTheFile(),
		...actTheCamera(served, whole),
		...actTheClick(served, whole),
		...actTheWindowAndTheLook(served, whole),
		...actEnding()
	];
}

function appShown(context: ActContext): Promise<void> {
	return context.page.locator(REFRESH).waitFor();
}

// #region the-film
export default defineFilm({
	formats: { wide: WIDE },
	serve: () => servedAppWithCode(new URL(import.meta.url)),
	ready: appShown,
	steps
});
// #endregion
