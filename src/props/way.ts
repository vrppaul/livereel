/**
 * How an object, whatever it shows, a caption or keys comes up in its place or goes from it in a way of livereel's, in
 * place of the way what it shows comes up of itself: faded in; out from behind an edge of its figure, as from under a
 * mask; wiped in from an edge; opened from the middle of its box, as an iris; or grown from there. It goes in a way as
 * it came in one, the way run back.
 *
 * A way brings the figure whole — its words, its pane, the card's lines — and only that: a ground it stands on comes up
 * in its own way meanwhile (`presencesIn`). The way is worked out here into numbers the stage draws on the part it
 * holds the figure in (`stage/stage.css`), which reaches past the figure's box so a shadow comes with it; how far the
 * figure's points move on its way is counted here too, for the motion blur.
 */
import { type Fraction, NONE, WHOLE } from '../domain/fraction.ts';
import {
	type Box,
	CORNER_SHARES,
	type FrameSide,
	MIDDLE_SHARE,
	type Point,
	type PointMoved,
	type Size,
	UNMOVED,
	boxOf,
	distanceBetween,
	overlapOf,
	pointAt
} from '../domain/geometry.ts';
import { type Kind, OneOf } from '../domain/handed.ts';
import { acrossFrom } from '../domain/place.ts';

/** The ways a film names for an object to come up in its place or go from it. */
const WAYS = ['fade', 'mask', 'wipe', 'iris', 'grow'] as const;

export type WayName = (typeof WAYS)[number];

export const A_WAY: Kind<WayName> = new OneOf(
	WAYS,
	'how an object comes up in its place or goes from it: "fade", "mask", "wipe", "iris" or "grow"'
);

/** The ways that come from an edge of the figure, so a film may name the edge: a mask, a wipe. */
const FROM_AN_EDGE = ['mask', 'wipe'] as const satisfies readonly WayName[];

type FromAnEdge = (typeof FROM_AN_EDGE)[number];

/**
 * The light a wipe trails behind its edge: its colour, in hex, the look's accent where it is none, and how far behind
 * the edge it trails, a share of the figure across the wipe's way. The edge cuts on past the far side as far as the
 * light trails, so the light runs off the figure before the way ends, rather than vanish whole as it ends.
 */
export interface Sheen {
	readonly colour: string | null;
	readonly trail: number;
}

/**
 * How an object comes up or goes: in its own way, as what it shows comes up of itself, or in a way of livereel's, a
 * mask's and a wipe's from an edge of its figure, a wipe's with the sheen it trails, if any, crossing a box in shares
 * of its figure: the figure itself, or a box wider than it.
 */
export type Way =
	| { readonly kind: 'own' }
	| { readonly kind: Exclude<WayName, FromAnEdge> }
	| { readonly kind: 'mask'; readonly edge: FrameSide }
	| { readonly kind: 'wipe'; readonly edge: FrameSide; readonly sheen: Sheen | null; readonly crossing: Box };

export type Wipe = Extract<Way, { readonly kind: 'wipe' }>;

/**
 * A wipe's sheen as far as the wipe has come: the side of the figure the wipe cuts from, and how far in from that side
 * of the box it crosses the light runs, from where it has faded to the edge, each a share of that box across the way,
 * past it either side where the light runs past it there; its colour; and the box it crosses, in shares of the figure,
 * which the light lies over.
 */
export interface SheenOnItsWay {
	readonly from: FrameSide;
	readonly faded: number;
	readonly edge: number;
	readonly colour: string | null;
	readonly crossing: Box;
}

/**
 * Where a wipe's edge sets off across the way, in shares of its figure from the side it cuts from, before it where the
 * box it crosses reaches past it; and how far the box reaches from there across the way.
 */
interface Span {
	readonly near: number;
	readonly length: number;
}

/** How far what comes up and goes has come up and gone. */
export interface Presence {
	readonly shown: Fraction;
	readonly gone: Fraction;
}

/** What comes up and goes in a way, and how far it has. */
export interface WayCome extends Presence {
	readonly way: Way;
}

/** How far an object's ground and its figure have come up and gone. */
export interface Presences {
	readonly ground: Presence;
	readonly figure: Presence;
}

/** The sides of a box, each a share of the box and the reach past it on both sides. */
interface Sides {
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

/**
 * A figure cut from each side, 0 cutting nothing of it and the reach past it, 1 all of it, less than 0 leaving more; or
 * round its middle, as far as a share of the radius that takes in its corners and the reach.
 */
type Cut = ({ readonly kind: 'inset' } & Sides) | { readonly kind: 'circle'; readonly radius: number };

/** How far a figure stands shifted across and down, in shares of its box and the reach past it on both sides. */
interface Shift {
	readonly across: number;
	readonly down: number;
}

/**
 * A figure as far as its way has come: its shift, how large and how clear it is, how strong its shadow, each from 0 to
 * 1, and its cut, if any.
 */
export interface OnItsWay {
	readonly shift: Shift;
	readonly scale: number;
	readonly clear: number;
	readonly shadow: number;
	readonly cut: Cut | null;
}

/** An object come up in its own way. */
export const OWN_WAY: Way = { kind: 'own' };

/** What a wipe crosses where it crosses its figure alone, in shares of the figure. */
export const THE_FIGURE: Box = { left: 0, top: 0, width: 1, height: 1 };

// The end of a way, how far it has come there; what it has still to go is this less how far it has come
const END_OF_WAY = 1;
// All of what comes up and goes, of which a share has gone
const ALL = 1;
// A figure as large and as clear as it is, and its shadow as strong
const OWN_SIZE = 1;
const FULLY_CLEAR = 1;
const FULL_SHADOW = 1;
const UNSHIFTED: Shift = { across: 0, down: 0 };
const UNCUT: Sides = { top: 0, right: 0, bottom: 0, left: 0 };
// A figure on its way as it stands whole, before its way's own numbers
const AS_IT_STANDS: OnItsWay = {
	shift: UNSHIFTED,
	scale: OWN_SIZE,
	clear: FULLY_CLEAR,
	shadow: FULL_SHADOW,
	cut: null
};
// What comes up and goes there whole: come up, and not going
const PRESENT_WHOLE: Presence = { shown: WHOLE, gone: NONE };
// The sides a cut is measured on; the far edge of a box, in shares of it from its near one; and a cut that moves
// nowhere
const SIDES_CUT: readonly FrameSide[] = ['top', 'right', 'bottom', 'left'];
const FAR_EDGE = 1;
const NO_CUT_MOVED: readonly PointMoved[] = [];
const HALVES = 2;
// The edge a mask comes from, below the figure, rising, and the edge a wipe comes from, its left, where none is named
const MASKED_FROM: FrameSide = 'bottom';
const WIPED_FROM: FrameSide = 'left';
// A wipe trailing no light, as one does where the film names none, and how far behind its edge that is
export const NO_SHEEN = null;
const NO_TRAIL = 0;
// Which way each edge lies from the figure's middle, across and down
const TOWARD: { readonly [Side in FrameSide]: Shift } = {
	top: { across: 0, down: -1 },
	bottom: { across: 0, down: 1 },
	left: { across: -1, down: 0 },
	right: { across: 1, down: 0 }
};

/** Whether a way comes from an edge of the figure, so a film may name the edge. */
export function comesFromAnEdge(name: WayName): name is FromAnEdge {
	return FROM_AN_EDGE.some((edged) => edged === name);
}

/**
 * The way a film names, from the edge it names for a mask or a wipe, or the way's own; its own way where it names none.
 */
export function wayNamed(name: WayName | null, edge: FrameSide | null): Way {
	switch (name) {
		case null:
			return OWN_WAY;
		case 'mask':
			return { kind: name, edge: edge ?? MASKED_FROM };
		case 'wipe':
			return { kind: name, edge: edge ?? WIPED_FROM, sheen: NO_SHEEN, crossing: THE_FIGURE };
		case 'fade':
		case 'iris':
		case 'grow':
			return { kind: name };
	}
}

/**
 * How far an object's ground and its figure stand, the object as far as `presence` along: alike in its own way; in a
 * way of livereel's, the ground as far along, in its own way, and the figure whole, for its way to bring.
 */
export function presencesIn(way: Way, presence: Presence): Presences {
	return { ground: presence, figure: way.kind === OWN_WAY.kind ? presence : PRESENT_WHOLE };
}

/** How much of what comes up and goes is there: as far as it has come up and not yet gone. */
export function presentShare(presence: Presence): number {
	return presence.shown * (ALL - presence.gone);
}

/**
 * A figure `progress` of its way in, or as far as it stands on its way out; none on its way, standing whole, at the end
 * of a way and in its own way always, as what it shows comes up of itself. A way that cuts it has its shadow as strong
 * as the way has come, so the cut, which crosses the shadow with a hard line, crosses a faint one.
 */
export function alongItsWay(way: Way, progress: number): OnItsWay | null {
	return progress >= END_OF_WAY ? null : onItsWayAt(way, progress);
}

/** A figure `progress` of its way in, and at its end as it stands there; none in its own way. */
function onItsWayAt(way: Way, progress: number): OnItsWay | null {
	const stillToGo = END_OF_WAY - progress;
	switch (way.kind) {
		case 'own':
			return null;
		case 'fade':
			return { ...AS_IT_STANDS, clear: progress };
		case 'mask': {
			const shift = shiftedToward(way.edge, stillToGo);
			return { ...AS_IT_STANDS, shift, shadow: progress, cut: { kind: 'inset', ...cutWhereItStands(shift) } };
		}
		case 'wipe':
			return {
				...AS_IT_STANDS,
				shadow: progress,
				cut: { kind: 'inset', ...UNCUT, [acrossFrom(way.edge)]: wipedIn(way, stillToGo) }
			};
		case 'iris':
			return { ...AS_IT_STANDS, shadow: progress, cut: { kind: 'circle', radius: progress } };
		case 'grow':
			return { ...AS_IT_STANDS, scale: progress };
	}
}

/**
 * How far a wipe with so much of its way still to go has cut its figure, in from the side it cuts from, in shares of
 * the figure: from the near side of the box it crosses as far across it, and across the sheen's trail past it.
 */
function wipedIn(wipe: Wipe, stillToGo: number): number {
	const span = spanOf(wipe);
	return span.near + stillToGo * (span.length + (wipe.sheen?.trail ?? NO_TRAIL));
}

/** Where the box a wipe crosses sets off from the side it cuts from, and how far it reaches across the way. */
function spanOf(wipe: Wipe): Span {
	const { left, top, width, height } = wipe.crossing;
	switch (acrossFrom(wipe.edge)) {
		case 'left':
			return { near: left, length: width };
		case 'right':
			return { near: FAR_EDGE - (left + width), length: width };
		case 'top':
			return { near: top, length: height };
		case 'bottom':
			return { near: FAR_EDGE - (top + height), length: height };
	}
}

/**
 * A wipe's sheen `progress` of its way in, or as far as it stands on its way out: trailing its edge on the side it has
 * cut, in shares of the box the wipe crosses. None in any way but a wipe with a sheen, nor at the end of a way, where
 * the figure stands whole.
 */
export function sheenAlong(way: Way, progress: number): SheenOnItsWay | null {
	if (way.kind !== 'wipe' || way.sheen === null || progress >= END_OF_WAY) return null;
	const span = spanOf(way);
	const edge = wipedIn(way, END_OF_WAY - progress);
	return {
		from: acrossFrom(way.edge),
		faded: (edge - way.sheen.trail - span.near) / span.length,
		edge: (edge - span.near) / span.length,
		colour: way.sheen.colour,
		crossing: way.crossing
	};
}

/**
 * The part of a block a figure's wipe `progress` of its way in has not crossed, the figure and the block in the same
 * pixels: all of it on no way and in any other way, none once the edge has passed it.
 */
export function stillCovered(way: Way, progress: number, figure: Box, block: Box): Box | null {
	if (way.kind !== 'wipe' || progress >= END_OF_WAY) return block;
	const cut = wipedIn(way, END_OF_WAY - progress);
	// The block laid with its near side on the edge, past it on the side the wipe has not reached: what of the block it
	// overlaps is what stays covered
	switch (acrossFrom(way.edge)) {
		case 'left':
			return overlapOf(block, { ...block, left: figure.left + cut * figure.width });
		case 'right':
			return overlapOf(block, { ...block, left: figure.left + (FAR_EDGE - cut) * figure.width - block.width });
		case 'top':
			return overlapOf(block, { ...block, top: figure.top + cut * figure.height });
		case 'bottom':
			return overlapOf(block, { ...block, top: figure.top + (FAR_EDGE - cut) * figure.height - block.height });
	}
}

/**
 * The points of a figure that move from where it stood on its way to where it stands, in shares of its box of a size:
 * each corner, as its way shifts and grows it and as what it shows moves in its box by `moved`, and a point on each
 * side of its cut.
 */
export function figureMoved(start: WayCome, end: WayCome, box: Size, moved: Point): readonly PointMoved[] {
	const startWay = alongItsWay(start.way, presentShare(start));
	const endWay = alongItsWay(end.way, presentShare(end));
	return [
		...CORNER_SHARES.map((corner) => ({
			start: figurePointOn(startWay, corner),
			end: movedBy(figurePointOn(endWay, corner), moved)
		})),
		...cutMoved(start, end, box)
	];
}

/**
 * How far the figure of what lies over the whole frame, a caption or keys, moves on the frame from where it stood on
 * its way to where it stands, in the frame's pixels: the farthest any of its points goes.
 */
export function figureShiftOver(start: WayCome, end: WayCome, frame: Size): number {
	const whole = boxOf(frame);
	return Math.max(
		...figureMoved(start, end, frame, UNMOVED).map((point) =>
			distanceBetween(pointAt(whole, point.start), pointAt(whole, point.end))
		)
	);
}

/** A point moved so far, in shares of a box. */
function movedBy(point: Point, moved: Point): Point {
	return { left: point.left + moved.left, top: point.top + moved.top };
}

/**
 * Where a point of a figure, in shares of its box, stands on its way: shifted and grown about the box's middle as far
 * as the way has come, or where it stands whole on none. The shift is counted in shares of the box alone, short of the
 * reach past it the stage draws the shift over, as far as a shadow falls.
 */
function figurePointOn(onItsWay: OnItsWay | null, point: Point): Point {
	const way = onItsWay ?? AS_IT_STANDS;
	return {
		left: MIDDLE_SHARE.left + (point.left - MIDDLE_SHARE.left) * way.scale + way.shift.across,
		top: MIDDLE_SHARE.top + (point.top - MIDDLE_SHARE.top) * way.scale + way.shift.down
	};
}

/**
 * How a figure's cut moves from where it stood on its way to where it stands, in a box of a size: a point on each of
 * its sides, in shares of the box, as the figure's shift and growth carry it; at the end of its way, the cut stands as
 * the way ends it, opened whole. None where the figure is cut in the same way at neither, as in a way that cuts nothing
 * or one in place of another. A mask's cut stands still as its figure rises out of it; a wipe's edge and an iris's ring
 * move over a figure that stands.
 */
function cutMoved(start: WayCome, end: WayCome, box: Size): readonly PointMoved[] {
	const startWay = onItsWayAt(start.way, Math.min(presentShare(start), END_OF_WAY));
	const endWay = onItsWayAt(end.way, Math.min(presentShare(end), END_OF_WAY));
	const startCut = startWay?.cut ?? null;
	const endCut = endWay?.cut ?? null;
	if (startCut === null || endCut === null || startCut.kind !== endCut.kind) return NO_CUT_MOVED;
	const startPoints = cutPointsOf(startCut, box);
	const endPoints = cutPointsOf(endCut, box);
	return SIDES_CUT.map((side) => ({
		start: figurePointOn(startWay, startPoints[side]),
		end: figurePointOn(endWay, endPoints[side])
	}));
}

/**
 * Where a cut stands on each side of a figure, in shares of its box of a size: a point at the middle of each side an
 * inset cuts, or where a ring crosses the lines across and down the box's middle.
 */
function cutPointsOf(cut: Cut, box: Size): { readonly [Side in FrameSide]: Point } {
	switch (cut.kind) {
		case 'inset':
			return {
				top: { left: MIDDLE_SHARE.left, top: cut.top },
				right: { left: FAR_EDGE - cut.right, top: MIDDLE_SHARE.top },
				bottom: { left: MIDDLE_SHARE.left, top: FAR_EDGE - cut.bottom },
				left: { left: cut.left, top: MIDDLE_SHARE.top }
			};
		case 'circle': {
			// A ring's radius is a share of how far the box's corners stand from its middle
			const radius = (cut.radius * Math.hypot(box.width, box.height)) / HALVES;
			const across = radius / box.width;
			const down = radius / box.height;
			return {
				top: { left: MIDDLE_SHARE.left, top: MIDDLE_SHARE.top - down },
				right: { left: MIDDLE_SHARE.left + across, top: MIDDLE_SHARE.top },
				bottom: { left: MIDDLE_SHARE.left, top: MIDDLE_SHARE.top + down },
				left: { left: MIDDLE_SHARE.left - across, top: MIDDLE_SHARE.top }
			};
		}
	}
}

/** A figure shifted toward an edge by a share of its box and the reach past it. */
function shiftedToward(edge: FrameSide, share: number): Shift {
	const toward = TOWARD[edge];
	return { across: toward.across * share, down: toward.down * share };
}

/**
 * A figure's cut, nothing of it cut where it stands whole, moved back by its shift, so it stands there: the stage cuts
 * a figure in its own place, which the shift carries with it.
 */
function cutWhereItStands(shift: Shift): Sides {
	return {
		top: UNCUT.top - shift.down,
		right: UNCUT.right + shift.across,
		bottom: UNCUT.bottom + shift.down,
		left: UNCUT.left - shift.across
	};
}
