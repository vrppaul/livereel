// A film of a fifth of a second of a page on the disk: what the command line is tried on
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	format: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [hold({ seconds: 0.2 })]
});
