/**
 * A film its own page draws, shot in one of its formats: its page served, opened at the frame's size and made ready,
 * then each frame the footage keeps drawn at its moment and captured, until the film or the footage runs out.
 *
 * The page says how long the film is, so a still or a clip past its end is refused before the first frame. A frame the
 * footage does not keep is never drawn: each is the page's at its moment alone. The browser closes before the page's
 * server stops. What the film's own `serve` does is the film's: a fault there is said as the film's.
 */
import { momentOf, shotAt } from '../domain/time.ts';
import type { DrawnFilmInFormat } from '../direction/drawn-film.ts';
import type { DrawnBrowser, Footage } from './ports.ts';
import { type Shot, filmsOwn } from './shoot.ts';

// A drawn frame is one exposure: the page draws its moment alone
const NO_EARLIER_EXPOSURES: readonly Uint8Array[] = [];

export async function shootDrawn(film: DrawnFilmInFormat, browser: DrawnBrowser, footage: Footage): Promise<Shot> {
	await using served = await filmsOwn('serve', () => film.serve());
	await using page = await browser.openDrawn(served.address, film.format.frame);
	const frames = shotAt(page.duration, film.framesPerSecond);
	footage.expect(frames);
	let shot = 0;
	for (; shot < frames && !footage.complete(shot); shot += 1) {
		if (!footage.keeps(shot)) continue;
		await page.drawAt(momentOf(shot, film.framesPerSecond));
		await footage.keep(shot, { earlier: NO_EARLIER_EXPOSURES, own: await page.capture() });
	}
	return { frames: shot, seconds: momentOf(shot, film.framesPerSecond) };
}
