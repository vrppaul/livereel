// A film said to be drawn by its own page, whose page answers livereel by nothing: a page of the disk
import { defineDrawnFilm } from 'livereel';

export default defineDrawnFilm({
	formats: { small: { frame: { width: 320, height: 320 } } },
	address: new URL('../../smoke/page.html', import.meta.url).href
});
