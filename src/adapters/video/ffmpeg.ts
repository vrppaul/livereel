/**
 * ffmpeg, as the system has it: run to the end, run over what it is handed, asked whether it is there at all, or
 * asked what it encodes.
 *
 * ffmpeg is the system's and not a dependency of the package: the builds published on npm are GPL-licensed. A build
 * may lack an encoder a kind of video is made with (VP9 is a library of its own), so what it has is asked.
 */
import { type ChildProcessByStdio, execFile, spawn } from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import { promisify } from 'node:util';
import { EncodingError } from '../../domain/errors.ts';
import { closed } from '../processes.ts';

/** An ffmpeg run on pipes: its input, its output where it is read, and what it says. */
type Piped = ChildProcessByStdio<Writable, Readable | null, Readable>;

export const FFMPEG = 'ffmpeg';
// What every run says: overwrite what is there, and speak only of errors
export const QUIETLY = ['-y', '-loglevel', 'error'];
// Images down a pipe, JPEG after JPEG, into ffmpeg or out of it
export const JPEGS_PIPED = ['-f', 'image2pipe', '-c:v', 'mjpeg'];
const VERSION = '-version';
// The encoders listed, one a row: its flags, its name, then what it is, apart by spaces
const LIST_ENCODERS = ['-hide_banner', '-encoders'];
const ROWS_APART = '\n';
const WORDS_APART = /\s+/;
const NAME_IN_A_ROW = 1;

const run = promisify(execFile);

/** ffmpeg run on these arguments to its end; what it says when it refuses is the error's message. */
export async function ffmpeg(...options: string[]): Promise<void> {
	try {
		await run(FFMPEG, [...QUIETLY, ...options]);
	} catch (fault) {
		throw new EncodingError(fault instanceof Error ? fault.message : String(fault), { cause: fault });
	}
}

/**
 * What ffmpeg writes when run on these arguments over what it is handed, its input and its output pipes; what it says
 * when it refuses is the error's message.
 */
export async function ffmpegThrough(input: Uint8Array, ...options: string[]): Promise<Uint8Array> {
	const through = spawn(FFMPEG, [...QUIETLY, ...options], { stdio: ['pipe', 'pipe', 'pipe'] });
	const words = new FfmpegWords(through);
	const written: Buffer[] = [];
	through.stdout.on('data', (chunk: Buffer) => written.push(chunk));
	through.stdin.end(input);
	if ((await closed(through)) !== 0) throw words.refusal();
	return Buffer.concat(written);
}

/** What an ffmpeg run on pipes says on its way, its input pipe's faults among it: the reason it gives when it stops. */
export class FfmpegWords {
	private readonly said: string[] = [];

	constructor(piped: Piped) {
		piped.on('error', (fault) => this.said.push(fault.message));
		piped.stdin.on('error', (fault) => this.said.push(fault.message));
		piped.stderr.on('data', (chunk: Buffer) => this.said.push(chunk.toString()));
	}

	refusal(): EncodingError {
		return new EncodingError(`ffmpeg stopped: ${this.said.join('').trim()}`);
	}
}

/** Whether ffmpeg is on the path. */
export function ffmpegFound(): Promise<boolean> {
	return new Promise(askedForItsVersion);
}

/** The names of the encoders ffmpeg on the path has. */
export async function ffmpegEncoders(): Promise<ReadonlySet<string>> {
	const { stdout } = await run(FFMPEG, LIST_ENCODERS);
	return new Set(stdout.split(ROWS_APART).map(encoderIn));
}

function encoderIn(row: string): string {
	return row.trim().split(WORDS_APART)[NAME_IN_A_ROW] ?? '';
}

function askedForItsVersion(found: (isThere: boolean) => void): void {
	const asked = spawn(FFMPEG, [VERSION], { stdio: 'ignore' });
	asked.once('error', () => found(false));
	asked.once('close', (code) => found(code === 0));
}
