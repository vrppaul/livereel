/**
 * The stage's script: it draws the scene it is handed, a frame at a time, and decides nothing.
 *
 * Every number and every word comes from the film, worked out there; nothing here keeps time, so a frame is the
 * same whenever it is shot. It answers the browser adapter under `window.stage` (`./contract.ts`).
 */
import './tokens.css';
import './stage.css';
import type { Format } from '#domain/geometry';
import type { DrawnScene } from '#scene';
import type { StageApi } from './contract.ts';
import { drawEvery, drawersOn } from './drawers.ts';
import { partOf } from './drawer.ts';

const drawers = drawersOn(document);
const page = partOf(document.body, 'page');

function setUp(format: Format): void {
	const root = document.documentElement.style;
	root.setProperty('--frame-width', `${format.frame.width}px`);
	root.setProperty('--frame-height', `${format.frame.height}px`);
	root.setProperty('--screen-width', `${format.screen.width}px`);
	root.setProperty('--screen-height', `${format.screen.height}px`);
}

function open(address: string): void {
	page.setAttribute('src', address);
}

function apply(scene: DrawnScene): void {
	drawEvery(drawers, scene);
}

const STAGE: StageApi = { setup: setUp, open, apply };
window.stage = STAGE;
