/**
 * The moves of an object (`src/props/object.ts`), alike whatever it shows, written once for every kind that makes
 * one — a title's words, code, the agent's terminal, the ending card, a caption, keys: coming up in its box, or sliding
 * in whole from past a side of the frame, pushing the object of its name standing there off past the side across;
 * carried to another place; leant; put away where it stands, or slid out past a side. A move takes the object a film
 * names `as`, or its kind's own name, so a film shows several of a kind at once, each moved by its name. What differs
 * by what an object shows is told here, kind by kind: the curve it comes up on in place, whether it is ever carried or
 * leant, how it reads a place, and the box it sets off from as it is carried.
 *
 * A move that carries an object sets its box alone, one that leans it its angle alone, one of what it shows its content
 * alone, each writing its own into the object as it stands, so they share a step, each as far along as its own share;
 * a move that brings one or puts it away sets it whole. A move of an object that is not on the screen is refused as it
 * begins.
 */
import { FACE_ON, angleToward } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import type { Format } from '../domain/format.ts';
import { A_FRAME_SIDE, type Box, type FrameSide, type Size, boxToward } from '../domain/geometry.ts';
import { type Form, assertKind, assertWritten } from '../domain/handed.ts';
import {
	A_PLACE,
	type Place,
	acrossFrom,
	enteringFrom,
	pastTheEdge,
	placesNamed,
	windowPlaced,
	wordsPlaced,
	wordsResized
} from '../domain/place.ts';
import { type Ease, linear } from '../domain/time.ts';
import {
	type Beginning,
	type Change,
	type Move,
	TIMING_FORM,
	type Timing,
	type TimingScript,
	objectPart,
	timingOf,
	untilTheEnd
} from '../direction/move.ts';
import { AN_OBJECT_NAME, type Content, type FrameObject, type ObjectName } from '../props/object.ts';
import { type Scene, withLeaving, withObject } from '../scene.ts';
import { LEAN_FORM, type LeanScript, leantFrom } from './lean.ts';

/** A kind of object, as a film calls its moves, and the name of the object they take where the film names none. */
export type ObjectKind = 'title' | 'code' | 'terminal' | 'ending' | 'caption' | 'keys';

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

/** Which object is put away, and the side of the frame it slides out `toward`, past the frame's edge, if any. */
export interface HideScript extends TimingScript, NamedScript {
	readonly toward?: FrameSide;
}

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
export const SHOW_FORM: Form<ShowScript> = { from: A_FRAME_SIDE, ...NAMED_FORM, ...TIMING_FORM };
const TO_FORM: Form<ToScript> = { ...NAMED_FORM, ...TIMING_FORM };
const HIDE_FORM: Form<HideScript> = { toward: A_FRAME_SIDE, ...TIMING_FORM, ...NAMED_FORM };
const LEAN_OBJECT_FORM: Form<ObjectLeanScript> = { ...LEAN_FORM, ...NAMED_FORM };
// The values of an object a move that carries it sets, one that leans it, and one of what it shows; what each writes
// is held to them
const CARRIED = ['box'] as const satisfies readonly (keyof FrameObject)[];
const LEANT = ['angle'] as const satisfies readonly (keyof FrameObject)[];
const CONTENT = ['content'] as const satisfies readonly (keyof FrameObject)[];
// An object not going: neither gone nor on its way out; and one sliding in from a side, come up whole from the start
const NOT_GONE = 0;
const SHOWN_WHOLE = 1;
// The curve what an object of each kind shows comes up on in place where the film names none: words and lines of code,
// one after another, at an even pace; the terminal, the card and keys, fading up whole, on their step's
const COMES_UP_ON: { readonly [Kind in ObjectKind]: Ease | null } = {
	title: linear,
	code: linear,
	terminal: null,
	ending: null,
	caption: linear,
	keys: null
};
// What stands over the whole frame on the frame's own terms, never carried or leant: the card, on the frame's own
// ground painted where its box stands; a caption, darkening the frame's edge; keys at the frame's foot, rising clear of
// a caption there
const OVER_THE_WHOLE_FRAME = ['ending', 'caption', 'keys'] as const satisfies readonly Content['kind'][];

/** An object's values a move that carries it writes, one that leans it, and one of what it shows. */
type Carried = Pick<FrameObject, (typeof CARRIED)[number]>;
type Leant = Pick<FrameObject, (typeof LEANT)[number]>;
type Shows = Pick<FrameObject, (typeof CONTENT)[number]>;

/** What an object shows that is carried and leant: any but what stands over the whole frame. */
type MovableContent = Exclude<Content, { readonly kind: (typeof OVER_THE_WHOLE_FRAME)[number] }>;

/** An object that is carried and leant, by what it shows. */
interface MovableObject extends FrameObject {
	readonly content: MovableContent;
}

/**
 * An object of a kind coming up, face-on, showing what `comingAt` makes of the scene as the move begins: in place of
 * any of its name, on its kind's curve unless the film names one; or sliding in whole from past a side of the frame
 * where the film names one, pushing the one of its name standing off past the side across, so the two move as one
 * sheet. `place` is the place the film names, none where it names none. The script is the kind's own, checked by it.
 * Every move of an object is handed its kind and its own name, as a refusal says it: `terminal.open`.
 */
export function objectShow(
	kind: ObjectKind,
	move: string,
	script: ShowScript,
	place: Place | null,
	comingAt: (beginning: Beginning) => Coming
): Move {
	const name = script.as ?? kind;
	const from = script.from ?? null;
	const curve = from === null ? COMES_UP_ON[kind] : null;
	return {
		part: objectPart(name),
		timing: timingOf(curve === null ? script : { ease: curve, ...script }),
		places: placesNamed(`${move}'s at`, place),
		begin: (beginning) => appearing(beginning, name, comingAt(beginning), from)
	};
}

/** An object of a kind carried to a place, through the boxes between. */
export function objectTo(kind: ObjectKind, move: string, place: Place, script: ToScript): Move {
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
export function objectHide(kind: ObjectKind, move: string, script: HideScript): Move {
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
export function objectLean(kind: ObjectKind, move: string, script: ObjectLeanScript): Move {
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
function standing(beginning: Beginning, name: ObjectName, move: string): FrameObject {
	const object = beginning.scene.objects.get(name);
	if (object === undefined) throw new FilmError(`${move} finds no ${name} on the screen`);
	return object;
}

/** An object a move carries or leans as it begins; refused where none stands, or it shows what is never moved so. */
function movable(beginning: Beginning, name: ObjectName, move: string): MovableObject {
	const object = standing(beginning, name, move);
	if (!isMovable(object)) {
		throw new FilmError(`${move} would move the ${name} object: what it shows stands over the whole frame alone`);
	}
	return object;
}

function isMovable(object: FrameObject): object is MovableObject {
	return !OVER_THE_WHOLE_FRAME.some((kind) => kind === object.content.kind);
}

/** A move of what an object of a name shows, which sets that alone, so it shares a step with one that carries it. */
export function contentMove(
	name: ObjectName,
	timing: Timing,
	begin: (beginning: Beginning) => Change | Promise<Change>
): Move {
	return { part: objectPart(name), valueNames: CONTENT, timing, begin };
}

/** What an object shows as a move finds it as it begins; refused where none stands, or it shows another kind. */
export function contentOf<Kind extends Content['kind']>(
	beginning: Beginning,
	name: ObjectName,
	move: string,
	kind: Kind
): Extract<Content, { readonly kind: Kind }> {
	const content = standing(beginning, name, move).content;
	if (!isOfKind(content, kind)) throw new FilmError(`${move} finds the ${name} showing ${content.kind}, not ${kind}`);
	return content;
}

/** Where an object stands in a place: words and code read it as words do, the terminal as the window does. */
export function placedFor(kind: MovableContent['kind'], format: Format, place: Place): Box {
	switch (kind) {
		case 'words':
		case 'code':
			return wordsPlaced(format, place);
		case 'terminal':
			return windowPlaced(format, place);
	}
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
	const object = movable(beginning, name, move);
	const end = placedFor(object.content.kind, beginning.format, place);
	const start = settingOff(object.content, object.box, end);
	return writing(name, (progress): Carried => ({ box: boxToward(start, end, progress) }));
}

/** The object's angle on its way from how it leans to the film's. */
function leaning(beginning: Beginning, name: ObjectName, script: LeanScript, move: string): Change {
	const from = movable(beginning, name, move).angle;
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
 * anything else from its box, growing or shrinking along the way.
 */
function settingOff(content: MovableContent, box: Box, end: Box): Box {
	switch (content.kind) {
		case 'words':
			return content.onGround ? box : wordsResized(box, end, content.align);
		case 'code':
		case 'terminal':
			return box;
	}
}

/** Whether what an object shows is of a kind. */
function isOfKind<Kind extends Content['kind']>(
	content: Content,
	kind: Kind
): content is Extract<Content, { readonly kind: Kind }> {
	return content.kind === kind;
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
