// A film whose own server does not start
import { defineFilm, hold } from 'livereel';

export default defineFilm({
	format: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } },
	serve: () => Promise.reject(new Error('the port is taken')),
	ready: () => Promise.resolve(),
	steps: () => [hold({ seconds: 0.2 })]
});
