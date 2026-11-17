/**
 * A film's sounds laid under its MP4's picture: every sound its moves made, at the moment of the frame each was heard
 * on, and its music under them all; and the MP4 put in its place, written once, whole.
 *
 * The track is as long as the film: a silence that long comes first and sets the length (the mix ends with its first
 * input), each sound is laid over it from its moment, all are mixed as they are (never scaled down by their count), and
 * the music is cut there too, faded out over the film's last seconds. Each sound, a file laid as loud and as high one
 * way, is read once and split for every moment it is heard at. The picture is copied, not encoded again. A film with
 * nothing heard and no music gets no track: its picture is put in the video's place as it is. livereel's sounds are CC0
 * (`sounds/LICENSE.md`), quiet in their files: its keys peak about 12 dB under its click, so a film under music says
 * how loud its keys are, and no key is laid at a higher volume; a film's other files are laid as they are. A key on a
 * keyboard is one of its strikes, each recorded alone, struck as a hand strikes it (`src/domain/striking.ts`): by
 * chance, never the strike before it, on one of a few steps of loudness and of pitch, so a typed line is no loop and a
 * film's keys are a few dozen sounds, however many it types.
 */
import { statSync } from 'node:fs';
import { rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FilmError } from '../../domain/errors.ts';
import { Striking } from '../../domain/striking.ts';
import { MILLISECONDS_A_SECOND } from '../../domain/time.ts';
import {
	AS_LOUD_AS_ITS_FILE,
	type FileOrOff,
	type FilmSound,
	type KeySource,
	type KeyboardSound,
	type LivereelSound,
	type LivereelSounds,
	type Music,
	type Sound,
	type SoundSource
} from '../../direction/sound.ts';
import type { Track } from '../../studio/ports.ts';
import { ffmpeg } from './ffmpeg.ts';
import { KINDS, STARTS_AT_ONCE } from './kinds.ts';
import { partialOf } from './partial.ts';

/** A sound as it is laid: its file, how loud and how high, each 1 as the file is. */
interface LaidSound {
	readonly file: string;
	readonly volume: number;
	readonly pitch: number;
}

/** A sound laid one way, heard at moments of the film, in seconds. */
interface HeardSound extends LaidSound {
	readonly moments: readonly number[];
}

/** A sound laid one way, the moments it was heard at so gathered as the take goes. */
interface Hearings extends HeardSound {
	readonly moments: number[];
}

/**
 * What a sound is laid from: a keyboard's strikes, one file, or nothing, for one of livereel's a film has turned off.
 */
type LaidFrom =
	| { readonly kind: 'strikes'; readonly keyboard: KeyboardSound }
	| { readonly kind: 'file'; readonly file: string }
	| { readonly kind: 'nothing' };

/** Where each input stands in ffmpeg's list, which the arguments and the graph both read: the picture first. */
interface Layout {
	readonly firstSound: number;
	readonly silence: number;
	readonly music: number;
}

// livereel's sounds: as far from this module in the source as in the package built from it
const LIVEREEL_SOUNDS = new URL('../../../sounds/', import.meta.url);
const LIVEREEL_SUFFIX = '.ogg';
const OWN_CLICK = `click${LIVEREEL_SUFFIX}`;
const OWN_ENDING = `ending${LIVEREEL_SUFFIX}`;
// How many strikes each keyboard has, its keys recorded alone, in a folder of its own and numbered from one
const STRIKES_A_KEYBOARD = 4;
const FIRST_STRIKE = 1;
// A file laid as high as it was recorded
const AS_HIGH_AS_ITS_FILE = 1;
const NOTHING: LaidFrom = { kind: 'nothing' };
// A file read as ffmpeg will read it to lay it: its first sound's first frame decoded, and nothing written
const FIRST_SOUND_DECODED = ['-map', '0:a:0', '-frames:a', '1', '-f', 'null', '-'];
// Every sound in one shape before it is mixed, and the silence the track is laid on, in that shape
const CHANNELS = 'stereo';
const SAMPLE_RATE = 48_000;
const SHAPED = `aformat=channel_layouts=${CHANNELS}:sample_rates=${SAMPLE_RATE}`;
const SILENCE = `anullsrc=channel_layout=${CHANNELS}:sample_rate=${SAMPLE_RATE}`;
// The music fades out over the film's last seconds
const MUSIC_FADES_SECONDS = 1.5;
// The filters the track is made with — a sound split, made louder or quieter, played faster and so higher at the
// track's own rate again, delayed on every channel, mixed as it is until the first input ends, faded out — and how the
// graph sets them apart
const SPLIT = 'asplit';
const PLAYED_AT_A_RATE = 'asetrate';
const AT_THE_TRACKS_RATE = `aresample=${SAMPLE_RATE}`;
const DELAY = 'adelay';
const ON_EVERY_CHANNEL = 'all=1';
const MIX = 'amix';
const AS_THEY_ARE_UNTIL_THE_FIRST_ENDS = 'normalize=0:duration=first';
const VOLUME = 'volume';
const FADE_OUT = 'afade=t=out';
const FILTERS_APART = ';';
// The track's stream in the graph, the music's, and the MP4 written: the picture copied, the track beside it at a rate
// at which AAC keeps a click's edge
const TRACK = '[track]';
const MUSIC = '[music]';
const SOUND_BITRATE = '192k';
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
	SOUND_BITRATE,
	...STARTS_AT_ONCE
];
// The picture is the first input; the sounds come after it
const FIRST_SOUND = 1;

/** Where the sounds of a take that makes no video, or a silent one, go: nowhere. */
export const SILENT: Track = { expect: () => Promise.resolve(), hear: () => undefined };

/** What a video's picture is finished with: a track laid under it, or nothing. */
export interface SoundLaying {
	readonly laidUnder: (picture: string, video: string, seconds: number) => Promise<void>;
}

/** A silent video's picture put in the video's place as it is: a clip of a span, whose sounds would stand elsewhere. */
export const NOTHING_LAID: SoundLaying = { laidUnder: (picture, video) => rename(picture, video) };

export class Soundtrack implements Track, SoundLaying {
	// The folder a film's paths are from: the film file's own
	readonly from: string;
	readonly sound: FilmSound;
	// What each of livereel's sounds is laid from, found once for the take, and how loud each is laid
	private readonly livereelsLaidFrom: Readonly<Record<LivereelSound, LaidFrom>>;
	private readonly livereelVolumes: Readonly<Record<LivereelSound, number>>;
	// The hand every key on a keyboard is struck by, from the film's first key to its last
	private readonly striking = new Striking();
	// Each sound heard, a file laid one way, and the moments it was heard at so, in the order the sounds first came: a
	// key struck alike twice is one sound, however far apart
	private readonly heard: Hearings[] = [];

	constructor(filmFile: string, sound: FilmSound) {
		this.from = dirname(resolve(filmFile));
		this.sound = sound;
		this.livereelsLaidFrom = livereelsLaidFrom(sound.livereels, this.from);
		this.livereelVolumes = livereelVolumesOf(sound.livereels);
	}

	/**
	 * Every file the film's moves and its music name, refused at once where it is not a file that is there, or one ffmpeg
	 * reads no sound from: each read in turn, so the first refused is the first named.
	 */
	async expect(sounds: readonly Sound[]): Promise<void> {
		const music = this.music();
		const laidFrom = sounds.flatMap((sound) => filesOf(this.laidFrom(sound)));
		const named = new Set([...laidFrom, ...(music === null ? [] : [music.file])]);
		const files = [...named];
		const missing = files.find((file) => statSync(file, { throwIfNoEntry: false })?.isFile() !== true);
		if (missing !== undefined) throw new FilmError(`the film names a sound that is not a file there: ${missing}`);
		for (const file of files) await readAsASound(file);
	}

	/**
	 * A sound heard at a moment: from its file, as loud as the film says it is and as high as the file; or, a key on a
	 * keyboard, from the strike the hand lands on, no louder than the film says its keys are.
	 */
	hear(moment: number, sound: Sound): void {
		const laidFrom = this.laidFrom(sound);
		const volume = this.volumeOf(sound);
		switch (laidFrom.kind) {
			case 'nothing':
				return;
			case 'file':
				this.lay(moment, { file: laidFrom.file, volume, pitch: AS_HIGH_AS_ITS_FILE });
				return;
			case 'strikes': {
				const strike = this.striking.next(STRIKES_A_KEYBOARD);
				const file = strikeOf(laidFrom.keyboard, strike.place);
				this.lay(moment, { file, volume: volume * strike.loudness, pitch: strike.pitch });
			}
		}
	}

	/** Each sound heard, laid one way, and the moments it was heard at so, in the order the sounds first came. */
	get heardSounds(): readonly HeardSound[] {
		return this.heard;
	}

	/**
	 * The track laid under the picture, the MP4 written whole under a name of its own and then put in the video's place;
	 * a picture with nothing to lay under it is put there as it is. The picture is gone either way.
	 */
	async laidUnder(picture: string, video: string, seconds: number): Promise<void> {
		const heard = this.heardSounds;
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
		return music === null ? null : { file: resolve(this.from, music.file), volume: music.volume };
	}

	/** One more moment a sound is heard at, kept with the others of that file laid as loud and as high. */
	private lay(moment: number, laid: LaidSound): void {
		const hearings = this.heard.find(
			(heard) => heard.file === laid.file && heard.volume === laid.volume && heard.pitch === laid.pitch
		);
		if (hearings === undefined) this.heard.push({ ...laid, moments: [moment] });
		else hearings.moments.push(moment);
	}

	/**
	 * How loud a sound is laid: one of livereel's as loud as the film says it is, a key a typing strikes on a keyboard of
	 * its own as the film's keys; a file of the film's as loud as it is.
	 */
	private volumeOf(sound: Sound): number {
		switch (sound.kind) {
			case 'file':
				return AS_LOUD_AS_ITS_FILE;
			case 'livereel':
				return this.livereelVolumes[sound.name];
			case 'keyboard':
				return this.livereelVolumes.key;
		}
	}

	/** What a sound is laid from: a file of the film's, what the film has for one of livereel's, a keyboard's strikes. */
	private laidFrom(sound: Sound): LaidFrom {
		switch (sound.kind) {
			case 'file':
				return { kind: 'file', file: resolve(this.from, sound.path) };
			case 'livereel':
				return this.livereelsLaidFrom[sound.name];
			case 'keyboard':
				return { kind: 'strikes', keyboard: sound.keyboard };
		}
	}
}

/** A file read as a sound, refused where ffmpeg reads none from it: it holds none, or none ffmpeg can decode. */
async function readAsASound(file: string): Promise<void> {
	try {
		await ffmpeg('-i', file, ...FIRST_SOUND_DECODED);
	} catch (fault) {
		throw new FilmError(`the film names a file ffmpeg reads no sound from: ${file}`, { cause: fault });
	}
}

/** What each of livereel's sounds is laid from, a film's own file found from its folder. */
function livereelsLaidFrom(livereels: LivereelSounds, from: string): Readonly<Record<LivereelSound, LaidFrom>> {
	return {
		click: sourceLaidFrom(livereels.click, OWN_CLICK, from),
		key: keyLaidFrom(livereels.key, from),
		ending: sourceLaidFrom(livereels.ending, OWN_ENDING, from)
	};
}

/** How loud each of livereel's sounds is laid: its keys as the film says, the click and the ending as their files. */
function livereelVolumesOf(livereels: LivereelSounds): Readonly<Record<LivereelSound, number>> {
	return { click: AS_LOUD_AS_ITS_FILE, key: livereels.keyVolume, ending: AS_LOUD_AS_ITS_FILE };
}

/** What the click or the ending is laid from: livereel's own file, or what the film put in its place. */
function sourceLaidFrom(source: SoundSource, own: string, from: string): LaidFrom {
	switch (source.kind) {
		case 'livereel':
			return { kind: 'file', file: livereelsOwn(own) };
		case 'file':
		case 'off':
			return laidInPlace(source, from);
	}
}

/** What the film's keys are laid from: the strikes of its keyboard, or what the film put in their place. */
function keyLaidFrom(key: KeySource, from: string): LaidFrom {
	switch (key.kind) {
		case 'keyboard':
			return { kind: 'strikes', keyboard: key.keyboard };
		case 'file':
		case 'off':
			return laidInPlace(key, from);
	}
}

/** What the film put in place of one of livereel's sounds: its file, found from the film's folder, or nothing. */
function laidInPlace(inPlace: FileOrOff, from: string): LaidFrom {
	switch (inPlace.kind) {
		case 'file':
			return { kind: 'file', file: resolve(from, inPlace.path) };
		case 'off':
			return NOTHING;
	}
}

/** Every file a sound may be laid from: a keyboard's every strike, the one file, or none. */
function filesOf(laidFrom: LaidFrom): readonly string[] {
	switch (laidFrom.kind) {
		case 'strikes':
			return Array.from({ length: STRIKES_A_KEYBOARD }, (_strike, place) => strikeOf(laidFrom.keyboard, place));
		case 'file':
			return [laidFrom.file];
		case 'nothing':
			return [];
	}
}

/** A keyboard's strike by its place among them, from 0: a file in the keyboard's own folder of livereel's sounds. */
function strikeOf(keyboard: KeyboardSound, place: number): string {
	return livereelsOwn(`keys/${keyboard}/${FIRST_STRIKE + place}${LIVEREEL_SUFFIX}`);
}

function livereelsOwn(file: string): string {
	return fileURLToPath(new URL(file, LIVEREEL_SOUNDS));
}

/** Where each input stands: the picture, each sound heard, once, the silence, the music. */
function layoutOf(heard: readonly HeardSound[]): Layout {
	const silence = FIRST_SOUND + heard.length;
	return { firstSound: FIRST_SOUND, silence, music: silence + 1 };
}

/**
 * ffmpeg's inputs in the layout's order: the picture, each sound heard, once, the silence as long as the film, music.
 */
function inputsOf(picture: string, heard: readonly HeardSound[], seconds: number, music: Music | null): string[] {
	const sounds = heard.flatMap((sound) => ['-i', sound.file]);
	const silence = ['-f', 'lavfi', '-t', String(seconds), '-i', SILENCE];
	return ['-i', picture, ...sounds, ...silence, ...(music === null ? [] : ['-i', music.file])];
}

/**
 * The graph: the silence first, every sound from its moment over it, the music under them, mixed into the track.
 * Filters are apart by `;`; a stream between them is named in brackets.
 */
function graphOf(heard: readonly HeardSound[], music: Music | null, seconds: number, layout: Layout): string {
	const branches = heard.map((sound, place) => branchesOf(sound, layout.firstSound + place));
	const musicBranch = music === null ? [] : [musicOf(music, layout.music, seconds)];
	const delayed = heard.flatMap((sound, place) => delayedOf(sound, layout.firstSound + place));
	const mixed = [inputSound(layout.silence), ...delayed, ...(music === null ? [] : [MUSIC])];
	const mix = `${mixed.join('')}${MIX}=inputs=${mixed.length}:${AS_THEY_ARE_UNTIL_THE_FIRST_ENDS}${TRACK}`;
	return [...branches, ...musicBranch, mix].join(FILTERS_APART);
}

/**
 * One sound, as loud and as high as it is laid, split for each of its moments, each copy laid from its moment. A volume
 * and a pitch of 1 leave every sample as it is.
 */
function branchesOf(sound: HeardSound, input: number): string {
	const copies = sound.moments.map((_moment, copy) => copyOf(input, copy));
	const laid = `${inputSound(input)}${SHAPED},${VOLUME}=${sound.volume},${asHighAs(sound.pitch)}`;
	const split = `${laid},${SPLIT}=${sound.moments.length}${copies.join('')}`;
	const delays = sound.moments.map(
		(moment, copy) => `${copyOf(input, copy)}${delayOf(moment)}${delayedCopyOf(input, copy)}`
	);
	return [split, ...delays].join(FILTERS_APART);
}

/**
 * A sound made so many times as high: played that much faster, its samples then read at the track's rate again, so
 * every sound in the mix is at one rate, and one laid higher is a little shorter too.
 */
function asHighAs(pitch: number): string {
	return `${PLAYED_AT_A_RATE}=${Math.round(SAMPLE_RATE * pitch)},${AT_THE_TRACKS_RATE}`;
}

/** The streams of a sound's copies, each laid from its moment. */
function delayedOf(sound: HeardSound, input: number): string[] {
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

/**
 * A copy of a sound as the graph names it, by its input and its place among the copies: `s` the sound, `c` the copy.
 * The names are short on purpose: the whole graph is one argument to ffmpeg, which the system holds to 128 KiB, and
 * each moment a sound is heard at writes a copy's name twice and its delayed copy's twice.
 */
function copyOf(input: number, copy: number): string {
	return `[s${input}c${copy}]`;
}

/** A copy of a sound laid from its moment, as the graph names it: `d` the delayed copy. */
function delayedCopyOf(input: number, copy: number): string {
	return `[s${input}d${copy}]`;
}

/** A delay from the film's start to a moment, on every channel. */
function delayOf(moment: number): string {
	return `${DELAY}=${Math.round(moment * MILLISECONDS_A_SECOND)}:${ON_EVERY_CHANNEL}`;
}
