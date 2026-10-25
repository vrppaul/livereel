// The video made by the system's ffmpeg: what is left when ffmpeg stops before the film ends
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { EncodingError, FilmError } from '../../src/domain/errors.ts';
import { VideoFootage } from '../../src/adapters/video/video.ts';

const FRAME = { width: 64, height: 64 };
// More than a pipe holds at once, so the frame waits on ffmpeg to take it
const A_LARGE_FRAME = new Uint8Array(4 * 1024 * 1024);

test('a frame handed to an ffmpeg that has stopped is refused, and no part of the video is left', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'livereel-video-'));
	const footage = new VideoFootage(join(directory, 'film.mp4'), FRAME);
	footage.encoder.kill('SIGKILL');
	await expect(footage.keep(0, A_LARGE_FRAME)).rejects.toThrow(EncodingError);
	await footage[Symbol.asyncDispose]();
	expect(await readdir(directory)).toEqual([]);
});

test('a frame with a side of an odd count of pixels is refused before the video is begun, naming the rule', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'livereel-video-'));
	expect(() => new VideoFootage(join(directory, 'film.mp4'), { width: 321, height: 320 })).toThrow(
		new FilmError('a video is made of frames whose sides are even counts of pixels: 321 × 320 is not')
	);
	expect(await readdir(directory)).toEqual([]);
});
