// A film whose cursor clicks the page's heading: livereel's own click, laid under its video
import { atAddress, cursor, defineFilm, hold, play } from 'livereel';

const HEADING = 'h1';

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href)),
	ready: (context) => context.page.locator(HEADING).waitFor(),
	steps: () => [
		play({ seconds: 0.1, moves: [cursor.to(HEADING)] }),
		...cursor.click(() => Promise.resolve()),
		hold({ seconds: 0.1 })
	]
});
