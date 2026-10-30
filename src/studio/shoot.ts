/**
 * A film shot in one of its formats: its page served, its steps written and counted, the browser opened, the page
 * made ready, and a take.
 *
 * The film's length, its sounds and the fonts its looks set are known from its steps before a browser opens, so
 * footage that cannot be met — a still past the end — a sound that cannot be laid, or a font CSS reads as no family
 * is refused before the first frame. The browser closes before the page's
 * server stops. What the film's own code does — its server, its steps, its wait for the page — is the film's: a fault
 * there is said as the film's, naming where.
 */
import { wholePose } from '../domain/camera.ts';
import { FilmError, LivereelError } from '../domain/errors.ts';
import { momentOf } from '../domain/time.ts';
import type { FilmInFormat } from '../direction/film.ts';
import { fontsIn, framesIn, soundsIn } from '../direction/steps.ts';
import { openingScene } from '../scene.ts';
import type { Browser, Footage, Track } from './ports.ts';
import { Take } from './take.ts';

/**
 * How finely a film is shot: how many of its frames' pixels are captured for each of the frame's own, and whether a
 * fast move is blurred as the film says.
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
	await shooting.track.expect(soundsIn(steps));
	const motionBlur = shooting.quality.blurred ? film.motionBlur : null;
	const setting = { ...film, fonts: [...film.fonts, ...fontsIn(steps)], motionBlur };
	await using opened = await shooting.browser.open(setting, served.address, shooting.quality.sharpness);
	await filmsOwn('ready', () => served.ready(opened.act));
	const take = new Take({
		opened,
		footage: shooting.footage,
		track: shooting.track,
		format: film.format,
		opening: openingScene(film.format, film.look),
		motionBlur
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
