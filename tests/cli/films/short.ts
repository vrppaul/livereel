// A film of a fifth of a second of a page on the disk: what the command line is tried on
import { defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: new URL('../../smoke/page.html', import.meta.url).href,
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [hold({ seconds: 0.2 })]
});
