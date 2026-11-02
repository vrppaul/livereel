/**
 * Outlines, shown by an object (`src/moves/object.ts`): a ring round a block, the first few blocks a selector matches,
 * or a box of the screen, born on the frame round where the camera shows it as it comes, cut to the part the camera
 * shows there, as a piece of the page is (`src/moves/source.ts`); drawn from no picture, so it rings a page framed live
 * as well. Then carried, grown, turned, taken back round its source and put away as any object is. Every move of it
 * takes the outline named `outline`, or the one the film names `as`.
 */
import { boxOnTheFrame } from '../domain/camera.ts';
import { A_COUNT, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import type { Place } from '../domain/place.ts';
import { A_TARGET, type Beginning, type Move, type Target } from '../direction/move.ts';
import type { Outline } from '../props/outline.ts';
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
import { NO_AIR, NO_PLACE, ONE_BLOCK, cameraFrontOn, sourceOf } from './source.ts';

/**
 * How an outline is drawn: round the first `every` blocks a selector matches, together; in a line; which outline; the
 * group it stands in, if any.
 */
export interface OutlineScript extends InPlaceShowScript, NamedScript, GroupedScript {
	readonly every?: number;
	readonly line?: Stroke;
}

const OUTLINE: ObjectKind = 'outline';
const OUTLINE_FORM: Form<OutlineScript> = {
	every: A_COUNT,
	line: A_STROKE,
	...IN_PLACE_SHOW_FORM,
	...NAMED_FORM,
	...GROUPED_FORM
};
// The line an outline is drawn in where the film names none
const SOLID: Stroke = 'solid';

/**
 * An outline round a target, a selector's first `every` blocks together or a box of the screen, where the camera shows
 * it, cut to the part it shows, in the line the film names, solid where it names none: in place of any outline of its
 * name, in its own way, fading up whole, or in a way of livereel's the film names.
 */
export function show(target: Target, script: OutlineScript = {}): Move {
	assertKind(target, A_TARGET, "outline.show's target");
	assertWritten(script, OUTLINE_FORM, 'outline.show');
	const every = script.every ?? ONE_BLOCK;
	const line = script.line ?? SOLID;
	return objectShow(OUTLINE, 'outline.show', script, NO_PLACE, (beginning) => ringed(beginning, target, every, line));
}

/** The outline carried to a place, filling it, growing to `scale` and coming `depth` toward the eye on the way. */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(OUTLINE, 'outline.to', place, script);
}

/** The outline leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled by `roll`. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(OUTLINE, 'outline.lean', script);
}

/**
 * The outline standing out as the film names: ringed, glowing, casting a shadow, blurred, grown or brought toward the
 * eye where it stands.
 */
export function effects(script: EffectsScript): Move {
	return objectEffects(OUTLINE, 'outline.effects', script);
}

/**
 * The outline taken back round its source as the camera shows it then, face-on by its nearest whole turns, as large as
 * its source shows there and on the frame's plane.
 */
export function back(script: TakenScript = {}): Move {
	return objectBack(OUTLINE, 'outline.back', script, (beginning, name) =>
		boxOnTheFrame(
			cameraFrontOn(beginning, 'outline.back'),
			beginning.format.frame,
			contentOf(beginning, name, 'outline.back', 'outline').source
		)
	);
}

/** The outline going where it stands, or sliding out past a side of the frame; once gone, there is none. */
export function hide(script: HideScript = {}): Move {
	return objectHide(OUTLINE, 'outline.hide', script);
}

/** An outline round a target, cut to the part of it the camera shows, and the box of the frame it shows there. */
async function ringed(beginning: Beginning, target: Target, every: number, line: Stroke): Promise<Coming> {
	const camera = cameraFrontOn(beginning, 'outline.show');
	const { source, box } = await sourceOf(beginning, camera, target, every, NO_AIR, 'outline.show');
	const outline: Outline = { kind: 'outline', source, line };
	return { content: outline, box };
}
