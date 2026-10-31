/**
 * The stage page as the studio uses it: a frame drawn, the page made ready for an act and set back after it, the page
 * retaken where it is a picture, a frame captured. `StageApi` is what the stage's script, `stage/stage.js`, answers
 * under `window.stage`.
 *
 * The stage shows the filmed page one of two ways. A dynamic page, which changes of itself, stands live in the
 * screen's frame (`PlaywrightFramedStage`): every frame shows it as it is, and an act lays the screen flat first, as a
 * browser finds the point it clicks wrongly on a screen the camera has scaled. A static page stands in a tab of its
 * own, at the screen's size, and the stage shows a picture of it (`PlaywrightPicturedStage`), taken anew as the take
 * asks, after the page was acted on or moved: a frame then costs one capture of the stage, the page's picture standing
 * as it was, and an act is done in the page's own tab, at no scale. The picture is taken as sharp as a camera at the
 * zoom the take names shows the page, up to as far as a camera comes in where a film names no bound (`ZOOM_AT_MOST`),
 * so text the camera comes close to stays as crisp as the live frame shows it: the README film's close shots at 4×
 * against the live frame, SSIM 0.990–0.992, alike to the eye at twice their size (2026-10-30).
 *
 * The page's picture is taken by CDP's capture on livereel's own session with its tab, clipped to the screen at a
 * scale of the picture's pixels to the page's, which Chrome draws the page anew at: on a tab at 4.4×, at a scale of 2
 * in 81–83 ms and alike to a picture of a tab at 2× (SSIM 1.0), at 4.4 in 253–269 ms against Playwright's 340–348,
 * alike to its picture (SSIM 1.0); a 1040 × 1080 screen, 2026-10-30. Playwright's own picture takes none but the tab's
 * device scale. As Playwright's did, a picture waits for the page's fonts: CDP's does not, and text in a face still
 * loading, which Chrome hides for up to 3 s, came out missing in two pictures alike, so the page was held standing
 * still without it (probed 2026-10-30).
 *
 * A frame is captured by Playwright at the page's device scale, the film's sharpness. A capture of livereel's own, on
 * a CDP session apart from Playwright's, came back at the page's own pixels whatever that scale, every full shoot as
 * soft as a draft; and it was no quicker (measured 2026-10-25 at 1920 × 1080: 33 ms against 35 ms at 1×, 142 ms
 * against 134 ms at 2×). Its own device metrics set on it bring it to the film's sharpness, at 127–133 ms a capture
 * against Playwright's 135–137 on a 2.7 s piece of the README film (2026-10-30): too little for a second session's
 * metrics to keep in step with Playwright's as an act lays the screen flat. The page's text caret is kept, as a person
 * sees it typing, and stands steady (`chromium.ts`). Whether the filmed page and its stage are still there, the stage
 * answers from its watch (`watch.ts`): a framed page's, or a tab's, which can take no stage away nor refuse a frame.
 */
import type { CDPSession, Frame, Page } from 'playwright-core';
import { eyeDistanceOf } from '../../domain/camera.ts';
import type { Format } from '../../domain/format.ts';
import { type Size, frameScaleOf } from '../../domain/geometry.ts';
import type { DrawnScene } from '../../scene.ts';
import type { FramedStage, PicturedStage } from '../../studio/ports.ts';
import type { ChangesHeard } from './changes.ts';
import type { FrameWatch, TabWatch } from './watch.ts';

// The package's stage, as far from this module in the source as in the package built from it, and its page
export const STAGE_FOLDER = new URL('../../../stage/', import.meta.url);
export const STAGE_PAGE = 'stage.html';

/**
 * The room the stage moves the screen in: the frame it fills, the screen, how far the eye stands from the frame, and
 * how large the stage draws on it against the frames its look was made on: the camera's zoom, and what stands over the
 * frame; and how many exposures of a frame it draws at once, each a whole drawing of the stage laid over those before.
 */
export interface Room {
	readonly format: Format;
	readonly eyeDistance: number;
	readonly frameScale: number;
	readonly exposures: number;
}

/**
 * How the screen's frame opens the filmed page: at its address, and sandboxed inside the app, where the page could
 * move the stage away whenever it likes, the sandbox's value what the page may still do; none apart from it.
 */
export interface Opening {
	readonly address: string;
	readonly sandbox: string | null;
}

export interface StageApi {
	/** The stage laid out as a room: the screen in the frame, seen from the eye. */
	readonly setup: (room: Room) => void;
	/** The filmed page opened in the screen's frame. */
	readonly open: (opening: Opening) => void;
	/** A picture of the filmed page, by its address, shown in the frame's place once it is decoded. */
	readonly show: (picture: string) => Promise<void>;
	/** One frame, drawn whole from each of its exposures' scenes, laid over one another so each weighs the same. */
	readonly apply: (exposures: readonly DrawnScene[]) => void;
}

declare global {
	interface Window {
		stage: StageApi;
	}
}

const JPEG_QUALITY = 92;
// A stage that draws one exposure of a frame at a time
export const ONE_AT_A_TIME = 1;
// A picture of the page as the stage's image is handed it: a JPEG, in base64
const JPEG_ADDRESS = 'data:image/jpeg;base64,';
const BASE64 = 'base64';

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

	/** A browser finds the point it clicks wrongly on a screen the camera has scaled; at no scale, every point is the page's own. */
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
		return capturedOf(this.page);
	}

	private async sizedTo(format: Format): Promise<void> {
		await this.page.setViewportSize(format.frame);
		await this.page.evaluate(setUpStage, roomOf(format, this.exposuresAtOnce));
	}
}

/**
 * The tab a static page stands in, as its pictures are taken: on livereel's own CDP session with it, at the screen's
 * size, a page's pixel taking so many of a picture's for a camera at a zoom of 1.
 */
export interface FilmedTab {
	readonly tab: Page;
	readonly session: CDPSession;
	readonly screen: Size;
	readonly pixelsAtZoomOne: number;
	readonly changes: ChangesHeard;
}

/**
 * The stage showing a picture of the filmed page, which stands in a tab of its own, drawing as many exposures of a
 * frame at once as it was set up to.
 */
export class PlaywrightPicturedStage implements PicturedStage {
	readonly kind = 'pictured';
	readonly page: Page;
	readonly filmedTab: FilmedTab;
	readonly watch: TabWatch;
	readonly exposuresAtOnce: number;
	// The page's picture last taken, none before the first
	private picture: Buffer | null = null;

	constructor(page: Page, filmedTab: FilmedTab, watch: TabWatch, exposuresAtOnce: number) {
		this.page = page;
		this.filmedTab = filmedTab;
		this.watch = watch;
		this.exposuresAtOnce = exposuresAtOnce;
	}

	draw(exposures: readonly DrawnScene[]): Promise<void> {
		return drawnOn(this.page, exposures);
	}

	/** The page's picture taken anew, and shown where it came out otherwise than the last. */
	async retakePage(zoom: number): Promise<boolean> {
		const picture = await this.pictureAt(zoom);
		const alike = this.picture?.equals(picture) ?? false;
		this.picture = picture;
		if (!alike) await this.page.evaluate(pictureShown, `${JPEG_ADDRESS}${picture.toString(BASE64)}`);
		return alike;
	}

	/**
	 * The page as its tab shows it once its fonts have loaded, as a JPEG as sharp as a camera at this zoom shows it, its
	 * text caret kept.
	 */
	private async pictureAt(zoom: number): Promise<Buffer> {
		const { tab, session, screen, pixelsAtZoomOne } = this.filmedTab;
		await tab.evaluate(fontsLoaded);
		const { cssVisualViewport } = await session.send('Page.getLayoutMetrics');
		// eslint-disable-next-line id-length -- CDP names the corner a picture is clipped at `x` and `y`
		const clip = { x: cssVisualViewport.pageX, y: cssVisualViewport.pageY, ...screen, scale: pixelsAtZoomOne * zoom };
		const { data } = await session.send('Page.captureScreenshot', { format: 'jpeg', quality: JPEG_QUALITY, clip });
		return Buffer.from(data, BASE64);
	}

	changedOfItself(): boolean {
		return this.filmedTab.changes.heardSinceAsked();
	}

	/** A page in a tab of its own takes no stage away and refuses no frame: it is gone only where it was not reached. */
	absence(): Promise<Error | undefined> {
		return Promise.resolve(this.watch.absence());
	}

	capture(): Promise<Uint8Array> {
		return capturedOf(this.page);
	}
}

/**
 * The room of a format, seen from where the engine works out what the camera shows (`src/domain/camera.ts`), for a
 * stage drawing so many exposures of a frame at once.
 */
export function roomOf(format: Format, exposures: number): Room {
	return { format, eyeDistance: eyeDistanceOf(format.frame), frameScale: frameScaleOf(format.frame), exposures };
}

function drawnOn(page: Page, exposures: readonly DrawnScene[]): Promise<void> {
	return page.evaluate(applyExposures, exposures);
}

/** A page as it shows now, as a JPEG at its device scale, its text caret kept. */
function capturedOf(page: Page): Promise<Buffer> {
	return page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY, caret: 'initial' });
}

// What follows runs in the stage page, each function handed over alone

/** The stage set to a room. */
export function setUpStage(room: Room): void {
	window.stage.setup(room);
}

/** The filmed page opened in the stage's frame. */
export function openPage(opening: Opening): void {
	window.stage.open(opening);
}

function pictureShown(picture: string): Promise<void> {
	return window.stage.show(picture);
}

function applyExposures(exposures: readonly DrawnScene[]): void {
	window.stage.apply(exposures);
}

// What follows runs in the filmed page's own tab, handed over alone

/** Once the page's fonts have loaded, or failed to. */
async function fontsLoaded(): Promise<void> {
	await document.fonts.ready;
}
