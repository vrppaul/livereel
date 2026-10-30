/**
 * A frame's exposures blended into the one image the frame is, for the video and for a still alike.
 *
 * Each exposure weighs the same, as the light of each moment does that passes a shutter open for all of them. ffmpeg
 * blends them, the JPEGs one after another on its input, and writes the blend as a JPEG. A frame of one exposure is
 * that image as it was captured.
 */
import type { Exposures } from '../../studio/ports.ts';
import { JPEGS_PIPED, ffmpegThrough } from './ffmpeg.ts';

// The exposures on ffmpeg's input, and the one image out, a JPEG of the finest quality ffmpeg makes by default (2 on
// its scale to 31)
const JPEGS_IN = [...JPEGS_PIPED, '-i', '-'];
const ONE_JPEG_OUT = ['-frames:v', '1', ...JPEGS_PIPED, '-q:v', '2', '-'];

/** How a frame's exposures are made its one image: `blended`, or blended and timed. */
export type Blend = (exposures: Exposures) => Promise<Uint8Array>;

/** The frame's one image: its own where it has no other exposure, every exposure blended where it has. */
export function blended(exposures: Exposures): Promise<Uint8Array> {
	if (exposures.earlier.length === 0) return Promise.resolve(exposures.own);
	const every = [...exposures.earlier, exposures.own];
	// ffmpeg's running blend of the last so many frames, kept on the frame where it holds them all: the last
	const blend = `tmix=frames=${every.length},select=eq(n\\,${every.length - 1})`;
	return ffmpegThrough(Buffer.concat(every), ...JPEGS_IN, '-vf', blend, ...ONE_JPEG_OUT);
}
