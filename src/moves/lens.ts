/**
 * Lenses, shown by an object (`src/moves/object.ts`): a round glass of a size of its own, born round the middle of a
 * block of the page where the camera shows it and carried from block to block, showing the page under its middle
 * magnified past what the camera shows (`src/props/lens.ts`). Its size and its magnification are its own, never read
 * off the block, which may stand as wide as the page. A lens is drawn from the page's picture, so a page framed live is
 * refused, and reads its block only through a window that faces the frame (`src/moves/source.ts`). Every move of it
 * takes the lens named `lens`, or the one the film names `as`.
 */
import { type Box, frameScaleOf, resizedAbout } from '../domain/geometry.ts';
import { A_SIZE, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { A_TARGET, type Beginning, type Move, type Target } from '../direction/move.ts';
import { A_MAGNIFICATION, type Lens } from '../props/lens.ts';
import type { FrameObject } from '../props/object.ts';
import {
	type Coming,
	GROUPED_FORM,
	type GroupedScript,
	type HideScript,
	IN_PLACE_SHOW_FORM,
	type InPlaceShowScript,
	NAMED_FORM,
	type NamedScript,
	type ObjectKind,
	type TakenScript,
	objectCarriedTo,
	objectHide,
	objectShow
} from './object.ts';
import { NO_PLACE, ONE_BLOCK, cameraOverThePicture, sourceOf } from './source.ts';

/**
 * How a lens comes: how many times larger it shows the page than the camera does, how wide it is across, in pixels of a
 * frame 1080 high; how it comes up; which lens; the group it stands in, if any.
 */
export interface LensScript extends InPlaceShowScript, NamedScript, GroupedScript {
	readonly magnification?: number;
	readonly size?: number;
}

/** What a lens is born with: how many times larger it shows the page, and how wide it is, in pixels of a 1080 frame. */
interface Glass {
	readonly magnification: number;
	readonly size: number;
}

const LENS: ObjectKind = 'lens';
const LENS_FORM: Form<LensScript> = {
	magnification: A_MAGNIFICATION,
	size: A_SIZE,
	...IN_PLACE_SHOW_FORM,
	...NAMED_FORM,
	...GROUPED_FORM
};
// A lens shows the page twice as large as the camera does, and stands 320 pixels of a 1080 frame across, as wide for
// its frame as the board's loupe, where the film names neither
const MAGNIFIED_TWICE = 2;
const LENS_ACROSS = 320;

/**
 * A lens round the middle of the first block a selector matches, or a box of the screen, where the camera shows it, as
 * wide as the film names: in place of any lens of its name, in its own way, fading up whole, or in a way of livereel's
 * the film names, as `'grow'`, opened out of its middle.
 */
export function show(target: Target, script: LensScript = {}): Move {
	assertKind(target, A_TARGET, "lens.show's target");
	assertWritten(script, LENS_FORM, 'lens.show');
	const glass: Glass = {
		magnification: script.magnification ?? MAGNIFIED_TWICE,
		size: script.size ?? LENS_ACROSS
	};
	return objectShow(LENS, 'lens.show', script, NO_PLACE, (beginning) => over(beginning, target, glass));
}

/** The lens carried round the middle of another block, or a box of the screen, where the camera shows it then. */
export function to(target: Target, script: TakenScript = {}): Move {
	assertKind(target, A_TARGET, "lens.to's target");
	return objectCarriedTo(LENS, 'lens.to', script, (beginning, object) => roundIts(beginning, target, object));
}

/** The lens going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(LENS, 'lens.hide', script);
}

/** A lens round the middle of a target where the camera shows it, and its box there, as wide as its glass is. */
async function over(beginning: Beginning, target: Target, glass: Glass): Promise<Coming> {
	const camera = cameraOverThePicture(beginning, 'lens.show');
	const { box } = await sourceOf(beginning, camera, target, ONE_BLOCK, 'lens.show');
	const across = glass.size * frameScaleOf(beginning.format.frame);
	const lens: Lens = { kind: 'lens', magnification: glass.magnification };
	return { content: lens, box: resizedAbout(box, { width: across, height: across }) };
}

/** The box of a lens as large as it stands round the middle of a target where the camera shows it. */
async function roundIts(beginning: Beginning, target: Target, lens: FrameObject): Promise<Box> {
	const camera = cameraOverThePicture(beginning, 'lens.to');
	const { box } = await sourceOf(beginning, camera, target, ONE_BLOCK, 'lens.to');
	return resizedAbout(box, lens.box);
}
