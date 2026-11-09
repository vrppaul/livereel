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
import { readFile } from 'node:fs/promises';
import type { Page, Route } from 'playwright-core';
import { FilmError, SetupError } from '../../domain/errors.ts';
import type { DrawnScene } from '../../scene.ts';
import { FILE_SENT, NO_SUCH_FILE, type ServedFile, filesNamed, stageFiles } from './stage-files.ts';
import { type Layout, STAGE_PAGE, type StageDrawing } from './stage.ts';

/**
 * What the room's script answers under `window.room` (`stage/room.js`): the stage's surfaces laid in the room's
 * canvas, and a frame composed in WebGL from them as the stage drew them.
 */
export interface RoomApi {
	/**
	 * Every exposure's surfaces laid in the room's canvas, which draws a frame of the layout's size, and the film's
	 * things module loaded from its address where it names one: the names it builds a thing by, or what the film is
	 * told where the module fails to load or exports no builders.
	 */
	readonly setup: (layout: Layout, things: string | null) => Promise<ThingsLoaded>;
	/**
	 * One frame composed from its exposures' surfaces as the stage drew them, each placed as its scene has it, and the
	 * film's things among them; what the film is told where its module fails building or setting one, none where not.
	 */
	readonly compose: (exposures: readonly DrawnScene[]) => Promise<string | null>;
}

/** The film's things module as the room loads it: the names it builds a thing by, or what the film is told. */
export type ThingsLoaded =
	{ readonly kind: 'built'; readonly names: readonly string[] } | { readonly kind: 'refused'; readonly said: string };

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
	laidOut: roomLaidOut,
	drawn: drawnInTheRoom,
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
// Where the film's things module is served under the origin, and the kind of content it is answered with
const THINGS_PATH = 'film/things.js';
const SCRIPT_TYPE = 'text/javascript; charset=utf-8';
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
 * The stage opened as a room on livereel's own origin, its script loaded, and the film's things module where it names
 * one, served from the disk under the origin as it stands; refused where the browser lacks what the room draws with.
 */
export async function roomOpened(page: Page, things: string | null): Promise<void> {
	const films = things === null ? [] : [[THINGS_PATH, await thingsFileOf(things)] as const];
	const files = new Map([...(await stageFiles()), ...(await threeFiles()), ...films]);
	await page.route(`${ROOM_ORIGIN}${EVERY_PATH}`, (route) => answered(route, files));
	await page.goto(new URL(STAGE_PAGE, ROOM_ORIGIN).href);
	refusedWhereLacking(await page.evaluate(roomLackOf));
	await page.addScriptTag({ type: IMPORT_MAP, content: JSON.stringify({ imports: { three: THREE_MODULE } }) });
	await page.addScriptTag({ type: MODULE, url: new URL(ROOM_SCRIPT, ROOM_ORIGIN).href });
}

/**
 * The room laid out, and the film's things module loaded where it names one, served as the room opened: the names it
 * builds a thing by, none where it names none; refused, as the film's, where it fails to load or exports no builders.
 */
async function roomLaidOut(page: Page, layout: Layout, things: string | null): Promise<readonly string[]> {
	const address = things === null ? null : new URL(THINGS_PATH, ROOM_ORIGIN).href;
	const loaded = await page.evaluate(roomSetUp, { layout, address });
	switch (loaded.kind) {
		case 'built':
			return loaded.names;
		case 'refused':
			throw new FilmError(loaded.said);
	}
}

/** The film's things module read from the disk; refused, as the film's, where there is none at its path. */
async function thingsFileOf(things: string): Promise<ServedFile> {
	try {
		return { type: SCRIPT_TYPE, body: await readFile(things) };
	} catch (fault) {
		throw new FilmError(`the film's things module ${things} could not be read: ${String(fault)}`);
	}
}

/** A frame drawn in the room; refused, as the film's, where the film's things module fails building or setting one. */
async function drawnInTheRoom(page: Page, exposures: readonly DrawnScene[]): Promise<void> {
	const refused = await page.evaluate(composedInTheRoom, exposures);
	if (refused !== null) throw new FilmError(refused);
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

/** The room's canvas laid over the stage, its surfaces laid in it, and the film's things module loaded where named. */
function roomSetUp(laying: { readonly layout: Layout; readonly address: string | null }): Promise<ThingsLoaded> {
	return window.room.setup(laying.layout, laying.address);
}

/** One frame drawn by the stage's markup, then composed by the room from its surfaces and the film's things. */
function composedInTheRoom(exposures: readonly DrawnScene[]): Promise<string | null> {
	window.stage.apply(exposures);
	return window.room.compose(exposures);
}
