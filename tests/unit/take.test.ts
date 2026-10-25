import { expect, test } from 'vitest';
import { TakeError } from '#domain/errors';
import { type Bounds, linear } from '#domain/time';
import { type SceneChange, type SceneMove, type Timing, timingOf } from '#direction/move';
import { act, play } from '#direction/steps';
import { on, to } from '#props/light/moves';
import { type Scene, openingScene } from '#scene';
import { Take } from '#studio/take';
import { FootageOf, PageOfBoxes, SMALL, StageThatKeeps, openedOn } from './fakes.ts';

const FIRST = { left: 10, top: 10, width: 100, height: 50 };
const SECOND = { left: 200, top: 100, width: 80, height: 40 };
const PAGE = new Map([
	['#first', FIRST],
	['#second', SECOND]
]);

/** A move on the screen that writes down every progress it is set at. */
class Counted implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'screen';
	readonly timing: Timing;
	readonly progresses: number[] = [];

	constructor(within: Bounds) {
		this.timing = timingOf({ within, ease: linear });
	}

	begin(): Promise<SceneChange> {
		return Promise.resolve({ at: (scene, progress) => this.noted(scene, progress) });
	}

	noted(scene: Scene, progress: number): Scene {
		this.progresses.push(progress);
		return scene;
	}
}

function takeOf(footage: FootageOf, stage: StageThatKeeps): Take {
	return new Take(openedOn(new PageOfBoxes(PAGE), stage), footage, SMALL, openingScene(SMALL));
}

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
