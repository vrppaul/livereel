/**
 * Keys a person presses, shown as caps at the frame's foot: a shortcut pressed in the page, so the viewer learns it.
 * Keys typed as text are heard, not shown.
 */
import { A_STRING, type Kind, ListOf } from '../domain/handed.ts';

/**
 * The caps of a shortcut, each a key's name as it is written on it, the key the stage knows them by, and how far they
 * have come up, from 0 to 1.
 */
export interface Keys {
	readonly caps: readonly string[];
	readonly key: string;
	readonly shown: number;
}

export const A_CAPS: Kind<readonly string[]> = new ListOf(A_STRING, 'the keys: their names, as ["⌘", "Enter"]');
