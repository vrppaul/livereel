/**
 * Captions: words over the frame that come up one after another, and go.
 *
 * Each word comes up over the share of the whole that `WORDS_AT_ONCE` words take, so several are on their way at a
 * time; the ground under them darkens twice as fast as they come. The stage is handed every word's progress.
 */
import { easeOutCubic } from '../domain/time.ts';

/** Words over the frame: how far they have come up, and how far they have gone, each from 0 to 1. */
export interface Caption {
	readonly text: string;
	readonly shown: number;
	readonly gone: number;
}

/** A word of a caption, and how far it has come up, eased, from 0 to 1. */
interface Word {
	readonly text: string;
	readonly appeared: number;
}

/** A caption as the stage draws it: each word's progress, how dark the ground under them is, how far they went. */
export interface DrawnCaption {
	readonly text: string;
	readonly words: readonly Word[];
	readonly ground: number;
	readonly gone: number;
}

// How many words are on their way up at once, and how much faster than the words the ground darkens
const WORDS_AT_ONCE = 3;
const GROUND_DARKENS_FASTER = 2;
const BETWEEN_WORDS = /\s+/;

export function drawnCaption(caption: Caption): DrawnCaption {
	const spoken = caption.text.split(BETWEEN_WORDS).filter((word) => word !== '');
	const share = WORDS_AT_ONCE / (spoken.length + WORDS_AT_ONCE - 1);
	const words = spoken.map((text, place) => ({
		text,
		appeared: easeOutCubic(shareOf(caption.shown, (place / spoken.length) * (1 - share), share))
	}));
	const ground = Math.min(1, caption.shown * GROUND_DARKENS_FASTER) * (1 - caption.gone);
	return { text: caption.text, words, ground, gone: caption.gone };
}

/** How far along a part of a whole is, the whole `progress` along: none before the part's start, all after it. */
function shareOf(progress: number, start: number, length: number): number {
	return Math.min(1, Math.max(0, (progress - start) / length));
}
