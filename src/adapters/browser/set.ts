/**
 * A film's set in the browser: the app opened for its set to be shot and its states taken off it as its scenario marks
 * them, and the set shown to a take on a page of livereel's (`stage/set.html`), which stands in the filmed page's tab
 * and shows one state's picture at a time, so the stage pictures it, holds parts of it and takes it anew after an act
 * as it does a live page.
 *
 * A state is pictured as the app's tab shows it once its fonts have loaded, at the screen's size and the set's
 * sharpness, as a PNG, its text caret kept and anything still animating set at its end; every block each of the set's
 * targets matches is measured then, with the ground behind the first and its corners, as a live page's are, so a take
 * reads the set as it would have read the app; their letters are not, as no film on a set asked for them. A set shot
 * before corners were kept is refused, to be shot again. A target that matched nothing
 * in a state is not kept for it. The state shown is held here, as an act shows it: a move reads its targets from it,
 * and the scroll and keys the set's pictures stood still for are refused. A film shot on its set has no app, so an act
 * that asks for the page is refused, saying how a state is shown, where it would have waited on livereel's own page for
 * a block it never has.
 */
import type { Browser as Playwright, Frame, Page } from 'playwright-core';
import { FilmError } from '../../domain/errors.ts';
import { type Box, type Corners, boxAround } from '../../domain/geometry.ts';
import type { BlockKey } from '../../domain/placement.ts';
import type { ActContext, FilmedPage, PageMotionSwitch, ScrollCourse, SetShown } from '../../direction/page.ts';
import type { OpenedForSet, SetShot, StateShot, StateTaken, TargetShot } from '../../studio/ports.ts';
import { PageMotion } from './motion.ts';
import { type FilmedShown, PlaywrightPage } from './page.ts';
import { STAGE_FOLDER, fontsLoaded } from './stage.ts';
import { reached } from './watch.ts';

/** A state of the set as its page lays it: its name, and its picture's address. */
export interface StateLaid {
	readonly name: string;
	readonly picture: string;
}

/** What the set's page answers under `window.filmSet` (`stage/set.js`). */
export interface SetApi {
	/** The set's states laid, the first shown once its picture is decoded. */
	readonly lay: (states: readonly StateLaid[]) => Promise<void>;
	/** The state of this name shown, once its picture is decoded. */
	readonly show: (name: string) => Promise<void>;
}

declare global {
	interface Window {
		filmSet: SetApi;
	}
}

// The set's page, beside the stage's in the package
export const SET_PAGE = new URL('set.html', STAGE_FOLDER).href;
// A state's picture is lossless, as its text is read close
const PICTURE_TYPE = 'png';
// What a move that scrolls or types on the set, an act that asks for the page on it, and the film's `ready` that asks
// for the set as the set is shot, are told
const STANDS_AS_SHOT =
	"the film's set shows its states as its scenario left them: scroll and type in the scenario, and show the state " +
	'they leave with context.set.show(name)';
// What a piece riding its block lifted off the set is told
const NO_RIDE_ON_THE_SET =
	"the film's set shows each state as its scenario left it and never scrolls, which carries no piece riding its " +
	'block: lift it riding nothing';
const NO_APP =
	"a film shot on its set acts on no app, and an act's context.page is livereel's page of the set: show a state " +
	'with context.set.show(name)';
const NO_LETTERS_SHOT =
	"the film's set shot where its targets' blocks stand, not their letters: a piece carries letters off a page filmed " +
	"live, or one of the film's own, and lands them on one";
const SET_BEING_SHOT =
	"context.set shows the film's set as the film is shot on it, not as the set is shot: ready waits on the app itself";

/** The film's set as a take shows it: the state an act names shown on the set's page, in place of the one shown. */
class SetOnItsPage implements SetShown {
	readonly shot: SetShot;
	readonly tab: Page;
	// The state shown, the first as the set is laid
	private shownNow: StateShot;

	constructor(shot: SetShot, tab: Page) {
		this.shot = shot;
		this.tab = tab;
		this.shownNow = shot.states[0];
	}

	/** The state shown now, as a move reads its targets. */
	get state(): StateShot {
		return this.shownNow;
	}

	/** The state of this name shown; refused, naming the set's states, where it shot none by it. */
	async show(name: string): Promise<void> {
		const state = this.shot.states.find((shot) => shot.name === name);
		if (state === undefined) {
			const names = this.shot.states.map((shot) => shot.name).join(', ');
			throw new FilmError(`the film's set has no state ${JSON.stringify(name)}: its states are ${names}`);
		}
		await this.tab.evaluate(stateShown, name);
		this.shownNow = state;
	}
}

/** A film shot on no set, as an act is handed it: a state shown refused, saying why. */
export class NoSetShown implements SetShown {
	readonly why: string;

	constructor(why: string) {
		this.why = why;
	}

	show(): Promise<void> {
		return Promise.reject(new FilmError(this.why));
	}
}

/** What an act on a film shot on its set is handed: the set, and the tab's motion; asked for the page, it refuses. */
class ActOnTheSet implements ActContext {
	readonly motion: PageMotionSwitch;
	readonly set: SetOnItsPage;

	constructor(motion: PageMotionSwitch, set: SetOnItsPage) {
		this.motion = motion;
		this.set = set;
	}

	get page(): Frame {
		throw new FilmError(NO_APP);
	}
}

/**
 * The film's set as a take reads it: each target where the set shot it in the state shown, the scroll and the keys
 * refused.
 */
class SetPage implements FilmedPage {
	readonly shown: SetOnItsPage;

	constructor(shown: SetOnItsPage) {
		this.shown = shown;
	}

	// The set's targets are known already: each answer is worked out as the port's promise settles, a refusal its
	// rejection, as a live page's is

	box(target: string, every: number): Promise<Box> {
		return Promise.resolve().then(() => this.boxOf(target, every));
	}

	groundBehind(target: string): Promise<string> {
		return Promise.resolve().then(() => this.shotOf(target).ground);
	}

	cornersOf(target: string): Promise<Corners> {
		return Promise.resolve().then(() => this.shotOf(target).corners);
	}

	/** The set shot where its targets' blocks stood, not their letters. */
	letterAtTheStart(): Promise<Box | null> {
		return Promise.reject(new FilmError(NO_LETTERS_SHOT));
	}

	scrollCourse(): Promise<ScrollCourse> {
		return Promise.reject(new FilmError(STANDS_AS_SHOT));
	}

	/** Nothing on the set scrolls, so nothing on it rides a scroll. */
	blocksHolding(): Promise<readonly BlockKey[]> {
		return Promise.reject(new FilmError(NO_RIDE_ON_THE_SET));
	}

	type(): Promise<void> {
		return Promise.reject(new FilmError(STANDS_AS_SHOT));
	}

	press(): Promise<void> {
		return Promise.reject(new FilmError(STANDS_AS_SHOT));
	}

	/** Where the first so many blocks a target matched in the state shown stand, together. */
	private boxOf(target: string, every: number): Box {
		const [first, ...others] = this.shotOf(target).boxes.slice(0, every);
		if (first === undefined) throw new FilmError(`the film's set holds no box of ${target}`);
		return boxAround([first, ...others]);
	}

	/**
	 * A target as the set shot it in the state shown; refused where the set shot none of it, or it matched nothing in
	 * that state.
	 */
	private shotOf(target: string): TargetShot {
		const state = this.shown.state;
		const shot = state.targets.find((matched) => matched.target === target);
		if (shot !== undefined) return shot;
		if (!this.shown.shot.targets.includes(target)) {
			throw new FilmError(
				`the film's set shot no block of ${target}: add it to the set's targets, and shoot the set again`
			);
		}
		throw new FilmError(`nothing matched ${target} in the set's state ${state.name}`);
	}
}

/** The app opened in a tab for its set to be shot: made ready and acted on by the film's own code, each state taken. */
export class AppOpenedForSet implements OpenedForSet {
	readonly browser: Playwright;
	readonly tab: Page;
	readonly page: PlaywrightPage;
	readonly act: ActContext;

	constructor(browser: Playwright, tab: Page) {
		this.browser = browser;
		this.tab = tab;
		this.page = new PlaywrightPage(tab.mainFrame(), tab.keyboard);
		this.act = { page: tab.mainFrame(), motion: new PageMotion(tab), set: new NoSetShown(SET_BEING_SHOT) };
	}

	/**
	 * The app as its tab shows it now, once its fonts have loaded, taken as the state of this name, with where each of
	 * the set's targets stands.
	 */
	async taken(name: string, targets: readonly string[]): Promise<StateTaken> {
		await this.tab.evaluate(fontsLoaded);
		const picture = await this.tab.screenshot({ type: PICTURE_TYPE, caret: 'initial', animations: 'disabled' });
		const shot: TargetShot[] = [];
		for (const target of targets) {
			const boxes = await this.page.boxes(target);
			if (boxes.length === 0) continue;
			shot.push({
				target,
				boxes,
				ground: await this.page.groundBehind(target),
				corners: await this.page.cornersOf(target)
			});
		}
		return { name, picture, targets: shot };
	}

	[Symbol.asyncDispose](): Promise<void> {
		return this.browser.close();
	}
}

/**
 * The set's page opened in the filmed page's tab and its states laid, the first shown, as a take reads it and an act
 * is handed it.
 */
export async function setShownIn(tab: Page, set: SetShot): Promise<FilmedShown> {
	await reached(tab, SET_PAGE);
	const states = set.states.map((state): StateLaid => ({ name: state.name, picture: state.picture }));
	await tab.evaluate(statesLaid, states);
	const shown = new SetOnItsPage(set, tab);
	return { page: new SetPage(shown), act: new ActOnTheSet(new PageMotion(tab), shown) };
}

// What follows runs in the set's page, each function handed over alone

function statesLaid(states: readonly StateLaid[]): Promise<void> {
	return window.filmSet.lay(states);
}

function stateShown(name: string): Promise<void> {
	return window.filmSet.show(name);
}
