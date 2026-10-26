// A film that plays a file that is there but holds no sound: a page, which ffmpeg reads no sound from
import { atAddress, defineFilm, play, sound } from 'livereel';

const PAGE = new URL('../../smoke/page.html', import.meta.url).href;

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	serve: () => Promise.resolve(atAddress(PAGE)),
	ready: (context) => context.page.locator('h1').waitFor(),
	steps: () => [play({ seconds: 0.2, moves: [sound.play('../../smoke/page.html')] })]
});
