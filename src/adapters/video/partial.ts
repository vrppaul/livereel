/**
 * A video written under a name of its own until it is whole, so one that fails leaves the last good video of its
 * name where it was: the MP4 as its frames come, and every kind made from it.
 */
import { basename, dirname, extname, join } from 'node:path';

// What a video's name carries until it is whole
const PARTIAL = '.partial';

/** Where a video is written until it is whole: beside it, with the same container's suffix. */
export function partialOf(video: string): string {
	const suffix = extname(video);
	return join(dirname(video), `${basename(video, suffix)}${PARTIAL}${suffix}`);
}
