/**
 * A film's format: what it is shot at, its frame; what its page is laid out on, its screen; how the frame is split
 * between words and the page's window; where its captions stand; and the places it names of its own, so one script
 * fits every format it is shot in: words `at: 'words'` stand above the page in a square and beside it in a wide frame
 * where each format names `words` so. livereel's split stands where a format gives none, or for what it leaves out, and
 * captions at the frame's foot.
 */
import type { Size } from './geometry.ts';
import { A_PIXELS, A_SHARE, type Form, OfForm, OneOf, Plain, RecordOf, needed } from './handed.ts';
import { A_PLACE, type Place } from './place.ts';

export interface Format {
	readonly frame: Size;
	readonly screen: Size;
	readonly split?: Split;
	readonly captionAt?: CaptionPlace;
	/** The places the format names of its own, each a place of livereel's, another of its own, or a box in either. */
	readonly places?: Readonly<Record<string, Place>>;
}

// Where a caption stands on the frame: at its foot, or its top
const CAPTION_PLACES = ['bottom', 'top'] as const;

export type CaptionPlace = (typeof CAPTION_PLACES)[number];

/**
 * How a frame is split between words and the page's window (`src/domain/split.ts`): the share of the frame the words
 * take along the split, from 0 to 1, and, in pixels of a frame 1080 on its shorter side, how far the window stands in
 * from the frame's edges, the words from the frame's edges, and the words from the window.
 */
export interface Split {
	readonly wordsShare?: number;
	readonly windowMargin?: number;
	readonly wordsMargin?: number;
	readonly wordsGap?: number;
}

// A video keeps its colour once for every two pixels each way, so a frame's sides are even counts of pixels
const PIXELS_PAIRED = 2;
const A_FRAME_LENGTH = new Plain(isFrameLength, 'a whole, even count of pixels, as a video holds them');
// A page is laid out on a screen of some size
const A_SCREEN_LENGTH = new Plain(isScreenLength, 'a number of pixels, more than none');

/**
 * A film's format as it hands it: a frame a video holds, the screen its page is laid out on, its split, where its
 * captions stand, and its own places.
 */
export const FORMAT_FORM: Form<Format> = {
	frame: needed(
		new OfForm<Size>({ width: needed(A_FRAME_LENGTH), height: needed(A_FRAME_LENGTH) }, 'a frame: { width, height }')
	),
	screen: needed(
		new OfForm<Size>({ width: needed(A_SCREEN_LENGTH), height: needed(A_SCREEN_LENGTH) }, 'a screen: { width, height }')
	),
	split: new OfForm<Split>(
		{ wordsShare: A_SHARE, windowMargin: A_PIXELS, wordsMargin: A_PIXELS, wordsGap: A_PIXELS },
		'a split: { wordsShare, windowMargin, wordsMargin, wordsGap }, any of them'
	),
	captionAt: new OneOf(CAPTION_PLACES, 'where a caption stands: "bottom" or "top"'),
	places: new RecordOf(A_PLACE, "places: an object of the format's own names, each a place")
};

/** Whether a side a film hands over is one a video holds: a whole count of pixels, even. */
function isFrameLength(written: unknown): written is number {
	return typeof written === 'number' && Number.isInteger(written) && written > 0 && written % PIXELS_PAIRED === 0;
}

function isScreenLength(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > 0;
}
