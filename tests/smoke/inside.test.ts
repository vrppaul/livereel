// A film of an app shot on the stage inside it, on the app's own address: signed in by a redirect that sets its
// cookie, framed though it refuses every frame, pushed to down a WebSocket, and kept in the stage though its page
// breaks out of frames
import { expect, test } from 'vitest';
import { Chromium } from '../../src/adapters/browser/chromium.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { shoot } from '../../src/studio/shoot.ts';
import { NoFrames, PUSHED, type Routes, servedApp } from './app.ts';
import { type ActContext, act, defineFilm, play } from 'livereel';

const ME = '[data-testid=me]';
const PUSHED_HERE = '[data-testid=pushed]';
const SESSION = 'session=signed';
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };

const APP = `<!doctype html>
<html lang="en">
	<head><meta charset="utf-8" /><title>An app that signs in</title><link rel="stylesheet" href="style.css" /></head>
	<body>
		<div data-testid="me"></div>
		<div data-testid="pushed"></div>
		<script>fetch('/api/me').then((answer) => answer.text()).then((text) => { document.querySelector('[data-testid=me]').textContent = text; });</script>
		<script>new WebSocket('ws://' + location.host + '/pushes').onmessage = (event) => { document.querySelector('[data-testid=pushed]').textContent = event.data; };</script>
		<script>if (window.top !== window.self) window.top.location.href = location.href;</script>
	</body>
</html>`;

// The app signs in at /login and sends the page on to /app/, refusing frames on every answer, as Rails and Django
// do; its stylesheet and its API say the cookie they were sent
const ROUTES: Routes = {
	'/login': (_request, response) =>
		response
			.writeHead(302, {
				'Set-Cookie': `${SESSION}; HttpOnly; SameSite=Lax; Path=/`,
				'X-Frame-Options': 'DENY',
				Location: '/app/'
			})
			.end(),
	'/app/': (_request, response) =>
		response
			.writeHead(200, {
				'Content-Type': 'text/html',
				'X-Frame-Options': 'DENY',
				'Content-Security-Policy': "frame-ancestors 'none'"
			})
			.end(APP),
	'/app/style.css': (request, response) =>
		response.writeHead(200, { 'Content-Type': 'text/css' }).end(`:root { --cookie: "${request.headers.cookie}"; }`),
	'/api/me': (request, response) => response.end(String(request.headers.cookie))
};

// How long a push may take to reach the page, well past what one takes
const PUSH_WITHIN_MILLISECONDS = 5000;

async function whatReachedThePage(context: ActContext, seen: (string | null)[]): Promise<void> {
	await context.page.locator(ME).getByText(SESSION).waitFor();
	await context.page.locator(PUSHED_HERE).getByText(PUSHED).waitFor({ timeout: PUSH_WITHIN_MILLISECONDS });
	seen.push(
		await context.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--cookie').trim())
	);
	seen.push(await context.page.locator(ME).textContent());
	seen.push(await context.page.locator(PUSHED_HERE).textContent());
	seen.push(await context.page.evaluate(() => location.pathname));
}

test('an app on the stage inside it is filmed signed in, framed though every answer refuses, pushed to, and kept in the stage, with nothing to warn of', async () => {
	const seen: (string | null)[] = [];
	const warned: string[] = [];
	const film = defineFilm({
		formats: { small: SMALL },
		serve: () => servedApp(ROUTES, '/login'),
		stage: 'inside',
		ready: (context) => context.page.locator(ME).waitFor(),
		steps: () => [play({ seconds: 0.2 }), act((context) => whatReachedThePage(context, seen))]
	});
	await shoot(film.formats.get('small')!, {
		browser: new Chromium('software', (line) => warned.push(line)),
		footage: new NoFrames(),
		track: SILENT,
		quality: { sharpness: 1, blurred: false }
	});
	expect({ seen, warned }).toEqual({ seen: [`"${SESSION}"`, SESSION, PUSHED, '/app/'], warned: [] });
});
