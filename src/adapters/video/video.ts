/**
 * A film's frames made a video as they are shot, and a contact sheet of the video.
 *
 * Every frame goes into ffmpeg as it is shot, so the video is encoded while the film is shot and no frame is written
 * to the disk. A frame of several exposures is blended (`exposures.ts`) beside the take, which shoots on, several
 * frames at once, and each goes into ffmpeg in the order shot once the frames before it have: a blend had held the
 * take for a quarter of a blurred shoot (12.6 s of 50.7 s on a 2.7 s piece of the README film, measured 2026-10-30).
 * The frames are shot sharper than the frame and scaled down, so text stays crisp when the camera comes close.
 */
import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import type { Readable, Writable } from 'node:stream';
import type { Size } from '../../domain/geometry.ts';
import { FRAMES_PER_SECOND } from '../../domain/time.ts';
import type { Exposures, Footage } from '../../studio/ports.ts';
import { closed } from '../processes.ts';
import type { Blend } from './exposures.ts';
import { FFMPEG, FfmpegWords, JPEGS_PIPED, QUIETLY, ffmpeg } from './ffmpeg.ts';
import { KINDS, STARTS_AT_ONCE } from './kinds.ts';
import { pictureOf } from './partial.ts';
import type { Soundtrack } from './soundtrack.ts';

// The frames as they come on ffmpeg's input, so many a second
const FRAMES_IN = [...JPEGS_PIPED, '-framerate', String(FRAMES_PER_SECOND), '-i', '-'];
// H.264 that any player opens, its quality, and how hard the encoder works for it
const ENCODING = [
	'-c:v',
	KINDS.mp4.picture,
	'-crf',
	'17',
	'-preset',
	'medium',
	'-pix_fmt',
	'yuv420p',
	...STARTS_AT_ONCE
];
// A contact sheet: a frame a second, this many to a row, each this wide
const SHEET_COLUMNS = 6;
const SHEET_TILE_WIDTH = 360;
const THE_FIRST_FRAME = ['-frames:v', '1'];
const STOP = 'SIGKILL';
// How many frames may be blending at once while the take shoots on: the 2.7 s piece of the README film took 42.4 s
// with 2, the take still waiting 0.9 s on them; 41.0–41.8 s with 4; 41.8–42.4 s with 8, the blends taking the
// captures' cores (measured 2026-10-30, two shoots each)
const FRAMES_BLENDING_AT_MOST = 4;

type Encoder = ChildProcessByStdio<Writable, null, Readable>;

/**
 * The MP4's picture is written under a name of its own (`pictureOf`), and the video is put in its place only as the
 * footage is finished, its sound laid under it (`soundtrack.ts`), so a film that fails leaves the last good video
 * where it was. Whatever waits on ffmpeg waits on its end too: a frame handed to an ffmpeg that has stopped is refused
 * at once, with ffmpeg's own words, rather than waiting on a pipe that will never drain.
 */
export class VideoFootage implements Footage, AsyncDisposable {
	readonly encoder: Encoder;
	readonly ended: Promise<number | null>;
	readonly words: FfmpegWords;
	readonly blend: Blend;
	private readonly video: string;
	private readonly picture: string;
	// The last frame kept, written once every frame before it is; and the frames still to be written, the oldest first
	private written: Promise<void> = Promise.resolve();
	private readonly writing: Promise<void>[] = [];

	constructor(video: string, frame: Size, blend: Blend) {
		this.video = video;
		this.blend = blend;
		this.picture = pictureOf(video);
		const scaled = ['-vf', `scale=${frame.width}:${frame.height}:flags=lanczos`];
		this.encoder = spawn(FFMPEG, [...QUIETLY, ...FRAMES_IN, ...scaled, ...ENCODING, this.picture], {
			stdio: ['pipe', 'ignore', 'pipe']
		});
		this.ended = closed(this.encoder);
		this.words = new FfmpegWords(this.encoder);
	}

	expect(): void {
		// Every frame is kept, so any film fits
	}

	keeps(): boolean {
		return true;
	}

	/**
	 * The frame's blend begun, and its writing queued after the frames before it; the take waits only while the most
	 * frames are blending at once, on the oldest. A fault, a blend's or ffmpeg's, refuses every frame after it, and is
	 * met where the take next waits on one, or as the footage is finished.
	 */
	async keep(_shot: number, exposures: Exposures): Promise<void> {
		if (this.stopped()) throw this.words.refusal();
		this.written = Promise.all([this.written, this.blend(exposures)]).then(([, image]) => this.write(image));
		// Heard here too, so a fault met before the take or the finish waits on it is not one Node takes as unheard
		this.written.catch(() => undefined);
		this.writing.push(this.written);
		if (this.writing.length > FRAMES_BLENDING_AT_MOST) await this.writing.shift();
	}

	complete(): boolean {
		return false;
	}

	/**
	 * Every frame written, the last given, the picture written to its end, and the video put in its place, the track
	 * laid under it.
	 */
	async finish(track: Soundtrack, seconds: number): Promise<void> {
		await this.written;
		this.encoder.stdin.end();
		if ((await this.ended) !== 0) throw this.words.refusal();
		await track.laidUnder(this.picture, this.video, seconds);
	}

	/**
	 * An encoder still running — the film failed — is stopped, and a picture not put in its place is removed. ffmpeg
	 * waits on its input and does not hear a signal while it does: its input is closed first, so it stops, and the
	 * command can end. Frames still queued are dropped, each refused as its turn to be written comes.
	 */
	async [Symbol.asyncDispose](): Promise<void> {
		if (!this.stopped()) {
			this.encoder.stdin.destroy();
			this.encoder.kill(STOP);
			await this.ended;
		}
		await this.written.catch(() => undefined);
		await rm(this.picture, { force: true });
	}

	/** A frame's one image handed to ffmpeg, once ffmpeg has taken the frames before it. */
	private async write(image: Uint8Array): Promise<void> {
		if (this.stopped()) throw this.words.refusal();
		if (this.encoder.stdin.write(image)) return;
		// A pipe whose reader has gone fails rather than drains: ffmpeg's end says why
		await Promise.race([once(this.encoder.stdin, 'drain').catch(() => undefined), this.ended]);
		if (this.stopped()) throw this.words.refusal();
	}

	private stopped(): boolean {
		return this.encoder.exitCode !== null || this.encoder.signalCode !== null || this.encoder.stdin.destroyed;
	}
}

/** A frame a second of the video, side by side: the whole film at a glance. */
export function contactSheet(video: string, sheet: string, seconds: number): Promise<void> {
	const rows = Math.ceil(seconds / SHEET_COLUMNS);
	const tiles = `select='not(mod(n\\,${FRAMES_PER_SECOND}))',scale=${SHEET_TILE_WIDTH}:-1,tile=${SHEET_COLUMNS}x${rows}`;
	return ffmpeg('-i', video, '-vf', tiles, ...THE_FIRST_FRAME, sheet);
}
