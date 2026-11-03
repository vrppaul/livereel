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
 */
import { FilmError } from '../domain/errors.ts';
import { fractionOf } from '../domain/fraction.ts';
import {
	AN_HTML_PAGE,
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
	timingOf
} from '../direction/move.ts';
import { ownPageOf } from '../direction/page.ts';
import { SCREEN_DOWN, SCREEN_UP, type Screen, type Shows, THE_FILMED_PAGE } from '../props/screen.ts';
import { withProp } from '../scene.ts';

/** What a film names the screen to show: the filmed page, `'filmed'`, or a page of its own, its HTML whole. */
export type ScreenPage = typeof FILMED | { readonly html: string };

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
// The screen's values a move that raises or lowers it sets, and one that changes what it shows
const HOW_FAR_UP = ['shown'] as const satisfies readonly (keyof Screen)[];
const SHOWING = ['shows'] as const satisfies readonly (keyof Screen)[];
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
