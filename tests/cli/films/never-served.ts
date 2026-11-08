// A film whose own server does not start: its command says why, and ends
import { defineFilm, hold } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: 'http://127.0.0.1:8761/',
	serve: 'echo the port is taken >&2; exit 3',
	ready: () => Promise.resolve(),
	steps: () => [hold({ seconds: 0.2 })]
});
