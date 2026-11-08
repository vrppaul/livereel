/**
 * A film's page served for a take, as Playwright's `webServer` serves a test's: the film's command run by a shell in
 * the film's folder, its address asked until it answers or the time given runs out, and the command stopped once the
 * take ends.
 *
 * The address is asked first, before the command runs: a page answering there already would be filmed in place of the
 * command's, so it is refused. The command runs as a process group of its own, so stopping it stops whatever it
 * started too (`npx vite` is a shell, npm and Node), as Playwright stops it. A group of its own hears no Ctrl-C from
 * the terminal, so livereel stops it as it exits, and on Ctrl-C or a request to end exits as a process ended so would,
 * the group stopped on the way. On Windows, untried as the rest of livereel there, the command shares livereel's
 * console and so its Ctrl-C, and its tree is ended by taskkill, as Playwright ends it.
 */
import { type ChildProcessByStdio, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { constants } from 'node:os';
import type { Readable } from 'node:stream';
import { setTimeout as paused } from 'node:timers/promises';
import { FilmError } from '../domain/errors.ts';
import { MILLISECONDS_A_SECOND, secondsSaid } from '../domain/time.ts';
import type { Site } from '../direction/site.ts';
import type { PageServer, ServedPage } from '../studio/ports.ts';

/** How long a command is given before its page answers, as Playwright gives a test's server: a minute. */
export const ANSWERED_WITHIN_MILLISECONDS = 60_000;
// The page answers once its address is answered with a page, a redirect or a refusal: from 200 to 403, as Playwright
// counts a page answered; 404 and above say a server runs there but serves the page not yet. Where Playwright follows
// a redirect to its end, livereel takes the redirect itself as the server's answer
const ANSWERED_FROM = 200;
const ANSWERED_BELOW = 404;
// How long livereel waits before asking the address again: a tenth of a second first, twice as long each time after,
// a second at most
const FIRST_PAUSE_MILLISECONDS = 100;
const PAUSE_GROWS_BY = 2;
const PAUSE_AT_MOST_MILLISECONDS = 1000;
// How much of what the command said last is kept, said with why it failed
const SAID_KEPT_CHARACTERS = 2000;
// The signals livereel is asked to end by, and the exit code of a process ended by one: 128 and its number
const ENDING_SIGNALS: readonly NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const ENDED_BY_A_SIGNAL = 128;
const ON_WINDOWS = process.platform === 'win32';
const STOPPED_AT_ONCE = 'SIGKILL';
const NO_SUCH_PROCESS = 'ESRCH';

/** A command's process: nothing piped in, what it says piped out. */
type CommandProcess = ChildProcessByStdio<null, Readable, Readable>;

/**
 * The film's page served by its command, run in the film's folder, given so many milliseconds to answer; a page
 * someone else serves, left as it is.
 */
export class CommandServer implements PageServer {
	readonly folder: string;
	readonly answeredWithin: number;

	constructor(folder: string, answeredWithin: number) {
		this.folder = folder;
		this.answeredWithin = answeredWithin;
	}

	async serve(site: Site): Promise<ServedPage> {
		if (site.command === undefined) return new ServedElsewhere(site.address);
		if (await answers(site.address, AbortSignal.timeout(this.answeredWithin))) {
			throw new FilmError(
				`${site.address} answers before the film's serve command has run: stop what serves it there, ` +
					'or leave serve out to film the page it answers with'
			);
		}
		const running = commandStarted(site.command, this.folder, site.address);
		try {
			await running.answering(this.answeredWithin);
			return running;
		} catch (fault) {
			await running[Symbol.asyncDispose]();
			throw fault;
		}
	}
}

/** A page someone else serves, at its address: nothing was started, so nothing is stopped. */
class ServedElsewhere implements ServedPage {
	readonly address: string;

	constructor(address: string) {
		this.address = address;
	}

	[Symbol.asyncDispose](): Promise<void> {
		return Promise.resolve();
	}
}

/** A film's command run by a shell in the film's folder, as the leader of a process group of its own. */
function commandStarted(command: string, folder: string, address: string): RunningCommand {
	// The command reads nothing; what it says is kept
	const child = spawn(command, { shell: true, cwd: folder, detached: !ON_WINDOWS, stdio: ['ignore', 'pipe', 'pipe'] });
	return new RunningCommand(command, address, child);
}

/**
 * A film's command running, to serve its page at an address, stopped as livereel exits; what it said last, kept.
 */
class RunningCommand implements ServedPage {
	readonly address: string;
	private readonly command: string;
	private readonly child: CommandProcess;
	// How the command ended, in words, once it has
	private readonly ending: Promise<string>;
	private said = '';
	private readonly stopAtExit = (): void => this.stopAtOnce();
	private readonly exitAsEnded = (signal: NodeJS.Signals): never =>
		process.exit(ENDED_BY_A_SIGNAL + constants.signals[signal]);

	constructor(command: string, address: string, child: CommandProcess) {
		this.command = command;
		this.address = address;
		this.child = child;
		for (const said of [child.stdout, child.stderr]) {
			said.setEncoding('utf8');
			said.on('data', (chunk: string) => this.heard(chunk));
		}
		this.ending = endingOf(child);
		process.on('exit', this.stopAtExit);
		for (const signal of ENDING_SIGNALS) process.on(signal, this.exitAsEnded);
	}

	/**
	 * Settled once the address answers; refused where the command ends first, or the address has not answered within so
	 * many milliseconds.
	 */
	async answering(within: number): Promise<void> {
		const givenUp = AbortSignal.timeout(within);
		for (let asked = 0; !givenUp.aborted; asked += 1) {
			if (await answers(this.address, givenUp)) return;
			const pause = Math.min(FIRST_PAUSE_MILLISECONDS * PAUSE_GROWS_BY ** asked, PAUSE_AT_MOST_MILLISECONDS);
			const ending = await Promise.race([this.ending, paused(pause, undefined)]);
			if (ending !== undefined) {
				throw new FilmError(
					`the film's serve command, \`${this.command}\`, ${ending} before ${this.address} answered${this.saidLast()}`
				);
			}
		}
		throw new FilmError(
			`the film's serve command, \`${this.command}\`, ran ${secondsSaid(within / MILLISECONDS_A_SECOND)} s and ` +
				`${this.address} never answered: is that where it serves the page?${this.saidLast()}`
		);
	}

	/**
	 * The command and all it started stopped, and waited for. What it says is let go first, so a process that left its
	 * group, still holding what it says open, keeps nothing waiting.
	 */
	async [Symbol.asyncDispose](): Promise<void> {
		this.stopAtOnce();
		this.child.stdout.destroy();
		this.child.stderr.destroy();
		await this.ending;
		process.off('exit', this.stopAtExit);
		for (const signal of ENDING_SIGNALS) process.off(signal, this.exitAsEnded);
	}

	/**
	 * The command's group stopped at once, as livereel may be exiting and waits on nothing; a group already gone, left.
	 * The whole group, even where the shell has ended, as what it started may still run.
	 */
	private stopAtOnce(): void {
		if (this.child.pid === undefined) return;
		if (ON_WINDOWS) {
			spawnSync('taskkill', ['/pid', String(this.child.pid), '/T', '/F']);
			return;
		}
		try {
			process.kill(-this.child.pid, STOPPED_AT_ONCE);
		} catch (fault) {
			if (!(fault instanceof Error && 'code' in fault && fault.code === NO_SUCH_PROCESS)) throw fault;
		}
	}

	private heard(chunk: string): void {
		this.said = `${this.said}${chunk}`.slice(-SAID_KEPT_CHARACTERS);
	}

	private saidLast(): string {
		return this.said === '' ? '' : `; it said last:\n${this.said.trimEnd()}`;
	}
}

/**
 * Whether a page answers at an address before a signal gives up asking. Any failure to reach it — nothing listening,
 * a connection that says nothing until then — is its not answering yet.
 */
async function answers(address: string, givenUp: AbortSignal): Promise<boolean> {
	try {
		const answer = await fetch(address, { redirect: 'manual', signal: givenUp });
		await answer.body?.cancel();
		return answer.status >= ANSWERED_FROM && answer.status < ANSWERED_BELOW;
	} catch {
		return false;
	}
}

/** How a command ended, in words: by its exit code, by a signal, or never started. */
async function endingOf(child: CommandProcess): Promise<string> {
	try {
		const [code, signal] = (await once(child, 'close')) as [number | null, NodeJS.Signals | null];
		return signal === null ? `ended with code ${String(code)}` : `was ended by ${signal}`;
	} catch (fault) {
		return `could not be started: ${fault instanceof Error ? fault.message : String(fault)}`;
	}
}
