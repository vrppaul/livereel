// A film whose page never stands as its first frame shows it
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	format: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: () => Promise.reject(new Error('the page never came')),
	steps: () => [hold({ seconds: 0.2 })]
});
