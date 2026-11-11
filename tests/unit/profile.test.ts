import { expect, test } from 'vitest';
import { Profile, Timings, profileSaid } from '../../src/adapters/profile.ts';
import { LIVEREELS_LOOK } from '../../src/props/look.ts';
import { LIVEREELS_WORLD } from '../../src/props/world.ts';
import { type DrawnScene, cameraOf, drawn, openingScene } from '../../src/scene.ts';
import type { Browser, Filmed } from '../../src/studio/ports.ts';
import { FOCAL_LENGTH, PageOfBoxes, PicturedStageThatKeeps, SMALL, openedOn } from './fakes.ts';

// A shoot of ten seconds, in milliseconds
const WHOLE = 10_000;
// A stage that lays two exposures of a frame over one another
const TWO_AT_ONCE = 2;
// A profile the shoot is asked for, and one it is not
const TAKEN = true;
const NOT_TAKEN = false;
// A static page, at no address the fakes read
const STATIC: Filmed = { kind: 'static', address: '' };

/** A stage that draws two exposures at once. */
class StageLayingTwo extends PicturedStageThatKeeps {
	override readonly exposuresAtOnce = TWO_AT_ONCE;
}

test('a profile says each part slowest first, its calls, time each, seconds and share of the whole, then the rest', async () => {
	const waited = new Timings(clockReading([0, 3000, 3000, 3100, 3100, 6100]));
	const blended = new Timings(clockReading([0, 458]));
	await waited.timed('stage.capture', done);
	await waited.timed('stage.draw', done);
	await waited.timed('stage.capture', done);
	await blended.timed('blend of 16', done);
	expect(profileSaid(WHOLE, waited, blended)).toEqual([
		'where the 10.0 s went:',
		'  stage.capture              2 ×   3000.0 ms     6.0 s   60 %',
		'  stage.draw                 1 ×    100.0 ms     0.1 s    1 %',
		'  the rest                                       3.9 s   39 %',
		"the footage's blends, as they ran:",
		'  blend of 16                1 ×    458.0 ms     0.5 s'
	]);
});

test('a capture of exposures laid over one another at once is timed apart from a capture of one, by how many it lays', async () => {
	const profile = new Profile(clockTicking(), TAKEN);
	const scene = openingDrawn();
	await profile.shooting(async () => {
		const opened = await profile.browser(browserWith(new StageLayingTwo())).open(undefined as never, STATIC, 1);
		await opened.stage.draw([scene]);
		await opened.stage.capture();
		await opened.stage.draw([scene, scene]);
		await opened.stage.capture();
	});
	expect(profile.said()).toEqual(
		expect.arrayContaining([
			expect.stringMatching(/^ {2}stage\.capture +1 ×/),
			expect.stringMatching(/^ {2}stage\.capture of 2 +1 ×/)
		])
	);
});

test("a profile taken times a draw to the end of the stage's drawing; one not taken waits on nothing past the draw", async () => {
	const stages = { taken: new PicturedStageThatKeeps(), notTaken: new PicturedStageThatKeeps() };
	await drawnUnder(new Profile(clockTicking(), TAKEN), stages.taken);
	await drawnUnder(new Profile(clockTicking(), NOT_TAKEN), stages.notTaken);
	expect([stages.taken.waitedOn, stages.notTaken.waitedOn]).toEqual([1, 0]);
});

test('a profile not taken says nothing of the shoot', async () => {
	const profile = new Profile(clockTicking(), NOT_TAKEN);
	await drawnUnder(profile, new PicturedStageThatKeeps());
	expect(profile.said()).toEqual([]);
});

/** One frame drawn and captured on a stage, opened through a profile. */
async function drawnUnder(profile: Profile, stage: PicturedStageThatKeeps): Promise<void> {
	const scene = openingDrawn();
	await profile.shooting(async () => {
		const opened = await profile.browser(browserWith(stage)).open(undefined as never, STATIC, 1);
		await opened.stage.draw([scene]);
		await opened.stage.capture();
	});
}

/** A browser that opens a page of no boxes on this stage. */
function browserWith(stage: PicturedStageThatKeeps): Browser {
	return { open: () => Promise.resolve(openedOn(new PageOfBoxes(new Map()), stage)) };
}

/** The opening scene of a small format, drawn. */
function openingDrawn(): DrawnScene {
	const opening = openingScene(SMALL, LIVEREELS_LOOK, LIVEREELS_WORLD, FOCAL_LENGTH);
	return drawn(opening, cameraOf(opening, SMALL), 0, SMALL, []);
}

/** A clock that moves a millisecond each time it is read, from none. */
function clockTicking(): () => number {
	let reading = 0;
	return () => (reading += 1);
}

/** A clock that reads these milliseconds, one after another. */
function clockReading(readings: readonly number[]): () => number {
	const coming = readings.values();
	return () => coming.next().value!;
}

function done(): Promise<void> {
	return Promise.resolve();
}
