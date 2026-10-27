// A film of an app with a server of its own, shot on the stage apart from it: its page reached through a redirect, a
// frame inside it that cannot be reached, an answer from the server after a click, what the server pushes down a
// WebSocket with Chrome's Local Network Access checks on, and the page's own scroll. And the films refused by why: a
// page that refuses to be framed, as the frame opens it or after a click led to it; a page nobody answers, after a
// click from one that answered; a click that takes the stage away
import { expect, test } from 'vitest';
import { Chromium } from '../../src/adapters/browser/chromium.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { FilmError, TakeError } from '../../src/domain/errors.ts';
import { type Shooting, shoot } from '../../src/studio/shoot.ts';
import { NoFrames, PUSHED, type Routes, servedApp } from './app.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import { type ActContext, type Step, act, atAddress, cursor, defineFilm, page, play } from 'livereel';

const FAR = '[data-testid=far]';
const ASK = '[data-testid=ask]';
const ANSWER = '[data-testid=answer]';
const ANSWERED = 'answered';
const PUSHED_HERE = '[data-testid=pushed]';
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };

const APP = `<!doctype html>
<html lang="en">
	<head><meta charset="utf-8" /><title>An app</title><link rel="stylesheet" href="style.css" /></head>
	<body>
		<button data-testid="ask" onclick="fetch('/answer').then((answer) => answer.text()).then((text) => { document.querySelector('[data-testid=answer]').textContent = text; })">Ask</button>
		<div data-testid="answer"></div>
		<div data-testid="pushed"></div>
		<script>new WebSocket('ws://' + location.host + '/pushes').onmessage = (event) => { document.querySelector('[data-testid=pushed]').textContent = event.data; };</script>
		<iframe src="http://127.0.0.1:9/" title="A frame nobody answers"></iframe>
		<div style="height: 3000px"></div>
		<div data-testid="far">Far down</div>
		<div style="height: 1000px"></div>
	</body>
</html>`;

const TO_REFUSING = '[data-testid=to-refusing]';
const TO_TOP = '[data-testid=to-top]';
const TO_NOWHERE = '[data-testid=to-nowhere]';
const NOWHERE = 'http://127.0.0.1:9/';
const LINKS = `<!doctype html>
<a data-testid="to-refusing" href="/refusing/">A page that refuses frames</a>
<a data-testid="to-top" href="/bare/" target="_top">A page with no script, in place of the stage</a>
<a data-testid="to-nowhere" href="${NOWHERE}">A page nobody answers</a>`;

// The app sends /old on to /app/, whose policy names no pages that may frame it; /refusing/ refuses every frame; /links/
// leads to it, and to a page with no script in place of the page the frame stands in, as a script is what a stage gone
// was found by before
const ROUTES: Routes = {
	'/old': (_request, response) => response.writeHead(302, { Location: '/app/' }).end(),
	'/app/': (_request, response) =>
		response
			.writeHead(200, {
				'Content-Type': 'text/html',
				'Content-Security-Policy': "default-src 'self' 'unsafe-inline' http://127.0.0.1:9"
			})
			.end(APP),
	'/app/style.css': (_request, response) =>
		response.writeHead(200, { 'Content-Type': 'text/css' }).end(':root { --loaded: yes; }'),
	'/answer': (_request, response) => setTimeout(() => response.writeHead(200).end(ANSWERED), 300),
	'/refusing/': (_request, response) =>
		response.writeHead(200, { 'Content-Type': 'text/html', 'X-Frame-Options': 'DENY' }).end('<!doctype html>'),
	'/links/': (_request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end(LINKS),
	'/bare/': (_request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end('<!doctype html>')
};

// How long a push may take to reach the page, well past what one takes
const PUSH_WITHIN_MILLISECONDS = 5000;
const REFUSED_APART =
	'refuses to be framed (X-Frame-Options: DENY): film it with stage: "inside", where livereel takes the refusal off';
const SHOOTING: Shooting = {
	browser: new Chromium('software', WARNED_TO_NOBODY),
	footage: new NoFrames(),
	track: SILENT,
	quality: { sharpness: 1, blurred: false }
};

async function farTop(context: ActContext, seen: (number | string | null)[]): Promise<void> {
	seen.push(await context.page.locator(FAR).evaluate((far) => Math.round(far.getBoundingClientRect().top)));
}

async function whatReachedThePage(context: ActContext, seen: (number | string | null)[]): Promise<void> {
	await context.page.locator(ANSWER).getByText(ANSWERED).waitFor();
	seen.push(await context.page.locator(ANSWER).textContent());
	await context.page.locator(PUSHED_HERE).getByText(PUSHED).waitFor({ timeout: PUSH_WITHIN_MILLISECONDS });
	seen.push(await context.page.locator(PUSHED_HERE).textContent());
	seen.push(
		await context.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--loaded').trim())
	);
	seen.push(await context.page.evaluate(() => location.pathname));
}

function askTheServer(context: ActContext): Promise<void> {
	return context.page.locator(ASK).click();
}

/** A link in the frame clicked, and the frame's next page waited for. */
async function followedInTheFrame(context: ActContext, link: string): Promise<void> {
	await Promise.all([
		context.page.page().waitForEvent('framenavigated', { predicate: (frame) => frame === context.page }),
		context.page.locator(link).click()
	]);
}

/** A link in the frame clicked, and the page the stage stands in waited for as it goes. */
async function followedInPlaceOfTheStage(context: ActContext, link: string): Promise<void> {
	await Promise.all([
		context.page.page().waitForEvent('framenavigated', { predicate: (frame) => frame.parentFrame() === null }),
		context.page.locator(link).click()
	]);
}

/** A film of the app's page at a path, stood apart, of steps that make up no frame. */
function filmAt(address: string, steps: readonly Step[]) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress(address),
		ready: () => Promise.resolve(),
		steps: () => steps
	});
}

test('an app with a server of its own is filmed apart from it: framed at the address it is sent on to, scrolled, answered after a click, and pushed to', async () => {
	const seen: (number | string | null)[] = [];
	const film = defineFilm({
		formats: { small: SMALL },
		serve: () => servedApp(ROUTES, '/old'),
		ready: (context) => context.page.locator(ASK).waitFor(),
		steps: () => [
			play({ seconds: 0.2, moves: [page.scrollBy('html', { pixels: 1000 })] }),
			play({ seconds: 0.3, moves: [page.scrollTo(FAR, { top: 100 })] }),
			act((context) => farTop(context, seen)),
			play({ seconds: 0.2, moves: [cursor.to(ASK)] }),
			...cursor.click(askTheServer),
			act((context) => whatReachedThePage(context, seen))
		]
	});
	await shoot(film.formats.get('small')!, SHOOTING);
	expect(seen).toEqual([100, ANSWERED, PUSHED, 'yes', '/app/']);
});

test('a page that refuses to be framed is refused on the stage apart as the frame opens it, by its refusal, naming the stage that shows it', async () => {
	await using app = await servedApp(ROUTES, '/refusing/');
	await expect(shoot(filmAt(app.address, []).formats.get('small')!, SHOOTING)).rejects.toThrow(
		new FilmError(`the page at ${app.address} ${REFUSED_APART}`)
	);
});

test('a page that refuses to be framed, reached by a click, is refused after the act, by its refusal', async () => {
	await using app = await servedApp(ROUTES, '/links/');
	const film = filmAt(app.address, [act((context) => followedInTheFrame(context, TO_REFUSING))]);
	const refusing = new URL('/refusing/', app.address).href;
	await expect(shoot(film.formats.get('small')!, SHOOTING)).rejects.toThrow(
		new TakeError(new FilmError(`the page at ${refusing} ${REFUSED_APART}`), 0, 1)
	);
});

test('a page nobody answers, reached by a click from one that answered, is refused after the act as not reached', async () => {
	await using app = await servedApp(ROUTES, '/links/');
	const film = filmAt(app.address, [act((context) => followedInTheFrame(context, TO_NOWHERE))]);
	await expect(shoot(film.formats.get('small')!, SHOOTING)).rejects.toThrow(
		new TakeError(new FilmError(`the page at ${NOWHERE} could not be reached`), 0, 1)
	);
});

test('a click that takes the page the stage stands in away is refused after the act, saying so', async () => {
	await using app = await servedApp(ROUTES, '/links/');
	const film = filmAt(app.address, [act((context) => followedInPlaceOfTheStage(context, TO_TOP))]);
	await expect(shoot(film.formats.get('small')!, SHOOTING)).rejects.toThrow(
		new TakeError(
			new FilmError(
				'a click took the page the stage stands in away from the stage, as a link to `_top` does: film it with stage: "inside", where the frame is sandboxed against it'
			),
			0,
			1
		)
	);
});
