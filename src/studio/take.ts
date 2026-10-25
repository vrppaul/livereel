/**
 * One take of a film: its steps run frame by frame on the film's own clock.
 *
 * The take alone holds the scene and the count of frames shot. In a play, each frame begins the moves whose share
 * begins by then, in the order their shares begin, each after every running change whose share ended before it has
 * been set at its end — so a move reads the scene and the page as they stand at its start — then sets at its end
 * every change ended by the frame, and every other at its eased progress. One move at most drives a prop at any
 * point, so the order moves are written in matters nowhere. A frame is drawn only when the footage keeps it. A fault
 * in a step is raised again with the moment and the step it was met at.
 */
import { flatPose } from '#domain/camera';
import { TakeError } from '#domain/errors';
import type { Format } from '#domain/geometry';
import { type Ease, type Share, framesOf, momentOf } from '#domain/time';
import type { Move, PageMotion, SceneChange } from '#direction/move';
import type { Act, Cut, Play, Step } from '#direction/steps';
import { type Scene, drawn, posed } from '#scene';
import type { Footage, Opened } from './ports.ts';

/** A move begun: the share of its step it runs over, its curve, and what it sets, in the scene or on the page. */
type Running = RunningInScene | RunningOnPage;

interface RunningInScene {
	readonly kind: 'scene';
	readonly within: Share;
	readonly ease: Ease;
	readonly change: SceneChange;
}

interface RunningOnPage {
	readonly kind: 'page';
	readonly within: Share;
	readonly ease: Ease;
	readonly motion: PageMotion;
}

export class Take {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly format: Format;
	scene: Scene;
	shot = 0;

	constructor(opened: Opened, footage: Footage, format: Format, scene: Scene) {
		this.opened = opened;
		this.footage = footage;
		this.format = format;
		this.scene = scene;
	}

	get moment(): number {
		return momentOf(this.shot);
	}

	get finished(): boolean {
		return this.footage.complete(this.shot);
	}

	/** Every step in turn, until the steps or the footage run out. */
	async run(steps: readonly Step[]): Promise<void> {
		for (const [place, step] of steps.entries()) {
			if (this.finished) return;
			try {
				await runStep(this, step);
			} catch (fault) {
				if (fault instanceof TakeError || !(fault instanceof Error)) throw fault;
				throw new TakeError(fault, this.moment, place + 1);
			}
		}
	}

	/** One frame: drawn and kept where the footage keeps it, and counted. */
	async frame(): Promise<void> {
		if (this.footage.keeps(this.shot)) {
			await this.opened.stage.draw(drawn(this.scene, this.moment));
			await this.footage.keep(this.shot, await this.opened.stage.capture());
		}
		this.shot += 1;
	}
}

function runStep(take: Take, step: Step): Promise<void> {
	switch (step.kind) {
		case 'play':
			return runPlay(take, step);
		case 'cut':
			return runCut(take, step);
		case 'act':
			return runAct(take, step);
	}
}

async function runPlay(take: Take, step: Play): Promise<void> {
	const frames = framesOf(step.seconds);
	let waiting = [...step.moves];
	let running: Running[] = [];
	for (let index = 1; index <= frames; index += 1) {
		if (take.finished) return;
		const progress = index / frames;
		const due = waiting.filter((move) => move.timing.within.start <= progress).sort(byStart);
		waiting = waiting.filter((move) => !due.includes(move));
		for (const move of due) {
			running = await endedBy(take, running, move.timing.within.start);
			running.push(await begin(take, move, step.ease));
		}
		running = await endedBy(take, running, progress);
		for (const current of running) await apply(take, current, current.ease(current.within.along(progress)));
		await take.frame();
	}
}

/** Every running move whose share has ended by a point of the step set at its end, once; those still running. */
async function endedBy(take: Take, running: readonly Running[], point: number): Promise<Running[]> {
	for (const ending of running.filter((current) => current.within.end <= point)) await apply(take, ending, 1);
	return running.filter((current) => current.within.end > point);
}

function byStart(first: Move, second: Move): number {
	return first.timing.within.start - second.timing.within.start;
}

function runCut(take: Take, step: Cut): Promise<void> {
	take.scene = step.change(take.scene);
	return Promise.resolve();
}

async function runAct(take: Take, step: Act): Promise<void> {
	await take.opened.stage.layFlat(drawn(posed(take.scene, flatPose(take.format)), take.moment));
	try {
		await step.action(take.opened.act);
	} finally {
		await take.opened.stage.standUp();
	}
}

async function begin(take: Take, move: Move, stepEase: Ease): Promise<Running> {
	const ease = move.timing.ease ?? stepEase;
	if (move.kind === 'page') {
		return { kind: 'page', within: move.timing.within, ease, motion: await move.begin(take.opened.reader) };
	}
	const beginning = { scene: take.scene, page: take.opened.reader, format: take.format };
	return { kind: 'scene', within: move.timing.within, ease, change: await move.begin(beginning) };
}

async function apply(take: Take, running: Running, progress: number): Promise<void> {
	if (running.kind === 'page') {
		await running.motion.at(take.opened.driver, progress);
		return;
	}
	take.scene = running.change.at(take.scene, progress);
}
