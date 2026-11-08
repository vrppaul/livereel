// A film said to be drawn by its own page, whose page answers livereel by nothing: a page of the disk
import { atAddress, defineDrawnFilm } from 'livereel';

export default defineDrawnFilm({
	formats: { small: { frame: { width: 320, height: 320 } } },
	serve: () => Promise.resolve(atAddress(new URL('../../smoke/page.html', import.meta.url).href))
});
