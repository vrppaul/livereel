import { expect, test } from 'vitest';
import { Timings, profileSaid } from '../../src/adapters/profile.ts';

// A shoot of ten seconds, in milliseconds
const WHOLE = 10_000;

test('a profile says each part slowest first, its calls, time each, seconds and share of the whole, then the rest', async () => {
	const waited = new Timings(clockReading([0, 3000, 3000, 3100, 3100, 6100]));
	const blended = new Timings(clockReading([0, 458]));
	await waited.timed('stage.capture', done);
	await waited.timed('stage.draw', done);
	await waited.timed('stage.capture', done);
	await blended.timed('blend of 16', done);
	expect(profileSaid(WHOLE, waited, blended)).toEqual([
		'where the 10.0 s went:',
		'  stage.capture              2 ×   3000.0 ms     6.0 s   60 %',
		'  stage.draw                 1 ×    100.0 ms     0.1 s    1 %',
		'  the rest                                       3.9 s   39 %',
		"the footage's blends, as they ran:",
		'  blend of 16                1 ×    458.0 ms     0.5 s'
	]);
});

/** A clock that reads these milliseconds, one after another. */
function clockReading(readings: readonly number[]): () => number {
	const coming = readings.values();
	return () => coming.next().value!;
}

function done(): Promise<void> {
	return Promise.resolve();
}
