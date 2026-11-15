/**
 * The kinds of video a film is made as, each a record: what it is written as, and the encoders its picture and its
 * sound are made with.
 *
 * A film's frames are encoded into an MP4 as they are shot (`video.ts`); a WebM or a GIF is made from that MP4 once it
 * is whole, so one take gives every kind asked. Each is the film at its own frame and rate. A GIF's palette is worked
 * out from the whole film in a pass of its own, so no film is held in memory whole, and the GIF keeps the film's time:
 * a film of 20 s at 1920 × 1080 and 30 frames a second made a GIF of 35 MB in 21 s. A kind is written under a name of
 * its own until it is whole, as the MP4 is.
 */
import { rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { ffmpeg } from './ffmpeg.ts';
import { partialOf } from './partial.ts';

/** A kind of video: what it is written as, and the system's ffmpeg's encoders of its picture and its sound. */
interface KindOfVideo {
	readonly suffix: string;
	readonly picture: string;
	/** None for a kind that holds no sound. */
	readonly sound: string | null;
}

export const KINDS = {
	mp4: { suffix: '.mp4', picture: 'libx264', sound: 'aac' },
	webm: { suffix: '.webm', picture: 'libvpx-vp9', sound: 'libopus' },
	gif: { suffix: '.gif', picture: 'gif', sound: null }
} as const satisfies Readonly<Record<string, KindOfVideo>>;

export type Kind = keyof typeof KINDS;

/**
 * The kinds' names, in the order the table gives them. Every key is one, but `Object.keys` types each as a bare string:
 * the guard keeps them all and tells the compiler they are kinds.
 */
export const KIND_NAMES: readonly Kind[] = Object.keys(KINDS).filter(isKind);

// An MP4 written with its index at its head, so a player starts it before the whole of it has come
export const STARTS_AT_ONCE = ['-movflags', '+faststart'];

/** The kind a film's frames are encoded into as they are shot; every other kind is made from it. */
export const SHOT_INTO = 'mp4' as const satisfies Kind;

export type MadeKind = Exclude<Kind, typeof SHOT_INTO>;

// VP9 as close to the MP4 as matters (measured on a film of 20 s: SSIM 0.991 against it, 2.8 MB to its 3.0 MB, made in
// 30 s), its rows encoded at once; the film's sound, where it has any, in Opus
const WEBM = [
	'-c:v',
	KINDS.webm.picture,
	'-crf',
	'24',
	'-b:v',
	'0',
	'-row-mt',
	'1',
	'-cpu-used',
	'2',
	'-c:a',
	KINDS.webm.sound
];
// A palette of the film's own colours, weighed by what moves between frames; every frame drawn in it, dithered in an
// even pattern, and only the part that changed written again
const PALETTE_MADE = 'palettegen=stats_mode=diff';
const PALETTE_USED = 'paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle';
const PALETTE_SUFFIX = '.palette.png';
// A GIF holds a frame for whole hundredths of a second, and browsers show one held a hundredth or less as held ten: so
// a GIF is made at no more than 50 frames a second, each held two, though the film runs faster
const GIF_FRAMES_PER_SECOND_AT_MOST = 50;

function isKind(name: string): name is Kind {
	return Object.hasOwn(KINDS, name);
}

export function isMade(kind: Kind): kind is MadeKind {
	return kind !== SHOT_INTO;
}

/** The encoders a kind is made with: its picture's, and its sound's where it holds sound. */
export function encodersOf(kind: Kind): readonly string[] {
	const { picture, sound } = KINDS[kind];
	return sound === null ? [picture] : [picture, sound];
}

/**
 * A video of another kind made from the film's MP4, at the film's rate where the kind holds it, under a name of its own
 * until it is whole.
 */
export async function madeFrom(mp4: string, kind: MadeKind, video: string, framesPerSecond: number): Promise<void> {
	const partial = partialOf(video);
	try {
		await encoded(mp4, kind, partial, framesPerSecond);
		await rename(partial, video);
	} finally {
		await rm(partial, { force: true });
	}
}

function encoded(mp4: string, kind: MadeKind, video: string, framesPerSecond: number): Promise<void> {
	switch (kind) {
		case 'webm':
			return ffmpeg('-i', mp4, ...WEBM, video);
		case 'gif':
			return gifOf(mp4, video, framesPerSecond);
	}
}

/**
 * A GIF in two passes: the palette worked out from the whole film, then every frame drawn in it, at the film's rate or
 * as many frames a second as a GIF holds, the fewer.
 */
async function gifOf(mp4: string, gif: string, framesPerSecond: number): Promise<void> {
	const palette = join(dirname(gif), `${basename(gif, extname(gif))}${PALETTE_SUFFIX}`);
	const rate = Math.min(framesPerSecond, GIF_FRAMES_PER_SECOND_AT_MOST);
	try {
		await ffmpeg('-i', mp4, '-vf', PALETTE_MADE, palette);
		await ffmpeg('-i', mp4, '-i', palette, '-lavfi', `[0:v]fps=${rate}[timed];[timed][1:v]${PALETTE_USED}`, gif);
	} finally {
		await rm(palette, { force: true });
	}
}
