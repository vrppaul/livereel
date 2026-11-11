// A film's set shot for real, in a browser, of an app its command serves: the pictures and the targets kept, the app
// stopped after; and a film shot on that set with no app at all, its targets read from the state an act shows
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { Chromium } from '../../src/adapters/browser/chromium.ts';
import type { PlaywrightPicturedStage } from '../../src/adapters/browser/stage.ts';
import { ANSWERED_WITHIN_MILLISECONDS, CommandServer } from '../../src/adapters/server.ts';
import { SetFolderOnDisk } from '../../src/adapters/set-folder.ts';
import { SILENT } from '../../src/adapters/video/soundtrack.ts';
import { FilmError, TakeError } from '../../src/domain/errors.ts';
import type { PageServer, SetNoted } from '../../src/studio/ports.ts';
import { shootSet } from '../../src/studio/set.ts';
import { type Shooting, shoot } from '../../src/studio/shoot.ts';
import { FILMS_FOLDER, NO_SET, NoFrames } from './app.ts';
import { WARNED_TO_NOBODY } from './warned.ts';
import { type ActContext, type SetContext, type Step, act, camera, cut, defineFilm, page, piece, play } from 'livereel';

// The app, served on a port of this file's own, the screen it is laid out on, and how sharp its set's pictures are;
// and the page it serves, on the disk, for a film of it live
const ADDRESS = 'http://127.0.0.1:8771/';
const PAGE = new URL('./page.html', import.meta.url).href;
const SMALL = { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } };
const SHARPNESS = 2;
// The page's heading, in every state, and a line the scenario adds to it, in the second alone
const HEADING = 'h1';
const ADDED = '#added';
// Where a PNG says how wide and how tall its picture is: two numbers of four bytes, from its 16th byte
const PNG_WIDTH_AT = 16;
const PNG_HEIGHT_AT = 20;
// A server that refuses to serve, as a film shot on its set serves nothing
const NO_SERVER: PageServer = { serve: () => Promise.reject(new Error('a film shot on its set serves no page')) };

/** The scenario: the app as it opens, then with a line added to it. */
async function scenario({ page, state }: SetContext): Promise<void> {
	await state('opened');
	await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<p id="added">Added</p>'));
	await state('added');
}

/** A film of these steps on the set of the scenario, the app served by a command from this folder. */
function filmOnSet(steps: readonly Step[]) {
	return defineFilm({
		formats: { small: SMALL },
		address: ADDRESS,
		serve: 'node serving.ts 8771',
		ready: (context) => context.page.locator(HEADING).waitFor(),
		set: { scenario, targets: [HEADING, ADDED], sharpness: SHARPNESS },
		steps: () => steps,
		framesPerSecond: 30
	}).formats.get('small')!;
}

/** The scenario's set shot into a folder of its own. */
async function setShot(steps: readonly Step[]): Promise<SetFolderOnDisk> {
	const folder = new SetFolderOnDisk(join(await mkdtemp(join(tmpdir(), 'livereel-set-')), 'film-small.set'));
	await shootSet(filmOnSet(steps), {
		server: new CommandServer(import.meta.dirname, ANSWERED_WITHIN_MILLISECONDS),
		browser: new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER),
		folder
	});
	return folder;
}

/** A film on the set kept in this folder, shot with no app served. */
function shotOnSet(steps: readonly Step[], set: SetFolderOnDisk) {
	return shoot(filmOnSet(steps), {
		server: NO_SERVER,
		set,
		browser: new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER),
		footage: new NoFrames(),
		track: SILENT,
		quality: { sharpness: 1, blurred: false, framesHanded: 'scaled' }
	});
}

/** A film of these steps on the smoke tests' page on the disk, live, with no set. */
function filmLive(steps: readonly Step[]) {
	return defineFilm({
		formats: { small: SMALL },
		address: PAGE,
		ready: (context) => context.page.locator(HEADING).waitFor(),
		steps: () => steps,
		framesPerSecond: 30
	}).formats.get('small')!;
}

function shootingLive(): Shooting {
	return {
		server: new CommandServer(import.meta.dirname, ANSWERED_WITHIN_MILLISECONDS),
		set: NO_SET,
		browser: new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER),
		footage: new NoFrames(),
		track: SILENT,
		quality: { sharpness: 1, blurred: false, framesHanded: 'scaled' }
	};
}

/** How wide and tall a PNG says its picture is. */
async function sizeOf(png: string): Promise<readonly number[]> {
	const bytes = await readFile(png);
	return [bytes.readUInt32BE(PNG_WIDTH_AT), bytes.readUInt32BE(PNG_HEIGHT_AT)];
}

test("a film's set is shot from the app its command serves: a picture of each state its scenario marks, the screen at the set's sharpness, and the targets that matched in it, kept in the set's folder; the app stopped after", async () => {
	const set = await setShot([]);
	const written: SetNoted = JSON.parse(await readFile(join(set.folder, 'set.json'), 'utf8'));
	expect([
		written.states.map((state) => [state.name, state.targets.map((shot) => shot.target)]),
		await sizeOf(join(set.folder, 'added.png'))
	]).toEqual([
		[
			['opened', [HEADING]],
			['added', [HEADING, ADDED]]
		],
		[960, 640]
	]);
	await expect(fetch(ADDRESS)).rejects.toThrow('fetch failed');
});

test("a film's set is opened on its first state's picture, and an act shows another's in its place", async () => {
	const set = await (await setShot([])).read();
	const film = filmOnSet([]);
	await using opened = await new Chromium('software', WARNED_TO_NOBODY, FILMS_FOLDER).open(
		{ ...film, motionBlur: null, ownPages: [], pictures: [] },
		{ kind: 'set', set },
		1
	);
	const picture = (opened.stage as PlaywrightPicturedStage).filmedTab.tab.locator('img');
	const first = await picture.getAttribute('src');
	await opened.act.set.show('added');
	expect([first, await picture.getAttribute('src')]).toEqual([
		expect.stringMatching(/\/opened\.png$/),
		expect.stringMatching(/\/added\.png$/)
	]);
});

test('a film shot on its set needs no app: a target is read where the set shot it in the state an act shows; one not in that state or not among the targets, a state the set has not, a scroll, a piece riding its block, and an act on the page are refused, and on the live page, an act that shows a state', async () => {
	const shown = (name: string) => act(({ set }: ActContext) => set.show(name));
	const toTheLine = play({ seconds: 0.1, moves: [camera.onto(ADDED)] });
	const set = await setShot([]);
	await shotOnSet([shown('added'), toTheLine], set);
	const refused = await Promise.all([
		shotOnSet([toTheLine], set).catch(String),
		shotOnSet([play({ seconds: 0.1, moves: [camera.onto('p')] })], set).catch(String),
		shotOnSet([shown('refreshed')], set).catch(String),
		shotOnSet([play({ seconds: 0.1, moves: [page.scrollBy(HEADING, { pixels: 10 })] })], set).catch(String),
		shotOnSet([cut(piece.show(HEADING, { inside: 'world', rides: 'its block' }))], set).catch(String),
		shotOnSet([act(({ page: frame }: ActContext) => frame.locator(HEADING).click())], set).catch(String),
		shoot(filmLive([shown('added')]), shootingLive()).catch(String)
	]);
	expect(refused).toEqual(
		[
			"nothing matched #added in the set's state opened",
			"the film's set shot no block of p: add it to the set's targets, and shoot the set again",
			`the film's set has no state "refreshed": its states are opened, added`,
			"the film's set shows its states as its scenario left them: scroll and type in the scenario, and show the state they leave with context.set.show(name)",
			"the film's set shows each state as its scenario left it and never scrolls, which carries no piece riding its block: lift it riding nothing",
			"a film shot on its set acts on no app, and an act's context.page is livereel's page of the set: show a state with context.set.show(name)",
			"context.set shows a state of the film's set, and the film names none: give it set: { scenario, targets }"
		].map((said) => String(new TakeError(new FilmError(said), 0, 1)))
	);
});
