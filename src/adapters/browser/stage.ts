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
 * as it was, and an act is done in the page's own tab, at no scale. The picture is taken sharper than the frame by as
 * far as a camera comes in where a film names no bound (`ZOOM_AT_MOST`), so text the camera comes close to stays as
 * crisp as the live frame shows it: the README film's close shots at 4× against the live frame, SSIM 0.990–0.992,
 * alike to the eye at twice their size (2026-10-30).
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
import type { Frame, Page } from 'playwright-core';
import { eyeDistanceOf } from '../../domain/camera.ts';
import type { Format } from '../../domain/format.ts';
import { frameScaleOf } from '../../domain/geometry.ts';
import type { DrawnScene } from '../../scene.ts';
import type { FramedStage, PicturedStage } from '../../studio/ports.ts';
import type { FrameWatch, TabWatch } from './watch.ts';

// The package's stage, as far from this module in the source as in the package built from it, and its page
export const STAGE_FOLDER = new URL('../../../stage/', import.meta.url);
export const STAGE_PAGE = 'stage.html';

/**
 * The room the stage moves the screen in: the frame it fills, the screen, how far the eye stands from the frame, and
 * how large the stage draws on it against the frames its look was made on: the camera's zoom, and what stands over the
 * frame.
 */
export interface Room {
	readonly format: Format;
	readonly eyeDistance: number;
	readonly frameScale: number;
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
	/** One frame, drawn whole from the scene. */
	readonly apply: (scene: DrawnScene) => void;
}

declare global {
	interface Window {
		stage: StageApi;
	}
}

const JPEG_QUALITY = 92;
// A picture of the page as the stage's image is handed it: a JPEG, in base64
const JPEG_ADDRESS = 'data:image/jpeg;base64,';
const BASE64 = 'base64';

/** The stage with the filmed page live in its frame. */
export class PlaywrightFramedStage implements FramedStage {
	readonly kind = 'framed';
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

	draw(scene: DrawnScene): Promise<void> {
		return drawnOn(this.page, scene);
	}

	/** A browser finds the point it clicks wrongly on a screen the camera has scaled; at no scale, every point is the page's own. */
	async layFlat(scene: DrawnScene): Promise<void> {
		await this.sizedTo({ frame: this.format.screen, screen: this.format.screen });
		await this.draw(scene);
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
		await this.page.evaluate(setUpStage, roomOf(format));
	}
}

/** The stage showing a picture of the filmed page, which stands in a tab of its own. */
export class PlaywrightPicturedStage implements PicturedStage {
	readonly kind = 'pictured';
	readonly page: Page;
	readonly filmedTab: Page;
	readonly watch: TabWatch;
	// The page's picture last taken, none before the first
	private picture: Buffer | null = null;

	constructor(page: Page, filmedTab: Page, watch: TabWatch) {
		this.page = page;
		this.filmedTab = filmedTab;
		this.watch = watch;
	}

	draw(scene: DrawnScene): Promise<void> {
		return drawnOn(this.page, scene);
	}

	/** The page's picture taken anew, and shown where it came out otherwise than the last. */
	async retakePage(): Promise<boolean> {
		const picture = await capturedOf(this.filmedTab);
		const alike = this.picture?.equals(picture) ?? false;
		this.picture = picture;
		if (!alike) await this.page.evaluate(pictureShown, `${JPEG_ADDRESS}${picture.toString(BASE64)}`);
		return alike;
	}

	/** A page in a tab of its own takes no stage away and refuses no frame: it is gone only where it was not reached. */
	absence(): Promise<Error | undefined> {
		return Promise.resolve(this.watch.absence());
	}

	capture(): Promise<Uint8Array> {
		return capturedOf(this.page);
	}
}

/** The room of a format, seen from where the engine works out what the camera shows (`src/domain/camera.ts`). */
export function roomOf(format: Format): Room {
	return { format, eyeDistance: eyeDistanceOf(format.frame), frameScale: frameScaleOf(format.frame) };
}

function drawnOn(page: Page, scene: DrawnScene): Promise<void> {
	return page.evaluate(applyScene, scene);
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

function applyScene(scene: DrawnScene): void {
	window.stage.apply(scene);
}
