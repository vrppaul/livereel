// A film whose steps livereel refuses as they are written: a step of no time
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	format: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
	serve: () => atAddress(new URL('../../smoke/page.html', import.meta.url).href),
	ready: () => Promise.resolve(),
	steps: () => [hold({ seconds: 0 })]
});
