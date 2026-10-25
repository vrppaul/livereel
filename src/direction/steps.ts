/**
 * The steps a film is a list of: so many seconds of frames, a cut, or something done to the page between frames.
 *
 * A film reads as a script: `play` for what moves, `cut` for what changes at once, `act` for what the page really
 * does — a click, a reply from its server — which takes no time in the film however long the browser takes. Steps
 * are data; the studio runs them. Two moves of one prop may share a step only one after the other: a step that has
 * both at once is refused as it is written, before anything is shot.
 */
import { type Ease, easeInOutSine, framesOf, linear } from '#domain/time';
import { FilmError } from '#domain/errors';
import { type Keystroke, typingSeconds } from '#domain/typing';
import type { Scene } from '#scene';
import type { Move, SceneMove } from './move.ts';
import type { ActContext } from './page.ts';

export interface Play {
	readonly kind: 'play';
	readonly seconds: number;
	readonly moves: readonly Move[];
	readonly ease: Ease;
}

export interface Cut {
	readonly kind: 'cut';
	readonly change: (scene: Scene) => Scene;
}

export interface Act {
	readonly kind: 'act';
	readonly action: (context: ActContext) => Promise<void>;
}

export type Step = Play | Cut | Act;

/** How a film writes a play: its seconds, its moves, and the curve its moves take where they name none. */
export interface PlayScript {
	readonly seconds: number;
	readonly moves?: readonly Move[];
	readonly ease?: Ease;
}

/** A move a person types with: how its keys come. */
export interface Typed {
	readonly strokes: readonly Keystroke[];
}

// A beat after the last key, before the next step
const AFTER_TYPING_SECONDS = 0.12;

/** So many seconds of frames, every move eased along them, each over its own share of the step. */
export function play(script: PlayScript): Play {
	const moves = script.moves ?? [];
	if (!(script.seconds > 0 && Number.isFinite(script.seconds))) {
		throw new FilmError(`a step of ${script.seconds} s cannot be shot: it lasts some seconds, more than none`);
	}
	const sceneMoves = moves.filter((move) => move.kind === 'scene');
	const clash = sceneMoves.find((move, place) => sceneMoves.slice(place + 1).some((later) => clashes(move, later)));
	if (clash !== undefined) throw new FilmError(`two moves on the ${clash.prop} at once in one step`);
	return { kind: 'play', seconds: script.seconds, moves, ease: script.ease ?? easeInOutSine };
}

/** So many seconds of frames with nothing moving. */
export function hold(script: { readonly seconds: number }): Play {
	return play({ seconds: script.seconds });
}

/** The scene changed at once, between two frames. */
export function cut(change: (scene: Scene) => Scene): Cut {
	return { kind: 'cut', change };
}

/** Something done to the page between two frames, to the page as it stands, the camera put aside. */
export function act(action: (context: ActContext) => Promise<void>): Act {
	return { kind: 'act', action };
}

/** As long as the person takes to type, and a beat after the last key. */
export function typing(move: Move & Typed): readonly Step[] {
	return [
		play({ seconds: typingSeconds(move.strokes), moves: [move], ease: linear }),
		hold({ seconds: AFTER_TYPING_SECONDS })
	];
}

/** How many frames the steps take: the film's length, known before anything is shot. */
export function framesIn(steps: readonly Step[]): number {
	return steps.reduce((frames, step) => frames + (step.kind === 'play' ? framesOf(step.seconds) : 0), 0);
}

function clashes(move: SceneMove, other: SceneMove): boolean {
	return move.prop === other.prop && move.timing.within.overlaps(other.timing.within);
}
