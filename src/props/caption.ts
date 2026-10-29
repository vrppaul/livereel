/**
 * A caption: words over the frame at its foot, or at its top where the format puts them there, on a ground that
 * darkens the frame's edge under them. Where it stands is the format's, so one film can caption a square at its top
 * and a wide frame at its foot.
 */
import type { CaptionPlace, Format } from '../domain/geometry.ts';
import { type DrawnWords, type ShownWords, drawnWords } from './words.ts';

/** A caption as the stage draws it: its words, and the edge of the frame it stands at. */
export interface DrawnCaption extends DrawnWords {
	readonly at: CaptionPlace;
}

// A caption stands at the frame's foot where its format names no place
const AT_THE_FOOT: CaptionPlace = 'bottom';

export function drawnCaption(caption: ShownWords, format: Format): DrawnCaption {
	return { ...drawnWords(caption), at: format.captionAt ?? AT_THE_FOOT };
}
