/**
 * Pictures of the film's own, shown by an object (`src/moves/object.ts`): an image file the film names by its path from
 * its own file, a mark or a logo, over the whole frame or in a place the film names (`src/domain/place.ts`), on the
 * frame, inside the page's window or the world, or in a group; then carried, grown, brought near, leant, set apart and
 * put away as any object is. It reads a place as a pane does, as large as the box holds all of it, in its middle,
 * standing as wide against as tall as its file decoded at, which the stage reads as it lays the film's pictures before
 * the first frame. Every move of it takes the picture named `picture`, or the one the film names `as`.
 */
import { boxOf } from '../domain/geometry.ts';
import { A_PATH, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, windowPlaced } from '../domain/place.ts';
import type { Beginning, Move } from '../direction/move.ts';
import type { FilmPicture } from '../props/picture.ts';
import {
	type Coming,
	NESTED_FORM,
	type NestedScript,
	SHOWN_STANDING_OUT_FORM,
	SHOW_FORM,
	type ShowScript,
	type ShownKind,
	type ShownStandingOutScript,
	THE_STEPS_CURVE,
	objectMovesOf,
	objectShow
} from './object.ts';

/**
 * Where a picture stands: `at` a place on the frame, or over the whole of it where none is named; the side it slides
 * in `from`, past the frame's edge, or the way it comes up in its place, `enter`; which picture it is, `as`; what it
 * stands `inside`, the page's window, its place then a box in the window's shares, or the world, or the `group` it
 * stands in; and how it stands out as it comes up, `effects`.
 */
export interface PictureScript extends ShowScript, NestedScript, ShownStandingOutScript {
	readonly at?: Place;
}

const PICTURE = 'picture' satisfies ShownKind;
const PICTURE_FORM: Form<PictureScript> = { at: A_PLACE, ...SHOW_FORM, ...NESTED_FORM, ...SHOWN_STANDING_OUT_FORM };

/**
 * A picture of the film's own coming up: in its place, or over the whole frame, fading up whole in its own way, or in
 * a way of livereel's or from past a side of the frame where the film names one.
 */
export function show(file: string, script: PictureScript = {}): Move {
	assertKind(file, A_PATH, "picture.show's file");
	assertWritten(script, PICTURE_FORM, 'picture.show');
	const place = script.at ?? null;
	const showing = objectShow(PICTURE, 'picture.show', script, place, THE_STEPS_CURVE, (beginning) =>
		pictureComing(beginning, file, place)
	);
	return { ...showing, pictures: [file] };
}

const PICTURE_MOVES = objectMovesOf(PICTURE);

/**
 * The picture carried to another place, as large as the place holds it, growing to `scale` and coming `depth` toward
 * the eye on the way where the film names them.
 */
export const to = PICTURE_MOVES.to;

/**
 * The picture leant back from its top edge by `tilt`, swung about its middle by `turn`, rolled by `roll` and turned
 * over by `over`.
 */
export const lean = PICTURE_MOVES.lean;

/**
 * The picture standing out as the film names: ringed, glowing, casting a shadow, blurred, melting toward a side, grown
 * or brought toward the eye where it stands.
 */
export const effects = PICTURE_MOVES.effects;

/** The picture going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export const hide = PICTURE_MOVES.hide;

/**
 * A picture and its box as its move begins: as wide against as tall as the stage decoded its file, over the whole frame
 * or in its place. The take lays every picture its steps show before the first frame, so one it has not is livereel's
 * fault.
 */
function pictureComing(beginning: Beginning, file: string, place: Place | null): Coming {
	const decoded = beginning.filmsPictures.get(file);
	if (decoded === undefined) throw new Error(`the take laid no picture ${file} on the stage, which its steps show`);
	const picture: FilmPicture = { kind: PICTURE, file, ...decoded };
	const format = beginning.format;
	const box = place === null ? boxOf(format.frame) : windowPlaced(format, place);
	return { content: picture, box };
}
