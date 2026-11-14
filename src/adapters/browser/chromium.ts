/**
 * Chromium with the stage open in it and the filmed page shown on it, for one take: a static page in a tab of its own,
 * pictured on the stage; a dynamic one live in the stage's frame (`stage.ts`); or the film's set, laid in that tab on
 * a page of livereel's, pictured as a static page is (`set.ts`). And the app opened alone, for its set to be shot.
 *
 * A static page's tab is the page's own: it opens the film's address at the top, first-party to its cookies, so a
 * page that refuses to be framed or signs in is filmed as it comes, and its pictures are taken only as it changes: a
 * picture every frame cost a second capture a frame. A dynamic page's stage stands apart from the app, a file of the
 * package (`stage/stage.html`), or inside it, on the app's own address, where the film asks for it (`inside.ts`).
 * Apart, the page is framed as it comes and nothing of its answers is touched: a redirect lands in the frame, and a
 * page that refuses to be framed is refused, its refusal named (`watch.ts`). Chrome's Local Network Access checks stay
 * on, and every page is granted `local-network-access`: a page the stage inside the app answers anew hears nothing its
 * server on this machine pushes until granted it (`tests/smoke/inside.test.ts`). Granted to every other page too, a
 * public site's page that asks this machine is heard as with the checks off, which is untried.
 *
 * The page's own motion is stilled, by the reduced motion it is asked for, so every move in the film is the film's; its
 * own time is the film's, on a clock installed before it opens (`clock.ts`), and a static page tells of every change
 * it makes to its document (`changes.ts`), so its picture is taken anew.
 *
 * Launched headless, Playwright starts Chromium's headless shell, which draws in software unless asked to draw on the
 * graphics card, through ANGLE onto the system's own graphics interface, needing no screen. On Linux through Vulkan a
 * wide blurred film took 271 s against 495 s in software, its frames alike. Metal on macOS and Direct3D 11 on Windows
 * are untried. Where it reaches no graphics card, the shell draws in software all the same, with WebGL through
 * SwiftShader where Vulkan finds no driver, and with none where it finds Mesa's software Vulkan alone (lavapipe); the
 * person is warned, as Chrome tells it, and the film is shot. A page that cannot be reached, or refuses its frame, is
 * refused as it is opened, by why, rather than when the film first waits on it.
 *
 * On the graphics card, a stage showing a static page's picture draws a frame's exposures at once, each a copy of its
 * drawing laid over the ones before so each weighs the same, and is captured once: 16 exposures of a fast camera took
 * 273–321 ms against 1899 ms captured one at a time, the frames alike. In software the copies saved little and banded
 * the ground's gradient, so there a stage draws one exposure at a time, as a framed page's stage does: no copy of the
 * stage can show its live frame again. Chrome is told it has GPU memory enough for the copies, or it leaves parts of
 * them undrawn.
 *
 * A static page's stage draws a frame flat, as the browser draws its markup, or, where the film names it, as a room:
 * launched, opened, laid out and drawn as `room.ts` has it, which the person who asks for software is told costs a
 * frame about 150 times as long there. A framed page is drawn flat.
 */
import { resolve } from 'node:path';
import { type Browser as Playwright, type Frame, type Page, chromium } from 'playwright-core';
import { ZOOM_AT_MOST } from '../../domain/camera.ts';
import { FilmError, SetupError } from '../../domain/errors.ts';
import { type Box, type Size, boxOf, frameScaleOf } from '../../domain/geometry.ts';
import type { PictureDecoded } from '../../domain/picture.ts';
import { type MotionBlur, mostExposuresOf } from '../../domain/shutter.ts';
import type { Drawing, PageKind, StagePlace } from '../../direction/film.ts';
import type { ActContext, FilmedPage } from '../../direction/page.ts';
import type { CssNamed } from '../../direction/theme.ts';
import type {
	Browser,
	DrawnBrowser,
	Filmed,
	Opened,
	OpenedDrawnPage,
	OpenedForSet,
	OwnPages,
	PageTime,
	SetBrowser,
	SetSetting,
	Setting,
	Stage
} from '../../studio/ports.ts';
import {
	BYTES_A_MEGABYTE,
	BYTES_A_PIXEL,
	NO_MEMORY,
	type PictureBound,
	boundsOf,
	cardSideOf,
	picturePixelsAtMost,
	picturesMemoryOf
} from './bounds.ts';
import { ChangesHeard } from './changes.ts';
import { drawnPageOpened } from './drawn.ts';
import { filmsFontsLaid, filmsFontsRead, filmsPicturesLaid, filmsPicturesRead } from './films-files.ts';
import { PlaywrightPageTime } from './clock.ts';
import { stagedInside } from './inside.ts';
import { PageMotion } from './motion.ts';
import { type FilmedShown, PlaywrightPage } from './page.ts';
import { NO_OWN_PAGES, type OwnPagesTab, ownPagesOpened } from './own-pages.ts';
import { DRAWN_AS_A_ROOM } from './room.ts';
import { AppOpenedForSet, NoSetShown, SET_PAGE, setShownIn } from './set.ts';
import {
	DRAWN_FLAT,
	type FilmsFontHanded,
	type FilmsPictureHanded,
	type Layout,
	NO_THINGS,
	ONE_AT_A_TIME,
	type Opening,
	PlaywrightFramedStage,
	PlaywrightPicturedStage,
	type StageDrawing,
	handedInOf,
	layoutOf,
	openPage,
	ownPagesLaid,
	setUpStage,
	stageApartOpened
} from './stage.ts';
import { FrameWatch, TabWatch, reached } from './watch.ts';
import type { Warn } from './warn.ts';

const NAVIGATED = 'framenavigated';
// What the filming browser is granted, so a page hears its server on this machine: why is the module's comment
const LOCAL_NETWORK = 'local-network-access';
// What Playwright says where the browser was never downloaded, and what the person is told in its place: Playwright
// names its own command, not livereel's
const NO_BROWSER = "Executable doesn't exist";
const NOT_INSTALLED = 'the browser films are shot in is not installed: run `npx livereel setup`';
// What Playwright says where the system lacks libraries the browser needs, its words then naming them and how this
// system installs them, which differs between Linux distributions, Docker and Windows
const NO_LIBRARIES = 'Host system is missing dependencies';
// How a block the film blurs is blurred: 12 of the page's pixels, as no letter of a line reads through, the camera
// close or not
const BLURRING = { property: 'filter', value: 'blur(12px)' } as const;
// The page's text caret stands shown and never blinks on the wall clock, so a hold shows it as it was, and a static
// page's pictures come out alike once it is typed into, where a blinking caret leaves two pictures in twelve unlike
const STEADY_CARET: ForcedRule = { selector: '*', property: 'caret-animation', value: 'manual' };
// What the film forces on the page stands whatever the page's own style says
const OVER_THE_PAGES_OWN = 'important';
// What an act that shows a state of the film's set is told where the film is shot on its live page
const NO_SET_IN_THE_FILM =
	"context.set shows a state of the film's set, and the film names none: give it set: { scenario, targets }";
// Whether the document at the top of a tab is the stage's own, left as it is, or the filmed page's
const THE_STAGE_AT_THE_TOP = true;
const THE_PAGE_AT_THE_TOP = false;

// A family any browser has, set after a film's font to see that it stands as a family of its own
const FALLBACK_FONT = 'monospace';
const NO_FONT_FAMILY = 'CSS reads no font family there';
// How a font is found: letters set in it, a family CSS keeps after it, stand as wide as that family sets them alone
// only where the font sets none of its own; beside two such families that set them unlike each other, a font as wide
// as both in turn is none. Not `document.fonts.check`, which says a family the machine has not is there. The letters
// a film sets most, on one line, as large as any width tells them apart
const FOUND_BY = {
	beside: ['monospace', 'serif'],
	letters: 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789',
	size: '100px',
	oneLine: 'nowrap'
} as const;
const NO_SUCH_FONT =
	"it names no font this machine has or the film brings: name its file in the film's fonts, { 'Inter Tight': './InterTight.ttf' }";
// The token the stage sets the ground's layers in, and how CSS writes every picture a layer would load, `url()` alone
// or in `image-set()`
const LAYERS_TOKEN = '--layers-coming';
const PICTURE = 'url(';
const NO_LAYERS = 'CSS reads no background layers there';
// A picture would load as the stage draws, after a frame may be captured without it
const PICTURED = 'the ground draws no picture, only what CSS draws itself';

/** A font a film names, and the fallback set after it. */
interface FontProbe {
	readonly font: string;
	readonly fallback: string;
}

/**
 * A font a film names, the families CSS keeps it is set beside to see whether it sets letters of its own, and the
 * letters set, at a size, kept on one line as CSS's `white-space` keeps them.
 */
interface FontFoundProbe {
	readonly font: string;
	readonly beside: readonly string[];
	readonly letters: string;
	readonly size: string;
	readonly oneLine: string;
}

/** The ground's layers a film writes, the token the stage sets them in, and how CSS writes a picture. */
interface LayersProbe {
	readonly layers: string;
	readonly token: string;
	readonly picture: string;
}

/** How CSS reads the ground's layers: as layers, as none, or as layers with a picture in them. */
type LayersRead = 'read' | 'unread' | 'pictured';

/** A property the film forces on the page's blocks a selector matches, and its value. */
interface ForcedRule {
	readonly selector: string;
	readonly property: string;
	readonly value: string;
}

/**
 * The rules the film forces on the page, and how far over the page's own style; and whether the document at the top
 * is the stage's own, the page framed in it, and left as it is.
 */
interface Forcing {
	readonly rules: readonly ForcedRule[];
	readonly priority: string;
	readonly stageAtTheTop: boolean;
}

/**
 * How a stage showing the page's pictures takes and draws them: how many of its pixels it draws to a frame's; how many
 * of a picture's pixels a page's pixel takes for a camera at a zoom of 1, as sharp as the film is shot; how many of a
 * frame's exposures it draws at once; the bounds its pictures are taken within; how it draws a frame, flat or as a
 * room, and the part of it a frame is handed on from.
 */
interface Picturing {
	readonly sharpness: number;
	readonly pixelsAtZoomOne: number;
	readonly exposuresAtOnce: number;
	readonly bounds: readonly PictureBound[];
	readonly drawing: StageDrawing;
	readonly handedIn: Box;
	/** The film's things module, where it names one: its file on the disk. */
	readonly things: string | null;
}

/**
 * What is laid before a take: the film's own pages as moves read them, the names the film's things module builds a
 * thing by, and the film's own pictures, by their paths, as large as each decoded.
 */
interface LaidOnTheStage extends SetUp {
	readonly ownPages: OwnPages;
}

/** What the stage set up reads back: the names the film's things module builds a thing by, and the film's pictures. */
interface SetUp {
	readonly thingsBuilt: readonly string[];
	readonly filmsPictures: ReadonlyMap<string, PictureDecoded>;
}

/** What a take is set as, and the film's own pictures and fonts, read from the disk to be handed to the stage. */
interface SettingRead {
	readonly setting: Setting;
	readonly pictures: readonly FilmsPictureHanded[];
	readonly fonts: readonly FilmsFontHanded[];
}

// A page framed live is drawn flat, which loads no things module
const NO_THINGS_MODULE = null;

/** The page a take films in a tab of its own, shown on the stage as a picture: static and live, or the film's set. */
type Pictured = Extract<Filmed, { kind: 'static' | 'set' }>;

// The flag naming the graphics interface ANGLE draws through, and that interface on each system's card, by Node's
// name for the system
const USE_ANGLE = '--use-angle=';
const CARD_INTERFACES = { linux: 'vulkan', darwin: 'metal', win32: 'd3d11' } as const;
// Chrome's compositing as CDP's `SystemInfo.getInfo` reports it, and what it reports on the graphics card: `enabled`
// with Vulkan on the card, `disabled_software` with no driver for one or with lavapipe alone
const COMPOSITING = 'gpu_compositing';
const ON_THE_CARD = 'enabled';
const UNTOLD = '--renderer gpu: Chrome did not tell whether it reached a graphics card';
const NO_CARD_SIDE =
	"--renderer gpu: Chrome gives the page no WebGL to read the graphics card's largest texture by, so a picture of the " +
	'page larger than it on a side may come out wrong with no error: shoot a tall or wide screen in software';
// The flag telling Chrome how much GPU memory it has, in megabytes, and how much it needs told for each byte of the
// stage's copies of a frame to draw them whole: 16 copies of a 3840 × 2160 frame drew whole at 4 times their bytes,
// and at 3 left the page's tiles grey with no error; a larger frame, or a card with less memory, is untried. The
// page's pictures need memory of their own, added to it (`bounds.ts`)
const GPU_MEMORY = '--force-gpu-mem-available-mb=';
const GPU_MEMORY_FOR_A_COPY_BYTE = 4;
// How many exposures of a frame the stage lays over one another at most; a frame of more is captured at each. With a
// window lifted and the camera angled, 16 came out alike to the exposures captured one by one and blended; 32 banded
// the edges, and 64 were no quicker than their 64 captures
const LAID_AT_ONCE_AT_MOST = 16;

type System = keyof typeof CARD_INTERFACES;

// How the stage draws a frame by each drawing a film names: flat, or as a room (`room.ts`)
const DRAWINGS: { readonly [Kind in Drawing]: StageDrawing } = { flat: DRAWN_FLAT, room: DRAWN_AS_A_ROOM };

/** Where a frame is drawn: in software, or on the machine's graphics card. */
export const RENDERERS = ['software', 'gpu'] as const;

export type Renderer = (typeof RENDERERS)[number];

/** The flags the shell is launched with to draw where the renderer draws, on the system it runs on. */
export function flagsOf(renderer: Renderer, platform: NodeJS.Platform): readonly string[] {
	switch (renderer) {
		case 'software':
			return [];
		case 'gpu':
			return [`${USE_ANGLE}${cardInterfaceOf(platform)}`];
	}
}

/** The interface ANGLE reaches the card through on a system; a system livereel knows none of is refused. */
function cardInterfaceOf(platform: NodeJS.Platform): string {
	if (!isSystem(platform)) {
		const known = Object.keys(CARD_INTERFACES).join(', ');
		throw new SetupError(`--renderer gpu draws on a graphics card on ${known}: not on ${platform}`);
	}
	return CARD_INTERFACES[platform];
}

function isSystem(platform: string): platform is System {
	return Object.hasOwn(CARD_INTERFACES, platform);
}

/** How many exposures of a frame the stage draws at once, where the renderer draws, for a page of a kind. */
export function exposuresAtOnceOf(renderer: Renderer, page: PageKind, blur: MotionBlur | null): number {
	switch (renderer) {
		case 'software':
			return ONE_AT_A_TIME;
		case 'gpu':
			return exposuresOnTheCardOf(page, blur);
	}
}

/**
 * How many exposures of a frame the stage draws at once on the graphics card: as many as a frame has at most, up to
 * livereel's bound, where it shows a picture of the page.
 */
function exposuresOnTheCardOf(page: PageKind, blur: MotionBlur | null): number {
	switch (page) {
		case 'static':
			return Math.min(mostExposuresOf(blur), LAID_AT_ONCE_AT_MOST);
		case 'dynamic':
			return ONE_AT_A_TIME;
	}
}

/**
 * The flags that tell Chrome it has GPU memory enough for the stage's copies of a frame, where it draws several, and
 * for the page's pictures of so many pixels at most; none where neither needs more than Chrome holds by itself.
 */
export function gpuMemoryFlagsOf(
	exposuresAtOnce: number,
	frame: Size,
	sharpness: number,
	picturePixels: number
): readonly string[] {
	const megabytes = copiesMemoryOf(exposuresAtOnce, frame, sharpness) + picturesMemoryOf(picturePixels);
	return megabytes === NO_MEMORY ? [] : [`${GPU_MEMORY}${megabytes}`];
}

/** The GPU memory the stage's copies of a frame need told, in megabytes: none where it draws one at a time. */
function copiesMemoryOf(exposuresAtOnce: number, frame: Size, sharpness: number): number {
	if (exposuresAtOnce === ONE_AT_A_TIME) return NO_MEMORY;
	const copyBytes = frame.width * sharpness * (frame.height * sharpness) * BYTES_A_PIXEL;
	return Math.ceil((GPU_MEMORY_FOR_A_COPY_BYTE * exposuresAtOnce * copyBytes) / BYTES_A_MEGABYTE);
}

export class Chromium implements Browser, DrawnBrowser, SetBrowser {
	readonly renderer: Renderer;
	readonly warn: Warn;
	/** The folder of the film's file, which the paths a film names are read from. */
	readonly filmFolder: string;

	constructor(renderer: Renderer, warn: Warn, filmFolder: string) {
		this.renderer = renderer;
		this.warn = warn;
		this.filmFolder = filmFolder;
	}

	/** A drawn film's page opened in the shell launched to draw where the renderer draws; no stage. */
	async openDrawn(address: string, frame: Size): Promise<OpenedDrawnPage> {
		const browser = await launched(flagsOf(this.renderer, process.platform));
		try {
			await drawsOnTheCard(this.renderer, browser, this.warn);
			return await drawnPageOpened(browser, address, frame);
		} catch (fault) {
			await browser.close();
			throw fault;
		}
	}

	/**
	 * The app opened for its set to be shot: a tab at the screen's size and the set's sharpness, asked for the film's
	 * colour scheme with its own motion stilled, the blocks the film blurs blurred, at the app's address.
	 */
	async openForSet(setting: SetSetting, address: string): Promise<OpenedForSet> {
		const browser = await launched(flagsOf(this.renderer, process.platform));
		try {
			const tab = await browser.newPage({
				viewport: setting.format.screen,
				deviceScaleFactor: setting.sharpness,
				permissions: [LOCAL_NETWORK]
			});
			await tab.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
			await unreadRefused(tab, setting.blurred);
			await forcedOn(tab, setting.blurred, THE_PAGE_AT_THE_TOP);
			await reached(tab, address);
			return new AppOpenedForSet(browser, tab);
		} catch (fault) {
			await browser.close();
			throw fault;
		}
	}

	async open(setting: Setting, filmed: Filmed, sharpness: number): Promise<Opened> {
		const page = pageKindOf(filmed);
		const exposuresAtOnce = exposuresAtOnceOf(this.renderer, page, setting.motionBlur);
		const pixelsAtZoomOne = sharpness * frameScaleOf(setting.format.frame);
		const picturePixels = picturePixelsAtMost(page, setting.format.screen, pixelsAtZoomOne);
		const memory = gpuMemoryFlagsOf(exposuresAtOnce, setting.format.frame, sharpness, picturePixels);
		const drawing = DRAWINGS[setting.drawing];
		const pictures = await filmsPicturesRead(this.filmFolder, setting.pictures);
		const fonts = await filmsFontsRead(this.filmFolder, setting.fonts);
		const read = { setting, pictures, fonts };
		const browser = await launched([...flagsOf(this.renderer, process.platform), ...drawing.flags, ...memory]);
		try {
			const onTheCard = await drawsOnTheCard(this.renderer, browser, this.warn);
			if (this.renderer === 'software' && drawing.saidInSoftware !== null) this.warn(drawing.saidInSoftware);
			const stage = await browser.newPage({
				viewport: setting.format.frame,
				deviceScaleFactor: sharpness,
				permissions: [LOCAL_NETWORK]
			});
			await unreadRefused(stage, setting.blurred);
			const ownPages = await ownPagesOpened(browser, setting, pixelsAtZoomOne * ZOOM_AT_MOST);
			switch (filmed.kind) {
				case 'static':
				case 'set': {
					const bounds = boundsOf(picturePixels, await cardSideIn(onTheCard, stage, this.warn));
					const things = setting.things === null ? null : resolve(this.filmFolder, setting.things);
					const handedIn = handedInOf(drawing, setting.format.frame, sharpness, setting.framesHanded);
					const picturing = { sharpness, pixelsAtZoomOne, exposuresAtOnce, bounds, drawing, handedIn, things };
					return await pictured(browser, stage, read, filmed, picturing, ownPages, this.warn);
				}
				case 'dynamic':
					return await framedLive(browser, stage, read, filmed.address, sharpness, ownPages ?? NO_OWN_PAGES, this.warn);
			}
		} catch (fault) {
			await browser.close();
			throw fault;
		}
	}
}

/**
 * The browser with the filmed page shown on its stage: acted on, typed into and scrolled in the tab it stands in; and
 * the pages of the film's own, read on the copy of each in a tab of their own.
 */
class OpenedChromium implements Opened {
	readonly browser: Playwright;
	readonly stage: Stage;
	readonly page: FilmedPage;
	readonly ownPages: OwnPages;
	readonly act: ActContext;
	readonly time: PageTime;
	readonly thingsBuilt: readonly string[];
	readonly filmsPictures: ReadonlyMap<string, PictureDecoded>;

	constructor(browser: Playwright, stage: Stage, filmed: FilmedShown, time: PageTime, laid: LaidOnTheStage) {
		this.browser = browser;
		this.stage = stage;
		this.page = filmed.page;
		this.ownPages = laid.ownPages;
		this.act = filmed.act;
		this.time = time;
		this.thingsBuilt = laid.thingsBuilt;
		this.filmsPictures = laid.filmsPictures;
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.browser.close();
	}
}

/** How a page a take films changes: a set as a static page does, by the film's acts alone. */
function pageKindOf(filmed: Filmed): PageKind {
	switch (filmed.kind) {
		case 'static':
		case 'set':
			return 'static';
		case 'dynamic':
			return 'dynamic';
	}
}

/**
 * A static page opened in a tab of its own at the screen's size, and pictured on the stage apart from the app, each
 * picture as sharp as the stage's frames are for a camera at the zoom the take names, on a frame of the format's size:
 * the live page, or the film's set, laid on a page of livereel's that shows one state at a time. The tab stands at the
 * device scale of the sharpest picture, so a page that picks its images by it picks those. Parts of the film's own
 * pages are pictured in the tab their copies stand in, where it has any.
 */
async function pictured(
	browser: Playwright,
	stage: Page,
	read: SettingRead,
	filmed: Pictured,
	picturing: Picturing,
	ownPages: OwnPagesTab | null,
	warn: Warn
): Promise<Opened> {
	const { pixelsAtZoomOne, exposuresAtOnce, bounds, drawing, handedIn } = picturing;
	const setting = read.setting;
	await drawing.opened(stage, picturing.things);
	const setUp = await stageSetUp(
		stage,
		read,
		picturing.sharpness,
		drawing,
		layoutOf(setting.format, exposuresAtOnce, drawing, handedIn),
		picturing.things
	);
	const tab = await browser.newPage({
		viewport: setting.format.screen,
		deviceScaleFactor: pixelsAtZoomOne * ZOOM_AT_MOST,
		permissions: [LOCAL_NETWORK]
	});
	await tab.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
	await forcedOn(tab, setting.blurred, THE_PAGE_AT_THE_TOP);
	const time = await PlaywrightPageTime.installedOn(tab, warn);
	const changes = await ChangesHeard.on(tab);
	const watch = new TabWatch(tab, addressOf(filmed));
	const shown = await shownIn(tab, filmed);
	const session = await tab.context().newCDPSession(tab);
	const filmedTab = { tab, session, screen: setting.format.screen, pixelsAtZoomOne, bounds, changes };
	const picturedStage = new PlaywrightPicturedStage(
		stage,
		filmedTab,
		ownPages,
		watch,
		exposuresAtOnce,
		drawing,
		handedIn,
		warn
	);
	return new OpenedChromium(browser, picturedStage, shown, time, { ownPages: ownPages ?? NO_OWN_PAGES, ...setUp });
}

/** The address the filmed page's tab opens: the live page's, or the set's page. */
function addressOf(filmed: Pictured): string {
	switch (filmed.kind) {
		case 'static':
			return filmed.address;
		case 'set':
			return SET_PAGE;
	}
}

/** The filmed page opened in its tab, as a take reads it and an act is handed it: live, or the set, its states laid. */
async function shownIn(tab: Page, filmed: Pictured): Promise<FilmedShown> {
	switch (filmed.kind) {
		case 'static':
			await reached(tab, filmed.address);
			return liveIn(tab.mainFrame(), tab);
		case 'set':
			return setShownIn(tab, filmed.set);
	}
}

/**
 * The live page in its frame, as a take reads it and an act is handed it, typed into and its motion switched in the
 * tab it stands in: shot on no set.
 */
function liveIn(frame: Frame, tab: Page): FilmedShown {
	return {
		page: new PlaywrightPage(frame, tab.keyboard),
		act: { page: frame, motion: new PageMotion(tab), set: new NoSetShown(NO_SET_IN_THE_FILM) }
	};
}

/**
 * A dynamic page opened live in the stage's frame, the stage standing where the film asks and drawing so many of its
 * pixels to a frame's; refused where the page is gone.
 */
async function framedLive(
	browser: Playwright,
	stage: Page,
	read: SettingRead,
	address: string,
	sharpness: number,
	ownPages: OwnPages,
	warn: Warn
): Promise<Opened> {
	const setting = read.setting;
	await forcedOn(stage, setting.blurred, THE_STAGE_AT_THE_TOP);
	const time = await PlaywrightPageTime.installedOn(stage, warn);
	const opening = await staged(stage, setting.stage, address, warn);
	const watch = new FrameWatch(stage, setting.stage, address);
	const { filmed, filmsPictures } = await framed(stage, read, sharpness, opening);
	const absence = await watch.absence(filmed);
	if (absence !== undefined) throw absence;
	const framedStage = new PlaywrightFramedStage(stage, setting.format, watch, filmed);
	const laid = { ownPages, thingsBuilt: NO_THINGS, filmsPictures };
	return new OpenedChromium(browser, framedStage, liveIn(filmed, stage), time, laid);
}

/** The shell launched with these flags. */
async function launched(flags: readonly string[]): Promise<Playwright> {
	try {
		return await chromium.launch({ args: [...flags] });
	} catch (fault) {
		throw lackOf(fault) ?? fault;
	}
}

/**
 * What this machine lacks for the browser to start, where Playwright's fault says so: in livereel's words for a
 * browser never downloaded, in Playwright's own for libraries the system lacks; none for any other fault.
 */
function lackOf(fault: unknown): SetupError | undefined {
	if (!(fault instanceof Error)) return undefined;
	if (fault.message.includes(NO_BROWSER)) return new SetupError(NOT_INSTALLED, { cause: fault });
	if (fault.message.includes(NO_LIBRARIES)) return new SetupError(fault.message, { cause: fault });
	return undefined;
}

/**
 * Whether the launched browser draws on the graphics card, checked against where it was asked to draw: asked onto the
 * card and reaching none, it draws in software all the same, and the person is warned, as a page that draws with WebGL
 * may then draw nothing; a Chrome that does not tell is said as such, and taken to draw in software.
 */
async function drawsOnTheCard(renderer: Renderer, browser: Playwright, warn: Warn): Promise<boolean> {
	switch (renderer) {
		case 'software':
			return false;
		case 'gpu': {
			const compositing = await compositingOf(browser);
			if (compositing === ON_THE_CARD) return true;
			if (compositing === undefined) {
				warn(UNTOLD);
				return false;
			}
			warn(
				`--renderer gpu reached no graphics card (Chrome's compositing is ${compositing}): the frames are ` +
					'drawn in software, and a page that draws with WebGL may draw nothing'
			);
			return false;
		}
	}
}

/**
 * The largest texture of the graphics card Chrome draws on, which no picture it takes may pass on a side, as WebGL
 * reports it on a page; none where it draws in software, and none where it gives the page no WebGL, the person warned
 * that a picture larger may then come out wrong.
 */
async function cardSideIn(onTheCard: boolean, page: Page, warn: Warn): Promise<number | null> {
	if (!onTheCard) return null;
	const side = await cardSideOf(page);
	if (side === null) warn(NO_CARD_SIDE);
	return side;
}

/**
 * How Chrome composites its pages, as it reports it: `enabled` on the graphics card. The call ships with the browser
 * Playwright pins, so a failure of it is a fault of the setup, and fails the take as one rather than go on unsure.
 */
async function compositingOf(browser: Playwright): Promise<string | undefined> {
	const session = await browser.newBrowserCDPSession();
	try {
		const { gpu } = await session.send('SystemInfo.getInfo');
		return gpu.featureStatus?.[COMPOSITING];
	} finally {
		await session.detach();
	}
}

/**
 * The stage opened where the film asks for it; how its frame then opens the page. Apart from the app the frame is not
 * sandboxed, so the page does all it would, and nothing a sandbox changes for an app (a popup, a download, storage) is
 * a risk of the simple stage: Chrome stops a page of another site moving the page it is framed in, but not on a click,
 * so a click on a link to `_top` takes the stage away, and the take is refused, saying so and naming the stage inside
 * the app, where the frame is sandboxed against it (`watch.ts`).
 */
async function staged(page: Page, stage: StagePlace, address: string, warn: Warn): Promise<Opening> {
	switch (stage) {
		case 'apart':
			await stageApartOpened(page);
			return { address, sandbox: null };
		case 'inside':
			return stagedInside(page, address, warn);
	}
}

/**
 * A selector the film blurs that Chrome cannot make a rule of, refused before anything opens, by the same making of a
 * rule, where a style sheet would drop it without a word.
 */
async function unreadRefused(page: Page, blurred: readonly string[]): Promise<void> {
	const unread = await page.evaluate(unreadOf, blurred);
	if (unread !== undefined) {
		throw new FilmError(`the film's blurred holds ${JSON.stringify(unread)}: it is no selector Chrome reads`);
	}
}

/**
 * What the film forces on the page — the blocks it blurs blurred, the text caret steady — in every document a tab
 * opens, by a style sheet each is given as it is made, a rule a selector, so a page the film goes on to has it too;
 * where the stage stands at the top, its own document is given none. A document that sets its own adopted style
 * sheets in place of all loses them, and a block in a shadow root is not blurred; its field's caret, inherited from its
 * host, stands steady all the same.
 */
async function forcedOn(page: Page, blurred: readonly string[], stageAtTheTop: boolean): Promise<void> {
	const rules = [STEADY_CARET, ...blurred.map((selector) => ({ selector, ...BLURRING }))];
	await page.addInitScript(forcedIn, { rules, priority: OVER_THE_PAGES_OWN, stageAtTheTop });
}

/**
 * The stage set to the film's format by its layout, laid out as it draws its frames and hands them on, and
 * asked for its colour scheme and stilled motion. The film's own pictures and fonts are laid, and refused where one
 * decodes to none, each picture's pixels across read in the frame's at the stage's sharpness. What the film writes in
 * CSS, in its theme or in a look's move, is then refused where CSS cannot read it as the stage sets it, where the stage
 * would draw without a word what the film never asked for: a font CSS reads as no list of families a fallback can
 * follow, as one with a quote left open, which runs on over the stage's own fallbacks to the browser's font, or one
 * naming no family this machine has or the film brought, which falls through to the stage's own; the ground's layers
 * CSS reads as none, which would draw no layers at all, or with a picture in them.
 */
async function stageSetUp(
	page: Page,
	read: SettingRead,
	sharpness: number,
	drawing: StageDrawing,
	layout: Layout,
	things: string | null
): Promise<SetUp> {
	const setting = read.setting;
	await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: setting.colourScheme });
	await page.evaluate(setUpStage, layout);
	const thingsBuilt = await drawing.laidOut(page, layout, things);
	await page.evaluate(ownPagesLaid, setting.ownPages);
	const filmsPictures = await filmsPicturesLaid(page, read.pictures, sharpness);
	await filmsFontsLaid(page, read.fonts);
	for (const named of setting.css) await refusedWhereUnread(page, named);
	return { thingsBuilt, filmsPictures };
}

/**
 * The stage set up at a sharpness and the page opened in its frame, as far as it loads: its frame, and the film's own
 * pictures the stage laid; a framed page is drawn flat.
 */
async function framed(
	page: Page,
	read: SettingRead,
	sharpness: number,
	opening: Opening
): Promise<{ readonly filmed: Frame; readonly filmsPictures: ReadonlyMap<string, PictureDecoded> }> {
	const format = read.setting.format;
	const setUp = await stageSetUp(
		page,
		read,
		sharpness,
		DRAWN_FLAT,
		layoutOf(format, ONE_AT_A_TIME, DRAWN_FLAT, boxOf(format.frame)),
		NO_THINGS_MODULE
	);
	const [filmed] = await Promise.all([
		page.waitForEvent(NAVIGATED, { predicate: isInTheStagesFrame }),
		page.evaluate(openPage, opening)
	]);
	await filmed.waitForLoadState();
	return { filmed, filmsPictures: setUp.filmsPictures };
}

/** What a film writes in CSS refused, by where it writes it, where CSS cannot read it as the stage sets it. */
async function refusedWhereUnread(page: Page, named: CssNamed): Promise<void> {
	const fault = await cssFaultOf(page, named);
	if (fault !== undefined) throw new FilmError(`${named.place} is ${JSON.stringify(named.value)}: ${fault}`);
}

/** What is wrong with what a film writes in CSS, as the stage sets it; none where CSS reads it so. */
async function cssFaultOf(page: Page, named: CssNamed): Promise<string | undefined> {
	switch (named.kind) {
		case 'font family': {
			const followed = await page.evaluate(isFollowedByAFallback, { font: named.value, fallback: FALLBACK_FONT });
			if (!followed) return NO_FONT_FAMILY;
			const found = await page.evaluate(namesAFontHere, { font: named.value, ...FOUND_BY });
			return found ? undefined : NO_SUCH_FONT;
		}
		case 'ground layers':
			return layersFaultOf(
				await page.evaluate(layersReadOf, { layers: named.value, token: LAYERS_TOKEN, picture: PICTURE })
			);
	}
}

/** What is wrong with the ground's layers, by how CSS reads them; none where it reads them as layers to draw. */
function layersFaultOf(read: LayersRead): string | undefined {
	switch (read) {
		case 'read':
			return undefined;
		case 'unread':
			return NO_LAYERS;
		case 'pictured':
			return PICTURED;
	}
}

/** Whether a page that went somewhere is the one in the stage's frame, not the stage itself. */
function isInTheStagesFrame(navigated: Frame): boolean {
	return navigated.parentFrame() !== null;
}

// What follows runs in the page, each function handed over alone

/** The first of the selectors the browser cannot make a rule of; none where it makes one of each. */
function unreadOf(selectors: readonly string[]): string | undefined {
	const sheet = new CSSStyleSheet();
	for (const selector of selectors) {
		try {
			sheet.insertRule(`${selector} {}`);
		} catch {
			return selector;
		}
	}
	return undefined;
}

/** A document given what the film forces on it, a rule a selector, unless it is the stage's own, at its tab's top. */
function forcedIn(forcing: Forcing): void {
	if (forcing.stageAtTheTop && window.top === window) return;
	const sheet = new CSSStyleSheet();
	for (const forced of forcing.rules) {
		const rule = sheet.cssRules.item(sheet.insertRule(`${forced.selector} {}`));
		if (rule instanceof CSSStyleRule) rule.style.setProperty(forced.property, forced.value, forcing.priority);
	}
	document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

/** Whether CSS reads a font a film names as a list of families the fallback can follow, its own family still. */
function isFollowedByAFallback(probe: FontProbe): boolean {
	const element = document.createElement('i');
	element.style.fontFamily = `${probe.font}, ${probe.fallback}`;
	return element.style.fontFamily.endsWith(`, ${probe.fallback}`);
}

/**
 * Whether a font a film names sets letters of its own on the stage, a family the machine has or the film brought, or
 * one CSS keeps: where it sets none, its letters fall through to the family set after it, as wide as that one sets them
 * alone, beside each family the probe names.
 */
function namesAFontHere(probe: FontFoundProbe): boolean {
	const element = document.createElement('span');
	element.style.fontSize = probe.size;
	element.style.whiteSpace = probe.oneLine;
	element.textContent = probe.letters;
	document.body.append(element);
	let setsItsOwn = false;
	for (const family of probe.beside) {
		element.style.fontFamily = family;
		const alone = element.getBoundingClientRect().width;
		element.style.fontFamily = `${probe.font}, ${family}`;
		if (element.getBoundingClientRect().width !== alone) setsItsOwn = true;
	}
	element.remove();
	return setsItsOwn;
}

/**
 * How CSS reads the ground's layers a film writes, as the stage draws them: set in its token, which a word CSS keeps
 * for every property (`inherit`, `initial`) or a custom property set nowhere leaves empty, and as the whole of a
 * background as the token stands: as no images where it reads none; else with a picture in them or without.
 */
function layersReadOf(probe: LayersProbe): LayersRead {
	const holder = document.createElement('i');
	holder.style.setProperty(probe.token, probe.layers);
	document.body.append(holder);
	const standing = getComputedStyle(holder).getPropertyValue(probe.token);
	holder.remove();
	const drawn = document.createElement('i');
	drawn.style.background = standing;
	const images = drawn.style.backgroundImage;
	if (images === '') return 'unread';
	return images.includes(probe.picture) ? 'pictured' : 'read';
}
