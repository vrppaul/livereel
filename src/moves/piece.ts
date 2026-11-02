/**
 * Pieces of the page, shown by an object (`src/moves/object.ts`): a block, the first few blocks a selector matches, or
 * a box of the screen lifted off the page onto the frame, over where the camera shows it as it is lifted, cut to the
 * part the camera shows there (`src/moves/source.ts`); then carried, grown, brought near, turned and put away as any
 * object is, and taken back over its source as the camera shows it then, face-on and as large as it was. It does not
 * follow the camera between. A piece is drawn from the page's picture, so a page framed live, which has none, is
 * refused; and it stands over its source only on a window that faces the frame, where the source shows as a box.
 *
 * Lifted, it may leave a hole: the ground the page draws behind its block, read as it is lifted, or a colour the film
 * names, where a box of the screen, with no block behind it, needs one; and draw lines from itself to its source. Every
 * move of it takes the piece named `piece`, or the one the film names `as`.
 */
import { boxOnTheFrame } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_COLOUR, A_COUNT, type Form, type Kind, OfForm, Plain, assertKind, assertWritten } from '../domain/handed.ts';
import type { Place } from '../domain/place.ts';
import { A_TARGET, type Beginning, type Move, type Target } from '../direction/move.ts';
import type { Hole, Piece } from '../props/piece.ts';
import { A_STROKE, type Stroke } from '../props/stroke.ts';
import {
	type Coming,
	type EffectsScript,
	GROUPED_FORM,
	type GroupedScript,
	type HideScript,
	IN_PLACE_SHOW_FORM,
	type InPlaceShowScript,
	NAMED_FORM,
	type NamedScript,
	type ObjectKind,
	type ObjectLeanScript,
	type TakenScript,
	type ToScript,
	contentOf,
	objectBack,
	objectEffects,
	objectHide,
	objectLean,
	objectShow,
	objectTo
} from './object.ts';
import { NO_PLACE, ONE_BLOCK, cameraOverThePicture, sourceOf } from './source.ts';

/**
 * What fills the part of the screen a piece is lifted off: the ground the page draws behind its block, `'page'`, where
 * the film names none, or a colour in hex; and the line round its edge, where the film names one.
 */
export interface HoleScript {
	readonly ground?: string;
	readonly line?: Stroke;
}

/**
 * How a piece is lifted: off the first `every` blocks a selector matches, together; the hole it leaves and the line the
 * lines from it to its source are drawn in, where the film names them; how it comes up; which piece; the group it
 * stands in, if any.
 */
export interface PieceScript extends InPlaceShowScript, NamedScript, GroupedScript {
	readonly every?: number;
	readonly hole?: HoleScript;
	readonly lines?: Stroke;
}

/** How a hole is filled, as a piece is made: with the ground the page draws behind a block a selector names, or a colour. */
type Filling =
	{ readonly kind: 'behind'; readonly selector: string } | { readonly kind: 'colour'; readonly colour: string };

/** A hole as a piece is made: how it is filled, and the line round its edge, if any. */
interface HoleAsked {
	readonly filling: Filling;
	readonly line: Stroke | null;
}

/** What a piece is lifted with, as it is made: how many blocks, the hole it leaves, if any, and its lines, if any. */
interface Lifting {
	readonly every: number;
	readonly hole: HoleAsked | null;
	readonly lines: Stroke | null;
}

const PIECE: ObjectKind = 'piece';
// The word a film names the ground the page draws behind a block by, for a hole
const PAGES_GROUND = 'page';
const A_HOLE_GROUND: Kind<string> = new Plain(
	(written): written is string => written === PAGES_GROUND || A_COLOUR.is(written),
	`the ground the page draws behind the block, "${PAGES_GROUND}", or a colour in hex`
);
const HOLE_FORM: Form<HoleScript> = { ground: A_HOLE_GROUND, line: A_STROKE };
const PIECE_FORM: Form<PieceScript> = {
	every: A_COUNT,
	hole: new OfForm(HOLE_FORM, 'a hole: { ground, line }'),
	lines: A_STROKE,
	...IN_PLACE_SHOW_FORM,
	...NAMED_FORM,
	...GROUPED_FORM
};
/**
 * A piece of the page lifted off a target, a selector's first `every` blocks together or a box of the screen, over
 * where the camera shows it, cut to the part it shows, leaving the hole and drawing the lines the film names: in place
 * of any piece of its name, in its own way, fading up whole, or in a way of livereel's the film names. A hole over a box
 * of the screen, which has no block to read the ground behind, is refused unless the film names its colour.
 */
export function show(target: Target, script: PieceScript = {}): Move {
	assertKind(target, A_TARGET, "piece.show's target");
	assertWritten(script, PIECE_FORM, 'piece.show');
	const lifting: Lifting = {
		every: script.every ?? ONE_BLOCK,
		hole: script.hole === undefined ? null : holeAsked(target, script.hole),
		lines: script.lines ?? null
	};
	return objectShow(PIECE, 'piece.show', script, NO_PLACE, (beginning) => lifted(beginning, target, lifting));
}

/**
 * The piece carried to a place, as large as the place holds its source, growing to `scale` and coming `depth` toward
 * the eye on the way where the film names them.
 */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(PIECE, 'piece.to', place, script);
}

/** The piece leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled by `roll`. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(PIECE, 'piece.lean', script);
}

/**
 * The piece standing out as the film names: ringed, glowing, casting a shadow, blurred, or brought toward the eye where
 * it stands, lifting off the page.
 */
export function effects(script: EffectsScript): Move {
	return objectEffects(PIECE, 'piece.effects', script);
}

/**
 * The piece taken back over its source as the camera shows it then, face-on by its nearest whole turns, as large as
 * its source shows there and on the frame's plane.
 */
export function back(script: TakenScript = {}): Move {
	return objectBack(PIECE, 'piece.back', script, (beginning, name) =>
		boxOnTheFrame(
			cameraOverThePicture(beginning, 'piece.back'),
			beginning.format.frame,
			contentOf(beginning, name, 'piece.back', 'piece').source
		)
	);
}

/** The piece going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(PIECE, 'piece.hide', script);
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
 * A piece of the page over a target, cut to the part of it the camera shows, the hole it leaves filled as the page
 * draws it now, and the box of the frame it shows there.
 */
async function lifted(beginning: Beginning, target: Target, lifting: Lifting): Promise<Coming> {
	const camera = cameraOverThePicture(beginning, 'piece.show');
	const { source, box } = await sourceOf(beginning, camera, target, lifting.every, 'piece.show');
	const hole = lifting.hole === null ? null : await holeOf(beginning, lifting.hole);
	const piece: Piece = { kind: 'piece', source, hole, lines: lifting.lines };
	return { content: piece, box };
}

/** A hole as it is filled: with its colour, or the ground the page draws behind its block as the move begins. */
async function holeOf(beginning: Beginning, asked: HoleAsked): Promise<Hole> {
	switch (asked.filling.kind) {
		case 'colour':
			return { ground: asked.filling.colour, line: asked.line };
		case 'behind':
			return { ground: await beginning.page.groundBehind(asked.filling.selector), line: asked.line };
	}
}
