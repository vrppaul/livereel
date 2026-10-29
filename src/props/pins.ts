/**
 * Pins: numbered marks laid on blocks of the page one after another, a path the viewer follows. Each new pin comes up
 * with its label; the labels before it quieten, their numbers staying. They lie on the screen as the light does, so
 * the camera carries them with the page; each block is read once, as its pin comes.
 */
import type { Box } from '../domain/geometry.ts';

/** The ways a pin's label runs from its mark: toward the screen's middle, so it stays on the frame. */
export type Run = 'left' | 'right';

/**
 * A pin on a block, as the screen showed it, its label, the way the label runs from the mark, which stands on the
 * block's top corner on that side's far end, and how far it has come up, from 0 to 1.
 */
export interface Pin {
	readonly box: Box;
	readonly label: string;
	readonly runs: Run;
	readonly shown: number;
}

/** The pins laid so far, in order, the key the stage knows them by, and how far they have gone, from 0 to 1. */
export interface Pins {
	readonly pins: readonly Pin[];
	readonly key: string;
	readonly gone: number;
}

/** A pin as the stage draws it: its number on the path, and whether a later pin has quietened its label. */
interface DrawnPin extends Pin {
	readonly number: number;
	readonly quiet: boolean;
}

export interface DrawnPins {
	readonly pins: readonly DrawnPin[];
	readonly key: string;
	readonly gone: number;
}

// The path is counted from one
const FIRST = 1;

export function drawnPins(pins: Pins): DrawnPins {
	const latest = pins.pins.length - FIRST;
	return {
		pins: pins.pins.map((pin, place) => ({ ...pin, number: place + FIRST, quiet: place < latest })),
		key: pins.key,
		gone: pins.gone
	};
}

/** The key the stage knows pins by, to lay them out anew only when one is laid. */
export function keyOf(pins: readonly Pin[]): string {
	return JSON.stringify(pins.map((pin) => pin.label));
}
