/** The one frame at a moment of a film: a still, to look at a shot without making the video. */
import { writeFile } from 'node:fs/promises';
import { FilmError } from '#domain/errors';
import { momentOf, shotAt } from '#domain/time';
import type { Footage } from '#studio/ports';

// A moment is said to a tenth of a second
const SAID_TO = 1;

export class StillFootage implements Footage {
	readonly path: string;
	readonly moment: number;
	readonly shot: number;

	constructor(path: string, moment: number) {
		this.path = path;
		this.moment = moment;
		this.shot = shotAt(moment);
	}

	expect(frames: number): void {
		if (this.shot < frames) return;
		const length = momentOf(frames).toFixed(SAID_TO);
		throw new FilmError(`the film is ${length} s long (${frames} frames): there is no frame at ${this.moment} s`);
	}

	keeps(shot: number): boolean {
		return shot === this.shot;
	}

	keep(_shot: number, image: Uint8Array): Promise<void> {
		return writeFile(this.path, image);
	}

	complete(shot: number): boolean {
		return shot > this.shot;
	}
}
