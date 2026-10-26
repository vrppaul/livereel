// The files a film's sounds are laid from: the film's, found from its folder and refused before anything is shot, and
// livereel's keys, the strikes of the film's keyboard in turn
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { momentOf } from '../../src/domain/time.ts';
import { type LivereelSounds, type SoundSource, livereelSound } from '../../src/direction/sound.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';

// A film file in this folder: its sounds are found from here
const FILM = join(import.meta.dirname, 'film.ts');
// livereel's own sounds, from this test as from the package's root
const LIVEREEL_SOUNDS = fileURLToPath(new URL('../../sounds/', import.meta.url));
const OWN: SoundSource = { kind: 'livereel' };
const ON_THE_MEMBRANE: LivereelSounds = { click: OWN, key: { kind: 'keyboard', keyboard: 'membrane' }, ending: OWN };
const ON_THE_LAPTOP: LivereelSounds = { ...ON_THE_MEMBRANE, key: { kind: 'keyboard', keyboard: 'laptop' } };
// Five keys typed, a frame apart, on a keyboard of four strikes
const KEY_FRAMES = [0, 1, 2, 3, 4];

test("a file in place of livereel's click, and music, that are not there are refused by their path from the film", () => {
	const replaced = new Soundtrack(FILM, {
		livereels: { ...ON_THE_MEMBRANE, click: { kind: 'file', path: './nowhere.wav' } },
		music: null
	});
	const music = new Soundtrack(FILM, { livereels: ON_THE_MEMBRANE, music: { file: './nowhere.ogg', volume: 1 } });
	expect(() => replaced.expect([livereelSound('click')])).toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.wav')}`)
	);
	expect(() => music.expect([])).toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.ogg')}`)
	);
});

test("livereel's keys are laid from the strikes of the film's keyboard in turn, round again after the last", () => {
	const track = new Soundtrack(FILM, { livereels: ON_THE_LAPTOP, music: null });
	for (const frame of KEY_FRAMES) track.hear(momentOf(frame), livereelSound('key'));
	expect(track.heardFiles.map((heard) => [relative(LIVEREEL_SOUNDS, heard.file), heard.moments])).toEqual([
		['keys/laptop/1.ogg', [momentOf(0), momentOf(4)]],
		['keys/laptop/2.ogg', [momentOf(1)]],
		['keys/laptop/3.ogg', [momentOf(2)]],
		['keys/laptop/4.ogg', [momentOf(3)]]
	]);
});
