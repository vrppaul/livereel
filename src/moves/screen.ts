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
 */
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import { A_FRAME_SIDE, type FrameSide, boxOf, middleX, middleY } from '../domain/geometry.ts';
import {
	AN_HTML_PAGE,
	A_COLOUR,
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
import { between } from '../domain/time.ts';
import {
	A_TARGET,
	type Beginning,
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
import {
	A_SLANT,
	SCREEN_DOWN,
	SCREEN_UP,
	type Screen,
	type Shows,
	type SweepShape,
	THE_FILMED_PAGE
} from '../props/screen.ts';
import { withProp } from '../scene.ts';

/** What a film names the screen to show: the filmed page, `'filmed'`, or a page of its own, its HTML whole. */
export type ScreenPage = typeof FILMED | { readonly html: string };

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
// The filmed page, as a film names it
const FILMED = 'filmed';
const A_SCREEN_PAGE: Kind<ScreenPage> = new NameOrForm(
	new Literal(FILMED),
	new OfForm<{ readonly html: string }>({ html: needed(AN_HTML_PAGE) }, "a page of the film's own, { html }"),
	`the filmed page, "filmed", or a page of the film's own, { html }`
);
// The screen's values a move that raises or lowers it sets, one that changes what it shows, and a sweep
const HOW_FAR_UP = ['shown'] as const satisfies readonly (keyof Screen)[];
const SHOWING = ['shows'] as const satisfies readonly (keyof Screen)[];
const SWEEPING = ['sweep'] as const satisfies readonly (keyof Screen)[];
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
