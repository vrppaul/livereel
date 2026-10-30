/**
 * A value on its way: where it stood as its move began, where it goes, and how far along it is. A thing on the frame
 * holds each of its values on a track of its own, so moves that set different values of it share a step, each as far
 * along as its own share, and a move writes only its own tracks into the thing as it stands.
 */

/** A value on its way from where it stood, as its move began, to where it goes, `progress` of the way; at 1, there. */
export interface Track<Value> {
	readonly from: Value;
	readonly to: Value;
	readonly progress: number;
}

// A value that has come all the way to where it goes
export const ARRIVED = 1;

/** A value on its way from one to another, so far along. */
export function trackOf<Value>(from: Value, to: Value, progress: number): Track<Value> {
	return { from, to, progress };
}

/** A value standing where it is: there already. */
export function arrivedAt<Value>(value: Value): Track<Value> {
	return trackOf(value, value, ARRIVED);
}

/** Where a value stands so far on its way, by how a value of its kind goes from one to another. */
export function alongTrack<Value>(
	track: Track<Value>,
	toward: (start: Value, end: Value, progress: number) => Value
): Value {
	return toward(track.from, track.to, track.progress);
}
