/**
 * What a film hands livereel, read as it may come. A film runs with its types stripped and checked by nobody, so a
 * form livereel reads off it is checked as it enters: a value of the wrong kind, a list for an object, or a name its
 * form has not, as `enable` for `enabled`, is refused by where it stands and as it was written, so a value meant one
 * way is never read another.
 */
import { FilmError } from '../domain/errors.ts';

/** What a film hands over as an object, each of its values read as it may come. */
export type Handed = Readonly<Record<string, unknown>>;

/** Whether what a film hands over is an object of named values: not `null`, not a list. */
export function isObjectOfValues(written: unknown): written is Handed {
	return typeof written === 'object' && written !== null && !Array.isArray(written);
}

/** An object a film hands over, refused where it names a value its form has not, by the place it stands at. */
export function refuseNamesBeyond(written: Handed, form: readonly string[], place: string): void {
	const beyond = Object.keys(written).filter((name) => !form.includes(name));
	if (beyond.length === 0) return;
	throw new FilmError(`the film's ${place} names ${beyond.join(', ')}: it names ${form.join(', ')}, or fewer`);
}

/**
 * What a film handed over, as a refusal says it: a string quoted, a BigInt with its `n`, a function by its kind, an
 * object or a list as its JSON, anything else as JavaScript writes it (`NaN`, `null`, `undefined`).
 */
export function described(written: unknown): string {
	if (typeof written === 'string') return JSON.stringify(written);
	if (typeof written === 'bigint') return `${written}n`;
	if (typeof written === 'function') return 'a function';
	if (isObjectOfValues(written) || Array.isArray(written)) return JSON.stringify(written);
	return String(written);
}
