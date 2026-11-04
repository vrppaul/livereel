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
 * A band of light sweeps away the picture the screen shows, over a move's share, to the page as it stands behind it:
 * the picture is held as the move begins, as a piece holding its picture holds one, so an act done at the same moment
 * of the play, which is done first, is under the picture already; an act at a moment after it comes in behind the
 * band. A sweep sets a value of its own, so it shares a step with a move that raises or lowers the screen, or changes
 * what it shows.
 */
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import { A_FRAME_SIDE, type FrameSide, boxOf } from '../domain/geometry.ts';
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
	type Beginning,
	type Change,
	MOMENT_FORM,
	type MomentScript,
	type Move,
	TIMING_FORM,
	type TimingScript,
	momentTimingOf,
	refuseWithoutThePicture,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { ownPageOf } from '../direction/page.ts';
import { A_SLANT, SCREEN_DOWN, SCREEN_UP, type Screen, type Shows, THE_FILMED_PAGE } from '../props/screen.ts';
import { withProp } from '../scene.ts';

/** What a film names the screen to show: the filmed page, `'filmed'`, or a page of its own, its HTML whole. */
export type ScreenPage = typeof FILMED | { readonly html: string };

/** A band of light's crest as a film names it: its colour at its `start`, the end nearer the top, and at its `end`. */
export interface CrestScript {
	readonly start?: string;
	readonly end?: string;
}

/**
 * How a band of light sweeps the screen's picture away: from the side of the window it comes `from`, its left where the
 * film names none; slanted from that side by `slant`, degrees clockwise as the upright screen shows it, 30 where it
 * names none; `width` wide, in pixels of a frame 1080 high, 160 where it names none; and its `crest`'s colours, the
 * look's accent as it stands at an end it names none for.
 */
export interface SweepScript extends TimingScript {
	readonly from?: FrameSide;
	readonly slant?: number;
	readonly width?: number;
	readonly crest?: CrestScript;
}

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
	from: A_FRAME_SIDE,
	slant: A_SLANT,
	width: A_SIZE,
	crest: new OfForm<CrestScript>({ start: A_COLOUR, end: A_COLOUR }, 'a crest: { start, end }, each a colour in hex'),
	...TIMING_FORM
};
// A band where the film names none of these: from the window's left, as a wipe comes, slanted a third of the way to
// lying along its way, and 160 pixels of a frame 1080 high wide, so its light reads as a band round its crest
const SWEPT_FROM: FrameSide = 'left';
const SLANTED = 30;
const BAND_WIDTH = 160;
// An end of a crest a film names no colour for: drawn in the look's accent as it stands
const IN_THE_ACCENT = null;
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
 * The picture the screen shows as the move begins, held, swept away by a band of light over the move's share, the page
 * as it stands showing behind it: so an act on the page at a moment of the play, or a page of the film's own shown
 * then, comes in behind the band. The band comes from the side of the window the film names, slanted, as wide and its
 * crest in the colours it names; refused where the stage shows no picture of the filmed page.
 */
export function sweep(script: SweepScript = {}): Move {
	assertWritten(script, SWEEP_FORM, 'screen.sweep');
	return {
		part: 'screen',
		valueNames: SWEEPING,
		timing: timingOf(script),
		holdsThePage: true,
		begin: (beginning) => sweeping(beginning, script)
	};
}

/**
 * A sweep as it begins: a picture of the whole screen held as the page stands, the band as the film names it, none at
 * an end of its crest it names no colour for, the look's accent as it stands, and swept as far as the move has come;
 * gone at its end, the page showing whole.
 */
async function sweeping(beginning: Beginning, script: SweepScript): Promise<Change> {
	refuseWithoutThePicture(beginning, 'screen.sweep');
	const picture = await beginning.holdPicture(boxOf(beginning.format.screen));
	const begun = {
		picture,
		from: script.from ?? SWEPT_FROM,
		slant: script.slant ?? SLANTED,
		width: script.width ?? BAND_WIDTH,
		crest: { start: script.crest?.start ?? IN_THE_ACCENT, end: script.crest?.end ?? IN_THE_ACCENT }
	};
	return (scene, progress) =>
		withProp(scene, 'screen', {
			...scene.screen,
			sweep: untilTheEnd(progress, { ...begun, swept: fractionOf(progress) })
		});
}
