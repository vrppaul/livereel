/**
 * A film's frames made a video as they are shot, and a contact sheet of the video.
 *
 * Every frame goes into ffmpeg as it is shot, so the video is encoded while the film is shot and no frame is written
 * to the disk; a frame waits only when ffmpeg has not taken the last ones yet. The frames are shot sharper than the
 * frame and scaled down, so text stays crisp when the camera comes close.
 */
import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { EncodingError, FilmError } from '../../domain/errors.ts';
import type { Size } from '../../domain/geometry.ts';
import { FRAMES_PER_SECOND } from '../../domain/time.ts';
import type { Footage } from '../../studio/ports.ts';
import { closed } from '../processes.ts';
import { FFMPEG, QUIETLY, ffmpeg } from './ffmpeg.ts';

// The frames as they come, JPEG after JPEG on ffmpeg's input
const FRAMES_IN = ['-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FRAMES_PER_SECOND), '-i', '-'];
// H.264 that any player opens, its quality, and how hard the encoder works for it
const ENCODING = [
	'-c:v',
	'libx264',
	'-crf',
	'17',
	'-preset',
	'medium',
	'-pix_fmt',
	'yuv420p',
	'-movflags',
	'+faststart'
];
// A contact sheet: a frame a second, this many to a row, each this wide
const SHEET_COLUMNS = 6;
const SHEET_TILE_WIDTH = 360;
const THE_FIRST_FRAME = ['-frames:v', '1'];
const STOP = 'SIGKILL';
// The video's colour is kept once for every two pixels each way, so a frame's sides are even
const PIXELS_PAIRED = 2;
// What a video's name carries until it is whole
const PARTIAL = '.partial';

type Encoder = ChildProcessByStdio<Writable, null, Readable>;

/**
 * The video is written under a name of its own until it is whole, so a film that fails leaves the last good video
 * where it was. Whatever waits on ffmpeg waits on its end too: a frame handed to an ffmpeg that has stopped is
 * refused at once, with ffmpeg's own words, rather than waiting on a pipe that will never drain.
 */
export class VideoFootage implements Footage, AsyncDisposable {
	readonly video: string;
	readonly partial: string;
	readonly encoder: Encoder;
	readonly ended: Promise<number | null>;
	// What ffmpeg said on its way, the reason it gives if it refuses
	readonly said: string[] = [];
	private whole = false;

	constructor(video: string, frame: Size) {
		refuseOddSides(frame);
		this.video = video;
		this.partial = partialOf(video);
		const scaled = ['-vf', `scale=${frame.width}:${frame.height}:flags=lanczos`];
		this.encoder = spawn(FFMPEG, [...QUIETLY, ...FRAMES_IN, ...scaled, ...ENCODING, this.partial], {
			stdio: ['pipe', 'ignore', 'pipe']
		});
		this.ended = closed(this.encoder);
		this.encoder.on('error', (fault) => this.said.push(fault.message));
		this.encoder.stderr.on('data', (chunk: Buffer) => this.said.push(chunk.toString()));
		this.encoder.stdin.on('error', (fault) => this.said.push(fault.message));
	}

	expect(): void {
		// Every frame is kept, so any film fits
	}

	keeps(): boolean {
		return true;
	}

	async keep(_shot: number, image: Uint8Array): Promise<void> {
		if (this.stopped()) throw this.refusal();
		if (this.encoder.stdin.write(image)) return;
		// A pipe whose reader has gone fails rather than drains: ffmpeg's end says why
		await Promise.race([once(this.encoder.stdin, 'drain').catch(() => undefined), this.ended]);
		if (this.stopped()) throw this.refusal();
	}

	complete(): boolean {
		return false;
	}

	/** The last frame given, the video written to its end and put in its place. */
	async finish(): Promise<void> {
		this.encoder.stdin.end();
		if ((await this.ended) !== 0) throw this.refusal();
		await rename(this.partial, this.video);
		this.whole = true;
	}

	/**
	 * A video never made whole — the film failed — is stopped and its part removed. ffmpeg waits on its input and does
	 * not hear a signal while it does: its input is closed first, so it stops, and the command can end.
	 */
	async [Symbol.asyncDispose](): Promise<void> {
		if (this.whole) return;
		if (!this.stopped()) {
			this.encoder.stdin.destroy();
			this.encoder.kill(STOP);
			await this.ended;
		}
		await rm(this.partial, { force: true });
	}

	private stopped(): boolean {
		return this.encoder.exitCode !== null || this.encoder.signalCode !== null || this.encoder.stdin.destroyed;
	}

	private refusal(): EncodingError {
		return new EncodingError(`ffmpeg stopped: ${this.said.join('').trim()}`);
	}
}

/** A frame the video cannot hold, refused in the film's terms rather than in ffmpeg's. */
function refuseOddSides(frame: Size): void {
	if (frame.width % PIXELS_PAIRED === 0 && frame.height % PIXELS_PAIRED === 0) return;
	throw new FilmError(
		`a video is made of frames whose sides are even counts of pixels: ${frame.width} × ${frame.height} is not`
	);
}

/** Where a video is written until it is whole: beside it, with the same container's suffix. */
function partialOf(video: string): string {
	const suffix = extname(video);
	return join(dirname(video), `${basename(video, suffix)}${PARTIAL}${suffix}`);
}

/** A frame a second of the video, side by side: the whole film at a glance. */
export function contactSheet(video: string, sheet: string, seconds: number): Promise<void> {
	const rows = Math.ceil(seconds / SHEET_COLUMNS);
	const tiles = `select='not(mod(n\\,${FRAMES_PER_SECOND}))',scale=${SHEET_TILE_WIDTH}:-1,tile=${SHEET_COLUMNS}x${rows}`;
	return ffmpeg('-i', video, '-vf', tiles, ...THE_FIRST_FRAME, sheet);
}
