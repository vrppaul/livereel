/**
 * How a film has what comes and goes in a way (`src/props/way.ts`) come and go: an object (`src/moves/object.ts`), and
 * what lies over the frame alone, a caption and keys. A film names the way it comes up in, `enter`, or goes in,
 * `leave`, one of livereel's, and the `edge` a mask or a wipe comes from; naming none, it comes up and goes in its own
 * way, as what it shows does of itself. What comes up in a way stands as far as its move has come, from none to whole,
 * and goes as far as its move has gone, until it is gone.
 */
import { FilmError } from '../domain/errors.ts';
import { NONE, fractionOf } from '../domain/fraction.ts';
import { A_FRAME_SIDE, type FrameSide } from '../domain/geometry.ts';
import type { Form } from '../domain/handed.ts';
import { TIMING_FORM, type TimingScript, untilTheEnd } from '../direction/move.ts';
import { A_WAY, type Way, type WayCome, type WayName, comesFromAnEdge, wayNamed } from '../props/way.ts';

/**
 * The way something comes up in its place, `enter`, one of livereel's, where it does not come up in its own; for a mask
 * or a wipe, the `edge` of its box it comes from, the way's own where none is named.
 */
export interface EnterScript {
	readonly enter?: WayName;
	readonly edge?: FrameSide;
}

/** The way something goes from its place, `leave`, and the `edge` a mask or a wipe goes back to, as it would enter. */
export interface LeaveScript {
	readonly leave?: WayName;
	readonly edge?: FrameSide;
}

/**
 * How what stands where it comes up, never sliding in, comes up: a caption and keys, one of each, and a piece of the
 * page, an outline and a lens, over what they show of the page.
 */
export interface InPlaceShowScript extends TimingScript, EnterScript {}

/** How what stands where it comes up goes. */
export interface InPlaceHideScript extends TimingScript, LeaveScript {}

export const ENTER_FORM: Form<EnterScript> = { enter: A_WAY, edge: A_FRAME_SIDE };
export const LEAVE_FORM: Form<LeaveScript> = { leave: A_WAY, edge: A_FRAME_SIDE };
export const IN_PLACE_SHOW_FORM: Form<InPlaceShowScript> = { ...ENTER_FORM, ...TIMING_FORM };
export const IN_PLACE_HIDE_FORM: Form<InPlaceHideScript> = { ...LEAVE_FORM, ...TIMING_FORM };

/**
 * The way a film names something to come up or go, from the edge it names; its own way where it names none. An edge is
 * refused for a way that comes from none, and named for no way at all.
 */
export function wayOf(name: WayName | undefined, edge: FrameSide | undefined, move: string): Way {
	if (edge !== undefined && (name === undefined || !comesFromAnEdge(name))) {
		throw new FilmError(`${move} names an edge, which goes only with a mask or a wipe`);
	}
	return wayNamed(name ?? null, edge ?? null);
}

/** What comes up in a way, `progress` of its move along: as far come up, and not going. */
export function comingIn(way: Way, progress: number): WayCome {
	return { way, shown: fractionOf(progress), gone: NONE };
}

/** What stands going in a way, `progress` of its move along: as far gone; once gone, none. */
export function goneIn<Coming extends WayCome>(standing: Coming, way: Way, progress: number): Coming | null {
	return untilTheEnd(progress, { ...standing, way, gone: fractionOf(progress) });
}
