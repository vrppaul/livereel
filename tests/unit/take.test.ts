import { expect, test } from 'vitest';
import type { Pose } from '../../src/domain/camera.ts';
import type { MotionBlur } from '../../src/domain/shutter.ts';
import { FilmError, TakeError } from '../../src/domain/errors.ts';
import { linear } from '../../src/domain/time.ts';
import { type Bounds, type Change, type Move, timingOf } from '../../src/direction/move.ts';
import { act, cut, hold, play } from '../../src/direction/steps.ts';
import { to as cameraTo } from '../../src/moves/camera.ts';
import { on, to } from '../../src/moves/light.ts';
import { click, hide, to as cursorTo } from '../../src/moves/cursor.ts';
import { show } from '../../src/moves/ending.ts';
import { type as typeIntoThePage } from '../../src/moves/page.ts';
import { play as playSound } from '../../src/moves/sound.ts';
import { open, type } from '../../src/moves/terminal.ts';
import type { Sound } from '../../src/direction/sound.ts';
import type { Keystroke } from '../../src/domain/typing.ts';
import type { EndingCard } from '../../src/props/ending.ts';
import { type Scene, openingScene } from '../../src/scene.ts';
import type { Exposures } from '../../src/studio/ports.ts';
import { Take } from '../../src/studio/take.ts';
import { FootageOf, PageOfBoxes, SMALL, StageThatKeeps, TrackThatKeeps, openedOn } from './fakes.ts';

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
// Two letters, the first showing on the third of six frames of typing, the second on the sixth
const STROKES: readonly Keystroke[] = [
	{ at: 0.1, typed: 'a' },
	{ at: 0.2, typed: 'ab' }
];
// A film camera's shutter, open for half the way, of four exposures at most
const HALF_OF_FOUR: MotionBlur = { shutter: 0.5, exposuresAtMost: 4 };
// The camera close on the screen's right edge: from the whole screen, at two thirds of its size, a fast way
const CLOSE_AT_THE_RIGHT: Pose = { focusX: 400, focusY: 200, zoom: 1, tilt: 0, turn: 0 };
// Why a stage's page is gone, as a stage says it
const GONE = new FilmError('the page at http://app/refusing/ refuses to be framed');

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

/** A stage that cannot say whether it is there, as one whose browser is gone. */
class StageNotAnswering extends StageThatKeeps {
	override absence(): Promise<Error | undefined> {
		return Promise.reject(new Error('the browser has been closed'));
	}
}

function takeOf(footage: FootageOf, stage: StageThatKeeps, track = new TrackThatKeeps()): Take {
	const opened = openedOn(new PageOfBoxes(PAGE), stage);
	return new Take({ opened, footage, track, format: SMALL, opening: openingScene(SMALL), motionBlur: HALF_OF_FOUR });
}

test('a frame the camera crosses fast is drawn again along its way from the frame before, each kept with its own', async () => {
	const stage = new StageThatKeeps();
	const footage = new FootageOf([0, 1, 2]);
	// Two frames of the camera's way, half of it each, then one with nothing moving
	const steps = [
		play({ seconds: 2 / 30, moves: [cameraTo(CLOSE_AT_THE_RIGHT)], ease: linear }),
		hold({ seconds: 1 / 30 })
	];
	await takeOf(footage, stage).run(steps);
	expect([footage.exposed, stage.drawn.map((scene) => scene.camera.focusX)]).toEqual([
		[4, 4, 1],
		[331.25, 337.5, 343.75, 350, 381.25, 387.5, 393.75, 400, 400]
	]);
});

test('a cut is not blurred: the frame after it is exposed once, however far it moved the camera', async () => {
	const footage = new FootageOf([0]);
	await takeOf(footage, new StageThatKeeps()).run([cut(cameraTo(CLOSE_AT_THE_RIGHT)), hold({ seconds: 1 / 30 })]);
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
	await takeOf(new FootageOf([20]), new StageThatKeeps(), track).run(steps);
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
	await takeOf(new FootageOf([20]), new StageThatKeeps(), track).run(steps);
	expect(track.heard).toEqual([{ moment: 3 / 30, sound: { kind: 'file', path: './pop.wav' } }]);
});

test('each key typed into the terminal is heard on the frame its letter shows', async () => {
	const track = new TrackThatKeeps();
	const stage = new StageThatKeeps();
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
	const opened = openedOn(page, new StageThatKeeps());
	const footage = new FootageOf([9]);
	const take = new Take({
		opened,
		footage,
		track,
		format: SMALL,
		opening: openingScene(SMALL),
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
	await takeOf(new FootageOf([20]), new StageThatKeeps(), track).run(steps);
	expect(track.heard).toEqual([
		{ moment: 3 / 30, sound: { kind: 'file', path: './pop.wav' } },
		{ moment: 5 / 30, sound: { kind: 'file', path: './whoosh.wav' } }
	]);
});

test('a move is set along its share, at its end exactly once, and never after', async () => {
	const counted = new Counted({ end: 0.5 });
	// Ten frames, the move over the first half of them
	await takeOf(new FootageOf([9]), new StageThatKeeps()).run([play({ seconds: 10 / 30, moves: [counted] })]);
	expect(counted.progresses).toEqual([0.2, 0.4, 0.6, 0.8, 1]);
});

test('a move begun and ended within one frame is set at its end once', async () => {
	const counted = new Counted({ start: 0.45, end: 0.5 });
	// Ten frames: the share begins after the fourth and ends on the fifth
	await takeOf(new FootageOf([9]), new StageThatKeeps()).run([play({ seconds: 10 / 30, moves: [counted] })]);
	expect(counted.progresses).toEqual([1]);
});

test('a move begun at its share reads what an earlier move of the step left', async () => {
	const stage = new StageThatKeeps();
	const steps = [
		play({ seconds: 0.2, moves: [on('#first', { within: { end: 0.5 } }), to('#second', { within: { start: 0.5 } })] })
	];
	await takeOf(new FootageOf([5]), stage).run(steps);
	expect(stage.drawn.at(-1)?.light?.box).toEqual(SECOND);
});

test('a cut sets its moves at their end at once, with no frame between', async () => {
	const stage = new StageThatKeeps();
	const steps = [play({ seconds: 0.1, moves: [cursorTo('#first')] }), cut(hide()), play({ seconds: 0.1 })];
	await takeOf(new FootageOf([2, 3]), stage).run(steps);
	expect([stage.drawn[0]?.cursor === null, stage.drawn[1]?.cursor]).toEqual([false, null]);
});

test('a frame is drawn only when the footage keeps it', async () => {
	const stage = new StageThatKeeps();
	const footage = new FootageOf([2, 4]);
	await takeOf(footage, stage).run([play({ seconds: 0.2 })]);
	expect([stage.drawn.length, footage.kept]).toEqual([2, [2, 4]]);
});

test('a fault in a step is raised with the moment and the step it was met at', async () => {
	const steps = [play({ seconds: 0.1 }), act(() => Promise.reject(new Error('the page broke')))];
	await expect(takeOf(new FootageOf([9]), new StageThatKeeps()).run(steps)).rejects.toThrow(
		new TakeError(new Error('the page broke'), 0.1, 2)
	);
});

test('no frame is shot where the stage or its page is gone: the take is refused by why, at the step that would shoot it', async () => {
	const stage = new StageThatKeeps();
	await stage.lose(GONE);
	await expect(takeOf(new FootageOf([9]), stage).run([play({ seconds: 0.1 })])).rejects.toThrow(
		new TakeError(GONE, 0, 1)
	);
	expect(stage.drawn).toEqual([]);
});

test('an act that leaves the stage or its page gone is refused by why, though nothing after it is shot', async () => {
	const stage = new StageThatKeeps();
	await expect(takeOf(new FootageOf([9]), stage).run([act(() => stage.lose(GONE))])).rejects.toThrow(
		new TakeError(GONE, 0, 1)
	);
});

test('a last frame kept as the stage or its page went is refused by why, at the last step', async () => {
	const stage = new StageThatKeeps();
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
	const stage = new StageThatKeeps();
	const failing = act(() => stage.lose(GONE).then(() => Promise.reject(new Error('nothing matches h1'))));
	await expect(takeOf(new FootageOf([9]), stage).run([failing])).rejects.toThrow(new TakeError(GONE, 0, 1));
});
