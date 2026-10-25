/**
 * What the stage page answers to, under `window.stage`: the browser adapter calls it, the stage's script provides it.
 */
import type { Format } from '#domain/geometry';
import type { DrawnScene } from '#scene';

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
