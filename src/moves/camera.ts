/**
 * The camera: to a pose, or onto a block of the page, at the angle it stands at or another.
 *
 * A face-on camera's end is kept on the screen as `covering` in `src/domain/camera.ts` keeps it.
 */
import { A_POSE, type Pose, angled, covering, isFaceOn, onto as framedOnto, poseToward } from '../domain/camera.ts';
import type { Format } from '../domain/geometry.ts';
import {
	A_COUNT,
	A_NUMBER,
	A_NUMBER_OR_ENDLESS,
	A_SELECTOR,
	type Form,
	assertKind,
	assertWritten
} from '../domain/handed.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	shownBox,
	timingOf
} from '../direction/move.ts';

/** An angle of the camera's own: `tilt` and `turn` in degrees; one left out stays as the camera's end has it. */
export interface AngleScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
}

/** How a film frames a block: the first `every` blocks that match, `air` round them, no closer than `zoomAtMost`. */
export interface OntoScript extends AngleScript {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
}

// How much of the page shows round a block the camera frames, and how close it may come
const AIR = 80;
const ZOOM_AT_MOST = 2.2;
const ANGLE_FORM: Form<AngleScript> = { tilt: A_NUMBER, turn: A_NUMBER, ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = {
	every: A_COUNT,
	air: A_NUMBER,
	zoomAtMost: A_NUMBER_OR_ENDLESS,
	...ANGLE_FORM
};

/** The camera to a pose. */
export function to(pose: Pose, script: AngleScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, ANGLE_FORM, 'camera.to');
	return {
		part: 'camera',
		timing: timingOf(script),
		begin: (beginning) => posing(beginning.scene.camera, pose, script, beginning.format)
	};
}

/** The camera onto the blocks a target matches, with air round them. */
export function onto(target: string, script: OntoScript = {}): Move {
	assertKind(target, A_SELECTOR, "camera.onto's selector");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => framing(beginning, target, script) };
}

async function framing(beginning: Beginning, target: string, script: OntoScript): Promise<Change> {
	const box = await shownBox(beginning, target, script.every ?? 1, 'camera.onto');
	const start = beginning.scene.camera;
	const framed = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	return posing(start, framedOnto(box, start, beginning.format.frame, framed), script, beginning.format);
}

/** From a start to an end set at the angle asked for, kept off the screen's edge when face-on. */
function posing(start: Pose, end: Pose, angle: AngleScript, format: Format): Change {
	const atItsAngle = angled(end, angle.tilt ?? end.tilt, angle.turn ?? end.turn);
	const kept = isFaceOn(atItsAngle) ? covering(atItsAngle, format) : atItsAngle;
	return propChange('camera', (progress) => poseToward(start, kept, progress));
}
