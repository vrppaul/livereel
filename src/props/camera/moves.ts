/**
 * The camera: to a pose, or onto a block of the page, at the angle it stands at or another.
 *
 * A face-on camera never shows the screen's edge: its end is moved as little as it takes to keep the screen filling
 * the frame.
 */
import { type Framing, type Pose, angled, covering, isFaceOn, onto as framedOnto, poseToward } from '#domain/camera';
import type { Format } from '#domain/geometry';
import {
	type Beginning,
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';

/** An angle of the camera's own: `tilt` and `turn` in degrees; one left out stays as the camera stands. */
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

/** The camera to a pose. */
export class CameraTo implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'camera';
	readonly timing: Timing;
	readonly pose: Pose;
	readonly angle: AngleScript;

	constructor(pose: Pose, script: AngleScript) {
		this.timing = timingOf(script);
		this.pose = pose;
		this.angle = script;
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		return Promise.resolve(posing(beginning.scene.camera, this.pose, this.angle, beginning.format));
	}
}

/** The camera onto the blocks a target matches, with air round them. */
export class CameraOnto implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'camera';
	readonly timing: Timing;
	readonly target: string;
	readonly every: number;
	readonly framing: Framing;
	readonly angle: AngleScript;

	constructor(target: string, script: OntoScript) {
		this.timing = timingOf(script);
		this.target = target;
		this.every = script.every ?? 1;
		this.framing = { air: script.air ?? AIR, zoomAtMost: script.zoomAtMost ?? ZOOM_AT_MOST };
		this.angle = script;
	}

	async begin(beginning: Beginning): Promise<SceneChange> {
		const box = await beginning.page.box(this.target, this.every);
		const start = beginning.scene.camera;
		const end = framedOnto(box, start, beginning.format.frame, this.framing);
		return posing(start, end, this.angle, beginning.format);
	}
}

/** The camera on its way from one pose to another. */
class Posing implements PropMotion<Pose> {
	readonly start: Pose;
	readonly end: Pose;

	constructor(start: Pose, end: Pose) {
		this.start = start;
		this.end = end;
	}

	next(progress: number): Pose {
		return poseToward(this.start, this.end, progress);
	}
}

export function to(pose: Pose, script: AngleScript = {}): CameraTo {
	return new CameraTo(pose, script);
}

export function onto(target: string, script: OntoScript = {}): CameraOnto {
	return new CameraOnto(target, script);
}

/** The change from a start to an end set at the angle asked for, kept off the screen's edge when face-on. */
function posing(start: Pose, end: Pose, angle: AngleScript, format: Format): PropChange<'camera'> {
	const atItsAngle = angled(end, angle.tilt ?? end.tilt, angle.turn ?? end.turn);
	const kept = isFaceOn(atItsAngle) ? covering(atItsAngle, format) : atItsAngle;
	return new PropChange('camera', new Posing(start, kept));
}
