// A film that plays a file that is there but holds no sound: a page, which ffmpeg reads no sound from
import { defineFilm, play, sound } from 'livereel';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: new URL('../../smoke/page.html', import.meta.url).href,
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [play({ seconds: 0.2, moves: [sound.play('../../smoke/page.html')] })]
});
