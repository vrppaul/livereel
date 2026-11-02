/**
 * The keys a move's value goes through on its way, as a film writes them beside where it goes: `through`, the keys in
 * order, and the way's `shape` and `pace` (`src/domain/path.ts`), each the recommended one where the film names none.
 * A shape or a pace with no key to go through says nothing, and a list of no keys names none, so each is refused as
 * the move is made.
 */
import { FilmError } from '../domain/errors.ts';
import { type Form, type Kind, ListOf } from '../domain/handed.ts';
import { A_PACE, A_SHAPE, type Course, type Pace, RECOMMENDED_COURSE, type Shape } from '../domain/path.ts';

/** The keys a move's value goes through, in order, and how its way goes through them. */
export interface ThroughScript<Key> {
	readonly through?: readonly Key[];
	readonly shape?: Shape;
	readonly pace?: Pace;
}

/** The form of a move's keys and its way's course, its keys of a kind, said as a list of them. */
export function throughFormOf<Key>(key: Kind<Key>, said: string): Form<ThroughScript<Key>> {
	return { through: new ListOf(key, said), shape: A_SHAPE, pace: A_PACE };
}

/** The keys a film names for a move's way: none where it names none. */
export function keysOf<Key>(script: ThroughScript<Key>): readonly Key[] {
	return script.through ?? [];
}

/** The course a film names for a move's way; refused where it names no key to go through, or a list of none. */
export function courseWritten(script: ThroughScript<unknown>, move: string): Course {
	if (script.through === undefined) {
		if (script.shape === undefined && script.pace === undefined) return RECOMMENDED_COURSE;
		throw new FilmError(
			`${move}'s shape and pace say how a way goes through keys: name the keys in through, or leave them out`
		);
	}
	if (script.through.length === 0)
		throw new FilmError(`${move}'s through names no key: name one or more, or leave it out`);
	return { shape: script.shape ?? RECOMMENDED_COURSE.shape, pace: script.pace ?? RECOMMENDED_COURSE.pace };
}
