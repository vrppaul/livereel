/**
 * The page's window: where on the frame the camera's picture shows, moved to a place (`src/domain/place.ts`), apart
 * from the camera, which keeps what it aims at inside it as it goes.
 *
 * In a place the window stands on the film's ground, lifted off it, its corners rounded, its edge and shadow under it;
 * at `whole` it is the frame itself, flat on it. So the page draws back off the frame's edges into a window, travels
 * from one place to another, and grows back out to fill the frame. While a note stands beside the window, its words
 * placed beside where the window stood, the window stays.
 */
import { type View, viewToward, wholeView, windowView } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/geometry.ts';
import { assertKind, assertWritten } from '../domain/handed.ts';
import { A_PLACE, type Place, windowPlaced } from '../domain/place.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	timingOf
} from '../direction/move.ts';

/** The window to a place: the frame itself at `whole`, a window standing on the ground anywhere else. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "window.to's place");
	assertWritten(script, TIMING_FORM, 'window.to');
	return { part: 'window', timing: timingOf(script), begin: (beginning) => moving(beginning, place) };
}

/** The window on its way to a place; refused while a note stands beside it. */
function moving(beginning: Beginning, place: Place): Change {
	if (beginning.scene.note !== null) {
		throw new FilmError(
			"window.to moves the page's window from beside the note standing there: hide the note first, with note.hide()"
		);
	}
	const start = beginning.scene.window;
	const end = viewAt(beginning.format, place);
	return propChange('window', (progress) => viewToward(start, end, progress));
}

/** The view a place gives the window: flat over the frame at `whole`, lifted anywhere else. */
function viewAt(format: Format, place: Place): View {
	return place === 'whole' ? wholeView(format.frame) : windowView(windowPlaced(format, place));
}
