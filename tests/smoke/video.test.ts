// The video made by the system's ffmpeg: a frame's exposures blended into one of its frames, and what is left when
// ffmpeg stops before the film ends or its sound cannot be laid
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { EncodingError } from '../../src/domain/errors.ts';
import type { Size } from '../../src/domain/geometry.ts';
import { momentOf } from '../../src/domain/time.ts';
import { type FilmSound, fileSound } from '../../src/direction/sound.ts';
import { blended } from '../../src/adapters/video/exposures.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';
import { VideoFootage } from '../../src/adapters/video/video.ts';

const FRAME = { width: 64, height: 64 };
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

test('a frame of several exposures is one frame of the video', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	const footage = new VideoFootage(video, FRAME, blended);
	const image = jpegOf(FRAME, 'gray');
	await footage.keep(0, { earlier: [image, image, image], own: image });
	await footage.keep(1, { earlier: [], own: image });
	await footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS), momentOf(2));
	expect(framesOf(video)).toBe('2');
	await footage[Symbol.asyncDispose]();
});

test('a frame is kept without waiting on its blend, and goes into the video in the order shot', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	const held = Promise.withResolvers<void>();
	// The first frame's blend held until both are kept, the second's done at once
	const blendsDone = [held.promise, Promise.resolve()];
	const footage = new VideoFootage(video, FRAME, (exposures) => blendsDone.shift()!.then(() => exposures.own));
	const black = jpegOf(FRAME, 'black');
	const white = jpegOf(FRAME, 'white');
	await footage.keep(0, { earlier: [black], own: black });
	await footage.keep(1, { earlier: [white], own: white });
	held.resolve();
	await footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS), momentOf(2));
	expect(greysOf(video).map((grey) => Math.round(grey / WHITE))).toEqual([0, 1]);
	await footage[Symbol.asyncDispose]();
});

test("a blend that fails refuses the video as it is finished, in ffmpeg's words, and leaves no part of it", async () => {
	const directory = await scratch();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME, blended);
	await footage.keep(0, { earlier: [NOT_AN_IMAGE], own: NOT_AN_IMAGE });
	await expect(footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS), momentOf(1))).rejects.toThrow(
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

test("exposures ffmpeg cannot read are refused in ffmpeg's words", async () => {
	await expect(blended({ earlier: [NOT_AN_IMAGE], own: NOT_AN_IMAGE })).rejects.toThrow(
		/^ffmpeg stopped: [^]*Invalid data found when processing input/
	);
});

test('a frame handed to an ffmpeg that has stopped refuses the video, rather than waiting on a pipe, and leaves no part of it', async () => {
	const directory = await scratch();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME, blended);
	footage.encoder.kill('SIGKILL');
	await footage.keep(0, { earlier: [], own: A_LARGE_FRAME });
	await expect(footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS), momentOf(1))).rejects.toThrow(
		EncodingError
	);
	await footage[Symbol.asyncDispose]();
	expect(await readdir(directory)).toEqual([]);
});

test('a video whose sound cannot be laid leaves the one made before as it was, and no part of the new one', async () => {
	const directory = await scratch();
	const video = join(directory, 'film.mp4');
	writeFileSync(video, MADE_BEFORE);
	const footage = new VideoFootage(video, FRAME, blended);
	await footage.keep(0, { earlier: [], own: jpegOf(FRAME, 'gray') });
	// Heard without being expected, as nothing refused it before the shoot
	const track = new Soundtrack(join(directory, 'film.ts'), SOUNDLESS);
	track.hear(0, fileSound(NOT_A_SOUND));
	await expect(footage.finish(track, momentOf(1))).rejects.toThrow(EncodingError);
	await footage[Symbol.asyncDispose]();
	expect([await readdir(directory), readFileSync(video, 'utf8')]).toEqual([['film.mp4'], MADE_BEFORE]);
});
