/**
 * What a piece of the page (`src/props/piece.ts`) leaves on the page and draws to it, worked out from the objects as
 * the stage draws them: the hole it leaves, the block of the filmed page it empties, and the lines it draws to its
 * source. A hole belongs to the page, not the screen, so it is drawn only while the screen shows that page; it stands
 * at a box of the screen, as the piece does, so the camera and the window carry it with the page.
 */
import type { Camera } from '../domain/camera.ts';
import { type Fraction, WHOLE } from '../domain/fraction.ts';
import {
	type Box,
	type Point,
	SQUARE_CORNERS,
	type Segment,
	type Size,
	boxOf,
	cornersReaching,
	middleX,
	middleY,
	placedFrom,
	pointAt,
	segmentBetween,
	sharesIn,
	withAir
} from '../domain/geometry.ts';
import {
	type Holders,
	type PageOfTheScreen,
	type Scrolled,
	cameraOnItsPage,
	isOnePage,
	onTheFrame,
	screenBoxUnder
} from '../domain/placement.ts';
import { type FrameObject, type ObjectEntry, type ObjectName, drawnOnTheFrame } from './object.ts';
import { type DrawnHole, type Hole, type InTheShade, type Piece, type PitStanding, figureIn } from './piece.ts';
import { type Screen, THE_FILMED_PAGE, pageShownBy } from './screen.ts';
import type { Stroke } from './stroke.ts';
import { presentShare, stillCovered } from './way.ts';

/** A piece's lines to its source as the stage draws them. */
export interface DrawnLines {
	readonly name: ObjectName;
	readonly line: Stroke;
	/** The two on the frame, each from its source to the piece. */
	readonly segments: readonly [Segment, Segment];
	/** How far each is drawn out from its source, as far as its piece has come and not gone. */
	readonly drawn: number;
}

/** A piece of the page standing on the frame, by its name. */
interface PieceStanding {
	readonly name: ObjectName;
	readonly object: FrameObject;
	readonly piece: Piece;
}

/** A corner where it is drawn on the frame, and whose it is: the source's, or the piece's. */
interface Corner {
	readonly point: Point;
	readonly of: 'source' | 'piece';
}

/** Two things one after another round an outline, an edge's ends. */
interface Pair<Item> {
	readonly start: Item;
	readonly end: Item;
}

// The corners of a box, in shares of it, in order round it
const CORNERS_ROUND: readonly Point[] = [
	{ left: 0, top: 0 },
	{ left: 1, top: 0 },
	{ left: 1, top: 1 },
	{ left: 0, top: 1 }
];
// How far from a straight line, as twice the area of the three points' triangle in square pixels of the frame, a point
// may stand and still count as on it: a matrix leaves the points it carries that close to a line they lie on
const ON_THE_LINE = 1e-6;
// The last thing of a list, and the one before it, counted from its end
const LAST = -1;
const BEFORE_THE_LAST = -2;
// A block a piece empties stands as a hole with no line round it, its corners square, sunk as no pit
const NO_LINE = null;
const NO_PIT = null;
// A pit the window's shade reaches not at all, its piece standing in no shade
const IN_NO_SHADE = null;

/**
 * The holes the pieces among objects leave on the screen while it shows a page, each where its piece was lifted, or,
 * riding its block, as far up the screen as the film has scrolled the blocks that carry its source since, in all: those
 * alone of pieces lifted off that page, as a hole is left in the page, not the screen; each pit as clear as the screen
 * has come up and wholly in the window's shade where its piece stands in it. And the blocks of that page the pieces
 * empty.
 */
export function drawnHoles(
	objects: readonly ObjectEntry[],
	scrolled: Scrolled,
	screen: Pick<Screen, 'shows' | 'shown'>
): readonly DrawnHole[] {
	const page = pageShownBy(screen.shows);
	return piecesAmong(objects).flatMap((standing) => [
		...holeLeftBy(standing, page, scrolled, screen.shown),
		...(isOnePage(THE_FILMED_PAGE, page) ? blockEmptiedBy(standing) : [])
	]);
}

/** The hole a piece leaves, as the stage draws it, while the screen shows the page it was lifted off; none else. */
function holeLeftBy(
	{ name, object, piece }: PieceStanding,
	page: PageOfTheScreen,
	scrolled: Scrolled,
	screenShown: Fraction
): readonly DrawnHole[] {
	if (piece.hole === null || !isOnePage(piece.liftedOff, page)) return [];
	const source = screenBoxUnder(piece.source, object.inside, scrolled);
	const pitStanding = { clear: screenShown, shaded: pitShaded(piece.inTheShade) };
	return [drawnHole(name, source, piece.hole, object, pitStanding)];
}

/**
 * How far the window's shade reaches a pit: wholly where its piece stands in the shade, however far the piece has
 * risen, as a pit is a hole in the page and the shade reaches all of the page; a pit cleared as its piece rose would
 * stand out light from the faded page round it. Not at all where its piece stands in no shade.
 */
function pitShaded(inTheShade: InTheShade | null): Fraction | null {
	return inTheShade === null ? IN_NO_SHADE : WHOLE;
}

/**
 * A hole as the stage draws it on the screen: over its piece's source and as far past it each way as it reaches, its
 * corners as much rounder, as far as its piece has come and not gone; its pit, if any, as clear as the screen has come
 * up and wholly in the window's shade where its piece stands in it.
 */
function drawnHole(
	name: ObjectName,
	source: Box,
	hole: Hole,
	object: FrameObject,
	pitStanding: PitStanding
): DrawnHole {
	const { reach, pit, ...drawn } = hole;
	return {
		...drawn,
		name,
		box: withAir(source, reach),
		corners: cornersReaching(hole.corners, reach),
		shown: presentShare(object),
		pit: pit === null ? null : { ...pit, ...pitStanding }
	};
}

/**
 * The block of the filmed page a piece empties, if any, as the stage draws it: the part of it the piece's wipe has not
 * crossed, whole, none once the wipe has passed it; in any other way, all of it, as far as the piece has come and not
 * gone.
 */
function blockEmptiedBy({ name, object, piece }: PieceStanding): readonly DrawnHole[] {
	if (piece.emptied === null) return [];
	const present = presentShare(object);
	const covered = stillCovered(object.way, present, figureOnThePage(object, piece), piece.emptied.box);
	if (covered === null) return [];
	const { ground } = piece.emptied;
	const shown = object.way.kind === 'wipe' ? WHOLE : present;
	return [{ name, box: covered, ground, line: NO_LINE, corners: SQUARE_CORNERS, shown, pit: NO_PIT }];
}

/**
 * Where a piece's figure stands on the screen while it lies on the page, in the screen's pixels: the part of its box
 * its source is drawn in, grown about the box's middle as far as the piece stands grown.
 */
export function figureOnThePage(object: FrameObject, piece: Piece): Box {
	const figure = placedFrom(figureIn(piece.source, object.box), object.box);
	const middle = { left: middleX(object.box), top: middleY(object.box) };
	return {
		left: middle.left + (figure.left - middle.left) * object.scale,
		top: middle.top + (figure.top - middle.top) * object.scale,
		width: figure.width * object.scale,
		height: figure.height * object.scale
	};
}

/**
 * The lines the pieces among objects draw to their sources, on a frame of a size, among the holders as they stand, the
 * page seen by their camera; none from a piece while its lines would stand nowhere.
 */
export function drawnLines(objects: readonly ObjectEntry[], holders: Holders, frame: Size): readonly DrawnLines[] {
	return piecesAmong(objects).flatMap((standing) => linesDrawnBy(standing, holders, frame));
}

/** The objects that show a piece of the page, by name. */
function piecesAmong(objects: readonly ObjectEntry[]): readonly PieceStanding[] {
	return objects.flatMap(([name, object]) =>
		object.content.kind === 'piece' ? [{ name, object, piece: object.content }] : []
	);
}

/** A piece's lines to its source, if it draws them and they stand anywhere now. */
function linesDrawnBy(standing: PieceStanding, holders: Holders, frame: Size): readonly DrawnLines[] {
	const { name, object, piece } = standing;
	if (piece.lines === null) return [];
	const segments = linesOf(object, piece, holders, frame);
	return segments === null ? [] : [{ name, line: piece.lines, segments, drawn: presentShare(object) }];
}

/**
 * The two lines from a piece's source, as the holders' camera shows it on its page where that page lies now, to the
 * piece as it is drawn: the edges of the outline round both that join one to the other, as an inset's are drawn on a
 * chart, so they cross neither box nor each other and move without a jump as the piece travels; none while one holds
 * the other, or the outline joins them more than twice.
 */
function linesOf(object: FrameObject, piece: Piece, holders: Holders, frame: Size): readonly [Segment, Segment] | null {
	const source = sourceCorners(piece.source, cameraOnItsPage(object.inside, holders), frame);
	const drawn = pieceCorners(object, piece, holders, frame);
	if (holds(source, drawn) || holds(drawn, source)) return null;
	const corners = [...ownedBy(source, 'source'), ...ownedBy(drawn, 'piece')];
	return linesAlong(pairsRound(outlineRound(corners)).filter((edge) => edge.start.of !== edge.end.of));
}

/** Where the corners of a box of the screen stand on the frame, as a camera shows them, in order round it. */
function sourceCorners(source: Box, camera: Camera, frame: Size): readonly Point[] {
	return CORNERS_ROUND.map((corner) => onTheFrame(camera, frame, pointAt(source, corner)));
}

/**
 * Where the corners of the part of a piece's box its source is drawn in stand on the frame, as the piece is drawn in
 * what it stands in, in order round it.
 */
function pieceCorners(object: FrameObject, piece: Piece, holders: Holders, frame: Size): readonly Point[] {
	const figure = sharesIn(figureIn(piece.source, object.box), boxOf(object.box));
	return CORNERS_ROUND.map((corner) => drawnOnTheFrame(object, holders, frame, pointAt(figure, corner)));
}

/** The corners of the source, or of the piece, each told whose it is. */
function ownedBy(points: readonly Point[], of: Corner['of']): readonly Corner[] {
	return points.map((point) => ({ point, of }));
}

/** Whether a box as drawn, its corners in order round it, holds all of another, an edge of it counting as in it. */
function holds(outer: readonly Point[], inner: readonly Point[]): boolean {
	return inner.every((point) => standsIn(outer, point));
}

/** Whether a point stands in a box as drawn, or on its edge: on the same side of every edge of it, going round. */
function standsIn(corners: readonly Point[], point: Point): boolean {
	const turns = pairsRound(corners).map((edge) => turnOf(edge.start, edge.end, point));
	return turns.every((turn) => turn >= -ON_THE_LINE) || turns.every((turn) => turn <= ON_THE_LINE);
}

/**
 * The outline round a set of corners, the corners it passes through in order round it: the lower and upper runs of the
 * corners sorted across, each kept turning one way (Andrew's monotone chain).
 */
function outlineRound(corners: readonly Corner[]): readonly Corner[] {
	const sorted = [...corners].sort(acrossThenDown);
	const lower = runTurningOneWay(sorted);
	const upper = runTurningOneWay(sorted.toReversed());
	// Each run ends on the corner the other starts from
	return [...lower.slice(0, LAST), ...upper.slice(0, LAST)];
}

function acrossThenDown(first: Corner, second: Corner): number {
	return first.point.left - second.point.left || first.point.top - second.point.top;
}

/** A run through corners in order, each corner that would bend it back, or stand on its line, left out. */
function runTurningOneWay(corners: readonly Corner[]): readonly Corner[] {
	const run: Corner[] = [];
	for (const corner of corners) {
		while (bendsBack(run, corner)) run.pop();
		run.push(corner);
	}
	return run;
}

/** Whether a corner, taken after the last two of a run, bends it back or carries it straight on. */
function bendsBack(run: readonly Corner[], corner: Corner): boolean {
	const before = run.at(BEFORE_THE_LAST);
	const last = run.at(LAST);
	return before !== undefined && last !== undefined && turnOf(before.point, last.point, corner.point) <= ON_THE_LINE;
}

/**
 * How far a point turns from a line through two others, as twice the area of their triangle: one way more than none,
 * the other way less, on the line none.
 */
function turnOf(origin: Point, through: Point, point: Point): number {
	return (
		(through.left - origin.left) * (point.top - origin.top) - (through.top - origin.top) * (point.left - origin.left)
	);
}

/** Each thing of an outline and the one after it, the last with the first. */
function pairsRound<Item>(items: readonly Item[]): readonly Pair<Item>[] {
	const pairs: Pair<Item>[] = [];
	let start = items.at(LAST);
	for (const end of items) {
		if (start !== undefined) pairs.push({ start, end });
		start = end;
	}
	return pairs;
}

/** Two lines, each along an edge that joins the source to the piece, from the source; none where there are not two. */
function linesAlong(joins: readonly Pair<Corner>[]): readonly [Segment, Segment] | null {
	const [first, second, ...more] = joins;
	if (first === undefined || second === undefined || more.length > 0) return null;
	return [fromTheSource(first), fromTheSource(second)];
}

function fromTheSource(join: Pair<Corner>): Segment {
	return join.start.of === 'source'
		? segmentBetween(join.start.point, join.end.point)
		: segmentBetween(join.end.point, join.start.point);
}
