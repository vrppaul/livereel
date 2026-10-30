/**
 * example.com, filmed: a title card, the page, the line that says what it is for in six languages beside the words
 * that say so, and its one link followed.
 *
 *     pnpm livereel shoot examples/example-com.ts --format square --out out/example --sheet
 *
 * It is shot square for a feed, or wide for a page or a talk: every framing is by selector, so the one script fits
 * either frame, and the words beside the languages stand to the left of the page in the wide frame and above it in
 * the square. Its link leads to IANA's page, which refuses to be framed: the page is static, filmed in a tab of its
 * own, so no frame is refused.
 */
import {
	type ActContext,
	type Pose,
	type Serving,
	type Step,
	type Wording,
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
	screen,
	title,
	window
} from 'livereel';

const ADDRESS = 'https://example.com/';
// A square frame with the page as a laptop lays it out, and a wide frame with the page laid out as wide; each names
// where the words about the languages stand and the page's window beside them: above it in the square, to its left
// in the wide frame
const FORMATS = {
	square: {
		frame: { width: 1080, height: 1080 },
		screen: { width: 1440, height: 1080 },
		places: { words: 'top', page: 'bottom' }
	},
	wide: {
		frame: { width: 1920, height: 1080 },
		screen: { width: 1920, height: 1080 },
		places: { words: 'left', page: 'right' }
	}
};
const MARK = 'svg';
const ENGLISH = 'p[lang=en]';
// The same line in the page's other languages, in the order the page says it
const LANGUAGES = ['ar', 'zh', 'fr', 'ru', 'es'];
const LINK = 'a';
const FOLLOWED_TO = '**iana.org/**';
// The screen comes up from a little smaller than the whole of it
const OPENS_FROM = 0.86;
// The word the title card sets apart, and the marker under the count of languages
const ACCENT = '#ffb86b';
const MARKER = '#5b47d6';
const OPENING: Wording = ['The most ', { text: 'famous', italic: true, ink: ACCENT }, ' page on the web'];
const IN_SIX: Wording = ['It says so in ', { text: 'six languages', marker: MARKER }];
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

function servedElsewhere(): Serving {
	return atAddress(ADDRESS);
}

function linkShown(context: ActContext): Promise<void> {
	return context.page.locator(LINK).waitFor();
}

/** A title card says what this page is; it gives way to the screen coming up, and the camera goes to the page's mark. */
function actOpening(whole: Pose): readonly Step[] {
	return [
		cut(screen.lower(), camera.to(fromAfar(whole))),
		play({ seconds: 1.2, moves: [title.show(OPENING)] }),
		hold({ seconds: 1.1 }),
		play({
			seconds: 1.1,
			moves: [
				title.hide({ within: { end: 0.5 } }),
				screen.rise({ within: { start: 0.2, end: 0.9 } }),
				camera.to(whole)
			],
			ease: easeOutCubic
		}),
		hold({ seconds: 0.3 }),
		play({ seconds: 1.2, moves: [camera.onto(MARK, { air: 160, zoomAtMost: 2.6 })], ease: easeInOutCubic }),
		hold({ seconds: 0.6 })
	];
}

/**
 * The line that says what the page is for, lit; then the words that say it is said in six languages, beside the
 * same line in each of them.
 */
function actLanguages(): readonly Step[] {
	return [
		play({
			seconds: 1.1,
			moves: [
				camera.onto(ENGLISH, { air: 80, zoomAtMost: 2 }),
				light.on(ENGLISH, { within: { start: 0.3 } }),
				caption.show('It exists to be an example', { within: { start: 0.4 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 1.3 }),
		play({
			seconds: 1,
			moves: [
				caption.hide({ within: { end: 0.4 } }),
				window.to('page'),
				camera.onto(ENGLISH, { air: 60, zoomAtMost: 2 }),
				title.show(IN_SIX, { at: 'words', within: { start: 0.5 } })
			],
			ease: easeInOutCubic
		}),
		hold({ seconds: 0.6 }),
		...LANGUAGES.flatMap(inTurn)
	];
}

/** One language's line lit and framed in the window, and held. */
function inTurn(language: string): readonly Step[] {
	return [
		play({
			seconds: 0.6,
			moves: [light.to(inLanguage(language)), camera.onto(inLanguage(language), { air: 60, zoomAtMost: 2 })],
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
				window.to('whole'),
				camera.onto(LINK, { air: 170, zoomAtMost: 2.2 }),
				title.hide({ within: { end: 0.4 } }),
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

export default defineFilm({ formats: FORMATS, serve: servedElsewhere, ready: linkShown, steps });
