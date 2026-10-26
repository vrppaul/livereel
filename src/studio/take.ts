/**
 * One take of a film: its steps run frame by frame on the film's own clock.
 *
 * The take alone holds the scene and the count of frames shot. In a play, each frame begins the moves whose share
 * begins by then, in the order their shares begin, each after every running change whose share ended before it has
 * been set at its end — so a move reads the scene and the page as they stand at its start — then sets at its end
 * every change ended by the frame, and every other at its eased progress. One move at most drives a part at any
 * point, so the order moves are written in matters nowhere. A cut begins its moves and sets each at its end, with
 * no frame between. A sound a move makes is heard as the move is set at or past its point, on the frame being made.
 * A frame is drawn only when the footage keeps it, and drawn again where the camera crossed it fast since the frame
 * before, at poses along the camera's way there, the rest of the scene as it stands: each drawing is an exposure of
 * the frame (`src/domain/shutter.ts`). A fault in a step is raised again with the moment and the step it was met at.
 */
import { type Pose, flatPose } from '../domain/camera.ts';
import { TakeError } from '../domain/errors.ts';
import type { Format } from '../domain/geometry.ts';
import { type MotionBlur, alsoExposedAt } from '../domain/shutter.ts';
import { type Ease, framesOf, momentOf } from '../domain/time.ts';
import { type Change, type Move, type Share, soundsOf } from '../direction/move.ts';
import type { Cue } from '../direction/sound.ts';
import type { Act, Cut, Play, Step } from '../direction/steps.ts';
import { type Scene, drawn, posed } from '../scene.ts';
import type { Exposures, Footage, Opened, Track } from './ports.ts';

/** A move begun: the share of its step it runs over, its curve, what it sets, and the sounds it has yet to make. */
interface Running {
	readonly within: Share;
	readonly ease: Ease;
	readonly change: Change;
	readonly unheard: readonly Cue[];
}

/**
 * What a take is shot with: the page and the stage opened, where its frames and its sounds go, its format, the scene
 * it opens on, and how a fast camera is blurred: not at all for a draft, or for a film that wants no blur.
 */
export interface TakeSetup {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly track: Track;
	readonly format: Format;
	readonly opening: Scene;
	readonly motionBlur: MotionBlur | null;
}

export class Take {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly track: Track;
	readonly format: Format;
	readonly motionBlur: MotionBlur | null;
	private scene: Scene;
	private shot = 0;

	constructor(setup: TakeSetup) {
		this.opened = setup.opened;
		this.footage = setup.footage;
		this.track = setup.track;
		this.format = setup.format;
		this.scene = setup.opening;
		this.motionBlur = setup.motionBlur;
	}

	/** How many frames are shot so far. */
	get shots(): number {
		return this.shot;
	}

	/** Every step in turn, until the steps or the footage run out. */
	async run(steps: readonly Step[]): Promise<void> {
		for (const [place, step] of steps.entries()) {
			if (this.finished()) return;
			try {
				await this.step(step);
			} catch (fault) {
				if (!(fault instanceof Error)) throw fault;
				throw new TakeError(fault, this.moment(), place + 1);
			}
		}
	}

	private step(step: Step): Promise<void> {
		switch (step.kind) {
			case 'play':
				return this.play(step);
			case 'cut':
				return this.cut(step);
			case 'act':
				return this.act(step);
		}
	}

	private async play(step: Play): Promise<void> {
		const frames = framesOf(step.seconds);
		let waiting = [...step.moves];
		let running: Running[] = [];
		for (let index = 1; index <= frames; index += 1) {
			if (this.finished()) return;
			// The camera as the frame before showed it, or as the step begins: nothing moves it between frames
			const posedBefore = this.scene.camera;
			const progress = index / frames;
			const due = waiting.filter((move) => move.timing.within.start <= progress).sort(byStart);
			waiting = waiting.filter((move) => !due.includes(move));
			for (const move of due) {
				running = await this.endedBy(running, move.timing.within.start);
				running.push(await this.begun(move, step.ease));
			}
			running = await this.endedBy(running, progress);
			running = await this.setAlong(running, progress);
			await this.frame(posedBefore);
		}
	}

	private async cut(step: Cut): Promise<void> {
		for (const move of step.moves) {
			await this.set(await this.changeOf(move), 1);
			this.heard(soundsOf(move), 1);
		}
	}

	private async act(step: Act): Promise<void> {
		await this.opened.stage.layFlat(drawn(posed(this.scene, flatPose(this.format)), this.moment()));
		try {
			await step.action(this.opened.act);
		} finally {
			await this.opened.stage.standUp();
		}
	}

	/** Every running move whose share has ended by a point of the step set at its end, once; those still running. */
	private async endedBy(running: readonly Running[], point: number): Promise<Running[]> {
		for (const ending of running.filter((current) => current.within.end <= point)) await this.setAt(ending, 1);
		return running.filter((current) => current.within.end > point);
	}

	/** Every running move set at its eased progress when its step is `progress` along. */
	private async setAlong(running: readonly Running[], progress: number): Promise<Running[]> {
		const moved: Running[] = [];
		for (const current of running) moved.push(await this.setAt(current, current.ease(current.within.along(progress))));
		return moved;
	}

	/** A running move set at a progress of its own, every sound it makes by then heard; the move, with those to come. */
	private async setAt(current: Running, progress: number): Promise<Running> {
		await this.set(current.change, progress);
		return { ...current, unheard: this.heard(current.unheard, progress) };
	}

	/** The sounds due by a progress heard, at the moment of the frame being made; those still to come. */
	private heard(cues: readonly Cue[], progress: number): readonly Cue[] {
		for (const cue of cues.filter((due) => due.at <= progress)) this.track.hear(this.moment(), cue.sound);
		return cues.filter((due) => due.at > progress);
	}

	private async begun(move: Move, stepEase: Ease): Promise<Running> {
		return {
			within: move.timing.within,
			ease: move.timing.ease ?? stepEase,
			change: await this.changeOf(move),
			unheard: soundsOf(move)
		};
	}

	private changeOf(move: Move): Change | Promise<Change> {
		return move.begin({ scene: this.scene, page: this.opened.page, format: this.format });
	}

	private async set(change: Change, progress: number): Promise<void> {
		this.scene = await change(this.scene, progress);
	}

	/** One frame: exposed and kept where the footage keeps it, and counted. */
	private async frame(posedBefore: Pose): Promise<void> {
		if (this.footage.keeps(this.shot)) await this.footage.keep(this.shot, await this.exposed(posedBefore));
		this.shot += 1;
	}

	/** The frame drawn at each pose the camera is caught at along its way from the frame before, its own last. */
	private async exposed(posedBefore: Pose): Promise<Exposures> {
		const earlier: Uint8Array[] = [];
		for (const pose of alsoExposedAt(posedBefore, this.scene.camera, this.format, this.motionBlur)) {
			earlier.push(await this.drawnAt(pose));
		}
		return { earlier, own: await this.drawnAt(this.scene.camera) };
	}

	/** The scene as it stands drawn with the camera at a pose, and captured. */
	private async drawnAt(pose: Pose): Promise<Uint8Array> {
		await this.opened.stage.draw(drawn(posed(this.scene, pose), this.moment()));
		return this.opened.stage.capture();
	}

	private moment(): number {
		return momentOf(this.shot);
	}

	private finished(): boolean {
		return this.footage.complete(this.shot);
	}
}

function byStart(first: Move, second: Move): number {
	return first.timing.within.start - second.timing.within.start;
}
