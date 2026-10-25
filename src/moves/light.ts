/** The light: a block of the page lit, the light carried from block to block, and put out. */
import { type Box, boxToward } from '../domain/geometry.ts';
import {
	type Beginning,
	type Change,
	type Move,
	type TimingScript,
	present,
	propChange,
	timingOf
} from '../direction/move.ts';
import { LIGHT_DIM, type Light } from '../props/light.ts';

/** How hard the rest of the page is dimmed round the block lit. */
export interface LightScript extends TimingScript {
	readonly dim?: number;
}

// How far the light dims half-way from one block to another, so the page between them never shows bright
const DIP = 0.7;

/** A block lit as the step goes on, the rest dimmed. */
export function on(target: string, script: LightScript = {}): Move {
	const dim = script.dim ?? LIGHT_DIM;
	return { part: 'light', timing: timingOf(script), begin: (beginning) => rising(beginning, target, dim) };
}

/** The light carried from the block it is on to another. */
export function to(target: string, script: TimingScript = {}): Move {
	return { part: 'light', timing: timingOf(script), begin: (beginning) => carried(beginning, target) };
}

/** The light put out, the page as bright again as it was; at its end there is no light. */
export function off(script: TimingScript = {}): Move {
	return { part: 'light', timing: timingOf(script), begin: fading };
}

async function rising(beginning: Beginning, target: string, dim: number): Promise<Change> {
	const box = await beginning.page.box(target, 1);
	return propChange('light', (progress) => ({ box, strength: progress, dim }));
}

async function carried(beginning: Beginning, target: string): Promise<Change> {
	const start = present(beginning, 'light', `the light is carried to ${target}, but none is on`);
	const end = await beginning.page.box(target, 1);
	return propChange('light', (progress) => carriedAt(start, end, progress));
}

function fading(beginning: Beginning): Change {
	const light = present(beginning, 'light', 'the light is put out, but none is on');
	return propChange('light', (progress) => fadedAt(light, progress));
}

function carriedAt(start: Light, end: Box, progress: number): Light {
	return { box: boxToward(start.box, end, progress), strength: 1 - DIP * Math.sin(Math.PI * progress), dim: start.dim };
}

function fadedAt(light: Light, progress: number): Light | null {
	if (progress >= 1) return null;
	return { ...light, strength: 1 - progress };
}
