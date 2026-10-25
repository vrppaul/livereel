/**
 * A move: one prop of the scene, or the page, changing over a share of a step.
 *
 * A move reads what it starts from once, as its share begins, and becomes a change that knows its start and its end;
 * from then on its prop at any progress is worked out from those and the progress alone, so a frame is the same
 * whenever it is shot and nothing is missing "until begun". A prop absent where a move needs it is refused as the
 * move begins, once.
 */
import type { Format } from '#domain/geometry';
import { type Bounds, type Ease, Share } from '#domain/time';
import { type PropName, type PropStates, type Scene, withProp } from '#scene';
import type { PageDriver, PageReader } from './page.ts';

/** The share of its step a move takes, and its own curve where it does not take its step's. */
export interface Timing {
	readonly within: Share;
	readonly ease: Ease | null;
}

/** How a film writes a move's timing, every part of it optional. */
export interface TimingScript {
	readonly within?: Bounds;
	readonly ease?: Ease;
}

/** What a scene move reads as its share begins. */
export interface Beginning {
	readonly scene: Scene;
	readonly page: PageReader;
	readonly format: Format;
}

/** A begun scene move: the scene with its prop set, `progress` of the way along, eased. */
export interface SceneChange {
	readonly at: (scene: Scene, progress: number) => Scene;
}

export interface SceneMove {
	readonly kind: 'scene';
	readonly prop: PropName;
	readonly timing: Timing;
	readonly begin: (beginning: Beginning) => Promise<SceneChange>;
}

/** A prop's state at any progress, from what its move read and the progress alone. */
export interface PropMotion<State> {
	readonly next: (progress: number) => State;
}

/** A begun page move: the page's own scroll or keys set, `progress` of the way along. */
export interface PageMotion {
	readonly at: (page: PageDriver, progress: number) => Promise<void>;
}

export interface PageMove {
	readonly kind: 'page';
	readonly timing: Timing;
	readonly begin: (page: PageReader) => Promise<PageMotion>;
}

export type Move = SceneMove | PageMove;

/** The change of one prop: its motion's state written into the scene. */
export class PropChange<Name extends PropName> implements SceneChange {
	readonly name: Name;
	readonly motion: PropMotion<PropStates[Name]>;

	constructor(name: Name, motion: PropMotion<PropStates[Name]>) {
		this.name = name;
		this.motion = motion;
	}

	at(scene: Scene, progress: number): Scene {
		return withProp(scene, this.name, this.motion.next(progress));
	}
}

export function timingOf(script: TimingScript): Timing {
	return { within: Share.of(script.within), ease: script.ease ?? null };
}
