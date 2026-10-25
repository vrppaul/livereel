/**
 * What goes wrong, by whose it is to put right.
 *
 * The command line says each one's message and exits by its kind: a wrong command or film file is the person's
 * typing, a film that cannot be shot is the film's writing, and a machine that lacks a tool is the machine's.
 */
import { secondsSaid } from './time.ts';

/** Anything livereel refuses or fails at, said in words a person can act on. */
export class LivereelError extends Error {}

/** A command line or a film file that cannot be used as given. */
export class UsageError extends LivereelError {}

/** A film that cannot be shot as written: a block that is not on the page, a move that has nothing to move. */
export class FilmError extends LivereelError {}

/** A fault met while a film was being shot, with the moment and the step it was met at. */
export class TakeError extends LivereelError {
	readonly moment: number;
	readonly step: number;

	constructor(fault: Error, moment: number, step: number) {
		super(`at ${secondsSaid(moment)} s, step ${step}: ${fault.message}`, { cause: fault });
		this.moment = moment;
		this.step = step;
	}
}

/** What this machine lacks to shoot a film: the browser, or ffmpeg. */
export class SetupError extends LivereelError {}

/** ffmpeg refused to make the video. */
export class EncodingError extends LivereelError {}
