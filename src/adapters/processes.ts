/** A child process waited for: what ffmpeg and Playwright's installer are run as. */
import type { ChildProcess } from 'node:child_process';

/** The child's end, and the code it ended with: none where a signal ended it. */
export function closed(child: ChildProcess): Promise<number | null> {
	return new Promise((settle) => child.once('close', settle));
}
