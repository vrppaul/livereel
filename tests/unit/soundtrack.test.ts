// The files a film's sounds are laid from: the film's, found from its folder and refused before anything is shot, and
// livereel's keys, the strikes of the film's keyboard as a hand strikes them; and how loud and how high each is laid
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { type LivereelSounds, type SoundSource, fileSound, livereelSound } from '../../src/direction/sound.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';

// A film file in this folder: its sounds are found from here
const FILM = join(import.meta.dirname, 'film.ts');
// livereel's own sounds, from this test as from the package's root
const LIVEREEL_SOUNDS = fileURLToPath(new URL('../../sounds/', import.meta.url));
const OWN: SoundSource = { kind: 'livereel' };
const OFF = { kind: 'off' } as const;
const ON_THE_MEMBRANE: LivereelSounds = {
	click: OWN,
	key: { kind: 'keyboard', keyboard: 'membrane' },
	ending: OWN,
	keyVolume: 1
};
const ON_THE_LAPTOP: LivereelSounds = { ...ON_THE_MEMBRANE, key: { kind: 'keyboard', keyboard: 'laptop' } };
// Forty keys typed, a tenth of a second apart, on a keyboard of four strikes
const KEY_MOMENTS = Array.from({ length: 40 }, (_key, place) => place / 10);
// The strikes of a keyboard, as its files are named in its folder
const STRIKE_FILES = ['1.ogg', '2.ogg', '3.ogg', '4.ogg'];
// How loud a film says its keys are, the share of that the quietest key is laid at, and a moment after the last key
const KEY_VOLUME = 4;
const QUIETEST_KEY = 0.7;
const AFTER_THE_KEYS = 9;
// A long film's keys, and the most sounds they may be laid as: each of four strikes at one of five loudnesses and
// seven pitches
const MANY_KEY_MOMENTS = Array.from({ length: 2000 }, (_key, place) => place / 10);
const SOUNDS_OF_A_KEYBOARD_AT_MOST = 4 * 5 * 7;

/** One hearing of a file, as a test reads it: the file by its path from a folder, and how it is laid at its moment. */
interface Heard {
	readonly file: string;
	readonly moment: number;
	readonly volume: number;
	readonly pitch: number;
}

/** Every hearing a track holds, in the order of their moments, each file by its path from a folder. */
function hearingsOf(track: Soundtrack, from: string): readonly Heard[] {
	return track.heardSounds
		.flatMap((heard) =>
			heard.moments.map((moment) => ({
				file: relative(from, heard.file),
				moment,
				volume: heard.volume,
				pitch: heard.pitch
			}))
		)
		.sort((earlier, later) => earlier.moment - later.moment);
}

test("a file in place of livereel's click, and music, that are not there are refused by their path from the film", async () => {
	const replaced = new Soundtrack(FILM, {
		livereels: { ...ON_THE_MEMBRANE, click: { kind: 'file', path: './nowhere.wav' } },
		music: null
	});
	const music = new Soundtrack(FILM, { livereels: ON_THE_MEMBRANE, music: { file: './nowhere.ogg', volume: 1 } });
	await expect(replaced.expect([livereelSound('click')])).rejects.toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.wav')}`)
	);
	await expect(music.expect([])).rejects.toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.ogg')}`)
	);
});

test("livereel's sounds a film turns off are not laid, and the rest are, as their files are", () => {
	const track = new Soundtrack(FILM, { livereels: { click: OFF, key: OFF, ending: OWN }, music: null });
	track.hear(0, livereelSound('click'));
	track.hear(1, livereelSound('key'));
	track.hear(2, livereelSound('ending'));
	expect(hearingsOf(track, LIVEREEL_SOUNDS)).toEqual([{ file: 'ending.ogg', moment: 2, volume: 1, pitch: 1 }]);
});

test("livereel's keys are laid from the strikes of the film's keyboard, every key at its moment and none the strike before it", () => {
	const track = new Soundtrack(FILM, { livereels: ON_THE_LAPTOP, music: null });
	for (const moment of KEY_MOMENTS) track.hear(moment, livereelSound('key'));
	const hearings = hearingsOf(track, join(LIVEREEL_SOUNDS, 'keys', 'laptop'));
	const files = hearings.map((heard) => heard.file);
	expect(hearings.map((heard) => heard.moment)).toEqual(KEY_MOMENTS);
	expect([...new Set(files)].sort()).toEqual(STRIKE_FILES);
	expect(files.slice(1).map((file, before) => file === files[before])).not.toContain(true);
});

test('a key struck on the keyboard a typing names is laid from its strikes, no louder than the film says its keys are, though the film turned its keys off', () => {
	const track = new Soundtrack(FILM, {
		livereels: { click: OWN, key: OFF, ending: OWN, keyVolume: KEY_VOLUME },
		music: null
	});
	for (const moment of KEY_MOMENTS) track.hear(moment, { kind: 'keyboard', keyboard: 'butterfly' });
	const hearings = hearingsOf(track, join(LIVEREEL_SOUNDS, 'keys', 'butterfly'));
	const volumes = hearings.map((heard) => heard.volume);
	expect(hearings.map((heard) => heard.moment)).toEqual(KEY_MOMENTS);
	expect([...new Set(hearings.map((heard) => heard.file))].sort()).toEqual(STRIKE_FILES);
	expect(Math.max(...volumes)).toBeLessThanOrEqual(KEY_VOLUME);
	expect(Math.min(...volumes)).toBeGreaterThanOrEqual(KEY_VOLUME * QUIETEST_KEY);
});

test("a keyboard's keys are laid no louder than the film says its keys are, not all as loud nor as high, and its click as its file", () => {
	const track = new Soundtrack(FILM, { livereels: { ...ON_THE_MEMBRANE, keyVolume: KEY_VOLUME }, music: null });
	for (const moment of KEY_MOMENTS) track.hear(moment, livereelSound('key'));
	track.hear(AFTER_THE_KEYS, livereelSound('click'));
	const hearings = hearingsOf(track, LIVEREEL_SOUNDS);
	const keys = hearings.slice(0, KEY_MOMENTS.length);
	const volumes = keys.map((heard) => heard.volume);
	expect(Math.max(...volumes)).toBeLessThanOrEqual(KEY_VOLUME);
	expect(Math.min(...volumes)).toBeGreaterThanOrEqual(KEY_VOLUME * QUIETEST_KEY);
	expect(new Set(volumes).size).toBeGreaterThan(1);
	expect(new Set(keys.map((heard) => heard.pitch)).size).toBeGreaterThan(1);
	expect(hearings.at(-1)).toEqual({ file: 'click.ogg', moment: AFTER_THE_KEYS, volume: 1, pitch: 1 });
});

test('however many keys a film types on a keyboard, they are laid as a few dozen sounds, a key struck alike twice being one', () => {
	const track = new Soundtrack(FILM, { livereels: ON_THE_MEMBRANE, music: null });
	for (const moment of MANY_KEY_MOMENTS) track.hear(moment, livereelSound('key'));
	const moments = track.heardSounds.flatMap((heard) => heard.moments);
	expect(track.heardSounds.length).toBeLessThanOrEqual(SOUNDS_OF_A_KEYBOARD_AT_MOST);
	expect(moments.length).toBe(MANY_KEY_MOMENTS.length);
});

test("a file of the film heard as its key and as a sound of its own is laid at each one's volume, as high as the file", () => {
	const key = { kind: 'file', path: './key.wav' } as const;
	const track = new Soundtrack(FILM, { livereels: { ...ON_THE_MEMBRANE, key, keyVolume: KEY_VOLUME }, music: null });
	track.hear(0, livereelSound('key'));
	track.hear(1, fileSound(key.path));
	track.hear(2, livereelSound('key'));
	expect(
		track.heardSounds.map((heard) => [
			relative(import.meta.dirname, heard.file),
			heard.volume,
			heard.pitch,
			heard.moments
		])
	).toEqual([
		['key.wav', KEY_VOLUME, 1, [0, 2]],
		['key.wav', 1, 1, [1]]
	]);
});
