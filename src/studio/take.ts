/**
 * One take of a film: its steps run frame by frame on the film's own clock.
 *
 * The take alone holds the scene and the count of frames shot. In a play, each frame begins the moves whose share
 * begins by then, in the order their shares begin, each after every running change whose share ended before it has
 * been set at its end — so a move reads the scene and the page as they stand at its start — then sets at its end
 * every change ended by the frame, and every other at its eased progress. One move at most drives a part at any
 * point, so the order moves are written in matters nowhere. A cut begins its moves and sets each at its end, with
 * no frame between. A sound a move makes is heard as the move is set at or past its point, on the frame being made.
 * A frame is drawn only when the footage keeps it. A fault in a step is raised again with the moment and the step it
 * was met at.
 */
import { flatPose } from '../domain/camera.ts';
import { TakeError } from '../domain/errors.ts';
import type { Format } from '../domain/geometry.ts';
import { type Ease, framesOf, momentOf } from '../domain/time.ts';
import { type Change, type Move, type Share, soundsOf } from '../direction/move.ts';
import type { Cue } from '../direction/sound.ts';
import type { Act, Cut, Play, Step } from '../direction/steps.ts';
import { type Scene, drawn, posed } from '../scene.ts';
import type { Footage, Opened, Track } from './ports.ts';

/** A move begun: the share of its step it runs over, its curve, what it sets, and the sounds it has yet to make. */
interface Running {
	readonly within: Share;
	readonly ease: Ease;
	readonly change: Change;
	readonly unheard: readonly Cue[];
}

export class Take {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly track: Track;
	readonly format: Format;
	private scene: Scene;
	private shot = 0;

	constructor(opened: Opened, footage: Footage, track: Track, format: Format, scene: Scene) {
		this.opened = opened;
		this.footage = footage;
		this.track = track;
		this.format = format;
		this.scene = scene;
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
			const progress = index / frames;
			const due = waiting.filter((move) => move.timing.within.start <= progress).sort(byStart);
			waiting = waiting.filter((move) => !due.includes(move));
			for (const move of due) {
				running = await this.endedBy(running, move.timing.within.start);
				running.push(await this.begun(move, step.ease));
			}
			running = await this.endedBy(running, progress);
			running = await this.setAlong(running, progress);
			await this.frame();
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

	/** One frame: drawn and kept where the footage keeps it, and counted. */
	private async frame(): Promise<void> {
		if (this.footage.keeps(this.shot)) {
			await this.opened.stage.draw(drawn(this.scene, this.moment()));
			await this.footage.keep(this.shot, await this.opened.stage.capture());
		}
		this.shot += 1;
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
