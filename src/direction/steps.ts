/**
 * The steps a film is a list of: so many seconds of frames, a cut, or something done to the page between frames.
 *
 * A film reads as a script: `play` for what moves, `cut` for what changes at once, `act` for what the page really
 * does — a click, a reply from its server — which takes no time in the film however long the browser takes. Steps
 * are data; the studio runs them. Two moves of one part may share a step only one after the other: a step that has
 * both at once is refused as it is written, before anything is shot.
 */
import { FilmError } from '../domain/errors.ts';
import { type Ease, easeInOutSine, framesOf, linear } from '../domain/time.ts';
import { type Keystroke, typingSeconds } from '../domain/typing.ts';
import type { PropName } from '../scene.ts';
import { type Move, type Share, soundsOf } from './move.ts';
import type { ActContext } from './page.ts';
import type { Sound } from './sound.ts';

export interface Play {
	readonly kind: 'play';
	readonly seconds: number;
	readonly moves: readonly Move[];
	readonly ease: Ease;
}

/** Moves made at once, between two frames: each set at its end as soon as it begins. */
export interface Cut {
	readonly kind: 'cut';
	readonly moves: readonly Move[];
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

/** The part of the scene a move changes, never none, and the share of its step it changes it over. */
interface PartTaken {
	readonly part: PropName | 'page';
	readonly within: Share;
}

// A beat after the last key, before the next step
const AFTER_TYPING_SECONDS = 0.12;

/** So many seconds of frames, every move eased along them, each over its own share of the step. */
export function play(script: PlayScript): Play {
	if (!(script.seconds > 0 && Number.isFinite(script.seconds))) {
		throw new FilmError(`a step of ${script.seconds} s cannot be shot: it lasts some seconds, more than none`);
	}
	const moves = script.moves ?? [];
	refuseClashes(moves);
	return { kind: 'play', seconds: script.seconds, moves, ease: script.ease ?? easeInOutSine };
}

/** So many seconds of frames with nothing moving. */
export function hold(script: { readonly seconds: number }): Play {
	return play({ seconds: script.seconds });
}

/** The scene changed at once, between two frames: a cursor gone, a terminal opened, the camera elsewhere. */
export function cut(...moves: readonly Move[]): Cut {
	refuseClashes(moves);
	return { kind: 'cut', moves };
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

/** Every sound the steps' moves make, known before anything is shot, so a file that is not there is refused at once. */
export function soundsIn(steps: readonly Step[]): readonly Sound[] {
	return steps
		.flatMap(movesOf)
		.flatMap(soundsOf)
		.map((cue) => cue.sound);
}

function movesOf(step: Step): readonly Move[] {
	switch (step.kind) {
		case 'play':
		case 'cut':
			return step.moves;
		case 'act':
			return [];
	}
}

/** Two moves of one part at once in one step, refused by naming the part. */
function refuseClashes(moves: readonly Move[]): void {
	const taken = moves.flatMap(partTaken);
	const clash = taken.find((part, place) => taken.slice(place + 1).some((later) => clashes(part, later)));
	if (clash !== undefined) throw new FilmError(`two moves on the ${clash.part} at once in one step`);
}

/** The part a move changes, and the share of its step it takes; a move that only makes a sound takes none. */
function partTaken(move: Move): PartTaken[] {
	return move.part === null ? [] : [{ part: move.part, within: move.timing.within }];
}

function clashes(taken: PartTaken, other: PartTaken): boolean {
	return taken.part === other.part && taken.within.overlaps(other.within);
}
