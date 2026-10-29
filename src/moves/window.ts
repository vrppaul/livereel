/**
 * The page's window: where on the frame the camera's picture shows, moved to a place (`src/domain/place.ts`), slid in
 * from past a side of the frame or out past one, apart from the camera, which keeps what it aims at inside it as it
 * goes.
 *
 * In a place the window stands on the film's ground, lifted off it, its corners rounded, its edge and shadow under it;
 * over the whole frame, however the place names it, it is the frame itself, flat on it. So the page draws back off the
 * frame's edges into a window, travels from one place to another, and grows back out to fill the frame. What slides
 * moves a whole frame, as words do, so a window and words sliding in one step move as one sheet; a window slid out
 * stays past the edge until a move brings it back. The window holds where it goes, so what comes up beside it while
 * it moves stands beside where it goes. While a note stands beside the window, its words placed beside where the
 * window stood, the window stays.
 */
import { type View, viewOf, viewOver } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_FRAME_SIDE, type FrameSide, liesOutside } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, pastTheEdge, windowPlaced } from '../domain/place.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	propChange,
	timingOf
} from '../direction/move.ts';

/** Where the window slides in to, `at` a place, and the side of the frame it comes `from`. */
export interface WindowShowScript extends TimingScript {
	readonly at: Place;
	readonly from: FrameSide;
}

/** The side of the frame the window slides out `toward`. */
export interface WindowHideScript extends TimingScript {
	readonly toward: FrameSide;
}

const SHOW_FORM: Form<WindowShowScript> = { at: needed(A_PLACE), from: needed(A_FRAME_SIDE), ...TIMING_FORM };
const HIDE_FORM: Form<WindowHideScript> = { toward: needed(A_FRAME_SIDE), ...TIMING_FORM };

/** The window to a place: the frame itself over the whole frame, a window standing on the ground anywhere else. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "window.to's place");
	assertWritten(script, TIMING_FORM, 'window.to');
	return { part: 'window', timing: timingOf(script), begin: (beginning) => travelling(beginning, place) };
}

/** The window sliding in whole to a place, from a frame past it on a side. */
export function show(script: WindowShowScript): Move {
	assertWritten(script, SHOW_FORM, 'window.show');
	return { part: 'window', timing: timingOf(script), begin: (beginning) => arriving(beginning, script) };
}

/** The window sliding out whole past a side of the frame, a frame away, where it stays. */
export function hide(script: WindowHideScript): Move {
	assertWritten(script, HIDE_FORM, 'window.hide');
	return { part: 'window', timing: timingOf(script), begin: (beginning) => leaving(beginning, script.toward) };
}

/** The window on its way from where it stands to a place. */
function travelling(beginning: Beginning, place: Place): Change {
	return moving(beginning, viewOf(beginning.scene.window), placed(beginning, place), 'window.to');
}

/** The window on its way to its place from a frame past it on a side, lifted as it will stand there. */
function arriving(beginning: Beginning, script: WindowShowScript): Change {
	const to = placed(beginning, script.at);
	const from = { ...to, box: pastTheEdge(to.box, script.from, beginning.format.frame) };
	return moving(beginning, from, to, 'window.show');
}

/**
 * The window on its way from where it stands to a frame past it on a side, lifted as it stands; refused where it is
 * off the frame already, as it would slide on a frame further.
 */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const from = viewOf(beginning.scene.window);
	if (liesOutside(from.box, beginning.format.frame)) {
		throw new FilmError('window.hide hides a window already off the frame: bring it in first, with window.show');
	}
	const to = { ...from, box: pastTheEdge(from.box, toward, beginning.format.frame) };
	return moving(beginning, from, to, 'window.hide');
}

/** The view the window takes in a place. */
function placed(beginning: Beginning, place: Place): View {
	return viewOver(windowPlaced(beginning.format, place), beginning.format.frame);
}

/** The window on its way from one view to another; refused while a note stands beside it. */
function moving(beginning: Beginning, from: View, to: View, move: string): Change {
	if (beginning.scene.note !== null) {
		throw new FilmError(
			`${move} moves the page's window from beside the note standing there: hide the note first, with note.hide()`
		);
	}
	return propChange('window', (progress) => ({ from, to, progress }));
}
