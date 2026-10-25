// The files a film gives for its sounds, found from the film's folder and refused before anything is shot
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { FilmError } from '../../src/domain/errors.ts';
import { livereelSound } from '../../src/direction/sound.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';

// A film file in this folder: its sounds are found from here
const FILM = join(import.meta.dirname, 'film.ts');

test("a file in place of livereel's click, and music, that are not there are refused by their path from the film", () => {
	const replaced = new Soundtrack(FILM, { livereels: { click: './nowhere.wav' }, music: null });
	const music = new Soundtrack(FILM, { livereels: {}, music: { file: './nowhere.ogg', volume: 1 } });
	expect(() => replaced.expect([livereelSound('click')])).toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.wav')}`)
	);
	expect(() => music.expect([])).toThrow(
		new FilmError(`the film names a sound that is not a file there: ${join(import.meta.dirname, 'nowhere.ogg')}`)
	);
});
