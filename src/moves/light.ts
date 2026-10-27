/** The light: a block of the page lit, the light carried from block to block, and put out. */
import { type Box, boxToward } from '../domain/geometry.ts';
import { A_NUMBER, A_SELECTOR, type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	present,
	propChange,
	shownBox,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { LIGHT_DIM, type Light } from '../props/light.ts';

/** How hard the rest of the page is dimmed round the block lit. */
export interface LightScript extends TimingScript {
	readonly dim?: number;
}

// How far the light dims half-way from one block to another, so the page between them never shows bright
const DIP = 0.7;
const LIGHT_FORM: Form<LightScript> = { dim: A_NUMBER, ...TIMING_FORM };

/** A block lit as the step goes on, the rest dimmed. */
export function on(target: string, script: LightScript = {}): Move {
	assertKind(target, A_SELECTOR, "light.on's selector");
	assertWritten(script, LIGHT_FORM, 'light.on');
	const dim = script.dim ?? LIGHT_DIM;
	return { part: 'light', timing: timingOf(script), begin: (beginning) => rising(beginning, target, dim) };
}

/** The light carried from the block it is on to another. */
export function to(target: string, script: TimingScript = {}): Move {
	assertKind(target, A_SELECTOR, "light.to's selector");
	assertWritten(script, TIMING_FORM, 'light.to');
	return { part: 'light', timing: timingOf(script), begin: (beginning) => carried(beginning, target) };
}

/** The light put out, the page as bright again as it was; at its end there is no light. */
export function off(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'light.off');
	return { part: 'light', timing: timingOf(script), begin: fading };
}

async function rising(beginning: Beginning, target: string, dim: number): Promise<Change> {
	const box = await shownBox(beginning, target, 1, 'light.on');
	return propChange('light', (progress) => ({ box, strength: progress, dim }));
}

async function carried(beginning: Beginning, target: string): Promise<Change> {
	const start = present(beginning, 'light', `the light is carried to ${target}, but none is on`);
	const end = await shownBox(beginning, target, 1, 'light.to');
	return propChange('light', (progress) => carriedAt(start, end, progress));
}

function fading(beginning: Beginning): Change {
	const light = present(beginning, 'light', 'the light is put out, but none is on');
	return propChange('light', (progress) => untilTheEnd(progress, { ...light, strength: 1 - progress }));
}

function carriedAt(start: Light, end: Box, progress: number): Light {
	return { box: boxToward(start.box, end, progress), strength: 1 - DIP * Math.sin(Math.PI * progress), dim: start.dim };
}
