/**
 * The camera: to a pose, or onto a block of the page in the whole frame or in a half of it, at the angle it stands at
 * or another.
 *
 * A face-on camera's end is kept on the screen as `covering` in `src/domain/camera.ts` keeps it: filling the whole
 * frame, or the half a block is framed in, no edge of the screen showing there.
 */
import { A_POSE, type Pose, angled, covering, isFaceOn, onto as framedOnto, poseToward } from '../domain/camera.ts';
import { A_FRAME_HALF, type Format, type FrameHalf } from '../domain/geometry.ts';
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
	shownPart,
	timingOf
} from '../direction/move.ts';

/** An angle of the camera's own: `tilt` and `turn` in degrees; one left out stays as the camera's end has it. */
export interface AngleScript extends TimingScript {
	readonly tilt?: number;
	readonly turn?: number;
}

/**
 * How a film frames a block: the first `every` blocks that match, `air` round them in the page's pixels, no closer than
 * `zoomAtMost`, a zoom as a pose has it (`Pose` in `src/domain/camera.ts`), in the whole frame or in a `half` of it.
 */
export interface OntoScript extends AngleScript {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
	readonly half?: FrameHalf;
}

// How much of the page shows round a block the camera frames, and how close it may come
const AIR = 80;
// The camera frames the whole frame where a film names no half of it
const WHOLE_FRAME = null;
const ZOOM_AT_MOST = 2.2;
const ANGLE_FORM: Form<AngleScript> = { tilt: A_NUMBER, turn: A_NUMBER, ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = {
	every: A_COUNT,
	air: A_NUMBER,
	zoomAtMost: A_NUMBER_OR_ENDLESS,
	half: A_FRAME_HALF,
	...ANGLE_FORM
};

/** The camera to a pose. */
export function to(pose: Pose, script: AngleScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, ANGLE_FORM, 'camera.to');
	return {
		part: 'camera',
		timing: timingOf(script),
		begin: (beginning) =>
			posing(beginning.scene.camera, keptOnTheScreen(angledAs(pose, script), beginning.format, WHOLE_FRAME))
	};
}

/** The camera onto the blocks a target matches, with air round them, in the whole frame or in a half of it. */
export function onto(target: string, script: OntoScript = {}): Move {
	assertKind(target, A_SELECTOR, "camera.onto's selector");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => framing(beginning, target, script) };
}

async function framing(beginning: Beginning, target: string, script: OntoScript): Promise<Change> {
	const box = await shownPart(beginning, target, script.every ?? 1, 'camera.onto');
	const start = beginning.scene.camera;
	const half = script.half ?? WHOLE_FRAME;
	const framed = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	const end = angledAs(framedOnto(box, start, beginning.format.frame, framed, half), script);
	return posing(start, keptOnTheScreen(end, beginning.format, half));
}

function posing(start: Pose, end: Pose): Change {
	return propChange('camera', (progress) => poseToward(start, end, progress));
}

/** A pose at the angle a film asks for; an angle it leaves out stays as the pose has it. */
function angledAs(pose: Pose, angle: AngleScript): Pose {
	return angled(pose, angle.tilt ?? pose.tilt, angle.turn ?? pose.turn);
}

/** A pose kept off the screen's edge in the whole frame or a half of it, where it is face-on. */
function keptOnTheScreen(pose: Pose, format: Format, half: FrameHalf | null): Pose {
	return isFaceOn(pose) ? covering(pose, format, half) : pose;
}
