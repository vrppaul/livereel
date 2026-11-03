/**
 * One take of a film: its steps run frame by frame on the film's own clock.
 *
 * The take alone holds the scene and the count of frames shot. In a play, each frame begins the moves whose share
 * begins by then, in the order their shares begin, the one that ends first of two that begin alike, each after every
 * running change whose share ended before it has been set at its end — so a move reads the scene and the page as they
 * stand at its start, and one that begins as an act is done reads the page it left — then sets at its end every
 * change ended by the frame, and every other at its eased progress. One move at most drives a part, or a value of it,
 * at any point, so the order moves are written in matters nowhere but between two acts at one moment. A cut begins
 * its moves and sets each at its end, with no frame between; an act between steps is a cut of one. The page is acted
 * on one way: as a move that acts begins, by the way the take hands every move. A sound a move makes is heard as the
 * move is set at or past its point, on the frame being made.
 * A frame is drawn only when the footage keeps it, and drawn again where anything on it moved fast while its shutter
 * was open — the camera, its window, the cursor, the light, an object or what it shows — as the scene stood at moments
 * of that time: the scene the frame before left, every move begun by then set as far as it had come. How far is
 * measured from where things stood as the shutter opened to where they stand, apart on each side of a moment a move
 * begins at, so what a move sets as it begins is not taken for a move. Each drawing is an exposure of the frame
 * (`src/domain/shutter.ts`), so what slides in and what it pushes off are each drawn along their own way. A move's
 * change follows from its progress alone, so asking it what it set at an earlier moment changes nothing; a move of the
 * page, which sets the page itself, is never asked. A stage that draws all of a frame's exposures at once lays them
 * over one another and is captured once, the frame; one that draws fewer is captured at each, the footage blending them: a
 * capture is near all a frame costs. The page's own time — its timers, animation frames and date — is the film's: run
 * on with each frame, kept or not, before the frame is shot, as far as the film went since the last at the speed the
 * scene set on the way, the mean of where it stood and where it stands; so a page's timer set at a speed of 2 runs
 * out in half its delay into the film, however long the browser takes. It runs as the wall's only while an act waits
 * on the page, which needs it to answer, the film's time standing. The take does with the page what the stage's kind
 * asks. A stage that shows a picture of the page, as it shows a static one, takes it anew when the take asks: on a
 * frame after an act, a move of the page or a change the page made of itself, and on every frame until two pictures
 * in a row come out alike, nothing done to the page between them and its own motion not let go, so what it brings —
 * results, an image, a scroll that eases out, a note its timer takes away — is seen.
 * Once it stands still, a frame the stage would draw as it drew the last one captured is that capture, neither drawn
 * nor captured again: holds are near half a film's frames. A picture is taken as sharp as a camera as close as
 * livereel's bound shows it, so it serves every frame after it; on a frame a move of the page runs on past, or while
 * its own motion is let go, as sharp as that frame's cameras show it, as the next frame takes another: the whole
 * screen as sharp as the bound costs about three times what it costs as sharp as the camera showing all of it (253–269
 * against 81–83 ms, a 1040 × 1080 screen, 2026-10-30). A move's last frame is pictured as sharp as the bound, so the
 * picture after it can come out alike. A stage with the page live in its frame, as it shows a dynamic one, is
 * captured every frame, as the page changes of itself, and is laid flat for an act.
 * A fault in a step is raised again with the moment and the step it was met at. Before each frame, after each act,
 * and of any fault a step meets, the take asks the stage whether it and its page are still there: where one is gone,
 * the take is refused by why, in place of what its loss made a step fail at (a selector that matches nothing on
 * Chrome's error page), and nothing of it is shot.
 */
import { ZOOM_AT_MOST, flatCamera, zoomPicturedFor } from '../domain/camera.ts';
import { TakeError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import { type MotionBlur, alsoExposedBack } from '../domain/shutter.ts';
import { type Ease, between, framesOf, momentOf } from '../domain/time.ts';
import { type Change, type Move, type Share, movesThePage, soundsOf } from '../direction/move.ts';
import type { Action } from '../direction/page.ts';
import type { Cue } from '../direction/sound.ts';
import type { Cut, Play, Step } from '../direction/steps.ts';
import {
	type DrawnScene,
	type Scene,
	type SceneSeen,
	drawingOf,
	drawn,
	frameShiftBetween,
	pictureZoomsIn,
	seenIn
} from '../scene.ts';
import type { Exposures, Footage, FramedStage, Opened, PicturedStage, Stage, Track } from './ports.ts';

// Half-way along a frame, where a speed that changes evenly over it stands at its mean
const HALF_WAY = 0.5;
// How far a frame smears where nothing on it moves
const NOTHING_SMEARED = 0;

/**
 * A move begun: the share of its step it runs over, its curve, what it sets and whether that is the page itself, and
 * the sounds it has yet to make.
 */
interface Running {
	readonly within: Share;
	readonly ease: Ease;
	readonly change: Change;
	readonly movesThePage: boolean;
	readonly unheard: readonly Cue[];
}

/**
 * A frame's time in its play: the scene the frame before left; the moves of the scene that ran over it, those running
 * as the frame before was shot and those begun since, in the order they began; how far along its step the frame is;
 * and the share of the step a frame takes.
 */
interface FrameTime {
	readonly before: Scene;
	readonly moves: readonly Running[];
	readonly progress: number;
	readonly frameShare: number;
}

/** A frame's exposures as the stage drew and captured them at once: the scenes said whole, and the image. */
interface Captured {
	readonly drawing: string;
	readonly image: Uint8Array;
}

/**
 * What a take is shot with: the page and the stage opened, where its frames and its sounds go, its format, the scene
 * it opens on, and how a fast move is blurred — not at all for a draft, or for a film that wants no blur.
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
	// The last exposures captured at once, none before the first; and, where the stage shows a picture of the page,
	// whether the page may have changed since its picture was last taken, as it may before the first, and whether it
	// stood still as it was, its picture alike to the one before, as a framed page never is
	private lastCaptured: Captured | null = null;
	private pageChangedSinceTaken = true;
	private pageStandsStill = false;
	// How far the film's frames have taken the page's own time since the film began, in its own seconds, at the scene's
	// speed; and the film's moment they took it to
	private pageMoment = 0;
	private pageRunAt = 0;

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
	 * The film begun where the page's time stands, then every step in turn, until the steps or the footage run out;
	 * then the stage asked once more, so a last frame kept as its page went is not kept without a word.
	 */
	async run(steps: readonly Step[]): Promise<void> {
		this.opened.time.begin();
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
		}
	}

	private async play(step: Play): Promise<void> {
		const frames = framesOf(step.seconds);
		let waiting = [...step.moves];
		let running: Running[] = [];
		for (let index = 1; index <= frames; index += 1) {
			if (this.finished()) return;
			const progress = index / frames;
			const due = waiting.filter((move) => move.timing.within.start <= progress).sort(inBeginningOrder);
			waiting = waiting.filter((move) => !due.includes(move));
			const before = this.scene;
			// What runs over the frame's time: the moves running as the frame before was shot, and those begun since
			const ranOver = [...running];
			for (const move of due) {
				running = await this.endedBy(running, move.timing.within.start);
				const begun = await this.begun(move, step.ease);
				running.push(begun);
				ranOver.push(begun);
			}
			running = await this.endedBy(running, progress);
			running = await this.setAlong(running, progress);
			const moves = ranOver.filter((current) => !current.movesThePage);
			await this.frame(
				{ before, moves, progress, frameShare: 1 / frames },
				running.some((current) => current.movesThePage)
			);
		}
	}

	private async cut(step: Cut): Promise<void> {
		for (const move of step.moves) {
			await this.set(await this.changeOf(move), 1, movesThePage(move));
			this.heard(soundsOf(move), 1);
		}
	}

	/**
	 * An act on the page as the stage shows it, between steps or as a move that acts begins: where the stage shows a
	 * picture, it leaves it behind the page.
	 */
	private acted(action: Action): Promise<void> {
		this.pageChangedSinceTaken = true;
		const stage = this.opened.stage;
		switch (stage.kind) {
			case 'framed':
				return this.actedOnFlat(stage, action);
			case 'pictured':
				return this.actedOn(action);
		}
	}

	/**
	 * An act on a framed page, its screen laid flat for it, and stood up again once it is done and the stage found still
	 * there, as a stage gone cannot stand up.
	 */
	private async actedOnFlat(stage: FramedStage, action: Action): Promise<void> {
		await stage.layFlat(
			drawn(this.scene, flatCamera(this.format), this.moment(), { ...this.format, frame: this.format.screen })
		);
		await this.actedOn(action);
		await stage.standUp();
	}

	/**
	 * An act on the page as it stands, the page's own time running as the act waits on it; the stage asked once it is
	 * done, or has failed.
	 */
	private async actedOn(action: Action): Promise<void> {
		try {
			await this.opened.time.running(() => action(this.opened.act));
		} finally {
			await this.refusedWhereGone();
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
		for (const current of running) moved.push(await this.setAt(current, easedAlong(current, progress)));
		return moved;
	}

	/** A running move set at a progress of its own, every sound it makes by then heard; the move, with those to come. */
	private async setAt(current: Running, progress: number): Promise<Running> {
		await this.set(current.change, progress, current.movesThePage);
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
			movesThePage: movesThePage(move),
			unheard: soundsOf(move)
		};
	}

	private changeOf(move: Move): Change | Promise<Change> {
		return move.begin({
			scene: this.scene,
			page: this.opened.page,
			format: this.format,
			pageShown: this.opened.stage.kind,
			act: (action) => this.acted(action)
		});
	}

	/** A change set at a progress; a change of the page itself leaves the page's picture behind the page. */
	private async set(change: Change, progress: number, changesThePage: boolean): Promise<void> {
		this.scene = await change(this.scene, progress);
		this.pageChangedSinceTaken ||= changesThePage;
	}

	/**
	 * One frame: the page's own time run on to its moment, then the frame exposed along its time and kept where the
	 * footage keeps it, and counted; refused where the stage or its page is gone. Whether a move of the page runs on past
	 * it says whether a picture of the page serves this frame alone.
	 */
	private async frame(time: FrameTime, pageMovesOn: boolean): Promise<void> {
		await this.pageTimeRunOn(time.before);
		await this.refusedWhereGone();
		if (this.footage.keeps(this.shot)) {
			await this.footage.keep(this.shot, await this.exposed(time, pageMovesOn));
		}
		this.shot += 1;
	}

	/**
	 * The page's own time run on as far as the film's has gone since it was last, at its speed half-way along the way:
	 * between where the scene the frame before left set it and where the scene sets it now.
	 */
	private async pageTimeRunOn(before: Scene): Promise<void> {
		const moment = this.moment();
		const speedOnTheWay = between(before.pageSpeed, this.scene.pageSpeed, HALF_WAY);
		this.pageMoment += (moment - this.pageRunAt) * speedOnTheWay;
		this.pageRunAt = moment;
		await this.opened.time.runTo(this.pageMoment);
	}

	/** The take refused, by why, where the stage or the page in its frame is no longer there. */
	private async refusedWhereGone(): Promise<void> {
		const absence = await this.absence();
		if (absence !== undefined) throw absence;
	}

	/**
	 * The frame drawn as the scene stood at each moment of its time it is exposed at, its own last: all at once where the
	 * stage draws so many at once, captured as the frame; else each captured, for the footage to blend.
	 */
	private async exposed(time: FrameTime, pageMovesOn: boolean): Promise<Exposures> {
		const own = seenIn(this.scene, this.format);
		const along = (await this.alsoExposed(time)).map((scene) => seenIn(scene, this.format));
		await this.pageShown(this.opened.stage, this.zoomPictured(own, along, pageMovesOn));
		const ownDrawn = this.drawnAt(own);
		const alongDrawn = along.map((exposure) => this.drawnAt(exposure));
		if (alongDrawn.length < this.opened.stage.exposuresAtOnce) {
			return { earlier: [], own: await this.capturedAtOnce([...alongDrawn, ownDrawn]) };
		}
		const earlier: Uint8Array[] = [];
		for (const exposure of alongDrawn) earlier.push(await this.captured([exposure]));
		return { earlier, own: await this.capturedAtOnce([ownDrawn]) };
	}

	/**
	 * The scenes a frame is exposed at besides its own, as they stood along its time: as many as the smear while its
	 * shutter is open takes; none where the film is not blurred.
	 */
	private async alsoExposed(time: FrameTime): Promise<readonly Scene[]> {
		const blur = this.motionBlur;
		if (blur === null) return [];
		const smear = await this.smearOf(time, blur);
		const scenes: Scene[] = [];
		for (const back of alsoExposedBack(smear, this.format.frame, blur)) scenes.push(await this.sceneBack(time, back));
		return scenes;
	}

	/**
	 * How far anything on the frame moves while its shutter is open, from the scene as it opened to the scene as it
	 * stands: stretch by stretch between the moments a move of the frame begins at, each from where things stand as a
	 * move begins, with it, to where they stand as the next begins, without it. So what a move sets as it begins — a
	 * light on another block, code in place of other code — is not taken for a move, as nothing moved there.
	 */
	private async smearOf(time: FrameTime, blur: MotionBlur): Promise<number> {
		const opened = progressBack(time, blur.shutter);
		const beginnings = new Set(
			time.moves.map((current) => current.within.start).filter((start) => start > opened && start < time.progress)
		);
		let smear = NOTHING_SMEARED;
		let start = opened;
		for (const end of [...[...beginnings].sort(inOrder), time.progress]) {
			const from = await this.sceneOf(time, start, begunBy(time.moves, start));
			const to = await this.sceneOf(time, end, begunBefore(time.moves, end));
			smear += frameShiftBetween(from, to, this.format);
			start = end;
		}
		return smear;
	}

	/**
	 * The scene as it stood so far back from the frame's moment, a share of the time from the frame before: the scene the
	 * frame before left, with every move of the frame's time begun by then set as far as it had come.
	 */
	private sceneBack(time: FrameTime, back: number): Promise<Scene> {
		const progress = progressBack(time, back);
		return this.sceneOf(time, progress, begunBy(time.moves, progress));
	}

	/**
	 * The scene at a point of the frame's step: the scene the frame before left, with the moves of the frame's time named
	 * set as far as each had come there, one ended at its end, in the order they began, so a move that takes over from
	 * another of its part sets what it sets once that one is done.
	 */
	private async sceneOf(time: FrameTime, progress: number, begun: readonly Running[]): Promise<Scene> {
		let scene = time.before;
		for (const ran of begun) scene = await ran.change(scene, easedAlong(ran, progress));
		return scene;
	}

	/**
	 * A frame's exposures drawn and captured at once; or, where the stage would draw them as it drew the last captured,
	 * that capture.
	 */
	private async capturedAtOnce(exposures: readonly DrawnScene[]): Promise<Uint8Array> {
		const drawing = drawingOf(exposures);
		const unchanged = this.capturedAs(drawing);
		if (unchanged !== undefined) return unchanged;
		const image = await this.captured(exposures);
		this.lastCaptured = { drawing, image };
		return image;
	}

	/**
	 * How close a picture of the page taken for a frame holds it: as close as the frame's cameras and pieces of the page
	 * come where it serves that frame alone, as a move of the page runs on past it or its own motion is let go, so the
	 * next frame takes another; as close as livereel's bound elsewhere, so it serves every frame after it.
	 */
	private zoomPictured(own: SceneSeen, along: readonly SceneSeen[], pageMovesOn: boolean): number {
		const servesThisFrameAlone = pageMovesOn || this.opened.act.motion.released;
		if (!servesThisFrameAlone) return ZOOM_AT_MOST;
		const pieces = [own, ...along].flatMap((exposure) =>
			pictureZoomsIn(exposure.scene, exposure.camera, this.format.frame)
		);
		return zoomPicturedFor(
			own.camera,
			along.map((exposure) => exposure.camera),
			pieces
		);
	}

	/**
	 * The page as the stage is to show it: live in its frame as it is, or its picture retaken, where due, at a zoom; a
	 * page heard to change of itself is due, as a page acted on is.
	 */
	private async pageShown(stage: Stage, zoom: number): Promise<void> {
		switch (stage.kind) {
			case 'framed':
				return;
			case 'pictured':
				if (stage.changedOfItself()) this.pageChangedSinceTaken = true;
				if (this.pageMayHaveChanged()) await this.pageRetaken(stage, zoom);
		}
	}

	/** Whether the page may stand otherwise than its picture: changed since, not yet still, or moving of itself. */
	private pageMayHaveChanged(): boolean {
		return this.pageChangedSinceTaken || !this.pageStandsStill || this.opened.act.motion.released;
	}

	/**
	 * The page's picture taken anew, at a zoom; the page standing still where it came out as the last one did with
	 * nothing done to the page between them and its own motion stilled.
	 */
	private async pageRetaken(stage: PicturedStage, zoom: number): Promise<void> {
		const changedBefore = this.pageChangedSinceTaken;
		this.pageChangedSinceTaken = false;
		const alike = await stage.retakePage(zoom);
		this.pageStandsStill = alike && !changedBefore && !this.opened.act.motion.released;
	}

	/**
	 * The last capture at once, where it was drawn as this drawing is on a page standing still as it was then; none
	 * elsewhere. A picture taken anew alike to the last shows what that capture showed.
	 */
	private capturedAs(drawing: string): Uint8Array | undefined {
		return this.pageStandsStill && this.lastCaptured?.drawing === drawing ? this.lastCaptured.image : undefined;
	}

	/** An exposure as the stage draws it at the frame's moment. */
	private drawnAt(exposure: SceneSeen): DrawnScene {
		return drawn(exposure.scene, exposure.camera, this.moment(), this.format);
	}

	/** A frame's exposures drawn on the stage at once, and captured. */
	private async captured(exposures: readonly DrawnScene[]): Promise<Uint8Array> {
		await this.opened.stage.draw(exposures);
		return this.opened.stage.capture();
	}

	private moment(): number {
		return momentOf(this.shot);
	}

	private finished(): boolean {
		return this.footage.complete(this.shot);
	}
}

/** How far along a running move is, eased, when its step is `progress` along. */
function easedAlong(current: Running, progress: number): number {
	return current.ease(current.within.along(progress));
}

/** How far along its step a frame's time stands so far back from the frame's moment, a share of its time. */
function progressBack(time: FrameTime, back: number): number {
	return time.progress - back * time.frameShare;
}

/** The moves of a frame's time begun by a point of the step, those beginning there among them. */
function begunBy(moves: readonly Running[], progress: number): readonly Running[] {
	return moves.filter((current) => current.within.start <= progress);
}

/** The moves of a frame's time begun before a point of the step, those beginning there left out. */
function begunBefore(moves: readonly Running[], progress: number): readonly Running[] {
	return moves.filter((current) => current.within.start < progress);
}

/** Points of a step, the earlier first. */
function inOrder(first: number, second: number): number {
	return first - second;
}

/**
 * Moves in the order they begin: by where their shares start, and of two that start alike the one that ends first, so
 * a move done at a moment, as an act, is done before any that begins as it is done reads the scene and the page.
 */
function inBeginningOrder(first: Move, second: Move): number {
	const startsApart = first.timing.within.start - second.timing.within.start;
	return startsApart === 0 ? first.timing.within.end - second.timing.within.end : startsApart;
}
