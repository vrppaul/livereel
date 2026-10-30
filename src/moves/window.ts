/**
 * The page's window: where on the frame the camera's picture shows, moved to a place (`src/domain/place.ts`), slid in
 * from past a side of the frame or out past one, and leant, apart from the camera, which keeps what it aims at inside
 * it as it goes.
 *
 * In a place the window stands on the film's ground, lifted off it, its corners rounded, its edge and shadow under it;
 * over the whole frame, however the place names it, it is the frame itself, flat on it. So the page draws back off the
 * frame's edges into a window, travels from one place to another, and grows back out to fill the frame. What slides
 * moves a whole frame, as words do, so a window and words sliding in one step move as one sheet; a window slid out
 * stays past the edge until a move brings it back. The window holds where it goes, so what comes up beside it while
 * it moves is placed beside where it goes; a note's words keep beside it as it moves, so they come with it on its way,
 * and a move that would carry them off the frame, or under it, is refused.
 *
 * Where the window stands and how it leans are its own values (`Placing` in `src/domain/camera.ts`): a move that
 * carries it sets its box and lift, one that leans it its angle, each writing only its own into the window as it
 * stands, so the two share a step, each as far along as its own share.
 */
import { type Placing, type View, viewOf, viewOver } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_FRAME_SIDE, type Box, type FrameSide, liesOutside, liesWithin } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten, needed } from '../domain/handed.ts';
import { A_PLACE, type Place, pastTheEdge, placesNamed, sideBeyond, windowPlaced } from '../domain/place.ts';
import { besideTheWindow } from '../props/note.ts';
import { trackOf } from '../domain/track.ts';
import { type Beginning, type Change, type Move, TIMING_FORM, type TimingScript, timingOf } from '../direction/move.ts';
import { withProp } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';

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
// The window's values a move that carries it sets, and one that leans it; what each writes is held to them
const CARRIED = ['box', 'lift'] as const satisfies readonly (keyof Placing)[];
const LEANT = ['angle'] as const satisfies readonly (keyof Placing)[];

/** The window's values a move that carries it writes, and one that leans it. */
type Carried = Pick<Placing, (typeof CARRIED)[number]>;
type Leant = Pick<Placing, (typeof LEANT)[number]>;

/** Where a window stands and how far off the ground, which a move that carries it takes from a view. */
type Standing = Pick<View, 'box' | 'lift'>;

/** The window to a place: the frame itself over the whole frame, a window standing on the ground anywhere else. */
export function to(place: Place, script: TimingScript = {}): Move {
	assertKind(place, A_PLACE, "window.to's place");
	assertWritten(script, TIMING_FORM, 'window.to');
	return {
		part: 'window',
		valueNames: CARRIED,
		timing: timingOf(script),
		places: placesNamed("window.to's place", place),
		begin: (beginning) => travelling(beginning, place)
	};
}

/** The window sliding in whole to a place, from a frame past it on a side. */
export function show(script: WindowShowScript): Move {
	assertWritten(script, SHOW_FORM, 'window.show');
	return {
		part: 'window',
		valueNames: CARRIED,
		timing: timingOf(script),
		places: placesNamed("window.show's at", script.at),
		begin: (beginning) => arriving(beginning, script)
	};
}

/** The window sliding out whole past a side of the frame, a frame away, where it stays. */
export function hide(script: WindowHideScript): Move {
	assertWritten(script, HIDE_FORM, 'window.hide');
	return {
		part: 'window',
		valueNames: CARRIED,
		timing: timingOf(script),
		begin: (beginning) => leaving(beginning, script.toward)
	};
}

/** The window leant back from its top edge by `tilt` and swung about its middle by `turn`, the screen in it with it. */
export function lean(script: LeanScript): Move {
	assertWritten(script, LEAN_FORM, 'window.lean');
	return {
		part: 'window',
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, script)
	};
}

/**
 * The window on its way from where it stands to a place; refused where a note's words standing beside it would keep
 * beside it off the frame, or under it.
 */
function travelling(beginning: Beginning, place: Place): Change {
	const to = placed(beginning, place);
	refuseCarryingTheNoteOff(beginning, to.box);
	return carried(viewOf(beginning.scene.window), to);
}

/** Refuses a window's place where the words of a note standing beside it would stand off the frame, or under it. */
function refuseCarryingTheNoteOff(beginning: Beginning, window: Box): void {
	const note = beginning.scene.note;
	if (note === null) return;
	const words = besideTheWindow(note.beside, window);
	if (liesWithin(words, beginning.format.frame) && sideBeyond(words, window) !== null) return;
	throw new FilmError(
		"window.to would carry the note's words off the frame, or under the window: hide the note first, with note.hide(), or move the window where its words keep beside it"
	);
}

/** The window on its way to its place from a frame past it on a side, lifted as it will stand there. */
function arriving(beginning: Beginning, script: WindowShowScript): Change {
	const to = placed(beginning, script.at);
	const from = { ...to, box: pastTheEdge(to.box, script.from, beginning.format.frame) };
	return carried(from, to);
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
	return carried(from, to);
}

/** Where the window stands in a place, and how far off the ground. */
function placed(beginning: Beginning, place: Place): Standing {
	return viewOver(windowPlaced(beginning.format, place), beginning.format.frame);
}

/** The window's box and lift on their way from where it stood to where it goes, written into the window as it stands. */
function carried(from: Standing, to: Standing): Change {
	return writing((progress): Carried => ({
		box: trackOf(from.box, to.box, progress),
		lift: trackOf(from.lift, to.lift, progress)
	}));
}

/** The window's angle on its way from how it leans to the film's, written into the window as it stands. */
function leaning(beginning: Beginning, script: LeanScript): Change {
	const from = viewOf(beginning.scene.window).angle;
	const to = leantFrom(from, script);
	return writing((progress): Leant => ({ angle: trackOf(from, to, progress) }));
}

/** A change that writes some of the window's values into it as it stands, leaving the rest as they go. */
function writing(valuesAt: (progress: number) => Partial<Placing>): Change {
	return (scene, progress) => withProp(scene, 'window', { ...scene.window, ...valuesAt(progress) });
}
