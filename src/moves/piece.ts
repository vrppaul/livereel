/**
 * Pieces of the page, shown by an object (`src/moves/object.ts`): a block, the first few blocks a selector matches, or
 * a box of the screen lifted off the page onto the frame, over where the camera shows it as it is lifted, cut to the
 * part the camera shows there (`src/moves/source.ts`); then carried, grown, brought near, turned and put away as any
 * object is, and taken back over its source as the camera shows it then, face-on and as large as it was. It does not
 * follow the camera between, until it is carried onto a block of the page: it lies on the page then, and the camera
 * frames it as it frames the page. A piece is drawn from the page's picture, so a page framed live, which has none, is
 * refused; and it stands over its source only on a window that faces the frame, where the source shows as a box.
 * Lifted `picture: 'held'`, it is drawn from a picture of its source alone, which the take holds as it is lifted, as
 * sharp as the page's picture is where the page stands still: it shows what the page showed there then, as the page
 * changes under it.
 * Lifted inside the world, it stands there over its source on the window's plane, wherever the eye stands, and the eye
 * moves past it as it moves past the window, the eye's focus blurring it as it stands off it; carried onto a block of
 * the page from there, it sets off from where it stands, while it lies on the window's plane.
 *
 * Lifted, it may leave a hole: the ground the page draws behind its block, read as it is lifted, or a colour the film
 * names, where a box of the screen, with no block behind it, needs one; and draw lines from itself to its source. Its
 * corners, and its hole's, are as round as the film names, square where it names none: the film knows how round a
 * block of its page is drawn, which no box read off the page says. Every move of it takes the piece named `piece`, or
 * the one the film names `as`.
 */
import { boxOnTheFrame } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { type Box, frameScaleOf } from '../domain/geometry.ts';
import {
	A_COLOUR,
	A_COUNT,
	A_PIXELS,
	type Form,
	type Kind,
	Literal,
	OfForm,
	OneOf,
	Plain,
	assertKind,
	assertWritten
} from '../domain/handed.ts';
import type { Place } from '../domain/place.ts';
import { A_TARGET, type Beginning, type Move, type Target } from '../direction/move.ts';
import { type Corners, FOLLOWING_THE_PAGE, type Hole, type Piece, type PiecePicture } from '../props/piece.ts';
import { A_STROKE, type Stroke } from '../props/stroke.ts';
import {
	type Coming,
	type EffectsScript,
	GOES_AS_IT_STANDS,
	GROUPED_FORM,
	type GroupedScript,
	type HideScript,
	NAMED_FORM,
	type NamedScript,
	type ObjectLeanScript,
	READ_AS_THE_WINDOW,
	type ShownKind,
	THE_STEPS_CURVE,
	type TakenScript,
	type ToScript,
	objectBack,
	objectEffects,
	objectHide,
	objectLean,
	objectOnto,
	objectShow,
	objectTo
} from './object.ts';
import {
	BORN_ON_THE_FRAME,
	type BornIn,
	NO_AIR,
	NO_PLACE,
	ONE_BLOCK,
	cameraOverThePicture,
	sourceOf
} from './source.ts';
import { IN_PLACE_SHOW_FORM, type InPlaceShowScript } from './way.ts';

/**
 * What fills the part of the screen a piece is lifted off: the ground the page draws behind its block, `'page'`, where
 * the film names none, or a colour in hex; and the line round its edge, where the film names one.
 */
export interface HoleScript {
	readonly ground?: string;
	readonly line?: Stroke;
}

/**
 * How a piece is lifted: off the first `every` blocks a selector matches, together, with `air` clear round them, in the
 * page's pixels; how round the corners of what it lifts are, `corner`, a radius in the page's pixels: a rounded card's
 * own `border-radius`, where it lifts the card alone and whole;
 * the hole it leaves and the line the lines from it to its source are drawn in, where the film names them; the
 * `picture` it is drawn from, the page's as it changes, `'following'`, where the film names none, or one of its source
 * held as it is lifted, `'held'`; how it comes up; which piece; the world it stands `inside`, which the eye moves
 * through, or the group it stands in, if either.
 */
export interface PieceScript extends InPlaceShowScript, NamedScript, GroupedScript {
	readonly every?: number;
	readonly air?: number;
	readonly corner?: number;
	readonly hole?: HoleScript;
	readonly lines?: Stroke;
	readonly picture?: PiecePicture['kind'];
	readonly inside?: 'world';
}

/** How a hole is filled, as a piece is made: with the ground the page draws behind a block a selector names, or a colour. */
type Filling =
	{ readonly kind: 'behind'; readonly selector: string } | { readonly kind: 'colour'; readonly colour: string };

/** A hole as a piece is made: how it is filled, and the line round its edge, if any. */
interface HoleAsked {
	readonly filling: Filling;
	readonly line: Stroke | null;
}

/**
 * What a piece is lifted with, as it is made: how many blocks, how much air round them, how round its corners are, the
 * hole it leaves, if any, its lines, if any, the kind of picture it is drawn from, and where it is born.
 */
interface Lifting {
	readonly every: number;
	readonly air: number;
	readonly corner: number;
	readonly hole: HoleAsked | null;
	readonly lines: Stroke | null;
	readonly picture: PiecePicture['kind'];
	readonly bornIn: BornIn;
}

const PIECE = 'piece' satisfies ShownKind;
// A piece's corners where the film names none: square, as its box
const SQUARE = 0;
// How near, in the page's pixels, an edge of a piece stands to an edge of what the camera shows to stand on it
const ON_THE_EDGE = 0.5;
// The word a film names the ground the page draws behind a block by, for a hole
const PAGES_GROUND = 'page';
const A_HOLE_GROUND: Kind<string> = new Plain(
	(written): written is string => written === PAGES_GROUND || A_COLOUR.is(written),
	`the ground the page draws behind the block, "${PAGES_GROUND}", or a colour in hex`
);
const HOLE_FORM: Form<HoleScript> = { ground: A_HOLE_GROUND, line: A_STROKE };
const PIECE_PICTURES = ['following', 'held'] as const satisfies readonly PiecePicture['kind'][];
const A_PIECE_PICTURE: Kind<PiecePicture['kind']> = new OneOf(
	PIECE_PICTURES,
	`what a piece is drawn from: "following", the page's picture as it changes, or "held", a picture of its source held as it is lifted`
);
const PIECE_FORM: Form<PieceScript> = {
	every: A_COUNT,
	air: A_PIXELS,
	corner: A_PIXELS,
	hole: new OfForm(HOLE_FORM, 'a hole: { ground, line }'),
	lines: A_STROKE,
	picture: A_PIECE_PICTURE,
	// A piece stands inside the world alone: it lies in the window only where it is carried onto the page (`onto`)
	inside: new Literal('world'),
	...IN_PLACE_SHOW_FORM,
	...NAMED_FORM,
	...GROUPED_FORM
};
/**
 * A piece of the page lifted off a target, a selector's first `every` blocks together or a box of the screen, over
 * where the camera shows it, cut to the part it shows, its corners as round as the film names, leaving the hole and
 * drawing the lines the film names, drawn from the picture the film names: in place of any piece of its name, in its
 * own way, fading up whole, or in a way of livereel's the film names. A hole over a box of the screen, which has no
 * block to read the ground behind, is refused unless the film names its colour.
 */
export function show(target: Target, script: PieceScript = {}): Move {
	assertKind(target, A_TARGET, "piece.show's target");
	assertWritten(script, PIECE_FORM, 'piece.show');
	const lifting: Lifting = {
		every: script.every ?? ONE_BLOCK,
		air: script.air ?? NO_AIR,
		corner: script.corner ?? SQUARE,
		hole: script.hole === undefined ? null : holeAsked(target, script.hole),
		lines: script.lines ?? null,
		picture: script.picture ?? FOLLOWING_THE_PAGE.kind,
		bornIn: script.inside ?? BORN_ON_THE_FRAME
	};
	return {
		...objectShow(PIECE, 'piece.show', script, NO_PLACE, THE_STEPS_CURVE, (beginning) =>
			lifted(beginning, target, lifting)
		),
		holdsThePage: lifting.picture === 'held'
	};
}

/**
 * The piece carried to a place, as large as the place holds its source, growing to `scale` and coming `depth` toward
 * the eye on the way where the film names them.
 */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(PIECE, 'piece.to', place, script, READ_AS_THE_WINDOW);
}

/**
 * The piece carried onto the first block a selector matches, or a box of the screen, as large as the block holds its
 * source, to lie on the page there: it lands on the block wherever the camera goes on its way, and keeps that place on
 * the screen after.
 */
export function onto(target: Target, script: TakenScript = {}): Move {
	return objectOnto(PIECE, 'piece.onto', target, script);
}

/** The piece leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled by `roll`. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(PIECE, 'piece.lean', script);
}

/**
 * The piece standing out as the film names: ringed, glowing, casting a shadow, blurred, grown or brought toward the eye
 * where it stands, lifting off the page.
 */
export function effects(script: EffectsScript): Move {
	return objectEffects(PIECE, 'piece.effects', script);
}

/**
 * The piece taken back over its source as the camera shows it then, face-on by its nearest whole turns, as large as
 * its source shows there and on the frame's plane.
 */
export function back(script: TakenScript = {}): Move {
	return objectBack(PIECE, 'piece.back', script, (beginning, shown) =>
		boxOnTheFrame(cameraOverThePicture(beginning, 'piece.back'), beginning.format.frame, shown.source)
	);
}

/** The piece going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(PIECE, 'piece.hide', script, GOES_AS_IT_STANDS);
}

/**
 * How the hole a film names is filled: with a colour it names, or with the ground behind the block a selector names;
 * refused for a box of the screen, which names no block.
 */
function holeAsked(target: Target, hole: HoleScript): HoleAsked {
	const ground = hole.ground ?? PAGES_GROUND;
	const line = hole.line ?? null;
	if (ground !== PAGES_GROUND) return { filling: { kind: 'colour', colour: ground }, line };
	if (typeof target !== 'string') {
		throw new FilmError(
			"piece.show's hole over a box of the screen finds no block to read the ground behind: name its colour, hole: { ground: '#rrggbb' }"
		);
	}
	return { filling: { kind: 'behind', selector: target }, line };
}

/**
 * A piece of the page over a target, cut to the part of it the camera shows, its corners as round as the film names,
 * the hole it leaves filled as the page draws it now and as round, drawn from the picture the film names, and the box
 * of the frame it shows there.
 */
async function lifted(beginning: Beginning, target: Target, lifting: Lifting): Promise<Coming> {
	const camera = cameraOverThePicture(beginning, 'piece.show');
	const { every, air, bornIn } = lifting;
	const { source, shown, box } = await sourceOf(beginning, camera, target, every, air, 'piece.show', bornIn);
	// The window's corner as the look rounds it on the frame, in the page's pixels as the camera shows them there
	const windowCorner =
		(beginning.scene.look.paneCorner * frameScaleOf(beginning.format.frame) * source.width) / box.width;
	const corners = cornersOf(source, shown, lifting.corner, windowCorner);
	const hole = lifting.hole === null ? null : await holeOf(beginning, lifting.hole, lifting.corner);
	const picture = await pictureOf(beginning, lifting.picture, source);
	const piece: Piece = { kind: PIECE, source, corners, hole, lines: lifting.lines, picture };
	return { content: piece, box };
}

/** The picture a piece is drawn from: the page's, or one of its source the take holds now, as the page stands. */
async function pictureOf(beginning: Beginning, kind: PiecePicture['kind'], source: Box): Promise<PiecePicture> {
	switch (kind) {
		case 'following':
			return FOLLOWING_THE_PAGE;
		case 'held':
			return { kind: 'held', number: await beginning.holdPicture(source) };
	}
}

/**
 * How round each corner of a piece is: as the film names, and as the window, where it is rounder, at a corner that
 * stands on a corner of what the camera shows, which the window rounds.
 */
function cornersOf(source: Box, shown: Box, corner: number, windowCorner: number): Corners {
	const left = standsOn(source.left, shown.left);
	const top = standsOn(source.top, shown.top);
	const right = standsOn(source.left + source.width, shown.left + shown.width);
	const bottom = standsOn(source.top + source.height, shown.top + shown.height);
	return {
		topLeft: left && top ? Math.max(corner, windowCorner) : corner,
		topRight: right && top ? Math.max(corner, windowCorner) : corner,
		bottomRight: right && bottom ? Math.max(corner, windowCorner) : corner,
		bottomLeft: left && bottom ? Math.max(corner, windowCorner) : corner
	};
}

/** Whether an edge of a piece stands on an edge of what the camera shows. */
function standsOn(edge: number, shownEdge: number): boolean {
	return Math.abs(edge - shownEdge) < ON_THE_EDGE;
}

/**
 * A hole as it is filled, with its colour or the ground the page draws behind its block as the move begins, its
 * corners as round as its piece's.
 */
async function holeOf(beginning: Beginning, asked: HoleAsked, corner: number): Promise<Hole> {
	switch (asked.filling.kind) {
		case 'colour':
			return { ground: asked.filling.colour, line: asked.line, corner };
		case 'behind':
			return { ground: await beginning.page.groundBehind(asked.filling.selector), line: asked.line, corner };
	}
}
