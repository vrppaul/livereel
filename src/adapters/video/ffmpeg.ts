/**
 * ffmpeg, as the system has it: run to the end, or asked whether it is there at all.
 *
 * ffmpeg is the system's and not a dependency of the package: the builds published on npm are GPL-licensed.
 */
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { EncodingError } from '../../domain/errors.ts';

export const FFMPEG = 'ffmpeg';
// What every run says: overwrite what is there, and speak only of errors
export const QUIETLY = ['-y', '-loglevel', 'error'];
const VERSION = '-version';

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

function askedForItsVersion(found: (isThere: boolean) => void): void {
	const asked = spawn(FFMPEG, [VERSION], { stdio: 'ignore' });
	asked.once('error', () => found(false));
	asked.once('close', (code) => found(code === 0));
}
