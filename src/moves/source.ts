/**
 * What stands over a part of the page, read off it as a move begins: a piece of the page (`src/moves/piece.ts`), an
 * outline round it (`src/moves/outline.ts`), a lens over it (`src/moves/lens.ts`). Each is born on the frame over its
 * source as the camera shows it then, cut to the part the camera shows, and stands on the frame after, the camera
 * moving on without it. A source shows as a box only through a window that faces the frame with its front, upright, so
 * each is refused while the window leans, rolls or shows its back; what is drawn from the page's picture is refused
 * too where the stage shows the page live, with no picture, and while the screen shows a page of the film's own in its
 * place.
 */
import { type Camera, boxOnTheFrame, screenShownBy } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { looksStraightAtTheFrame } from '../domain/eye.ts';
import { type Box, overlapOf, withAir } from '../domain/geometry.ts';
import { isFrontOn } from '../domain/stance.ts';
import { type Beginning, type Target, refuseWithoutThePicture, shownBox, targetSaid } from '../direction/move.ts';
import { cameraOf } from '../scene.ts';

/**
 * A source read off the page: the part of the screen it is, the part of the screen the camera shows, which the window's
 * corners round, and the box of the frame the camera shows the source in.
 */
export interface Source {
	readonly source: Box;
	readonly shown: Box;
	readonly box: Box;
}

// A source of the first block a selector matches, where the film names no more, and of the blocks alone, no air round
// them
export const ONE_BLOCK = 1;
export const NO_AIR = 0;
// What stands over a source stands in no place a film names: it is born where its source shows
export const NO_PLACE = null;

/**
 * The part of the screen a target stands over, the first `every` blocks a selector matches together or a box of the
 * screen, with so much air clear round it in the page's pixels, cut to the part a camera shows, and where the camera
 * shows that on the frame; refused where the camera shows none of it.
 */
export async function sourceOf(
	beginning: Beginning,
	camera: Camera,
	target: Target,
	every: number,
	air: number,
	move: string
): Promise<Source> {
	const shown = screenShownBy(camera, beginning.format);
	const block = withAir(await shownBox(beginning, target, every, move), air);
	const source = shown === null ? null : overlapOf(block, shown);
	if (shown === null || source === null) {
		throw new FilmError(`${move}'s ${targetSaid(target)} stands outside what the camera shows: frame it first`);
	}
	return { source, shown, box: boxOnTheFrame(camera, beginning.format.frame, source) };
}

/**
 * The scene's camera as a move begins that does what a refusal says it does, refused where its window leans, rolls or
 * shows its back, or the eye looks at it aslant or from behind its plane, as a box of the screen then shows on the
 * frame as no box, or a box turned over or rolled, and a box of the frame stands on the screen as none. An eye moved but looking straight
 * ahead from before the plane sees the window's plane as it is, only nearer, farther or aside.
 */
export function cameraFrontOn(beginning: Beginning, doing: string): Camera {
	const camera = cameraOf(beginning.scene, beginning.format);
	if (!isFrontOn(camera.view.angle)) {
		throw new FilmError(
			`${doing} only while the window faces the frame front on, upright: bring it so, window.lean({ tilt: 0, turn: 0, roll: 0, over: 0 })`
		);
	}
	if (!looksStraightAtTheFrame(camera.eye)) {
		throw new FilmError(
			`${doing} only while the eye looks straight ahead at the window from before it, its top up the frame: send it so, eye.to({ at, aim, up }), or back where it rests, eye.to('rest')`
		);
	}
	return camera;
}

/** What a move that stands over a source does, as a refusal says it. */
export function overItsSource(move: string): string {
	return `${move} stands over its source`;
}

/**
 * The scene's camera as a move of what is drawn from the page's picture begins: refused where the stage shows no
 * picture of the page, where the screen shows a page of the film's own in its place, and where its window does not
 * face the frame front on.
 */
export function cameraOverThePicture(beginning: Beginning, move: string): Camera {
	refuseWithoutThePicture(beginning, move);
	return cameraFrontOn(beginning, overItsSource(move));
}
