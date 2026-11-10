/**
 * Keys (`src/props/keys.ts`): the caps of a shortcut coming up at the frame's foot as it is pressed, in place of any
 * shown, and going, in their own way or one of livereel's (`src/moves/way.ts`). Keys are one shortcut at a time, over
 * the frame, standing where they come up, as the caption they rise clear of does.
 */
import { assertKind, assertWritten } from '../domain/handed.ts';
import { type Beginning, type Change, type Move, present, propChange, timingOf } from '../direction/move.ts';
import { A_CAPS, capsOf } from '../props/keys.ts';
import type { Way } from '../props/way.ts';
import {
	IN_PLACE_HIDE_FORM,
	IN_PLACE_SHOW_FORM,
	type InPlaceHideScript,
	type InPlaceShowScript,
	comingIn,
	goneIn,
	wayOf
} from './way.ts';

/** The caps of a shortcut coming up, named as they are written on the keys, on their step's curve. */
export function show(caps: readonly string[], script: InPlaceShowScript = {}): Move {
	assertKind(caps, A_CAPS, "keys.show's caps");
	assertWritten(script, IN_PLACE_SHOW_FORM, 'keys.show');
	const pressed = capsOf(caps);
	const way = wayOf(script.enter, script.edge, 'keys.show');
	return {
		part: 'keys',
		timing: timingOf(script),
		begin: () => propChange('keys', (progress) => ({ ...pressed, ...comingIn(way, progress) }))
	};
}

/** The caps on the screen going; once gone, there are none. */
export function hide(script: InPlaceHideScript = {}): Move {
	assertWritten(script, IN_PLACE_HIDE_FORM, 'keys.hide');
	const way = wayOf(script.leave, script.edge, 'keys.hide');
	return { part: 'keys', timing: timingOf(script), begin: (beginning) => keysGoing(beginning, way) };
}

/** The keys standing going in a way; none on the screen is refused. */
function keysGoing(beginning: Beginning, way: Way): Change {
	const standing = present(beginning, 'keys', 'keys.hide finds no keys on the screen');
	return propChange('keys', (progress) => goneIn(standing, way, progress));
}
