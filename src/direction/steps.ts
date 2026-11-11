/**
 * The steps a film is a list of: so many seconds of frames, or a cut.
 *
 * A film reads as a script: `play` for what moves, `cut` for what changes at once; what the page really does — a
 * click, a reply from its server — is a move of the page, `page.act`, in a play or a cut (`act` in `src/moves/act.ts`
 * is a cut of one), and takes no time in the film however long the browser takes. Steps are data; the studio runs
 * them. Two moves of one part may share a step only one after the other, or at once where each sets values of it the
 * other does not, as two moves of the look may: a step that has both on one value at once is refused as it is
 * written, before anything is shot. So is an act on the page at the moment a move that holds the page's picture
 * begins, which the act, done first, would be in.
 */
import { FilmError } from '../domain/errors.ts';
import {
	type Form,
	type Kind,
	Literal,
	OfForm,
	Plain,
	SOME_SECONDS,
	assertKind,
	assertWritten,
	described,
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import type { PlaceNamed } from '../domain/place.ts';
import type { DepthNamed } from '../domain/stance.ts';
import { A_CURVE, type Ease, easeInOutSine, linear } from '../domain/curves.ts';
import { framesOf } from '../domain/time.ts';
import { A_STROKES, type Keystroke, typingSeconds } from '../domain/typing.ts';
import type { CssNamed } from './theme.ts';
import type { OwnPage } from './page.ts';
import {
	A_MOVE,
	A_MOVES,
	type Move,
	type Part,
	type Share,
	cssOf,
	depthsOf,
	movesThePage,
	ownPagesOf,
	picturesOf,
	placesOf,
	soundsOf
} from './move.ts';
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

export type Step = Play | Cut;

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

/** How long a step holds still. */
interface HoldScript {
	readonly seconds: number;
}

/**
 * The part of the scene a move changes, never none, the names of the values of it the move sets where it sets only
 * some, and the share of its step it changes them over.
 */
interface PartTaken {
	readonly part: NonNullable<Part>;
	readonly valueNames: readonly string[] | undefined;
	readonly within: Share;
}

// A beat after the last key, before the next step
const AFTER_TYPING_SECONDS = 0.12;
const PLAY_FORM: Form<PlayScript> = { seconds: needed(SOME_SECONDS), moves: A_MOVES, ease: A_CURVE };
const HOLD_FORM: Form<HoldScript> = { seconds: needed(SOME_SECONDS) };
// A step a film may write out by hand, as the types allow, each kind of step to its form
const STEP_FORMS: { readonly [Name in Step['kind']]: Kind<Extract<Step, { kind: Name }>> } = {
	play: new OfForm<Play>(
		{ kind: needed(new Literal('play')), seconds: needed(SOME_SECONDS), moves: needed(A_MOVES), ease: needed(A_CURVE) },
		'a play'
	),
	cut: new OfForm<Cut>({ kind: needed(new Literal('cut')), moves: needed(A_MOVES) }, 'a cut')
};
const A_STEP_SAID = 'a step, as play, hold, cut or act makes one';
const A_TYPED_MOVE = new Plain(isTypedMove, 'a move that types, as terminal.type or page.type makes one');
// What a step says of an act at the moment a move that holds the page's picture begins
const ACT_IN_A_HOLD =
	"an act on the page at the moment a move that holds the page's picture begins, as screen.sweep or piece.show({ picture: 'held' }), is done first, and the picture would hold the page as the act leaves it: put the act a moment after, within: { start }";
const UNSPREAD = 'spread the steps cursor.click and typing give among the others, as ...cursor.click(action)';

/** So many seconds of frames, every move eased along them, each over its own share of the step. */
export function play(script: PlayScript): Play {
	assertWritten(script, PLAY_FORM, 'play');
	const moves = script.moves ?? [];
	refuseTogether(moves);
	return { kind: 'play', seconds: script.seconds, moves, ease: script.ease ?? easeInOutSine };
}

/** So many seconds of frames with nothing moving. */
export function hold(script: HoldScript): Play {
	assertWritten(script, HOLD_FORM, 'hold');
	return play({ seconds: script.seconds });
}

/** The scene changed at once, between two frames: a cursor gone, a terminal opened, the camera elsewhere. */
export function cut(...moves: readonly Move[]): Cut {
	assertKind(moves, A_MOVES, "cut's moves");
	refuseTogether(moves);
	return { kind: 'cut', moves };
}

/** As long as the person takes to type, and a beat after the last key. */
export function typing(move: Move & Typed): readonly Step[] {
	assertKind(move, A_TYPED_MOVE, "typing's move");
	return [
		play({ seconds: typingSeconds(move.strokes), moves: [move], ease: linear }),
		hold({ seconds: AFTER_TYPING_SECONDS })
	];
}

/** How many frames the steps take at the film's rate: the film's length, known before anything is shot. */
export function framesIn(steps: readonly Step[], framesPerSecond: number): number {
	return steps.reduce(
		(frames, step) => frames + (step.kind === 'play' ? framesOf(step.seconds, framesPerSecond) : 0),
		0
	);
}

/** Every sound the steps' moves make, known before anything is shot, so a file that is not there is refused at once. */
export function soundsIn(steps: readonly Step[]): readonly Sound[] {
	return steps
		.flatMap((step) => step.moves)
		.flatMap(soundsOf)
		.map((cue) => cue.sound);
}

/** All the steps' moves write in CSS, known before anything is shot, so a value CSS cannot read is refused at once. */
export function cssIn(steps: readonly Step[]): readonly CssNamed[] {
	return steps.flatMap((step) => step.moves).flatMap(cssOf);
}

/**
 * Every page of the film's own the steps' moves show, each once, in the order they are first named, drawn past its
 * screen where any move draws it so, known before anything is shot, so the stage lays each out before the first frame.
 */
export function ownPagesIn(steps: readonly Step[]): readonly OwnPage[] {
	const pages = new Map<string, OwnPage>();
	for (const page of steps.flatMap((step) => step.moves).flatMap(ownPagesOf)) {
		const named = pages.get(page.key);
		pages.set(page.key, named === undefined ? page : { ...named, drawnPast: named.drawnPast || page.drawnPast });
	}
	return [...pages.values()];
}

/**
 * Every picture of the film's own the steps' moves show, each file once, in the order they are first named, known
 * before anything is shot, so a file that is not there is refused at once and the stage lays each before the first
 * frame.
 */
export function picturesIn(steps: readonly Step[]): readonly string[] {
	return [...new Set(steps.flatMap((step) => step.moves).flatMap(picturesOf))];
}

/** Every place the steps' moves name, known before anything is shot, so one the format has not is refused at once. */
export function placesIn(steps: readonly Step[]): readonly PlaceNamed[] {
	return steps.flatMap((step) => step.moves).flatMap(placesOf);
}

/**
 * Every depth the steps' moves bring something to, known before anything is shot, so one the film's eye never sees is
 * refused at once.
 */
export function depthsIn(steps: readonly Step[]): readonly DepthNamed[] {
	return steps.flatMap((step) => step.moves).flatMap(depthsOf);
}

/** Moves refused together in one step: two on one part at once, and an act at the moment one holds the page begins. */
function refuseTogether(moves: readonly Move[]): void {
	refuseClashes(moves);
	refuseActsAsAHoldBegins(moves);
}

/**
 * An act on the page at the moment a move that holds the page's picture begins, refused: the take does what is done
 * at a moment before what begins then, so the picture would hold the page as the act leaves it.
 */
function refuseActsAsAHoldBegins(moves: readonly Move[]): void {
	const holdsBegin = moves.filter((move) => move.holdsThePage === true).map((move) => move.timing.within.start);
	if (moves.some((move) => isAnAct(move) && holdsBegin.includes(move.timing.within.start))) {
		throw new FilmError(ACT_IN_A_HOLD);
	}
}

/** Whether a move acts on the page: one of the page done at a moment. */
function isAnAct(move: Move): boolean {
	return movesThePage(move) && move.timing.within.start === move.timing.within.end;
}

/** Two moves of one part at once in one step, refused by naming the part, or the value of it both set. */
function refuseClashes(moves: readonly Move[]): void {
	const taken = moves.flatMap(partTaken);
	const clash = taken
		.flatMap((part, place) => taken.slice(place + 1).map((later) => clashOf(part, later)))
		.find(isClash);
	if (clash !== undefined) throw new FilmError(`two moves on the ${clash} at once in one step`);
}

/** The part a move changes, and the share of its step it takes; a move that only makes a sound takes none. */
function partTaken(move: Move): PartTaken[] {
	return move.part === null ? [] : [{ part: move.part, valueNames: move.valueNames, within: move.timing.within }];
}

/**
 * What two moves change at once, as a refusal names it: their part, or a value of it both set where each sets only
 * some; none where they change nothing at once.
 */
function clashOf(taken: PartTaken, other: PartTaken): string | undefined {
	if (taken.part !== other.part || !taken.within.overlaps(other.within)) return undefined;
	const otherNames = other.valueNames;
	if (taken.valueNames === undefined || otherNames === undefined) return taken.part;
	const shared = taken.valueNames.find((name) => otherNames.includes(name));
	return shared === undefined ? undefined : `${taken.part}'s ${shared}`;
}

/** Whether two moves changed something at once: what they clashed on is named. */
function isClash(clash: string | undefined): clash is string {
	return clash !== undefined;
}

/**
 * The steps a film's `steps` gives, read as a film whose types nobody checked may hand them: a list of steps. The
 * steps of a click or a typing left in a list of their own, not spread among the others, are refused with how to
 * spread them; anything else that is no step, by its place.
 */
export function stepsOf(written: unknown): readonly Step[] {
	if (!Array.isArray(written)) {
		throw new FilmError(`the film's steps are ${described(written)}: they are a list of steps`);
	}
	return written.map(stepOf);
}

/**
 * One of the steps a film gives: a list there is a click or a typing not spread; a step of a kind livereel has is held
 * to that kind's form, and its moves to the rule `play` and `cut` hold them to, written by hand as the types allow.
 */
function stepOf(written: unknown, place: number): Step {
	const at = `the film's steps[${place}]`;
	if (Array.isArray(written)) throw new FilmError(`${at} is a list: ${UNSPREAD}`);
	if (!isObjectOfValues(written) || !isStepKind(written.kind)) {
		throw new FilmError(`${at} is ${described(written)}: it is ${A_STEP_SAID}`);
	}
	const form: Kind<Step> = STEP_FORMS[written.kind];
	assertKind(written, form, at);
	refuseTogether(written.moves);
	return written;
}

function isStepKind(written: unknown): written is Step['kind'] {
	return typeof written === 'string' && Object.hasOwn(STEP_FORMS, written);
}

function isTypedMove(written: unknown): written is Move & Typed {
	return A_MOVE.is(written) && isObjectOfValues(written) && A_STROKES.is(written.strokes);
}
