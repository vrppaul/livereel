/**
 * The page's window: where on the frame the camera's picture shows, moved to a place (`src/domain/place.ts`) and
 * brought toward the eye or away from it there, slid in from past a side of the frame or out past one, and leant, apart
 * from the camera, which keeps what it aims at inside it as it goes.
 *
 * In a place the window stands on the film's ground, lifted off it, its corners rounded, its edge and shadow under it;
 * over the whole frame, however the place names it, it is the frame itself, flat on it, at any depth. So the page draws
 * back off the frame's edges into a window, travels from one place to another, and grows back out to fill the frame.
 * On its way its box may pass places the film names, on the course it names (`src/moves/through.ts`), as an object's
 * does; its lift and depth go from end to end. Brought toward the eye it is drawn larger and farther from the frame's
 * middle, as an object is: a slab coming at the eye with its body, or, at a depth less than none, drawn back from it.
 * A depth as near as the eye at rest or nearer is refused before the film is shot, as an object's is. What slides moves
 * a whole frame, as words do, so a window and words sliding in one step move as one sheet; a window slid out stays past
 * the edge until a move brings it back. The window holds where it goes, so what comes up beside it while it moves is
 * placed beside where it goes; a note's words keep beside it as it moves, so they come with it on its way, and a move
 * that would carry them off the frame, or under it, where it goes or at a place it passes, is refused.
 *
 * The page in the window is shaded while something stands clear of it: dimmed, faded into the film's ground and
 * blurred, but for a part of it the blur leaves sharp, the window's edge and shadow standing as they are
 * (`src/props/window.ts`).
 *
 * In a room the window may have a body, a slab of metal round the page with glass over it (`src/props/body.ts`),
 * changed to the values a film names, through the values between in a play, at once in a cut.
 *
 * Where the window stands, how it leans, how it shades the page and its body are its own values: a move that carries it
 * sets its box, lift and depth, the depth kept as it stands but where `window.to` names one, as only that move brings
 * the window near; one that leans it its angle and the point of its box it turns about, one that shades the page those
 * of the shade it names, one that changes its body those of the body it names, each writing only its own into the
 * window as it stands, so they share a step, each as far along as its own share.
 */
import { type Placing, type View, viewOf, viewOver } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { A_FRAME_SIDE, type Box, type FrameSide, liesOutside, liesWithin } from '../domain/geometry.ts';
import { A_NUMBER, type Form, assertKind, assertWritten, namesGiven, namesSetBy, needed } from '../domain/handed.ts';
import { NO_KEYS, type Through } from '../domain/path.ts';
import { A_PLACE, ONE_FRAME, type Place, pastTheEdge, placesNamed, sideBeyond, windowPlaced } from '../domain/place.ts';
import { angleToward, depthAsked, depthsNamed } from '../domain/stance.ts';
import { between, namedToward, shareToward } from '../domain/toward.ts';
import { type ValuesMoving, valuesToward, valuesWith } from '../domain/values.ts';
import { SLAB_KINDS, SLAB_NAMES, type Slab, type SlabScript } from '../props/body.ts';
import { besideTheWindow } from '../props/note.ts';
import {
	A_BLUR_SEEN,
	A_SHADE_REACH,
	type BlurSeen,
	type PageWindow,
	SHADE_KINDS,
	SHADE_NAMES,
	type Shade,
	type ShadeReach,
	type ShadeWritten
} from '../props/window.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type TimingScript,
	refuseWithoutThePicture,
	shownPart,
	timingOf
} from '../direction/move.ts';
import { withProp } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/**
 * How far a move that carries the window to a place brings it toward the eye, `depth`, in pixels of a frame 1080 high;
 * the places its box passes on its way, `through`, and how its path goes through them.
 */
export interface WindowToScript extends TimingScript, ThroughScript<Place> {
	readonly depth?: number;
}

/** Where the window slides in to, `at` a place, and the side of the frame it comes `from`. */
export interface WindowShowScript extends TimingScript {
	readonly at: Place;
	readonly from: FrameSide;
}

/** The side of the frame the window slides out `toward`. */
export interface WindowHideScript extends TimingScript {
	readonly toward: FrameSide;
}

/**
 * How far the page is dimmed, `dim`, and faded into the film's ground, `fade`, each from 0 none to 1 whole, how far it
 * is blurred, `blur`, in pixels of a frame 1080 high, the part of it the blur leaves `sharp`, a block or a box of the
 * screen, or none, `'none'`, how far that part softens toward the blur, `sharpSoftens`, from 0 none to 1 as soft as
 * the page round it, how far the shade reaches, `reaching`, the page alone, `'page'`, or the whole window, `'window'`,
 * and where the blur is as wide as written, `blurSeen`, on the page, `'on the page'`, or on the frame,
 * `'on the frame'`; any left out as it stands.
 */
export interface ShadeScript extends TimingScript, Partial<ShadeWritten> {
	readonly sharp?: Target;
	readonly reaching?: ShadeReach;
	readonly blurSeen?: BlurSeen;
}

// No part of the page left sharp, as a film names it: written as a selector is, one no block of a page answers to
const NONE_SHARP = 'none';

const TO_FORM: Form<WindowToScript> = {
	depth: A_NUMBER,
	...throughFormOf(A_PLACE, 'a list of places'),
	...TIMING_FORM
};
const SHOW_FORM: Form<WindowShowScript> = { at: needed(A_PLACE), from: needed(A_FRAME_SIDE), ...TIMING_FORM };
const HIDE_FORM: Form<WindowHideScript> = { toward: needed(A_FRAME_SIDE), ...TIMING_FORM };
const SHADE_FORM: Form<ShadeScript> = {
	...SHADE_KINDS,
	sharp: A_TARGET,
	reaching: A_SHADE_REACH,
	blurSeen: A_BLUR_SEEN,
	...TIMING_FORM
};
// The window's values a shade sets: the shade's own, the part of the page its blur leaves sharp, how far it reaches
// and where its blur is as wide as written; and that part, as a refusal names it
const SHADED = [...SHADE_NAMES, 'sharp', 'reaching', 'blurSeen'] as const satisfies readonly (keyof PageWindow)[];
const SHARP_MOVE = "window.shade's sharp";
// The window's values a move that carries it sets, and one that leans it; what each writes is held to them
const CARRIED = ['box', 'lift', 'depth'] as const satisfies readonly (keyof Placing)[];
const LEANT = ['angle', 'about'] as const satisfies readonly (keyof Placing)[];
// The moves of the window's body and of its lean, and the window, as their refusals name them
const BODY_MOVE = 'window.body';
const LEAN_MOVE = 'window.lean';
const WINDOW = 'window';

/** The window's values a move that carries it writes, and one that leans it. */
type Carried = Pick<Placing, (typeof CARRIED)[number]>;
type Leant = Pick<Placing, (typeof LEANT)[number]>;

/** Where a window stands, how far off the ground and how near the eye, which a move that carries it sets. */
type Standing = Pick<View, (typeof CARRIED)[number]>;

/**
 * The window to a place: the frame itself over the whole frame, a window standing on the ground anywhere else; its box
 * passing the places the film names on its way, and brought to the film's depth toward the eye, where it names one.
 */
export function to(place: Place, script: WindowToScript = {}): Move {
	assertKind(place, A_PLACE, "window.to's place");
	assertWritten(script, TO_FORM, 'window.to');
	const through = throughWritten(script, 'window.to');
	return {
		part: 'window',
		valueNames: CARRIED,
		timing: timingOf(script),
		places: [
			...placesNamed("window.to's place", place),
			...through.keys.flatMap((key) => placesNamed("window.to's through", key))
		],
		depths: depthsNamed("window.to's depth", script.depth),
		begin: (beginning) => travelling(beginning, place, through, script.depth)
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

/**
 * The page in the window dimmed, faded and blurred to the film's values, but for a part the blur leaves sharp, softened
 * toward the blur as far as the film names, those it names alone.
 */
export function shade(script: ShadeScript): Move {
	assertWritten(script, SHADE_FORM, 'window.shade');
	return {
		part: 'window',
		valueNames: namesSetBy(script, SHADED, 'window.shade'),
		timing: timingOf(script),
		begin: (beginning) => shading(beginning, script)
	};
}

/** The window's body on its way to the values a film names, those it names alone. */
export function body(slab: SlabScript, script: TimingScript = {}): Move {
	assertWritten<SlabScript>(slab, SLAB_KINDS, BODY_MOVE);
	assertWritten(script, TIMING_FORM, BODY_MOVE);
	const names = namesSetBy(slab, SLAB_NAMES, BODY_MOVE);
	return {
		part: 'window',
		valueNames: names,
		timing: timingOf(script),
		begin: (beginning) => reshaping(beginning, slab, names)
	};
}

/**
 * The window leant back from its top edge by `tilt`, swung by `turn`, rolled by `roll` and turned over by `over`, about
 * a point of its box, the screen in it with it.
 */
export function lean(script: LeanScript): Move {
	assertWritten(script, LEAN_FORM, LEAN_MOVE);
	return {
		part: 'window',
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, script)
	};
}

/**
 * The window on its way from where it stands, through places, to a place, and to the film's depth from its own where
 * it names one, a depth given in pixels of a frame 1080 high; refused where a note's words standing beside it would
 * keep beside it off the frame, or under it, at a place it passes or where it goes.
 */
function travelling(beginning: Beginning, place: Place, through: Through<Place>, depth: number | undefined): Change {
	const from = viewOf(beginning.scene.window);
	const to = placed(beginning, place, depthAsked(depth, from.depth, beginning.format.frame));
	const keys = through.keys.map((key) => windowPlaced(beginning.format, key));
	[...keys, to.box].forEach((box) => refuseCarryingTheNoteOff(beginning, box));
	return carried(from, { ...through, keys }, to);
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

/**
 * The window on its way to its place from a frame past it on a side, lifted as it will stand there, as near the eye as
 * it stands.
 */
function arriving(beginning: Beginning, script: WindowShowScript): Change {
	const to = placed(beginning, script.at, beginning.scene.window.depth);
	const from = { ...to, box: pastTheEdge(to.box, script.from, beginning.format.frame, ONE_FRAME) };
	return carried(from, NO_KEYS, to);
}

/**
 * The window on its way from where it stands to a frame past it on a side, lifted and as near the eye as it stands;
 * refused where it is off the frame already, as it would slide on a frame further.
 */
function leaving(beginning: Beginning, toward: FrameSide): Change {
	const from = viewOf(beginning.scene.window);
	if (liesOutside(from.box, beginning.format.frame)) {
		throw new FilmError('window.hide hides a window already off the frame: bring it in first, with window.show');
	}
	const to = { ...from, box: pastTheEdge(from.box, toward, beginning.format.frame, ONE_FRAME) };
	return carried(from, NO_KEYS, to);
}

/** Where the window stands in a place, how far off the ground the place lifts it, at a depth. */
function placed(beginning: Beginning, place: Place, depth: number): Standing {
	const { box, lift } = viewOver(windowPlaced(beginning.format, place), beginning.format.frame);
	return { box, lift, depth };
}

/**
 * The window's box, lift and depth on their way from where it stood to where it goes, written into the window as it
 * stands: its box on its path through the boxes between, its lift and depth from end to end, its depth passing its
 * ends with the move's curve, as an object's does.
 */
function carried(from: Standing, through: Through<Box>, to: Standing): Change {
	return writing((progress): Carried => ({
		box: { from: from.box, through, to: to.box, progress },
		lift: shareToward(from.lift, to.lift, progress),
		depth: between(from.depth, to.depth, progress)
	}));
}

/**
 * The window's angle on its way from how it leans to the film's, about the point of its box it turns about, written
 * into the window as it stands.
 */
function leaning(beginning: Beginning, script: LeanScript): Change {
	const from = beginning.scene.window;
	const to = leantFrom(from, script, LEAN_MOVE, WINDOW);
	return writing((progress): Leant => ({ angle: angleToward(from.angle, to.angle, progress), about: to.about }));
}

/**
 * The page's shade on its way from how it stands to the film's, the values it names written into the window; and the
 * part of the page its blur leaves sharp, how far the shade reaches and where its blur is as wide as written, where the
 * film names them, from the move's start, as none has values between one and the next, and slid across the page a
 * part's edge would slide over the words.
 */
async function shading(beginning: Beginning, script: ShadeScript): Promise<Change> {
	const start: Shade = beginning.scene.window;
	const end = valuesWith(start, script, SHADE_KINDS);
	const names = namesGiven(script, SHADE_NAMES);
	const sharp = script.sharp === undefined ? {} : { sharp: await sharpRead(beginning, script.sharp) };
	const reaching = script.reaching === undefined ? {} : { reaching: script.reaching };
	const blurSeen = script.blurSeen === undefined ? {} : { blurSeen: script.blurSeen };
	return writing((progress) => ({
		...namedToward(SHADE_KINDS, start, end, names, progress),
		...sharp,
		...reaching,
		...blurSeen
	}));
}

/**
 * The part of the screen the shade's blur leaves sharp, as the move begins: what the screen shows of the block or the
 * box the film names, refused where the stage draws no picture of the filmed page, which the part is drawn from; none
 * where the film names none.
 */
async function sharpRead(beginning: Beginning, sharp: Target): Promise<Box | null> {
	if (sharp === NONE_SHARP) return null;
	refuseWithoutThePicture(beginning, SHARP_MOVE);
	return shownPart(beginning, sharp, THE_FIRST, SHARP_MOVE);
}

/**
 * The window's body on its way from how it stands to the film's values, those it names alone written into the body as
 * it stands each frame, so another move of the body naming others shares the step.
 */
function reshaping(beginning: Beginning, slab: SlabScript, names: readonly (keyof Slab)[]): Change {
	const start = beginning.scene.window.body;
	const moving: ValuesMoving<Slab> = { start, end: valuesWith(start, slab, SLAB_KINDS), names };
	return (scene, progress) =>
		withProp(scene, 'window', { ...scene.window, body: valuesToward(scene.window.body, moving, SLAB_KINDS, progress) });
}

/** A change that writes some of the window's values into it as it stands, leaving the rest as they go. */
function writing(valuesAt: (progress: number) => Partial<PageWindow>): Change {
	return (scene, progress) => withProp(scene, 'window', { ...scene.window, ...valuesAt(progress) });
}
