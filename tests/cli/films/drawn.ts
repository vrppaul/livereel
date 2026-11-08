// A film its own page draws, half a second long: the page answers livereel and draws each moment itself
import { defineDrawnFilm } from 'livereel';

export default defineDrawnFilm({
	formats: { small: { frame: { width: 320, height: 320 } } },
	address: new URL('../../smoke/drawn.html', import.meta.url).href
});
