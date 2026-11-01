/**
 * Draws from a seed by a generator of livereel's own (mulberry32), so what a film draws — a typist's rhythm, the signs
 * scrambled letters stand as — is drawn the same on any Node, shot after shot.
 */

// mulberry32's constants: the step its state moves by, the shifts and the odd number it mixes with, and the range
// of the 32-bit numbers it draws, which a draw is divided by to fall between 0 and 1
const MULBERRY_STEP = 0x6d2b79f5;
const FIRST_SHIFT = 15;
const SECOND_SHIFT = 7;
const LAST_SHIFT = 14;
const MIXING_ODD = 61;
const THIRTY_TWO_BITS = 4_294_967_296;
// FNV-1a's start and the prime it mixes each character by, which make a text a seed
const TEXT_SEED_START = 0x811c9dc5;
const TEXT_SEED_PRIME = 0x01000193;

/** A seed drawn from a text, so two texts draw apart: FNV-1a over its characters. */
export function seedOf(text: string): number {
	let seed = TEXT_SEED_START;
	for (let place = 0; place < text.length; place += 1) {
		seed = Math.imul(seed ^ text.charCodeAt(place), TEXT_SEED_PRIME);
	}
	return seed >>> 0;
}

/** Draws one after another from a seed. */
export class Chance {
	private state: number;

	constructor(seed: number) {
		this.state = seed >>> 0;
	}

	/** The next draw, from 0 up to 1. */
	uniform(): number {
		this.state = (this.state + MULBERRY_STEP) >>> 0;
		let mixed = Math.imul(this.state ^ (this.state >>> FIRST_SHIFT), this.state | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> SECOND_SHIFT), mixed | MIXING_ODD);
		return ((mixed ^ (mixed >>> LAST_SHIFT)) >>> 0) / THIRTY_TWO_BITS;
	}
}
