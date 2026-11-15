/**
 * What stands over a part of the page, read off it as a move begins: a piece of the page (`src/moves/piece.ts`), an
 * outline round it (`src/moves/outline.ts`), a lens over it (`src/moves/lens.ts`). Each is born on the frame over its
 * source as the camera shows it then, cut to the part the camera shows, and stands on the frame after, the camera
 * moving on without it. One born in the world stands over its source on the window's plane wherever the eye stands, so
 * it is cut to the part of the screen the window's picture holds there, which an eye moved near or aside sees past what
 * the frame shows from where the eye rests. A source shows as a box only through a window that faces the frame with its
 * front, upright, so each is refused while the window leans, rolls or shows its back; what is drawn from the page's
 * picture is refused too where the stage shows the page live, with no picture, and while the screen shows a film's own
 * page in its place.
 */
import { type Camera, boxOnTheFrame, screenPicturedBy, screenShownBy } from '../domain/camera.ts';
import type { Format } from '../domain/format.ts';
import { FilmError } from '../domain/errors.ts';
import { looksStraightAtTheFrame } from '../domain/eye.ts';
import { type Box, overlapOf, withAir } from '../domain/geometry.ts';
import { isFrontOn } from '../domain/stance.ts';
import { type Beginning, type Target, refuseWithoutThePicture, shownBox, targetSaid } from '../direction/move.ts';
import { cameraOf } from '../scene.ts';

/**
 * A source read off the page: the part of the screen it is, the part of the screen it was cut to, which the window's
 * corners round, the box of the frame the camera shows the source in, and the blocks it was taken off, whole, as far
 * past what was cut to as they reach.
 */
export interface Source {
	readonly source: Box;
	readonly shown: Box;
	readonly box: Box;
	readonly whole: Box;
}

// A source of the first block a selector matches, where the film names no more, and of the blocks alone, no air round
// them
export const ONE_BLOCK = 1;
export const NO_AIR = 0;
// What stands over a source stands in no place a film names: it is born where its source shows
export const NO_PLACE = null;

/**
 * Where what stands over a source is born: on the frame, riding with the eye, over what the camera shows there; or in
 * the world, over its source on the window's plane wherever the eye stands, so over what the window's picture holds.
 */
export type BornIn = 'frame' | 'world';

// What is born over a source where the film stands it inside nothing, an outline and a lens always
export const BORN_ON_THE_FRAME: BornIn = 'frame';

/**
 * How a source is taken off its target: off the first `every` blocks a selector matches, together, with `air` clear
 * round them in the page's pixels, cut to the part of the screen what stands over it may stand over where it is born.
 */
export interface Taking {
	readonly every: number;
	readonly air: number;
	readonly bornIn: BornIn;
}

// A lens's source: the one block, with no air, born on the frame
export const ONE_BLOCK_ON_THE_FRAME: Taking = { every: ONE_BLOCK, air: NO_AIR, bornIn: BORN_ON_THE_FRAME };
// The part of the screen what is born over a source may stand over, as a refusal names it, by where it is born
const SHOWN_SAID: { readonly [Where in BornIn]: string } = {
	frame: 'what the camera shows',
	world: 'what the window shows of the screen'
};

/**
 * The part of the screen a target stands over, a selector's blocks or a box of the screen, taken as `taking` says, and
 * where the camera shows that on the frame, as from the eye at rest for what is born in the world; refused where the
 * part of the screen it may stand over holds none of it.
 */
export async function sourceOf(
	beginning: Beginning,
	camera: Camera,
	target: Target,
	taking: Taking,
	move: string
): Promise<Source> {
	const shown = screenUnder(camera, beginning.format, taking.bornIn);
	const block = withAir(await shownBox(beginning, target, taking.every, move), taking.air);
	const source = shown === null ? null : overlapOf(block, shown);
	if (shown === null || source === null) {
		throw new FilmError(`${move}'s ${targetSaid(target)} stands outside ${SHOWN_SAID[taking.bornIn]}: frame it first`);
	}
	return { source, shown, box: boxOnTheFrame(camera, beginning.format.frame, source), whole: block };
}

/**
 * The part of the screen what is born over a source may stand over: on the frame, what the camera shows there; in the
 * world, what the window's picture holds on its plane, wherever the eye stands. None where it is none of the screen.
 */
function screenUnder(camera: Camera, format: Format, bornIn: BornIn): Box | null {
	switch (bornIn) {
		case 'frame':
			return screenShownBy(camera, format);
		case 'world':
			return screenPicturedBy(camera, format);
	}
}

/**
 * The scene's camera as a move begins that does what a refusal says it does, refused where its window leans, rolls or
 * shows its back, or the eye looks at it aslant or from behind its plane, as a box of the screen then shows on the
 * frame as no box, or a box turned over or rolled, and a box of the frame stands on the screen as none. An eye moved
 * but looking straight ahead from before the plane sees the window's plane as it is, only nearer, farther or aside.
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
 * picture of the page, where the screen shows a film's own page in its place, and where its window does not face the
 * frame front on.
 */
export function cameraOverThePicture(beginning: Beginning, move: string): Camera {
	refuseWithoutThePicture(beginning, move);
	return cameraFrontOn(beginning, overItsSource(move));
}
