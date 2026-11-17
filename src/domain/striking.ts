/**
 * A keyboard's strikes as a hand strikes them: which of its recorded strikes each key is, how hard it lands and how
 * high it sounds.
 *
 * A keyboard is a few strikes, each recorded alone. Laid in turn, each as it was recorded, a typed line is heard as one
 * short loop: the same four sounds round again, and typed at an even pace a beat of their own, bare where no music
 * plays over it. So each key is a strike drawn by chance, never the one before it, landing as loud as its file or a
 * little quieter and sounding a little higher or lower, as no finger lands twice alike. The draws come from one seed
 * (`src/domain/chance.ts`), so a film heard twice is heard the same.
 */
import { Chance } from './chance.ts';
import { between } from './toward.ts';

/** A key struck: its strike's place among its keyboard's, from 0, and how it lands, each 1 as its file is. */
export interface Strike {
	readonly place: number;
	readonly loudness: number;
	readonly pitch: number;
}

// The seed every hand draws from: "keys" in ASCII
const HAND_SEED = 0x6b657973;
// How a key lands: as loud as its file at most, as a keyboard's strikes share one peak, down to about 3 dB under it;
// and up to about a semitone higher or lower
const QUIETEST = 0.7;
const LOUDEST = 1;
const LOWEST = 0.94;
const HIGHEST = 1.06;
// A strike after another is one of the others: so many places on from it, at least one and short of a whole round
const NEXT_PLACE = 1;

/** One hand's strikes, drawn one after another. */
export class Striking {
	private readonly chance = new Chance(HAND_SEED);
	// The place of the strike before, none before the first key
	private before: number | null = null;

	/** The next key struck on a keyboard of so many strikes. */
	next(strikes: number): Strike {
		const place = this.placeAmong(strikes);
		this.before = place;
		return {
			place,
			loudness: between(QUIETEST, LOUDEST, this.chance.uniform()),
			pitch: between(LOWEST, HIGHEST, this.chance.uniform())
		};
	}

	/** The first key is any strike; each after it one of the others, where the keyboard has others. */
	private placeAmong(strikes: number): number {
		if (this.before === null) return Math.floor(this.chance.uniform() * strikes);
		const others = strikes - NEXT_PLACE;
		const placesOn = NEXT_PLACE + Math.floor(this.chance.uniform() * others);
		return (this.before + placesOn) % strikes;
	}
}
