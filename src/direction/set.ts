/**
 * A film's set: the app's states shot once, ahead of the film, each a picture of the screen and where the film's
 * targets stood on it, so the film is shot from those pictures with no app to serve, act on or wait for, and a moment
 * of it is drawn without the app going through what came before.
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

/**
 * A film's set as its author writes it. A film shot on its set shows a state by an act, `context.set.show(name)`,
 * handed to `cursor.click`, `act` or `page.act`, as a click on the app would bring the state: it comes in at the moment
 * the film acts. A target is read where the set shot it in the state shown; what the scenario's scroll and keys did is
 * in the pictures, so the set takes neither.
 */
export interface SetScript {
	/**
	 * The app acted on, Playwright code run once by `livereel set` against the app as the film's `serve` serves it, after
	 * the film's `ready`: every state the film shows marked by `context.state(name)` as the app stands in it.
	 */
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

// A set's pictures where a film names no sharpness: a page of code shot at 3 read crisp with the camera close
const SHARPNESS_WHERE_NONE_IS_NAMED = 3;
// A state's name names its picture's file too: letters, digits, dashes and underscores, beginning with a letter or
// digit
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
