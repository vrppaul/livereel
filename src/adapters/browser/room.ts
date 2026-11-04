/**
 * The stage drawn as a room (`stage/room.js`): served on an origin of livereel's own, and checked for what the room
 * draws with as it opens.
 *
 * three.js comes as ES modules alone, and a page opened from `file://` loads no module: its origin is `null`, and
 * Chrome refuses a module from it as a request of another origin. Playwright answers every request to the room's
 * origin from the package's files, before anything reaches the network, so no server runs and the name needs no DNS;
 * over HTTPS the page is a secure context, as a page over plain HTTP is not (probed 2026-11-02).
 *
 * The room draws the stage's markup through HTML-in-Canvas: Chrome draws an element laid in a canvas into a WebGL
 * texture (`texElementImage2D`). It is an experiment of Chrome's, behind a flag, renamed in Chrome 150 and again in
 * 155, so livereel pins the Playwright, and with it the browser, the room was built on, and the room is refused as it
 * opens, as the machine's to put right, where the browser lacks it or gives the page no WebGL.
 */
import type { Page, Route } from 'playwright-core';
import { SetupError } from '../../domain/errors.ts';
import type { DrawnScene } from '../../scene.ts';
import { FILE_SENT, NO_SUCH_FILE, type ServedFile, filesNamed, stageFiles } from './stage-files.ts';
import { type Layout, STAGE_PAGE, type StageDrawing } from './stage.ts';

/**
 * What the room's script answers under `window.room` (`stage/room.js`): the stage's surfaces laid in the room's
 * canvas, and a frame composed in WebGL from them as the stage drew them.
 */
export interface RoomApi {
	/** Every exposure's surfaces laid in the room's canvas, which draws a frame of the layout's size. */
	readonly setup: (layout: Layout) => void;
	/** One frame composed from its exposures' surfaces as the stage drew them, each placed as its scene has it. */
	readonly compose: (exposures: readonly DrawnScene[]) => Promise<void>;
}

declare global {
	interface Window {
		room: RoomApi;
	}
}

/**
 * The stage drawn as a room: the browser launched with HTML-in-Canvas, the stage opened on the room's origin, its
 * surfaces laid in the room's canvas, before the pages of the film's own are laid in them, as a frame moved in the
 * document loads its page anew; and each frame drawn by the stage's markup, then composed by the room. In software a
 * frame of 1920 × 1080 took 292 and 315 ms to draw, where the graphics card drew one in 16 ms on average over the
 * README film (`--profile`, 2026-11-04), so the person who asked for software is told.
 */
export const DRAWN_AS_A_ROOM: StageDrawing = {
	flags: ['--enable-blink-features=CanvasDrawElement'],
	opened: roomOpened,
	laidOut: (page, layout) => page.evaluate(roomSetUp, layout),
	drawn: (page, exposures) => page.evaluate(composedInTheRoom, exposures),
	saidInSoftware:
		'the room is drawn in software, where a frame takes about twenty times as long to draw as on a graphics card: ' +
		'--renderer gpu draws it on the card, where the machine has one'
};

// The room's origin: under `.invalid`, which no name on the network may take; and the path of its root, which a file's
// path under it starts with
const ROOM_ORIGIN = 'https://livereel.invalid/';
const ROOT = '/';
// Every request under it, as Playwright's glob writes it
const EVERY_PATH = '**';
// The room's own script, a module, and the kinds of script the page is given: the module, and the import map that
// names where three stands for it, which only the room's page is given; where three's files stand under the origin;
// the files of three's build its module is made of; and its module, as the import map names it
const ROOM_SCRIPT = 'room.js';
const MODULE = 'module';
const IMPORT_MAP = 'importmap';
const THREE_PATH = 'three/';
const THREE_ENTRY = 'three.module.js';
const THREE_FILES = [THREE_ENTRY, 'three.core.js'];
const THREE_MODULE = `./${THREE_PATH}${THREE_ENTRY}`;
const THREE_FOLDER = new URL('./', import.meta.resolve('three'));
// What the room draws with, and what the person is told where the browser lacks it
const NO_WEBGL =
	'the room draws in WebGL, which the browser gives no page here: in software it draws it through SwiftShader where ' +
	"Vulkan finds no driver, but not through Mesa's software Vulkan alone (lavapipe)";
const NO_ELEMENT_DRAWING =
	"the room draws the stage through Chrome's HTML-in-Canvas, which this browser lacks: the browser livereel pins " +
	'has it, installed by `npx livereel setup`';

/** What a page offers the room: WebGL, and HTML-in-Canvas in it. */
type RoomLack = 'none' | 'webgl' | 'element drawing';

/**
 * The stage opened as a room on livereel's own origin, its script loaded; refused where the browser lacks what the
 * room draws with.
 */
export async function roomOpened(page: Page): Promise<void> {
	const files = new Map([...(await stageFiles()), ...(await threeFiles())]);
	await page.route(`${ROOM_ORIGIN}${EVERY_PATH}`, (route) => answered(route, files));
	await page.goto(new URL(STAGE_PAGE, ROOM_ORIGIN).href);
	refusedWhereLacking(await page.evaluate(roomLackOf));
	await page.addScriptTag({ type: IMPORT_MAP, content: JSON.stringify({ imports: { three: THREE_MODULE } }) });
	await page.addScriptTag({ type: MODULE, url: new URL(ROOM_SCRIPT, ROOM_ORIGIN).href });
}

/** three's module files, by their path under the room's origin. */
async function threeFiles(): Promise<ReadonlyMap<string, ServedFile>> {
	const files = await filesNamed(THREE_FOLDER, THREE_FILES);
	return new Map([...files].map(([name, file]) => [`${THREE_PATH}${name}`, file]));
}

/** A request to the room's origin answered with the file it names, or as not found. */
async function answered(route: Route, files: ReadonlyMap<string, ServedFile>): Promise<void> {
	const file = files.get(new URL(route.request().url()).pathname.slice(ROOT.length));
	if (file === undefined) {
		await route.fulfill({ status: NO_SUCH_FILE });
		return;
	}
	await route.fulfill({ status: FILE_SENT, contentType: file.type, body: file.body });
}

/** The room refused, as the machine's to put right, where the page lacks what it draws with. */
function refusedWhereLacking(lack: RoomLack): void {
	switch (lack) {
		case 'none':
			return;
		case 'webgl':
			throw new SetupError(NO_WEBGL);
		case 'element drawing':
			throw new SetupError(NO_ELEMENT_DRAWING);
	}
}

// What follows runs in the stage page, each function handed over alone

/** What the page lacks of what the room draws with: WebGL 2 first, then HTML-in-Canvas in it; none where it has both. */
function roomLackOf(): RoomLack {
	const context = document.createElement('canvas').getContext('webgl2');
	if (context === null) return 'webgl';
	return 'texElementImage2D' in context ? 'none' : 'element drawing';
}

/** The room's canvas laid over the stage, its surfaces laid in it. */
function roomSetUp(layout: Layout): void {
	window.room.setup(layout);
}

/** One frame drawn by the stage's markup, then composed by the room from its surfaces. */
function composedInTheRoom(exposures: readonly DrawnScene[]): Promise<void> {
	window.stage.apply(exposures);
	return window.room.compose(exposures);
}
