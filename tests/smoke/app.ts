// An app with a server of its own, for the films the smoke tests shoot of one: what it answers at each path, a
// WebSocket it pushes one message down, served for as long as a take lasts; and footage that keeps no frame, as such
// a film is shot for what reaches the page
import { createHash } from 'node:crypto';
import { type Server, createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { Duplex } from 'node:stream';
import type { Footage } from '../../src/studio/ports.ts';
import type { Serving } from 'livereel';

/** What the app answers at each of its paths. */
export type Routes = Readonly<Record<string, (request: IncomingMessage, response: ServerResponse) => void>>;

/** What the app pushes down the WebSocket its page opens. */
export const PUSHED = 'pushed';
// The WebSocket handshake's fixed key, and the first byte of a whole text message, its length next (under 126)
const WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const TEXT_MESSAGE = 0x81;

export class AppServed implements Serving {
	readonly server: Server;
	readonly address: string;

	constructor(server: Server, path: string) {
		this.server = server;
		this.address = `http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`;
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.server.closeAllConnections();
		this.server.close();
		await once(this.server, 'close');
	}
}

/** The app served on this machine, the film's address at one of its paths. */
export async function servedApp(routes: Routes, path: string): Promise<AppServed> {
	const server = createServer((request, response) => routes[String(request.url)]!(request, response))
		.on('upgrade', pushOnce)
		.listen(0, '127.0.0.1');
	await once(server, 'listening');
	return new AppServed(server, path);
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

/** Footage that keeps no frame: the film is shot for what reaches the page. */
export class NoFrames implements Footage {
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
