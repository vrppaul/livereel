/**
 * The camera: to a pose, or onto a block of the page, in the whole frame or in a window on a side of it, at the angle
 * it stands at or another.
 *
 * A camera's end is kept on the screen as `covering` in `src/domain/camera.ts` keeps it: filling its view, no edge of
 * the screen showing there, at any angle, as an angle leans the view and not the screen in it. A move into a window,
 * or out of one, carries the view with the pose: the page
 * draws back off the frame's edges into a window on the film's ground, or grows out of it to fill the frame.
 */
import {
	A_POSE,
	type Camera,
	type Pose,
	type View,
	angled,
	cameraToward,
	covering,
	onto as framedOnto,
	wholeView,
	windowView
} from '../domain/camera.ts';
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
import { A_FRAME_SIDE, type FrameSide, windowOn } from '../domain/split.ts';
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
 * `zoomAtMost`, a zoom as a pose has it (`Pose` in `src/domain/camera.ts`), in the whole frame or in a window on a
 * `side` of it.
 */
export interface OntoScript extends AngleScript {
	readonly every?: number;
	readonly air?: number;
	readonly zoomAtMost?: number;
	readonly side?: FrameSide;
}

// How much of the page shows round a block the camera frames, and how close it may come
const AIR = 80;
const ZOOM_AT_MOST = 2.2;
const ANGLE_FORM: Form<AngleScript> = { tilt: A_NUMBER, turn: A_NUMBER, ...TIMING_FORM };
const ONTO_FORM: Form<OntoScript> = {
	every: A_COUNT,
	air: A_NUMBER,
	zoomAtMost: A_NUMBER_OR_ENDLESS,
	side: A_FRAME_SIDE,
	...ANGLE_FORM
};

/** The camera to a pose, in the whole frame. */
export function to(pose: Pose, script: AngleScript = {}): Move {
	assertKind(pose, A_POSE, "camera.to's pose");
	assertWritten(script, ANGLE_FORM, 'camera.to');
	return {
		part: 'camera',
		timing: timingOf(script),
		begin: (beginning) =>
			moving(
				beginning.scene.camera,
				framed(angledAs(pose, script), beginning.format, wholeView(beginning.format.frame))
			)
	};
}

/** The camera onto the blocks a target matches, with air round them, in the whole frame or in a window on a side of it. */
export function onto(target: string, script: OntoScript = {}): Move {
	assertKind(target, A_SELECTOR, "camera.onto's selector");
	assertWritten(script, ONTO_FORM, 'camera.onto');
	return { part: 'camera', timing: timingOf(script), begin: (beginning) => framing(beginning, target, script) };
}

async function framing(beginning: Beginning, target: string, script: OntoScript): Promise<Change> {
	const box = await shownPart(beginning, target, script.every ?? 1, 'camera.onto');
	const start = beginning.scene.camera;
	const view = viewOn(beginning.format, script.side ?? null);
	const framedBy = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
	const pose = framedOnto(box, start.pose, view.box, beginning.format.frame, framedBy);
	return moving(start, framed(angledAs(pose, script), beginning.format, view));
}

function moving(start: Camera, end: Camera): Change {
	return propChange('camera', (progress) => cameraToward(start, end, progress));
}

/** The whole frame as the camera's view, or a window on a side of it. */
function viewOn(format: Format, side: FrameSide | null): View {
	return side === null ? wholeView(format.frame) : windowView(windowOn(format, side));
}

/**
 * A camera at a pose in a view, kept off the screen's edge there: an angle leans the view, and the screen in it stays
 * face-on to it, so it fills the view at any angle.
 */
function framed(pose: Pose, format: Format, view: View): Camera {
	return { pose: covering(pose, format, view.box), view };
}

/** A pose at the angle a film asks for; an angle it leaves out stays as the pose has it. */
function angledAs(pose: Pose, angle: AngleScript): Pose {
	return angled(pose, angle.tilt ?? pose.tilt, angle.turn ?? pose.turn);
}
