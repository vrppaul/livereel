/**
 * Where words and the page's window stand on the frame: a place a film names, `whole` or a side of the frame, or a box
 * in shares of the frame or of another place, which may reach past the frame's edge.
 *
 * A name is a place of livereel's split (`split.ts`), as what stands there reads it: on a side, words take their
 * share and the window the whole room across from the words' share on the other side, so words and a window named
 * on sides across from each other stand clear of each other, the split's gap between; `whole` is, for words, the frame
 * inside the margin they keep from its edges, and for the window the frame itself, edge to edge, where it lies flat. A
 * box is the film's own, exact: in shares of the place it names `of`, as what stands in it reads that name, or of the
 * frame edge to edge where it names none, its left and top 0 and its width and height 1 where it leaves them out, so
 * `{ of: 'left', top: 0.22, height: 0.78 }` is the lower part of the left side. Words read from the left in a place,
 * centred where it stands above, below or over the whole, as a title stood in the split. A place is worked out once,
 * as its move begins, in the frame's pixels, whole, so its edges fall on pixels. What comes in from a side, or leaves
 * toward one, travels from or to its box moved a whole frame toward that side. A note's words stand beyond the window
 * on one side of it, where their line meets them.
 *
 * A format may name places of its own (`places` in `src/domain/format.ts`), each a place of livereel's, another of its
 * own, or a box in either, so a film names `words` once and each format says where they stand. An own name is the
 * place it names, read as what stands there reads it: `page: 'right'` is the window's room on the right for the window,
 * the words' share there for words. A name that is none of these is refused where it is read, as a move begins; a
 * format's own names are read through once as the film is defined, so one that names none, or stands in itself, is
 * refused before anything is shot.
 */
import { FilmError } from './errors.ts';
import type { Format } from './format.ts';
import {
	type Box,
	FRAME_SIDES,
	type FrameSide,
	type Point,
	type Size,
	boxOf,
	resizedAbout,
	wholePixels
} from './geometry.ts';
import { A_NUMBER, type Kind, OfForm, OneOf, Plain } from './handed.ts';
import { windowOn, wordsOn, wordsWholeOn } from './split.ts';

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

/** A place: by a name, livereel's (`PLACE_NAMES`) or one its format gives, or a box in shares. */
export type Place = string | PlaceWithin;

/** How far a box stands beyond a window toward a side of the frame. */
interface SideGap {
	readonly side: FrameSide;
	readonly gap: number;
}

// How words in a place read: from its left, or centred across it
const ALIGNMENTS = ['start', 'center'] as const;

export type Alignment = (typeof ALIGNMENTS)[number];

export const AN_ALIGNMENT = new OneOf(ALIGNMENTS, 'how words read in their place: "start" or "center"');

const PLACE_SAID =
	'a place: "whole", "left", "right", "top", "bottom" or a name its format gives, or { of, left, top, width, height }, each in shares';
const A_PLACE_NAME = new Plain(isSomeName, PLACE_SAID);
// How a refusal says livereel's own places
const LIVEREELS_PLACES_SAID = 'whole, left, right, top or bottom';
// A format's own names are read through from none
const NOT_THROUGH_ANY: readonly string[] = [];
// A box within a place starts at its top left corner and takes the whole of it where a film leaves its values out
const NONE = 0;
const WHOLE = 1;
// How far a slide toward a side moves along the frame's other way: not at all
const NOT_ALONG = 0;
// The side of the frame across from each
const ACROSS: Readonly<Record<FrameSide, FrameSide>> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };
const A_LENGTH_SHARE = new Plain(isMoreThanNone, 'a share more than none');
// The places words read centred in: across the frame, above or below a window
const READ_CENTRED: readonly Place[] = ['whole', 'top', 'bottom'];

/**
 * A place as a film hands it: a name, or a box in shares whose `of` is a place again. Which names a format gives is
 * read where the place is, so a name is checked here only for being one.
 */
class PlaceKind implements Kind<Place> {
	readonly names: Plain<string>;
	readonly within: OfForm<PlaceWithin>;

	constructor() {
		this.names = A_PLACE_NAME;
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
	return wholePixels(placedBox(format, place, wordsNamed, NOT_THROUGH_ANY));
}

/** Where the page's window stands in a place, in the frame's pixels, whole. */
export function windowPlaced(format: Format, place: Place): Box {
	return wholePixels(placedBox(format, place, windowNamed, NOT_THROUGH_ANY));
}

/**
 * A format's own places, refused where they are refused as the film is defined, by where the format stands: a name of
 * livereel's taken, or a place that names none or stands in itself, for words or the window alike.
 */
export function assertOwnPlaces(format: Format, place: string): void {
	const ownNames = Object.keys(format.places ?? {});
	const taken = ownNames.find(isPlaceName);
	if (taken !== undefined) {
		throw new FilmError(
			`${place}'s places name ${taken}, a place of livereel's: name the format's own places otherwise`
		);
	}
	for (const name of ownNames) {
		wordsPlaced(format, name);
		windowPlaced(format, name);
	}
}

/**
 * The side of the frame whose words' share stands clearest of a window, the widest gap between them: across from the
 * window, for one in a side's room.
 */
export function sideClearestOf(format: Format, window: Box): FrameSide {
	return widestOf(FRAME_SIDES.map((side) => ({ side, gap: gapToward(side, wordsOn(format, side), window) }))).side;
}

/**
 * The side of a window a box stands beyond, the widest gap between them; none where the box reaches over the window
 * toward every side.
 */
export function sideBeyond(box: Box, window: Box): FrameSide | null {
	const widest = widestOf(FRAME_SIDES.map((side) => ({ side, gap: gapToward(side, box, window) })));
	return widest.gap > NONE ? widest.side : null;
}

/**
 * How words read in a place where the film names no way: centred above, below or over the whole, else from the left;
 * in a format's own place, as in the place it names.
 */
export function alignmentIn(format: Format, place: Place): Alignment {
	return READ_CENTRED.includes(namedThrough(format, place, NOT_THROUGH_ANY)) ? 'center' : 'start';
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
	const shift = frameToward(side, frame);
	return { ...box, left: box.left + shift.left, top: box.top + shift.top };
}

/** How far a whole frame lies toward a side: its width across, or its height down, in the frame's pixels. */
export function frameToward(side: FrameSide, frame: Size): Point {
	switch (side) {
		case 'left':
			return { left: -frame.width, top: NOT_ALONG };
		case 'right':
			return { left: frame.width, top: NOT_ALONG };
		case 'top':
			return { left: NOT_ALONG, top: -frame.height };
		case 'bottom':
			return { left: NOT_ALONG, top: frame.height };
	}
}

/**
 * Words' box resized where they stand: about its middle, and from its left edge where they read from the left, so a
 * title taking another place's size keeps where it reads from.
 */
export function wordsResized(box: Box, size: Size, align: Alignment): Box {
	const centred = resizedAbout(box, size);
	switch (align) {
		case 'start':
			return { ...centred, left: box.left };
		case 'center':
			return centred;
	}
}

/** The side of the frame across from a side: where what a slide in from it pushes off leaves toward. */
export function acrossFrom(side: FrameSide): FrameSide {
	return ACROSS[side];
}

/**
 * The box of a place, its names read as what stands there reads them, a format's own through the place it names; the
 * format's own names read on the way there are those `through`.
 */
function placedBox(
	format: Format,
	place: Place,
	named: (format: Format, name: PlaceName) => Box,
	through: readonly string[]
): Box {
	if (typeof place !== 'string') {
		return within(place.of === undefined ? boxOf(format.frame) : placedBox(format, place.of, named, through), place);
	}
	if (isPlaceName(place)) return named(format, place);
	return placedBox(format, ownPlace(format, place, through), named, [...through, place]);
}

/** A place with a format's own names read through to the place they name at last: livereel's name, or a box. */
function namedThrough(format: Format, place: Place, through: readonly string[]): Place {
	if (typeof place !== 'string' || isPlaceName(place)) return place;
	return namedThrough(format, ownPlace(format, place, through), [...through, place]);
}

/**
 * The place a format's own name names, read after the names `through`: refused where the format names none so, or
 * where the name is one of those, as a place standing in itself.
 */
function ownPlace(format: Format, name: string, through: readonly string[]): Place {
	if (through.includes(name)) {
		const way = [...through.slice(1), name].join(', ');
		throw new FilmError(
			`the place "${through[0] ?? name}" stands in itself, through ${way}: a place stands in another`
		);
	}
	const places = format.places ?? {};
	const place = Object.hasOwn(places, name) ? places[name] : undefined;
	if (place === undefined) throw new FilmError(`the place "${name}" is none: ${placesSaid(format)}`);
	return place;
}

/** The places a format has, as a refusal says them: livereel's, and the format's own. */
function placesSaid(format: Format): string {
	const ownNames = Object.keys(format.places ?? {});
	if (ownNames.length === 0) return `a place is ${LIVEREELS_PLACES_SAID}, and its format names none of its own`;
	return `a place is ${LIVEREELS_PLACES_SAID}, or one its format names: ${ownNames.join(', ')}`;
}

/** Where words stand by a name: their share of a side, or the frame inside their margin. */
function wordsNamed(format: Format, name: PlaceName): Box {
	return name === 'whole' ? wordsWholeOn(format) : wordsOn(format, name);
}

/** Where the window stands by a name: the room across from the words' share on the other side, or the frame itself. */
function windowNamed(format: Format, name: PlaceName): Box {
	return name === 'whole' ? boxOf(format.frame) : windowOn(format, name);
}

/** How far a box stands beyond a window toward a side of the frame: less than none where it reaches over it there. */
function gapToward(side: FrameSide, box: Box, window: Box): number {
	switch (side) {
		case 'left':
			return window.left - (box.left + box.width);
		case 'right':
			return box.left - (window.left + window.width);
		case 'top':
			return window.top - (box.top + box.height);
		case 'bottom':
			return box.top - (window.top + window.height);
	}
}

/** The widest gap; the first of those as wide. */
function widestOf(gaps: readonly SideGap[]): SideGap {
	return gaps.reduce((widest, next) => (next.gap > widest.gap ? next : widest));
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

function isPlaceName(name: string): name is PlaceName {
	return PLACE_NAMES.some((placeName) => placeName === name);
}

/** Whether a film wrote a name, a string with something in it. */
function isSomeName(written: unknown): written is string {
	return typeof written === 'string' && written.length > 0;
}

function isMoreThanNone(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > NONE;
}
