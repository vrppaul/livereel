/**
 * Acme's analytics app served, as a film's serve command runs it (`ACME` in `acme.ts`): its page, its styles, and
 * today's numbers that its Refresh asks the server for. `node livereel-promo/server.ts PORT` serves it on the loopback
 * until it is stopped.
 *
 * The app is data, `app/`; what each refresh brings, `app/refreshed.json` read through `broughtBy`, so a second click
 * changes the page as the first did. The server answers these three addresses alone.
 */
import { readFile } from 'node:fs/promises';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { FIRST_REFRESH, type Refreshed, broughtBy } from './acme.ts';

/** What the server answers at an address: the kind of content, and the content. */
interface Answer {
	readonly type: string;
	readonly body: string;
}

const APP = new URL('./app/', import.meta.url);
const HOST = '127.0.0.1';
const ANSWERED = 200;
const NOT_HERE = 404;
// Where the page asks for today's numbers, and how they are written
const TODAY = '/api/today';
const JSON_TYPE = 'application/json';

/** Which refresh the server answers next, and what it brings. */
class Refreshes {
	private upcoming = FIRST_REFRESH;

	next(): Refreshed {
		return broughtBy(this.upcoming++);
	}
}

/** The app served on the loopback at a port, its refreshes counted from none. */
async function served(port: number): Promise<void> {
	const files = new Map<string, Answer>([
		['/', { type: 'text/html', body: await readFile(new URL('index.html', APP), 'utf8') }],
		['/app.css', { type: 'text/css', body: await readFile(new URL('app.css', APP), 'utf8') }]
	]);
	const refreshes = new Refreshes();
	createServer((request, response) => answer(files, refreshes, request, response)).listen(port, HOST);
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

const [, , portGiven] = process.argv;
await served(Number(portGiven));
