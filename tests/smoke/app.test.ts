// A film of an app with a server of its own, shot in a browser: the page refusing to be framed, a frame inside it
// that cannot be reached, an answer from the server after a click, what the server pushes down a WebSocket, and the
// page's own scroll
import { createHash } from 'node:crypto';
import { type Server, createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import { expect, test } from 'vitest';
import { Chromium } from '../../src/adapters/browser/chromium.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { shoot } from '../../src/studio/shoot.ts';
import type { Footage } from '../../src/studio/ports.ts';
import { type ActContext, type Serving, act, cursor, defineFilm, page, play } from 'livereel';

const FAR = '[data-testid=far]';
const ASK = '[data-testid=ask]';
const ANSWER = '[data-testid=answer]';
const ANSWERED = 'answered';
const PUSHED_HERE = '[data-testid=pushed]';
const PUSHED = 'pushed';
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };
// The WebSocket handshake's fixed key, and the first byte of a whole text message, its length next (under 126)
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const TEXT_MESSAGE = 0x81;

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

const ROUTES: Readonly<Record<string, (response: ServerResponse) => void>> = {
	'/app/': (response) =>
		response
			.writeHead(200, {
				'Content-Type': 'text/html',
				'X-Frame-Options': 'DENY',
				'Content-Security-Policy': "default-src 'self' 'unsafe-inline' http://127.0.0.1:9; frame-ancestors 'none'"
			})
			.end(APP),
	'/app/style.css': (response) =>
		response.writeHead(200, { 'Content-Type': 'text/css' }).end(':root { --loaded: yes; }'),
	'/answer': (response) => setTimeout(() => response.writeHead(200).end(ANSWERED), 300)
};

function answer(request: IncomingMessage, response: ServerResponse): void {
	ROUTES[String(request.url)]!(response);
}

/** The WebSocket the page opens, taken, one message pushed down it, and closed, so the server can stop. */
function pushOnce(request: IncomingMessage, socket: Duplex): void {
	const key = String(request.headers['sec-websocket-key']);
	const accept = createHash('sha1').update(`${key}${WEBSOCKET_GUID}`).digest('base64');
	socket.write(
		`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`
	);
	socket.end(Buffer.concat([Buffer.from([TEXT_MESSAGE, PUSHED.length]), Buffer.from(PUSHED)]));
}

class AppServed implements Serving {
	readonly server: Server;
	readonly address: string;

	constructor(server: Server) {
		this.server = server;
		this.address = `http://127.0.0.1:${(server.address() as AddressInfo).port}/app/`;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.server.closeAllConnections();
		this.server.close();
		await once(this.server, 'close');
	}
}

async function served(): Promise<AppServed> {
	const server = createServer(answer).on('upgrade', pushOnce).listen(0, '127.0.0.1');
	await once(server, 'listening');
	return new AppServed(server);
}

/** Footage that keeps no frame: the film is shot for what reaches the page. */
class NoFrames implements Footage {
	expect(): void {}
	keeps(): boolean {
		return false;
	}
	keep(): Promise<void> {
		return Promise.resolve();
	}
	complete(): boolean {
		return false;
	}
}

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
		serve: served,
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
		browser: new Chromium('software'),
		footage: new NoFrames(),
		track: SILENT,
		quality: { sharpness: 1, blurred: false }
	});
	expect(seen).toEqual([100, ANSWERED, PUSHED, 'yes', '/app/']);
});
