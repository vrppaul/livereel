/**
 * The stage page as the studio uses it: a frame drawn, the screen laid flat for an act and stood up again, a frame
 * captured. `StageApi` is what the stage's script, `stage/stage.js`, answers under `window.stage`.
 *
 * A frame is captured by Playwright at the page's device scale, the film's sharpness. A capture of livereel's own, on
 * a CDP session apart from Playwright's, came back at the page's own pixels whatever that scale, every full shoot as
 * soft as a draft; and it was no quicker (measured 2026-10-25 at 1920 × 1080: 33 ms against 35 ms at 1×, 142 ms
 * against 134 ms at 2×). The page's text caret is kept, as a person sees it typing. Whether the stage and its page
 * are still there, the stage answers from its frame's watch (`watch.ts`).
 */
import type { Frame, Page } from 'playwright-core';
import { eyeDistanceOf } from '../../domain/camera.ts';
import { type Format, frameScaleOf } from '../../domain/geometry.ts';
import type { DrawnScene } from '../../scene.ts';
import type { Stage } from '../../studio/ports.ts';
import type { FrameWatch } from './watch.ts';

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
	/** One frame, drawn whole from the scene. */
	readonly apply: (scene: DrawnScene) => void;
}

declare global {
	interface Window {
		stage: StageApi;
	}
}

const JPEG_QUALITY = 92;

export class BrowserStage implements Stage {
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
		return this.page.evaluate(applyScene, scene);
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
		return this.page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY, caret: 'initial' });
	}

	private async sizedTo(format: Format): Promise<void> {
		await this.page.setViewportSize(format.frame);
		await this.page.evaluate(setUpStage, roomOf(format));
	}
}

/** The room of a format, seen from where the engine works out what the camera shows (`src/domain/camera.ts`). */
export function roomOf(format: Format): Room {
	return { format, eyeDistance: eyeDistanceOf(format.frame), frameScale: frameScaleOf(format.frame) };
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

function applyScene(scene: DrawnScene): void {
	window.stage.apply(scene);
}
