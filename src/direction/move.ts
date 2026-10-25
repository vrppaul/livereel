/**
 * A move: one prop of the scene, or the page, changing over a share of a step, and the sounds it makes on its way.
 *
 * A move reads what it starts from once, as its share begins, and becomes a change that knows its start and its end;
 * from then on what it sets at any progress is worked out from those and the progress alone, so a frame is the same
 * whenever it is shot. A move that finds nothing to start from — no light to carry, no block on the page — throws as
 * it begins, once. A move is a plain object made by a function of its prop's module (`src/moves/`).
 */
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/geometry.ts';
import type { Ease } from '../domain/time.ts';
import { type PropName, type PropStates, type Scene, withProp } from '../scene.ts';
import type { FilmedPage } from './page.ts';
import type { Cue } from './sound.ts';

/**
 * What a move changes: one prop of the scene, or the page itself; none, for a move that only makes a sound. Two moves
 * of one part never run at once.
 */
type Part = PropName | 'page' | null;

const NO_SOUNDS: readonly Cue[] = [];

/** Where a share of a step starts and ends, each a share of the step from 0 to 1; either may be left to its edge. */
export interface Bounds {
	readonly start?: number;
	readonly end?: number;
}

/** The part of its step a move takes: from `start` to `end`, each a share of the step. */
export class Share {
	readonly start: number;
	readonly end: number;

	private constructor(start: number, end: number) {
		this.start = start;
		this.end = end;
	}

	/** The share between these bounds; one that takes no time, or reaches past its step, is refused. */
	static of(bounds: Bounds = {}): Share {
		const start = bounds.start ?? 0;
		const end = bounds.end ?? 1;
		if (!(start >= 0 && end <= 1 && start < end)) {
			throw new FilmError(`a move's share runs from ${start} to ${end} of its step: it must start before it ends`);
		}
		return new Share(start, end);
	}

	/** How far along the move is when its step is `progress` along: none before its start, all after its end. */
	along(progress: number): number {
		return Math.min(1, Math.max(0, (progress - this.start) / (this.end - this.start)));
	}

	/** Whether two shares are taken at once at some moment; one that ends as the other starts is not. */
	overlaps(other: Share): boolean {
		return this.start < other.end && other.start < this.end;
	}
}

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

/** What a move reads as its share begins. */
export interface Beginning {
	readonly scene: Scene;
	readonly page: FilmedPage;
	readonly format: Format;
}

/**
 * A begun move, `progress` of the way along, eased: the scene with its prop set. A move of the page sets the page's
 * own scroll or keys as it goes, and hands the scene back as it was.
 */
export type Change = (scene: Scene, progress: number) => Scene | Promise<Scene>;

export interface Move {
	readonly part: Part;
	readonly timing: Timing;
	/** The sounds the move makes on its way; a move that makes none has none. */
	readonly sounds?: readonly Cue[];
	readonly begin: (beginning: Beginning) => Change | Promise<Change>;
}

export function timingOf(script: TimingScript): Timing {
	return { within: Share.of(script.within), ease: script.ease ?? null };
}

/** The sounds a move makes on its way: none, for a move that names none. */
export function soundsOf(move: Move): readonly Cue[] {
	return move.sounds ?? NO_SOUNDS;
}

/** The change of one prop: its state at each progress, written into the scene. */
export function propChange<Name extends PropName>(name: Name, stateAt: (progress: number) => PropStates[Name]): Change {
	return (scene, progress) => withProp(scene, name, stateAt(progress));
}

/** A prop that goes: as it stands while its move goes on, and none once the move ends. */
export function untilTheEnd<State>(progress: number, state: State): State | null {
	return progress >= 1 ? null : state;
}

/** A prop as a move finds it as it begins; one not on the scene is refused, in the move's own words. */
export function present<Name extends PropName>(
	beginning: Beginning,
	name: Name,
	refusal: string
): NonNullable<PropStates[Name]> {
	return beginning.scene[name] ?? refused(refusal);
}

function refused(refusal: string): never {
	throw new FilmError(refusal);
}
