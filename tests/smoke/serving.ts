// A project's own server, as a film's serve command runs one: `node serving.ts PORT` answers every path with the
// smoke tests' page on the loopback, until it is stopped
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const PAGE = readFileSync(new URL('page.html', import.meta.url), 'utf8');
const [, , port] = process.argv;

createServer((_request, response) => response.writeHead(200, { 'Content-Type': 'text/html' }).end(PAGE)).listen(
	Number(port),
	'127.0.0.1'
);
