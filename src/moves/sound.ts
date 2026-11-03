/**
 * A sound file of the film's at a moment of a step: a move that changes nothing on the scene, so it clashes with
 * none. A sound is heard from its start to its own end, so it takes only a start, no end and no curve.
 */
import { A_PATH, assertKind, assertWritten } from '../domain/handed.ts';
import { MOMENT_FORM, type MomentScript, type Move, UNCHANGED, momentTimingOf } from '../direction/move.ts';
import { fileSound, heardAsItBegins } from '../direction/sound.ts';

/** A file of the film's heard as the move's share begins; its path is from the film's file. */
export function play(file: string, script: MomentScript = {}): Move {
	assertKind(file, A_PATH, "sound.play's file");
	assertWritten(script, MOMENT_FORM, 'sound.play');
	return {
		part: null,
		timing: momentTimingOf(script),
		sounds: [heardAsItBegins(fileSound(file))],
		begin: () => UNCHANGED
	};
}
