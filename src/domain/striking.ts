/**
 * A keyboard's strikes as a hand strikes them: which of its recorded strikes each key is, how hard it lands and how
 * high it sounds.
 *
 * A keyboard is a few strikes, each recorded alone. Laid in turn, each as it was recorded, a typed line is heard as one
 * short loop: the same four sounds round again, and typed at an even pace a beat of their own, bare where no music
 * plays over it. So each key is a strike drawn by chance, never the one before it, landing as loud as its file or a
 * little quieter and sounding a little higher or lower, as no finger lands twice alike. It lands on one of a few steps
 * of each, so the keys of a film are a few dozen sounds, not one for every key: whoever lays them lays each sound once,
 * however long the film types. The draws come from one seed (`src/domain/chance.ts`), so a film heard twice is heard
 * the same.
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
// How a key lands: as loud as its file at most, as a keyboard's strikes share one peak, down to about 3 dB under it, on
// one of so many steps evenly apart; and up to about a semitone higher or lower, on one of so many
const LOUDNESS = { quietest: 0.7, loudest: 1, steps: 5 };
const PITCH = { lowest: 0.94, highest: 1.06, steps: 7 };
// A step's place among its steps counts from none to one short of them, so the last stands at the range's end
const LAST_STEP_SHORT = 1;
// A strike after another is one of the others: the strikes but the one before, each so many places on from it
const THE_ONE_BEFORE = 1;
const FIRST_PLACE_ON = 1;

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
			loudness: between(LOUDNESS.quietest, LOUDNESS.loudest, this.stepAmong(LOUDNESS.steps)),
			pitch: between(PITCH.lowest, PITCH.highest, this.stepAmong(PITCH.steps))
		};
	}

	/** The first key is any strike; each after it one of the others, where the keyboard has others. */
	private placeAmong(strikes: number): number {
		if (this.before === null) return this.oneOf(strikes);
		const placesOn = FIRST_PLACE_ON + this.oneOf(strikes - THE_ONE_BEFORE);
		return (this.before + placesOn) % strikes;
	}

	/** One of so many steps evenly apart, as its share of the way from the first to the last. */
	private stepAmong(steps: number): number {
		return this.oneOf(steps) / (steps - LAST_STEP_SHORT);
	}

	/** One of so many by chance, counted from none. */
	private oneOf(many: number): number {
		return Math.floor(this.chance.uniform() * many);
	}
}
