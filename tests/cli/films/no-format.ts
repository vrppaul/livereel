// A film that names no format to be shot in
import { atAddress, defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: {},
	serve: () => atAddress(new URL('../../smoke/page.html', import.meta.url).href),
	ready: () => Promise.resolve(),
	steps: () => [hold({ seconds: 0.2 })]
});
