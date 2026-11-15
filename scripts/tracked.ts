/**
 * The repository's files as git tracks them, which the gates of ours read: a file left untracked is no part of what
 * they hold. Each gate that reads them imports this module; none runs it.
 */
import { execFileSync } from 'node:child_process';

/** The repository's files, as git tracks them, by their paths from the root. */
export function trackedFiles(): string[] {
	return execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
}
