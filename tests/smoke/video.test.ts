// The video made by the system's ffmpeg: a frame's exposures blended into one of its frames, and what is left when
// ffmpeg stops before the film ends
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { EncodingError, FilmError } from '../../src/domain/errors.ts';
import type { Size } from '../../src/domain/geometry.ts';
import { momentOf } from '../../src/domain/time.ts';
import type { FilmSound } from '../../src/direction/sound.ts';
import { blended } from '../../src/adapters/video/exposures.ts';
import { Soundtrack } from '../../src/adapters/video/soundtrack.ts';
import { VideoFootage } from '../../src/adapters/video/video.ts';

const FRAME = { width: 64, height: 64 };
// A film that makes no sound: its video is its picture
const SOUNDLESS: FilmSound = { livereels: null, music: null };
// More than a pipe holds at once, so the frame waits on ffmpeg to take it
const A_LARGE_FRAME = new Uint8Array(4 * 1024 * 1024);
const NOT_AN_IMAGE = new TextEncoder().encode('not an image');

async function scratch(): Promise<string> {
	return mkdtemp(join(tmpdir(), 'livereel-video-'));
}

/** A JPEG of one grey, of a size, as ffmpeg makes it. */
function jpegOf(size: Size): Uint8Array {
	const made = spawnSync('ffmpeg', [
		'-loglevel',
		'error',
		'-f',
		'lavfi',
		'-i',
		`color=c=gray:s=${size.width}x${size.height}`,
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
	const footage = new VideoFootage(video, FRAME);
	const image = jpegOf(FRAME);
	await footage.keep(0, { earlier: [image, image, image], own: image });
	await footage.keep(1, { earlier: [], own: image });
	await footage.finish(new Soundtrack(join(directory, 'film.ts'), SOUNDLESS), momentOf(2));
	expect(framesOf(video)).toBe('2');
	await footage[Symbol.asyncDispose]();
});

test("exposures ffmpeg cannot read are refused in ffmpeg's words", async () => {
	await expect(blended({ earlier: [NOT_AN_IMAGE], own: NOT_AN_IMAGE })).rejects.toThrow(
		/^ffmpeg stopped: [^]*Invalid data found when processing input/
	);
});

test('a frame handed to an ffmpeg that has stopped is refused, and no part of the video is left', async () => {
	const directory = await scratch();
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME);
	footage.encoder.kill('SIGKILL');
	await expect(footage.keep(0, { earlier: [], own: A_LARGE_FRAME })).rejects.toThrow(EncodingError);
	await footage[Symbol.asyncDispose]();
	expect(await readdir(directory)).toEqual([]);
});

test('a frame with a side of an odd count of pixels is refused before the video is begun, naming the rule', async () => {
	const directory = await scratch();
	expect(() => new VideoFootage(join(directory, 'film.mp4'), { width: 321, height: 320 })).toThrow(
		new FilmError('a video is made of frames whose sides are even counts of pixels: 321 × 320 is not')
	);
	expect(await readdir(directory)).toEqual([]);
});
