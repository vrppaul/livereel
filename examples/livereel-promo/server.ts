/**
 * Acme's analytics app, served by the promo for as long as a take lasts: its page, its styles, and today's numbers
 * that its Refresh asks the server for.
 *
 * The app is data, `app/`. What the server answers on each refresh, in order, `app/refreshed.json`, comes with what is
 * served, so the film knows what the page shows once each of its clicks is answered, and a second click changes the
 * page as the first did. The server answers these three addresses alone.
 */
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import type { Serving } from 'livereel';
import refreshed from './app/refreshed.json' with { type: 'json' };

/**
 * Today's numbers as a refresh brings them: the visitors, how they stand against yesterday, today's bar in percent,
 * and whether the page says they were updated.
 */
export type Refreshed = (typeof refreshed)[number];

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
// Where the page asks for today's numbers, and how they are written
const TODAY = '/api/today';
const JSON_TYPE = 'application/json';
// How refreshes are numbered: the first is 1
const FIRST_REFRESH = 1;

/** Today's numbers each refresh brings, in order, the last again once they run out; and how many were answered. */
export class Refreshes {
	private readonly answers: readonly Refreshed[];
	private answered = 0;

	constructor(answers: readonly Refreshed[]) {
		this.answers = answers;
	}

	/** What the refresh of an order brings, the first numbered 1; past the last, the last. */
	brought(order: number): Refreshed {
		const answer = this.answers[Math.min(order, this.answers.length) - FIRST_REFRESH];
		if (answer === undefined) throw new Error(`no refresh is numbered ${order}: the first is ${FIRST_REFRESH}`);
		return answer;
	}

	/** What the next refresh brings, counted as answered. */
	next(): Refreshed {
		this.answered++;
		return this.brought(this.answered);
	}
}

/** The app served, and today's numbers it answers each refresh with. */
export class AppServed implements Serving {
	readonly server: Server;
	readonly address: string;
	readonly refreshes: Refreshes;

	constructor(server: Server, address: string, refreshes: Refreshes) {
		this.server = server;
		this.address = address;
		this.refreshes = refreshes;
	}

	/** The page's open connections closed with the server, so the film leaves nothing running. */
	async [Symbol.asyncDispose](): Promise<void> {
		this.server.closeAllConnections();
		this.server.close();
		await once(this.server, 'close');
	}
}

export async function servedApp(): Promise<AppServed> {
	const files = new Map<string, Answer>([
		['/', { type: 'text/html', body: await readFile(new URL('index.html', APP), 'utf8') }],
		['/app.css', { type: 'text/css', body: await readFile(new URL('app.css', APP), 'utf8') }]
	]);
	const refreshes = new Refreshes(refreshed);
	const server = createServer((request, response) => answer(files, refreshes, request, response));
	server.listen(ANY_PORT, HOST);
	await once(server, 'listening');
	return new AppServed(server, addressOf(server), refreshes);
}

function answer(
	files: ReadonlyMap<string, Answer>,
	refreshes: Refreshes,
	request: IncomingMessage,
	response: ServerResponse
): void {
	const found = answerAt(files, refreshes, request.url ?? '');
	if (found === undefined) {
		response.writeHead(NOT_HERE).end();
		return;
	}
	response.writeHead(ANSWERED, { 'Content-Type': found.type }).end(found.body);
}

/** What the server answers at an address: the next refresh's numbers where the page asks for today's, else a file. */
function answerAt(files: ReadonlyMap<string, Answer>, refreshes: Refreshes, address: string): Answer | undefined {
	if (address === TODAY) return { type: JSON_TYPE, body: JSON.stringify(refreshes.next()) };
	return files.get(address);
}

/** Where the server listens; a server on a pipe has no address a page is opened at. */
function addressOf(server: Server): string {
	const listening = server.address();
	if (listening === null || typeof listening === 'string') throw new Error('the app is not served on a port');
	return `http://${HOST}:${listening.port}/`;
}
