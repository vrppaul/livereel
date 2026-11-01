/**
 * Pieces of the page, shown by an object (`src/moves/object.ts`): a block, the first few blocks a selector matches, or
 * a box of the screen lifted off the page onto the frame, over where the camera shows it as it is lifted, cut to the
 * part the camera shows there; then carried, grown, brought near, turned and put away as any object is, and taken back
 * over its source as the camera shows it then, face-on and as large as it was. It does not follow the camera between.
 * A piece is drawn from the page's picture, so a page framed live, which has none, is refused; and it stands over its
 * source only on a window that faces the frame, where the source shows as a box. Every move of it takes the piece
 * named `piece`, or the one the film names `as`.
 */
import { type Camera, boxOnTheFrame, isFrontOn, screenShownBy } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { overlapOf } from '../domain/geometry.ts';
import { A_COUNT, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import type { Place } from '../domain/place.ts';
import { A_TARGET, type Beginning, type Move, type Target, shownBox, targetSaid } from '../direction/move.ts';
import type { Piece } from '../props/piece.ts';
import { cameraOf } from '../scene.ts';
import {
	type BackScript,
	type Coming,
	type HideScript,
	IN_PLACE_SHOW_FORM,
	type InPlaceShowScript,
	NAMED_FORM,
	type NamedScript,
	type ObjectKind,
	type ObjectLeanScript,
	type ToScript,
	contentOf,
	objectBack,
	objectHide,
	objectLean,
	objectShow,
	objectTo
} from './object.ts';

/** How a piece is lifted: off the first `every` blocks a selector matches, together; how it comes up; which piece. */
export interface PieceScript extends InPlaceShowScript, NamedScript {
	readonly every?: number;
}

const PIECE: ObjectKind = 'piece';
const PIECE_FORM: Form<PieceScript> = { every: A_COUNT, ...IN_PLACE_SHOW_FORM, ...NAMED_FORM };
// A piece of the first block a selector matches, where the film names no more
const ONE_BLOCK = 1;
// A piece lifted stands in no place a film names: it is born where its source shows
const NO_PLACE = null;

/**
 * A piece of the page lifted off a target, a selector's first `every` blocks together or a box of the screen, over
 * where the camera shows it, cut to the part it shows: in place of any piece of its name, in its own way, fading up
 * whole, or in a way of livereel's the film names.
 */
export function show(target: Target, script: PieceScript = {}): Move {
	assertKind(target, A_TARGET, "piece.show's target");
	assertWritten(script, PIECE_FORM, 'piece.show');
	const every = script.every ?? ONE_BLOCK;
	return objectShow(PIECE, 'piece.show', script, NO_PLACE, (beginning) => lifted(beginning, target, every));
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
 * The piece taken back over its source as the camera shows it then, face-on by its nearest whole turns, as large as
 * its source shows there and on the frame's plane.
 */
export function back(script: BackScript = {}): Move {
	return objectBack(PIECE, 'piece.back', script, (beginning, name) =>
		boxOnTheFrame(
			cameraOver(beginning, 'piece.back'),
			beginning.format.frame,
			contentOf(beginning, name, 'piece.back', 'piece').source
		)
	);
}

/** The piece going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(PIECE, 'piece.hide', script);
}

/** A piece of the page over a target, cut to the part of it the camera shows, and the box of the frame it shows there. */
async function lifted(beginning: Beginning, target: Target, every: number): Promise<Coming> {
	const camera = cameraOver(beginning, 'piece.show');
	const shown = screenShownBy(camera, beginning.format);
	const block = await shownBox(beginning, target, every, 'piece.show');
	const source = shown === null ? null : overlapOf(block, shown);
	if (source === null) {
		throw new FilmError(`piece.show's ${targetSaid(target)} stands outside what the camera shows: frame it first`);
	}
	const piece: Piece = { kind: 'piece', source };
	return { content: piece, box: boxOnTheFrame(camera, beginning.format.frame, source) };
}

/**
 * The camera a piece stands under over its source: the scene's, as a move begins, refused where the stage shows no
 * picture of the page to draw a piece from, or where its window leans or shows its back, as its source then shows as
 * no box, or a box turned over.
 */
function cameraOver(beginning: Beginning, move: string): Camera {
	if (beginning.pageShown !== 'pictured') {
		throw new FilmError(
			`${move} draws a piece from the page's picture, which a page framed live has none of: the film's page is 'dynamic'`
		);
	}
	const camera = cameraOf(beginning.scene, beginning.format);
	if (!isFrontOn(camera.view.angle)) {
		throw new FilmError(
			`${move} stands a piece over its source only while the window faces the frame front on: bring it face-on, window.lean({ tilt: 0, turn: 0 })`
		);
	}
	return camera;
}
