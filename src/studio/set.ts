/**
 * A film's set shot in one of its formats, kept apart from the set shot before until it is written whole, so a scenario
 * that fails leaves that one as it was, and what it kept is thrown away.
 */
import { FilmError } from '../domain/errors.ts';
import { assertKind } from '../domain/handed.ts';
import type { FilmInFormat } from '../direction/film.ts';
import { A_STATE_NAME, type FilmSet, type SetContext } from '../direction/set.ts';
import type { OpenedForSet, PageServer, SetBrowser, SetFolder, SetTaking, StateNoted } from './ports.ts';
import { filmsOwn } from './shoot.ts';

/** What serves the app, the browser it is opened in, and where the set is kept. */
export interface SetShooting {
	readonly server: PageServer;
	readonly browser: SetBrowser;
	readonly folder: SetFolder;
}

// What a film that names no set, and a scenario that marks no state, are told
const NO_SET = 'the film names no set to shoot: give it set: { scenario, targets }';
const NO_STATE = "the set's scenario marked no state: mark each the film shows, with context.state(name)";

/**
 * A film's set shot in a format, and kept: how many states its scenario marked. A scenario that marks none is refused,
 * as a film shown on no state has nothing to show.
 */
export async function shootSet(film: FilmInFormat, shooting: SetShooting): Promise<number> {
	const set = film.set;
	if (set === null) throw new FilmError(NO_SET);
	const setting = {
		format: film.format,
		colourScheme: film.colourScheme,
		blurred: film.blurred,
		sharpness: set.sharpness
	};
	await using served = await shooting.server.serve(film.site);
	await using opened = await shooting.browser.openForSet(setting, served.address);
	await filmsOwn('ready', () => film.ready(opened.act));
	await using taking = await shooting.folder.taking();
	const marked = new StatesMarked(opened, taking, set);
	await filmsOwn("set's scenario", () => set.scenario(marked.context()));
	const states = await marked.noted();
	if (states.length === 0) throw new FilmError(NO_STATE);
	await taking.write({ screen: film.format.screen, sharpness: set.sharpness, targets: set.targets, states });
	return states.length;
}

/** The states a set's scenario marks, each taken off the app as it is marked and its picture kept, in order. */
class StatesMarked {
	readonly opened: OpenedForSet;
	readonly taking: SetTaking;
	readonly set: FilmSet;
	// Each state as it is marked, its name taken at once, and its picture kept once it is taken
	private readonly names: string[] = [];
	private readonly marks: Promise<StateNoted>[] = [];

	constructor(opened: OpenedForSet, taking: SetTaking, set: FilmSet) {
		this.opened = opened;
		this.taking = taking;
		this.set = set;
	}

	/** What the scenario is handed: the app and its motion, as an act is handed them, and how to mark a state. */
	context(): SetContext {
		return { page: this.opened.act.page, motion: this.opened.act.motion, state: (name) => this.marked(name) };
	}

	/** Every state marked, once each is taken and kept, in the order they were marked. */
	noted(): Promise<readonly StateNoted[]> {
		return Promise.all(this.marks);
	}

	/**
	 * The state of this name marked, its name taken as it is; a name taken already is refused. A state is named by the
	 * film to show it, and its picture's file by the name, so the name is taken before the picture is: a scenario that
	 * marks a state without waiting on it still has each in the order it marked them.
	 */
	private marked(name: string): Promise<void> {
		assertKind(name, A_STATE_NAME, "the set's state");
		if (this.names.includes(name)) {
			throw new FilmError(`the set's scenario marks the state ${JSON.stringify(name)} twice: give each its own name`);
		}
		this.names.push(name);
		const mark = this.kept(name);
		this.marks.push(mark);
		return mark.then(() => undefined);
	}

	/** The app as it stands taken as the state of this name, and its picture kept. */
	private async kept(name: string): Promise<StateNoted> {
		const taken = await this.opened.taken(name, this.set.targets);
		await this.taking.keep(name, taken.picture);
		return { name, targets: taken.targets };
	}
}
