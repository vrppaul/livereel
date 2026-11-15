/**
 * A film shot in one of its formats: its steps written and counted, its page served, the browser opened, the page made
 * ready, its own time running as the film's code waits on it, and a take. A film shot on its set has no page served and
 * none made ready: the browser opens the set as it was shot, on the screen it was shot on.
 *
 * The film's length, its sounds, what its looks write in CSS and the pages of its own it shows are known from its steps
 * before its page is served, so footage that cannot be met — a still past the end — or a sound that cannot be laid is
 * refused before any server starts; a font or the ground's layers CSS cannot read is refused before the first frame,
 * and each page of its own is laid on the stage before it. The browser closes before the page's server stops.
 * What the film's own code does — its steps, its wait for the page — is the film's: a fault there is said as the
 * film's, naming where.
 */
import { wholePose } from '../domain/camera.ts';
import { FilmError, LivereelError } from '../domain/errors.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import { momentOf } from '../domain/time.ts';
import type { FilmInFormat } from '../direction/film.ts';
import type { FilmSet } from '../direction/set.ts';
import { type StepShot, cssIn, framesIn, ownPagesIn, picturesIn, soundsIn } from '../direction/steps.ts';
import { openingScene } from '../scene.ts';
import type { Browser, Footage, FramesHanded, Opened, PageServer, SetFolder, SetShot, Track } from './ports.ts';
import { Take } from './take.ts';

/**
 * How finely a film is shot: how many of its frames' pixels are drawn for each of the frame's own, whether a fast move
 * is blurred as the film says, and how its frames are handed to the footage.
 */
export interface Quality {
	readonly sharpness: number;
	readonly blurred: boolean;
	readonly framesHanded: FramesHanded;
}

/**
 * What serves the film's page, where its set is kept, the browser it is shot in, where its frames and its sounds go,
 * and how finely.
 */
export interface Shooting {
	readonly server: PageServer;
	readonly set: SetFolder;
	readonly browser: Browser;
	readonly footage: Footage;
	readonly track: Track;
	readonly quality: Quality;
}

/** What a shot film was: how many frames, and how long. */
export interface Shot {
	readonly frames: number;
	readonly seconds: number;
}

// How a refusal lists a set's targets, and says it has none
const LISTED = ', ';
const NO_TARGETS = 'none';

/** A film's steps as a take runs them, and how a fast move is blurred in it: not at all for a draft. */
interface Scripted {
	readonly steps: readonly StepShot[];
	readonly motionBlur: MotionBlur | null;
}

export async function shoot(film: FilmInFormat, shooting: Shooting): Promise<Shot> {
	const steps = await filmsOwn('steps', () => film.steps(wholePose(film.format)));
	shooting.footage.expect(framesIn(steps, film.framesPerSecond));
	await shooting.track.expect(soundsIn(steps));
	const motionBlur = shooting.quality.blurred ? film.motionBlur : null;
	const scripted = { steps, motionBlur };
	const setting = {
		...film,
		css: [...film.css, ...cssIn(steps)],
		motionBlur,
		ownPages: ownPagesIn(steps),
		pictures: picturesIn(steps),
		framesHanded: shooting.quality.framesHanded
	};
	const sharpness = shooting.quality.sharpness;
	if (film.set !== null) {
		const set = setAsTheFilmNamesIt(await shooting.set.read(), film, film.set);
		await using opened = await shooting.browser.open(setting, { kind: 'set', set }, sharpness);
		return await taken(film, shooting, opened, scripted);
	}
	await using served = await shooting.server.serve(film.site);
	await using opened = await shooting.browser.open(setting, { kind: film.page, address: served.address }, sharpness);
	await filmsOwn('ready', () => opened.time.running(() => film.ready(opened.act)));
	return await taken(film, shooting, opened, scripted);
}

/** What a part of the film's own code gives; a fault in it, livereel's refusals aside, raised as the film's. */
export async function filmsOwn<Given>(part: string, work: () => Given | Promise<Given>): Promise<Given> {
	try {
		return await work();
	} catch (fault) {
		if (fault instanceof LivereelError || !(fault instanceof Error)) throw fault;
		throw new FilmError(`the film's ${part} failed: ${fault.message}`, { cause: fault });
	}
}

/**
 * A film's set as it was shot, refused where the film names it otherwise since: shot on a screen of another size than
 * the format's, as its pictures and boxes stand on that one; with other targets, as a move would be told to add one it
 * names already; or as sharp as the film no longer asks.
 */
function setAsTheFilmNamesIt(set: SetShot, film: FilmInFormat, named: FilmSet): SetShot {
	const { width, height } = film.format.screen;
	if (set.screen.width !== width || set.screen.height !== height) {
		throw shootItAgain(
			`was shot on a screen of ${String(set.screen.width)} × ${String(set.screen.height)}, and its ` +
				`${film.formatName} format's is ${String(width)} × ${String(height)}`
		);
	}
	if (!sameTargets(set.targets, named.targets)) {
		throw shootItAgain(`was shot with the targets ${listed(set.targets)}, and the film names ${listed(named.targets)}`);
	}
	if (set.sharpness !== named.sharpness) {
		throw shootItAgain(
			`was shot at a sharpness of ${String(set.sharpness)}, and the film names ${String(named.sharpness)}`
		);
	}
	return set;
}

function shootItAgain(why: string): FilmError {
	return new FilmError(`the film's set ${why}: shoot the set again, with \`livereel set\``);
}

/** Whether two lists of targets name the same, in whatever order. */
function sameTargets(shot: readonly string[], named: readonly string[]): boolean {
	return shot.length === named.length && named.every((target) => shot.includes(target));
}

function listed(targets: readonly string[]): string {
	return targets.length === 0 ? NO_TARGETS : targets.join(LISTED);
}

/** A film's steps run in a take on the browser opened, the page ready, its frames and sounds kept. */
async function taken(film: FilmInFormat, shooting: Shooting, opened: Opened, scripted: Scripted): Promise<Shot> {
	const take = new Take({
		opened,
		footage: shooting.footage,
		track: shooting.track,
		format: film.format,
		opening: openingScene(film.format, film.look, film.world, film.focalLength),
		motionBlur: scripted.motionBlur,
		framesPerSecond: film.framesPerSecond
	});
	await take.run(scripted.steps);
	return { frames: take.shots, seconds: momentOf(take.shots, film.framesPerSecond) };
}
