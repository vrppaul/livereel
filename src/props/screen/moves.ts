/** The screen coming up out of the ground. */
import { type Scene, withProp } from '#scene';
import {
	PropChange,
	type PropMotion,
	type SceneChange,
	type SceneMove,
	type Timing,
	type TimingScript,
	timingOf
} from '#direction/move';
import type { Screen } from './state.ts';

export class ScreenRises implements SceneMove {
	readonly kind = 'scene';
	readonly prop = 'screen';
	readonly timing: Timing;

	constructor(script: TimingScript) {
		this.timing = timingOf(script);
	}

	begin(): Promise<SceneChange> {
		return Promise.resolve(new PropChange('screen', new Rising()));
	}
}

class Rising implements PropMotion<Screen> {
	next(progress: number): Screen {
		return { shown: progress };
	}
}

export function rise(script: TimingScript = {}): ScreenRises {
	return new ScreenRises(script);
}

/** The screen down in the ground, to come up later: a film may open on the ground alone. */
export function lowered(scene: Scene): Scene {
	return withProp(scene, 'screen', { shown: 0 });
}
