import { expect, test } from 'vitest';
import type { Pose } from '../../src/domain/camera.ts';
import type { Format } from '../../src/domain/geometry.ts';
import type { MotionBlur } from '../../src/domain/shutter.ts';
import { FilmError, TakeError } from '../../src/domain/errors.ts';
import { linear } from '../../src/domain/time.ts';
import { type Bounds, type Change, type Move, timingOf } from '../../src/direction/move.ts';
import { act, cut, hold, play } from '../../src/direction/steps.ts';
import { to as cameraTo } from '../../src/moves/camera.ts';
import { to as lookTo } from '../../src/moves/look.ts';
import { on, to } from '../../src/moves/light.ts';
import { click, hide, to as cursorTo } from '../../src/moves/cursor.ts';
import { show } from '../../src/moves/ending.ts';
import { type as typeIntoThePage } from '../../src/moves/page.ts';
import { play as playSound } from '../../src/moves/sound.ts';
import { open, type } from '../../src/moves/terminal.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Keystroke } from '../../src/domain/typing.ts';
import type { EndingCard } from '../../src/props/ending.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { type Scene, openingScene } from '../../src/scene.ts';
import type { Exposures, Stage } from '../../src/studio/ports.ts';
import { Take } from '../../src/studio/take.ts';
import {
	FootageOf,
	FramedStageThatKeeps,
	PageOfBoxes,
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
const ENDING: Sound = { kind: 'livereel', name: 'ending' };
const CARD: EndingCard = { name: 'A name', line: 'A line', command: 'a command' };
// A frame as large as the stage's look was made on, whose whole screen a camera shows at a zoom of 1
const WHOLE_AT_ZOOM_ONE: Format = { frame: { width: 1080, height: 1080 }, screen: { width: 1080, height: 1080 } };
// Its screen whole, and its middle twice as close; a frame's own exposure, drawn last
const WHOLE_SCREEN: Pose = { focusX: 540, focusY: 540, zoom: 1, tilt: 0, turn: 0 };
const TWICE_CLOSE: Pose = { ...WHOLE_SCREEN, zoom: 2 };
const OWN = -1;
// Two letters, the first showing on the third of six frames of typing, the second on the sixth
const STROKES: readonly Keystroke[] = [
	{ at: 0.1, typed: 'a' },
	{ at: 0.2, typed: 'ab' }
];
// A film camera's shutter, open for half the way, of four exposures at most
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
// The camera close on the screen's right edge, a page's pixel to a frame's pixel, as 2.7 is on a frame of 400 (1080 /
// 400): from the whole screen, at two thirds of that, a fast way
const CLOSE_AT_THE_RIGHT: Pose = { focusX: 400, focusY: 200, zoom: 2.7, tilt: 0, turn: 0 };
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

function takeOf(footage: FootageOf, stage: Stage, track = new TrackThatKeeps()): Take {
	const opened = openedOn(new PageOfBoxes(PAGE), stage);
	return new Take({
		opened,
		footage,
		track,
		format: SMALL,
		opening: openingScene(SMALL, LIVEREELS_LOOK),
		motionBlur: HALF_OF_FOUR
	});
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
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK),
		motionBlur: HALF_OF_FOUR
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

test("a static page moving under a camera that crosses the frame fast is pictured as close as the frame's closest exposure", async () => {
	const stage = new PicturedStageThatKeeps();
	const take = new Take({
		opened: openedOn(new PageOfBoxes(PAGE), stage),
		footage: new FootageOf([0]),
		track: new TrackThatKeeps(),
		format: WHOLE_AT_ZOOM_ONE,
		opening: openingScene(WHOLE_AT_ZOOM_ONE, LIVEREELS_LOOK),
		motionBlur: HALF_OF_FOUR
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
	expect([track.heard, stage.drawn.map((scene) => scene.terminal?.typed)]).toEqual([
		[
			{ moment: 2 / 30, sound: KEY },
			{ moment: 5 / 30, sound: KEY }
		],
		['', 'a', 'ab']
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
		opening: openingScene(SMALL, LIVEREELS_LOOK),
		motionBlur: HALF_OF_FOUR
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
	await takeOf(new FootageOf([2, 3]), stage).run(steps);
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
