/**
 * A move: one prop of the scene, or the page, changing over a share of a step, the sounds it makes on its way, and
 * the fonts it sets.
 *
 * A move reads what it starts from once, as its share begins, and becomes a change that knows its start and its end;
 * from then on what it sets at any progress is worked out from those and the progress alone, so a frame is the same
 * whenever it is shot. A move that finds nothing to start from — no light to carry, no block on the page, a block
 * scrolled off the screen — throws as it begins, once. A move that acts on the page for real, at a moment of a play,
 * acts as it begins, by the way the take hands it, so a move that begins after it reads the page it left. A move is a
 * plain object made by a function of its prop's module (`src/moves/`).
 */
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import { A_BOX, type Box, type Size, liesAboveOrBelow, liesOutside, partWithin } from '../domain/geometry.ts';
import type { PlaceNamed } from '../domain/place.ts';
import {
	A_NUMBER,
	A_SELECTOR,
	type Form,
	type Kind,
	ListOf,
	OfForm,
	Plain,
	aFunction,
	described,
	isObjectOfValues
} from '../domain/handed.ts';
import type { Ease } from '../domain/time.ts';
import type { CssNamed } from './theme.ts';
import type { GroupName } from '../props/group.ts';
import type { ObjectName } from '../props/object.ts';
import { type PropName, type PropStates, type Scene, withProp } from '../scene.ts';
import type { Action, FilmedPage, OwnPage, PageShown } from './page.ts';
import type { Cue } from './sound.ts';

/** An object as the part a move changes, said by its name, apart from any prop or the page whatever its name. */
type ObjectPart = `${ObjectName} object`;

/** A group of objects as the part a move changes, said by its name, apart from any object of that name. */
type GroupPart = `${GroupName} group`;

/**
 * What a move changes: one prop of the scene, an object, a group of objects, the page itself, the speed the page's own
 * time runs at, or the eye; none, for a move that only makes a sound. Two moves of one part never run at once.
 */
export type Part = PropName | ObjectPart | GroupPart | 'page' | 'pageSpeed' | 'eye' | null;

const NO_SOUNDS: readonly Cue[] = [];
const NO_CSS: readonly CssNamed[] = [];
const NO_PLACES: readonly PlaceNamed[] = [];
const NO_OWN_PAGES: readonly OwnPage[] = [];
// Where a step starts and ends, as shares of it; and how far along a move is before its share and after it
const STEP_START = 0;
const STEP_END = 1;
const NONE_OF_IT = 0;
const ALL_OF_IT = 1;
// The size of a block the page lays out none of, and how a block off the screen is brought in, above or below it and
// beside it; a box the film gives stands where it says, so it is given anew
const NO_SIZE = 0;
const SCROLLED_IN = "scroll it in with page.scrollTo, ending before this move's share begins";
const ACTED_IN = 'bring it in with an act, as no move of livereel scrolls the page sideways';
const GIVEN_ON_IT = "give a box that stands on it, in the screen's pixels";
const HIDDEN_SAID = 'has no size on the page: it is hidden, or holds others alone';
const NO_SIZE_GIVEN = 'has no size: give it a width or a height';

/**
 * What a move goes to on the page: the blocks a selector matches, or a box of the page's screen in its own pixels,
 * for what a page draws with no selector to name it, as a canvas or a frame exported from a design.
 */
export type Target = string | Box;

const TARGET_SAID = `${A_SELECTOR.said}, or ${A_BOX.said}`;

/** A target as a film hands it: a selector, or a box. */
class TargetKind implements Kind<Target> {
	is(written: unknown): written is Target {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (typeof written === 'string') return A_SELECTOR.faultOf(written, place);
		if (isObjectOfValues(written)) return A_BOX.faultOf(written, place);
		return `${place} is ${described(written)}: it is ${TARGET_SAID}`;
	}
}

export const A_TARGET: Kind<Target> = new TargetKind();

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
		const start = bounds.start ?? STEP_START;
		const end = bounds.end ?? STEP_END;
		if (!(start >= STEP_START && end <= STEP_END && start < end)) {
			throw new FilmError(`a move's share runs from ${start} to ${end} of its step: it must start before it ends`);
		}
		return new Share(start, end);
	}

	/**
	 * A moment of the step, a share that takes no time, as a move done at once takes: it ends as it begins, so it is
	 * taken at once with a share only where that runs across it. One outside its step is refused.
	 */
	static at(moment: number): Share {
		if (!(moment >= STEP_START && moment <= STEP_END)) {
			throw new FilmError(`a move's moment is ${moment} of its step: it stands from 0 to 1 of it`);
		}
		return new Share(moment, moment);
	}

	/**
	 * How far along the move is when its step is `progress` along: none before its start, all from its end, and as far
	 * as the step has come between them; a moment is all done from its moment on.
	 */
	along(progress: number): number {
		if (progress >= this.end) return ALL_OF_IT;
		if (progress <= this.start) return NONE_OF_IT;
		return (progress - this.start) / (this.end - this.start);
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

/** A curve as a film hands it: a function, livereel's or its own; what it gives is the film's. */
export const A_CURVE: Kind<Ease> = aFunction<Ease>('a curve: a function of progress, as easeInOutSine');

/** A move's timing as a film hands it, which every move's options take beside their own. */
export const TIMING_FORM: Form<TimingScript> = {
	within: new OfForm<Bounds>({ start: A_NUMBER, end: A_NUMBER }, 'a share of the step: { start, end }'),
	ease: A_CURVE
};

/** Where in its step a move done at a moment is done: at `start`, a share of the step. */
interface Start {
	readonly start?: number;
}

/**
 * The timing of a move done at a moment, as a sound heard or an act: where in its step it is done, the step's start
 * where none is given; it takes no time, so it takes no end and no curve.
 */
export interface MomentScript {
	readonly within?: Start;
}

/** The timing of a move done at a moment, as a film hands it. */
export const MOMENT_FORM: Form<MomentScript> = {
	within: new OfForm<Start>({ start: A_NUMBER }, 'a moment of the step: { start }')
};

/** The timing of a move done at a moment: a share of its step that takes no time, and no curve of its own. */
export function momentTimingOf(script: MomentScript): Timing {
	return { within: Share.at(script.within?.start ?? STEP_START), ease: null };
}

/** The change of a move that changes nothing on the scene: the scene as it stands. */
export const UNCHANGED: Change = (scene) => scene;

/** A move as a film hands it to a step: made by one of livereel's moves, its share of the step read. */
export const A_MOVE: Kind<Move> = new Plain(isMove, 'a move, as camera.onto or light.on makes one');
export const A_MOVES: Kind<readonly Move[]> = new ListOf(A_MOVE, 'a list of moves');

/**
 * What a move reads as its share begins: the scene, the page, the format, and how the stage shows the page; and the
 * take's way to act on the page, for a move that acts as it begins.
 */
export interface Beginning {
	readonly scene: Scene;
	readonly page: FilmedPage;
	readonly format: Format;
	readonly pageShown: PageShown;
	/**
	 * The page acted on as an `act` acts on it: the film's time standing while the page answers, the stage laid flat for
	 * it where it shows the page live.
	 */
	readonly act: (action: Action) => Promise<void>;
}

/**
 * A begun move, `progress` of the way along, eased: the scene with its prop set. A move of the page sets the page's
 * own scroll or keys as it goes, and hands the scene back as it was.
 */
export type Change = (scene: Scene, progress: number) => Scene | Promise<Scene>;

/**
 * A move as livereel's moves make one (`camera.onto`, `light.on`). A film names its type, to hand moves on from a
 * helper of its own, and makes none itself: a step takes only a move whose share is a `Share`, which livereel alone
 * makes (`A_MOVE`).
 */
export interface Move {
	readonly part: Part;
	/**
	 * The names of the values of its part the move sets, where it sets only some, as a move of the look sets those its
	 * theme names: two moves of one part at once clash only on a value both set. A move that names none sets the whole
	 * of its part.
	 */
	readonly valueNames?: readonly string[];
	readonly timing: Timing;
	/** The sounds the move makes on its way; a move that makes none has none. */
	readonly sounds?: readonly Cue[];
	/** What the move writes in CSS, which the browser reads before the film is shot; a move that writes none has none. */
	readonly css?: readonly CssNamed[];
	/** The places the move names, which its format is read for before the film is shot; a move that names none has none. */
	readonly places?: readonly PlaceNamed[];
	/** The pages of the film's own the move shows, which the stage lays before the film is shot; most show none. */
	readonly ownPages?: readonly OwnPage[];
	readonly begin: (beginning: Beginning) => Change | Promise<Change>;
}

export function timingOf(script: TimingScript): Timing {
	return { within: Share.of(script.within), ease: script.ease ?? null };
}

/** Whether a move changes the page itself, its scroll or its keys, rather than a prop drawn over it. */
export function movesThePage(move: Move): boolean {
	return move.part === 'page';
}

/** The part a move of an object changes. */
export function objectPart(name: ObjectName): ObjectPart {
	return `${name} object`;
}

/** The part a move of a group of objects changes. */
export function groupPart(name: GroupName): GroupPart {
	return `${name} group`;
}

/** The sounds a move makes on its way: none, for a move that names none. */
export function soundsOf(move: Move): readonly Cue[] {
	return move.sounds ?? NO_SOUNDS;
}

/** What a move writes in CSS: none, for a move that writes none. */
export function cssOf(move: Move): readonly CssNamed[] {
	return move.css ?? NO_CSS;
}

/** The places a move names: none, for a move that names none. */
export function placesOf(move: Move): readonly PlaceNamed[] {
	return move.places ?? NO_PLACES;
}

/** The pages of the film's own a move shows: none, for a move that shows none. */
export function ownPagesOf(move: Move): readonly OwnPage[] {
	return move.ownPages ?? NO_OWN_PAGES;
}

/** The change of one prop: its state at each progress, written into the scene. */
export function propChange<Name extends PropName>(name: Name, stateAt: (progress: number) => PropStates[Name]): Change {
	return (scene, progress) => withProp(scene, name, stateAt(progress));
}

/**
 * A prop that goes: as it stands while its move goes on, and none while its curve stands at its end or past it, where
 * what goes is gone whole already; on a curve that bounces, from where it first passes the end.
 */
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

/**
 * Where a block a move goes to stands on the page's screen, read as the move begins: the first `every` a selector
 * matches, together, or the box a film gives. A block with no size, or one standing wholly off the screen, is refused
 * in the move's own words: the move would go where nothing of the block shows. A block above or below is scrolled in
 * by `page.scrollTo`; one beside the screen, by an act, as no move of livereel scrolls the page sideways.
 */
export async function shownBox(beginning: Beginning, target: Target, every: number, move: string): Promise<Box> {
	const box = typeof target === 'string' ? await beginning.page.box(target, every) : target;
	const screen = beginning.format.screen;
	const named = `${move}'s ${targetSaid(target)}`;
	if (box.width === NO_SIZE && box.height === NO_SIZE) {
		throw new FilmError(`${named} ${typeof target === 'string' ? HIDDEN_SAID : NO_SIZE_GIVEN}`);
	}
	if (liesOutside(box, screen)) {
		const where = `at left ${Math.round(box.left)}, top ${Math.round(box.top)}`;
		throw new FilmError(
			`${named} stands off the page's screen, ${where} of a screen ${screen.width} × ${screen.height}: ` +
				broughtInto(target, box, screen)
		);
	}
	return box;
}

/**
 * How what a move goes to comes onto the screen: a block above or below scrolled in, one beside it by an act; a box
 * the film gives stands where it says, so it is given anew.
 */
function broughtInto(target: Target, box: Box, screen: Size): string {
	if (typeof target !== 'string') return GIVEN_ON_IT;
	return liesAboveOrBelow(box, screen) ? SCROLLED_IN : ACTED_IN;
}

// The blocks of a selector a move that reads one block reads: its first
export const THE_FIRST = 1;

/**
 * What the page's screen shows of a target, the blocks a selector matches or a box, refused as `shownBox` refuses:
 * the part a camera can frame and a cursor rest on, as nothing past the screen is drawn.
 */
export async function shownPart(beginning: Beginning, target: Target, every: number, move: string): Promise<Box> {
	return partWithin(await shownBox(beginning, target, every, move), beginning.format.screen);
}

/** A target as a refusal names it: its selector, or the box as the film wrote it. */
export function targetSaid(target: Target): string {
	return typeof target === 'string' ? target : `box ${described(target)}`;
}

function isMove(written: unknown): written is Move {
	return (
		isObjectOfValues(written) &&
		typeof written.begin === 'function' &&
		isObjectOfValues(written.timing) &&
		written.timing.within instanceof Share
	);
}
