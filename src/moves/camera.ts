/**
 * The camera: to a pose, or onto a block of the page, inside whatever window stands (`src/moves/window.ts`), which
 * leans by its own move; the camera only chooses what of the page the window shows. On its way it may pass through
 * poses, or blocks it frames as it frames its own, on the course the film names (`src/moves/through.ts`).
 *
 * A move reads where the camera stands as it begins and aims it: at the film's pose, or at the block framed. What it
 * aims at, on its way and at its end, comes to a pose in the window as each frame is drawn (`seenThrough` in
 * `src/domain/camera.ts`), kept on the screen there as `keptOnTheScreen` keeps it, every pose of a path through keys
 * too: filling a window, and the whole frame with no edge of a face-on screen, leant or not. So a block framed stays
 * framed as the window travels, grows or leans, in the same step or after.
 */
import { A_POSE, type Aim, type Framing, type Pose, ZOOM_AT_MOST } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_COUNT, A_NUMBER, A_NUMBER_OR_ENDLESS, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import type { Through } from '../domain/path.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type TimingScript,
	propChange,
	shownPart,
	timingOf
} from '../direction/move.ts';
import { cameraOf } from '../scene.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/** The poses the camera passes on its way to its own, and how its path goes through them. */
export interface ToScript extends TimingScript, ThroughScript<Pose> {}

/**
 * How a film frames a block: the first `every` blocks a selector matches, `air` round them in the page's pixels, no
 * closer than `zoomAtMost`, a zoom as a pose has it (`Pose` in `src/domain/camera.ts`). In a window the page fills it
 * before all else: where the screen would not fill it at `zoomAtMost`, the camera comes closer, and the window shows
 * part of the page. The blocks it passes on its way, `through`, the first a selector matches or a box, are framed as
 * it frames its own.
 */
export interface OntoScript extends TimingScript, ThroughScript<Target> {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
}

// How much of the page shows round a block the camera frames
const AIR = 80;
const TO_FORM: Form<ToScript> = { ...throughFormOf(A_POSE, 'a list of poses'), ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = {
	every: A_COUNT,
	air: A_NUMBER,
	zoomAtMost: A_NUMBER_OR_ENDLESS,
	...throughFormOf(A_TARGET, 'a list of selectors and boxes of the screen'),
	...TIMING_FORM
};
// A box is one, where `every` counts the blocks a selector matches
const EVERY_OF_A_BOX = "camera.onto's every counts the blocks a selector matches: a box is one, so leave it out";

/** The camera to a pose, through the poses the film names on its way. */
export function to(pose: Pose, script: ToScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, TO_FORM, 'camera.to');
	const written = throughWritten(script, 'camera.to');
	const through: Through<Aim> = { ...written, keys: written.keys.map((key) => ({ kind: 'pose', pose: key })) };
	const aim: Aim = { kind: 'pose', pose };
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => aimedAt(standing(beginning), through, aim) };
}

/**
 * The camera onto the blocks a selector matches, or a box of the screen, with air round them, through the blocks the
 * film names on its way.
 */
export function onto(target: Target, script: OntoScript = {}): Move {
	assertKind(target, A_TARGET, "camera.onto's target");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	if (typeof target !== 'string' && script.every !== undefined) throw new FilmError(EVERY_OF_A_BOX);
	const through = throughWritten(script, 'camera.onto');
	return {
		part: 'camera',
		timing: timingOf(script),
		begin: (beginning) => framing(beginning, target, through, script)
	};
}

/** The camera on its way to a target, through the film's on the way, each framed with the film's air. */
async function framing(
	beginning: Beginning,
	target: Target,
	through: Through<Target>,
	script: OntoScript
): Promise<Change> {
	const framed: Framing = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	const keys: Aim[] = [];
	for (const key of through.keys) {
		keys.push({ kind: 'block', box: await shownPart(beginning, key, THE_FIRST, 'camera.onto'), framing: framed });
	}
	const box = await shownPart(beginning, target, script.every ?? THE_FIRST, 'camera.onto');
	return aimedAt(standing(beginning), { ...through, keys }, { kind: 'block', box, framing: framed });
}

/** The camera on its path from a pose, through aims, to an aim. */
function aimedAt(from: Pose, through: Through<Aim>, aim: Aim): Change {
	return propChange('camera', (progress) => ({ from, through, aim, progress }));
}

/** Where the camera stands as a move begins. */
function standing(beginning: Beginning): Pose {
	return cameraOf(beginning.scene, beginning.format).pose;
}
