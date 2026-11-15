/**
 * A move: one part of the scene, or the page, changing over a share of a step; and what a film is read for before it is
 * shot, as the move names it: its sounds, its CSS, its places and depths, the film's own pages and pictures it shows.
 *
 * A move reads what it starts from once, as its share begins, and becomes a change that knows its start and its end:
 * what it sets at any progress follows from those alone, so a frame is the same whenever it is shot.
 */
import type { Camera } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import {
	A_BOX,
	type Box,
	type FrameSide,
	type Size,
	liesAboveOrBelow,
	liesOutside,
	partWithin
} from '../domain/geometry.ts';
import type { PlaceNamed } from '../domain/place.ts';
import type { DepthNamed } from '../domain/stance.ts';
import {
	A_NUMBER,
	A_SELECTOR,
	type Form,
	type Kind,
	ListOf,
	OfForm,
	Plain,
	SOME_OR_NO_SECONDS,
	SOME_SECONDS,
	described,
	isObjectOfValues
} from '../domain/handed.ts';
import { A_CURVE, type Ease, type Stretch } from '../domain/curves.ts';
import type { CssNamed } from './theme.ts';
import type { GroupName } from '../domain/placement.ts';
import type { ObjectName } from '../props/object.ts';
import type { PictureDecoded } from '../domain/picture.ts';
import { THE_FILMED_PAGE } from '../props/screen.ts';
import { type PropName, type PropStates, type Scene, withProp } from '../scene.ts';
import type { Action, FilmedPage, MeasuredPage, OwnPage, PageShown } from './page.ts';
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
const NO_DEPTHS: readonly DepthNamed[] = [];
const NO_OWN_PAGES: readonly OwnPage[] = [];
const NO_PICTURES: readonly string[] = [];
// The parts a frame's camera is seen by (`cameraOf` in `src/scene.ts`)
const FRAMING: readonly Part[] = ['camera', 'window', 'eye'];
// Where a step starts and ends, as shares of it; and how far along a move is before its share and after it
const STEP_START = 0;
const STEP_END = 1;
const NONE_OF_IT = 0;
const ALL_OF_IT = 1;
// Where a play starts, in its seconds; and the grid of a second its moves' seconds are held to, a microsecond's
const PLAY_START = 0;
const STEPS_OF_A_SECOND = 1_000_000;
// What a move timed both ways is refused with, one at a moment so too, and one timed in a play's seconds in a cut
const TIMED_BOTH_WAYS =
	"a move is timed by a share of its step, within, or by its play's seconds, after and takes: not both";
const MOMENT_TIMED_BOTH_WAYS =
	'a move at a moment is at a share of its step, within: { start }, or so many seconds after its play begins, after: not both';
const TIMED_IN_A_CUT = "a cut's moves are made at once: after and takes time a move in a play";
// The size of a block the page lays out none of, and how a block off the screen is brought in, above or below it and
// beside it; a box the film gives stands where it says, so it is given anew
const NO_SIZE = 0;
const SCROLLED_IN = "scroll it in with page.scrollTo, ending before this move's share begins";
const ACTED_IN = 'bring it in with an act, as no move of livereel scrolls the page sideways';
const GIVEN_ON_IT = "give a box that stands on it, in the screen's pixels";
const HIDDEN_SAID = 'has no size on the page: it is hidden, or holds others alone';
const NO_SIZE_GIVEN = 'has no size: give it a width or a height';

/**
 * What a move goes to on the page: the blocks a selector matches, or a box of the page's screen in its own pixels, for
 * what a page draws with no selector to name it, as a canvas or a frame exported from a design.
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
	 * How far along the move is when its step is `progress` along: none before its start, all from its end, and as far as
	 * the step has come between them; a moment is all done from its moment on.
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

/**
 * How long a move a film times in seconds takes: so many seconds, on to the play's end, or none, done at its moment.
 */
type Taken =
	{ readonly kind: 'seconds'; readonly seconds: number } | { readonly kind: 'toTheEnd' } | { readonly kind: 'atOnce' };

/**
 * The part of its play a move a film times in seconds takes: from so many seconds after the play begins, as long as it
 * takes. A play turns it into its share once it knows its own length, so a long play's moves are written at the moments
 * a film reads off a cut or its music. Seconds are held to a grid as they are turned, so a move written to end with the
 * play, or where the next begins, ends there exactly, as 1.1 + 2.2 is not 3.3 in a computer's numbers.
 */
class SecondsOfThePlay {
	readonly after: number;
	readonly taken: Taken;

	constructor(after: number, taken: Taken) {
		this.after = after;
		this.taken = taken;
	}

	/** Its share of a play so many seconds long; refused, in seconds, where it does not stand within the play. */
	shareOf(playSeconds: number): Share {
		const start = heldToTheGrid(this.after);
		const playEnd = heldToTheGrid(playSeconds);
		switch (this.taken.kind) {
			case 'atOnce':
				if (start > playEnd) throw new FilmError(`a move at ${this.after} s stands past a play of ${playSeconds} s`);
				return Share.at(start / playEnd);
			case 'toTheEnd':
				if (start >= playEnd) throw new FilmError(`a move from ${this.after} s starts past a play of ${playSeconds} s`);
				return Share.of({ start: start / playEnd });
			case 'seconds': {
				const end = heldToTheGrid(this.after + this.taken.seconds);
				if (end > playEnd) {
					throw new FilmError(
						`a move runs from ${this.after} s for ${this.taken.seconds} s of a play of ${playSeconds} s: it runs past the play's end`
					);
				}
				return Share.of({ start: start / playEnd, end: end / playEnd });
			}
		}
	}
}

// A move timed from a moment on to its play's end, and one done at its moment
const TO_THE_PLAYS_END: Taken = { kind: 'toTheEnd' };
const AT_ITS_MOMENT: Taken = { kind: 'atOnce' };

/** Seconds held to the grid a play's moves meet on. */
function heldToTheGrid(seconds: number): number {
	return Math.round(seconds * STEPS_OF_A_SECOND) / STEPS_OF_A_SECOND;
}

/** Where in its step a move runs, as the film writes it: a share of the step, or seconds of its play. */
type Within = Share | SecondsOfThePlay;

/** A move's timing as a film writes it: where in its step it runs, and its own curve where it takes not its step's. */
export interface Timing {
	readonly within: Within;
	readonly ease: Ease | null;
}

/** A move's timing in the step it stands in, its share of the step worked out. */
interface TimingInItsStep extends Timing {
	readonly within: Share;
}

/**
 * When in its step a move runs, as a film writes it, every part optional: a share of its step, `within`, or, in a play,
 * from `after` seconds of it, the play's start where left out, for `takes` seconds, on to its end where left out.
 */
export interface WhenScript {
	readonly within?: Bounds;
	readonly after?: number;
	readonly takes?: number;
}

/** How a film writes a move's timing: when it runs, and its own curve. */
export interface TimingScript extends WhenScript {
	readonly ease?: Ease;
}

/** When a move runs, as a film hands it, for a move whose curve is its own, as a run brought to rest is. */
export const WHEN_FORM: Form<WhenScript> = {
	within: new OfForm<Bounds>({ start: A_NUMBER, end: A_NUMBER }, 'a share of the step: { start, end }'),
	after: SOME_OR_NO_SECONDS,
	takes: SOME_SECONDS
};

/** A move's timing as a film hands it, which every move's options take beside their own. */
export const TIMING_FORM: Form<TimingScript> = { ...WHEN_FORM, ease: A_CURVE };

/** Where in its step a move done at a moment is done: at `start`, a share of the step. */
interface Start {
	readonly start?: number;
}

/**
 * The timing of a move done at a moment, as a sound heard or an act: where in its step it is done, a share of it or, in
 * a play, so many seconds `after` the play begins, the step's start where neither is given; it takes no time, so it
 * takes no end and no curve.
 */
export interface MomentScript {
	readonly within?: Start;
	readonly after?: number;
}

/** The timing of a move done at a moment, as a film hands it. */
export const MOMENT_FORM: Form<MomentScript> = {
	within: new OfForm<Start>({ start: A_NUMBER }, 'a moment of the step: { start }'),
	after: SOME_OR_NO_SECONDS
};

/** The timing of a move done at a moment: a moment of its step that takes no time, and no curve of its own. */
export function momentTimingOf(script: MomentScript): Timing {
	if (script.after === undefined) return { within: Share.at(script.within?.start ?? STEP_START), ease: null };
	if (script.within !== undefined) throw new FilmError(MOMENT_TIMED_BOTH_WAYS);
	return { within: new SecondsOfThePlay(script.after, AT_ITS_MOMENT), ease: null };
}

/**
 * A move as it stands in a play so many seconds long: the very move where it is timed by a share of its step, else with
 * its share of the play worked out of its seconds.
 */
export function inAPlayOf(move: Move, playSeconds: number): MoveInItsStep {
	if (isInItsStep(move)) return move;
	return { ...move, timing: { ...move.timing, within: shareInAPlayOf(move.timing.within, playSeconds) } };
}

/** The share of a play so many seconds long a move's timing names: its share, or the share its seconds make. */
function shareInAPlayOf(within: Within, playSeconds: number): Share {
	return within instanceof Share ? within : within.shareOf(playSeconds);
}

/** A move as it stands in a cut, which takes no time: one timed in seconds of a play is refused. */
export function inACut(move: Move): MoveInItsStep {
	if (isInItsStep(move)) return move;
	throw new FilmError(TIMED_IN_A_CUT);
}

/** Whether a move's share of its step is its own already, timed by a share of it, so it stands in any step as it is. */
function isInItsStep(move: Move): move is MoveInItsStep {
	return move.timing.within instanceof Share;
}

/** The change of a move that changes nothing on the scene: the scene as it stands. */
export const UNCHANGED: Change = (scene) => scene;

/** A move as a film hands it to a step: made by one of livereel's moves, its share of the step read. */
export const A_MOVE: Kind<Move> = new Plain(isMove, 'a move, as camera.onto or light.on makes one');
export const A_MOVES: Kind<readonly Move[]> = new ListOf(A_MOVE, 'a list of moves');

/**
 * The step a move begins in, as the take tells it. In a play, `cameraAt` foresees the camera the frame will be seen by
 * at a moment of the move's stretch, asked one moment after another: every move of the camera, the window and the eye
 * that begins by then is begun ahead of its share, on the scene alone. A cut's moves are set at once, one after
 * another, so none of them can know where the frame after the cut will stand.
 */
export type StepBegunIn =
	{ readonly kind: 'play'; readonly cameraAt: (moment: number) => Promise<Camera> } | { readonly kind: 'cut' };

/** What a block is read off: the page, and the format, whose screen the page is laid out on. */
export interface PageReading {
	readonly page: FilmedPage;
	readonly format: Format;
}

/** What a move reads as its share begins. */
export interface Beginning extends PageReading {
	readonly scene: Scene;
	/** How the stage shows the filmed page: live in its frame, or as its picture. */
	readonly pageShown: PageShown;
	/**
	 * The moment the share begins, how long it lasts, none in a cut, and the curve the move goes along it on: for a move
	 * that sets what runs on with time.
	 */
	readonly stretch: Stretch;
	/**
	 * A film's own page, by its key, as a move measures it, whether or not the screen shows it: as it stands at the
	 * move's moment.
	 */
	readonly ownPage: (key: string) => Promise<MeasuredPage>;
	/**
	 * The page acted on as an `act` acts on it, for a move that acts as it begins: the film's time standing while the
	 * page answers, the stage laid flat for it where it shows the page live.
	 */
	readonly act: (action: Action) => Promise<void>;
	/**
	 * A picture of a part of the screen, in its pixels, taken of the page the screen shows as it stands now, the filmed
	 * page or a film's own, and held by the stage, which draws a piece or a sweep from it by the number handed back; only
	 * where the stage shows the filmed page's picture, not the page live.
	 */
	readonly holdPicture: (part: Box) => Promise<number>;
	/**
	 * The colour the page the screen shows, as it stands now, shows along the edge of a part of the screen, on the sides
	 * named, in hex with no alpha; only where the stage shows the filmed page's picture, not the page live.
	 */
	readonly edgeColour: (part: Box, sides: readonly FrameSide[]) => Promise<string>;
	/**
	 * The step the move begins in: for a move judged on the frame, and for a fade, which lays the page it leaves where
	 * the frame shows it.
	 */
	readonly step: StepBegunIn;
	/** The names the film's things module builds a thing by: none where the film draws no things of its own. */
	readonly thingsBuilt: readonly string[];
	/** The film's own pictures the stage laid, by the path the film names each, and as each file decoded. */
	readonly filmsPictures: ReadonlyMap<string, PictureDecoded>;
}

/**
 * A begun move, `progress` of the way along, eased, with `timeGone` of its share's time gone beside it, for a move that
 * sets some of its values on a curve of its own: the scene with its prop set. A move of the page sets the page's own
 * scroll or keys as it goes, and hands the scene back as it was.
 */
export type Change = (scene: Scene, progress: number, timeGone: number) => Scene | Promise<Scene>;

/**
 * A move as livereel's moves make one (`camera.onto`, `light.on`). A film names its type, to hand moves on from a
 * helper of its own, and makes none itself: a step takes only a move whose timing livereel made, a `Share` or seconds
 * of its play (`A_MOVE`).
 */
export interface Move {
	readonly part: Part;
	/**
	 * The names of the values of its part the move sets, where it sets only some, as a move of the look sets those its
	 * theme names: two moves of one part at once clash only on a value both set. A move that names none sets the whole of
	 * its part.
	 */
	readonly valueNames?: readonly string[];
	readonly timing: Timing;
	/** The sounds the move makes on its way; a move that makes none has none. */
	readonly sounds?: readonly Cue[];
	/** What the move writes in CSS, which the browser reads before the film is shot; a move that writes none has none. */
	readonly css?: readonly CssNamed[];
	/**
	 * The places the move names, which its format is read for before the film is shot; a move that names none has none.
	 */
	readonly places?: readonly PlaceNamed[];
	/**
	 * The depths the move brings something to, which the film's eye is read for before the film is shot; a move that
	 * names none has none.
	 */
	readonly depths?: readonly DepthNamed[];
	/** The film's own pages the move shows, which the stage lays before the film is shot; most show none. */
	readonly ownPages?: readonly OwnPage[];
	/**
	 * The film's own pictures the move shows, by their paths, which the stage lays before the film is shot; most show
	 * none.
	 */
	readonly pictures?: readonly string[];
	/**
	 * Whether the move holds a picture of the page as it begins, as a sweep of the screen and a piece holding its picture
	 * do, so an act at that moment, done first, would be in it; most hold none.
	 */
	readonly holdsThePage?: boolean;
	readonly begin: (beginning: Beginning) => Change | Promise<Change>;
}

/** A move as it stands in its step, a play or a cut: its share of the step worked out. */
export interface MoveInItsStep extends Move {
	readonly timing: TimingInItsStep;
}

/**
 * A move's timing as a film writes it: a share of its step, or seconds of its play, not both; its own curve where it
 * names one.
 */
export function timingOf(script: TimingScript): Timing {
	return { within: withinOf(script), ease: script.ease ?? null };
}

/** Where in its step a move runs, as its timing names it: seconds of its play where it names them, else a share. */
function withinOf(script: TimingScript): Within {
	if (script.after === undefined && script.takes === undefined) return Share.of(script.within);
	if (script.within !== undefined) throw new FilmError(TIMED_BOTH_WAYS);
	const taken: Taken = script.takes === undefined ? TO_THE_PLAYS_END : { kind: 'seconds', seconds: script.takes };
	return new SecondsOfThePlay(script.after ?? PLAY_START, taken);
}

/** Whether a move changes the page itself, its scroll or its keys, rather than a prop drawn over it. */
export function movesThePage(move: Move): boolean {
	return move.part === 'page';
}

/** Whether a move changes a part the frame's camera is seen by: the camera, its window or the eye. */
export function movesTheFrame(move: Move): boolean {
	return FRAMING.includes(move.part);
}

/** The part a move of an object changes. */
export function objectPart(name: ObjectName): ObjectPart {
	return `${name} object`;
}

/** The part a move of a group of objects changes. */
export function groupPart(name: GroupName): GroupPart {
	return `${name} group`;
}

export function soundsOf(move: Move): readonly Cue[] {
	return move.sounds ?? NO_SOUNDS;
}

export function cssOf(move: Move): readonly CssNamed[] {
	return move.css ?? NO_CSS;
}

export function placesOf(move: Move): readonly PlaceNamed[] {
	return move.places ?? NO_PLACES;
}

export function depthsOf(move: Move): readonly DepthNamed[] {
	return move.depths ?? NO_DEPTHS;
}

export function ownPagesOf(move: Move): readonly OwnPage[] {
	return move.ownPages ?? NO_OWN_PAGES;
}

export function picturesOf(move: Move): readonly string[] {
	return move.pictures ?? NO_PICTURES;
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
 * A move drawn from a picture of the page the screen shows, which the take holds as it begins, refused where the stage
 * shows the filmed page live, with no picture: a film's own page is pictured on its copy apart.
 */
export function refuseWhereLive(beginning: Beginning, move: string): void {
	if (beginning.pageShown !== 'pictured') {
		throw new FilmError(
			`${move} draws from the page's picture, which a page framed live has none of: the film's page is 'dynamic'`
		);
	}
}

/**
 * A move drawn from the filmed page's picture as it changes refused as it begins where the stage shows none of it: a
 * page framed live, which has no picture, and one the screen shows a film's own page in place of.
 */
export function refuseWithoutThePicture(beginning: Beginning, move: string): void {
	refuseWhereLive(beginning, move);
	if (beginning.scene.screen.shows.kind !== THE_FILMED_PAGE.kind) {
		throw new FilmError(
			`${move} draws from the filmed page's picture, and the screen shows the film's own page: show the filmed page first, with screen.shows('filmed')`
		);
	}
}

/**
 * Where a block a move goes to stands on the page's screen, read as the move begins: the first `every` a selector
 * matches, together, or the box a film gives. A block with no size, or one standing wholly off the screen, is refused
 * in the move's own words: the move would go where nothing of the block shows. A block above or below is scrolled in by
 * `page.scrollTo`; one beside the screen, by an act, as no move of livereel scrolls the page sideways.
 */
export async function shownBox(reading: PageReading, target: Target, every: number, move: string): Promise<Box> {
	const box = typeof target === 'string' ? await reading.page.box(target, every) : target;
	const screen = reading.format.screen;
	const named = `${move}'s ${targetSaid(target)}`;
	if (box.width === NO_SIZE && box.height === NO_SIZE) {
		throw new FilmError(`${named} ${typeof target === 'string' ? HIDDEN_SAID : NO_SIZE_GIVEN}`);
	}
	refuseOffTheScreen(box, target, screen, named);
	return box;
}

/**
 * Refuses what a move goes to, a target's box or a part of it, where it stands wholly off the page's screen, in the
 * words a refusal names it by, saying how it comes onto the screen.
 */
export function refuseOffTheScreen(box: Box, target: Target, screen: Size, named: string): void {
	if (!liesOutside(box, screen)) return;
	const where = `at left ${Math.round(box.left)}, top ${Math.round(box.top)}`;
	throw new FilmError(
		`${named} stands off the page's screen, ${where} of a screen ${screen.width} × ${screen.height}: ` +
			broughtInto(target, box, screen)
	);
}

/**
 * How what a move goes to comes onto the screen: a block above or below scrolled in, one beside it by an act; a box the
 * film gives stands where it says, so it is given anew.
 */
function broughtInto(target: Target, box: Box, screen: Size): string {
	if (typeof target !== 'string') return GIVEN_ON_IT;
	return liesAboveOrBelow(box, screen) ? SCROLLED_IN : ACTED_IN;
}

// The blocks of a selector a move that reads one block reads: its first
export const THE_FIRST = 1;

/**
 * What the page's screen shows of a target, the blocks a selector matches or a box, refused as `shownBox` refuses: the
 * part a camera can frame and a cursor rest on, as nothing past the screen is drawn.
 */
export async function shownPart(reading: PageReading, target: Target, every: number, move: string): Promise<Box> {
	return partWithin(await shownBox(reading, target, every, move), reading.format.screen);
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
		(written.timing.within instanceof Share || written.timing.within instanceof SecondsOfThePlay)
	);
}
