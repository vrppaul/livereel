// A film whose camera crosses its first frames fast, from the whole screen close onto its right edge, then holds
import { atAddress, camera, defineFilm, hold, lookingAt, play } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: (_served, whole) => [
		play({ seconds: 0.1, moves: [camera.to(lookingAt(whole, 400, 160, 2))] }),
		hold({ seconds: 0.1 })
	]
});
