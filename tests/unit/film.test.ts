// A film in its formats: each by its name, and the steps told which one they are shot in; its music's volume, its
// keys, and its blur
import { expect, test } from 'vitest';
import { wholePose } from '../../src/domain/camera.ts';
import { FilmError } from '../../src/domain/errors.ts';
import type { MotionBlurScript } from '../../src/direction/blur.ts';
import { atAddress, defineFilm } from '../../src/direction/film.ts';
import type { KeyboardSound, LivereelSoundsScript } from '../../src/direction/sound.ts';
import { SMALL } from './fakes.ts';

const TALL = { frame: { width: 400, height: 600 }, screen: { width: 400, height: 600 } };

test('the steps are handed the name of the format the film is shot in', async () => {
	const named: string[] = [];
	const film = defineFilm({
		formats: { small: SMALL, tall: TALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: (_served, _whole, formatName) => {
			named.push(formatName);
			return [];
		}
	});
	await using served = await film.formats.get('tall')!.serve();
	served.steps(wholePose(TALL));
	expect(named).toEqual(['tall']);
});

/** A film defined with its music at a volume. */
function filmWithMusicAt(volume: number) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		music: { file: './music.ogg', volume }
	});
}

test('music at a volume that is no level is refused as the film is defined: not a number, endless, below none', () => {
	expect(() => filmWithMusicAt(Number.NaN)).toThrow(FilmError);
	expect(() => filmWithMusicAt(Number.POSITIVE_INFINITY)).toThrow(FilmError);
	expect(() => filmWithMusicAt(-1)).toThrow(FilmError);
});

/** A film defined with livereel's sounds written so, as a film whose types nobody checked may write them. */
function filmSounding(sounds: LivereelSoundsScript) {
	return defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		sounds
	});
}

test('keys livereel cannot lay are refused as the film is defined: a keyboard it has not, a file or off beside a keyboard', () => {
	expect(() => filmSounding({ keyboard: 'typewriter' as KeyboardSound })).toThrow(FilmError);
	expect(() => filmSounding({ keyboard: 'laptop', key: './key.wav' } as LivereelSoundsScript)).toThrow(FilmError);
	expect(() => filmSounding({ keyboard: 'laptop', key: { enabled: false } } as LivereelSoundsScript)).toThrow(
		FilmError
	);
});

test("each of livereel's sounds a film turns off is off, and the rest stay livereel's", () => {
	const off = { enabled: false } as const;
	const own = { kind: 'livereel' };
	const membrane = { kind: 'keyboard', keyboard: 'membrane' };
	const sounds = [filmSounding({ click: off }), filmSounding({ key: off }), filmSounding({ ending: off })].map(
		(film) => film.formats.get('small')!.sound.livereels
	);
	expect(sounds).toEqual([
		{ click: { kind: 'off' }, key: membrane, ending: own },
		{ click: own, key: { kind: 'off' }, ending: own },
		{ click: own, key: membrane, ending: { kind: 'off' } }
	]);
});

test('a sound written as neither a file nor `{ enabled: false }` is refused as the film is defined, by its name', () => {
	expect(() => filmSounding({ click: null } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's click is null: a sound is a file, or { enabled: false } to turn it off")
	);
	expect(() => filmSounding({ key: { enabled: true } } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError('the film\'s key is {"enabled":true}: a sound is a file, or { enabled: false } to turn it off')
	);
	expect(() => filmSounding({ ending: 42 } as unknown as LivereelSoundsScript)).toThrow(
		new FilmError("the film's ending is 42: a sound is a file, or { enabled: false } to turn it off")
	);
});

/** The blur a film is shot with, its blur written so. */
function blurOfFilm(motionBlur: MotionBlurScript) {
	const film = defineFilm({
		formats: { small: SMALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: () => [],
		motionBlur
	});
	return film.formats.get('small')!.motionBlur;
}

test("a blur given one value keeps livereel's other", () => {
	expect(blurOfFilm({ shutter: 0.5 })).toEqual({ ...blurOfFilm({}), shutter: 0.5 });
});

test('a blur turned off is no blur', () => {
	expect(blurOfFilm({ enabled: false })).toBeNull();
});

test('a blur that cannot be shot is refused as the film is defined: a shutter shut or open past the frame before, too few exposures or a broken count', () => {
	expect(() => blurOfFilm({ shutter: 0 })).toThrow(FilmError);
	expect(() => blurOfFilm({ shutter: 1.5 })).toThrow(FilmError);
	expect(() => blurOfFilm({ shutter: Number.NaN })).toThrow(FilmError);
	expect(() => blurOfFilm({ exposuresAtMost: 1 })).toThrow(FilmError);
	expect(() => blurOfFilm({ exposuresAtMost: 2.5 })).toThrow(FilmError);
});
