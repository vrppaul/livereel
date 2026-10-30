/**
 * The moves of an object (`src/props/object.ts`), alike whatever it shows, written once for every kind that makes
 * one — a title's words, code: coming up in its box, or sliding in whole from past a side of the frame, pushing the
 * object of its name standing there off past the side across; carried to another place; leant; put away where it
 * stands, or slid out past a side. A move takes the object a film names `as`, or its kind's own name, so a film shows
 * several of a kind at once, each moved by its name. How what an object shows takes another box as it sets off is told
 * here, kind by kind.
 *
 * A move that carries an object sets its box alone, one that leans it its angle alone, one of what it shows its content
 * alone, each writing its own into the object as it stands, so they share a step, each as far along as its own share;
 * a move that brings one or puts it away sets it whole. A move of an object that is not on the screen is refused as it
 * begins.
 */
import { FACE_ON, angleToward } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { type Box, type FrameSide, type Size, boxToward } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	A_PLACE,
	type Place,
	acrossFrom,
	enteringFrom,
	pastTheEdge,
	placesNamed,
	wordsPlaced,
	wordsResized
} from '../domain/place.ts';
import { linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type TimingScript,
	objectPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { AN_OBJECT_NAME, type Content, type FrameObject, type ObjectName } from '../props/object.ts';
import { type Scene, withLeaving, withObject } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';
import { SHOWN_WHOLE, SLIDE_OUT_FORM, type SlideOutScript } from './slide.ts';

/** A kind of object, as a film calls its moves, and the name of the object they take where the film names none. */
export type ObjectKind = 'title' | 'code';

/** The object a move takes: the one a film names `as`, or its kind's own. */
export interface NamedScript {
	readonly as?: ObjectName;
}

/** Which object comes up, and the side of the frame it slides in `from`, past the frame's edge, if any. */
export interface ShowScript extends TimingScript, NamedScript {
	readonly from?: FrameSide;
}

/** Which object is carried to another place. */
export interface ToScript extends TimingScript, NamedScript {}

/** Which object is put away, and the side of the frame it slides out `toward`, if any. */
export interface HideScript extends SlideOutScript, NamedScript {}

/** Which object leans, and how. */
export interface ObjectLeanScript extends LeanScript, NamedScript {}

/** What an object comes up showing, and the box of the frame it comes up in. */
export interface Coming {
	readonly content: Content;
	readonly box: Box;
}

/** An object pushed off past the frame's edge: as it stood, and the box it goes to there. */
interface Push {
	readonly object: FrameObject;
	readonly end: Box;
}

export const NAMED_FORM: Form<NamedScript> = { as: AN_OBJECT_NAME };
const TO_FORM: Form<ToScript> = { ...NAMED_FORM, ...TIMING_FORM };
const HIDE_FORM: Form<HideScript> = { ...SLIDE_OUT_FORM, ...NAMED_FORM };
const LEAN_OBJECT_FORM: Form<ObjectLeanScript> = { ...LEAN_FORM, ...NAMED_FORM };
// The values of an object a move that carries it sets, one that leans it, and one of what it shows; what each writes
// is held to them
const CARRIED = ['box'] as const satisfies readonly (keyof FrameObject)[];
const LEANT = ['angle'] as const satisfies readonly (keyof FrameObject)[];
export const CONTENT = ['content'] as const satisfies readonly (keyof FrameObject)[];
// An object not going: neither gone nor on its way out
const NOT_GONE = 0;

/** An object's values a move that carries it writes, one that leans it, and one of what it shows. */
type Carried = Pick<FrameObject, (typeof CARRIED)[number]>;
type Leant = Pick<FrameObject, (typeof LEANT)[number]>;
type Shows = Pick<FrameObject, (typeof CONTENT)[number]>;

/**
 * An object of a kind coming up, face-on, showing what `comingAt` makes of the scene as the move begins: in place of
 * any of its name, what it shows coming up at an even pace unless the film names a curve; or sliding in whole from past
 * a side of the frame where the film names one, pushing the one of its name standing off past the side across, so the
 * two move as one sheet. `place` is the place the move names, none where it stands over the whole frame. The script is
 * the kind's own, checked by it.
 */
export function objectShow(
	kind: ObjectKind,
	script: ShowScript,
	place: Place | null,
	comingAt: (beginning: Beginning) => Coming
): Move {
	const name = script.as ?? kind;
	const from = script.from ?? null;
	const evenly = from === null ? { ease: linear } : {};
	return {
		part: objectPart(name),
		timing: timingOf({ ...evenly, ...script }),
		places: placesNamed(`${kind}.show's at`, place),
		begin: (beginning) => appearing(beginning, name, comingAt(beginning), from)
	};
}

/** An object of a kind carried to a place, through the boxes between. */
export function objectTo(kind: ObjectKind, place: Place, script: ToScript): Move {
	const move = `${kind}.to`;
	assertKind(place, A_PLACE, `${move}'s place`);
	assertWritten(script, TO_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: CARRIED,
		timing: timingOf(script),
		places: placesNamed(`${move}'s place`, place),
		begin: (beginning) => carried(beginning, name, place, move)
	};
}

/**
 * An object of a kind going where it stands, as what it shows goes, or sliding out past a side of the frame where the
 * film names one; once gone, there is none.
 */
export function objectHide(kind: ObjectKind, script: HideScript): Move {
	const move = `${kind}.hide`;
	assertWritten(script, HIDE_FORM, move);
	const name = script.as ?? kind;
	const toward = script.toward ?? null;
	return {
		part: objectPart(name),
		timing: timingOf(script),
		begin: (beginning) => (toward === null ? going(beginning, name, move) : slidingOut(beginning, name, toward, move))
	};
}

/** An object of a kind leant back from its top edge by `tilt` and swung about its middle by `turn`. */
export function objectLean(kind: ObjectKind, script: ObjectLeanScript): Move {
	const move = `${kind}.lean`;
	assertWritten(script, LEAN_OBJECT_FORM, move);
	const name = script.as ?? kind;
	return {
		part: objectPart(name),
		valueNames: LEANT,
		timing: timingOf(script),
		begin: (beginning) => leaning(beginning, name, script, move)
	};
}

/** An object as a move finds it as it begins; one not on the screen is refused, the move named. */
export function standing(beginning: Beginning, name: ObjectName, move: string): FrameObject {
	const object = beginning.scene.objects.get(name);
	if (object === undefined) throw new FilmError(`${move} finds no ${name} on the screen`);
	return object;
}

/** What an object shows, written into it as it stands at each progress. */
export function showing(name: ObjectName, contentAt: (progress: number) => Content): Change {
	return writing(name, (progress): Shows => ({ content: contentAt(progress) }));
}

/** An object coming into its box, from a frame past it where it slides in, pushing the one of its name standing. */
function appearing(beginning: Beginning, name: ObjectName, coming: Coming, from: FrameSide | null): Change {
	const frame = beginning.format.frame;
	const start = enteringFrom(coming.box, from, frame);
	const push = pushOf(beginning.scene.objects.get(name), from, frame);
	return (scene, progress) =>
		withLeaving(
			withObject(scene, name, {
				box: boxToward(start, coming.box, progress),
				angle: FACE_ON,
				shown: shownComing(from, progress),
				gone: NOT_GONE,
				content: coming.content
			}),
			name,
			pushedAt(push, progress)
		);
}

/** The object on its way to a place, from the box what it shows sets off from. */
function carried(beginning: Beginning, name: ObjectName, place: Place, move: string): Change {
	const object = standing(beginning, name, move);
	const end = wordsPlaced(beginning.format, place);
	const start = settingOff(object.content, object.box, end);
	return writing(name, (progress): Carried => ({ box: boxToward(start, end, progress) }));
}

/** The object's angle on its way from how it leans to the film's. */
function leaning(beginning: Beginning, name: ObjectName, script: LeanScript, move: string): Change {
	const from = standing(beginning, name, move).angle;
	const to = leantFrom(from, script);
	return writing(name, (progress): Leant => ({ angle: angleToward(from, to, progress) }));
}

/** The object going as it stands; once gone, none. */
function going(beginning: Beginning, name: ObjectName, move: string): Change {
	const object = standing(beginning, name, move);
	return (scene, progress) => withObject(scene, name, untilTheEnd(progress, { ...object, gone: progress }));
}

/** The object sliding out whole past a side of the frame, a frame away; once there, none. */
function slidingOut(beginning: Beginning, name: ObjectName, toward: FrameSide, move: string): Change {
	const object = standing(beginning, name, move);
	const end = pastTheEdge(object.box, toward, beginning.format.frame);
	return (scene, progress) =>
		withObject(scene, name, untilTheEnd(progress, { ...object, box: boxToward(object.box, end, progress) }));
}

/**
 * Where what an object shows sets off from, carried to a box: words in a place at the size of the box they go to,
 * keeping where they read from, so their lines change once, where they would break anew on every frame of the way;
 * words on a ground of their own, and code, from their box, the ground or the pane growing or shrinking along the way.
 */
function settingOff(content: Content, box: Box, end: Box): Box {
	switch (content.kind) {
		case 'words':
			return content.onGround ? box : wordsResized(box, end, content.align);
		case 'code':
			return box;
	}
}

/**
 * How far an object coming into its box has come up, `progress` of the way: whole from the start where it slides in
 * from a side, so it travels as one piece, as far as its move where it comes up in place.
 */
function shownComing(from: FrameSide | null, progress: number): number {
	return from === null ? progress : SHOWN_WHOLE;
}

/**
 * What an object sliding in from a side pushes off: the one of its name standing, whole as it stands, and the box a
 * frame past its own on the side across; none where none stands, or nothing slides in.
 */
function pushOf(standingThere: FrameObject | undefined, from: FrameSide | null, frame: Size): Push | null {
	if (from === null || standingThere === undefined) return null;
	return { object: standingThere, end: pastTheEdge(standingThere.box, acrossFrom(from), frame) };
}

/** The object pushed off, `progress` of its way; once past the edge, none. */
function pushedAt(push: Push | null, progress: number): FrameObject | null {
	if (push === null) return null;
	return untilTheEnd(progress, { ...push.object, box: boxToward(push.object.box, push.end, progress) });
}

/** A change that writes some of an object's values into it as it stands, leaving the rest as other moves set them. */
function writing(name: ObjectName, valuesAt: (progress: number) => Partial<FrameObject>): Change {
	return (scene, progress) => withObject(scene, name, { ...standingIn(scene, name), ...valuesAt(progress) });
}

/**
 * The object of a name as the scene holds it, for a move that found it standing as it began and writes some of its
 * values: only a move that sets it whole puts it away, and none does while another of its moves runs.
 */
function standingIn(scene: Scene, name: ObjectName): FrameObject {
	const object = scene.objects.get(name);
	if (object === undefined) throw new Error(`the ${name} is gone while a move of it runs`);
	return object;
}
