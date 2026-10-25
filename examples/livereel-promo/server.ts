/**
 * Acme's analytics app, served by the promo for as long as a take lasts: its page, its styles, and today's numbers
 * that its Refresh asks the server for.
 *
 * The app is data, `app/`. What the server answers on a refresh, `app/refreshed.json`, comes with what is served, so
 * the film knows what the page shows once its click is answered. The server answers these three addresses alone.
 */
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { Serving } from 'livereel';
import refreshed from './app/refreshed.json' with { type: 'json' };

/** Today's numbers as a refresh brings them: the visitors, how they stand against yesterday, today's bar in percent. */
export type Refreshed = typeof refreshed;

/** What the server answers at an address: the kind of content, and the content. */
interface Answer {
	readonly type: string;
	readonly body: string;
}

const APP = new URL('./app/', import.meta.url);
const HOST = '127.0.0.1';
// The system picks a port that is free
const ANY_PORT = 0;
const ANSWERED = 200;
const NOT_HERE = 404;

/** The app served, and today's numbers it answers a refresh with. */
export class AppServed implements Serving {
	readonly server: Server;
	readonly address: string;
	readonly refreshed: Refreshed;

	constructor(server: Server, address: string) {
		this.server = server;
		this.address = address;
		this.refreshed = refreshed;
	}

	/** The page's open connections closed with the server, so the film leaves nothing running. */
	async [Symbol.asyncDispose](): Promise<void> {
		this.server.closeAllConnections();
		this.server.close();
		await once(this.server, 'close');
	}
}

export async function servedApp(): Promise<AppServed> {
	const answers = new Map<string, Answer>([
		['/', { type: 'text/html', body: await readFile(new URL('index.html', APP), 'utf8') }],
		['/app.css', { type: 'text/css', body: await readFile(new URL('app.css', APP), 'utf8') }],
		['/api/today', { type: 'application/json', body: JSON.stringify(refreshed) }]
	]);
	const server = createServer((request, response) => answer(answers, request, response)).listen(ANY_PORT, HOST);
	await once(server, 'listening');
	return new AppServed(server, addressOf(server));
}

function answer(answers: ReadonlyMap<string, Answer>, request: IncomingMessage, response: ServerResponse): void {
	const found = answers.get(request.url ?? '');
	if (found === undefined) {
		response.writeHead(NOT_HERE).end();
		return;
	}
	response.writeHead(ANSWERED, { 'Content-Type': found.type }).end(found.body);
}

/** Where the server listens; a server on a pipe has no address a page is opened at. */
function addressOf(server: Server): string {
	const listening = server.address();
	if (listening === null || typeof listening === 'string') throw new Error('the app is not served on a port');
	return `http://${HOST}:${listening.port}/`;
}
