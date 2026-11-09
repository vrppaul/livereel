import { expect, test } from 'vitest';
import type { Pose } from '../../src/domain/camera.ts';
import type { Format } from '../../src/domain/geometry.ts';
import type { MotionBlur } from '../../src/domain/shutter.ts';
import { FilmError, TakeError } from '../../src/domain/errors.ts';
import { easeOutCubic, linear } from '../../src/domain/time.ts';
import { type Bounds, type Change, type Move, timingOf } from '../../src/direction/move.ts';
import { cut, hold, play } from '../../src/direction/steps.ts';
import { act } from '../../src/moves/act.ts';
import { to as cameraTo } from '../../src/moves/camera.ts';
import { scrollTo as scrollCodeTo, show as showCode } from '../../src/moves/code.ts';
import { show as showLens } from '../../src/moves/lens.ts';
import { to as lookTo } from '../../src/moves/look.ts';
import { on, to } from '../../src/moves/light.ts';
import { click, hide, press, release, to as cursorTo } from '../../src/moves/cursor.ts';
import { show } from '../../src/moves/ending.ts';
import { act as actAtAMoment, speed, type as typeIntoThePage } from '../../src/moves/page.ts';
import { shows as screenShows, sweep as sweepScreen } from '../../src/moves/screen.ts';
import { play as playSound } from '../../src/moves/sound.ts';
import { open, type } from '../../src/moves/terminal.ts';
import { lean as leanTitle, show as showTitle, to as titleTo } from '../../src/moves/title.ts';
import { to as windowTo } from '../../src/moves/window.ts';
import { hide as hidePiece, show as showPiece, to as pieceTo } from '../../src/moves/piece.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Keystroke } from '../../src/domain/typing.ts';
import type { EndingCard } from '../../src/props/ending.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { pageKeyOf } from '../../src/direction/page.ts';
import { type Scene, openingScene } from '../../src/scene.ts';
import type { Exposures, PageTime, Stage } from '../../src/studio/ports.ts';
import { Take } from '../../src/studio/take.ts';
import {
	FootageOf,
	FramedStageThatKeeps,
	PageOfBoxes,
	PageTimeLogged,
	FOCAL_LENGTH,
	PicturedStageThatKeeps,
	SMALL,
	type StageThatKeeps,
	TrackThatKeeps,
	openedOn
} from './fakes.ts';

const FIRST = { left: 10, top: 10, width: 100, height: 50 };
const SECOND = { left: 200, top: 100, width: 80, height: 40 };
const PAGE = new Map([
	['#first', FIRST],
	['#second', SECOND]
]);
const CLICK: Sound = { kind: 'livereel', name: 'click' };
const KEY: Sound = { kind: 'livereel', name: 'key' };
const ON_THE_BUTTERFLY: Sound = { kind: 'keyboard', keyboard: 'butterfly' };
const ENDING: Sound = { kind: 'livereel', name: 'ending' };
const CARD: EndingCard = { name: 'A name', line: 'A line', command: 'a command' };
// A frame as large as the stage's look was made on, whose whole screen a camera shows at a zoom of 1
const WHOLE_AT_ZOOM_ONE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1080, height: 1080 } };
// Its screen whole, and its middle twice as close; a frame's own exposure, drawn last
const WHOLE_SCREEN: Pose = { focusX: 540, focusY: 540, zoom: 1 };
const TWICE_CLOSE: Pose = { ...WHOLE_SCREEN, zoom: 2 };
// Boxes of that frame, in its shares, half of it and an eighth of it across and down from its top left corner
const HALF_THE_FRAME = { left: 0, top: 0, width: 0.5, height: 0.5 };
const AN_EIGHTH_OF_THE_FRAME = { left: 0, top: 0, width: 0.125, height: 0.125 };
const OWN = -1;
// Two letters, the first showing on the third of six frames of typing, the second on the sixth
const STROKES: readonly Keystroke[] = [
	{ at: 0.1, typed: 'a' },
	{ at: 0.2, typed: 'ab' }
];
// A film camera's shutter, open for half the way, of four exposures at most
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
// The rate the take's frames are counted at: each frame a thirtieth of a second, as the moments below are written
const RATE = 30;
// The camera close on the screen's right edge, a page's pixel to a frame's pixel, as 2.7 is on a frame of 400 (1080 /
// 400): from the whole screen, at two thirds of that, a fast way
const CLOSE_AT_THE_RIGHT: Pose = { focusX: 400, focusY: 200, zoom: 2.7 };
// The frame's left and right halves, where a title stands
// The screen's middle as close as a screen's pixel is a frame's, and twelve of its pixels to the right of it
const CLOSE_ON_THE_MIDDLE: Pose = { focusX: 300, focusY: 200, zoom: 2.7 };
const A_LITTLE_TO_THE_RIGHT: Pose = { ...CLOSE_ON_THE_MIDDLE, focusX: 312 };
// A film shot unblurred
const UNBLURRED = null;
// A page of the film's own
const OWN_PAGE = { html: '<p id="first">Ours</p>' };
// Forty lines of code, each its number
const MANY_LINES = [...Array(40).keys()].map((line) => `const line${line} = ${line};`).join('\n');
const LEFT_HALF = { left: 0, top: 0, width: 0.5, height: 1 };
const MIDDLE_QUARTER = { left: 0.25, top: 0.25, width: 0.5, height: 0.5 };
const WIDER_MIDDLE = { left: 0.175, top: 0.175, width: 0.65, height: 0.65 };
const RIGHT_HALF = { left: 0.5, top: 0, width: 0.5, height: 1 };
const DEGREES_IN_A_HALF_TURN = 180;
// Why a stage's page is gone, as a stage says it
const GONE = new FilmError('the page at http://app/refusing/ refuses to be framed');
// A picture of the page as it came out against the last: alike, or changed as the page answers the film
const ALIKE = true;
const CHANGED = false;

/** A move on the screen that writes down every progress it is set at. */
class Counted implements Move {
	readonly part = 'screen';
	readonly timing;
	readonly progresses: number[] = [];

	constructor(within: Bounds) {
		this.timing = timingOf({ within, ease: linear });
	}

	begin(): Change {
		return (scene, progress) => this.noted(scene, progress);
	}

	noted(scene: Scene, progress: number): Scene {
		this.progresses.push(progress);
		return scene;
	}
}

/** A move on the screen that writes in a log that it began, as it begins. */
class LoggedAsItBegins implements Move {
	readonly part = 'screen';
	readonly timing;
	readonly log: string[];

	constructor(within: Bounds, log: string[]) {
		this.timing = timingOf({ within });
		this.log = log;
	}

	begin(): Change {
		this.log.push('begun');
		return (scene) => scene;
	}
}

/** Footage that keeps the frames it is told to, the stage's page going as each is kept: a page gone as it was shot. */
class KeptAsThePageGoes extends FootageOf {
	readonly stage: StageThatKeeps;

	constructor(wanted: readonly number[], stage: StageThatKeeps) {
		super(wanted);
		this.stage = stage;
	}

	override async keep(shot: number, exposures: Exposures): Promise<void> {
		await super.keep(shot, exposures);
		await this.stage.lose(GONE);
	}
}

/** A stage that lays as many exposures of a frame over one another as the blur makes at most, and captures them once. */
class LayeringStageThatKeeps extends PicturedStageThatKeeps {
	override readonly exposuresAtOnce = HALF_OF_FOUR.exposuresAtMost;
}

/** A stage that cannot say whether it is there, as one whose browser is gone. */
class StageNotAnswering extends PicturedStageThatKeeps {
	override absence(): Promise<Error | undefined> {
		return Promise.reject(new Error('the browser has been closed'));
	}
}

/** A stage whose page is still answering the film: its pictures come out alike or not as given, one after another. */
class StageAnswering extends PicturedStageThatKeeps {
	readonly pictures: boolean[];

	/** Whether each picture of the page, one after another, comes out as the last. */
	constructor(pictures: readonly boolean[]) {
		super();
		this.pictures = [...pictures];
	}

	override retakePage(zoom: number): Promise<boolean> {
		this.retakenAt.push(zoom);
		return Promise.resolve(this.pictures.shift()!);
	}
}

/** A page whose picture never changes, which says it changed of itself as the take asks the times given, from 0. */
class StageChangingOfItself extends PicturedStageThatKeeps {
	readonly changedAsked: readonly number[];
	private asked = 0;

	constructor(changedAsked: readonly number[]) {
		super();
		this.changedAsked = changedAsked;
	}

	override changedOfItself(): boolean {
		const changed = this.changedAsked.includes(this.asked);
		this.asked += 1;
		return changed;
	}
}

function takeOf(
	footage: FootageOf,
	stage: Stage,
	track = new TrackThatKeeps(),
	time: PageTime = new PageTimeLogged(),
	motionBlur: MotionBlur | null = HALF_OF_FOUR
): Take {
	const opened = openedOn(new PageOfBoxes(PAGE), stage, time);
	return new Take({
		opened,
		footage,
		track,
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur,
		framesPerSecond: RATE
	});
}

/** A take of a film that shows a page of its own, the page the stage lays for it given. */
function takeShowingOwnPage(footage: FootageOf, stage: Stage, filmed: PageOfBoxes, own: PageOfBoxes): Take {
	const ownPages = new Map([[pageKeyOf(OWN_PAGE.html), own]]);
	return new Take({
		opened: openedOn(filmed, stage, new PageTimeLogged(), ownPages),
		footage,
		track: new TrackThatKeeps(),
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
}

/** A take of a film shot unblurred, so each frame it keeps is one drawing. */
function unblurredTakeOf(footage: FootageOf, stage: Stage): Take {
	return takeOf(footage, stage, new TrackThatKeeps(), new PageTimeLogged(), UNBLURRED);
}

/** A take on a frame as large as the stage's look was made on, its whole screen shown by a camera at a zoom of 1. */
function takeOfTheWholeScreen(footage: FootageOf, stage: Stage): Take {
	return new Take({
		opened: openedOn(new PageOfBoxes(PAGE), stage),
		footage,
		track: new TrackThatKeeps(),
		format: WHOLE_AT_ZOOM_ONE,
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
}

function cosineOf(degrees: number): number {
	return Math.cos((degrees * Math.PI) / DEGREES_IN_A_HALF_TURN);
}

test('a frame the camera crosses fast is drawn again along its way from the frame before, each kept with its own', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1, 2]);
	// Two frames of the camera's way, half of it each, then one with nothing moving, on a page drawn every frame
	const steps = [
		play({ seconds: 2 / 30, moves: [cameraTo(CLOSE_AT_THE_RIGHT)], ease: linear }),
		hold({ seconds: 1 / 30 })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.camera.pose.focusX)]).toEqual([
		[4, 4, 1],
		[331.25, 337.5, 343.75, 350, 381.25, 387.5, 393.75, 400, 400]
	]);
});

test('a frame the camera crosses fast is drawn at once as every exposure along its way, where the stage lays them over one another, and captured once', async () => {
	const stage = new LayeringStageThatKeeps();
	const footage = new FootageOf([0, 1, 2]);
	const steps = [
		play({ seconds: 2 / 30, moves: [cameraTo(CLOSE_AT_THE_RIGHT)], ease: linear }),
		hold({ seconds: 1 / 30 })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.draws, stage.captured, stage.drawn.map((scene) => scene.camera.pose.focusX)]).toEqual([
		[1, 1, 1],
		[4, 4, 1],
		3,
		[331.25, 337.5, 343.75, 350, 381.25, 387.5, 393.75, 400, 400]
	]);
});

test('an object sliding fast while the camera stands is drawn again along its own way, each kept with its own: the one sliding in from past the edge, the one it pushes off from where it stood', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1, 2]);
	// A title in the frame's left half pushed off by another sliding in from the right over two frames, then one frame
	// with nothing moving; each drawing lists the lefts of the title standing and of the one pushed off
	const steps = [
		cut(showTitle('First', { at: LEFT_HALF })),
		play({ seconds: 2 / 30, moves: [showTitle('Second', { at: LEFT_HALF, from: 'right' })], ease: linear }),
		hold({ seconds: 1 / 30 })
	];
	await takeOf(footage, stage).run(steps);
	const lefts = stage.drawn.map((scene) => [...scene.objects, ...scene.leaving].map((object) => object.box.left));
	expect([footage.exposed, lefts]).toEqual([
		[4, 4, 1],
		[[275, -125], [250, -150], [225, -175], [200, -200], [75, -325], [50, -350], [25, -375], [0], [0]]
	]);
});

test('a frame two moves of one object meet in is drawn along each in turn: the second, begun later in the frame, not yet in the earlier exposures', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// A title carried to the frame's right half over the first of two frames, and back over the second; the second
	// begins on the first frame
	const steps = [
		cut(showTitle('Words', { at: LEFT_HALF })),
		play({
			seconds: 2 / 30,
			moves: [titleTo(RIGHT_HALF, { within: { end: 0.5 } }), titleTo(LEFT_HALF, { within: { start: 0.5 } })],
			ease: linear
		})
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.objects[0]!.box.left)]).toEqual([
		[4, 4],
		[125, 150, 175, 200, 75, 50, 25, 0]
	]);
});

test("an object sliding fast inside the page's window while the camera stands is drawn again along its way", async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// A title sliding in from the right into the left half of the window, which fills the frame, over two frames
	const steps = [
		play({
			seconds: 2 / 30,
			moves: [showTitle('Words', { at: LEFT_HALF, inside: 'window', from: 'right' })],
			ease: linear
		})
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.objects[0]!.box.left)]).toEqual([
		[4, 4],
		[275, 250, 225, 200, 75, 50, 25, 0]
	]);
});

test('an object leant or grown fast while the camera stands is drawn again along its way, as far as it was at each', async () => {
	const leantStage = new FramedStageThatKeeps();
	const grownStage = new FramedStageThatKeeps();
	const leantFootage = new FootageOf([0, 1]);
	const grownFootage = new FootageOf([0, 1]);
	// A title in the frame's left half leant back 60 degrees over two frames, and one grown to twice its size
	await takeOf(leantFootage, leantStage).run([
		cut(showTitle('Words', { at: LEFT_HALF })),
		play({ seconds: 2 / 30, moves: [leanTitle({ tilt: 60 })], ease: linear })
	]);
	await takeOf(grownFootage, grownStage).run([
		cut(showTitle('Words', { at: LEFT_HALF })),
		play({ seconds: 2 / 30, moves: [titleTo(LEFT_HALF, { scale: 2 })], ease: linear })
	]);
	// Leant back, the title's height is drawn short by the cosine of its tilt, its middle level with the eye's so the
	// eye adds nothing down it; grown face-on, as wide as its scale
	expect([
		[leantFootage.exposed, leantStage.drawn.map((scene) => scene.objects[0]!.transform.matrix.m22)],
		[grownFootage.exposed, grownStage.drawn.map((scene) => scene.objects[0]!.transform.matrix.m11)]
	]).toEqual([
		[[4, 4], [18.75, 22.5, 26.25, 30, 48.75, 52.5, 56.25, 60].map(cosineOf)],
		[
			[4, 4],
			[1.3125, 1.375, 1.4375, 1.5, 1.8125, 1.875, 1.9375, 2]
		]
	]);
});

test('a frame the cursor crosses fast while the camera stands is drawn again along its way', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// The cursor on the first block, then to the second over two frames on a straight line, from 65 across to 244
	const steps = [
		cut(cursorTo('#first')),
		play({ seconds: 2 / 30, moves: [cursorTo('#second', { bow: 0 })], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.cursor!.left)]).toEqual([
		[4, 4],
		[120.9375, 132.125, 143.3125, 154.5, 210.4375, 221.625, 232.8125, 244]
	]);
});

test('a frame the light crosses fast from one block to another is drawn again along its way', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	const steps = [cut(on('#first')), play({ seconds: 2 / 30, moves: [to('#second')], ease: linear })];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.light!.box.left)]).toEqual([
		[4, 4],
		[69.375, 81.25, 93.125, 105, 164.375, 176.25, 188.125, 200]
	]);
});

test('a frame code scrolls fast through in a pane that stands still is drawn again along its scroll', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// Forty lines, scrolled until the last stands at the pane's top over two frames
	const steps = [
		cut(showCode(MANY_LINES, { at: LEFT_HALF })),
		play({ seconds: 2 / 30, moves: [scrollCodeTo(40)], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.objects[0]!.content.scrolled)]).toEqual([
		[4, 4],
		[12.1875, 14.625, 17.0625, 19.5, 31.6875, 34.125, 36.5625, 39]
	]);
});

test('a frame a title comes up fast in, out from under a mask where its box stands still, is drawn again along its way', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	const steps = [
		play({ seconds: 2 / 30, moves: [showTitle('Words', { at: LEFT_HALF, enter: 'mask' })], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect(footage.exposed).toEqual([4, 4]);
});

test('a frame the camera crosses slowly under a lens standing still is drawn again as often as the page moves in the lens, faster than on the screen', async () => {
	const unmagnified = new PicturedStageThatKeeps();
	const magnified = new PicturedStageThatKeeps();
	const unmagnifiedFootage = new FootageOf([0, 1]);
	const magnifiedFootage = new FootageOf([0, 1]);
	// The camera a little to the right over two frames, under a lens showing the page as large as the camera does,
	// and under one showing it four times as large
	const close = cut(cameraTo(CLOSE_ON_THE_MIDDLE));
	const pan = play({ seconds: 2 / 30, moves: [cameraTo(A_LITTLE_TO_THE_RIGHT)], ease: linear });
	await takeOf(unmagnifiedFootage, unmagnified).run([close, cut(showLens('#second', { magnification: 1 })), pan]);
	await takeOf(magnifiedFootage, magnified).run([close, cut(showLens('#second', { magnification: 4 })), pan]);
	expect([unmagnifiedFootage.exposed, magnifiedFootage.exposed]).toEqual([
		[2, 2],
		[4, 4]
	]);
});

test("a frame the window opens fast in is drawn again along its edge's way, though the page in it stands", async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// A window in the frame's middle quarter, opened about its middle over two frames, never as tall as the screen, so
	// the camera shows the page at its size and in its place there
	const steps = [
		cut(windowTo(MIDDLE_QUARTER)),
		play({ seconds: 2 / 30, moves: [windowTo(WIDER_MIDDLE)], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect(footage.exposed).toEqual([4, 4]);
});

test('a frame a title comes up fast in, wiped in from its left edge while it stands, is drawn again along its edge', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	const steps = [
		play({ seconds: 2 / 30, moves: [showTitle('Words', { at: LEFT_HALF, enter: 'wipe' })], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect(footage.exposed).toEqual([4, 4]);
});

test('a frame a light is put on another block in, while its shutter is open, is exposed once: what a move sets as it begins is no move', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([1]);
	// The light on the first block, then on the second as the second frame's shutter has stood open a while
	const steps = [
		cut(on('#first')),
		play({ seconds: 2 / 30, moves: [on('#second', { within: { start: 0.9 } })], ease: linear })
	];
	await takeOf(footage, stage).run(steps);
	expect(footage.exposed).toEqual([1]);
});

test("the screen shows a page of the film's own from a moment of a play: the exposures before it show the filmed page, those from it the film's own", async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1]);
	// The camera fast over two frames, the second's exposures a sixteenth of the step apart from 0.8125 on
	const moves = [cameraTo(CLOSE_AT_THE_RIGHT), screenShows(OWN_PAGE, { within: { start: 0.875 } })];
	await takeOf(footage, stage).run([play({ seconds: 2 / 30, moves, ease: linear })]);
	expect(stage.drawn.map((scene) => scene.screen.shows.kind)).toEqual([
		'filmed',
		'filmed',
		'filmed',
		'filmed',
		'filmed',
		'own',
		'own',
		'own'
	]);
});

test("a block a move names is measured on the page the screen shows: the film's own, where it shows it", async () => {
	const stage = new FramedStageThatKeeps();
	const ownPage = new PageOfBoxes(new Map([['#first', SECOND]]));
	const steps = [cut(screenShows(OWN_PAGE)), cut(on('#first')), hold({ seconds: 1 / 30 })];
	await takeShowingOwnPage(new FootageOf([0]), stage, new PageOfBoxes(PAGE), ownPage).run(steps);
	expect(stage.drawn[0]!.light!.box).toEqual(SECOND);
});

test("keys typed into the page while the screen shows the film's own go to the filmed page behind it", async () => {
	const filmedPage = new PageOfBoxes(PAGE);
	const ownPage = new PageOfBoxes(PAGE);
	const steps = [cut(screenShows(OWN_PAGE)), play({ seconds: 2 / 30, moves: [typeIntoThePage(STROKES)] })];
	await takeShowingOwnPage(new FootageOf([1]), new FramedStageThatKeeps(), filmedPage, ownPage).run(steps);
	expect([filmedPage.typed, ownPage.typed]).toEqual([['a', 'b'], []]);
});

test("a page framed live is acted on laid flat as the filmed page, while the screen shows the film's own", async () => {
	const stage = new FramedStageThatKeeps();
	const steps = [cut(screenShows(OWN_PAGE)), act(() => Promise.resolve())];
	await takeShowingOwnPage(new FootageOf([0]), stage, new PageOfBoxes(PAGE), new PageOfBoxes(PAGE)).run(steps);
	expect(stage.laidFlat.map((scene) => scene.screen.shows.kind)).toEqual(['filmed']);
});

test('a frame of a film with no blur is exposed once, however fast the camera crosses it', async () => {
	const footage = new FootageOf([0]);
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), new PicturedStageThatKeeps()),
		footage,
		track: new TrackThatKeeps(),
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: null,
		framesPerSecond: RATE
	});
	await take.run([play({ seconds: 1 / 30, moves: [cameraTo(CLOSE_AT_THE_RIGHT)] })]);
	expect(footage.exposed).toEqual([1]);
});

test('a static page whose picture comes out twice alike stands still: each frame drawn as the one before is that frame, the page not taken again', async () => {
	const stage = new PicturedStageThatKeeps();
	const footage = new FootageOf([0, 1, 2, 3]);
	await takeOf(footage, stage).run([hold({ seconds: 4 / 30 })]);
	expect([footage.kept, stage.drawn.length, stage.captured, stage.retakenAt.length]).toEqual([[0, 1, 2, 3], 1, 1, 2]);
});

test('a static page still answering is taken and captured every frame until its picture comes out as the last', async () => {
	const stage = new StageAnswering([ALIKE, CHANGED, CHANGED, ALIKE]);
	const footage = new FootageOf([0, 1, 2, 3, 4]);
	await takeOf(footage, stage).run([hold({ seconds: 5 / 30 })]);
	expect([footage.kept, stage.captured, stage.retakenAt.length]).toEqual([[0, 1, 2, 3, 4], 3, 4]);
});

test('a static page that changed of itself is taken anew, and on every frame after until its picture comes out as the last', async () => {
	// The page heard changing as the fourth frame is shot, after its picture stood still from the second
	const stage = new StageChangingOfItself([3]);
	const footage = new FootageOf([0, 1, 2, 3, 4, 5]);
	await takeOf(footage, stage).run([hold({ seconds: 6 / 30 })]);
	expect([footage.kept, stage.retakenAt.length, stage.captured]).toEqual([[0, 1, 2, 3, 4, 5], 2 + 2, 1 + 1]);
});

test("the page's time begins the film, is run on to each frame's moment, kept or not, and runs as the wall's only while an act waits on the page", async () => {
	const time = new PageTimeLogged();
	const frame = 1 / 30;
	const steps = [hold({ seconds: 2 * frame }), act(() => Promise.resolve()), hold({ seconds: 2 * frame })];
	// Only the last frame kept, as a still keeps it
	await takeOf(new FootageOf([3]), new PicturedStageThatKeeps(), new TrackThatKeeps(), time).run(steps);
	expect(time.log).toEqual(['begun', 0, frame, 'waited', 2 * frame, 3 * frame]);
});

test("an act at a moment of a play is done as its share begins, the page's time running as the wall's while the film's stands, and the play's other moves go on round it", async () => {
	const time = new PageTimeLogged();
	const frame = 1 / 30;
	const counted = new Counted({});
	// Where the play's other move stood as the act was done
	const setAsActed: number[] = [];
	const acting = actAtAMoment(
		async () => {
			setAsActed.push(...counted.progresses);
		},
		{ within: { start: 0.5 } }
	);
	// Unblurred, so the other move is set at no moment but its frames'
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), new PicturedStageThatKeeps(), time),
		footage: new FootageOf([3]),
		track: new TrackThatKeeps(),
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: null,
		framesPerSecond: RATE
	});
	await take.run([play({ seconds: 4 * frame, moves: [counted, acting], ease: linear })]);
	expect([setAsActed, counted.progresses, time.log]).toEqual([
		[0.25],
		[0.25, 0.5, 0.75, 1],
		['begun', 0, 'waited', frame, 2 * frame, 3 * frame]
	]);
});

test('a move that begins at the moment of an act begins on the page the act left, though it is written before it', async () => {
	const log: string[] = [];
	const acting = actAtAMoment(
		async () => {
			log.push('acted');
		},
		{ within: { start: 0.5 } }
	);
	const steps = [play({ seconds: 4 / 30, moves: [new LoggedAsItBegins({ start: 0.5 }, log), acting] })];
	await takeOf(new FootageOf([3]), new PicturedStageThatKeeps()).run(steps);
	expect(log).toEqual(['acted', 'begun']);
});

test('a press and a let-go go on while the cursor goes its way: it comes to rest where it goes, pressed in on the way and let go', async () => {
	const stage = new PicturedStageThatKeeps();
	// Four frames: the cursor's way over all of them, pressed in by the second once the first has it on the screen, let
	// go by the fourth
	const moves = [cursorTo('#first'), press({ within: { start: 0.3, end: 0.5 } }), release({ within: { start: 0.5 } })];
	await unblurredTakeOf(new FootageOf([1, 3]), stage).run([play({ seconds: 4 / 30, moves })]);
	expect([stage.drawn[0]?.cursor?.press, stage.drawn[1]?.cursor]).toEqual([1, { left: 65, top: 40, press: 0 }]);
});

test("a press goes in, and a let-go comes out, quick then settling, on a curve of their own whatever the play's", async () => {
	const stage = new PicturedStageThatKeeps();
	// Two frames of a straight play each: half-way along, a press is in by its curve's half-way share
	const steps = [
		cut(cursorTo('#first')),
		play({ seconds: 2 / 30, moves: [press()], ease: linear }),
		play({ seconds: 2 / 30, moves: [release()], ease: linear })
	];
	await takeOf(new FootageOf([0, 2]), stage).run(steps);
	expect(stage.drawn.map((scene) => scene.cursor?.press)).toEqual([easeOutCubic(0.5), 1 - easeOutCubic(0.5)]);
});

test("the page's time runs at the speed the film sets it to, a frame at its speed on the way through it: through the speeds between in a play, from a cut on at once, and stands at none", async () => {
	const time = new PageTimeLogged();
	const frame = 1 / 30;
	// A frame at the film's own speed, a play of two frames on to a speed of 3, half-way at its first, so its frames run
	// at 1.5 and 2.5 on their way; then none at once
	const steps = [
		hold({ seconds: frame }),
		play({ seconds: 2 * frame, moves: [speed(3)], ease: linear }),
		cut(speed(0)),
		hold({ seconds: frame })
	];
	await takeOf(new FootageOf([3]), new PicturedStageThatKeeps(), new TrackThatKeeps(), time).run(steps);
	expect(time.log).toEqual([
		'begun',
		0,
		expect.closeTo(1.5 * frame),
		expect.closeTo((1.5 + 2.5) * frame),
		expect.closeTo((1.5 + 2.5) * frame)
	]);
});

test('a dynamic page is shown live and captured every frame, though nothing in the scene moves', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([0, 1, 2]);
	await takeOf(footage, stage).run([hold({ seconds: 3 / 30 })]);
	expect([footage.kept, stage.drawn.length, stage.captured]).toEqual([[0, 1, 2], 3, 3]);
});

test("a static page is taken anew after an act, while a move of the page's own runs, and while its own motion is let go", async () => {
	const stage = new PicturedStageThatKeeps();
	const footage = new FootageOf([...Array(16).keys()]);
	const frame = 1 / 30;
	// Each step's pictures taken, then frames captured
	const steps = [
		// The first frame taken and captured, the second taken alike and kept as it: 2, 1
		hold({ seconds: 3 * frame }),
		act(() => Promise.resolve()),
		// Taken after the act and once more alike: 2, 1
		hold({ seconds: 3 * frame }),
		// Taken and captured on each frame the page is typed into: 2, 2
		play({ seconds: 2 * frame, moves: [typeIntoThePage(STROKES)] }),
		// Taken once more alike, then kept: 1, 0
		hold({ seconds: 3 * frame }),
		act((context) => context.motion.release()),
		// Taken and captured on each frame while the page moves of itself: 2, 2
		hold({ seconds: 2 * frame }),
		act((context) => context.motion.still()),
		// Taken after the act and once more alike: 2, 1
		hold({ seconds: 3 * frame })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.kept.length, stage.retakenAt.length, stage.captured]).toEqual([
		16,
		2 + 2 + 2 + 1 + 2 + 2,
		1 + 1 + 2 + 0 + 2 + 1
	]);
});

test("a static page is pictured as close as the frame's camera comes on each frame a move of it runs on past, or its own motion is let go, and as close as livereel's bound on every other", async () => {
	const stage = new PicturedStageThatKeeps();
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), stage),
		footage: new FootageOf([...Array(7).keys()]),
		track: new TrackThatKeeps(),
		format: WHOLE_AT_ZOOM_ONE,
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
	const frame = 1 / 30;
	const steps = [
		play({ seconds: 2 * frame, moves: [typeIntoThePage(STROKES)] }),
		hold({ seconds: frame }),
		act((context) => context.motion.release()),
		hold({ seconds: 2 * frame }),
		act((context) => context.motion.still()),
		hold({ seconds: frame })
	];
	await take.run(steps);
	expect(stage.retakenAt).toEqual([1, 2.2, 2.2, 1, 1, 2.2]);
});

test('a static page is pictured as close as a piece of it shows it on a frame its picture serves alone', async () => {
	const stage = new PicturedStageThatKeeps();
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), stage),
		footage: new FootageOf([0]),
		track: new TrackThatKeeps(),
		format: WHOLE_AT_ZOOM_ONE,
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
	// The first block, 100 × 50, lifted and carried to a box 135 pixels square: 1.35 of the frame's pixels a page's
	await take.run([
		cut(showPiece('#first')),
		cut(pieceTo({ left: 0, top: 0, width: 0.125, height: 0.125 })),
		act((context) => context.motion.release()),
		hold({ seconds: 1 / 30 })
	]);
	expect(stage.retakenAt).toEqual([1.35]);
});

test('a piece is refused on a page framed live, which has no picture to draw it from', async () => {
	await expect(takeOf(new FootageOf([0]), new FramedStageThatKeeps()).run([cut(showPiece('#first'))])).rejects.toThrow(
		"at 0.0 s, step 1: piece.show draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'"
	);
});

test("a piece holding its picture has the stage hold one of its source as the page stands as it is lifted, as sharp as livereel's bound, and is drawn from it", async () => {
	const stage = new PicturedStageThatKeeps();
	await takeOf(new FootageOf([0]), stage).run([
		cut(showPiece('#first', { picture: 'held' })),
		hold({ seconds: 1 / 30 })
	]);
	expect([stage.held, stage.drawn.at(OWN)!.objects[0]!.content]).toEqual([
		[{ part: FIRST, zoom: 2.2 }],
		expect.objectContaining({ picture: { kind: 'own', number: 1 } })
	]);
});

test("a piece drawn from the page's picture past livereel's bound has the stage hold a picture of its source as close as the frame draws it, and is drawn from it", async () => {
	const stage = new PicturedStageThatKeeps();
	// The first block, 100 × 50, carried to a box 540 pixels square: 5.4 of the frame's pixels a page's
	await takeOfTheWholeScreen(new FootageOf([0]), stage).run([
		cut(showPiece('#first')),
		cut(pieceTo(HALF_THE_FRAME)),
		hold({ seconds: 1 / 30 })
	]);
	expect([stage.held, stage.drawn.at(OWN)!.objects[0]!.content]).toEqual([
		[{ part: FIRST, zoom: expect.closeTo(5.4) }],
		expect.objectContaining({ picture: { kind: 'own', number: 1 } })
	]);
});

test("a piece growing past livereel's bound is pictured as close as its move takes it, not anew on each frame of its way", async () => {
	const stage = new PicturedStageThatKeeps();
	// The first block, 100 × 50, grown evenly to a box 540 pixels square over three frames, past the bound from the
	// first; the page pictured on the first two frames, as it is found still on the second
	await takeOfTheWholeScreen(new FootageOf([0, 1, 2]), stage).run([
		cut(showPiece('#first')),
		play({ seconds: 3 / 30, moves: [pieceTo(HALF_THE_FRAME)], ease: linear })
	]);
	expect(stage.held.map((asked) => asked.zoom)).toEqual([expect.closeTo(5.4)]);
});

test("a piece's picture drawn past livereel's bound is taken anew where the page's comes out otherwise than the last, the one before let go, and kept where it comes out alike", async () => {
	// The page pictured on the first frame, and on the second, which finds it still; then acted on before the fourth,
	// its picture coming out otherwise
	const stage = new StageAnswering([false, true, false]);
	await takeOfTheWholeScreen(new FootageOf([0, 1, 2, 3]), stage).run([
		cut(showPiece('#first')),
		cut(pieceTo(HALF_THE_FRAME)),
		hold({ seconds: 3 / 30 }),
		act(() => Promise.resolve()),
		hold({ seconds: 1 / 30 })
	]);
	expect([stage.retakenAt.length, stage.held.length, stage.letGone]).toEqual([3, 2, [1]]);
});

test("a page typed into under a piece drawn past livereel's bound from a picture of its own is pictured as close as the camera shows it", async () => {
	const stage = new PicturedStageThatKeeps();
	// The camera shows the whole screen at its size; the typing's last frame is pictured as sharp as the bound
	await takeOfTheWholeScreen(new FootageOf([0, 1]), stage).run([
		cut(showPiece('#first')),
		cut(pieceTo(HALF_THE_FRAME)),
		play({ seconds: 2 / 30, moves: [typeIntoThePage(STROKES)] })
	]);
	expect(stage.retakenAt).toEqual([1, 2.2]);
});

test('a picture the stage holds for a piece is let go once no piece is drawn from it: one a piece holds once it is hidden, one past the bound once its piece is carried back within it', async () => {
	const stage = new PicturedStageThatKeeps();
	await takeOfTheWholeScreen(new FootageOf([0, 1]), stage).run([
		cut(showPiece('#first', { picture: 'held', as: 'held' })),
		cut(showPiece('#second', { as: 'grown' })),
		cut(pieceTo(HALF_THE_FRAME, { as: 'grown' })),
		hold({ seconds: 1 / 30 }),
		cut(hidePiece({ as: 'held' })),
		cut(pieceTo(AN_EIGHTH_OF_THE_FRAME, { as: 'grown' })),
		hold({ seconds: 1 / 30 })
	]);
	// The held piece's picture is the first, the grown piece's the second: the second let go as the second frame is
	// drawn without it, the first once that frame is shot from a scene that names it no more
	expect(stage.letGone).toEqual([2, 1]);
});

test("a sweep of the screen has the stage hold a picture of the whole screen as the page stands as it begins, as sharp as livereel's bound, draws the screen swept from it, and lets it go once the sweep is over", async () => {
	const stage = new PicturedStageThatKeeps();
	await unblurredTakeOf(new FootageOf([0, 1, 2]), stage).run([
		play({ seconds: 2 / 30, moves: [sweepScreen()], ease: linear }),
		hold({ seconds: 1 / 30 })
	]);
	expect([stage.held, stage.drawn.at(0)!.screen.sweep, stage.drawn.at(OWN)!.screen.sweep, stage.letGone]).toEqual([
		[{ part: { left: 0, top: 0, width: 600, height: 400 }, zoom: 2.2 }],
		expect.objectContaining({ picture: 1 }),
		null,
		[1]
	]);
});

test("a static page moving under a camera that crosses the frame fast is pictured as close as the frame's closest exposure", async () => {
	const stage = new PicturedStageThatKeeps();
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), stage),
		footage: new FootageOf([0]),
		track: new TrackThatKeeps(),
		format: WHOLE_AT_ZOOM_ONE,
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
	// The camera drawn back from twice close to the whole screen on the first of two frames of typing
	const steps = [
		cut(cameraTo(TWICE_CLOSE)),
		play({ seconds: 2 / 30, moves: [cameraTo(WHOLE_SCREEN, { within: { end: 0.5 } }), typeIntoThePage(STROKES)] })
	];
	await take.run(steps);
	const zooms = stage.drawn.map((scene) => scene.camera.pose.zoom);
	expect([stage.retakenAt, zooms.at(OWN)! < Math.max(...zooms)]).toEqual([[Math.max(...zooms)], true]);
});

test('two moves of the look at once each move their own values over the frames they share: the glow drifting all the way, the ink changing over the first half', async () => {
	const stage = new PicturedStageThatKeeps();
	const steps = [
		play({
			seconds: 4 / 30,
			moves: [lookTo({ glowX: 1 }), lookTo({ ink: '#000000' }, { within: { end: 0.5 } })],
			ease: linear
		})
	];
	await takeOf(new FootageOf([0, 1, 2, 3]), stage).run(steps);
	expect(stage.drawn.map((scene) => [scene.look.glowX, scene.look.ink])).toEqual([
		[0.625, '#7a7b7dff'],
		[0.75, '#000000'],
		[0.875, '#000000'],
		[1, '#000000']
	]);
});

test('a cut is not blurred: the frame after it is exposed once, however far it moved the camera', async () => {
	const footage = new FootageOf([0]);
	await takeOf(footage, new PicturedStageThatKeeps()).run([
		cut(cameraTo(CLOSE_AT_THE_RIGHT)),
		hold({ seconds: 1 / 30 })
	]);
	expect(footage.exposed).toEqual([1]);
});

test("livereel's sounds are heard as their moves begin: the click as the press goes in, the ending as it comes", async () => {
	const track = new TrackThatKeeps();
	// The cursor's way takes frames 0 to 2, the press 3 to 5, letting go 6 to 9, the ending from frame 10
	const steps = [
		play({ seconds: 0.1, moves: [cursorTo('#first')] }),
		...click(() => Promise.resolve()),
		play({ seconds: 0.1, moves: [show(CARD)] })
	];
	await takeOf(new FootageOf([20]), new PicturedStageThatKeeps(), track).run(steps);
	expect(track.heard).toEqual([
		{ moment: 3 / 30, sound: CLICK },
		{ moment: 10 / 30, sound: ENDING }
	]);
});

test('a click given a file of the film is heard as that file', async () => {
	const track = new TrackThatKeeps();
	const steps = [
		play({ seconds: 0.1, moves: [cursorTo('#first')] }),
		...click(() => Promise.resolve(), { sound: './pop.wav' })
	];
	await takeOf(new FootageOf([20]), new PicturedStageThatKeeps(), track).run(steps);
	expect(track.heard).toEqual([{ moment: 3 / 30, sound: { kind: 'file', path: './pop.wav' } }]);
});

test('each key typed into the terminal is heard on the frame its letter shows', async () => {
	const track = new TrackThatKeeps();
	const stage = new PicturedStageThatKeeps();
	const steps = [cut(open('A terminal')), play({ seconds: 0.2, moves: [type(STROKES)] })];
	await takeOf(new FootageOf([1, 2, 5]), stage, track).run(steps);
	expect([track.heard, stage.drawn.map((scene) => scene.objects.map((object) => object.content.typed))]).toEqual([
		[
			{ moment: 2 / 30, sound: KEY },
			{ moment: 5 / 30, sound: KEY }
		],
		[[''], ['a'], ['ab']]
	]);
});

test('each key typed into the page is heard on the frame it is pressed', async () => {
	const track = new TrackThatKeeps();
	const page = new PageOfBoxes(PAGE);
	const opened = openedOn(page, new PicturedStageThatKeeps());
	const footage = new FootageOf([9]);
	const take = new Take({
		opened,
		footage,
		track,
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK, FOCAL_LENGTH),
		motionBlur: HALF_OF_FOUR,
		framesPerSecond: RATE
	});
	await take.run([play({ seconds: 0.2, moves: [typeIntoThePage(STROKES)] })]);
	expect([track.heard, page.typed]).toEqual([
		[
			{ moment: 2 / 30, sound: KEY },
			{ moment: 5 / 30, sound: KEY }
		],
		['a', 'b']
	]);
});

test('a typing that names a keyboard has each key heard on it, into the terminal or the page', () => {
	const typed = [type(STROKES, { keyboard: 'butterfly' }), typeIntoThePage(STROKES, { keyboard: 'butterfly' })];
	expect(typed.map((move) => move.sounds)).toEqual([
		[
			{ at: 0.5, sound: ON_THE_BUTTERFLY },
			{ at: 1, sound: ON_THE_BUTTERFLY }
		],
		[
			{ at: 0.5, sound: ON_THE_BUTTERFLY },
			{ at: 1, sound: ON_THE_BUTTERFLY }
		]
	]);
});

test("a sound played in a cut is heard at the cut's moment, and one played in a step as its share begins", async () => {
	const track = new TrackThatKeeps();
	// Three frames, the cut, then six frames whose second half the second sound begins
	const steps = [
		play({ seconds: 0.1 }),
		cut(playSound('./pop.wav')),
		play({ seconds: 0.2, moves: [playSound('./whoosh.wav', { within: { start: 0.5 } })] })
	];
	await takeOf(new FootageOf([20]), new PicturedStageThatKeeps(), track).run(steps);
	expect(track.heard).toEqual([
		{ moment: 3 / 30, sound: { kind: 'file', path: './pop.wav' } },
		{ moment: 5 / 30, sound: { kind: 'file', path: './whoosh.wav' } }
	]);
});

test('a move is set along its share, at its end exactly once, and never after', async () => {
	const counted = new Counted({ end: 0.5 });
	// Ten frames, the move over the first half of them
	await takeOf(new FootageOf([9]), new PicturedStageThatKeeps()).run([play({ seconds: 10 / 30, moves: [counted] })]);
	expect(counted.progresses).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
});

test('a move begun and ended within one frame is set at its end once', async () => {
	const counted = new Counted({ start: 0.45, end: 0.5 });
	// Ten frames: the share begins after the fourth and ends on the fifth
	await takeOf(new FootageOf([9]), new PicturedStageThatKeeps()).run([play({ seconds: 10 / 30, moves: [counted] })]);
	expect(counted.progresses).toEqual([1]);
});

test('a move begun at its share reads what an earlier move of the step left', async () => {
	const stage = new PicturedStageThatKeeps();
	const steps = [
		play({ seconds: 0.2, moves: [on('#first', { within: { end: 0.5 } }), to('#second', { within: { start: 0.5 } })] })
	];
	await takeOf(new FootageOf([5]), stage).run(steps);
	expect(stage.drawn.at(-1)?.light?.box).toEqual(SECOND);
});

test('a cut sets its moves at their end at once, with no frame between', async () => {
	const stage = new PicturedStageThatKeeps();
	const steps = [play({ seconds: 0.1, moves: [cursorTo('#first')] }), cut(hide()), play({ seconds: 0.1 })];
	await unblurredTakeOf(new FootageOf([2, 3]), stage).run(steps);
	expect([stage.drawn[0]?.cursor === null, stage.drawn[1]?.cursor]).toEqual([false, null]);
});

test('a frame is drawn only when the footage keeps it', async () => {
	const stage = new FramedStageThatKeeps();
	const footage = new FootageOf([2, 4]);
	await takeOf(footage, stage).run([play({ seconds: 0.2 })]);
	expect([stage.drawn.length, footage.kept]).toEqual([2, [2, 4]]);
});

test('a fault in a step is raised with the moment and the step it was met at', async () => {
	const steps = [play({ seconds: 0.1 }), act(() => Promise.reject(new Error('the page broke')))];
	await expect(takeOf(new FootageOf([9]), new PicturedStageThatKeeps()).run(steps)).rejects.toThrow(
		new TakeError(new Error('the page broke'), 0.1, 2)
	);
});

test('no frame is shot where the stage or its page is gone: the take is refused by why, at the step that would shoot it', async () => {
	const stage = new PicturedStageThatKeeps();
	await stage.lose(GONE);
	await expect(takeOf(new FootageOf([9]), stage).run([play({ seconds: 0.1 })])).rejects.toThrow(
		new TakeError(GONE, 0, 1)
	);
	expect(stage.drawn).toEqual([]);
});

test('an act that leaves the stage or its page gone is refused by why, though nothing after it is shot', async () => {
	const stage = new PicturedStageThatKeeps();
	await expect(takeOf(new FootageOf([9]), stage).run([act(() => stage.lose(GONE))])).rejects.toThrow(
		new TakeError(GONE, 0, 1)
	);
});

test('a last frame kept as the stage or its page went is refused by why, at the last step', async () => {
	const stage = new PicturedStageThatKeeps();
	await expect(takeOf(new KeptAsThePageGoes([2], stage), stage).run([play({ seconds: 0.1 })])).rejects.toThrow(
		new TakeError(GONE, 0.1, 1)
	);
});

test('a fault a step meets where the stage cannot be asked whether it is there is said as met', async () => {
	const steps = [act(() => Promise.reject(new Error('the page broke')))];
	await expect(takeOf(new FootageOf([9]), new StageNotAnswering()).run(steps)).rejects.toThrow(
		new TakeError(new Error('the page broke'), 0, 1)
	);
});

test('a fault a step meets where the stage or its page is gone is said by why it is gone', async () => {
	const stage = new PicturedStageThatKeeps();
	const failing = act(() => stage.lose(GONE).then(() => Promise.reject(new Error('nothing matches h1'))));
	await expect(takeOf(new FootageOf([9]), stage).run([failing])).rejects.toThrow(new TakeError(GONE, 0, 1));
});
