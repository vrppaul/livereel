/**
 * The stage page as the studio uses it: a frame drawn, the screen laid flat for an act and stood up again, a frame
 * captured. `StageApi` is what the stage's script, `stage/stage.js`, answers under `window.stage`.
 *
 * A frame is captured straight from Chrome: Playwright's own screenshot waits on the page and restyles it round every
 * shot, which made a frame three times as slow (350 ms against 110 ms, measured in livereel's Python version).
 */
import type { CDPSession, Page } from 'playwright-core';
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
const SCREENSHOT = 'Page.captureScreenshot';
const BASE_64 = 'base64';

export class BrowserStage implements Stage {
	readonly page: Page;
	readonly chrome: CDPSession;
	readonly format: Format;

	constructor(page: Page, chrome: CDPSession, format: Format) {
		this.page = page;
		this.chrome = chrome;
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

	async capture(): Promise<Uint8Array> {
		const shot = await this.chrome.send(SCREENSHOT, { format: 'jpeg', quality: JPEG_QUALITY, optimizeForSpeed: true });
		return Buffer.from(shot.data, BASE_64);
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
