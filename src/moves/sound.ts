/**
 * A sound file of the film's at a moment of a step: a move that changes nothing on the scene, so it clashes with
 * none. A sound is heard from its start to its own end, so it takes only a start, no end and no curve.
 */
import { A_NUMBER, A_PATH, type Form, OfForm, assertKind, assertWritten } from '../domain/handed.ts';
import { type Change, type Move, timingOf } from '../direction/move.ts';
import { fileSound, heardAsItBegins } from '../direction/sound.ts';

/** Where in its step a sound is heard: from `start`, a share of the step. */
interface Start {
	readonly start?: number;
}

/** Where in its step the sound is heard: from `start`, a share of the step; the step's start where none is given. */
export interface SoundPlayScript {
	readonly within?: Start;
}

const UNCHANGED: Change = (scene) => scene;
const SOUND_PLAY_FORM: Form<SoundPlayScript> = {
	within: new OfForm<Start>({ start: A_NUMBER }, 'a moment of the step: { start }')
};

/** A file of the film's heard as the move's share begins; its path is from the film's file. */
export function play(file: string, script: SoundPlayScript = {}): Move {
	assertKind(file, A_PATH, "sound.play's file");
	assertWritten(script, SOUND_PLAY_FORM, 'sound.play');
	return { part: null, timing: timingOf(script), sounds: [heardAsItBegins(fileSound(file))], begin: () => UNCHANGED };
}
