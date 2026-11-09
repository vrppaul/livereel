/**
 * A film's set: the app's states shot once, ahead of the film, each a picture of the screen and where the film's
 * targets stood on it, so the film is shot from those pictures with no app to serve, act on or wait for, and a moment
 * of it is drawn without the app going through what came before.
 *
 * The set is shot by its scenario (`livereel set`): Playwright code run once against the app as the film's `serve`
 * serves it, after the film's `ready`, which marks each state the film shows by a name as the app stands in it. A film
 * shot on its set shows a state by an act, `context.set.show(name)`, as a click on the app would bring the state:
 * handed to `cursor.click`, `act` or `page.act`, so the state comes in at the moment the film acts, and the stage takes
 * its picture as it takes a page's after an act. A target is read from where the set shot it in the state shown, as a
 * live page's is read off the page; what the scenario's scroll and keys did is in the pictures, so the set takes
 * neither.
 */
import {
	A_FUNCTION_SAID,
	A_SHARPNESS,
	type Form,
	type Kind,
	Plain,
	SELECTORS,
	aFunction,
	needed
} from '../domain/handed.ts';
import type { ActContext } from './page.ts';

/**
 * What a set's scenario is handed: the app and its own motion, as an act is handed them, and how to mark the state it
 * stands in; no set, as the scenario is what shoots it.
 */
export interface SetContext extends Omit<ActContext, 'set'> {
	/** The app as it stands now pictured, with where the set's targets stand, as the state of this name. */
	readonly state: (name: string) => Promise<void>;
}

/** A film's set as its author writes it. */
export interface SetScript {
	/** The app acted on, Playwright code, every state the film shows marked by `context.state(name)` as it stands in it. */
	readonly scenario: (context: SetContext) => Promise<void>;
	/** The blocks the film reads on the set, by selector: where each stands is shot with every state. */
	readonly targets: readonly string[];
	/** How many of a picture's pixels a page's pixel takes: 3, where none is named. */
	readonly sharpness?: number;
}

/** A film's set as the studio shoots it. */
export interface FilmSet {
	readonly scenario: (context: SetContext) => Promise<void>;
	readonly targets: readonly string[];
	readonly sharpness: number;
}

// A set's pictures where a film names no sharpness: as sharp as the claude-review promo's, whose lines read crisp as
// the camera came close (the review page shot at 3, 2026-11-06)
const SHARPNESS_WHERE_NONE_IS_NAMED = 3;
// A state's name names its picture's file too: letters, digits, dashes and underscores, beginning with a letter or digit
const STATE_NAME = /^[A-Za-z0-9][\w-]*$/;
export const A_STATE_NAME: Kind<string> = new Plain(
	isStateName,
	"a state's name: letters, digits, dashes and underscores, from a letter or digit, as 'refreshed' or 'typed-3'"
);
export const SET_FORM: Form<SetScript> = {
	scenario: needed(aFunction<SetScript['scenario']>(A_FUNCTION_SAID)),
	targets: needed(SELECTORS),
	sharpness: A_SHARPNESS
};

/** A film's set from its script, its form checked with the rest of the film's: none where the film names none. */
export function setOf(script: SetScript | undefined): FilmSet | null {
	if (script === undefined) return null;
	return {
		scenario: script.scenario,
		targets: script.targets,
		sharpness: script.sharpness ?? SHARPNESS_WHERE_NONE_IS_NAMED
	};
}

function isStateName(written: unknown): written is string {
	return typeof written === 'string' && STATE_NAME.test(written);
}
