/**
 * A film shot in one of its formats: its steps written and counted, its page served, the browser opened, the page
 * made ready, its own time running as the film's code waits on it, and a take.
 *
 * The film's length, its sounds, what its looks write in CSS and the pages of its own it shows are known from its
 * steps before its page is served, so footage that cannot be met — a still past the end — or a sound that cannot be
 * laid is refused before any server starts; a font or the ground's layers CSS cannot read is refused before the first
 * frame, and each page of its own is laid on the stage before it. The browser closes before the page's server stops.
 * What the film's own code does — its steps, its wait for the page — is the film's: a fault there is said as the
 * film's, naming where.
 */
import { wholePose } from '../domain/camera.ts';
import { FilmError, LivereelError } from '../domain/errors.ts';
import { momentOf } from '../domain/time.ts';
import type { FilmInFormat } from '../direction/film.ts';
import { cssIn, framesIn, ownPagesIn, soundsIn } from '../direction/steps.ts';
import { openingScene } from '../scene.ts';
import type { Browser, Footage, PageServer, Track } from './ports.ts';
import { Take } from './take.ts';

/**
 * How finely a film is shot: how many of its frames' pixels are captured for each of the frame's own, and whether a
 * fast move is blurred as the film says.
 */
export interface Quality {
	readonly sharpness: number;
	readonly blurred: boolean;
}

/** What serves the film's page, the browser it is shot in, where its frames and its sounds go, and how finely. */
export interface Shooting {
	readonly server: PageServer;
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

export async function shoot(film: FilmInFormat, shooting: Shooting): Promise<Shot> {
	const steps = await filmsOwn('steps', () => film.steps(wholePose(film.format)));
	shooting.footage.expect(framesIn(steps, film.framesPerSecond));
	await shooting.track.expect(soundsIn(steps));
	const motionBlur = shooting.quality.blurred ? film.motionBlur : null;
	const setting = { ...film, css: [...film.css, ...cssIn(steps)], motionBlur, ownPages: ownPagesIn(steps) };
	await using served = await shooting.server.serve(film.site);
	await using opened = await shooting.browser.open(setting, served.address, shooting.quality.sharpness);
	await filmsOwn('ready', () => opened.time.running(() => film.ready(opened.act)));
	const take = new Take({
		opened,
		footage: shooting.footage,
		track: shooting.track,
		format: film.format,
		opening: openingScene(film.format, film.look),
		motionBlur,
		framesPerSecond: film.framesPerSecond
	});
	await take.run(steps);
	return { frames: take.shots, seconds: momentOf(take.shots, film.framesPerSecond) };
}

/** What a part of the film's own code gives; a fault in it, livereel's refusals aside, raised as the film's. */
async function filmsOwn<Given>(part: string, work: () => Given | Promise<Given>): Promise<Given> {
	try {
		return await work();
	} catch (fault) {
		if (fault instanceof LivereelError || !(fault instanceof Error)) throw fault;
		throw new FilmError(`the film's ${part} failed: ${fault.message}`, { cause: fault });
	}
}
