/**
 * How a film turns off something livereel does unasked — its sounds, one of them, its blur: by saying so, never by a
 * `null` or an empty value that means it. One form for all, so a film reads the same wherever it turns a thing off.
 */

/** Something livereel does unasked, turned off, as a film writes it. */
export interface TurnedOff {
	readonly enabled: false;
}

/** Whether what a film hands over, its types checked by nobody, is written as turned off. */
export function isTurnedOff(written: unknown): written is TurnedOff {
	return typeof written === 'object' && written !== null && 'enabled' in written && written.enabled === false;
}
