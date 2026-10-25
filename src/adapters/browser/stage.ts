/**
 * The stage page as the studio uses it: a frame drawn, the screen laid flat for an act and stood up again, a frame
 * captured. `StageApi` is what the stage's script, `stage/stage.js`, answers under `window.stage`.
 *
 * A frame is captured by Playwright at the page's device scale, the film's sharpness. A capture of livereel's own, on
 * a CDP session apart from Playwright's, came back at the page's own pixels whatever that scale, every full shoot as
 * soft as a draft; and it was no quicker (measured 2026-10-25 at 1920 × 1080: 33 ms against 35 ms at 1×, 142 ms
 * against 134 ms at 2×). The page's text caret is kept, as a person sees it typing.
 */
import type { Page } from 'playwright-core';
import type { Format } from '../../domain/geometry.ts';
import type { DrawnScene } from '../../scene.ts';
import type { Stage } from '../../studio/ports.ts';

export interface StageApi {
	/** The frame the stage fills, and the screen it lays the page out on. */
	readonly setup: (format: Format) => void;
	/** The filmed page opened in the screen's frame. */
	readonly open: (address: string) => void;
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

	constructor(page: Page, format: Format) {
		this.page = page;
		this.format = format;
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

	capture(): Promise<Uint8Array> {
		return this.page.screenshot({ type: 'jpeg', quality: JPEG_QUALITY, caret: 'initial' });
	}

	private async sizedTo(format: Format): Promise<void> {
		await this.page.setViewportSize(format.frame);
		await this.page.evaluate(setUpStage, format);
	}
}

// What follows runs in the stage page, each function handed over alone

/** The stage set to a format. */
export function setUpStage(format: Format): void {
	window.stage.setup(format);
}

/** The filmed page opened in the stage's frame. */
export function openPage(address: string): void {
	window.stage.open(address);
}

function applyScene(scene: DrawnScene): void {
	window.stage.apply(scene);
}
