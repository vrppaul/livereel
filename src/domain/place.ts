/**
 * Where words stand on the frame: a place a film names, `whole` or a side of the frame, or a box in shares of the
 * frame or of another place, which may reach past the frame's edge.
 *
 * A side is where words stood beside a window on the side across (`wordsOn` in `split.ts`), so a film that names one
 * keeps livereel's split, and the whole frame is the frame inside the words' margin. A box is the film's own: in
 * shares of the place it names `of`, the whole frame where it names none, its left and top 0 and its width and height
 * 1 where it leaves them out, so `{ of: 'left', top: 0.22, height: 0.78 }` is the lower part of the left side. A place
 * is worked out once, as its move begins, in the frame's pixels, whole, so its edges fall on pixels.
 */
import { type Box, type Format, boxOf, wholePixels } from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, OneOf } from './handed.ts';
import { wordsMarginOf, wordsOn } from './split.ts';

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

const PLACE_SAID =
	'a place: "whole", "left", "right", "top" or "bottom", or { of, left, top, width, height }, each in shares';
// A box within a place starts at its top left corner and takes the whole of it where a film leaves its values out
const NONE = 0;
const WHOLE = 1;
const SIDES = 2;

/** A place as a film hands it: a name, or a box in shares whose `of` is a place again. */
class PlaceKind implements Kind<Place> {
	readonly names: OneOf<PlaceName>;
	readonly within: OfForm<PlaceWithin>;

	constructor() {
		this.names = new OneOf(PLACE_NAMES, PLACE_SAID);
		this.within = new OfForm<PlaceWithin>(
			{ of: this, left: A_NUMBER, top: A_NUMBER, width: A_NUMBER, height: A_NUMBER },
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

function placedBox(format: Format, place: Place): Box {
	if (typeof place === 'string') return place === 'whole' ? wholeInsideTheMargin(format) : wordsOn(format, place);
	return within(place.of === undefined ? boxOf(format.frame) : placedBox(format, place.of), place);
}

/** The frame inside the margin words keep from its edges. */
function wholeInsideTheMargin(format: Format): Box {
	const margin = wordsMarginOf(format);
	return {
		left: margin,
		top: margin,
		width: format.frame.width - SIDES * margin,
		height: format.frame.height - SIDES * margin
	};
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
