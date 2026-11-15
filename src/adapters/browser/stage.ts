/**
 * The stage page as the studio uses it: a frame drawn, the page made ready for an act and set back after it, the page
 * retaken where it is a picture, a frame captured. `StageApi` is what the stage's script, `stage/stage.js`, answers
 * under `window.stage`.
 *
 * The stage shows the filmed page one of two ways. A dynamic page, which changes of itself, stands live in the screen's
 * frame (`PlaywrightFramedStage`): every frame shows it as it is, and an act lays the screen flat first, as a browser
 * finds the point it clicks wrongly on a screen the camera has scaled. A static page stands in a tab of its own, at the
 * screen's size, and the stage shows a picture of it (`PlaywrightPicturedStage`), taken anew as the take asks, after
 * the page was acted on or moved: a frame then costs one capture of the stage, the page's picture standing as it was,
 * and an act is done in the page's own tab, at no scale. Such a stage draws a frame flat, by its markup alone
 * (`DRAWN_FLAT`), or as a room, its markup composed in WebGL (`room.ts`). The picture is taken as sharp as a camera at
 * the zoom the take names shows the page, up to as far as a camera comes in where a film names no bound
 * (`ZOOM_AT_MOST`), so text the camera comes close to stays as crisp as the live frame shows it.
 *
 * The page's picture is taken by CDP's capture on livereel's own session with its tab, clipped to the screen at a scale
 * of the picture's pixels to the page's, which Chrome draws the page anew at, so one tab serves every scale, as sharp
 * as a tab at that scale and quicker than Playwright's picture, which takes the tab's device scale alone. CDP's capture
 * does not wait for the page's fonts, as Playwright's does, so a picture waits for them: Chrome hides text in a face
 * still loading for up to 3 s, and two pictures alike without it would hold the page still with its text missing. A
 * picture of a part of the screen a piece is drawn from, the one it holds or one sharper than the page's, is taken the
 * same way, clipped to that part, and handed to the stage by its number, which keeps it until the take lets it go; one
 * of a page of the film's own, from the tab its copy stands in (`own-pages.ts`). Every picture is taken no larger than
 * Chrome takes one whole where it draws (`bounds.ts`): one asked larger, of a tall screen or a part grown far, is taken
 * as large as it may, softer, and the person is told so once.
 *
 * A frame is captured by Playwright at the page's device scale, the film's sharpness; a room's frame for a video from
 * the corner of the room's canvas it is scaled down into, at the frame's own size, a quarter of the pixels to read back
 * and encode (`handedInOf`). Not by a CDP session of livereel's own: it captures at the page's own pixels unless given
 * device metrics of its own, which make it barely quicker, too little to keep them in step with Playwright's as an act
 * lays the screen flat. The page's text caret is kept, as a person sees it typing, and stands steady (`chromium.ts`).
 * Whether the filmed page and its stage are still there, the stage answers from its watch (`watch.ts`): a framed
 * page's, or a tab's, which can take no stage away nor refuse a frame.
 */
import type { CDPSession, Frame, Page } from 'playwright-core';
import { type Channels, meanInLinearLight, opaqueHexOf } from '../../domain/colour.ts';
import type { Format } from '../../domain/format.ts';
import { type Box, type FrameSide, type Point, type Size, boxOf, frameScaleOf } from '../../domain/geometry.ts';
import type { Drawing } from '../../direction/film.ts';
import type { OwnPage } from '../../direction/page.ts';
import type { DrawnScene, ObjectList } from '../../scene.ts';
import type { FramedStage, FramesHanded, PicturedPage, PicturedStage } from '../../studio/ports.ts';
import { type PictureBound, scaleWithin } from './bounds.ts';
import type { ChangesHeard } from './changes.ts';
import type { FrameWatch, TabWatch } from './watch.ts';
import type { Warn } from './warn.ts';

// The package's stage, as far from this module in the source as in the package built from it, and its page
export const STAGE_FOLDER = new URL('../../../stage/', import.meta.url);
export const STAGE_PAGE = 'stage.html';

/**
 * How the stage is laid out for a take: the frame it fills, the screen the camera moves in it, and how many of the
 * frame's pixels a film pixel takes, which the camera's zoom and what stands over the frame are scaled by; how many
 * exposures of a frame it draws at once, each a whole drawing of the stage laid over those before; how a frame is
 * drawn, flat by the stage's markup alone or as a room, which composes the surfaces the stage lays its markup in; and
 * the part of the stage, in its own pixels, a frame is handed on from. The eye is in the matrices the engine hands the
 * stage with each frame.
 */
export interface Layout {
	readonly format: Format;
	readonly frameScale: number;
	readonly exposures: number;
	readonly drawing: Drawing;
	readonly handedIn: Box;
}

/**
 * How the screen's frame opens the filmed page: at its address, and sandboxed inside the app, where the page could move
 * the stage away whenever it likes, the sandbox's value what the page may still do; none apart from it.
 */
export interface Opening {
	readonly address: string;
	readonly sandbox: string | null;
}

/**
 * A picture of the filmed page as the stage is handed it: its bytes in base64, as CDP takes it, and its image's type.
 */
export interface PagePicture {
	readonly base64: string;
	readonly type: string;
}

/** A picture of a part of the filmed page's screen a piece holds, as the stage is handed it, and its number. */
export interface HeldPicture extends PagePicture {
	readonly number: number;
}

/** A picture the stage reads pixels off, and the points of it it reads, in its pixels from its top left. */
export interface PixelsAsked extends PagePicture {
	readonly points: readonly Point[];
}

/** How CDP is asked to take a picture: as a JPEG this good, or as a PNG. */
type PictureTaken = { readonly format: 'jpeg'; readonly quality: number } | { readonly format: 'png' };

/** A picture of the film's own as the stage is handed it, by the path the film names it by. */
export interface FilmsPictureHanded extends PagePicture {
	readonly path: string;
}

/**
 * A picture of the film's own as the stage decoded it, by its path: its size, none across and down where it decodes to
 * none.
 */
export interface FilmsPictureDecoded extends Size {
	readonly path: string;
}

/** A font of the film's own as the stage is handed it: the family it sets, its file's path and its bytes in base64. */
export interface FilmsFontHanded {
	readonly family: string;
	readonly path: string;
	readonly base64: string;
}

/**
 * A surface the stage lays an object of markup standing in the world in, apart from the frame's objects, where a frame
 * is drawn as a room: the object's list, standing or pushed off, and its name, and the surface's element, which the
 * room lays in its canvas and stands where the object stands in its one scene (`stage/room.js`).
 */
export interface SurfaceApart {
	readonly list: ObjectList;
	readonly name: string;
	readonly element: HTMLElement;
}

export interface StageApi {
	/** The stage laid out: the frame and the screen in it, as large as it draws, its exposures, and how it is drawn. */
	readonly setup: (layout: Layout) => void;
	/**
	 * The surfaces an exposure, by its place among the stage's, laid markup standing in the world in as it last drew,
	 * apart from the frame's objects, where it is drawn as a room; none where it is drawn flat, which lays such markup
	 * among them.
	 */
	readonly laidApart: (exposure: number) => readonly SurfaceApart[];
	/** The filmed page opened in the screen's frame. */
	readonly open: (opening: Opening) => void;
	/** A picture of the filmed page, shown in the frame's place once it is decoded. */
	readonly show: (picture: PagePicture) => Promise<void>;
	/** A picture of a part of the screen held by its number until it is let go, once it is decoded. */
	readonly hold: (picture: HeldPicture) => Promise<void>;
	/** A picture of a part of the screen held let go, by its number, its address with it. */
	readonly letGo: (number: number) => void;
	/** The pixels of a picture at points of it, each its channels from 0 to 255, as the picture decodes. */
	readonly pixelsAt: (asked: PixelsAsked) => Promise<readonly Channels[]>;
	/**
	 * The pages of the film's own laid out in the screen's place in every exposure, hidden until a frame shows one, each
	 * loaded with its fonts, its scripts kept from running; moves read them in a tab of their own (`own-pages.ts`).
	 */
	readonly layOwnPages: (pages: readonly OwnPage[]) => Promise<void>;
	/**
	 * The film's own pictures held by their paths, each once it is decoded, so every frame drawn after shows it whole:
	 * the size each decoded at.
	 */
	readonly layPictures: (pictures: readonly FilmsPictureHanded[]) => Promise<readonly FilmsPictureDecoded[]>;
	/**
	 * The film's own fonts joining the stage's, each under the family it sets, once its file is read: the paths of those
	 * the browser reads as no font.
	 */
	readonly layFonts: (fonts: readonly FilmsFontHanded[]) => Promise<readonly string[]>;
	/** One frame, drawn whole from each of its exposures' scenes, laid over one another so each weighs the same. */
	readonly apply: (exposures: readonly DrawnScene[]) => void;
}

declare global {
	interface Window {
		stage: StageApi;
	}
}

/**
 * How the stage draws a frame, flat or as a room (`room.ts`), by the name the film gives it, which the stage is laid
 * out for: the flags the browser is launched with for it, how the stage is opened, serving the film's things module
 * where it names one, and then laid out, loading it: the names it builds a thing by, none for a stage that draws no
 * things; how a frame's exposures are drawn on it, and waited on to the end of their drawing; how a part of the frame
 * drawn is captured; whether it scales its frame down to the frame's own size without a change of look; and what the
 * person who asks for software is told, if anything.
 */
export interface StageDrawing {
	readonly name: Drawing;
	readonly flags: readonly string[];
	readonly opened: (page: Page, things: string | null) => Promise<void>;
	readonly laidOut: (page: Page, layout: Layout, things: string | null) => Promise<readonly string[]>;
	readonly drawn: (page: Page, exposures: readonly DrawnScene[]) => Promise<void>;
	readonly finished: (page: Page) => Promise<void>;
	readonly captured: (page: Page, part: Box) => Promise<Uint8Array>;
	readonly scalesItsFrame: boolean;
	readonly saidInSoftware: string | null;
}

/**
 * The stage drawn flat: opened from the package's files as they stand, laid out by its markup, drawn by it alone, as
 * the browser lays out and paints it in its capture, so nothing goes on drawing past its draw. Captured at the frame's
 * own size, the browser would draw its text anew at that size, not scale it: its frames are handed as sharp as drawn.
 */
export const DRAWN_FLAT: StageDrawing = {
	name: 'flat',
	flags: [],
	opened: stageApartOpened,
	laidOut: () => Promise.resolve(NO_THINGS),
	drawn: drawnOn,
	finished: () => Promise.resolve(),
	captured: capturedOf,
	scalesItsFrame: false,
	saidInSoftware: null
};

/**
 * The part of a stage, in its own pixels, a frame drawn so sharp is handed on from, where it is asked to be handed so:
 * the whole frame, as sharp as drawn, or by a drawing that does not scale its frame; else the frame's top left corner,
 * as many of the stage's pixels as the frame has of its own, which the drawing scales its frame down into, a pixel of
 * the drawing to a pixel of the frame. The room's canvas is held at the drawing's size: the browser paints the markup
 * laid in it as densely as the canvas is drawn, and a canvas of the frame's own size drew every surface half as sharp.
 */
export function handedInOf(drawing: StageDrawing, frame: Size, sharpness: number, asked: FramesHanded): Box {
	const scaled = drawing.scalesItsFrame && asked === SCALED;
	return boxOf(scaled ? { width: frame.width / sharpness, height: frame.height / sharpness } : frame);
}

// A stage that draws no things of a film's own: flat CSS draws no three.js
export const NO_THINGS: readonly string[] = [];
// How good a frame's JPEG is, captured off the stage or off a drawn film's page
export const JPEG_QUALITY = 92;
// A stage that draws one exposure of a frame at a time
export const ONE_AT_A_TIME = 1;
// A frame asked to be handed on scaled to the frame's own size
const SCALED: FramesHanded = 'scaled';
// The page's picture is taken as a JPEG: as CDP is asked for it, and the type of image the stage is handed
const PICTURE_TAKEN: PictureTaken = { format: 'jpeg', quality: JPEG_QUALITY };
const PICTURE_TYPE = 'image/jpeg';
// A part of the screen read for the colour of its edge is taken as a PNG, whose pixels no compression bleeds into one
// another, two of its pixels to the page's whatever the shoot's quality and frame, and read 1.5 of the page's pixels in
// from the middle of a side, past a border of a pixel
const EDGE_TAKEN: PictureTaken = { format: 'png' };
const EDGE_TYPE = 'image/png';
const EDGE_READ = { scale: 2, inFromTheSide: 1.5 };
const HALF = 0.5;
// The first pixel of a picture's row or column, and how far before its length the last stands
const FIRST_PIXEL = 0;
const LAST_PIXEL_BACK = 1;
// How many decimal places a zoom is said to
const PLACES_SAID = 2;

/**
 * The stage with the filmed page live in its frame, which no copy of the stage can show again: it draws one exposure of
 * a frame at a time.
 */
export class PlaywrightFramedStage implements FramedStage {
	readonly kind = 'framed';
	readonly exposuresAtOnce = ONE_AT_A_TIME;
	readonly page: Page;
	readonly format: Format;
	readonly watch: FrameWatch;
	readonly filmed: Frame;

	constructor(page: Page, format: Format, watch: FrameWatch, filmed: Frame) {
		this.page = page;
		this.format = format;
		this.watch = watch;
		this.filmed = filmed;
	}

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		return drawnOn(this.page, exposures);
	}

	/** Drawn flat, as the browser paints it in its capture. */
	drawingFinished(): Promise<void> {
		return DRAWN_FLAT.finished(this.page);
	}

	/**
	 * A browser finds the point it clicks wrongly on a screen the camera has scaled; at no scale, every point is the
	 * page's own.
	 */
	async layFlat(scene: DrawnScene): Promise<void> {
		await this.sizedTo({ frame: this.format.screen, screen: this.format.screen });
		await this.draw([scene]);
	}

	standUp(): Promise<void> {
		return this.sizedTo(this.format);
	}

	absence(): Promise<Error | undefined> {
		return this.watch.absence(this.filmed);
	}

	capture(): Promise<Uint8Array> {
		return capturedOf(this.page, boxOf(this.format.frame));
	}

	private async sizedTo(format: Format): Promise<void> {
		await this.page.setViewportSize(format.frame);
		const layout = layoutOf(format, this.exposuresAtOnce, DRAWN_FLAT, boxOf(format.frame));
		await this.page.evaluate(setUpStage, layout);
	}
}

/** A tab a page stands in as pictures of it are taken: the tab, and livereel's own CDP session with it. */
export interface PictureTab {
	readonly tab: Page;
	readonly session: CDPSession;
}

/**
 * The tab a static page stands in, as its pictures are taken, at the screen's size, a page's pixel taking so many of a
 * picture's for a camera at a zoom of 1, within the bounds Chrome takes a picture whole in (`bounds.ts`).
 */
export interface FilmedTab extends PictureTab {
	readonly screen: Size;
	readonly pixelsAtZoomOne: number;
	readonly bounds: readonly PictureBound[];
	readonly changes: ChangesHeard;
}

/**
 * The stage showing a picture of the filmed page, which stands in a tab of its own, drawing as many exposures of a
 * frame at once as it was set up to, flat or as a room; and holding pictures of parts of the filmed page, or of the
 * film's own pages, taken in the tab their copies stand in, at the same device scale, none where the film has none.
 */
export class PlaywrightPicturedStage implements PicturedStage {
	readonly kind = 'pictured';
	readonly page: Page;
	readonly filmedTab: FilmedTab;
	readonly ownPagesTab: PictureTab | null;
	readonly watch: TabWatch;
	readonly exposuresAtOnce: number;
	readonly drawing: StageDrawing;
	readonly handedIn: Box;
	readonly warn: Warn;
	// The page's picture last taken, in base64, none before the first; how many pictures of a part of the screen the
	// stage holds, each by its number, counted from 1; and whether the person has been told a picture was taken softer
	// than asked, which they are once
	private picture: string | null = null;
	private picturesHeld = 0;
	private softerSaid = false;

	constructor(
		page: Page,
		filmedTab: FilmedTab,
		ownPagesTab: PictureTab | null,
		watch: TabWatch,
		exposuresAtOnce: number,
		drawing: StageDrawing,
		handedIn: Box,
		warn: Warn
	) {
		this.page = page;
		this.filmedTab = filmedTab;
		this.ownPagesTab = ownPagesTab;
		this.watch = watch;
		this.exposuresAtOnce = exposuresAtOnce;
		this.drawing = drawing;
		this.handedIn = handedIn;
		this.warn = warn;
	}

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		return this.drawing.drawn(this.page, exposures);
	}

	drawingFinished(): Promise<void> {
		return this.drawing.finished(this.page);
	}

	/** The page's picture taken anew, and shown where it came out otherwise than the last. */
	async retakePage(zoom: number): Promise<boolean> {
		const picture = await this.pictureAt(this.filmedTab, boxOf(this.filmedTab.screen), zoom);
		const alike = this.picture === picture;
		this.picture = picture;
		if (!alike) await this.page.evaluate(pictureShown, { base64: picture, type: PICTURE_TYPE });
		return alike;
	}

	/** A picture of a part of the screen taken of a page and handed to the stage to hold, by the next number. */
	async holdPicture(part: Box, zoom: number, page: PicturedPage): Promise<number> {
		const picture = await this.pictureAt(this.tabOf(page), part, zoom);
		this.picturesHeld += 1;
		await this.page.evaluate(pictureHeld, { base64: picture, type: PICTURE_TYPE, number: this.picturesHeld });
		return this.picturesHeld;
	}

	letGo(number: number): Promise<void> {
		return this.page.evaluate(pictureLetGo, number);
	}

	async edgeColour(part: Box, sides: readonly FrameSide[], page: PicturedPage): Promise<string> {
		const picture = await partPictured(this.tabOf(page), part, EDGE_READ.scale, EDGE_TAKEN);
		const size = { width: Math.round(part.width * EDGE_READ.scale), height: Math.round(part.height * EDGE_READ.scale) };
		const points = sides.map((side) => edgePointOf(side, size));
		const pixels = await this.page.evaluate(pixelsRead, { base64: picture, type: EDGE_TYPE, points });
		return opaqueHexOf(meanInLinearLight(pixels));
	}

	/** The tab a page is pictured in: the filmed page's, or the one the film's own pages stand in. */
	private tabOf(page: PicturedPage): PictureTab {
		switch (page) {
			case 'filmed':
				return this.filmedTab;
			case 'own':
				if (this.ownPagesTab === null) throw new Error('the film laid no page of its own to picture a part of');
				return this.ownPagesTab;
		}
	}

	/**
	 * A part of the screen as a tab shows it, as sharp as a camera at this zoom shows it, or as the tightest bound Chrome
	 * takes it whole in lets it: its bytes in base64.
	 */
	private pictureAt(source: PictureTab, part: Box, zoom: number): Promise<string> {
		const { pixelsAtZoomOne, bounds } = this.filmedTab;
		const taken = scaleWithin(part, pixelsAtZoomOne * zoom, bounds);
		if (taken.heldBy !== null && !this.softerSaid) {
			this.saySofter(part, zoom, taken.scale / pixelsAtZoomOne, taken.heldBy);
		}
		return partPictured(source, part, taken.scale, PICTURE_TAKEN);
	}

	/**
	 * The person told, once, that a picture of a part of the screen was taken as close as a camera at a lesser zoom than
	 * asked, and by what bound, so a camera or a piece closer than that shows it softer.
	 */
	private saySofter(part: Size, asked: number, taken: number, bound: PictureBound): void {
		this.softerSaid = true;
		this.warn(
			`a picture of ${Math.round(part.width)} × ${Math.round(part.height)} px of the screen is taken as close as a ` +
				`camera at a zoom of ${saidOf(taken)}, not the ${saidOf(asked)} asked, as ${bound.says}: a camera or a ` +
				`piece closer than ${saidOf(taken)} shows it softer, and pictures taken short after it are not said`
		);
	}

	changedOfItself(): boolean {
		return this.filmedTab.changes.heardSinceAsked();
	}

	/** A page in a tab of its own takes no stage away and refuses no frame: it is gone only where it was not reached. */
	absence(): Promise<Error | undefined> {
		return Promise.resolve(this.watch.absence());
	}

	capture(): Promise<Uint8Array> {
		return this.drawing.captured(this.page, this.handedIn);
	}
}

/**
 * The stage's layout for a format, drawing so many exposures of a frame at once, as a drawing has it drawn, handing
 * each on from that part of it.
 */
export function layoutOf(format: Format, exposures: number, drawing: StageDrawing, handedIn: Box): Layout {
	return { format, frameScale: frameScaleOf(format.frame), exposures, drawing: drawing.name, handedIn };
}

function drawnOn(page: Page, exposures: readonly DrawnScene[]): Promise<void> {
	return page.evaluate(applyExposures, exposures);
}

/** The stage opened apart from the app: the package's own file. */
export async function stageApartOpened(page: Page): Promise<void> {
	await page.goto(new URL(STAGE_PAGE, STAGE_FOLDER).href);
}

/** A zoom as the person is told it, to two places. */
function saidOf(zoom: number): number {
	return Number(zoom.toFixed(PLACES_SAID));
}

/**
 * A part of the screen as a tab shows it once its fonts have loaded, taken as asked at a scale of its pixels to the
 * page's, which Chrome draws the page anew at, its text caret kept: its bytes in base64.
 */
async function partPictured(source: PictureTab, part: Box, scale: number, taken: PictureTaken): Promise<string> {
	await source.tab.evaluate(fontsLoaded);
	const { cssVisualViewport } = await source.session.send('Page.getLayoutMetrics');
	const clip = {
		// eslint-disable-next-line id-length -- CDP names the corner a picture is clipped at `x` and `y`
		x: cssVisualViewport.pageX + part.left,
		// eslint-disable-next-line id-length -- as above
		y: cssVisualViewport.pageY + part.top,
		width: part.width,
		height: part.height,
		scale
	};
	const { data } = await source.session.send('Page.captureScreenshot', { ...taken, clip });
	return data;
}

/** A part of a page as it shows now, as a JPEG at its device scale, its text caret kept. */
export function capturedOf(page: Page, part: Box): Promise<Buffer> {
	// eslint-disable-next-line id-length -- Playwright names the corner a capture is clipped at `x` and `y`
	const clip = { x: part.left, y: part.top, width: part.width, height: part.height };
	return page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY, caret: 'initial', clip });
}

// What follows runs in the stage page, each function handed over alone

/** The stage laid out. */
export function setUpStage(layout: Layout): void {
	window.stage.setup(layout);
}

/** The filmed page opened in the stage's frame. */
export function openPage(opening: Opening): void {
	window.stage.open(opening);
}

function pictureShown(picture: PagePicture): Promise<void> {
	return window.stage.show(picture);
}

function pictureHeld(picture: HeldPicture): Promise<void> {
	return window.stage.hold(picture);
}

function pictureLetGo(number: number): void {
	window.stage.letGo(number);
}

function pixelsRead(asked: PixelsAsked): Promise<readonly Channels[]> {
	return window.stage.pixelsAt(asked);
}

/**
 * The pixel of a picture so large read for the colour of a side of its edge: the side's middle, so far in, no farther
 * than the picture's middle, so a part a few pixels across is read inside itself.
 */
function edgePointOf(side: FrameSide, picture: Size): Point {
	const middle = { left: Math.floor(picture.width * HALF), top: Math.floor(picture.height * HALF) };
	const inFromTheSide = Math.floor(EDGE_READ.inFromTheSide * EDGE_READ.scale);
	const across = Math.min(inFromTheSide, middle.left);
	const down = Math.min(inFromTheSide, middle.top);
	switch (side) {
		case 'left':
			return { left: Math.max(FIRST_PIXEL, across), top: middle.top };
		case 'right':
			return { left: Math.max(FIRST_PIXEL, picture.width - LAST_PIXEL_BACK - across), top: middle.top };
		case 'top':
			return { left: middle.left, top: Math.max(FIRST_PIXEL, down) };
		case 'bottom':
			return { left: middle.left, top: Math.max(FIRST_PIXEL, picture.height - LAST_PIXEL_BACK - down) };
	}
}

/** The film's own pictures laid on the stage: the size each decoded at. */
export function picturesLaid(pictures: readonly FilmsPictureHanded[]): Promise<readonly FilmsPictureDecoded[]> {
	return window.stage.layPictures(pictures);
}

/** The film's own fonts laid on the stage: the paths of those read as no font. */
export function fontsLaid(fonts: readonly FilmsFontHanded[]): Promise<readonly string[]> {
	return window.stage.layFonts(fonts);
}

/** The pages of the film's own laid on the stage. */
export function ownPagesLaid(pages: readonly OwnPage[]): Promise<void> {
	return window.stage.layOwnPages(pages);
}

function applyExposures(exposures: readonly DrawnScene[]): void {
	window.stage.apply(exposures);
}

// What follows runs in the filmed page's own tab, handed over alone

/** Once the page's fonts have loaded, or failed to. */
export async function fontsLoaded(): Promise<void> {
	await document.fonts.ready;
}
