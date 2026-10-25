/**
 * A film's sounds laid under its MP4's picture: every sound its moves made, at the moment of the frame each was heard
 * on, and its music under them all; and the MP4 put in its place, written once, whole.
 *
 * The track is as long as the film: a silence that long comes first and sets the length (the mix ends with its first
 * input), each sound is laid over it from its moment, all are mixed as they are (never scaled down by their count),
 * and the music is cut there too, faded out over the film's last seconds. Each file is read once and split for every
 * moment it is heard at. The picture is copied, not encoded again. Measured on an 18.9 s film: 300 sounds laid in
 * 1.2 s, each on its frame's moment. A film with nothing heard and no music gets no track: its picture is put in the
 * video's place as it is. livereel's sounds are CC0 (`sounds/LICENSE.md`), quiet in their files; a film's are laid as
 * they are.
 */
import { statSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FilmError } from '../../domain/errors.ts';
import { MILLISECONDS_A_SECOND } from '../../domain/time.ts';
import type { FilmSound, LivereelSound, Music, Sound } from '../../direction/sound.ts';
import type { Track } from '../../studio/ports.ts';
import { ffmpeg } from './ffmpeg.ts';
import { KINDS, STARTS_AT_ONCE } from './kinds.ts';
import { partialOf } from './partial.ts';

/** A sound file heard at moments of the film, in seconds. */
interface HeardFile {
	readonly file: string;
	readonly moments: readonly number[];
}

/** Where each input stands in ffmpeg's list, which the arguments and the graph both read: the picture first. */
interface Layout {
	readonly firstSound: number;
	readonly silence: number;
	readonly music: number;
}

// livereel's sounds: as far from this module in the source as in the package built from it
const LIVEREEL_SOUNDS = new URL('../../../sounds/', import.meta.url);
const LIVEREEL_SUFFIX = '.ogg';
// Every sound in one shape before it is mixed, and the silence the track is laid on, in that shape
const CHANNELS = 'stereo';
const SAMPLE_RATE = 48_000;
const SHAPED = `aformat=channel_layouts=${CHANNELS}:sample_rates=${SAMPLE_RATE}`;
const SILENCE = `anullsrc=channel_layout=${CHANNELS}:sample_rate=${SAMPLE_RATE}`;
// The music fades out over the film's last seconds
const MUSIC_FADES_SECONDS = 1.5;
// The filters the track is made with — a sound split, delayed on every channel, mixed as it is until the first input
// ends, made louder or quieter, faded out — and how the graph sets them apart
const SPLIT = 'asplit';
const DELAY = 'adelay';
const ON_EVERY_CHANNEL = 'all=1';
const MIX = 'amix';
const AS_THEY_ARE_UNTIL_THE_FIRST_ENDS = 'normalize=0:duration=first';
const VOLUME = 'volume';
const FADE_OUT = 'afade=t=out';
const FILTERS_APART = ';';
// The track's stream in the graph, the music's, and the MP4 written: the picture copied, the track beside it
const TRACK = '[track]';
const MUSIC = '[music]';
const WRITTEN = [
	'-map',
	'0:v',
	'-map',
	TRACK,
	'-c:v',
	'copy',
	'-c:a',
	KINDS.mp4.sound,
	'-b:a',
	'192k',
	...STARTS_AT_ONCE
];
// The picture is the first input; the sounds come after it
const FIRST_SOUND = 1;

/** Where the sounds of a take that makes no video go: nowhere. */
export const SILENT: Track = { expect: () => undefined, hear: () => undefined };

export class Soundtrack implements Track {
	// The folder a film's paths are from: the film file's own
	readonly from: string;
	readonly sound: FilmSound;
	// Each file heard, and the moments it was heard at, in the order they came
	private readonly heard = new Map<string, number[]>();

	constructor(filmFile: string, sound: FilmSound) {
		this.from = dirname(resolve(filmFile));
		this.sound = sound;
	}

	/** Every file the film's moves and its music name, refused at once where it is not a file that is there. */
	expect(sounds: readonly Sound[]): void {
		const music = this.music();
		const files = [...sounds.flatMap((sound) => this.fileOf(sound) ?? []), ...(music === null ? [] : [music.file])];
		const missing = files.find((file) => statSync(file, { throwIfNoEntry: false })?.isFile() !== true);
		if (missing !== undefined) throw new FilmError(`the film names a sound that is not a file there: ${missing}`);
	}

	hear(moment: number, sound: Sound): void {
		const file = this.fileOf(sound);
		if (file === null) return;
		const moments = this.heard.get(file) ?? [];
		moments.push(moment);
		this.heard.set(file, moments);
	}

	/**
	 * The track laid under the picture, the MP4 written whole under a name of its own and then put in the video's
	 * place; a picture with nothing to lay under it is put there as it is. The picture is gone either way.
	 */
	async laidUnder(picture: string, video: string, seconds: number): Promise<void> {
		const heard = [...this.heard].map(([file, moments]) => ({ file, moments }));
		const music = this.music();
		if (heard.length === 0 && music === null) {
			await rename(picture, video);
			return;
		}
		const partial = partialOf(video);
		const graph = ['-filter_complex', graphOf(heard, music, seconds, layoutOf(heard))];
		try {
			await ffmpeg(...inputsOf(picture, heard, seconds, music), ...graph, ...WRITTEN, partial);
			await rename(partial, video);
		} finally {
			await rm(partial, { force: true });
			await rm(picture, { force: true });
		}
	}

	/** The film's music, its file found from the film's folder. */
	private music(): Music | null {
		const music = this.sound.music;
		return music === null ? null : { file: this.fromFilm(music.file), volume: music.volume };
	}

	/** The file a sound is laid from; none for one of livereel's the film has turned off. */
	private fileOf(sound: Sound): string | null {
		switch (sound.kind) {
			case 'file':
				return this.fromFilm(sound.path);
			case 'livereel':
				return this.livereelFile(sound.name);
		}
	}

	/** The file the film gives in place of one of livereel's sounds, or livereel's own file of it. */
	private livereelFile(name: LivereelSound): string | null {
		if (this.sound.livereels === null) return null;
		const given = this.sound.livereels[name];
		if (given !== undefined) return this.fromFilm(given);
		return fileURLToPath(new URL(`${name}${LIVEREEL_SUFFIX}`, LIVEREEL_SOUNDS));
	}

	private fromFilm(path: string): string {
		return resolve(this.from, path);
	}
}

/** Where each input stands: the picture, each sound file once, the silence, the music. */
function layoutOf(heard: readonly HeardFile[]): Layout {
	const silence = FIRST_SOUND + heard.length;
	return { firstSound: FIRST_SOUND, silence, music: silence + 1 };
}

/** ffmpeg's inputs in the layout's order: the picture, each sound file once, the silence as long as the film, music. */
function inputsOf(picture: string, heard: readonly HeardFile[], seconds: number, music: Music | null): string[] {
	const sounds = heard.flatMap((sound) => ['-i', sound.file]);
	const silence = ['-f', 'lavfi', '-t', String(seconds), '-i', SILENCE];
	return ['-i', picture, ...sounds, ...silence, ...(music === null ? [] : ['-i', music.file])];
}

/**
 * The graph: the silence first, every sound from its moment over it, the music under them, mixed into the track.
 * Filters are apart by `;`; a stream between them is named in brackets.
 */
function graphOf(heard: readonly HeardFile[], music: Music | null, seconds: number, layout: Layout): string {
	const branches = heard.map((sound, place) => branchesOf(sound, layout.firstSound + place));
	const musicBranch = music === null ? [] : [musicOf(music, layout.music, seconds)];
	const delayed = heard.flatMap((sound, place) => delayedOf(sound, layout.firstSound + place));
	const mixed = [inputSound(layout.silence), ...delayed, ...(music === null ? [] : [MUSIC])];
	const mix = `${mixed.join('')}${MIX}=inputs=${mixed.length}:${AS_THEY_ARE_UNTIL_THE_FIRST_ENDS}${TRACK}`;
	return [...branches, ...musicBranch, mix].join(FILTERS_APART);
}

/** One sound file split for each of its moments, each copy laid from its moment. */
function branchesOf(sound: HeardFile, input: number): string {
	const copies = sound.moments.map((_moment, copy) => copyOf(input, copy));
	const split = `${inputSound(input)}${SHAPED},${SPLIT}=${sound.moments.length}${copies.join('')}`;
	const delays = sound.moments.map(
		(moment, copy) => `${copyOf(input, copy)}${delayOf(moment)}${delayedCopyOf(input, copy)}`
	);
	return [split, ...delays].join(FILTERS_APART);
}

/** The streams of a sound's copies, each laid from its moment. */
function delayedOf(sound: HeardFile, input: number): string[] {
	return sound.moments.map((_moment, copy) => delayedCopyOf(input, copy));
}

/** The music at its volume, faded out over the film's last seconds. */
function musicOf(music: Music, input: number, seconds: number): string {
	const fadeStart = Math.max(0, seconds - MUSIC_FADES_SECONDS);
	const fade = `${FADE_OUT}:st=${fadeStart}:d=${MUSIC_FADES_SECONDS}`;
	return `${inputSound(input)}${SHAPED},${VOLUME}=${music.volume},${fade}${MUSIC}`;
}

function inputSound(input: number): string {
	return `[${input}:a]`;
}

function copyOf(input: number, copy: number): string {
	return `[sound${input}copy${copy}]`;
}

function delayedCopyOf(input: number, copy: number): string {
	return `[sound${input}delayed${copy}]`;
}

/** A delay from the film's start to a moment, on every channel. */
function delayOf(moment: number): string {
	return `${DELAY}=${Math.round(moment * MILLISECONDS_A_SECOND)}:${ON_EVERY_CHANNEL}`;
}
