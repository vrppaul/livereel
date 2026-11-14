/**
 * A film's frames made a video as they are shot, whole or a span of it to look at a few moments in motion, and a
 * contact sheet of the video.
 *
 * Every frame goes into ffmpeg as it is shot, so the video is encoded while the film is shot and no frame is written
 * to the disk. A frame of several exposures is blended (`exposures.ts`) beside the take, which shoots on, several
 * frames at once, and each goes into ffmpeg in the order shot once the frames before it have: waited on, the blends
 * held the take for a quarter of a blurred shoot.
 * The frames are shot sharper than the frame and scaled down, so text stays crisp when the camera comes close: the
 * flat stage's here, a room's on the graphics card before they leave the browser, which come at the frame's size.
 */
import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import type { Readable, Writable } from 'node:stream';
import { FilmError } from '../../domain/errors.ts';
import type { Size } from '../../domain/geometry.ts';
import { momentOf, secondsSaid } from '../../domain/time.ts';
import type { Exposures, Footage } from '../../studio/ports.ts';
import { closed } from '../processes.ts';
import type { Blend } from './exposures.ts';
import { FFMPEG, FfmpegWords, JPEGS_PIPED, QUIETLY, ffmpeg } from './ffmpeg.ts';
import { KINDS, STARTS_AT_ONCE } from './kinds.ts';
import { pictureOf } from './partial.ts';
import type { SoundLaying } from './soundtrack.ts';

// The frames as they come on ffmpeg's input, at the film's rate, and where they come from
const FRAMES_A_SECOND_IN = '-framerate';
const FROM_THE_PIPE = ['-i', '-'];
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
// A contact sheet: this many to a row, each this wide
const SHEET_COLUMNS = 6;
const SHEET_TILE_WIDTH = 360;
// A sheet's frames: the first, then each that stands a sheet's step after the last taken, a thousandth of the step
// short so a frame at the step to the frame is taken; ffmpeg's own fps filter takes none of a video under a step long
const SHEET_STEP_TAKEN_WITHIN = 0.999;
const THE_FIRST_FRAME = ['-frames:v', '1'];
const STOP = 'SIGKILL';
// How many frames may be kept and not yet written, blending or waiting on ffmpeg, while the take shoots on: with 3 the
// take still waited on them, and with 9 the blends took the captures' cores; 5 shot quickest
export const FRAMES_QUEUED_AT_MOST = 5;
// What a frame kept first is written after; and the last of a list, counted from its end
const NOTHING_QUEUED = Promise.resolve();
const THE_LAST = -1;

type Encoder = ChildProcessByStdio<Writable, null, Readable>;

/** The frames a video keeps of a film: the first and the last, counted from the film's first. */
export interface ShotsKept {
	readonly first: number;
	readonly last: number;
}

/** Every frame of a film, as a whole film's video keeps them. */
export const EVERY_SHOT: ShotsKept = { first: 0, last: Number.POSITIVE_INFINITY };

/**
 * The MP4's picture is written under a name of its own (`pictureOf`), and the video is put in its place only as the
 * footage is finished, its sound laid under it (`soundtrack.ts`), so a film that fails leaves the last good video
 * where it was. Whatever waits on ffmpeg waits on its end too: a frame handed to an ffmpeg that has stopped is refused,
 * with ffmpeg's own words, rather than waiting on a pipe that will never drain; at once where ffmpeg has stopped as it
 * is kept, or as it comes to be written otherwise.
 */
export class VideoFootage implements Footage, AsyncDisposable {
	readonly encoder: Encoder;
	readonly ended: Promise<number | null>;
	readonly words: FfmpegWords;
	readonly blend: Blend;
	readonly framesPerSecond: number;
	readonly kept: ShotsKept;
	private readonly video: string;
	private readonly picture: string;
	// The frames kept and not yet written, the oldest first: each is written once the one before it is
	private readonly queued: Promise<void>[] = [];
	// How many frames are kept so far: the video's length, at the film's rate
	private framesKept = 0;

	constructor(video: string, frame: Size, framesPerSecond: number, kept: ShotsKept, blend: Blend) {
		this.video = video;
		this.blend = blend;
		this.framesPerSecond = framesPerSecond;
		this.kept = kept;
		this.picture = pictureOf(video);
		const framesIn = [...JPEGS_PIPED, FRAMES_A_SECOND_IN, String(framesPerSecond), ...FROM_THE_PIPE];
		const scaled = ['-vf', `scale=${frame.width}:${frame.height}:flags=lanczos`];
		this.encoder = spawn(FFMPEG, [...QUIETLY, ...framesIn, ...scaled, ...ENCODING, this.picture], {
			stdio: ['pipe', 'ignore', 'pipe']
		});
		this.ended = closed(this.encoder);
		this.words = new FfmpegWords(this.encoder);
	}

	/** A span that starts past the film's end is refused before anything is shot. */
	expect(frames: number): void {
		if (this.kept.first < frames) return;
		const length = secondsSaid(momentOf(frames, this.framesPerSecond));
		const from = secondsSaid(momentOf(this.kept.first, this.framesPerSecond));
		throw new FilmError(`the film is ${length} s long (${frames} frames): there is no frame at ${from} s`);
	}

	keeps(shot: number): boolean {
		return shot >= this.kept.first && shot <= this.kept.last;
	}

	/**
	 * The frame's blend begun, and its writing queued after the frames before it; where the most are queued, the take
	 * first waits on the oldest. A fault, a blend's or ffmpeg's, refuses every frame after it, and is met where the take
	 * next waits, a few frames on, or as the footage is finished: said at that frame's moment, the cost of not waiting
	 * on each blend.
	 */
	async keep(_shot: number, exposures: Exposures): Promise<void> {
		if (this.stopped()) throw this.words.refusal();
		if (this.queued.length >= FRAMES_QUEUED_AT_MOST) await this.queued.shift();
		const written = Promise.all([this.lastQueued(), this.blend(exposures)]).then(([, image]) => this.write(image));
		// Heard here too, so a fault met before the take or the finish waits on it is not one Node takes as unheard
		written.catch(() => undefined);
		this.queued.push(written);
		this.framesKept += 1;
	}

	complete(shot: number): boolean {
		return shot > this.kept.last;
	}

	/** How many frames the video holds so far: the whole film's, or as many of a span as the film had. */
	get frames(): number {
		return this.framesKept;
	}

	/** How long the video is, its frames at the film's rate. */
	get seconds(): number {
		return momentOf(this.framesKept, this.framesPerSecond);
	}

	/**
	 * Every frame written, the last given, the picture written to its end, and the video put in its place, the track
	 * laid under it for as long as the video is.
	 */
	async finish(track: SoundLaying): Promise<void> {
		await this.lastQueued();
		this.encoder.stdin.end();
		if ((await this.ended) !== 0) throw this.words.refusal();
		await track.laidUnder(this.picture, this.video, this.seconds);
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
		await this.lastQueued().catch(() => undefined);
		await rm(this.picture, { force: true });
	}

	/** The last frame kept, written once every frame before it is; nothing, before the first. */
	private lastQueued(): Promise<void> {
		return this.queued.at(THE_LAST) ?? NOTHING_QUEUED;
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

/**
 * So many frames a second of the video, side by side: one a second shows the whole film at a glance, six a move as an
 * eye follows it.
 */
export function contactSheet(
	video: string,
	sheet: string,
	seconds: number,
	sheetFramesPerSecond: number
): Promise<void> {
	const rows = Math.ceil(Math.ceil(seconds * sheetFramesPerSecond) / SHEET_COLUMNS);
	const step = SHEET_STEP_TAKEN_WITHIN / sheetFramesPerSecond;
	const taken = `select='isnan(prev_selected_t)+gte(t-prev_selected_t\\,${step})'`;
	const tiles = `${taken},scale=${SHEET_TILE_WIDTH}:-1,tile=${SHEET_COLUMNS}x${rows}`;
	return ffmpeg('-i', video, '-vf', tiles, ...THE_FIRST_FRAME, sheet);
}
