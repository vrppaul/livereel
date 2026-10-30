/**
 * A film's frames made a video as they are shot, and a contact sheet of the video.
 *
 * Every frame goes into ffmpeg as it is shot, so the video is encoded while the film is shot and no frame is written
 * to the disk; a frame waits only when ffmpeg has not taken the last ones yet, and a frame of several exposures until
 * they are blended (`exposures.ts`). The frames are shot sharper than the frame and scaled down, so text stays crisp
 * when the camera comes close.
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

	async keep(_shot: number, exposures: Exposures): Promise<void> {
		if (this.stopped()) throw this.words.refusal();
		if (this.encoder.stdin.write(await this.blend(exposures))) return;
		// A pipe whose reader has gone fails rather than drains: ffmpeg's end says why
		await Promise.race([once(this.encoder.stdin, 'drain').catch(() => undefined), this.ended]);
		if (this.stopped()) throw this.words.refusal();
	}

	complete(): boolean {
		return false;
	}

	/** The last frame given, the picture written to its end, and the video put in its place, the track laid under it. */
	async finish(track: Soundtrack, seconds: number): Promise<void> {
		this.encoder.stdin.end();
		if ((await this.ended) !== 0) throw this.words.refusal();
		await track.laidUnder(this.picture, this.video, seconds);
	}

	/**
	 * An encoder still running — the film failed — is stopped, and a picture not put in its place is removed. ffmpeg
	 * waits on its input and does not hear a signal while it does: its input is closed first, so it stops, and the
	 * command can end.
	 */
	async [Symbol.asyncDispose](): Promise<void> {
		if (!this.stopped()) {
			this.encoder.stdin.destroy();
			this.encoder.kill(STOP);
			await this.ended;
		}
		await rm(this.picture, { force: true });
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
