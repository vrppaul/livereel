/**
 * ffmpeg, as the system has it: run to the end, asked whether it is there at all, or asked what it encodes.
 *
 * ffmpeg is the system's and not a dependency of the package: the builds published on npm are GPL-licensed. A build
 * may lack an encoder a kind of video is made with (VP9 is a library of its own), so what it has is asked.
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { EncodingError } from '../../domain/errors.ts';

export const FFMPEG = 'ffmpeg';
// What every run says: overwrite what is there, and speak only of errors
export const QUIETLY = ['-y', '-loglevel', 'error'];
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
