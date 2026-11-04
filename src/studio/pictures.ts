/**
 * The pictures of parts of the screen the stage holds for pieces of the page and a sweep of the screen, apart from the
 * page's own picture: those pieces hold as they are lifted, the one a sweep holds as it begins, and those sharper than
 * the page's for pieces drawn past livereel's bound. The take hands them what each frame asks and the scene each frame
 * ends on; each picture is held as long as a frame after may draw it, and let go then. A stage that shows the page live
 * holds none, as no piece or sweep stands on it.
 */
import { ZOOM_AT_MOST } from '../domain/camera.ts';
import type { Box } from '../domain/geometry.ts';
import { type PartAsked, type SharperPicture, serves } from '../domain/picture.ts';
import { type Scene, picturesHeldIn } from '../scene.ts';
import type { PicturedStage, Stage } from './ports.ts';

/** The pictures of parts of the screen a take has its stage hold for pieces and sweeps. */
export interface PartPictures {
	/** The pictures held sharper than the page's, as the last frame made asked them. */
	readonly sharper: readonly SharperPicture[];
	/**
	 * A picture of a part of the screen a piece or a sweep holds, taken as the page stands now, as sharp as the page's
	 * picture is where the page stands still: its number.
	 */
	readonly hold: (part: Box) => Promise<number>;
	/**
	 * One picture for each part asked sharper for a frame, as close as it is asked: one held before kept where it holds
	 * the part as close and the page's picture came out as it did before, so the page stands as it stood; else one taken
	 * now. Each held before and not kept is let go.
	 */
	readonly serve: (asked: readonly PartAsked[], pageChanged: boolean) => Promise<void>;
	/**
	 * Every picture a piece or a sweep holds let go once a scene a frame ends on names it no more: each exposure of a
	 * later frame is drawn from that scene on, so none names it again.
	 */
	readonly letGoUnnamedBy: (scene: Scene) => Promise<void>;
}

// No picture of a part of the screen held sharper than the page's
const NONE_SHARPER: readonly SharperPicture[] = [];

/** The pictures of parts of the screen a stage holds for pieces and sweeps: none, where it shows the page live. */
export function picturesOn(stage: Stage): PartPictures {
	switch (stage.kind) {
		case 'framed':
			return new NoPictures();
		case 'pictured':
			return new PicturesOnTheStage(stage);
	}
}

/** The pictures a stage showing the page's picture holds for pieces and sweeps, by their numbers. */
class PicturesOnTheStage implements PartPictures {
	readonly stage: PicturedStage;
	// The numbers of the pictures pieces and sweeps hold, and the pictures held sharper for the frame last made
	private held: number[] = [];
	private heldSharper: SharperPicture[] = [];

	constructor(stage: PicturedStage) {
		this.stage = stage;
	}

	get sharper(): readonly SharperPicture[] {
		return this.heldSharper;
	}

	async hold(part: Box): Promise<number> {
		const number = await this.stage.holdPicture(part, ZOOM_AT_MOST);
		this.held.push(number);
		return number;
	}

	async serve(asked: readonly PartAsked[], pageChanged: boolean): Promise<void> {
		const before = this.heldSharper;
		const kept = pageChanged ? [] : before.filter((picture) => asked.some((part) => serves(picture, part)));
		const taken: SharperPicture[] = [];
		for (const part of asked.filter((wanted) => !kept.some((picture) => serves(picture, wanted)))) {
			taken.push({ ...part, number: await this.stage.holdPicture(part.part, part.zoom) });
		}
		for (const gone of before.filter((picture) => !kept.includes(picture))) await this.stage.letGo(gone.number);
		this.heldSharper = [...kept, ...taken];
	}

	async letGoUnnamedBy(scene: Scene): Promise<void> {
		const named = picturesHeldIn(scene);
		for (const number of this.held.filter((held) => !named.includes(held))) await this.stage.letGo(number);
		this.held = this.held.filter((held) => named.includes(held));
	}
}

/** No picture of a part of the screen, as a stage showing the page live holds: no piece or sweep stands on it. */
class NoPictures implements PartPictures {
	readonly sharper = NONE_SHARPER;

	/** A move asks only where the stage shows the page's picture, having refused itself elsewhere. */
	hold(): Promise<number> {
		return Promise.reject(new Error('a page framed live has no picture to hold a part of'));
	}

	serve(): Promise<void> {
		return Promise.resolve();
	}

	letGoUnnamedBy(): Promise<void> {
		return Promise.resolve();
	}
}
