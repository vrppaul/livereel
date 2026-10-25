// A film of a fifth of a second with livereel's sounds off and longer music under it: livereel's own ending sound
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [hold({ seconds: 0.2 })],
	sounds: null,
	music: { file: '../../../sounds/ending.ogg', volume: 0.5 }
});
