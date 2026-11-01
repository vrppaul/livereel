/**
 * Keys, shown by an object (`src/moves/object.ts`) over the whole frame: the caps of a shortcut coming up at the
 * frame's foot as it is pressed, in place of any shown, and going, in their own way or one of livereel's. Keys are the
 * object named `keys`, standing where they come up, as the caption they rise clear of does.
 */
import { boxOf } from '../domain/geometry.ts';
import { assertKind, assertWritten } from '../domain/handed.ts';
import type { Move } from '../direction/move.ts';
import { A_CAPS, keysOf } from '../props/keys.ts';
import {
	IN_PLACE_HIDE_FORM,
	IN_PLACE_SHOW_FORM,
	type InPlaceHideScript,
	type InPlaceShowScript,
	type ObjectKind,
	objectHide,
	objectShow
} from './object.ts';

const KEYS: ObjectKind = 'keys';

/** The caps of a shortcut coming up, named as they are written on the keys. */
export function show(caps: readonly string[], script: InPlaceShowScript = {}): Move {
	assertKind(caps, A_CAPS, "keys.show's caps");
	assertWritten(script, IN_PLACE_SHOW_FORM, 'keys.show');
	const keys = keysOf(caps);
	return objectShow(KEYS, 'keys.show', script, null, (beginning) => ({
		content: keys,
		box: boxOf(beginning.format.frame)
	}));
}

/** The caps on the screen going; once gone, there are none. */
export function hide(script: InPlaceHideScript = {}): Move {
	assertWritten(script, IN_PLACE_HIDE_FORM, 'keys.hide');
	return objectHide(KEYS, 'keys.hide', script);
}
