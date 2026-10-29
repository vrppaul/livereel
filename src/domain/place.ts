/**
 * Where words stand on the frame: a place a film names, `whole` or a side of the frame, or a box in shares of the
 * frame or of another place, which may reach past the frame's edge.
 *
 * A side is where words stood beside a window on the side across (`wordsOn` in `split.ts`), so a film that names one
 * keeps livereel's split, and `whole` is the frame inside the margin words keep from its edges. A box is the film's
 * own, exact: in shares of the place it names `of`, or of the frame edge to edge where it names none, its left and top
 * 0 and its width and height 1 where it leaves them out, so `{ of: 'left', top: 0.22, height: 0.78 }` is the lower part
 * of the left side. Words read from the left in a place, centred where it stands above, below or over the whole, as a
 * title stood in the split. A place is worked out once, as its move begins, in the frame's pixels, whole, so its
 * edges fall on pixels. What comes in from a side, or leaves toward one, travels from or to its box moved a whole
 * frame toward that side.
 */
import { type Box, type Format, type Size, boxOf, wholePixels } from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, OneOf, Plain } from './handed.ts';
import { type FrameSide, wordsOn, wordsWholeOn } from './split.ts';

const PLACE_NAMES = ['whole', 'left', 'right', 'top', 'bottom'] as const;

type PlaceName = (typeof PLACE_NAMES)[number];

/** A box in shares of another place, or of the frame where it names none. */
interface PlaceWithin {
	readonly of?: Place;
	readonly left?: number;
	readonly top?: number;
	readonly width?: number;
	readonly height?: number;
}

export type Place = PlaceName | PlaceWithin;

// How words in a place read: from its left, or centred across it
const ALIGNMENTS = ['start', 'center'] as const;

export type Alignment = (typeof ALIGNMENTS)[number];

export const AN_ALIGNMENT = new OneOf(ALIGNMENTS, 'how words read in their place: "start" or "center"');

const PLACE_SAID =
	'a place: "whole", "left", "right", "top" or "bottom", or { of, left, top, width, height }, each in shares';
// A box within a place starts at its top left corner and takes the whole of it where a film leaves its values out
const NONE = 0;
const WHOLE = 1;
const A_LENGTH_SHARE = new Plain(isMoreThanNone, 'a share more than none');
// The places words read centred in: across the frame, above or below a window
const READ_CENTRED: readonly Place[] = ['whole', 'top', 'bottom'];

/** A place as a film hands it: a name, or a box in shares whose `of` is a place again. */
class PlaceKind implements Kind<Place> {
	readonly names: OneOf<PlaceName>;
	readonly within: OfForm<PlaceWithin>;

	constructor() {
		this.names = new OneOf(PLACE_NAMES, PLACE_SAID);
		this.within = new OfForm<PlaceWithin>(
			{ of: this, left: A_NUMBER, top: A_NUMBER, width: A_LENGTH_SHARE, height: A_LENGTH_SHARE },
			PLACE_SAID
		);
	}

	is(written: unknown): written is Place {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		return typeof written === 'string' ? this.names.faultOf(written, place) : this.within.faultOf(written, place);
	}
}

export const A_PLACE: Kind<Place> = new PlaceKind();

/** Where words stand in a place, in the frame's pixels, whole. */
export function wordsPlaced(format: Format, place: Place): Box {
	return wholePixels(placedBox(format, place));
}

/** How words read in a place where the film names no way: centred above, below or over the whole, else from the left. */
export function alignmentIn(place: Place): Alignment {
	return READ_CENTRED.includes(place) ? 'center' : 'start';
}

/** Where a box starts as what stands in it comes up: past the frame's edge on the side it comes in from, or in place. */
export function enteringFrom(box: Box, from: FrameSide | null, frame: Size): Box {
	return from === null ? box : pastTheEdge(box, from, frame);
}

/**
 * A box moved a whole frame's width across, or its height down, toward a side: past the frame's edge there, and every
 * box moved so moves as far, so what slides out and what slides in together move as one sheet.
 */
export function pastTheEdge(box: Box, side: FrameSide, frame: Size): Box {
	switch (side) {
		case 'left':
			return { ...box, left: box.left - frame.width };
		case 'right':
			return { ...box, left: box.left + frame.width };
		case 'top':
			return { ...box, top: box.top - frame.height };
		case 'bottom':
			return { ...box, top: box.top + frame.height };
	}
}

function placedBox(format: Format, place: Place): Box {
	if (typeof place === 'string') return place === 'whole' ? wordsWholeOn(format) : wordsOn(format, place);
	return within(place.of === undefined ? boxOf(format.frame) : placedBox(format, place.of), place);
}

/** The part of a box a place takes, its shares of the box's width and height. */
function within(box: Box, place: PlaceWithin): Box {
	return {
		left: box.left + box.width * (place.left ?? NONE),
		top: box.top + box.height * (place.top ?? NONE),
		width: box.width * (place.width ?? WHOLE),
		height: box.height * (place.height ?? WHOLE)
	};
}

function isMoreThanNone(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > NONE;
}
