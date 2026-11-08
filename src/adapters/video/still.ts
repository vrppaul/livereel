/**
 * The one frame at a moment of a film: a still, to look at a shot without making the video. A frame of several
 * exposures is blended as the video's is, so the still is that frame of the video.
 */
import { writeFile } from 'node:fs/promises';
import { FilmError } from '../../domain/errors.ts';
import { momentOf, secondsSaid, shotAt } from '../../domain/time.ts';
import type { Exposures, Footage } from '../../studio/ports.ts';
import type { Blend } from './exposures.ts';

export class StillFootage implements Footage {
	readonly path: string;
	readonly moment: number;
	readonly shot: number;
	readonly framesPerSecond: number;
	readonly blend: Blend;

	constructor(path: string, moment: number, framesPerSecond: number, blend: Blend) {
		this.path = path;
		this.moment = moment;
		this.shot = shotAt(moment, framesPerSecond);
		this.framesPerSecond = framesPerSecond;
		this.blend = blend;
	}

	expect(frames: number): void {
		if (this.shot < frames) return;
		const length = secondsSaid(momentOf(frames, this.framesPerSecond));
		throw new FilmError(`the film is ${length} s long (${frames} frames): there is no frame at ${this.moment} s`);
	}

	keeps(shot: number): boolean {
		return shot === this.shot;
	}

	async keep(_shot: number, exposures: Exposures): Promise<void> {
		await writeFile(this.path, await this.blend(exposures));
	}

	complete(shot: number): boolean {
		return shot > this.shot;
	}
}
