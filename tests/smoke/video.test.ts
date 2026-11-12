// The video made by the system's ffmpeg: a frame's exposures blended into one of its frames, and what is left when
// ffmpeg stops before the film ends or its sound cannot be laid
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout } from 'node:timers/promises';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { EncodingError } from '../../src/domain/errors.ts';
import type { Size } from '../../src/domain/geometry.ts';
import { AS_LOUD_AS_ITS_FILE, type FilmSound, fileSound, livereelSound } from '../../src/direction/sound.ts';
import { blended } from '../../src/adapters/video/exposures.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';
import { EVERY_SHOT, FRAMES_QUEUED_AT_MOST, VideoFootage } from '../../src/adapters/video/video.ts';
import { FilmError } from '../../src/domain/errors.ts';

const FRAME = { width: 64, height: 64 };
// The film's rate; and a clip of three frames from its second second on
const RATE = 30;
const A_SPAN = { first: 30, last: 32 };
// A film that makes no sound, every one of livereel's off and no music: its video is its picture
const OFF = { kind: 'off' } as const;
const SOUNDLESS: FilmSound = { livereels: { click: OFF, key: OFF, ending: OFF }, music: null };
// A file that is there and holds no sound, and a video of the film made before
const NOT_A_SOUND = join(import.meta.dirname, 'page.html');
const MADE_BEFORE = 'an MP4 made before';
// More than a pipe holds at once, so the frame waits on ffmpeg to take it
const A_LARGE_FRAME = new Uint8Array(4 * 1024 * 1024);
const NOT_AN_IMAGE = new TextEncoder().encode('not an image');
// A frame decoded as one pixel of grey, and the grey of white
const ONE_GREY_PIXEL_A_FRAME = ['-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'gray'];
const WHITE = 255;
// What a frame kept does while its blends are held: waits, or is kept; and how long it is given to be kept at once
const WAITING = 'waiting';
const KEPT = 'kept';
const A_MOMENT_MILLISECONDS = 50;
// A tone the test makes for a film's key, a sine as ffmpeg makes it, an eighth of full scale, half a second long; and
// as many frames as half a second holds, so the key is heard whole
const TONE = 'tone.wav';
const A_TONE = 'sine=frequency=440:duration=0.5';
const HALF_A_SECOND_OF_FRAMES = 15;
// Keys laid four times as loud as their file, which peak louder by twenty decibels for each tenfold
const FOUR_TIMES = 4;
const DECIBELS_A_TENFOLD = 20;
// The loudest a sound peaks, as ffmpeg's volumedetect says it, in decibels under full scale
const PEAK_SAID = /max_volume: (-?[\d.]+) dB/;

async function scratch(): Promise<string> {
	return mkdtemp(join(tmpdir(), 'livereel-video-'));
}

/** A JPEG of one colour, by ffmpeg's name for it, of a size, as ffmpeg makes it. */
function jpegOf(size: Size, colour: string): Uint8Array {
	const made = spawnSync('ffmpeg', [
		'-loglevel',
		'error',
		'-f',
		'lavfi',
		'-i',
		`color=c=${colour}:s=${size.width}x${size.height}`,
		'-frames:v',
		'1',
		'-f',
		'image2pipe',
		'-c:v',
		'mjpeg',
		'-'
	]);
	return made.stdout;
}

/** The grey of an image's first pixel, 0 for black to 255 for white, as ffmpeg decodes it. */
function greyOf(jpeg: Uint8Array): number | undefined {
	const decoded = spawnSync(
		'ffmpeg',
		['-loglevel', 'error', '-f', 'image2pipe', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
		{ input: jpeg }
	);
	return decoded.stdout[0];
}

/** The grey of each of a video's frames, each shrunk to one pixel, 0 for black to 255 for white. */
function greysOf(video: string): number[] {
	const decoded = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', video, ...ONE_GREY_PIXEL_A_FRAME, '-']);
	return [...decoded.stdout];
}

/** How many frames a video holds, as ffprobe counts them. */
function framesOf(video: string): string {
	const ran = spawnSync(
		'ffprobe',
		['-v', 'error', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', video],
		{ encoding: 'utf8' }
	);
	return ran.stdout.trim();
}

/** A tone made in a folder, as ffmpeg makes it, the file a film there names as its key. */
function toneIn(directory: string): void {
	spawnSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', A_TONE, join(directory, TONE)]);
}

/** A video of half a second, by its name in a folder, whose film there strikes its key once at its start at a volume. */
async function keyStruckAt(keyVolume: number, directory: string, name: string): Promise<string> {
	const video = join(directory, name);
	const footage = new VideoFootage(video, FRAME, RATE, EVERY_SHOT, blended);
	const image = jpegOf(FRAME, 'gray');
	for (const shot of Array(HALF_A_SECOND_OF_FRAMES).keys()) await footage.keep(shot, { earlier: [], own: image });
	const key = { kind: 'file', path: `./${TONE}` } as const;
	const track = new Soundtrack(join(directory, 'film.ts'), {
		livereels: { ...SOUNDLESS.livereels, key, keyVolume },
		music: null
	});
	track.hear(0, livereelSound('key'));
	await footage.finish(track);
	await footage[Symbol.asyncDispose]();
	return video;
}

/** The loudest a video's sound peaks, in decibels under full scale, as ffmpeg reads it. */
function peakOf(video: string): number {
	const read = spawnSync('ffmpeg', ['-i', video, '-map', '0:a', '-af', 'volumedetect', '-f', 'null', '-'], {
		encoding: 'utf8'
	});
	return Number(PEAK_SAID.exec(read.stderr)![1]);
}

test('a frame of several exposures is one frame of the video', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	const footage = new VideoFootage(video, FRAME, RATE, EVERY_SHOT, blended);
	const image = jpegOf(FRAME, 'gray');
	await footage.keep(0, { earlier: [image, image, image], own: image });
	await footage.keep(1, { earlier: [], own: image });
	await footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS));
	expect(framesOf(video)).toBe('2');
	await footage[Symbol.asyncDispose]();
});

test('a clip keeps the frames of its span alone, is done past its last, and is refused where the film ends before it', async () => {
	const directory = await scratch();
	await using footage = new VideoFootage(join(directory, 'clip.mp4'), FRAME, RATE, A_SPAN, blended);
	expect([29, 30, 32, 33].map((shot) => footage.keeps(shot))).toEqual([false, true, true, false]);
	expect([32, 33].map((shot) => footage.complete(shot))).toEqual([false, true]);
	expect(() => footage.expect(30)).toThrow(
		new FilmError('the film is 1.0 s long (30 frames): there is no frame at 1.0 s')
	);
});

test('a frame is kept without waiting on its blend, and goes into the video in the order shot', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	const held = Promise.withResolvers<void>();
	// The first frame's blend held until both are kept, the second's done at once
	const blendsDone = [held.promise, Promise.resolve()];
	const footage = new VideoFootage(video, FRAME, RATE, EVERY_SHOT, (exposures) =>
		blendsDone.shift()!.then(() => exposures.own)
	);
	const black = jpegOf(FRAME, 'black');
	const white = jpegOf(FRAME, 'white');
	await footage.keep(0, { earlier: [black], own: black });
	await footage.keep(1, { earlier: [white], own: white });
	held.resolve();
	await footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS));
	expect(greysOf(video).map((grey) => Math.round(grey / WHITE))).toEqual([0, 1]);
	await footage[Symbol.asyncDispose]();
});

test('the take waits on the footage once the most frames are queued, until the oldest is written', async () => {
	const directory = await scratch();
	const held = Promise.withResolvers<void>();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME, RATE, EVERY_SHOT, (exposures) =>
		held.promise.then(() => exposures.own)
	);
	const image = jpegOf(FRAME, 'gray');
	for (const shot of Array(FRAMES_QUEUED_AT_MOST).keys()) await footage.keep(shot, { earlier: [image], own: image });
	const next = footage.keep(FRAMES_QUEUED_AT_MOST, { earlier: [image], own: image }).then(() => KEPT);
	const before = await Promise.race([next, setTimeout(A_MOMENT_MILLISECONDS, WAITING)]);
	held.resolve();
	expect([before, await next]).toEqual([WAITING, KEPT]);
	await footage[Symbol.asyncDispose]();
});

test("a blend that fails refuses the video as it is finished, in ffmpeg's words, and leaves no part of it", async () => {
	const directory = await scratch();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME, RATE, EVERY_SHOT, blended);
	await footage.keep(0, { earlier: [NOT_AN_IMAGE], own: NOT_AN_IMAGE });
	await expect(footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS))).rejects.toThrow(
		/^ffmpeg stopped: [^]*Invalid data found when processing input/
	);
	await footage[Symbol.asyncDispose]();
	expect(await readdir(directory)).toEqual([]);
});

test("a frame's exposures are blended, each weighing the same: three black and one white make a quarter of white", async () => {
	const black = jpegOf(FRAME, 'black');
	const white = jpegOf(FRAME, 'white');
	const frame = await blended({ earlier: [black, black, black], own: white });
	// 255 / 4, within 5 levels of it: a JPEG may round a flat grey; one exposure kept is 0 or 255, two blended 128
	expect(greyOf(frame)).toBeCloseTo(64, -1);
});

test("a key laid at the film's keyVolume comes out that much louder in the track than as loud as its file: at 4, 12 dB", async () => {
	const directory = await scratch();
	toneIn(directory);
	const asItsFile = await keyStruckAt(AS_LOUD_AS_ITS_FILE, directory, 'as-its-file.mp4');
	const louder = await keyStruckAt(FOUR_TIMES, directory, 'louder.mp4');
	expect(peakOf(louder) - peakOf(asItsFile)).toBeCloseTo(DECIBELS_A_TENFOLD * Math.log10(FOUR_TIMES), 0);
});

test("exposures ffmpeg cannot read are refused in ffmpeg's words", async () => {
	await expect(blended({ earlier: [NOT_AN_IMAGE], own: NOT_AN_IMAGE })).rejects.toThrow(
		/^ffmpeg stopped: [^]*Invalid data found when processing input/
	);
});

test('a frame handed to an ffmpeg that has stopped refuses the video, rather than waiting on a pipe, and leaves no part of it', async () => {
	const directory = await scratch();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME, RATE, EVERY_SHOT, blended);
	footage.encoder.kill('SIGKILL');
	await footage.keep(0, { earlier: [], own: A_LARGE_FRAME });
	await expect(footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS))).rejects.toThrow(EncodingError);
	await footage[Symbol.asyncDispose]();
	expect(await readdir(directory)).toEqual([]);
});

test('a video whose sound cannot be laid leaves the one made before as it was, and no part of the new one', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	writeFileSync(video, MADE_BEFORE);
	const footage = new VideoFootage(video, FRAME, RATE, EVERY_SHOT, blended);
	await footage.keep(0, { earlier: [], own: jpegOf(FRAME, 'gray') });
	// Heard without being expected, as nothing refused it before the shoot
	const track = new Soundtrack(join(directory, 'film.ts'), SOUNDLESS);
	track.hear(0, fileSound(NOT_A_SOUND));
	await expect(footage.finish(track)).rejects.toThrow(EncodingError);
	await footage[Symbol.asyncDispose]();
	expect([await readdir(directory), readFileSync(video, 'utf8')]).toEqual([['film.mp4'], MADE_BEFORE]);
});
