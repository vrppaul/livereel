/**
 * A table of values a film writes by name and moves, as the film's look and the world's look are: one kind for each
 * value says what a film may write for it, how the table holds what it writes, and how it moves. So the kinds are the
 * form a film's values are checked against (`assertWritten` in `src/domain/handed.ts`), what a film writes takes the
 * place of the values standing, each as the table holds it, and a move sets the values it names alone, each as its
 * kind moves, the rest as they stand each frame: two moves of one table share a step where they name no value alike.
 */
import type { Kind } from './handed.ts';
import { type MovingBy, type Toward, namedToward, namesOf } from './toward.ts';

/**
 * A kind of a table's values: what a film may write for one, how the table holds what it writes, and the value a share
 * of the way from one to another.
 */
export class ValueKind<Value, Held = Value> implements Kind<Value> {
	readonly accepted: Kind<Value>;
	readonly held: (written: Value) => Held;
	readonly toward: Toward<Held>;

	constructor(accepted: Kind<Value>, held: (written: Value) => Held, toward: Toward<Held>) {
		this.accepted = accepted;
		this.held = held;
		this.toward = toward;
	}

	is(written: unknown): written is Value {
		return this.accepted.is(written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return this.accepted.faultOf(written, place);
	}
}

/** The kind of each value of a table, by its name: of what a film writes for it, and of what the table holds. */
export type KindsOf<Values, Written extends { readonly [Name in keyof Values]: unknown } = Values> = {
	readonly [Name in keyof Values]: ValueKind<Written[Name], Values[Name]>;
};

/** A table's values on their way: those they start from, those they go to, and the names of those that move. */
export interface ValuesMoving<Values> {
	readonly start: Values;
	readonly end: Values;
	readonly names: readonly (keyof Values)[];
}

/**
 * A table's values with those a film writes in place of their own, each as the table holds it. A value a film wrote as
 * `undefined` is one it left out, as every value a film writes is read (`src/domain/handed.ts`), so it does not take
 * the place of the value standing.
 */
export function valuesWith<Values, Written extends { readonly [Name in keyof Values]: unknown }>(
	values: Values,
	written: Partial<Written>,
	kinds: KindsOf<Values, Written>
): Values {
	return Object.assign({}, values, Object.fromEntries(namesOf(kinds).flatMap((name) => heldIn(written, kinds, name))));
}

/** A value a film writes, by its name, as the table holds it; none, where the film leaves it out. */
function heldIn<Values, Written extends { readonly [Name in keyof Values]: unknown }, Name extends keyof Values>(
	written: Partial<Written>,
	kinds: KindsOf<Values, Written>,
	name: Name
): readonly [Name, Values[Name]][] {
	const value = written[name];
	return value === undefined ? [] : [[name, kinds[name].held(value)]];
}

/**
 * A table's values as they stand, with those named `progress` of the way from where they start to where they go, each
 * as its kind moves; every other value as it stands, so a move of other values at once keeps what it sets.
 */
export function valuesToward<Values>(
	values: Values,
	moving: ValuesMoving<Values>,
	kinds: MovingBy<Values>,
	progress: number
): Values {
	return { ...values, ...namedToward(kinds, moving.start, moving.end, moving.names, progress) };
}

/** A value a table holds as a film writes it. */
export function asWritten<Value>(written: Value): Value {
	return written;
}
