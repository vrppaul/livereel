// The files a film's sounds are laid from: the film's, found from its folder and refused before anything is shot, and
// livereel's keys, the strikes of the film's keyboard in turn; and how loud each is laid
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
// Five keys typed, a tenth of a second apart, on a keyboard of four strikes
const KEY_MOMENTS = [0, 0.1, 0.2, 0.3, 0.4];

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

test("livereel's sounds a film turns off are not laid, and the rest are", () => {
	const track = new Soundtrack(FILM, { livereels: { click: OFF, key: OFF, ending: OWN }, music: null });
	track.hear(0, livereelSound('click'));
	track.hear(1, livereelSound('key'));
	track.hear(2, livereelSound('ending'));
	expect(track.heardFiles.map((heard) => [relative(LIVEREEL_SOUNDS, heard.file), heard.moments])).toEqual([
		['ending.ogg', [2]]
	]);
});

test('a key struck on the keyboard a typing names is laid from its strikes in turn, though the film turned its keys off', () => {
	const track = new Soundtrack(FILM, { livereels: { click: OWN, key: OFF, ending: OWN }, music: null });
	for (const moment of KEY_MOMENTS) track.hear(moment, { kind: 'keyboard', keyboard: 'butterfly' });
	expect(track.heardFiles.map((heard) => [relative(LIVEREEL_SOUNDS, heard.file), heard.moments])).toEqual([
		['keys/butterfly/1.ogg', [0, 0.4]],
		['keys/butterfly/2.ogg', [0.1]],
		['keys/butterfly/3.ogg', [0.2]],
		['keys/butterfly/4.ogg', [0.3]]
	]);
});

test('every key is laid as loud as the film says its keys are, on its keyboard or on one a typing names, and its click as loud as its file', () => {
	const track = new Soundtrack(FILM, { livereels: { ...ON_THE_MEMBRANE, keyVolume: 4 }, music: null });
	track.hear(0, livereelSound('key'));
	track.hear(0.1, { kind: 'keyboard', keyboard: 'butterfly' });
	track.hear(0.2, livereelSound('click'));
	expect(track.heardFiles.map((heard) => [relative(LIVEREEL_SOUNDS, heard.file), heard.volume])).toEqual([
		['keys/membrane/1.ogg', 4],
		['keys/butterfly/1.ogg', 4],
		['click.ogg', 1]
	]);
});

test("a file of the film heard as its key and as a sound of its own is laid at each one's volume", () => {
	const key = { kind: 'file', path: './key.wav' } as const;
	const track = new Soundtrack(FILM, { livereels: { ...ON_THE_MEMBRANE, key, keyVolume: 4 }, music: null });
	track.hear(0, livereelSound('key'));
	track.hear(1, fileSound(key.path));
	track.hear(2, livereelSound('key'));
	expect(
		track.heardFiles.map((heard) => [relative(import.meta.dirname, heard.file), heard.volume, heard.moments])
	).toEqual([
		['key.wav', 4, [0, 2]],
		['key.wav', 1, [1]]
	]);
});

test("livereel's keys are laid from the strikes of the film's keyboard in turn, round again after the last", () => {
	const track = new Soundtrack(FILM, { livereels: ON_THE_LAPTOP, music: null });
	for (const moment of KEY_MOMENTS) track.hear(moment, livereelSound('key'));
	expect(track.heardFiles.map((heard) => [relative(LIVEREEL_SOUNDS, heard.file), heard.moments])).toEqual([
		['keys/laptop/1.ogg', [0, 0.4]],
		['keys/laptop/2.ogg', [0.1]],
		['keys/laptop/3.ogg', [0.2]],
		['keys/laptop/4.ogg', [0.3]]
	]);
});
