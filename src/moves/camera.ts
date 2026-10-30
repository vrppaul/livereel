/**
 * The camera: to a pose, or onto a block of the page, inside whatever window stands (`src/moves/window.ts`), which
 * leans by its own move; the camera only chooses what of the page the window shows.
 *
 * A move reads where the camera stands as it begins and aims it: at the film's pose, or at the block framed. What it
 * aims at comes to a pose in the window as each frame is drawn (`seenThrough` in `src/domain/camera.ts`), kept on the
 * screen there as `keptOnTheScreen` keeps it: filling a window, and the whole frame with no edge of a face-on screen,
 * leant or not. So a block framed stays framed as the window travels, grows or leans, in the same step or after.
 */
import { A_POSE, type Aim, type Pose, ZOOM_AT_MOST } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_COUNT, A_NUMBER, A_NUMBER_OR_ENDLESS, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type Target,
	type TimingScript,
	propChange,
	shownPart,
	timingOf
} from '../direction/move.ts';
import { cameraOf } from '../scene.ts';

/**
 * How a film frames a block: the first `every` blocks a selector matches, `air` round them in the page's pixels, no closer than
 * `zoomAtMost`, a zoom as a pose has it (`Pose` in `src/domain/camera.ts`). In a window the page fills it before all
 * else: where the screen would not fill it at `zoomAtMost`, the camera comes closer, and the window shows part of the
 * page.
 */
export interface OntoScript extends TimingScript {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
}

// How much of the page shows round a block the camera frames
const AIR = 80;
const ONTO_FORM: Form<OntoScript> = { every: A_COUNT, air: A_NUMBER, zoomAtMost: A_NUMBER_OR_ENDLESS, ...TIMING_FORM };
// A box is one, where `every` counts the blocks a selector matches
const EVERY_OF_A_BOX = "camera.onto's every counts the blocks a selector matches: a box is one, so leave it out";

/** The camera to a pose. */
export function to(pose: Pose, script: TimingScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, TIMING_FORM, 'camera.to');
	const aim: Aim = { kind: 'pose', pose };
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => aimedAt(standing(beginning), aim) };
}

/** The camera onto the blocks a selector matches, or a box of the screen, with air round them. */
export function onto(target: Target, script: OntoScript = {}): Move {
	assertKind(target, A_TARGET, "camera.onto's target");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	if (typeof target !== 'string' && script.every !== undefined) throw new FilmError(EVERY_OF_A_BOX);
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => framing(beginning, target, script) };
}

/** The camera on its way to a target, framed with the film's air. */
async function framing(beginning: Beginning, target: Target, script: OntoScript): Promise<Change> {
	const box = await shownPart(beginning, target, script.every ?? 1, 'camera.onto');
	const framed = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	return aimedAt(standing(beginning), { kind: 'block', box, framing: framed });
}

/** The camera on its way from a pose to an aim. */
function aimedAt(from: Pose, aim: Aim): Change {
	return propChange('camera', (progress) => ({ from, aim, progress }));
}

/** Where the camera stands as a move begins. */
function standing(beginning: Beginning): Pose {
	return cameraOf(beginning.scene, beginning.format).pose;
}
