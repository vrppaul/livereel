/**
 * Keys a person presses, a prop of the scene over the whole frame: the caps of a shortcut at the frame's foot, pressed
 * in the page, so the viewer learns it. Keys typed as text are heard, not shown. They lie over the frame alone, over
 * every object and the caption, one shortcut at a time, known by no name. A caption at the frame's foot would cover
 * them, so they stand over its words, rising clear of them as its ground comes up, and settle back as it goes; they
 * keep standing when the caption has gone.
 */
import { A_STRING, type Kind, ListOf } from '../domain/handed.ts';
import { type Caption, standsAtTheFoot } from './caption.ts';
import { type OnItsWay, type WayCome, alongItsWay, presencesIn, presentShare } from './way.ts';
import { groundOf } from './words.ts';

/** The caps of a shortcut, each a key's name as it is written on it, and the key the stage knows them by. */
export interface Caps {
	readonly caps: readonly string[];
	readonly key: string;
}

/** Keys on the scene: their caps, and how far they have come up and gone, in the way they come. */
export interface Keys extends Caps, WayCome {}

/**
 * Keys as the stage draws them: their caps; how much of them stands, from 0 to 1, as their own way has them; whether
 * they stand over the words of a caption at the frame's foot, and how far they have risen clear of them, from 0 to 1;
 * and their caps' way, none standing.
 */
export interface DrawnKeys extends Caps {
	readonly shown: number;
	readonly overTheCaption: boolean;
	readonly clearing: number;
	readonly onItsWay: OnItsWay | null;
}

export const A_CAPS: Kind<readonly string[]> = new ListOf(A_STRING, 'the keys: their names, as ["⌘", "Enter"]');

// Keys stand at the frame's foot, risen none, where no caption stands there
const NOT_RISEN = 0;

/** The caps of a shortcut, named as they are written on the keys. */
export function capsOf(caps: readonly string[]): Caps {
	return { caps, key: JSON.stringify(caps) };
}

/**
 * Keys as the stage draws them, over the words of the caption standing, risen clear of them as far as its ground has
 * come up, where it stands at the frame's foot; at the frame's foot, risen none, where it stands at the top, or none
 * stands.
 */
export function drawnKeys(keys: Keys, caption: Caption | null): DrawnKeys {
	const under = caption !== null && standsAtTheFoot(caption) ? caption : null;
	return {
		caps: keys.caps,
		key: keys.key,
		shown: presentShare(presencesIn(keys.way, keys).figure),
		overTheCaption: under !== null,
		clearing: under === null ? NOT_RISEN : groundOf(under.shown, under.gone),
		onItsWay: alongItsWay(keys.way, presentShare(keys))
	};
}
