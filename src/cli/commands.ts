/**
 * The commands: shoot a film whole as a video, shoot a span of it as a clip or one still of it, to look at a few
 * moments without making the whole, shoot a film's set ahead of it, set a machine up to shoot. A film's set in a
 * format is kept beside its file, named as its videos are (`film-wide.set` beside `film.ts`), so its shoot finds it.
 *
 * Each takes its own options by name and refuses any other, and a wrong value, before anything is started; each says
 * what it made, and how long the making took, and with `--profile` where that time went (`src/adapters/profile.ts`). A
 * film is shot in one of its formats, named with `--format` where it has several, and every file made of it is named
 * after the film file and that format, so one format never writes over another. One take gives every kind of video
 * asked: the MP4 its frames go into, and those made from it. The MP4 is kept only when it is asked for too; otherwise
 * it has a name of its own, so it never takes the place of one made before.
 */
import { mkdir, rm } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve as absolute } from 'node:path';
import { parseArgs } from 'node:util';
import { UsageError } from '../domain/errors.ts';
import { MILLISECONDS_A_SECOND, secondsSaid, shotAt } from '../domain/time.ts';
import type { DrawnFilm, DrawnFilmInFormat } from '../direction/drawn-film.ts';
import type { Film, FilmInFormat } from '../direction/film.ts';
import { shootDrawn } from '../studio/draw.ts';
import type { DrawnBrowser, Footage, FramesHanded, Track } from '../studio/ports.ts';
import { shootSet } from '../studio/set.ts';
import { type Quality, type Shooting, type Shot, shoot } from '../studio/shoot.ts';
import { Chromium, RENDERERS, type Renderer } from '../adapters/browser/chromium.ts';
import { Profile } from '../adapters/profile.ts';
import { ANSWERED_WITHIN_MILLISECONDS, CommandServer } from '../adapters/server.ts';
import { SetFolderOnDisk } from '../adapters/set-folder.ts';
import { blended } from '../adapters/video/exposures.ts';
import { KINDS, KIND_NAMES, type Kind, type MadeKind, SHOT_INTO, isMade, madeFrom } from '../adapters/video/kinds.ts';
import { NOTHING_LAID, SILENT, type SoundLaying, Soundtrack } from '../adapters/video/soundtrack.ts';
import { StillFootage } from '../adapters/video/still.ts';
import { EVERY_SHOT, type ShotsKept, VideoFootage, contactSheet } from '../adapters/video/video.ts';
import { loadedFilm } from './film-file.ts';
import { encodersNeeded, ffmpegNeeded, setUp } from './setup.ts';

export interface Command {
	readonly summary: string;
	readonly usage: string;
	readonly run: (given: readonly string[]) => Promise<void>;
}

/**
 * What a command shoots with, as the command line names it: what serves the film's page, the browser frames are drawn
 * in, a film of steps's stage or a drawn film's page, and how finely.
 */
type ShotWith = Pick<Shooting, 'server' | 'browser' | 'quality'> & { readonly drawnBrowser: DrawnBrowser };

/** A film in the format a command shoots: of steps, or drawn by its own page. */
type AnyFilmInFormat = FilmInFormat | DrawnFilmInFormat;

/** What a command shoots a film with: its file, the browser and how finely, and the profile its time is told in. */
interface ShootingAsked {
	readonly file: string;
	readonly shotWith: ShotWith;
	readonly profile: Profile;
}

/** Where a video's sounds go as it is shot, and what its picture is finished with: a track laid under it, or none. */
interface VideoSound {
	readonly track: Track;
	readonly laying: SoundLaying;
}

// A clip of a span is silent: its sounds would stand at the film's moments, not the clip's
const SILENCE: VideoSound = { track: SILENT, laying: NOTHING_LAID };

// How finely a film is shot, by its name on the command line: a draft at the frame's own size, every frame exposed
// once; or sharp enough to zoom into and to angle without the text going soft, a fast move blurred as the film says
const QUALITY_NAMES = ['draft', 'finest'] as const;
type QualityName = (typeof QUALITY_NAMES)[number];
const QUALITIES: Readonly<Record<QualityName, Omit<Quality, 'framesHanded'>>> = {
	draft: { sharpness: 1, blurred: false },
	finest: { sharpness: 2, blurred: true }
};
// A video's frames are scaled to the frame's own size, by the stage where it can, else by ffmpeg; a still keeps its
// frame as sharp as it is drawn, to be looked at closely
const SCALED_FOR_A_VIDEO: FramesHanded = 'scaled';
const SHARP_FOR_A_STILL: FramesHanded = 'sharp';
// Every file a command writes is named from the same stem, the film file's name and its format's; a still after its
// moment, in seconds
const APART = '-';
const STILL_SUFFIX = 's.jpg';
// A clip after the moments it spans, in seconds; a film's set in a format beside the film's file
const SECONDS = 's';
const SET_SUFFIX = '.set';
const SHEET_SUFFIX = '-sheet.png';
// A contact sheet shows a frame a second where no rate is asked: the whole film at a glance
const A_FRAME_A_SECOND = 1;
// The moments a command is given, as the command line names them
const AT_SAID = '--at';
const FROM_SAID = '--from';
const TO_SAID = '--to';
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
const PROFILE_USAGE = '[--profile]';
const SHEET_USAGE = '[--sheet [--sheet-rate FRAMES_A_SECOND]]';
// What each option names, said where it is given a name it does not take
const KIND_SAYS = '--as names a kind of video';
const QUALITY_SAYS = '--quality names how finely a film is shot';
const RENDERER_SAYS = '--renderer names where a frame is drawn';

const SHOOT: Command = {
	summary: 'Shoot a film whole, as a video of each kind asked: an MP4 where none is.',
	usage:
		`livereel shoot FILM_FILE --out DIRECTORY [--format NAME] ` +
		`[--as ${KIND_NAMES.join(ONE_OF)}]... ${QUALITY_USAGE} ${SHEET_USAGE} ${RENDERER_USAGE} ${PROFILE_USAGE}`,
	run: shootCommand
};

const CLIP: Command = {
	summary: 'Shoot a span of a film as a silent MP4, to look at a few moments in motion without making the whole.',
	usage:
		`livereel clip FILM_FILE --out DIRECTORY --from SECONDS --to SECONDS [--format NAME] ` +
		`${QUALITY_USAGE} ${SHEET_USAGE} ${RENDERER_USAGE} ${PROFILE_USAGE}`,
	run: clipCommand
};

const STILL: Command = {
	summary: 'Shoot one still of a film, without making the video.',
	usage:
		`livereel still FILM_FILE --out DIRECTORY --at SECONDS [--format NAME] ` +
		`${QUALITY_USAGE} ${RENDERER_USAGE} ${PROFILE_USAGE}`,
	run: stillCommand
};

const SET: Command = {
	summary:
		"Shoot a film's set: its scenario run once on the app, each state it marks pictured beside the film file, the " +
		'film then shot from them with no app served.',
	usage: `livereel set FILM_FILE [--format NAME] ${RENDERER_USAGE}`,
	run: setCommand
};

const SETUP: Command = {
	summary: 'Install the browser films are shot in, and look for ffmpeg.',
	usage: 'livereel setup',
	run: setupCommand
};

export const COMMANDS: ReadonlyMap<string, Command> = new Map([
	['shoot', SHOOT],
	['clip', CLIP],
	['still', STILL],
	['set', SET],
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
				'sheet-rate': VALUE,
				renderer: RENDERER_ASKED,
				profile: FLAG
			},
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, SHOOT);
	const out = theOut(values.out, SHOOT);
	const kinds = kindsAsked(values.as);
	const sheetRate = sheetRateAsked(values.sheet, values['sheet-rate'], SHOOT);
	const profile = new Profile(() => performance.now(), values.profile);
	const shotWith = shotWithAsked(values, file, SHOOT, profile, SCALED_FOR_A_VIDEO);
	await ffmpegNeeded();
	await encodersNeeded(kinds);
	const film = formatAsked(await loadedFilm(file), values.format, SHOOT);
	await mkdir(out, { recursive: true });
	const stem = stemOf(out, file, film);
	const kept = kinds.includes(SHOT_INTO);
	const mp4 = kept ? `${stem}${KINDS.mp4.suffix}` : `${stem}${SOURCE}${KINDS.mp4.suffix}`;
	try {
		const shot = await shotInto(mp4, film, { file, shotWith, profile }, EVERY_SHOT, soundOf(film, file));
		profile.said().forEach(say);
		if (kept) say(mp4);
		for (const kind of kinds.filter(isMade)) await madeAs(kind, mp4, stem, film);
		if (sheetRate !== undefined) await sheetMade(mp4, stem, shot.seconds, sheetRate);
	} finally {
		if (!kept) await rm(mp4, { force: true });
	}
}

async function clipCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(CLIP, () =>
		parseArgs({
			args: [...given],
			options: {
				out: VALUE,
				format: VALUE,
				from: VALUE,
				to: VALUE,
				quality: QUALITY_ASKED,
				sheet: FLAG,
				'sheet-rate': VALUE,
				renderer: RENDERER_ASKED,
				profile: FLAG
			},
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, CLIP);
	const out = theOut(values.out, CLIP);
	const from = momentAsked(values.from, FROM_SAID, CLIP);
	const to = momentAsked(values.to, TO_SAID, CLIP);
	const sheetRate = sheetRateAsked(values.sheet, values['sheet-rate'], CLIP);
	const profile = new Profile(() => performance.now(), values.profile);
	const shotWith = shotWithAsked(values, file, CLIP, profile, SCALED_FOR_A_VIDEO);
	await ffmpegNeeded();
	const film = formatAsked(await loadedFilm(file), values.format, CLIP);
	const kept = shotsBetween(from, to, film.framesPerSecond);
	await mkdir(out, { recursive: true });
	const stem = `${stemOf(out, file, film)}${APART}${String(from)}${APART}${String(to)}${SECONDS}`;
	const clip = `${stem}${KINDS.mp4.suffix}`;
	const shot = await shotInto(clip, film, { file, shotWith, profile }, kept, SILENCE);
	say(clip);
	profile.said().forEach(say);
	if (sheetRate !== undefined) await sheetMade(clip, stem, shot.seconds, sheetRate);
}

async function stillCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(STILL, () =>
		parseArgs({
			args: [...given],
			options: {
				out: VALUE,
				format: VALUE,
				quality: QUALITY_ASKED,
				at: VALUE,
				renderer: RENDERER_ASKED,
				profile: FLAG
			},
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, STILL);
	const out = theOut(values.out, STILL);
	const moment = momentAsked(values.at, AT_SAID, STILL);
	const profile = new Profile(() => performance.now(), values.profile);
	const shotWith = shotWithAsked(values, file, STILL, profile, SHARP_FOR_A_STILL);
	await ffmpegNeeded();
	const film = formatAsked(await loadedFilm(file), values.format, STILL);
	await mkdir(out, { recursive: true });
	const still = `${stemOf(out, file, film)}${APART}${String(moment)}${STILL_SUFFIX}`;
	await rm(still, { force: true });
	const started = performance.now();
	const footage = profile.footage(new StillFootage(still, moment, film.framesPerSecond, profile.blend(blended)));
	await profile.shooting(() => filmedInto(film, { file, shotWith, profile }, footage, SILENT));
	say(`${still}: shot in ${secondsBetween(started, performance.now())} s`);
	profile.said().forEach(say);
}

async function setCommand(given: readonly string[]): Promise<void> {
	const { values, positionals } = asUsage(SET, () =>
		parseArgs({
			args: [...given],
			options: { format: VALUE, renderer: RENDERER_ASKED },
			allowPositionals: true
		})
	);
	const file = theFilmFile(positionals, SET);
	const renderer = nameAsked(values.renderer, RENDERERS, RENDERER_SAYS, SET);
	const film = withASet(formatAsked(await loadedFilm(file), values.format, SET));
	const folder = setFolderOf(file, film);
	const started = performance.now();
	const states = await shootSet(film, {
		server: new CommandServer(dirname(absolute(file)), ANSWERED_WITHIN_MILLISECONDS),
		browser: new Chromium(renderer, warn, dirname(absolute(file))),
		folder: new SetFolderOnDisk(folder)
	});
	say(`${folder}: ${String(states)} states, shot in ${secondsBetween(started, performance.now())} s`);
}

async function setupCommand(given: readonly string[]): Promise<void> {
	asUsage(SETUP, () => parseArgs({ args: [...given], options: {} }));
	await setUp();
	say('the browser is installed and ffmpeg is on the path');
}

/**
 * The frames of a film it keeps shot into an MP4, the whole film or a span of it, the sounds heard laid under it or
 * none, and the take said: the film and its format, the video's frames and length, and the time it took.
 */
async function shotInto(
	mp4: string,
	film: AnyFilmInFormat,
	shooting: ShootingAsked,
	kept: ShotsKept,
	sound: VideoSound
): Promise<Shot> {
	const { file, profile } = shooting;
	const started = performance.now();
	const blend = profile.blend(blended);
	await using footage = new VideoFootage(mp4, film.format.frame, film.framesPerSecond, kept, blend);
	await profile.shooting(() => filmedInto(film, shooting, profile.footage(footage), sound.track));
	const filmed = performance.now();
	await profile.finishing(() => footage.finish(sound.laying));
	say(
		`${nameOf(file)} in ${film.formatName}: ${footage.frames} frames, ${secondsSaid(footage.seconds)} s; ` +
			`shot in ${secondsBetween(started, filmed)} s, the video made ` +
			`${secondsBetween(filmed, performance.now())} s after the last frame`
	);
	return { frames: footage.frames, seconds: footage.seconds };
}

/**
 * A film shot into footage, its sounds heard by the track: a film of steps by its take on the stage, its set read
 * from beside its file where it names one; one its own page draws by that page alone, which makes no sound.
 */
function filmedInto(film: AnyFilmInFormat, asked: ShootingAsked, footage: Footage, track: Track): Promise<Shot> {
	const { shotWith } = asked;
	switch (film.kind) {
		case 'steps':
			return shoot(film, {
				server: shotWith.server,
				set: new SetFolderOnDisk(setFolderOf(asked.file, film)),
				browser: shotWith.browser,
				quality: shotWith.quality,
				footage,
				track
			});
		case 'drawn':
			return shootDrawn(film, { server: shotWith.server, browser: shotWith.drawnBrowser, footage });
	}
}

/** Where a film's sounds go as its video is shot, and what its picture is finished with: a drawn film makes none. */
function soundOf(film: AnyFilmInFormat, file: string): VideoSound {
	switch (film.kind) {
		case 'steps': {
			const soundtrack = new Soundtrack(file, film.sound);
			return { track: soundtrack, laying: soundtrack };
		}
		case 'drawn':
			return SILENCE;
	}
}

async function madeAs(kind: MadeKind, mp4: string, stem: string, film: AnyFilmInFormat): Promise<void> {
	const video = `${stem}${KINDS[kind].suffix}`;
	const started = performance.now();
	await madeFrom(mp4, kind, video, film.framesPerSecond);
	say(`${video}: made in ${secondsBetween(started, performance.now())} s`);
}

async function sheetMade(mp4: string, stem: string, seconds: number, sheetRate: number): Promise<void> {
	const sheet = `${stem}${SHEET_SUFFIX}`;
	await contactSheet(mp4, sheet, seconds, sheetRate);
	say(sheet);
}

/**
 * The frames from one moment of a film to just before another, at the film's rate; a span of no frame between them
 * is refused.
 */
function shotsBetween(from: number, to: number, framesPerSecond: number): ShotsKept {
	const first = shotAt(from, framesPerSecond);
	const after = shotAt(to, framesPerSecond);
	if (after <= first) throw new UsageError(`${TO_SAID} stands at least a frame after ${FROM_SAID}\n${CLIP.usage}`);
	return { first, last: after - 1 };
}

/**
 * How many frames a second the contact sheet asked shows, a frame a second where its rate is not named; none where no
 * sheet is asked, and a rate named without one is refused.
 */
function sheetRateAsked(sheet: boolean, asked: string | undefined, command: Command): number | undefined {
	if (!sheet) {
		if (asked !== undefined) throw new UsageError(`--sheet-rate is the rate of a --sheet\n${command.usage}`);
		return undefined;
	}
	if (asked === undefined) return A_FRAME_A_SECOND;
	const rate = Number(asked);
	if (asked.trim() === '' || !Number.isFinite(rate) || rate <= 0) {
		throw new UsageError(`--sheet-rate is how many frames a second the sheet shows, more than 0\n${command.usage}`);
	}
	return rate;
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
function formatAsked(film: Film | DrawnFilm, asked: string | undefined, command: Command): AnyFilmInFormat {
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
function stemOf(out: string, file: string, film: AnyFilmInFormat): string {
	return join(out, `${nameOf(file)}${APART}${film.formatName}`);
}

/** A film of steps, which may name a set to shoot; one its own page draws is refused, as it has none. */
function withASet(film: AnyFilmInFormat): FilmInFormat {
	switch (film.kind) {
		case 'steps':
			return film;
		case 'drawn':
			throw new UsageError(`a film its own page draws has no set\n${SET.usage}`);
	}
}

/** Where a film's set in a format is kept: beside the film's file, named as its videos are, so a shoot finds it. */
function setFolderOf(file: string, film: FilmInFormat): string {
	return `${stemOf(dirname(file), file, film)}${SET_SUFFIX}`;
}

function momentAsked(asked: string | undefined, option: string, command: Command): number {
	const moment = Number(asked);
	if (asked === undefined || asked.trim() === '' || !Number.isFinite(moment) || moment < 0) {
		throw new UsageError(`${option} is a moment of the film, in seconds from 0\n${command.usage}`);
	}
	return moment;
}

function nameOf(file: string): string {
	return basename(file, extname(file));
}

/**
 * What a command shoots a film file with: the film's serve command run in the file's folder, as a project's command
 * runs in its own; and how finely the film is shot and the browser its frames are drawn in, as the command line names
 * them, timed; its frames handed as the command's footage keeps them.
 */
function shotWithAsked(
	asked: { quality: string; renderer: string },
	file: string,
	command: Command,
	profile: Profile,
	framesHanded: FramesHanded
): ShotWith {
	const quality = nameAsked(asked.quality, QUALITY_NAMES, QUALITY_SAYS, command);
	const renderer = nameAsked(asked.renderer, RENDERERS, RENDERER_SAYS, command);
	const filmFolder = dirname(absolute(file));
	const chromium = new Chromium(renderer, warn, filmFolder);
	return {
		server: new CommandServer(filmFolder, ANSWERED_WITHIN_MILLISECONDS),
		quality: { ...QUALITIES[quality], framesHanded },
		browser: profile.browser(chromium),
		drawnBrowser: profile.drawnBrowser(chromium)
	};
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
