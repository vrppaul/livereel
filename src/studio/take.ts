/**
 * One take of a film: its steps run frame by frame on the film's own clock. The take alone holds the scene, the count
 * of frames shot and how far the page's own time has run.
 *
 * In a play each frame begins the moves whose share begins by then, in the order they begin, then sets every running
 * change at its eased progress. One move at most drives a part, or a value of it, at any point, so the order moves are
 * written in matters nowhere but between two acts at one moment. A frame is drawn only where the footage keeps it, and
 * exposed again along its time where anything on it moved fast.
 */
import { type Camera, ZOOM_AT_MOST, flatCamera, zoomPicturedFor } from '../domain/camera.ts';
import { FilmError, TakeError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import type { Box } from '../domain/geometry.ts';
import { type PartAsked, closestOf } from '../domain/picture.ts';
import type { BlockKey } from '../domain/placement.ts';
import { type MotionBlur, alsoExposedBack } from '../domain/shutter.ts';
import { type Ease, type Stretch, linear } from '../domain/curves.ts';
import { framesOf, momentOf } from '../domain/time.ts';
import type { TypedText } from '../domain/typing.ts';
import { between } from '../domain/toward.ts';
import {
	type Beginning,
	type Change,
	type Move,
	type MoveInItsStep,
	type Share,
	type StepBegunIn,
	movesTheFrame,
	movesThePage,
	soundsOf
} from '../direction/move.ts';
import type { Action, FilmedPage, MeasuredPage, Rounding, ScrollAim, ScrollCourse } from '../direction/page.ts';
import type { Cue } from '../direction/sound.ts';
import type { CutShot, PlayShot, StepShot } from '../direction/steps.ts';
import {
	type DrawnScene,
	type Scene,
	type SceneAt,
	type SceneSeen,
	cameraOf,
	drawingOf,
	drawn,
	frameShiftBetween,
	ownPageStandingIn,
	partsAskedSharperIn,
	pictureZoomsIn,
	seenIn,
	showingTheFilmedPage,
	withFadeLaid,
	withPagesLaid,
	withProp
} from '../scene.ts';
import { sharpPartRead } from '../direction/sharp.ts';
import { type PartPictures, picturesOn } from './pictures.ts';
import type { Exposures, Footage, FramedStage, Opened, PicturedStage, Stage, Track } from './ports.ts';

// Half-way along a frame, where a speed that changes evenly over it stands at its mean
const HALF_WAY = 0.5;
// How far a frame smears where nothing on it moves
const NOTHING_SMEARED = 0;
// The shade's blur of a page blurred none, which keeps no part of it sharp
const UNBLURRED = 0;
// The end of a step, where every move of it stands at its end; and how many parts a frame asks where it asks none
const AT_THEIR_ENDS = 1;
const NONE = 0;
// The frame before a play's first, whose moment the play begins at; and how long a cut's moves take, set at once at the
// moment of the frame after them, on their own curve or a straight one, never gone along
const A_FRAME = 1;
const AT_ONCE = 0;
// No text written into a film's own page, as the stage lays it
const NO_TEXTS_TYPED: readonly TypedText[] = [];
// What a move of the frame begun ahead of its share says as it reads more than the scene; and the page it is handed
const READ_AHEAD =
	'a move of the camera, the window or the eye beginning while a page runs with its pace judged on the frame is begun as the run begins, to know where the frame will stand: begun so early, it may read the scene alone, not the page or where the frame will stand; let it begin once the run is at rest';
// The step a cut's moves begin in, which foresees nothing; and the play a move of the frame begun ahead of its share
// begins in, which it may not ask where the frame will stand
const IN_A_CUT: StepBegunIn = { kind: 'cut' };
const IN_A_PLAY_BEGUN_AHEAD: StepBegunIn = { kind: 'play', cameraAt: refusedAhead };
// The blocks of a film's own page whose scroll a move of the film's moves: none, as its run alone moves it
const NO_BLOCK_SCROLLED: readonly BlockKey[] = [];
const PAGE_UNREAD_AHEAD: FilmedPage = {
	box: refusedAhead,
	groundBehind: refusedAhead,
	roundingOf: refusedAhead,
	letterAtTheStart: refusedAhead,
	scrollCourse: refusedAhead,
	blocksHolding: refusedAhead,
	type: refusedAhead,
	press: refusedAhead
};

/** A move begun, as the take runs it. */
interface Running {
	readonly within: Share;
	readonly ease: Ease;
	readonly change: Change;
	readonly movesThePage: boolean;
	/** The sounds it has yet to make. */
	readonly unheard: readonly Cue[];
}

/** A play on the film's time. */
interface PlayTime {
	/** The moment it begins: a frame before its first frame, which stands a frame's share along it. */
	readonly start: number;
	/** How long its frames take. */
	readonly seconds: number;
	/** The curve its moves take where they name none. */
	readonly ease: Ease;
}

/** A play as a move of it begins, which may ask where the frame will stand later in it. */
interface Foresight {
	/** The scene the move begins on. */
	readonly scene: Scene;
	/** The moves running then, but the page's. */
	readonly running: readonly Running[];
	/** The moves yet to begin. */
	readonly unbegun: readonly MoveInItsStep[];
	/** The moves of the frame begun ahead of their share, each kept for it. */
	readonly ahead: Map<MoveInItsStep, Running>;
	readonly playTime: PlayTime;
}

/** A frame's time in its play. */
interface FrameTime {
	/** The scene the frame before left. */
	readonly before: Scene;
	/**
	 * The moves that ran over it, those running as the frame before was shot and those begun since, in the order they
	 * began.
	 */
	readonly moves: readonly Running[];
	/** How far along its step the frame is. */
	readonly progress: number;
	/** The share of the step a frame takes. */
	readonly frameShare: number;
}

/** A frame's exposures as the stage drew and captured them at once: the scenes said whole, and the image. */
interface Captured {
	readonly drawing: string;
	readonly image: Uint8Array;
}

/** What a take is shot with. */
export interface TakeSetup {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly track: Track;
	readonly format: Format;
	/** The scene it opens on. */
	readonly opening: Scene;
	/** How a fast move is blurred: not at all for a draft, or for a film that wants no blur. */
	readonly motionBlur: MotionBlur | null;
	readonly framesPerSecond: number;
}

export class Take {
	readonly opened: Opened;
	readonly footage: Footage;
	readonly track: Track;
	readonly format: Format;
	readonly motionBlur: MotionBlur | null;
	readonly framesPerSecond: number;
	// The pictures of parts of the screen the stage holds for pieces
	readonly pictures: PartPictures;
	private scene: Scene;
	private shot = 0;
	// The last exposures captured at once, none before the first; how many times the page may have changed, by a move of
	// it, an act among them, or of itself; where the stage shows a picture of the page, how many changes its picture was
	// last taken after, none before the first, and whether the page stood still as it was, its picture alike to the one
	// before, as a framed page never is
	private lastCaptured: Captured | null = null;
	private pageChanges = 0;
	private pictureTakenAfter: number | null = null;
	private pageStandsStill = false;
	// How far the film's frames have taken the page's own time since the film began, in its own seconds, at the scene's
	// speed; and the film's moment they took it to
	private pageMoment = 0;
	private pageRunAt = 0;
	// The part of the page the shade keeps sharp as the film named it when its box was last read, none before the first,
	// and how many changes of the page it was read after
	private sharpReadFrom: Scene['window']['sharpNamed'] = null;
	private sharpReadAfter = 0;

	constructor(setup: TakeSetup) {
		this.opened = setup.opened;
		this.footage = setup.footage;
		this.track = setup.track;
		this.format = setup.format;
		this.scene = setup.opening;
		this.motionBlur = setup.motionBlur;
		this.framesPerSecond = setup.framesPerSecond;
		this.pictures = picturesOn(setup.opened.stage);
	}

	/** How many frames are shot so far. */
	get shots(): number {
		return this.shot;
	}

	/**
	 * The film begun where the page's time stands, each of the film's own pages the stage laid standing on the screen as
	 * its document stands, then every step in turn, until the steps or the footage run out; then the stage asked once
	 * more, so a last frame kept as its page went is not kept without a word.
	 */
	async run(steps: readonly StepShot[]): Promise<void> {
		this.scene = withPagesLaid(this.scene, await this.scrollLengthsLaid());
		this.opened.time.begin();
		let begun = 0;
		for (const step of steps) {
			if (this.finished()) break;
			await this.taken(begun, () => this.step(step));
			begun += 1;
		}
		await this.taken(begun - 1, () => this.refusedWhereGone());
	}

	/** How far each of the film's own pages the stage laid scrolls at most, by its key, with nothing typed into it. */
	private async scrollLengthsLaid(): Promise<ReadonlyMap<string, number>> {
		const measured = [...this.opened.ownPages.laid].map(
			async ([key, page]) => [key, await page.scrollLengthWith(NO_TEXTS_TYPED)] as const
		);
		return new Map(await Promise.all(measured));
	}

	/**
	 * A part of the take, at the step of that place in the film; a fault in it raised with the moment and the step it was
	 * met at, said by why where it can be.
	 */
	private async taken(place: number, work: () => Promise<void>): Promise<void> {
		try {
			await work();
		} catch (fault) {
			if (!(fault instanceof Error)) throw fault;
			throw new TakeError(await this.explained(fault), this.moment(), place + 1);
		}
	}

	/**
	 * A step's fault, or why the stage or its page is gone where one is, which explains it: a selector that matches
	 * nothing on Chrome's error page fails for the page's loss.
	 */
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

	private step(step: StepShot): Promise<void> {
		switch (step.kind) {
			case 'play':
				return this.play(step);
			case 'cut':
				return this.cut(step);
		}
	}

	private async play(step: PlayShot): Promise<void> {
		const frames = framesOf(step.seconds, this.framesPerSecond);
		const playTime: PlayTime = {
			start: momentOf(this.shot - A_FRAME, this.framesPerSecond),
			seconds: frames / this.framesPerSecond,
			ease: step.ease
		};
		let waiting = [...step.moves];
		let running: Running[] = [];
		// The moves of the frame begun ahead of their share, as a move judged on the frame asks, each kept until its share
		const ahead = new Map<MoveInItsStep, Running>();
		for (let index = 1; index <= frames; index += 1) {
			if (this.finished()) return;
			const progress = index / frames;
			const due = waiting.filter((move) => move.timing.within.start <= progress).sort(inBeginningOrder);
			waiting = waiting.filter((move) => !due.includes(move));
			const before = this.scene;
			// What runs over the frame's time: the moves running as the frame before was shot, and those begun since
			const ranOver = [...running];
			for (const [place, move] of due.entries()) {
				running = await this.endedBy(running, move.timing.within.start);
				const unbegun = [...due.slice(place + 1), ...waiting];
				const foreseen = askableAtAnyMoment(running);
				const foresight: Foresight = { scene: this.scene, running: foreseen, unbegun, ahead, playTime };
				const begun = await this.begunInPlay(move, foresight);
				running.push(begun);
				ranOver.push(begun);
			}
			running = await this.endedBy(running, progress);
			running = await this.setAlong(running, progress);
			const moves = askableAtAnyMoment(ranOver);
			await this.frame(
				{ before, moves, progress, frameShare: 1 / frames },
				running.some((current) => current.movesThePage)
			);
		}
	}

	/**
	 * A cut: its moves begun one after another, each on the scene the ones before it left, and set at their ends; then
	 * the page a fade in it leaves, held where the camera framed it, laid where the camera the cut leaves shows it, as
	 * the frame after the cut is the first seen by that camera.
	 */
	private async cut(step: CutShot): Promise<void> {
		for (const move of step.moves) {
			const change = await this.changeOf(move, atOnceBy(move, this.moment()), IN_A_CUT);
			await this.set(change, AT_THEIR_ENDS, AT_THEIR_ENDS, movesThePage(move));
			this.heard(soundsOf(move), AT_THEIR_ENDS);
		}
		this.scene = withFadeLaid(this.scene, this.format);
	}

	/**
	 * An act on the page as the stage shows it, between steps or as a move that acts begins: where the stage shows a
	 * picture, it leaves it behind the page.
	 */
	private acted(action: Action): Promise<void> {
		this.pageChanges += 1;
		const stage = this.opened.stage;
		switch (stage.kind) {
			case 'framed':
				return this.actedOnFlat(stage, action);
			case 'pictured':
				return this.actedOn(action);
		}
	}

	/**
	 * An act on a framed page, its screen laid flat for it showing the filmed page, whatever page it shows, and stood up
	 * again once it is done and the stage found still there, as a stage gone cannot stand up. A framed page has no
	 * picture, so no piece stands to be drawn from one sharper.
	 */
	private async actedOnFlat(stage: FramedStage, action: Action): Promise<void> {
		const flatFormat = { ...this.format, frame: this.format.screen };
		const camera = flatCamera(this.format, this.scene.eye.focalLength);
		await stage.layFlat(
			drawn(showingTheFilmedPage(this.scene), camera, this.moment(), flatFormat, this.pictures.sharper)
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
		for (const ending of running.filter((current) => current.within.end <= point)) {
			await this.setAt(ending, AT_THEIR_ENDS, AT_THEIR_ENDS);
		}
		return running.filter((current) => current.within.end > point);
	}

	/**
	 * Every running move set at its eased progress, and the share of its time gone, when its step is `progress` along.
	 */
	private async setAlong(running: readonly Running[], progress: number): Promise<Running[]> {
		const moved: Running[] = [];
		for (const current of running) {
			moved.push(await this.setAt(current, easedAlong(current, progress), current.within.along(progress)));
		}
		return moved;
	}

	/**
	 * A running move set at a progress of its own, with a share of its time gone, every sound it makes by then heard; the
	 * move, with those to come.
	 */
	private async setAt(current: Running, progress: number, timeGone: number): Promise<Running> {
		await this.set(current.change, progress, timeGone, current.movesThePage);
		return { ...current, unheard: this.heard(current.unheard, progress) };
	}

	/** The sounds due by a progress heard, at the moment of the frame being made; those still to come. */
	private heard(cues: readonly Cue[], progress: number): readonly Cue[] {
		for (const cue of cues.filter((due) => due.at <= progress)) this.track.hear(this.moment(), cue.sound);
		return cues.filter((due) => due.at > progress);
	}

	/**
	 * A move of a play begun as its share starts, or the one begun ahead of it for a move judged on the frame, taken as
	 * it was begun then; a move begun now foresees the frame by the play as it stands.
	 */
	private async begunInPlay(move: MoveInItsStep, foresight: Foresight): Promise<Running> {
		const begunAhead = foresight.ahead.get(move);
		if (begunAhead !== undefined) {
			foresight.ahead.delete(move);
			return begunAhead;
		}
		const stretch = stretchIn(move, foresight.playTime);
		const inThePlay: StepBegunIn = { kind: 'play', cameraAt: (moment) => this.cameraForeseen(foresight, moment) };
		return runningOf(move, stretch, await this.changeOf(move, stretch, inThePlay));
	}

	/**
	 * The camera a play's frame will be seen by at a moment of it, foreseen as a move of it begins: every move of the
	 * frame due to begin by then begun ahead, then the scene the move begins on with each move running but the page's and
	 * each begun ahead by then set as far as it will have come. Another move yet to begin, or the page's own scroll, is
	 * not foreseen: an object the eye focuses on stands where the moves running will have carried it alone.
	 */
	private async cameraForeseen(foresight: Foresight, moment: number): Promise<Camera> {
		const progress = (moment - foresight.playTime.start) / foresight.playTime.seconds;
		await this.begunAhead(foresight, progress);
		const scene = await sceneAlong(foresight.scene, progress, begunBy(movesForeseen(foresight), progress));
		return cameraOf(scene, this.format);
	}

	/**
	 * Every move of the camera, the window and the eye a play has yet to begin whose share starts by a point of it, begun
	 * ahead of its share in the order they begin, each on the scene as foreseen where its share starts, with the moves
	 * begun before it but the page's set as far as they will have come, and kept for its share.
	 */
	private async begunAhead(foresight: Foresight, progress: number): Promise<void> {
		const due = foresight.unbegun
			.filter((move) => movesTheFrame(move) && move.timing.within.start <= progress && !foresight.ahead.has(move))
			.sort(inBeginningOrder);
		for (const move of due) {
			const start = move.timing.within.start;
			const scene = await sceneAlong(foresight.scene, start, begunBefore(movesForeseen(foresight), start));
			const stretch = stretchIn(move, foresight.playTime);
			foresight.ahead.set(move, runningOf(move, stretch, await move.begin(this.beginningAhead(scene, stretch))));
		}
	}

	/** A move begun as the scene stands, over a stretch of the film's time, in a step. */
	private async changeOf(move: Move, stretch: Stretch, step: StepBegunIn): Promise<Change> {
		const scene = this.scene;
		return move.begin({
			scene,
			page: await this.pageShownIn(scene, stretch.moment),
			format: this.format,
			pageShown: this.opened.stage.kind,
			stretch,
			ownPage: (key) => this.ownPageAt(scene, key, stretch.moment),
			act: (action) => this.acted(action),
			holdPicture: (part) => this.pictures.hold(part, scene.screen.shows.kind),
			edgeColour: (part, sides) => this.pictures.edgeColour(part, sides, scene.screen.shows.kind),
			step,
			thingsBuilt: this.opened.thingsBuilt,
			filmsPictures: this.opened.filmsPictures
		});
	}

	/**
	 * What a move of the frame begun ahead of its share reads: the scene as foreseen where its share starts, the format,
	 * its stretch; never the page, which stands as the move judged on the frame finds it, not as it will at the share.
	 */
	private beginningAhead(scene: Scene, stretch: Stretch): Beginning {
		return {
			scene,
			page: PAGE_UNREAD_AHEAD,
			format: this.format,
			pageShown: this.opened.stage.kind,
			stretch,
			ownPage: refusedAhead,
			act: refusedAhead,
			holdPicture: refusedAhead,
			edgeColour: refusedAhead,
			step: IN_A_PLAY_BEGUN_AHEAD,
			thingsBuilt: this.opened.thingsBuilt,
			filmsPictures: this.opened.filmsPictures
		};
	}

	/**
	 * The page a move begins on at a moment: the filmed page, or, where the screen shows a film's own page, that one
	 * stood as it stands then, the filmed page behind it still what scrolls and takes keys.
	 */
	private async pageShownIn(scene: Scene, moment: number): Promise<FilmedPage> {
		const shows = scene.screen.shows;
		switch (shows.kind) {
			case 'filmed':
				return this.opened.page;
			case 'own':
				return new OwnPageShown(await this.ownPageAt(scene, shows.key, moment), this.opened.page);
		}
	}

	/**
	 * A film's own page, by its key, as a move begun at a moment on a scene reads it: its copy stood as the page stands
	 * then, once, as it is handed over. No other move stands it before the move has read it, as the take begins one move
	 * at a time, each to its end, and a move's change reads no page; and the copy stood last is the one shown, so a
	 * picture of a part of the screen, taken as the move begins, is of the page the screen shows, as no move that
	 * pictures one (a piece holding its picture, a sweep) reads another of the film's own pages.
	 */
	private async ownPageAt(scene: Scene, key: string, moment: number): Promise<MeasuredPage> {
		await this.opened.ownPages.stand(ownPageStandingIn(scene, key, moment));
		return this.ownPageOf(key);
	}

	/** A film's own page laid apart, by its key, as every page a move shows is laid before the film. */
	private ownPageOf(key: string): MeasuredPage {
		const laid = this.opened.ownPages.laid.get(key);
		if (laid === undefined) throw new Error(`the stage laid none of the film's own pages by the key ${key}`);
		return laid;
	}

	/**
	 * A change set at a progress, with a share of its time gone; a change of the page itself counted, as it leaves the
	 * page's picture and the part kept sharp behind the page.
	 */
	private async set(change: Change, progress: number, timeGone: number, changesThePage: boolean): Promise<void> {
		this.scene = await change(this.scene, progress, timeGone);
		if (changesThePage) this.pageChanges += 1;
	}

	/**
	 * One frame: the page's own time run on to its moment, a change it made of itself heard, then the frame exposed along
	 * its time and kept where the footage keeps it, and counted; refused where the stage or its page is gone. Whether a
	 * move of the page runs on past it says whether a picture of the page serves this frame alone.
	 */
	private async frame(time: FrameTime, pageMovesOn: boolean): Promise<void> {
		await this.pageTimeRunOn(time.before);
		await this.refusedWhereGone();
		this.changesOfItselfHeard();
		await this.sharpPartReadAnew();
		if (this.footage.keeps(this.shot)) {
			await this.footage.keep(this.shot, await this.exposed(time, pageMovesOn));
		}
		await this.pictures.letGoUnnamedBy(this.scene, this.moment());
		this.shot += 1;
	}

	/**
	 * The part of the screen the shade's blur leaves sharp read off the filmed page, whose picture it is drawn from,
	 * where the film has named another part, or the page may have changed since it was read, so the part stays on the
	 * blocks the film named it by; none where the film names none. Read only on a frame that blurs the page, as no other
	 * draws a part sharp, so a part named and left behind unblurred is never read where the page has since taken it away.
	 */
	private async sharpPartReadAnew(): Promise<void> {
		const { sharpNamed: named, blur } = this.scene.window;
		if (blur <= UNBLURRED) return;
		if (named === this.sharpReadFrom && this.sharpReadAfter === this.pageChanges) return;
		this.sharpReadFrom = named;
		this.sharpReadAfter = this.pageChanges;
		const reading = { page: this.opened.page, format: this.format };
		const sharp = named === null ? null : await sharpPartRead(reading, named);
		this.scene = withProp(this.scene, 'window', { ...this.scene.window, sharp });
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
	 * stage draws so many at once, laid over one another and captured as the frame, as a capture is near all a frame
	 * costs; else each captured, for the footage to blend.
	 */
	private async exposed(time: FrameTime, pageMovesOn: boolean): Promise<Exposures> {
		const own = seenIn({ scene: this.scene, moment: this.moment() }, this.format);
		const along = (await this.alsoExposed(time)).map((exposure) => seenIn(exposure, this.format));
		const pageChanged = await this.pageShown(this.opened.stage, this.zoomPictured(own, along, pageMovesOn));
		await this.pictures.serve(await this.partsAskedFor(time, [own, ...along]), pageChanged);
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
	 * The scenes a frame is exposed at besides its own, each at its moment, as they stood along its time: as many as the
	 * smear while its shutter is open takes; none where the film is not blurred.
	 */
	private async alsoExposed(time: FrameTime): Promise<readonly SceneAt[]> {
		const blur = this.motionBlur;
		if (blur === null) return [];
		const smear = await this.smearOf(time, blur);
		const scenes: SceneAt[] = [];
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
	private sceneBack(time: FrameTime, back: number): Promise<SceneAt> {
		const progress = progressBack(time, back);
		return this.sceneOf(time, progress, begunBy(time.moves, progress));
	}

	/**
	 * The scene at a point of the frame's step, and its moment: the scene the frame before left, with the moves of the
	 * frame's time named set as far as each had come there, one ended at its end, in the order they began, so a move that
	 * takes over from another of its part sets what it sets once that one is done.
	 */
	private async sceneOf(time: FrameTime, progress: number, begun: readonly Running[]): Promise<SceneAt> {
		return { scene: await sceneAlong(time.before, progress, begun), moment: this.momentAt(time, progress) };
	}

	/** The moment of the film a point of the frame's step stands at: so many frames' time back from the frame's own. */
	private momentAt(time: FrameTime, progress: number): number {
		return this.moment() - (time.progress - progress) / time.frameShare / this.framesPerSecond;
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
	 * next frame takes another, as the whole screen at the bound costs about three times what it costs as close as a
	 * camera showing all of it; as close as livereel's bound elsewhere, so it serves every frame after it. A move's last
	 * frame is pictured at the bound, so the picture after it can come out alike.
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
	 * page heard to change of itself is due, as a page acted on is. Whether its picture came out otherwise than the last,
	 * as a page live in its frame never pictures.
	 */
	private async pageShown(stage: Stage, zoom: number): Promise<boolean> {
		switch (stage.kind) {
			case 'framed':
				return false;
			case 'pictured':
				return this.pageMayHaveChanged() && !(await this.pageRetaken(stage, zoom));
		}
	}

	/**
	 * A change the page shown as a picture made of itself since the take last asked counted, before anything of the frame
	 * reads the page: on every frame, kept or not, as the part kept sharp is read on every frame that blurs and the next
	 * frame's exposures are built from this one's scene. A page live in its frame is captured as it stands.
	 */
	private changesOfItselfHeard(): void {
		const stage = this.opened.stage;
		if (stage.kind === 'pictured' && stage.changedOfItself()) this.pageChanges += 1;
	}

	/**
	 * The parts of the screen a frame asks sharper than the page's picture: those pieces drawn from it show past
	 * livereel's bound in any of its exposures, each as close as the closest shows it; and, where there are any, as the
	 * moves running over the frame leave the scene at their ends, so a piece growing past the bound is pictured once, as
	 * close as it grows, not anew on every frame of its way.
	 */
	private async partsAskedFor(time: FrameTime, seen: readonly SceneSeen[]): Promise<readonly PartAsked[]> {
		const asked = this.partsAskedIn(seen);
		if (asked.length === NONE) return asked;
		const ending = seenIn(await this.sceneOf(time, AT_THEIR_ENDS, time.moves), this.format);
		return this.partsAskedIn([...seen, ending]);
	}

	/** The parts of the screen pieces drawn from the page's picture show past livereel's bound in some exposures. */
	private partsAskedIn(seen: readonly SceneSeen[]): readonly PartAsked[] {
		return closestOf(
			seen.flatMap((exposure) => partsAskedSharperIn(exposure.scene, exposure.camera, this.format.frame))
		);
	}

	/** Whether the page may stand otherwise than its picture: changed since, not yet still, or moving of itself. */
	private pageMayHaveChanged(): boolean {
		return this.pictureTakenAfter !== this.pageChanges || !this.pageStandsStill || this.opened.act.motion.released;
	}

	/**
	 * The page's picture taken anew, at a zoom; the page standing still where it came out as the last one did with
	 * nothing done to the page between them and its own motion stilled, so what an act brings later — results, an image,
	 * a scroll that eases out — is seen. Whether it came out as the last one did.
	 */
	private async pageRetaken(stage: PicturedStage, zoom: number): Promise<boolean> {
		const changedBefore = this.pictureTakenAfter !== this.pageChanges;
		this.pictureTakenAfter = this.pageChanges;
		const alike = await stage.retakePage(zoom);
		this.pageStandsStill = alike && !changedBefore && !this.opened.act.motion.released;
		return alike;
	}

	/**
	 * The last capture at once, where it was drawn as this drawing is on a page standing still as it was then; none
	 * elsewhere. A picture taken anew alike to the last shows what that capture showed. Such holds are near half a film's
	 * frames.
	 */
	private capturedAs(drawing: string): Uint8Array | undefined {
		return this.pageStandsStill && this.lastCaptured?.drawing === drawing ? this.lastCaptured.image : undefined;
	}

	/** An exposure as the stage draws it at its own moment, from the pictures it holds sharper for the frame. */
	private drawnAt(exposure: SceneSeen): DrawnScene {
		return drawn(exposure.scene, exposure.camera, exposure.moment, this.format, this.pictures.sharper);
	}

	/** A frame's exposures drawn on the stage at once, and captured. */
	private async captured(exposures: readonly DrawnScene[]): Promise<Uint8Array> {
		await this.opened.stage.draw(exposures);
		return this.opened.stage.capture();
	}

	private moment(): number {
		return momentOf(this.shot, this.framesPerSecond);
	}

	private finished(): boolean {
		return this.footage.complete(this.shot);
	}
}

/**
 * A film's own page as a move begins on it while the screen shows it: its blocks measured as a move reads it, its
 * scroll and its keys the filmed page's behind it, as a page the film wrote stands as written.
 */
class OwnPageShown implements FilmedPage {
	readonly measured: MeasuredPage;
	readonly filmed: FilmedPage;

	constructor(measured: MeasuredPage, filmed: FilmedPage) {
		this.measured = measured;
		this.filmed = filmed;
	}

	box(target: string, every: number): Promise<Box> {
		return this.measured.box(target, every);
	}

	groundBehind(target: string): Promise<string> {
		return this.measured.groundBehind(target);
	}

	roundingOf(target: string): Promise<Rounding> {
		return this.measured.roundingOf(target);
	}

	letterAtTheStart(target: string): Promise<Box | null> {
		return this.measured.letterAtTheStart(target);
	}

	scrollCourse(target: string, aim: ScrollAim): Promise<ScrollCourse> {
		return this.filmed.scrollCourse(target, aim);
	}

	/**
	 * The film's own page runs by its run alone, which no scroll of the film's moves, so a piece lifted riding it rides
	 * the page, not a scroll.
	 */
	blocksHolding(): Promise<readonly BlockKey[]> {
		return Promise.resolve(NO_BLOCK_SCROLLED);
	}

	type(text: string): Promise<void> {
		return this.filmed.type(text);
	}

	press(key: string): Promise<void> {
		return this.filmed.press(key);
	}
}

/** How far along a running move is, eased, when its step is `progress` along. */
function easedAlong(current: Running, progress: number): number {
	return current.ease(current.within.along(progress));
}

/**
 * A scene with moves set as far as each has come when their step is `progress` along, one ended at its end, in the
 * order they began, so a move that takes over from another of its part sets what it sets once that one is done.
 */
async function sceneAlong(scene: Scene, progress: number, moves: readonly Running[]): Promise<Scene> {
	let along = scene;
	for (const ran of moves) along = await ran.change(along, easedAlong(ran, progress), ran.within.along(progress));
	return along;
}

/** The stretch of a play's time a move's share takes, on the move's own curve or the play's. */
function stretchIn(move: MoveInItsStep, playTime: PlayTime): Stretch {
	const within = move.timing.within;
	return {
		moment: playTime.start + within.start * playTime.seconds,
		seconds: (within.end - within.start) * playTime.seconds,
		ease: move.timing.ease ?? playTime.ease
	};
}

/**
 * A move begun over a stretch of a play: its share, its curve, what it sets and whether that is the page, its sounds.
 */
function runningOf(move: MoveInItsStep, stretch: Stretch, change: Change): Running {
	return {
		within: move.timing.within,
		ease: stretch.ease,
		change,
		movesThePage: movesThePage(move),
		unheard: soundsOf(move)
	};
}

/**
 * The moves of a play that may be asked what they set at another moment than their frame's: every one but the page's,
 * whose change scrolls the page or presses its keys as it is asked, so the frames it runs over alone set it.
 */
function askableAtAnyMoment(moves: readonly Running[]): Running[] {
	return moves.filter((current) => !current.movesThePage);
}

/**
 * The moves a play's frame is foreseen by, in the order they begin: those running as the move asking begins but the
 * page's, then those begun ahead, each foresight reaching past the last, so the later begin after.
 */
function movesForeseen(foresight: Foresight): readonly Running[] {
	return [...foresight.running, ...foresight.ahead.values()];
}

/** The stretch a move of a cut takes at a moment: none, on the curve the move names, straight where it names none. */
function atOnceBy(move: Move, moment: number): Stretch {
	return { moment, seconds: AT_ONCE, ease: move.timing.ease ?? linear };
}

/** A move of the frame begun ahead of its share refused where it reads the page, or where the frame will stand. */
function refusedAhead(): Promise<never> {
	return Promise.reject(new FilmError(READ_AHEAD));
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
 * Moves in the order they begin: by where their shares start, and of two that start alike the one that ends first, so a
 * move done at a moment, as an act, is done before any that begins as it is done reads the scene and the page.
 */
function inBeginningOrder(first: MoveInItsStep, second: MoveInItsStep): number {
	const startsApart = first.timing.within.start - second.timing.within.start;
	return startsApart === 0 ? first.timing.within.end - second.timing.within.end : startsApart;
}
