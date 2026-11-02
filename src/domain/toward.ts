/**
 * Values a move sets by name, each on its way from where it stood to where the film sends it by the rule of its kind:
 * a share held between none and whole and pixels never below none, however far past its ends a curve takes them; a
 * place or a number passing its ends with it. A move that sets only the values a film names writes those alone, so
 * another move of the same thing sets the rest in the same step (`Move.valueNames` in `src/direction/move.ts`): the
 * film's look, an object's effects, the window's shade. The names of a table by name are read here once, for those
 * values and for a film's formats.
 */
import { type Fraction, fractionOf } from './fraction.ts';
import { between } from './time.ts';

/** How a value moves: where it stands `progress` of the way from one to another. */
type Toward<Value> = (start: Value, end: Value, progress: number) => Value;

/** How each of some values moves, by its name, among whatever else its kind holds. */
export type MovingBy<Values> = { readonly [Name in keyof Values]: { readonly toward: Toward<Values[Name]> } };

// No length at all, which pixels never go below
export const NO_PIXELS = 0;
// How a share and pixels move, held at their bounds, and a value passing its ends with its curve, as a table of values
// by name holds each (`MovingBy`)
export const MOVES_AS_A_SHARE = { toward: shareToward };
export const MOVES_AS_PIXELS = { toward: pixelsToward };
export const MOVES_WITH_THE_CURVE = { toward: between };

/** The values named, and no other, each `progress` of the way from where it stood to where it goes, as it moves. */
export function namedToward<Values>(
	moving: MovingBy<Values>,
	start: Values,
	end: Values,
	names: readonly (keyof Values)[],
	progress: number
): Partial<Values> {
	return names.reduce<Partial<Values>>(
		(values, name) => ({ ...values, [name]: valueToward(moving, start, end, name, progress) }),
		{}
	);
}

/** One value `progress` of the way from where it stood to where it goes, as its kind moves. */
function valueToward<Values, Name extends keyof Values>(
	moving: MovingBy<Values>,
	start: Values,
	end: Values,
	name: Name,
	progress: number
): Values[Name] {
	return moving[name].toward(start[name], end[name], progress);
}

/**
 * The names of a table's values, in the order it holds them: every key of the table is one, but `Object.keys` types
 * each as a bare string.
 */
export function namesOf<Values extends object>(table: Values): readonly Extract<keyof Values, string>[] {
	return Object.keys(table).filter((name): name is Extract<keyof Values, string> => Object.hasOwn(table, name));
}

/** Whether each value named stands where it rests, as values a stage draws nothing of there. */
export function standsAtRest<Values>(values: Values, rest: Values, names: readonly (keyof Values)[]): boolean {
	return names.every((name) => values[name] === rest[name]);
}

/** A share `progress` of the way from one to another, held between none and whole. */
export function shareToward(start: number, end: number, progress: number): Fraction {
	return fractionOf(between(start, end, progress));
}

/** Pixels `progress` of the way from one length to another, never below none. */
export function pixelsToward(start: number, end: number, progress: number): number {
	return Math.max(NO_PIXELS, between(start, end, progress));
}
