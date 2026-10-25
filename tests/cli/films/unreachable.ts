// A film of a page nobody serves: nothing listens on the discard port
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	format: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
	serve: () => atAddress('http://127.0.0.1:9/'),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [hold({ seconds: 0.2 })]
});
