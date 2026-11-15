// A film's thing for the smoke tests that drops the room's canvas, as a graphics card out of memory drops it: built,
// it draws nothing; set, it has the canvas's WebGL lose its context through `WEBGL_lose_context` once the frame is
// drawn, as a card out of memory drops it after the frame that asked too much
const ROOMS_CANVAS = 'canvas.room';
const ROOMS_WEBGL = 'webgl2';
const LOSES_ITS_CONTEXT = 'WEBGL_lose_context';
const ONCE_THE_FRAME_IS_DRAWN = 0;

/** The room's canvas made to lose its WebGL context. */
function contextLost() {
	document.querySelector(ROOMS_CANVAS).getContext(ROOMS_WEBGL).getExtension(LOSES_ITS_CONTEXT).loseContext();
}

export default {
	dropper: {
		build: (three) => new three.Group(),
		set: () => setTimeout(contextLost, ONCE_THE_FRAME_IS_DRAWN)
	}
};
