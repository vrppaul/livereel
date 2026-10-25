/** The light: a block of the page lit, the light carried from block to block, and put out. */
import { FilmError } from '#domain/errors';
import { type Box, boxToward } from '#domain/geometry';
import {
	type Beginning,
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';
import { LIGHT_DIM, LIGHT_PAD, type Light } from './state.ts';

/** How hard the rest of the page is dimmed round the block lit. */
export interface LightScript extends TimingScript {
	readonly dim?: number;
}

// How far the light dims half-way from one block to another, so the page between them never shows bright
const DIP = 0.7;

/** A block lit as the step goes on, the rest dimmed. */
export class LightOn implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'light';
	readonly timing: Timing;
	readonly target: string;
	readonly dim: number;

	constructor(target: string, script: LightScript) {
		this.timing = timingOf(script);
		this.target = target;
		this.dim = script.dim ?? LIGHT_DIM;
	}

	async begin(beginning: Beginning): Promise<SceneChange> {
		const box = await beginning.page.box(this.target, 1);
		return new PropChange('light', new Rising(box, this.dim));
	}
}

/** The light carried from the block it is on to another. */
export class LightTo implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'light';
	readonly timing: Timing;
	readonly target: string;

	constructor(target: string, script: TimingScript) {
		this.timing = timingOf(script);
		this.target = target;
	}

	async begin(beginning: Beginning): Promise<SceneChange> {
		const light = beginning.scene.light;
		if (light === null) throw new FilmError(`the light is carried to ${this.target}, but none is on`);
		const end = await beginning.page.box(this.target, 1);
		return new PropChange('light', new Carried(light, end));
	}
}

/** The light put out, the page as bright again as it was. */
export class LightOff implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'light';
	readonly timing: Timing;

	constructor(script: TimingScript) {
		this.timing = timingOf(script);
	}

	begin(beginning: Beginning): Promise<SceneChange> {
		const light = beginning.scene.light;
		if (light === null) return Promise.reject(new FilmError('the light is put out, but none is on'));
		return Promise.resolve(new PropChange('light', new Fading(light)));
	}
}

class Rising implements PropMotion<Light> {
	readonly box: Box;
	readonly dim: number;

	constructor(box: Box, dim: number) {
		this.box = box;
		this.dim = dim;
	}

	next(progress: number): Light {
		return { box: this.box, strength: progress, dim: this.dim, pad: LIGHT_PAD };
	}
}

class Carried implements PropMotion<Light> {
	readonly start: Light;
	readonly end: Box;

	constructor(start: Light, end: Box) {
		this.start = start;
		this.end = end;
	}

	next(progress: number): Light {
		return {
			box: boxToward(this.start.box, this.end, progress),
			strength: 1 - DIP * Math.sin(Math.PI * progress),
			dim: this.start.dim,
			pad: this.start.pad
		};
	}
}

/** The light dimming out; at its end there is no light. */
class Fading implements PropMotion<Light | null> {
	readonly light: Light;

	constructor(light: Light) {
		this.light = light;
	}

	next(progress: number): Light | null {
		if (progress >= 1) return null;
		return { ...this.light, strength: 1 - progress };
	}
}

export function on(target: string, script: LightScript = {}): LightOn {
	return new LightOn(target, script);
}

export function to(target: string, script: TimingScript = {}): LightTo {
	return new LightTo(target, script);
}

export function off(script: TimingScript = {}): LightOff {
	return new LightOff(script);
}
