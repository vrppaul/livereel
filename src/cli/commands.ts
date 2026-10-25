/**
 * The commands: shoot a film whole as a video, shoot one still of it, set a machine up to shoot.
 *
 * Each takes its own options by name and refuses any other, and a wrong value, before anything is started; each
 * says what it made, and how long the making took.
 */
import { mkdir, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { UsageError } from '../domain/errors.ts';
import { secondsSaid } from '../domain/time.ts';
import { shoot } from '../studio/shoot.ts';
import { Chromium } from '../adapters/browser/chromium.ts';
import { StillFootage } from '../adapters/video/still.ts';
import { VideoFootage, contactSheet } from '../adapters/video/video.ts';
import { loadedFilm } from './film-file.ts';
import { ffmpegNeeded, setUp } from './setup.ts';

export interface Command {
	readonly summary: string;
	readonly usage: string;
	readonly run: (given: readonly string[]) => Promise<void>;
}

// Sharp enough to zoom into and to angle without the text going soft; a draft is shot at the frame's own size
const SHARPNESS = 2;
const DRAFT_SHARPNESS = 1;
const VIDEO = '.mp4';
const STILL = '.jpg';
const SHEET = '-sheet.png';
const MILLISECONDS = 1000;
const OUT = { type: 'string' } as const;
const FLAG = { type: 'boolean', default: false } as const;

const SHOOT: Command = {
	summary: 'Shoot a film whole, as a video.',
	usage: 'livereel shoot FILM_FILE --out DIRECTORY [--draft] [--sheet]',
	run: shootCommand
};

const STILL_COMMAND: Command = {
	summary: 'Shoot one still of a film, without making the video.',
	usage: 'livereel still FILM_FILE --out DIRECTORY --at SECONDS [--draft]',
	run: stillCommand
};

const SETUP: Command = {
	summary: 'Install the browser films are shot in, and look for ffmpeg.',
	usage: 'livereel setup',
	run: setupCommand
};

export const COMMANDS: ReadonlyMap<string, Command> = new Map([
	['shoot', SHOOT],
	['still', STILL_COMMAND],
	['setup', SETUP]
]);

/** A line the command says. */
export function say(line: string): void {
	process.stdout.write(`${line}\n`);
}

async function shootCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(SHOOT, () =>
		parseArgs({ args: [...given], options: { out: OUT, draft: FLAG, sheet: FLAG }, allowPositionals: true })
	);
	const file = theFilmFile(positionals, SHOOT);
	const out = theOut(values.out, SHOOT);
	await ffmpegNeeded();
	const film = await loadedFilm(file);
	await mkdir(out, { recursive: true });
	const video = join(out, `${nameOf(file)}${VIDEO}`);
	const started = performance.now();
	await using footage = new VideoFootage(video, film.format.frame);
	const shot = await shoot(film, { browser: new Chromium(), footage, sharpness: sharpnessOf(values.draft) });
	const filmed = performance.now();
	await footage.finish();
	const finished = performance.now();
	say(
		`${video}: ${shot.frames} frames, ${secondsSaid(shot.seconds)} s; shot in ${secondsBetween(started, filmed)} s, ` +
			`the video done ${secondsBetween(filmed, finished)} s after the last frame`
	);
	if (!values.sheet) return;
	const sheet = join(out, `${nameOf(file)}${SHEET}`);
	await contactSheet(video, sheet, shot.seconds);
	say(sheet);
}

async function stillCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(STILL_COMMAND, () =>
		parseArgs({ args: [...given], options: { out: OUT, draft: FLAG, at: OUT }, allowPositionals: true })
	);
	const file = theFilmFile(positionals, STILL_COMMAND);
	const out = theOut(values.out, STILL_COMMAND);
	const moment = momentAsked(values.at);
	const film = await loadedFilm(file);
	await mkdir(out, { recursive: true });
	const still = join(out, `${nameOf(file)}-${String(moment)}s${STILL}`);
	await rm(still, { force: true });
	const started = performance.now();
	const footage = new StillFootage(still, moment);
	await shoot(film, { browser: new Chromium(), footage, sharpness: sharpnessOf(values.draft) });
	say(`${still}: shot in ${secondsBetween(started, performance.now())} s`);
}

async function setupCommand(given: readonly string[]): Promise<void> {
	asUsage(SETUP, () => parseArgs({ args: [...given], options: {} }));
	await setUp();
	say('the browser is installed and ffmpeg is on the path');
}

/** What the command line was parsed into; what parseArgs refuses — an unknown option — said as a usage error. */
function asUsage<Parsed>(command: Command, parse: () => Parsed): Parsed {
	try {
		return parse();
	} catch (fault) {
		if (fault instanceof TypeError) throw new UsageError(`${fault.message}\n${command.usage}`, { cause: fault });
		throw fault;
	}
}

function theFilmFile(positionals: readonly string[], command: Command): string {
	const [file, ...more] = positionals;
	if (file === undefined || more.length > 0) throw new UsageError(`one film file is given\n${command.usage}`);
	return file;
}

function theOut(out: string | undefined, command: Command): string {
	if (out === undefined) throw new UsageError(`--out names where to write\n${command.usage}`);
	return out;
}

function momentAsked(at: string | undefined): number {
	const moment = Number(at);
	if (at === undefined || at.trim() === '' || !Number.isFinite(moment) || moment < 0) {
		throw new UsageError(`--at is the moment of the still, in seconds from 0\n${STILL_COMMAND.usage}`);
	}
	return moment;
}

function nameOf(file: string): string {
	return basename(file, extname(file));
}

function sharpnessOf(draft: boolean): number {
	return draft ? DRAFT_SHARPNESS : SHARPNESS;
}

function secondsBetween(start: number, end: number): string {
	return secondsSaid((end - start) / MILLISECONDS);
}
