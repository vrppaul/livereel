/**
 * The eye: to a place in the room, where it stands and the spot it looks at, each in pixels of a frame 1080 high from
 * the frame's middle (`src/domain/eye.ts`), through the places the film names on its way, on the course it names
 * (`src/moves/through.ts`). What stands in the world — the page's window, an object a film shows there — is seen from
 * wherever the eye stands; what stands on the frame, a title or a caption, rides with it. What a place leaves out,
 * where the eye stands or what it looks at, stays as it stands as the move begins, at its end and at every key.
 *
 * The path is worked out once, as the move begins, from where the eye stands then: its places are values of the room,
 * and nothing the eye passes moves under it.
 */
import { AN_EYE_PLACE, EYE_SPACE, type Eye, type EyePlace, eyeSentTo, eyeThatSees } from '../domain/eye.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import { type Path, type Through, pathOf } from '../domain/path.ts';
import { type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { withEye } from '../scene.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/** The places the eye passes on its way to its own, and how its path goes through them. */
export interface EyeToScript extends TimingScript, ThroughScript<EyePlace> {}

const TO_FORM: Form<EyeToScript> = { ...throughFormOf(AN_EYE_PLACE, 'a list of places of the eye'), ...TIMING_FORM };
// What a refusal names the move by
const EYE_TO = 'eye.to';

/** The eye to a place, through the places the film names on its way. */
export function to(place: EyePlace, script: EyeToScript = {}): Move {
	assertKind(place, AN_EYE_PLACE, `${EYE_TO}'s place`);
	assertWritten(script, TO_FORM, EYE_TO);
	const through = throughWritten(script, EYE_TO);
	return {
		part: 'eye',
		timing: timingOf(script),
		begin: (beginning) => sentAlong(beginning.scene.eye, through, place)
	};
}

/**
 * The eye on its way from where it stands, through the places on its way, to its own, each come to from where it
 * stands and refused where it could not see.
 */
function sentAlong(standing: Eye, through: Through<EyePlace>, place: EyePlace): Change {
	const keys = through.keys.map((key) => eyeThatSees(eyeSentTo(standing, key), EYE_TO));
	const end = eyeThatSees(eyeSentTo(standing, place), EYE_TO);
	return travelling(pathOf(standing, { ...through, keys }, end, EYE_SPACE));
}

/** The eye `progress` of the way along its path. */
function travelling(path: Path<Eye>): Change {
	return (scene, progress) => withEye(scene, path.at(progress));
}
