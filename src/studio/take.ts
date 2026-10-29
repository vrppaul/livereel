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
 * Before each frame, after each act, and of any fault a step meets, the take asks the stage whether it and its page
 * are still there: where one is gone, the take is refused by why, in place of what its loss made a step fail at (a
 * selector that matches nothing on Chrome's error page), and nothing of it is shot.
 */
import { type Camera, flatCamera } from '../domain/camera.ts';
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

	/**
	 * Every step in turn, until the steps or the footage run out; then the stage asked once more, so a last frame kept
	 * as its page went is not kept without a word.
	 */
	async run(steps: readonly Step[]): Promise<void> {
		let begun = 0;
		for (const step of steps) {
			if (this.finished()) break;
			await this.taken(begun, () => this.step(step));
			begun += 1;
		}
		await this.taken(begun - 1, () => this.refusedWhereGone());
	}

	/**
	 * A part of the take, at the step of that place in the film; a fault in it raised with the moment and the step it
	 * was met at, said by why where it can be.
	 */
	private async taken(place: number, work: () => Promise<void>): Promise<void> {
		try {
			await work();
		} catch (fault) {
			if (!(fault instanceof Error)) throw fault;
			throw new TakeError(await this.explained(fault), this.moment(), place + 1);
		}
	}

	/** A step's fault, or why the stage or its page is gone where one is, which explains it. */
	private async explained(fault: Error): Promise<Error> {
		return (await this.absence()) ?? fault;
	}

	/**
	 * Why the stage or its page is gone, where one is; none where both are, or where the stage cannot be asked, as when
	 * the browser itself is gone, so the fault met on the way is the one said.
	 */
	private absence(): Promise<Error | undefined> {
		return this.opened.stage.absence().catch(() => undefined);
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
			const cameraBefore = this.scene.camera;
			const progress = index / frames;
			const due = waiting.filter((move) => move.timing.within.start <= progress).sort(byStart);
			waiting = waiting.filter((move) => !due.includes(move));
			for (const move of due) {
				running = await this.endedBy(running, move.timing.within.start);
				running.push(await this.begun(move, step.ease));
			}
			running = await this.endedBy(running, progress);
			running = await this.setAlong(running, progress);
			await this.frame(cameraBefore);
		}
	}

	private async cut(step: Cut): Promise<void> {
		for (const move of step.moves) {
			await this.set(await this.changeOf(move), 1);
			this.heard(soundsOf(move), 1);
		}
	}

	/** An act on the page laid flat; the stage asked before it stands up again, as a stage gone cannot stand up. */
	private async act(step: Act): Promise<void> {
		await this.opened.stage.layFlat(
			drawn(posed(this.scene, flatCamera(this.format)), this.moment(), {
				frame: this.format.screen,
				screen: this.format.screen
			})
		);
		try {
			await step.action(this.opened.act);
		} finally {
			await this.refusedWhereGone();
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

	/** One frame: exposed and kept where the footage keeps it, and counted; refused where the stage or its page is gone. */
	private async frame(cameraBefore: Camera): Promise<void> {
		await this.refusedWhereGone();
		if (this.footage.keeps(this.shot)) await this.footage.keep(this.shot, await this.exposed(cameraBefore));
		this.shot += 1;
	}

	/** The take refused, by why, where the stage or the page in its frame is no longer there. */
	private async refusedWhereGone(): Promise<void> {
		const absence = await this.absence();
		if (absence !== undefined) throw absence;
	}

	/** The frame drawn at each place the camera is caught at along its way from the frame before, its own last. */
	private async exposed(cameraBefore: Camera): Promise<Exposures> {
		const earlier: Uint8Array[] = [];
		for (const camera of alsoExposedAt(cameraBefore, this.scene.camera, this.format, this.motionBlur)) {
			earlier.push(await this.drawnAt(camera));
		}
		return { earlier, own: await this.drawnAt(this.scene.camera) };
	}

	/** The scene as it stands drawn by a camera, and captured. */
	private async drawnAt(camera: Camera): Promise<Uint8Array> {
		await this.opened.stage.draw(drawn(posed(this.scene, camera), this.moment(), this.format));
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
