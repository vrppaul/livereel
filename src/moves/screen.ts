/**
 * The screen coming up out of the ground, or going down into it to come up later, from wherever it stands: at once in
 * a cut, so a film may open on the ground alone, or over a move's share in a play. The window's shadow and edge come
 * and go with it. A screen raised that is up, or lowered that is down, has nothing to move from, and is refused as its
 * move begins.
 *
 * The screen shows the filmed page, or a page of the film's own in its place, written whole in HTML: at once in a cut,
 * or at a moment of a play, so the camera may fly on through the swap and the frame's exposures before the moment show
 * the one, those from it the other. How far it has come up and what it shows are set by moves of their own, which
 * share a step. The page a move of the film's own names is the stage's to lay before the film is shot.
 *
 * Light sweeps away the picture the screen shows, a band crossing it or a disc opening round a block, over a move's
 * share, to the page as it stands behind it: the picture is held as the move begins, as a piece holding its picture
 * holds one, so an act done at the same moment of the play, which is done first, is under the picture already; an act
 * at a moment after it comes in behind the light. A sweep sets a value of its own, so it shares a step with a move that
 * raises or lowers the screen, or changes what it shows.
 *
 * A page of the film's own runs down its scroll at a pace the film sets, or comes to rest with a block of it where the
 * film names: the move reads where the page stands and how fast it runs as it begins, and sets its run on the film's
 * time, its pace changing over the move's share on its curve, or slowing from it to stand still at the rest as the
 * share ends, refused where it would turn back on its way; where the page stands at any moment is worked out from that
 * run (`src/props/screen.ts`). Its runs are a value of the screen's own, so it shares a step with what the screen shows.
 *
 * Keys are typed into a block of a page of the film's own, as into the terminal: what stands typed at each progress is
 * set whole, so the block shows it as its text in each exposure. The block is found by a CSS selector, as the stage
 * finds it in each exposure's copy of the page, and measured as the move begins; a block that holds elements is
 * refused, as its text would take their place. What stands typed is another value of the screen's own, so a typing
 * shares a step with what the screen shows and how its page runs.
 */
import { FASTEST_SPEED, type Stretch, linear } from '../domain/curves.ts';
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import { A_FRAME_SIDE, type FrameSide, boxOf, middleX, middleY } from '../domain/geometry.ts';
import {
	AN_HTML_PAGE,
	A_COLOUR,
	A_NUMBER,
	A_SELECTOR,
	A_SIZE,
	type Form,
	type Kind,
	Literal,
	NameOrForm,
	OfForm,
	assertKind,
	assertWritten,
	needed
} from '../domain/handed.ts';
import { between } from '../domain/toward.ts';
import { A_STROKES, type Keystroke, typedAlong } from '../domain/typing.ts';
import {
	A_TARGET,
	type Beginning,
	type Bounds,
	type Change,
	MOMENT_FORM,
	type MomentScript,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type TimingScript,
	momentTimingOf,
	refuseWithoutThePicture,
	shownPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { ownPageOf } from '../direction/page.ts';
import { keysHeard } from '../direction/sound.ts';
import type { Typed } from '../direction/steps.ts';
import {
	AN_UPRIGHT,
	AT_ITS_TOP,
	A_SLANT,
	type Back,
	NO_SECONDS,
	SCREEN_DOWN,
	SCREEN_UP,
	SEEN_THROUGH,
	type Screen,
	type Scroll,
	type Shows,
	type SweepShape,
	THE_FILMED_PAGE,
	type Upright,
	runOf,
	runToRest,
	setOff,
	standingAt,
	typedIn
} from '../props/screen.ts';
import { withProp } from '../scene.ts';
import { TYPING_FORM, type TypingScript } from './typing.ts';

/** A page of the film's own as a film names it: its HTML whole. */
interface OwnPageNamed {
	readonly html: string;
}

/** What a film names the screen to show: the filmed page, `'filmed'`, or a page of its own, its HTML whole. */
export type ScreenPage = typeof FILMED | OwnPageNamed;

/** What a film names the window's back to show: a page of its own, its HTML whole, or none, `'none'`. */
export type BackPage = typeof NONE_ON_THE_BACK | OwnPageNamed;

/** How fast a film runs a page of its own, its pixels a second, and over what share of the step, on what curve. */
export interface ScrollsScript extends TimingScript {
	readonly pace: number;
}

/**
 * Where a film brings a page of its own to rest, its block's top so many pixels below the screen's top, and over what
 * share of the step: its curve is the run's own.
 */
export interface ScrollToScript {
	readonly top: number;
	readonly within?: Bounds;
}

/** The block of a page of its own a film types `into`, by its CSS selector, the typing's timing, and its keyboard. */
export interface ScreenTypingScript extends TypingScript {
	readonly into: string;
}

/** How a page on the window's back is mounted, `upright` as `AN_UPRIGHT` says, and the moment of a play it comes. */
export interface BackScript extends MomentScript {
	readonly upright: Upright;
}

/**
 * The crest of a sweep's light as a film names it: its colour at its `start` and its `end`, a band's ends, the start
 * nearer the top, or a disc's ring's top and bottom.
 */
export interface CrestScript {
	readonly start?: string;
	readonly end?: string;
}

/**
 * How light sweeps the screen's picture away: a band from the side of the window it comes `from`, its left where the
 * film names none, slanted from that side by `slant`, degrees clockwise as the upright screen shows it, 30 where it
 * names none; or a disc opening `round` a block of the page, a selector or a box of the screen, at its middle; `width`
 * wide, in pixels of a frame 1080 high, 160 where it names none; and its `crest`'s colours, the look's accent as it
 * stands at an end it names none for.
 */
export interface SweepScript extends TimingScript {
	readonly round?: Target;
	readonly from?: FrameSide;
	readonly slant?: number;
	readonly width?: number;
	readonly crest?: CrestScript;
}

/** The shape a film names a sweep in: a band from a side, slanted, or a disc round a block of the page. */
type ShapeNamed =
	| { readonly kind: 'band'; readonly from: FrameSide; readonly slant: number }
	| { readonly kind: 'disc'; readonly round: Target };

// What a move of the screen that has nothing to move from says
const UP_ALREADY = 'screen.rise raises a screen already up: lower it first, with cut(screen.lower())';
const DOWN_ALREADY = 'screen.lower lowers a screen already down';
// What a run of a page that cannot run says, and how far such a page scrolls: run without a word, it stood still in
// every frame, as the first film to run a page found (2026-11-11)
const SCROLLS_NOWHERE =
	'screen.scrolls runs a page that scrolls nowhere: the screen holds all of it, or its own styles hide what runs past the screen, as overflow: hidden on its body does; give it more than the screen holds and let it scroll';
const NO_LENGTH = 0;
// The move that brings a page of the film's own to rest, as its refusals name it; the product of the signs of a pace
// and a way that go opposite ways; and how a way along a page's scroll is said, down where it is more than none
const SCROLL_TO = 'screen.scrollTo';
const OPPOSITE_WAYS = -1;
const NO_WAY = 0;
const TOWARD_ITS_END = 'down';
const TOWARD_ITS_TOP = 'up';
// A page of the film's own, as a film names it
const OWN_PAGE_FORM: Form<OwnPageNamed> = { html: needed(AN_HTML_PAGE) };
const OWN_PAGE_SAID = "a page of the film's own, { html }";
// The filmed page, as a film names it
const FILMED = 'filmed';
const A_SCREEN_PAGE: Kind<ScreenPage> = new NameOrForm(
	new Literal(FILMED),
	new OfForm<OwnPageNamed>(OWN_PAGE_FORM, OWN_PAGE_SAID),
	`the filmed page, "filmed", or ${OWN_PAGE_SAID}`
);
// No page on the window's back, as a film names it, the screen seen through it
const NONE_ON_THE_BACK = 'none';
const A_BACK_PAGE: Kind<BackPage> = new NameOrForm(
	new Literal(NONE_ON_THE_BACK),
	new OfForm<OwnPageNamed>(OWN_PAGE_FORM, OWN_PAGE_SAID),
	`${OWN_PAGE_SAID}, or none, "none"`
);
// A page the film runs: one of its own alone, as the filmed page scrolls by the page's own moves
const A_PAGE_RUN: Kind<OwnPageNamed> = new OfForm<OwnPageNamed>(
	OWN_PAGE_FORM,
	`${OWN_PAGE_SAID}; the filmed page scrolls by page.scrollBy or page.scrollTo`
);
// A page a film types into: one of its own alone, as the filmed page holds a keyboard of its own
const A_PAGE_TYPED_INTO: Kind<OwnPageNamed> = new OfForm<OwnPageNamed>(
	OWN_PAGE_FORM,
	`${OWN_PAGE_SAID}; the filmed page is typed into by page.type`
);
const SCREEN_TYPE = 'screen.type';
const SCREEN_TYPING_FORM: Form<ScreenTypingScript> = { into: needed(A_SELECTOR), ...TYPING_FORM };
const SCROLLS_FORM: Form<ScrollsScript> = { pace: needed(A_NUMBER), ...TIMING_FORM };
const SCROLL_TO_FORM: Form<ScrollToScript> = { top: needed(A_NUMBER), within: TIMING_FORM.within };
const BACK_FORM: Form<BackScript> = { upright: needed(AN_UPRIGHT), ...MOMENT_FORM };
// The screen's values a move that raises or lowers it sets, one that changes what it shows, a sweep, one that changes
// what the window's back shows, one that runs a page of the film's own, and one that types into one
const HOW_FAR_UP = ['shown'] as const satisfies readonly (keyof Screen)[];
const SHOWING = ['shows'] as const satisfies readonly (keyof Screen)[];
const SWEEPING = ['sweep'] as const satisfies readonly (keyof Screen)[];
const BACKING = ['back'] as const satisfies readonly (keyof Screen)[];
const RUNNING = ['scrolls'] as const satisfies readonly (keyof Screen)[];
const TYPING = ['typed'] as const satisfies readonly (keyof Screen)[];
const SWEEP_FORM: Form<SweepScript> = {
	round: A_TARGET,
	from: A_FRAME_SIDE,
	slant: A_SLANT,
	width: A_SIZE,
	crest: new OfForm<CrestScript>({ start: A_COLOUR, end: A_COLOUR }, 'a crest: { start, end }, each a colour in hex'),
	...TIMING_FORM
};
// A band where the film names none of these: from the window's left, as a wipe comes, slanted a third of the way to
// lying along its way; and a sweep's light 160 pixels of a frame 1080 high wide, so it reads as a band or a ring round
// its crest
const SWEPT_FROM: FrameSide = 'left';
const SLANTED = 30;
const LIGHT_WIDTH = 160;
// An end of a crest a film names no colour for: drawn in the look's accent as it stands
const IN_THE_ACCENT = null;
// What a sweep named both a disc's block and a band's side or slant says, and the move a refusal names
const BAND_OR_DISC =
	'screen.sweep opens round a block or comes from a side of the window: give it `round`, or `from` and `slant`, not both';
const SWEEP = 'screen.sweep';
// What a lens shows, which stands over the filmed page alone
const LENS = 'lens';

/** The screen coming up out of the ground. */
export function rise(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.rise');
	return {
		part: 'screen',
		valueNames: HOW_FAR_UP,
		timing: timingOf(script),
		begin: (beginning) => shownToward(beginning, SCREEN_UP, UP_ALREADY)
	};
}

/** The screen going down into the ground. */
export function lower(script: TimingScript = {}): Move {
	assertWritten(script, TIMING_FORM, 'screen.lower');
	return {
		part: 'screen',
		valueNames: HOW_FAR_UP,
		timing: timingOf(script),
		begin: (beginning) => shownToward(beginning, SCREEN_DOWN, DOWN_ALREADY)
	};
}

/**
 * The screen showing the filmed page, `'filmed'`, or a page of the film's own, `{ html }`, a whole document in HTML
 * laid out at the screen's size: at once, or at the moment of a play `within: { start }` names.
 */
export function shows(page: ScreenPage, script: MomentScript = {}): Move {
	assertKind(page, A_SCREEN_PAGE, "screen.shows's page");
	assertWritten(script, MOMENT_FORM, 'screen.shows');
	const timing = momentTimingOf(script);
	if (page === FILMED) return { part: 'screen', valueNames: SHOWING, timing, begin: () => showing(THE_FILMED_PAGE) };
	const own = ownPageOf(page.html);
	return {
		part: 'screen',
		valueNames: SHOWING,
		timing,
		ownPages: [own],
		begin: (beginning) => showingOwn(beginning, { kind: 'own', key: own.key })
	};
}

/**
 * The window's back showing a page of the film's own, `{ html }`, laid out at the screen's size, mounted `upright` as
 * the film names it, or none, `'none'`, the screen seen through it: at once, or at the moment of a play
 * `within: { start }` names.
 */
export function behind(page: typeof NONE_ON_THE_BACK, script?: MomentScript): Move;
export function behind(page: OwnPageNamed, script: BackScript): Move;
export function behind(page: BackPage, script: MomentScript | BackScript = {}): Move {
	assertKind(page, A_BACK_PAGE, "screen.behind's page");
	if (page === NONE_ON_THE_BACK) {
		assertWritten(script, MOMENT_FORM, 'screen.behind');
		return { part: 'screen', valueNames: BACKING, timing: momentTimingOf(script), begin: () => backing(SEEN_THROUGH) };
	}
	assertWritten(script, BACK_FORM, 'screen.behind');
	const own = ownPageOf(page.html);
	return {
		part: 'screen',
		valueNames: BACKING,
		timing: momentTimingOf(script),
		ownPages: [own],
		begin: () => backing({ kind: 'own', key: own.key, upright: script.upright })
	};
}

/**
 * A page of the film's own, `{ html }`, running down its scroll at a pace, its pixels a second, until another move of
 * its run: from where it stands as the move begins, its pace changing to the one named over the move's share on its
 * curve in a play, at once in a cut; a pace of none stops it, and a pace below none runs it back up. It runs whichever
 * face of the window shows it, or none, and holds at its top and its end.
 */
export function scrolls(page: OwnPageNamed, script: ScrollsScript): Move {
	assertKind(page, A_PAGE_RUN, "screen.scrolls's page");
	assertWritten(script, SCROLLS_FORM, 'screen.scrolls');
	const own = ownPageOf(page.html);
	return {
		part: 'screen',
		valueNames: RUNNING,
		timing: timingOf(script),
		ownPages: [own],
		begin: (beginning) => running(beginning, own.key, script.pace)
	};
}

/**
 * A page of the film's own, by its key, set off running at a pace as its move begins, as far as the stage measures it
 * scrolls, refused where that is nowhere; what it sets is a run on the film's time, so it is the same at any progress
 * of the move.
 */
async function running(beginning: Beginning, key: string, pace: number): Promise<Change> {
	const length = await beginning.ownPage(key).scrollLength();
	if (length === NO_LENGTH) throw new FilmError(SCROLLS_NOWHERE);
	const from = standingAt(runOf(beginning.scene.screen, key), beginning.stretch.moment);
	return runSet(key, setOff(from, beginning.stretch, pace, length));
}

/**
 * Keys typed into a block of a page of the film's own, `{ html }`, `into` by its CSS selector, key by key, each
 * heard on the film's keyboard or the one named, at the times the strokes have them unless the film names a curve:
 * the block shows what stands typed as its text, in place of what the page wrote there, from the move's start; a block
 * that holds elements of its own is refused as it begins. It types whichever face of the window shows the page, or
 * none.
 */
export function type(page: OwnPageNamed, strokes: readonly Keystroke[], script: ScreenTypingScript): Move & Typed {
	assertKind(page, A_PAGE_TYPED_INTO, "screen.type's page");
	assertKind(strokes, A_STROKES, "screen.type's strokes");
	assertWritten(script, SCREEN_TYPING_FORM, SCREEN_TYPE);
	const own = ownPageOf(page.html);
	return {
		part: 'screen',
		valueNames: TYPING,
		timing: timingOf({ ease: linear, ...script }),
		ownPages: [own],
		strokes,
		sounds: keysHeard(strokes, script.keyboard),
		begin: (beginning) => typingInto(beginning, own.key, script.into, strokes)
	};
}

/**
 * A block of a page of the film's own, by the page's key, showing as much of the strokes as stands typed at each
 * progress; refused as it begins where the block holds elements, which its text would take the place of.
 */
async function typingInto(
	beginning: Beginning,
	key: string,
	into: string,
	strokes: readonly Keystroke[]
): Promise<Change> {
	if (await beginning.ownPage(key).holdsElements(into)) {
		throw new FilmError(
			`${SCREEN_TYPE} types into ${into}, which holds elements of its own that what it types would take the place of: name a block that holds text alone, as a span`
		);
	}
	return (scene, progress) =>
		withProp(scene, 'screen', {
			...scene.screen,
			typed: typedWith(scene.screen, key, into, typedAlong(strokes, progress))
		});
}

/**
 * What stands typed in the pages of the film's own on a screen, with a block of one, by the page's key, holding a text
 * in place of what it held, whatever else stands typed.
 */
function typedWith(screen: Screen, key: string, into: string, text: string): Screen['typed'] {
	return new Map([...screen.typed, [key, new Map([...typedIn(screen, key), [into, text]])]]);
}

/**
 * A page of the film's own, `{ html }`, brought to rest where a block of it, by its selector, stands `top` pixels
 * below the screen's top: from where the page stands as the move begins, setting off at the pace it runs there and
 * slowing smoothly to stand still there as the move's share ends, in a play, or at once, in a cut. The block is
 * measured where it stands in the page's document. Its curve is the run's own, a cubic Hermite curve from its pace to
 * rest, so it takes no `ease`. It runs whichever face of the window shows the page, or none.
 */
export function scrollTo(page: OwnPageNamed, target: string, script: ScrollToScript): Move {
	assertKind(page, A_PAGE_RUN, "screen.scrollTo's page");
	assertKind(target, A_SELECTOR, "screen.scrollTo's target");
	assertWritten(script, SCROLL_TO_FORM, SCROLL_TO);
	const own = ownPageOf(page.html);
	return {
		part: 'screen',
		valueNames: RUNNING,
		timing: timingOf(script),
		ownPages: [own],
		begin: (beginning) => comingToRest(beginning, own.key, target, script.top)
	};
}

/**
 * A page of the film's own, by its key, brought to rest with a block of it so far below the screen's top as its move
 * begins: refused where the page cannot scroll there, and where, in a play, it would turn back to come to rest, running
 * away from its rest or too fast to stop short of it.
 */
async function comingToRest(beginning: Beginning, key: string, target: string, top: number): Promise<Change> {
	const measured = beginning.ownPage(key);
	const length = await measured.scrollLength();
	const rest = (await measured.documentTop(target)) - top;
	if (rest < AT_ITS_TOP || rest > length) {
		throw new FilmError(
			`${SCROLL_TO} would bring ${target} ${top} pixels below the screen's top with its page scrolled ${Math.round(rest)} down, and it scrolls from ${AT_ITS_TOP} to ${Math.round(length)}: name a top it reaches`
		);
	}
	const from = standingAt(runOf(beginning.scene.screen, key), beginning.stretch.moment);
	if (beginning.stretch.seconds > NO_SECONDS) refuseTurningBack(from.pace, rest - from.top, beginning.stretch, target);
	return runSet(key, runToRest(from, beginning.stretch, rest, length));
}

/**
 * A run to rest refused where it would turn back on its way: setting off away from its rest, or faster than a cubic
 * Hermite curve arriving at rest sets off without running past its end, so many times its mean speed.
 */
function refuseTurningBack(pace: number, way: number, stretch: Stretch, target: string): void {
	const rest = `the rest that brings ${target} there`;
	if (Math.sign(pace) * Math.sign(way) === OPPOSITE_WAYS) {
		throw new FilmError(
			`${SCROLL_TO} would turn the page back: it runs ${Math.round(Math.abs(pace))} pixels a second ${downOrUp(pace)} its scroll, and ${rest} lies ${Math.round(Math.abs(way))} ${downOrUp(way)} it: stop it first, with screen.scrolls(page, { pace: 0 })`
		);
	}
	const meanPace = Math.abs(way) / stretch.seconds;
	if (Math.abs(pace) > FASTEST_SPEED * meanPace) {
		throw new FilmError(
			`${SCROLL_TO} would carry the page past ${rest} and back: it runs ${Math.round(Math.abs(pace))} pixels a second, more than ${FASTEST_SPEED} times the ${Math.round(meanPace)} a second its way to rest takes on average: give the move a longer share, or slow the page first`
		);
	}
}

/** Which way down a page's scroll so many pixels go: down where more than none, up where less. */
function downOrUp(pixels: number): string {
	return pixels > NO_WAY ? TOWARD_ITS_END : TOWARD_ITS_TOP;
}

/** A page of the film's own, by its key, running as named, whatever else the screen stands as. */
function runSet(key: string, run: Scroll): Change {
	return (scene) =>
		withProp(scene, 'screen', { ...scene.screen, scrolls: new Map([...scene.screen.scrolls, [key, run]]) });
}

/** The window's back showing a page, or the screen seen through it, whatever else the screen stands as. */
function backing(shown: Back): Change {
	return (scene) => withProp(scene, 'screen', { ...scene.screen, back: shown });
}

/**
 * The screen showing a page of the film's own; refused while a lens stands, as a lens shows the filmed page under it,
 * drawn from its picture.
 */
function showingOwn(beginning: Beginning, shows: Shows): Change {
	if ([...beginning.scene.objects.values()].some((object) => object.content.kind === LENS)) {
		throw new FilmError(
			"screen.shows shows the film's own page while a lens stands, which shows the filmed page under it: hide the lens first, with lens.hide()"
		);
	}
	return showing(shows);
}

/** The screen on its way from where it stands to up or down; refused where it stands there already. */
function shownToward(beginning: Beginning, end: Screen, refusal: string): Change {
	const start = beginning.scene.screen.shown;
	if (start === end.shown) throw new FilmError(refusal);
	return (scene, progress) =>
		withProp(scene, 'screen', { ...scene.screen, shown: fractionOf(between(start, end.shown, progress)) });
}

/** The screen showing a page, whatever else it stands as. */
function showing(shows: Shows): Change {
	return (scene) => withProp(scene, 'screen', { ...scene.screen, shows });
}

/**
 * The picture the screen shows as the move begins, held, swept away by light over the move's share, the page as it
 * stands showing behind it: so an act on the page at a moment of the play, or a page of the film's own shown then,
 * comes in behind the light. A band comes from the side of the window the film names, slanted, or a disc opens round
 * the block it names, as wide and its crest in the colours it names; refused as it is made where the film names both,
 * and as it begins where the stage shows no picture of the filmed page.
 */
export function sweep(script: SweepScript = {}): Move {
	assertWritten(script, SWEEP_FORM, SWEEP);
	const shape = shapeNamedBy(script);
	return {
		part: 'screen',
		valueNames: SWEEPING,
		timing: timingOf(script),
		holdsThePage: true,
		begin: (beginning) => sweeping(beginning, script, shape)
	};
}

/**
 * A sweep as it begins: its shape placed, a picture of the whole screen then held as the page stands, the light as wide
 * as the film names, none at an end of its crest it names no colour for, the look's accent as it stands, and swept as
 * far as the move has come; gone at its end, the page showing whole.
 */
async function sweeping(beginning: Beginning, script: SweepScript, named: ShapeNamed): Promise<Change> {
	refuseWithoutThePicture(beginning, SWEEP);
	const shape = await shapePlaced(beginning, named);
	const picture = await beginning.holdPicture(boxOf(beginning.format.screen));
	const begun = {
		picture,
		width: script.width ?? LIGHT_WIDTH,
		crest: { start: script.crest?.start ?? IN_THE_ACCENT, end: script.crest?.end ?? IN_THE_ACCENT }
	};
	return (scene, progress) =>
		withProp(scene, 'screen', {
			...scene.screen,
			sweep: untilTheEnd(progress, { ...shape, ...begun, swept: fractionOf(progress) })
		});
}

/**
 * The shape a film names a sweep in, as the move is made: a disc round a block, or a band from a side of the window,
 * slanted, from the left at 30° where it names neither; refused where it names both.
 */
function shapeNamedBy(script: SweepScript): ShapeNamed {
	if (script.round === undefined) {
		return { kind: 'band', from: script.from ?? SWEPT_FROM, slant: script.slant ?? SLANTED };
	}
	if (script.from !== undefined || script.slant !== undefined) throw new FilmError(BAND_OR_DISC);
	return { kind: 'disc', round: script.round };
}

/** A sweep's shape placed on the screen as the move begins: a disc round the middle of what the screen shows of its block. */
async function shapePlaced(beginning: Beginning, named: ShapeNamed): Promise<SweepShape> {
	switch (named.kind) {
		case 'band':
			return named;
		case 'disc': {
			const block = await shownPart(beginning, named.round, THE_FIRST, SWEEP);
			return { kind: 'disc', round: { left: middleX(block), top: middleY(block) } };
		}
	}
}
