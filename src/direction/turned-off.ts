/**
 * How a film turns off something livereel does unasked — its sounds, one of them, its blur: by saying so, never by a
 * `null` or an empty value that means it. One form for all, so a film reads the same wherever it turns a thing off.
 */
import { FilmError } from '../domain/errors.ts';
import { type Handed, described, isObjectOfValues } from './handed.ts';

/** Something livereel does unasked, turned off, as a film writes it. */
export interface TurnedOff {
	readonly enabled: false;
}

/** The one name a thing turned off is written with. */
const SWITCH = ['enabled'];

/** Whether what a film hands over, its types checked by nobody, is written as turned off, and as nothing else. */
export function isTurnedOff(written: unknown): written is TurnedOff {
	return (
		isObjectOfValues(written) &&
		written.enabled === false &&
		Object.keys(written).every((name) => SWITCH.includes(name))
	);
}

/**
 * Whether an object a film hands over for a thing livereel does unasked turns it off: `enabled` false; left out or
 * true, the thing stays on. Anything else is refused by the place it stands at.
 */
export function turnedOffBy(written: Handed, place: string): boolean {
	if (written.enabled === undefined || written.enabled === true) return false;
	if (written.enabled === false) return true;
	throw new FilmError(
		`the film's ${place}.enabled is ${described(written.enabled)}: it is false to turn it off, or true, or left out`
	);
}
