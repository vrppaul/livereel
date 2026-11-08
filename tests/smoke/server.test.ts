// A film's page served by its own command, as a project's server is run: in the film's folder until the page answers,
// and stopped with all it started once the take is done, waiting on nothing that left its group; refused where it
// ends first, where its page never answers in the time given, or where a page answers before it runs
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as paused } from 'node:timers/promises';
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { ANSWERED_WITHIN_MILLISECONDS, CommandServer } from '../../src/adapters/server.ts';

// The ports this file's servers listen on, apart from any other test file's
const SERVED = 'http://127.0.0.1:8751/';
const ENDING = 'http://127.0.0.1:8752/';
const TAKEN = 'http://127.0.0.1:8753/';
const LEFT_BEHIND = 'http://127.0.0.1:8754/';
const NEVER_ANSWERED = 'http://127.0.0.1:8755/';
// The page's server, run from this folder by a shell that stays to wait on it, so stopping the shell alone would
// leave the server answering
const SERVED_BEHIND_A_SHELL = 'node serving.ts 8751 & wait';
// A server with a process beside it that leaves the group, holding what the command says open for three seconds
const SERVED_BESIDE_A_STRAY = 'setsid sleep 3 & node serving.ts 8754';
// A server at a port other than where the film looks for its page
const SERVED_ELSEWHERE = 'node serving.ts 8756';
const SERVER = new CommandServer(import.meta.dirname, ANSWERED_WITHIN_MILLISECONDS);
// Given a third of a second to answer, and how long a stop may take before it is taken to wait on the stray
const IMPATIENT = new CommandServer(import.meta.dirname, 300);
const STOPPED_WITHIN_MILLISECONDS = 2000;
const STILL_WAITING = 'still waiting';

test("a film's serve command is run in the film's folder until its page answers, and stopped with all it started once the take is done", async () => {
	const served = await SERVER.serve({ address: SERVED, command: SERVED_BEHIND_A_SHELL });
	await expect(fetch(served.address)).resolves.toHaveProperty('status', 200);
	await served[Symbol.asyncDispose]();
	await expect(fetch(SERVED)).rejects.toThrow('fetch failed');
});

test('a serve command is stopped without waiting on a process that left its group', async () => {
	const served = await SERVER.serve({ address: LEFT_BEHIND, command: SERVED_BESIDE_A_STRAY });
	const stopped = await Promise.race([
		served[Symbol.asyncDispose](),
		paused(STOPPED_WITHIN_MILLISECONDS, STILL_WAITING)
	]);
	expect(stopped).toBeUndefined();
});

test('a serve command that ends before its page answers is refused with how it ended and what it said last', async () => {
	await expect(SERVER.serve({ address: ENDING, command: 'echo the port is taken >&2; exit 3' })).rejects.toThrow(
		new FilmError(
			"the film's serve command, `echo the port is taken >&2; exit 3`, ended with code 3 before http://127.0.0.1:8752/ answered; it said last:\nthe port is taken"
		)
	);
});

test('a serve command whose page does not answer in the time given is refused, and stopped', async () => {
	await expect(IMPATIENT.serve({ address: NEVER_ANSWERED, command: SERVED_ELSEWHERE })).rejects.toThrow(
		new FilmError(
			"the film's serve command, `node serving.ts 8756`, ran 0.3 s and http://127.0.0.1:8755/ never answered: is that where it serves the page?"
		)
	);
	await expect(fetch('http://127.0.0.1:8756/')).rejects.toThrow('fetch failed');
});

test('a page that answers at its address before the serve command runs is refused, as it would be filmed in its place', async () => {
	await using taken = createServer((_request, response) => response.end()).listen(8753, '127.0.0.1');
	await once(taken, 'listening');
	await expect(SERVER.serve({ address: TAKEN, command: SERVED_BEHIND_A_SHELL })).rejects.toThrow(
		new FilmError(
			"http://127.0.0.1:8753/ answers before the film's serve command has run: stop what serves it there, or leave serve out to film the page it answers with"
		)
	);
});
