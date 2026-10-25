/**
 * A video written under a name of its own until it is whole, so one that fails leaves the last good video of its
 * name where it was: the MP4 as its frames come, and every kind made from it.
 */
import { basename, dirname, extname, join } from 'node:path';

// What a video's name carries until it is whole, and what the MP4's picture's carries until its sound is laid under it
const PARTIAL = '.partial';
const PICTURE = '.picture';

/** Where a video is written until it is whole: beside it, with the same container's suffix. */
export function partialOf(video: string): string {
	return beside(video, PARTIAL);
}

/** Where the MP4's picture is written as its frames come, until its sound is laid under it: beside it. */
export function pictureOf(video: string): string {
	return beside(video, PICTURE);
}

function beside(video: string, mark: string): string {
	const suffix = extname(video);
	return join(dirname(video), `${basename(video, suffix)}${mark}${suffix}`);
}
