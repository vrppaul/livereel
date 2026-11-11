/**
 * The world's grain, a part of the world's look (`world.grain` in `src/props/world.ts`): a faint noise over the ground,
 * as the reference promo laid one over its backdrop. A glow fading across a dark ground falls into bands, as eight bits
 * hold a colour in 255 steps and a dark glow spans few of them; a noise of a level or so either way hides where one step
 * meets the next. As the promo's, it lies on the ground alone, under the window and all else, so a page and the words
 * over it stand as they are drawn; it moves each colour of each pixel of the frame apart, and stands still from frame to
 * frame, as the promo drew its backdrop once. livereel's own world has none.
 *
 * A film writes how many levels of 255 it moves a colour either way, evenly, as the promo's moved one level, or turns
 * it off. The world holds the levels, none where it is off, so a move takes the grain through the levels between. The
 * stage is handed how far it spreads a colour (`drawnGrain`), as the stage's noise is of a kind of its own, not even,
 * and drawn as strongly as spreads a colour as far.
 */
import { type Kind, OfForm, Plain, isMoreThanNone, needed } from '../domain/handed.ts';
import { type TurnedOff, isTurnedOff } from '../domain/turned-off.ts';

/** Grain of so many levels of 255, which it moves a colour either way, evenly. */
export interface Grain {
	readonly levels: number;
}

/** The world's grain as a film writes it: turned off, or of so many levels. */
export type GrainScript = TurnedOff | Grain;

// Grain of no levels, which moves no colour
const NONE = 0;
// The levels eight bits hold a colour in, which grain is written in
const CHANNEL_LEVELS = 255;
// How far an even noise spanning a level either way spreads a colour, its standard deviation, in levels: the root of
// the mean of its square, a level's square shared by three
const SHARED_BY = 3;
const EVEN_SPREAD_OF_A_LEVEL = Math.sqrt(1 / SHARED_BY);

const A_LEVEL_COUNT = new Plain(
	isMoreThanNone,
	'how many levels of 255 grain moves a colour either way, a number more than 0'
);

/** The kind of the world's grain, as a film writes it: turned off, or of a form of so many levels. */
class GrainKind implements Kind<GrainScript> {
	readonly ofLevels: OfForm<Grain>;

	constructor(ofLevels: OfForm<Grain>) {
		this.ofLevels = ofLevels;
	}

	is(written: unknown): written is GrainScript {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		return isTurnedOff(written) ? undefined : this.ofLevels.faultOf(written, place);
	}
}

/** The world's grain, as a film writes it. */
export const A_GRAIN = new GrainKind(
	new OfForm<Grain>(
		{ levels: needed(A_LEVEL_COUNT) },
		'{ enabled: false } for none, or grain of so many levels: { levels }'
	)
);

/** The levels grain a film writes moves a colour either way, as the world holds it: none where it is turned off. */
export function levelsOf(written: GrainScript): number {
	return isTurnedOff(written) ? NONE : written.levels;
}

/**
 * Grain of so many levels as the stage draws it: how far it spreads a colour, its standard deviation, in shares of a
 * colour's whole; none of no levels.
 */
export function drawnGrain(levels: number): number | null {
	return levels > NONE ? (levels * EVEN_SPREAD_OF_A_LEVEL) / CHANNEL_LEVELS : null;
}
