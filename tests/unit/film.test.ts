// A film in its formats: each by its name, and the steps told which one they are shot in
import { expect, test } from 'vitest';
import { wholePose } from '../../src/domain/camera.ts';
import { atAddress, defineFilm } from '../../src/direction/film.ts';
import { SMALL } from './fakes.ts';

const TALL = { frame: { width: 400, height: 600 }, screen: { width: 400, height: 600 } };

test('the steps are handed the name of the format the film is shot in', async () => {
	const named: string[] = [];
	const film = defineFilm({
		formats: { small: SMALL, tall: TALL },
		serve: () => atAddress('about:blank'),
		ready: () => Promise.resolve(),
		steps: (_served, _whole, formatName) => {
			named.push(formatName);
			return [];
		}
	});
	await using served = await film.formats.get('tall')!.serve();
	served.steps(wholePose(TALL));
	expect(named).toEqual(['tall']);
});
