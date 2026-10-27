/**
 * The commands: shoot a film whole as a video, shoot one still of it, set a machine up to shoot.
 *
 * Each takes its own options by name and refuses any other, and a wrong value, before anything is started; each
 * says what it made, and how long the making took. A film is shot in one of its formats, named with `--format`
 * where it has several, and every file made of it is named after the film file and that format, so one format never
 * writes over another. One take gives every kind of video asked: the MP4 its frames go into, and those made from it.
 * The MP4 is kept only when it is asked for too; otherwise it has a name of its own, so it never takes the place of
 * one made before.
 */
import { mkdir, rm } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import { UsageError } from '../domain/errors.ts';
import { MILLISECONDS_A_SECOND, secondsSaid } from '../domain/time.ts';
import type { Film, FilmInFormat } from '../direction/film.ts';
import { type Quality, type Shooting, type Shot, shoot } from '../studio/shoot.ts';
import { Chromium, RENDERERS, type Renderer } from '../adapters/browser/chromium.ts';
import { KINDS, KIND_NAMES, type Kind, type MadeKind, SHOT_INTO, isMade, madeFrom } from '../adapters/video/kinds.ts';
import { SILENT, Soundtrack } from '../adapters/video/soundtrack.ts';
import { StillFootage } from '../adapters/video/still.ts';
import { VideoFootage, contactSheet } from '../adapters/video/video.ts';
import { loadedFilm } from './film-file.ts';
import { encodersNeeded, ffmpegNeeded, setUp } from './setup.ts';

export interface Command {
	readonly summary: string;
	readonly usage: string;
	readonly run: (given: readonly string[]) => Promise<void>;
}

/** What a command shoots with, as the command line names it: the browser frames are drawn in, and how finely. */
type ShotWith = Pick<Shooting, 'browser' | 'quality'>;

// How finely a film is shot, by its name on the command line: a draft at the frame's own size, every frame exposed
// once; or sharp enough to zoom into and to angle without the text going soft, a fast camera blurred as the film says
const QUALITY_NAMES = ['draft', 'finest'] as const;
type QualityName = (typeof QUALITY_NAMES)[number];
const QUALITIES: Readonly<Record<QualityName, Quality>> = {
	draft: { sharpness: 1, blurred: false },
	finest: { sharpness: 2, blurred: true }
};
// Every file a command writes is named from the same stem, the film file's name and its format's; a still after its
// moment, in seconds
const APART = '-';
const STILL_SUFFIX = 's.jpg';
const SHEET_SUFFIX = '-sheet.png';
// The MP4 the other kinds are made from, where it is not asked for itself
const SOURCE = '.source';
// An option that takes a value, one that is given or not, and the kinds of video asked, an MP4 where none is
const VALUE = { type: 'string' } as const;
const FLAG = { type: 'boolean', default: false } as const;
const KINDS_ASKED: { type: 'string'; multiple: true; default: string[] } = {
	type: 'string',
	multiple: true,
	default: [SHOT_INTO]
};
// How the usage line offers one value of several, and how a refusal lists the names to choose from
const ONE_OF = '|';
const LISTED = ', ';
// What the command line asks where it names nothing: the finest quality, as a film is meant to be seen; and a frame
// drawn in software, which asks nothing of the machine's card
const FINEST: QualityName = 'finest';
const IN_SOFTWARE: Renderer = 'software';
const QUALITY_ASKED = { type: 'string', default: FINEST } as const;
const RENDERER_ASKED = { type: 'string', default: IN_SOFTWARE } as const;
const QUALITY_USAGE = `[--quality ${QUALITY_NAMES.join(ONE_OF)}]`;
const RENDERER_USAGE = `[--renderer ${RENDERERS.join(ONE_OF)}]`;
// What each option names, said where it is given a name it does not take
const KIND_SAYS = '--as names a kind of video';
const QUALITY_SAYS = '--quality names how finely a film is shot';
const RENDERER_SAYS = '--renderer names where a frame is drawn';

const SHOOT: Command = {
	summary: 'Shoot a film whole, as a video of each kind asked: an MP4 where none is.',
	usage:
		`livereel shoot FILM_FILE --out DIRECTORY [--format NAME] ` +
		`[--as ${KIND_NAMES.join(ONE_OF)}]... ${QUALITY_USAGE} [--sheet] ${RENDERER_USAGE}`,
	run: shootCommand
};

const STILL: Command = {
	summary: 'Shoot one still of a film, without making the video.',
	usage: `livereel still FILM_FILE --out DIRECTORY --at SECONDS [--format NAME] ${QUALITY_USAGE} ${RENDERER_USAGE}`,
	run: stillCommand
};

const SETUP: Command = {
	summary: 'Install the browser films are shot in, and look for ffmpeg.',
	usage: 'livereel setup',
	run: setupCommand
};

export const COMMANDS: ReadonlyMap<string, Command> = new Map([
	['shoot', SHOOT],
	['still', STILL],
	['setup', SETUP]
]);

/** A line the command says. */
export function say(line: string): void {
	process.stdout.write(`${line}\n`);
}

/** A line the command warns of as it goes on: on stderr, apart from what it made. */
function warn(line: string): void {
	process.stderr.write(`livereel: ${line}\n`);
}

async function shootCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(SHOOT, () =>
		parseArgs({
			args: [...given],
			options: {
				out: VALUE,
				format: VALUE,
				as: KINDS_ASKED,
				quality: QUALITY_ASKED,
				sheet: FLAG,
				renderer: RENDERER_ASKED
			},
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, SHOOT);
	const out = theOut(values.out, SHOOT);
	const kinds = kindsAsked(values.as);
	const shotWith = shotWithAsked(values, SHOOT);
	await ffmpegNeeded();
	await encodersNeeded(kinds);
	const film = formatAsked(await loadedFilm(file), values.format, SHOOT);
	await mkdir(out, { recursive: true });
	const stem = stemOf(out, file, film);
	const kept = kinds.includes(SHOT_INTO);
	const mp4 = kept ? `${stem}${KINDS.mp4.suffix}` : `${stem}${SOURCE}${KINDS.mp4.suffix}`;
	try {
		const shot = await shotInto(mp4, file, film, shotWith);
		if (kept) say(mp4);
		for (const kind of kinds.filter(isMade)) await madeAs(kind, mp4, stem);
		if (values.sheet) await sheetMade(mp4, stem, shot);
	} finally {
		if (!kept) await rm(mp4, { force: true });
	}
}

async function stillCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(STILL, () =>
		parseArgs({
			args: [...given],
			options: { out: VALUE, format: VALUE, quality: QUALITY_ASKED, at: VALUE, renderer: RENDERER_ASKED },
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, STILL);
	const out = theOut(values.out, STILL);
	const moment = momentAsked(values.at);
	const shotWith = shotWithAsked(values, STILL);
	await ffmpegNeeded();
	const film = formatAsked(await loadedFilm(file), values.format, STILL);
	await mkdir(out, { recursive: true });
	const still = `${stemOf(out, file, film)}${APART}${String(moment)}${STILL_SUFFIX}`;
	await rm(still, { force: true });
	const started = performance.now();
	const footage = new StillFootage(still, moment);
	await shoot(film, { ...shotWith, footage, track: SILENT });
	say(`${still}: shot in ${secondsBetween(started, performance.now())} s`);
}

async function setupCommand(given: readonly string[]): Promise<void> {
	asUsage(SETUP, () => parseArgs({ args: [...given], options: {} }));
	await setUp();
	say('the browser is installed and ffmpeg is on the path');
}

/**
 * The film shot whole into its MP4, its sounds laid under it, and the take said: the film and its format, its frames,
 * and the time it took.
 */
async function shotInto(mp4: string, file: string, film: FilmInFormat, shotWith: ShotWith): Promise<Shot> {
	const started = performance.now();
	await using footage = new VideoFootage(mp4, film.format.frame);
	const track = new Soundtrack(file, film.sound);
	const shot = await shoot(film, { ...shotWith, footage, track });
	const filmed = performance.now();
	await footage.finish(track, shot.seconds);
	say(
		`${nameOf(file)} in ${film.formatName}: ${shot.frames} frames, ${secondsSaid(shot.seconds)} s; ` +
			`shot in ${secondsBetween(started, filmed)} s, the video made ` +
			`${secondsBetween(filmed, performance.now())} s after the last frame`
	);
	return shot;
}

async function madeAs(kind: MadeKind, mp4: string, stem: string): Promise<void> {
	const video = `${stem}${KINDS[kind].suffix}`;
	const started = performance.now();
	await madeFrom(mp4, kind, video);
	say(`${video}: made in ${secondsBetween(started, performance.now())} s`);
}

async function sheetMade(mp4: string, stem: string, shot: Shot): Promise<void> {
	const sheet = `${stem}${SHEET_SUFFIX}`;
	await contactSheet(mp4, sheet, shot.seconds);
	say(sheet);
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

/** The kinds of video asked, each once; one livereel does not make is refused, naming those it does. */
function kindsAsked(asked: readonly string[]): readonly Kind[] {
	return [...new Set(asked.map((name) => nameAsked(name, KIND_NAMES, KIND_SAYS, SHOOT)))];
}

/** The film in the format named, or in its one format where none is named; each refusal names the formats it has. */
function formatAsked(film: Film, asked: string | undefined, command: Command): FilmInFormat {
	const choices = `--format names one of ${[...film.formats.keys()].join(LISTED)}\n${command.usage}`;
	if (asked === undefined) {
		const [only, ...more] = film.formats.values();
		if (only === undefined || more.length > 0) throw new UsageError(`the film has several formats: ${choices}`);
		return only;
	}
	const inFormat = film.formats.get(asked);
	if (inFormat === undefined) throw new UsageError(`the film has no format ${asked}: ${choices}`);
	return inFormat;
}

/** What every file made of a film in a format is named from: the film file's name and the format's, in `out`. */
function stemOf(out: string, file: string, film: FilmInFormat): string {
	return join(out, `${nameOf(file)}${APART}${film.formatName}`);
}

function momentAsked(at: string | undefined): number {
	const moment = Number(at);
	if (at === undefined || at.trim() === '' || !Number.isFinite(moment) || moment < 0) {
		throw new UsageError(`--at is the moment of the still, in seconds from 0\n${STILL.usage}`);
	}
	return moment;
}

function nameOf(file: string): string {
	return basename(file, extname(file));
}

/** How finely a film is shot and the browser its frames are drawn in, as the command line names them. */
function shotWithAsked(asked: { quality: string; renderer: string }, command: Command): ShotWith {
	const quality = nameAsked(asked.quality, QUALITY_NAMES, QUALITY_SAYS, command);
	const renderer = nameAsked(asked.renderer, RENDERERS, RENDERER_SAYS, command);
	return { quality: QUALITIES[quality], browser: new Chromium(renderer, warn) };
}

/** The one of an option's names the command line gave it; any other is refused, naming them all. */
function nameAsked<Name extends string>(asked: string, names: readonly Name[], says: string, command: Command): Name {
	const named = names.find((name) => name === asked);
	if (named === undefined) throw new UsageError(`${says}, ${names.join(LISTED)}: not ${asked}\n${command.usage}`);
	return named;
}

function secondsBetween(start: number, end: number): string {
	return secondsSaid((end - start) / MILLISECONDS_A_SECOND);
}
