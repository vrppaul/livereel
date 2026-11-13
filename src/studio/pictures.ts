/**
 * The pictures of parts of the screen the stage holds for pieces of the page and a sweep or a fade of the screen, apart
 * from the page's own picture: those pieces hold as they are lifted, the one a sweep or a fade holds as it begins, and
 * those sharper than the page's for pieces drawn past livereel's bound; and the colour a piece's edge shows, read off
 * a picture taken for it and held by none. The take hands them what each frame asks and the scene each frame ends on;
 * each picture is held as long as a frame after may draw it, and let go then. A stage that shows the page live holds
 * none, as no piece, sweep or fade stands on it.
 */
import { ZOOM_AT_MOST } from '../domain/camera.ts';
import type { Box, FrameSide } from '../domain/geometry.ts';
import { type PartAsked, type SharperPicture, serves } from '../domain/picture.ts';
import { type Scene, picturesHeldIn } from '../scene.ts';
import type { PicturedPage, PicturedStage, Stage } from './ports.ts';

/** The pictures of parts of the screen a take has its stage hold for pieces and sweeps. */
export interface PartPictures {
	/** The pictures held sharper than the page's, as the last frame made asked them. */
	readonly sharper: readonly SharperPicture[];
	/**
	 * A picture of a part of the screen a piece or a sweep holds, taken of a page as it stands now, as sharp as the
	 * page's picture is where the page stands still: its number.
	 */
	readonly hold: (part: Box, page: PicturedPage) => Promise<number>;
	/**
	 * The colour a page as it stands now shows along the edge of a part of the screen, on the sides named, in hex with no
	 * alpha, read off a picture taken for it alone: a piece's walls' where the film names none.
	 */
	readonly edgeColour: (part: Box, sides: readonly FrameSide[], page: PicturedPage) => Promise<string>;
	/**
	 * One picture for each part asked sharper for a frame, as close as it is asked: one held before kept where it holds
	 * the part as close and the page's picture came out as it did before, so the page stands as it stood; else one taken
	 * now. Each held before and not kept is let go.
	 */
	readonly serve: (asked: readonly PartAsked[], pageChanged: boolean) => Promise<void>;
	/**
	 * Every picture a piece, a sweep or a fade holds let go once a scene a frame ends on names it no more at the frame's
	 * moment: each exposure of a later frame is drawn from that scene on, later, so none names it again.
	 */
	readonly letGoUnnamedBy: (scene: Scene, moment: number) => Promise<void>;
}

// No picture of a part of the screen held sharper than the page's; and the page those held so are of, as a piece drawn
// past livereel's bound follows the filmed page's picture alone
const NONE_SHARPER: readonly SharperPicture[] = [];
const THE_FILMED_PAGE: PicturedPage = 'filmed';

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

	async hold(part: Box, page: PicturedPage): Promise<number> {
		const number = await this.stage.holdPicture(part, ZOOM_AT_MOST, page);
		this.held.push(number);
		return number;
	}

	edgeColour(part: Box, sides: readonly FrameSide[], page: PicturedPage): Promise<string> {
		return this.stage.edgeColour(part, sides, page);
	}

	async serve(asked: readonly PartAsked[], pageChanged: boolean): Promise<void> {
		const before = this.heldSharper;
		const kept = pageChanged ? [] : before.filter((picture) => asked.some((part) => serves(picture, part)));
		const taken: SharperPicture[] = [];
		for (const part of asked.filter((wanted) => !kept.some((picture) => serves(picture, wanted)))) {
			taken.push({ ...part, number: await this.stage.holdPicture(part.part, part.zoom, THE_FILMED_PAGE) });
		}
		for (const gone of before.filter((picture) => !kept.includes(picture))) await this.stage.letGo(gone.number);
		this.heldSharper = [...kept, ...taken];
	}

	async letGoUnnamedBy(scene: Scene, moment: number): Promise<void> {
		const named = picturesHeldIn(scene, moment);
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

	/** A move asks only where the stage shows the page's picture, having refused itself elsewhere. */
	edgeColour(): Promise<string> {
		return Promise.reject(new Error('a page framed live has no picture to read the colour of an edge off'));
	}

	serve(): Promise<void> {
		return Promise.resolve();
	}

	letGoUnnamedBy(): Promise<void> {
		return Promise.resolve();
	}
}
