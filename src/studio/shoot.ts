/**
 * A film shot in one of its formats: its page served, its steps written and counted, the browser opened, the page
 * made ready, and a take.
 *
 * The film's length and its sounds are known from its steps before a browser opens, so footage that cannot be met —
 * a still past the end — or a sound that cannot be laid is refused at once. The browser closes before the page's
 * server stops. What the film's own code does — its server, its steps, its wait for the page — is the film's: a fault
 * there is said as the film's, naming where.
 */
import { wholePose } from '../domain/camera.ts';
import { FilmError, LivereelError } from '../domain/errors.ts';
import { momentOf } from '../domain/time.ts';
import type { FilmInFormat } from '../direction/film.ts';
import { framesIn, soundsIn } from '../direction/steps.ts';
import { openingScene } from '../scene.ts';
import type { Browser, Footage, Track } from './ports.ts';
import { Take } from './take.ts';

/**
 * How finely a film is shot: how many of its frames' pixels are captured for each of the frame's own, and whether a
 * fast camera is blurred as the film says.
 */
export interface Quality {
	readonly sharpness: number;
	readonly blurred: boolean;
}

/** The browser a film is shot in, where its frames and its sounds go, and how finely it is shot. */
export interface Shooting {
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
	await using served = await filmsOwn('serve', () => film.serve());
	const steps = await filmsOwn('steps', () => served.steps(wholePose(film.format)));
	shooting.footage.expect(framesIn(steps));
	shooting.track.expect(soundsIn(steps));
	await using opened = await shooting.browser.open(film.format, served.address, shooting.quality.sharpness);
	await filmsOwn('ready', () => served.ready(opened.act));
	const take = new Take({
		opened,
		footage: shooting.footage,
		track: shooting.track,
		format: film.format,
		opening: openingScene(film.format),
		motionBlur: shooting.quality.blurred ? film.motionBlur : null
	});
	await take.run(steps);
	return { frames: take.shots, seconds: momentOf(take.shots) };
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
