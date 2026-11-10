/**
 * The body of the page's window in a room, the window's own (`PageWindow.body` in `src/props/window.ts`): a slab of
 * metal round the page with glass over it, as a tablet is made. A film gives the window a body and changes it by one
 * move, `window.body`, which sets the values it names: in a play, a length, a share and the metal's colour through the
 * values between; in a cut, at once. The window opens on livereel's, a slab of no thickness, which is none; the stage
 * is handed it as the room draws it, with the window (`DrawnBody` in `src/props/window.ts`).
 *
 * One table, `SLAB_KINDS`, says of each value what a film may write for it and how it moves (`src/domain/values.ts`),
 * so a move's body is checked by it and the window's moved by it, and livereel's own values stand in `LIVEREELS_SLAB`.
 */
import { opaqueColourToward } from '../domain/colour.ts';
import { AN_OPAQUE_COLOUR, A_PIXELS, A_SHARE } from '../domain/handed.ts';
import { amountToward, namesOf, shareToward } from '../domain/toward.ts';
import { type KindsOf, ValueKind, asWritten } from '../domain/values.ts';

/**
 * A slab of metal round the page, glass over it: how thick it is, 0 none, and how far its rim reaches past the page all
 * round, each in pixels of a frame 1080 on its shorter side; the metal's colour, in hex with no alpha, and how rough
 * it is, from 0, a mirror, to 1, matte; and how much of the world's light the glass over the page reflects, from 0,
 * none, to 1, a whole coat of it.
 */
export interface Slab {
	readonly thickness: number;
	readonly rim: number;
	readonly metal: string;
	readonly roughness: number;
	readonly glass: number;
}

/** A slab as a film writes it: any of its values, the rest as they stand. */
export type SlabScript = Partial<Slab>;

/**
 * The kind of each value of a slab, by its name: its lengths never below none, its roughness and glass shares between
 * none and whole, each on a curve that passes their ends, and its metal mixed with no alpha, as three reads a colour;
 * each held as written.
 */
export const SLAB_KINDS: KindsOf<Slab> = {
	thickness: new ValueKind(A_PIXELS, asWritten, amountToward),
	rim: new ValueKind(A_PIXELS, asWritten, amountToward),
	metal: new ValueKind(AN_OPAQUE_COLOUR, asWritten, opaqueColourToward),
	roughness: new ValueKind(A_SHARE, asWritten, shareToward),
	glass: new ValueKind(A_SHARE, asWritten, shareToward)
};

/** The names of a slab's values, in the order a refusal says them. */
export const SLAB_NAMES = namesOf(SLAB_KINDS);

/**
 * livereel's own body: no thickness, so none, its rim, a dark metal half rough and glass as strong as the reference
 * promo's, for a film that names only how thick.
 */
export const LIVEREELS_SLAB: Slab = { thickness: 0, rim: 6, metal: '#454b56', roughness: 0.45, glass: 0.4 };
