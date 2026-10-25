/**
 * The kinds of video a film is made as, each a record: what it is written as, and the encoder it is made with.
 *
 * A film's frames are encoded into an MP4 as they are shot (`video.ts`); a WebM or a GIF is made from that MP4 once
 * it is whole, so one take gives every kind asked. Each is the film at its own frame and rate. A GIF's palette is
 * worked out from the whole film in a pass of its own, so no film is held in memory whole, and the GIF keeps the
 * film's time (measured on the promo: 20.0 s at 1920 × 1080 and 30 frames a second, 35 MB, made in 21 s). A kind is
 * written under a name of its own until it is whole, as the MP4 is.
 */
import { rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { ffmpeg } from './ffmpeg.ts';
import { partialOf } from './partial.ts';

/** A kind of video: what it is written as, and the encoder of the system's ffmpeg it is made with. */
interface KindOfVideo {
	readonly suffix: string;
	readonly encoder: string;
}

export const KINDS = {
	mp4: { suffix: '.mp4', encoder: 'libx264' },
	webm: { suffix: '.webm', encoder: 'libvpx-vp9' },
	gif: { suffix: '.gif', encoder: 'gif' }
} as const satisfies Readonly<Record<string, KindOfVideo>>;

export type Kind = keyof typeof KINDS;

/** The kind a film's frames are encoded into as they are shot; every other kind is made from it. */
export const SHOT_INTO = 'mp4' as const satisfies Kind;

export type MadeKind = Exclude<Kind, typeof SHOT_INTO>;

// VP9 as close to the MP4 as matters (SSIM 0.991 against it on the promo, 2.8 MB to its 3.0 MB, 30 s for its 20 s),
// its rows encoded at once
const WEBM = ['-c:v', KINDS.webm.encoder, '-crf', '24', '-b:v', '0', '-row-mt', '1', '-cpu-used', '2'];
// A palette of the film's own colours, weighed by what moves between frames; every frame drawn in it, dithered in an
// even pattern, and only the part that changed written again
const PALETTE_MADE = 'palettegen=stats_mode=diff';
const PALETTE_USED = '[0:v][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
const PALETTE_SUFFIX = '.palette.png';

export function isKind(name: string): name is Kind {
	return Object.hasOwn(KINDS, name);
}

export function isMade(kind: Kind): kind is MadeKind {
	return kind !== SHOT_INTO;
}

/** A video of another kind made from the film's MP4, under a name of its own until it is whole. */
export async function madeFrom(mp4: string, kind: MadeKind, video: string): Promise<void> {
	const partial = partialOf(video);
	try {
		await encoded(mp4, kind, partial);
		await rename(partial, video);
	} finally {
		await rm(partial, { force: true });
	}
}

function encoded(mp4: string, kind: MadeKind, video: string): Promise<void> {
	switch (kind) {
		case 'webm':
			return ffmpeg('-i', mp4, ...WEBM, video);
		case 'gif':
			return gifOf(mp4, video);
	}
}

/** A GIF in two passes: the palette worked out from the whole film, then every frame drawn in it. */
async function gifOf(mp4: string, gif: string): Promise<void> {
	const palette = join(dirname(gif), `${basename(gif, extname(gif))}${PALETTE_SUFFIX}`);
	try {
		await ffmpeg('-i', mp4, '-vf', PALETTE_MADE, palette);
		await ffmpeg('-i', mp4, '-i', palette, '-lavfi', PALETTE_USED, gif);
	} finally {
		await rm(palette, { force: true });
	}
}
