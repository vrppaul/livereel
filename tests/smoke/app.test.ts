// A film of an app with a server of its own, shot in a browser: the page refusing to be framed, a frame inside it
// that cannot be reached, an answer from the server after a click, what the server pushes down a WebSocket, and the
// page's own scroll
import { expect, test } from 'vitest';
import { Chromium } from '../../src/adapters/browser/chromium.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { shoot } from '../../src/studio/shoot.ts';
import { NoFrames, PUSHED, type Routes, servedApp } from './app.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import { type ActContext, act, cursor, defineFilm, page, play } from 'livereel';

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

const ROUTES: Routes = {
	'/app/': (_request, response) =>
		response
			.writeHead(200, {
				'Content-Type': 'text/html',
				'X-Frame-Options': 'DENY',
				'Content-Security-Policy': "default-src 'self' 'unsafe-inline' http://127.0.0.1:9; frame-ancestors 'none'"
			})
			.end(APP),
	'/app/style.css': (_request, response) =>
		response.writeHead(200, { 'Content-Type': 'text/css' }).end(':root { --loaded: yes; }'),
	'/answer': (_request, response) => setTimeout(() => response.writeHead(200).end(ANSWERED), 300)
};

const seen: (number | string | null)[] = [];
// How long a push may take to reach the page, well past what one takes
const PUSH_WITHIN_MILLISECONDS = 5000;

async function farTop(context: ActContext): Promise<void> {
	seen.push(await context.page.locator(FAR).evaluate((far) => Math.round(far.getBoundingClientRect().top)));
}

async function whatReachedThePage(context: ActContext): Promise<void> {
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

test('an app with a server of its own is filmed: framed, scrolled, answered after a click, and pushed to', async () => {
	const film = defineFilm({
		formats: { small: SMALL },
		serve: () => servedApp(ROUTES, '/app/'),
		ready: (context) => context.page.locator(ASK).waitFor(),
		steps: () => [
			play({ seconds: 0.2, moves: [page.scrollBy('html', { pixels: 1000 })] }),
			play({ seconds: 0.3, moves: [page.scrollTo(FAR, { top: 100 })] }),
			act(farTop),
			play({ seconds: 0.2, moves: [cursor.to(ASK)] }),
			...cursor.click(askTheServer),
			act(whatReachedThePage)
		]
	});
	await shoot(film.formats.get('small')!, {
		browser: new Chromium('software', WARNED_TO_NOBODY),
		footage: new NoFrames(),
		track: SILENT,
		quality: { sharpness: 1, blurred: false }
	});
	expect(seen).toEqual([100, ANSWERED, PUSHED, 'yes', '/app/']);
});
