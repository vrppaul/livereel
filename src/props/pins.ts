/**
 * Pins: numbered marks laid on blocks of the page one after another, a path the viewer follows. Each new pin comes up
 * with its label; the labels before it quieten, their numbers staying. They lie on the screen as the light does, so
 * the camera carries them with the page; each block is read once, as its pin comes. Which way a label runs is worked
 * out every frame from where the camera shows the block, so it runs toward the view's middle and stays on the frame.
 */
import { type Camera, onTheFrame } from '../domain/camera.ts';
import { type Box, type Size, middleX } from '../domain/geometry.ts';

/**
 * The ways a pin's label runs from its mark: left from the block's top left corner, right from its top right one, or,
 * on a block as wide as half the view, right from its top left corner, over the block.
 */
type Run = 'left' | 'right' | 'over';

/** A pin on a block, as the screen showed it, its label, and how far it has come up, from 0 to 1. */
interface Pin {
	readonly box: Box;
	readonly label: string;
	readonly shown: number;
}

/** The pins laid so far, in order, the key the stage knows them by, and how far they have gone, from 0 to 1. */
export interface Pins {
	readonly pins: readonly Pin[];
	readonly key: string;
	readonly gone: number;
}

/** A pin as the stage draws it: its number on the path, which way its label runs, and whether it is quietened. */
export interface DrawnPin extends Pin {
	readonly number: number;
	readonly runs: Run;
	readonly quiet: boolean;
}

export interface DrawnPins {
	readonly pins: readonly DrawnPin[];
	readonly key: string;
	readonly gone: number;
}

// The path is counted from one; a block as wide on the frame as this share of the view has its label run over it
const FIRST = 1;
const WIDE_SHARE_OF_THE_VIEW = 0.5;
const HALVES = 2;

export function drawnPins(pins: Pins, camera: Camera, frame: Size): DrawnPins {
	const latest = pins.pins.length - FIRST;
	return {
		pins: pins.pins.map((pin, place) => ({
			...pin,
			number: place + FIRST,
			runs: runsOn(pin.box, camera, frame),
			quiet: place < latest
		})),
		key: pins.key,
		gone: pins.gone
	};
}

/** The key the stage knows pins by, to lay them out anew only when one is laid: their labels, in order. */
export function keyOf(labels: readonly string[]): string {
	return JSON.stringify(labels);
}

/** Which way a block's label runs: over a wide block, else toward the view's middle from the corner nearer to it. */
function runsOn(box: Box, camera: Camera, frame: Size): Run {
	const topLeft = onTheFrame(camera, frame, { left: box.left, top: box.top });
	const topRight = onTheFrame(camera, frame, { left: box.left + box.width, top: box.top });
	if (topRight.left - topLeft.left > camera.view.box.width * WIDE_SHARE_OF_THE_VIEW) return 'over';
	const blockMiddle = (topLeft.left + topRight.left) / HALVES;
	return blockMiddle > middleX(camera.view.box) ? 'left' : 'right';
}
