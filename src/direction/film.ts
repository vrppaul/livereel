/**
 * A film as its author writes it, and as the studio shoots it.
 *
 * An author writes a script, typed by what its own server hands back (an agent to play, a count to say); the studio
 * sees a film, with that type closed over, so one studio shoots every film. A film is made by `defineFilm`, and the
 * command line knows a film file's default export for one by it.
 */
import type { Pose } from '../domain/camera.ts';
import type { Format } from '../domain/geometry.ts';
import type { ActContext } from './page.ts';
import type { Step } from './steps.ts';

/** A page served for as long as a take lasts, at its address; the film's own handles may come with it. */
export interface Serving extends AsyncDisposable {
	readonly address: string;
}

export interface Script<Served extends Serving> {
	readonly format: Format;
	/** The page served, or found served elsewhere (`atAddress`), with any handles of the film's own. */
	readonly serve: () => Served | Promise<Served>;
	/** Wait until the page stands as the first frame shows it. */
	readonly ready: (context: ActContext, served: Served) => Promise<void>;
	readonly steps: (served: Served, whole: Pose) => readonly Step[];
}

/** A film whose page is served: what the studio shoots. */
export interface ServedFilm extends AsyncDisposable {
	readonly address: string;
	readonly ready: (context: ActContext) => Promise<void>;
	readonly steps: (whole: Pose) => readonly Step[];
}

export interface Film {
	readonly format: Format;
	readonly serve: () => Promise<ServedFilm>;
}

export class ScriptedFilm<Served extends Serving> implements Film {
	readonly format: Format;
	readonly script: Script<Served>;

	constructor(script: Script<Served>) {
		this.format = script.format;
		this.script = script;
	}

	async serve(): Promise<ServedFilm> {
		return servedFilm(this.script, await this.script.serve());
	}
}

/** A page served by someone else, at an address: nothing to stop after. */
class ServedElsewhere implements Serving {
	readonly address: string;

	constructor(address: string) {
		this.address = address;
	}

	/** Nothing was started, so nothing is stopped. */
	[Symbol.asyncDispose](): Promise<void> {
		return Promise.resolve();
	}
}

export function defineFilm<Served extends Serving>(script: Script<Served>): Film {
	return new ScriptedFilm(script);
}

export function atAddress(address: string): Serving {
	return new ServedElsewhere(address);
}

function servedFilm<Served extends Serving>(script: Script<Served>, served: Served): ServedFilm {
	return {
		address: served.address,
		ready: (context) => script.ready(context, served),
		steps: (whole) => script.steps(served, whole),
		[Symbol.asyncDispose]: () => served[Symbol.asyncDispose]()
	};
}
