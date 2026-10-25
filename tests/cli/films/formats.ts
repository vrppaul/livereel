// A film of a fifth of a second in two formats, a small square and a tall one
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: {
		small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
		tall: { frame: { width: 320, height: 480 }, screen: { width: 320, height: 480 } }
	},
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [hold({ seconds: 0.2 })]
});
