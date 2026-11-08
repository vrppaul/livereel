// A film whose own command serves a page, from behind a shell that waits on it, at a port the film's address is not
// at: livereel waits for the address until it is stopped, before any browser opens
import { defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: 'http://127.0.0.1:8763/',
	serve: 'node ../../smoke/serving.ts 8762 & wait',
	ready: () => Promise.resolve(),
	steps: () => [hold({ seconds: 0.2 })]
});
