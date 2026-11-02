/**
 * The keys a move's value goes through on its path, as a film writes them beside where it goes: `through`, the keys in
 * order, and the path's `shape` and `pace` (`src/domain/path.ts`), each the recommended one where the film names none,
 * read once as the move is made. A shape or a pace with no key to go through says nothing, and a list of no keys names
 * none, so each is refused then.
 */
import { FilmError } from '../domain/errors.ts';
import { type Form, type Kind, ListOf } from '../domain/handed.ts';
import { A_PACE, A_SHAPE, NO_KEYS, type Pace, RECOMMENDED_COURSE, type Shape, type Through } from '../domain/path.ts';

/** The keys a move's value goes through, in order, and how its path goes through them, as a film writes them. */
export interface ThroughScript<Key> {
	readonly through?: readonly Key[];
	readonly shape?: Shape;
	readonly pace?: Pace;
}

/** The form of a move's keys and its path's course, its keys of a kind, said as a list of them. */
export function throughFormOf<Key>(key: Kind<Key>, said: string): Form<ThroughScript<Key>> {
	return { through: new ListOf(key, said), shape: A_SHAPE, pace: A_PACE };
}

/** The keys and the course a film names for a move's path; refused where it names a course with no keys, or no key. */
export function throughWritten<Key>(script: ThroughScript<Key>, move: string): Through<Key> {
	if (script.through === undefined) {
		if (script.shape === undefined && script.pace === undefined) return NO_KEYS;
		throw new FilmError(
			`${move}'s shape and pace say how a path goes through keys: name the keys in through, or leave them out`
		);
	}
	if (script.through.length === 0) {
		throw new FilmError(`${move}'s through names no key: name one or more, or leave it out`);
	}
	return {
		keys: script.through,
		course: { shape: script.shape ?? RECOMMENDED_COURSE.shape, pace: script.pace ?? RECOMMENDED_COURSE.pace }
	};
}
