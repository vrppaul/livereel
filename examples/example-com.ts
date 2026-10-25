/**
 * example.com, filmed: the page, the line that says what it is for in six languages, and its one link followed.
 *
 *     pnpm livereel shoot examples/example-com.ts --out out/example --sheet
 */
import {
	type ActContext,
	type Pose,
	type Serving,
	type Step,
	atAddress,
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
	lookingAt,
	play,
	screen
} from 'livereel';

const ADDRESS = 'https://example.com/';
// A square frame, and the page as a laptop lays it out
const SQUARE = { frame: { width: 1080, height: 1080 }, screen: { width: 1440, height: 1080 } };
const MARK = 'svg';
const ENGLISH = 'p[lang=en]';
// The same line in the page's other languages, in the order the page says it
const LANGUAGES = ['ar', 'zh', 'fr', 'ru', 'es'];
const LINK = 'a';
const FOLLOWED_TO = '**iana.org/**';
// The screen comes up from a little smaller than the whole of it
const OPENS_FROM = 0.86;
const ENDING = { name: 'example.com', line: 'Filmed live, frame by frame', command: 'livereel' };

function inLanguage(language: string): string {
	return `p[lang=${language}]`;
}

/** The whole screen from a little further off, as it stands before it comes up. */
function fromAfar(whole: Pose): Pose {
	return lookingAt(whole, whole.focusX, whole.focusY, whole.zoom * OPENS_FROM);
}

async function followTheLink(context: ActContext): Promise<void> {
	await context.page.locator(LINK).click();
	await context.page.waitForURL(FOLLOWED_TO);
	await context.page.waitForLoadState();
}

function servedElsewhere(): Promise<Serving> {
	return Promise.resolve(atAddress(ADDRESS));
}

function linkShown(context: ActContext): Promise<void> {
	return context.page.locator(LINK).waitFor();
}

/** The screen comes up out of the ground, and the camera goes to the page's mark: what this page is. */
function actOpening(whole: Pose): readonly Step[] {
	return [
		cut(screen.lower(), camera.to(fromAfar(whole))),
		play({ seconds: 0.9, moves: [screen.rise({ within: { end: 0.7 } }), camera.to(whole)], ease: easeOutCubic }),
		hold({ seconds: 0.4 }),
		play({
			seconds: 1.4,
			moves: [
				camera.onto(MARK, { air: 160, zoomAtMost: 2.6 }),
				caption.show('The most famous page on the web', { within: { start: 0.35 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1 })
	];
}

/** The line that says what the page is for, lit; then the same line in each of the page's other languages. */
function actLanguages(): readonly Step[] {
	return [
		play({
			seconds: 1.1,
			moves: [
				camera.onto(ENGLISH, { air: 80, zoomAtMost: 2 }),
				light.on(ENGLISH, { within: { start: 0.3 } }),
				caption.hide({ within: { end: 0.3 } }),
				caption.show('It exists to be an example', { within: { start: 0.4 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.3 }),
		play({ seconds: 0.4, moves: [caption.hide()] }),
		play({ seconds: 0.4, moves: [caption.show('in six languages')] }),
		...LANGUAGES.flatMap(inTurn)
	];
}

/** One language's line lit and framed, and held. */
function inTurn(language: string): readonly Step[] {
	return [
		play({
			seconds: 0.6,
			moves: [light.to(inLanguage(language)), camera.onto(inLanguage(language), { air: 90, zoomAtMost: 2 })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.35 })
	];
}

/** The page's one link, lit, framed and followed for real; the page it leads to, whole. */
function actTheLink(whole: Pose): readonly Step[] {
	return [
		play({
			seconds: 1,
			moves: [
				light.to(LINK),
				camera.onto(LINK, { air: 170, zoomAtMost: 2.2 }),
				caption.hide({ within: { end: 0.3 } }),
				cursor.to(LINK, { within: { start: 0.2 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.3 }),
		play({ seconds: 0.25, moves: [light.off()] }),
		...cursor.click(followTheLink),
		cut(cursor.hide()),
		play({
			seconds: 1.3,
			moves: [camera.to(whole), caption.show('and its one link leads somewhere real', { within: { start: 0.3 } })],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.4 })
	];
}

function actEnding(): readonly Step[] {
	return [
		play({ seconds: 0.9, moves: [caption.hide(), ending.show(ENDING)], ease: easeOutCubic }),
		hold({ seconds: 1.8 })
	];
}

function steps(_served: Serving, whole: Pose): readonly Step[] {
	return [...actOpening(whole), ...actLanguages(), ...actTheLink(whole), ...actEnding()];
}

export default defineFilm({ format: SQUARE, serve: servedElsewhere, ready: linkShown, steps });
