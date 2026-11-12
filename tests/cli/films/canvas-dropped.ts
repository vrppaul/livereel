// A film of a room whose thing has the room's canvas dropped once a frame is drawn, as a graphics card out of memory
// drops it (tests/smoke/canvas-lost.js): what the command line says of a fault that is the machine's, met in a take
import { defineFilm, hold, play, thing } from 'livereel';

// A card of the film's things module, about the frame's middle
const A_CARD = { at: 'whole', reach: { width: 540, height: 360 }, values: { turn: 0 } } as const;

export default defineFilm({
	formats: { small: { frame: { width: 320, height: 320 }, screen: { width: 480, height: 320 } } },
	address: new URL('../../smoke/page.html', import.meta.url).href,
	ready: (context) => context.page.locator('h1').waitFor(),
	drawing: 'room',
	things: '../../smoke/canvas-lost.js',
	steps: () => [hold({ seconds: 0.1 }), play({ seconds: 0.1, moves: [thing.show('dropper', A_CARD)] })]
});
