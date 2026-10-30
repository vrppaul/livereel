/**
 * A caption, what an object shows (`src/props/object.ts`) over the whole frame: words at the frame's foot, or at its
 * top where the format puts them there, on a ground that darkens the frame's edge under them. Where it stands is the
 * format's, read as the caption comes up, so one film can caption a square at its top and a wide frame at its foot.
 */
import type { CaptionPlace, Format } from '../domain/format.ts';
import { type DrawnWords, type Said, drawnWords } from './words.ts';

/** A caption: what it says, and the edge of the frame it stands at. */
export interface Caption extends Said {
	readonly kind: 'caption';
	readonly at: CaptionPlace;
}

/** A caption as the stage draws it: its words, and the edge of the frame it stands at. */
export interface DrawnCaption extends DrawnWords {
	readonly kind: 'caption';
	readonly at: CaptionPlace;
}

// A caption stands at the frame's foot where its format names no place
const AT_THE_FOOT: CaptionPlace = 'bottom';

/** A caption saying words, at the edge of the frame its format puts it at. */
export function captionOf(said: Said, format: Format): Caption {
	return { kind: 'caption', ...said, at: format.captionAt ?? AT_THE_FOOT };
}

/** A caption as the stage draws it, the object showing it come up `shown` and gone `gone` so far. */
export function drawnCaption(caption: Caption, shown: number, gone: number): DrawnCaption {
	return { ...drawnWords({ ...caption, shown, gone }), kind: caption.kind, at: caption.at };
}

/** Whether a caption stands at the frame's foot, where keys would stand under it. */
export function standsAtTheFoot(caption: Caption): boolean {
	return caption.at === AT_THE_FOOT;
}
