/**
 * The camera: to a pose, or onto a block of the page, at the angle it stands at or another, inside whatever window
 * stands (`src/moves/window.ts`).
 *
 * A move reads where the camera stands as it begins and aims it: at the film's pose, or at the block framed. What it
 * aims at comes to a pose in the window as each frame is drawn (`seenThrough` in `src/domain/camera.ts`), kept on the
 * screen there as `keptOnTheScreen` keeps it: filling a window at any angle, which an angle leans with the screen in
 * it, and the whole frame face-on. So a block framed stays framed as the window travels or grows, in the same step or
 * after.
 */
import { A_POSE, type Aim, type Angle, type Pose } from '../domain/camera.ts';
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

/** An angle of the camera's own: `tilt` and `turn` in degrees; one left out stays as the camera's end has it. */
export interface AngleScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
}

/**
 * How a film frames a block: the first `every` blocks a selector matches, `air` round them in the page's pixels, no closer than
 * `zoomAtMost`, a zoom as a pose has it (`Pose` in `src/domain/camera.ts`). In a window the page fills it before all
 * else: where the screen would not fill it at `zoomAtMost`, the camera comes closer, and the window shows part of the
 * page.
 */
export interface OntoScript extends AngleScript {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
}

// How much of the page shows round a block the camera frames, and how close it may come
const AIR = 80;
const ZOOM_AT_MOST = 2.2;
const ANGLE_FORM: Form<AngleScript> = { tilt: A_NUMBER, turn: A_NUMBER, ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = { every: A_COUNT, air: A_NUMBER, zoomAtMost: A_NUMBER_OR_ENDLESS, ...ANGLE_FORM };
// A box is one, where `every` counts the blocks a selector matches
const EVERY_OF_A_BOX = "camera.onto's every counts the blocks a selector matches: a box is one, so leave it out";

/** The camera to a pose. */
export function to(pose: Pose, script: AngleScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, ANGLE_FORM, 'camera.to');
	const aim: Aim = { kind: 'pose', pose: { ...pose, ...angleAs(pose, script) } };
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => aimedAt(standing(beginning), aim) };
}

/** The camera onto the blocks a selector matches, or a box of the screen, with air round them. */
export function onto(target: Target, script: OntoScript = {}): Move {
	assertKind(target, A_TARGET, "camera.onto's target");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	if (typeof target !== 'string' && script.every !== undefined) throw new FilmError(EVERY_OF_A_BOX);
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => framing(beginning, target, script) };
}

/** The camera on its way to a target, framed at the angle it stands at or the film's. */
async function framing(beginning: Beginning, target: Target, script: OntoScript): Promise<Change> {
	const box = await shownPart(beginning, target, script.every ?? 1, 'camera.onto');
	const from = standing(beginning);
	const framed = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	return aimedAt(from, { kind: 'block', box, framing: framed, angle: angleAs(from, script) });
}

/** The camera on its way from a pose to an aim. */
function aimedAt(from: Pose, aim: Aim): Change {
	return propChange('camera', (progress) => ({ from, aim, progress }));
}

/** Where the camera stands as a move begins. */
function standing(beginning: Beginning): Pose {
	return cameraOf(beginning.scene, beginning.format).pose;
}

/** The angle a film asks for; one it leaves out stays as it stands. */
function angleAs(current: Angle, script: AngleScript): Angle {
	return { tilt: script.tilt ?? current.tilt, turn: script.turn ?? current.turn };
}
