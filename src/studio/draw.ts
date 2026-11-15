/**
 * A film its own page draws, shot in one of its formats. The page says how long the film is, so a still or a clip past
 * its end is refused before the first frame; a frame the footage does not keep is never drawn, as each is the page's at
 * its moment alone.
 */
import { momentOf, shotAt } from '../domain/time.ts';
import type { DrawnFilmInFormat } from '../direction/drawn-film.ts';
import type { DrawnBrowser, Footage, PageServer } from './ports.ts';
import type { Shot } from './shoot.ts';

/** What serves a drawn film's page, the browser it is opened in, and where its frames go. */
export interface DrawnShooting {
	readonly server: PageServer;
	readonly browser: DrawnBrowser;
	readonly footage: Footage;
}

// A drawn frame is one exposure: the page draws its moment alone
const NO_EARLIER_EXPOSURES: readonly Uint8Array[] = [];

export async function shootDrawn(film: DrawnFilmInFormat, shooting: DrawnShooting): Promise<Shot> {
	const { server, browser, footage } = shooting;
	await using served = await server.serve(film.site);
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
