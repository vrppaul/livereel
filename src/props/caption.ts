/**
 * A caption, a prop of the scene over the whole frame: words at the frame's foot, or at its top where the format puts
 * them there, on a ground that darkens the frame's edge under them. It lies over the frame alone, over every object,
 * riding with the eye wherever it moves, one at a time and known by no name. Where it stands is the format's, read as
 * the caption comes up, so one film can caption a square at its top and a wide frame at its foot. It comes up and goes
 * in its own way, its words one after another, or in a way of livereel's (`src/props/way.ts`), which brings its words
 * whole while its ground comes in its own way.
 */
import type { CaptionPlace, Format } from '../domain/format.ts';
import { type OnItsWay, type WayCome, alongItsWay, presencesIn, presentShare } from './way.ts';
import { type ComingUp, type DrawnWords, type Said, drawnWordsOnGround } from './words.ts';

/**
 * A caption: what it says, the edge of the frame it stands at, how its words come up, word by word or typed, and how
 * far it has come up and gone, in the way it comes.
 */
export interface Caption extends Said, WayCome {
	readonly at: CaptionPlace;
	readonly comingUp: ComingUp;
}

/** A caption as the stage draws it: its words, the edge of the frame it stands at, and its words' way, none standing. */
export interface DrawnCaption extends DrawnWords {
	readonly at: CaptionPlace;
	readonly onItsWay: OnItsWay | null;
}

// A caption stands at the frame's foot where its format names no place
const AT_THE_FOOT: CaptionPlace = 'bottom';

/** The edge of the frame a format puts its captions at. */
export function captionPlaceIn(format: Format): CaptionPlace {
	return format.captionAt ?? AT_THE_FOOT;
}

/** A caption as the stage draws it at a moment of the film, as far as it has come up and gone. */
export function drawnCaption(caption: Caption, moment: number): DrawnCaption {
	const words = drawnWordsOnGround(caption, caption.comingUp, presencesIn(caption.way, caption), moment);
	return { ...words, at: caption.at, onItsWay: alongItsWay(caption.way, presentShare(caption)) };
}

/** Whether a caption stands at the frame's foot, where keys would stand under it. */
export function standsAtTheFoot(caption: Caption): boolean {
	return caption.at === AT_THE_FOOT;
}
