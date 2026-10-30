/**
 * Keys a person presses, what an object shows (`src/props/object.ts`) over the whole frame: the caps of a shortcut at
 * the frame's foot, pressed in the page, so the viewer learns it. Keys typed as text are heard, not shown. A caption at
 * the frame's foot would cover them, so they rise clear of it as its ground comes up, and settle back as it goes.
 */
import { A_STRING, type Kind, ListOf } from '../domain/handed.ts';
import { type Caption, standsAtTheFoot } from './caption.ts';
import type { ObjectName } from './object.ts';
import { groundOf } from './words.ts';

/** The caps of a shortcut, each a key's name as it is written on it, and the key the stage knows them by. */
export interface Keys {
	readonly kind: 'keys';
	readonly caps: readonly string[];
	readonly key: string;
}

/**
 * Keys as the stage draws them: how much of them stands, from 0 to 1, and how far they have risen clear of a caption
 * at the frame's foot, from 0 to 1.
 */
export interface DrawnKeys extends Keys {
	readonly shown: number;
	readonly clearing: number;
}

/**
 * A caption standing on the frame as keys find it: the name of the object showing it, what it shows, and how far it has
 * come up and gone, from 0 to 1.
 */
export interface CaptionStanding {
	readonly name: ObjectName;
	readonly caption: Caption;
	readonly shown: number;
	readonly gone: number;
}

export const A_CAPS: Kind<readonly string[]> = new ListOf(A_STRING, 'the keys: their names, as ["⌘", "Enter"]');

// Keys stand at the frame's foot, risen none, where no caption stands there
const NOT_RISEN = 0;

/** The caps of a shortcut, named as they are written on the keys. */
export function keysOf(caps: readonly string[]): Keys {
	return { kind: 'keys', caps, key: JSON.stringify(caps) };
}

/**
 * Keys as the stage draws them, standing `shown` of the way, risen clear of the caption standing on the frame as far as
 * its ground has come up where it stands at the frame's foot; none where it stands at the top, or none stands.
 */
export function drawnKeys(keys: Keys, shown: number, under: CaptionStanding | null): DrawnKeys {
	const clearing = standOver(under) ? groundOf(under.shown, under.gone) : NOT_RISEN;
	return { ...keys, shown, clearing };
}

/** Whether keys stand over the words of the caption standing on the frame: where it stands at the frame's foot. */
export function standOver(under: CaptionStanding | null): under is CaptionStanding {
	return under !== null && standsAtTheFoot(under.caption);
}
