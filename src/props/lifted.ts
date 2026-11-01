/**
 * What a piece of the page (`src/props/piece.ts`) leaves on the page and draws to it, worked out from the objects as
 * the stage draws them. A hole stands on the screen, where the piece was lifted, so the camera and the window carry it
 * with the page, as the light: the piece keeps a box of the screen, not a block, and the hole keeps it too. Lines run
 * on the frame from the piece's source, as the camera shows it now, to the piece, as it is drawn now, grown, turned or
 * leant, as an inset's are drawn on a chart or a map: along the two edges of the outline round both that join one to the
 * other, so they cross neither box nor each other and move without a jump as the piece travels. There are none while
 * one holds the other, as while the piece stands over its source, nor while the two cross as a bar across a bar, where
 * the outline round both joins them four times. Both come and go with the piece.
 */
import { type Camera, onTheFrame } from '../domain/camera.ts';
import { type Box, type Point, type Segment, type Size, segmentBetween } from '../domain/geometry.ts';
import { type FrameObject, type ObjectName, drawnOnTheFrame } from './object.ts';
import { type Piece, figureIn } from './piece.ts';
import type { Stroke } from './stroke.ts';
import { presentShare } from './way.ts';

/**
 * A hole as the stage draws it: the name of the piece that left it, the part of the screen it fills, in the screen's
 * pixels, its colour, the line round its edge, if any, and how far it has come and not gone, as its piece has.
 */
export interface DrawnHole {
	readonly name: ObjectName;
	readonly source: Box;
	readonly ground: string;
	readonly line: Stroke | null;
	readonly shown: number;
}

/**
 * A piece's lines to its source as the stage draws them: the piece's name, the line they are drawn in, the two on the
 * frame, each from its source to the piece, and how far each is drawn out from its source, as far as its piece has come
 * and not gone.
 */
export interface DrawnLines {
	readonly name: ObjectName;
	readonly line: Stroke;
	readonly segments: readonly [Segment, Segment];
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

/** The holes the pieces among objects leave, each where its piece was lifted. */
export function drawnHoles(objects: readonly (readonly [ObjectName, FrameObject])[]): readonly DrawnHole[] {
	return piecesAmong(objects).flatMap(({ name, object, piece }) =>
		piece.hole === null ? [] : [{ name, source: piece.source, ...piece.hole, shown: presentShare(object) }]
	);
}

/**
 * The lines the pieces among objects draw to their sources, the page seen by a camera on a frame of a size; none from a
 * piece while its lines would stand nowhere.
 */
export function drawnLines(
	objects: readonly (readonly [ObjectName, FrameObject])[],
	camera: Camera,
	frame: Size
): readonly DrawnLines[] {
	return piecesAmong(objects).flatMap((standing) => linesDrawnBy(standing, camera, frame));
}

/** The objects that show a piece of the page, by name. */
function piecesAmong(objects: readonly (readonly [ObjectName, FrameObject])[]): readonly PieceStanding[] {
	return objects.flatMap(([name, object]) =>
		object.content.kind === 'piece' ? [{ name, object, piece: object.content }] : []
	);
}

/** A piece's lines to its source, if it draws them and they stand anywhere now. */
function linesDrawnBy(standing: PieceStanding, camera: Camera, frame: Size): readonly DrawnLines[] {
	const { name, object, piece } = standing;
	if (piece.lines === null) return [];
	const segments = linesOf(object, piece, camera, frame);
	return segments === null ? [] : [{ name, line: piece.lines, segments, drawn: presentShare(object) }];
}

/**
 * The two lines from a piece's source, as the camera shows it, to the piece as it is drawn: the edges of the outline
 * round both that join one to the other; none while one holds the other, or the outline joins them more than twice.
 */
function linesOf(object: FrameObject, piece: Piece, camera: Camera, frame: Size): readonly [Segment, Segment] | null {
	const source = sourceCorners(piece.source, camera, frame);
	const drawn = pieceCorners(object, piece, camera, frame);
	if (holds(source, drawn) || holds(drawn, source)) return null;
	const corners = [...ownedBy(source, 'source'), ...ownedBy(drawn, 'piece')];
	return linesAlong(pairsRound(outlineRound(corners)).filter((edge) => edge.start.of !== edge.end.of));
}

/** Where the corners of a box of the screen stand on the frame, as a camera shows them, in order round it. */
function sourceCorners(source: Box, camera: Camera, frame: Size): readonly Point[] {
	return CORNERS_ROUND.map((corner) => onTheFrame(camera, frame, pointOf(source, corner)));
}

/**
 * Where the corners of the part of a piece's box its source is drawn in stand on the frame, as the piece is drawn, in
 * order round it.
 */
function pieceCorners(object: FrameObject, piece: Piece, camera: Camera, frame: Size): readonly Point[] {
	const figure = sharesOf(figureIn(piece.source, object.box), object.box);
	return CORNERS_ROUND.map((corner) => drawnOnTheFrame(object, camera.view, frame, pointOf(figure, corner)));
}

/** A point of a box, given in shares of it, as a point of what the box stands in. */
function pointOf(box: Box, share: Point): Point {
	return { left: box.left + share.left * box.width, top: box.top + share.top * box.height };
}

/** A box in shares of a size it stands in. */
function sharesOf(box: Box, within: Size): Box {
	return {
		left: box.left / within.width,
		top: box.top / within.height,
		width: box.width / within.width,
		height: box.height / within.height
	};
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
