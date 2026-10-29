/**
 * Keys a person presses, shown as caps at the frame's foot: a shortcut pressed in the page, so the viewer learns it.
 * Keys typed as text are heard, not shown. A caption at the frame's foot would cover them, so they rise clear of it as
 * its ground comes up, and settle back as it goes.
 */
import { A_STRING, type Kind, ListOf } from '../domain/handed.ts';
import { type DrawnCaption, standsAtTheFoot } from './caption.ts';

/**
 * The caps of a shortcut, each a key's name as it is written on it, the key the stage knows them by, and how far they
 * have come up, from 0 to 1.
 */
export interface Keys {
	readonly caps: readonly string[];
	readonly key: string;
	readonly shown: number;
}

/** Keys as the stage draws them: how far they have risen clear of a caption at the frame's foot, from 0 to 1. */
export interface DrawnKeys extends Keys {
	readonly clearing: number;
}

export const A_CAPS: Kind<readonly string[]> = new ListOf(A_STRING, 'the keys: their names, as ["⌘", "Enter"]');

// Keys stand at the frame's foot, risen none, where no caption stands there
const NOT_RISEN = 0;

/** Keys as the stage draws them, risen clear of a caption at the frame's foot as far as its ground has come up. */
export function drawnKeys(keys: Keys, caption: DrawnCaption | null): DrawnKeys {
	return { ...keys, clearing: caption !== null && standsAtTheFoot(caption) ? caption.ground : NOT_RISEN };
}
