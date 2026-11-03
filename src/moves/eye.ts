/**
 * The eye: to a place in the room, where it stands and the spot it looks at, each in pixels of a frame 1080 high from
 * the frame's middle (`src/domain/eye.ts`), through the places the film names on its way, on the course it names
 * (`src/moves/through.ts`). What stands in the world — the page's window, an object a film shows there — is seen from
 * wherever the eye stands; what stands on the frame, a title or a caption, rides with it. What a place leaves out,
 * where the eye stands or what it looks at, stays as it stands as the move begins, at its end and at every key.
 *
 * The path is worked out once, as the move begins, from where the eye stands then: its places are values of the room,
 * and nothing the eye passes moves under it.
 *
 * The eye focuses, and opens as wide as a film names, by a move of its own, which shares a step with one that sends it
 * somewhere (`src/domain/focus.ts`): so far before it; at a spot of the world; on a block of the page; or on an object,
 * where its middle stands. What it focuses on is read once, as the move begins, and placed where it stands as each
 * frame is drawn, so the focus holds on it while the eye, the window and the camera move.
 */
import {
	AN_EYE_PLACE,
	EYE_SPACE,
	type Eye,
	type EyePlace,
	type Focus,
	type Viewpoint,
	eyeSentTo,
	pathThatSees,
	viewpointOf
} from '../domain/eye.ts';
import { FilmError } from '../domain/errors.ts';
import { AT_THE_EYE, focusDistanceOf } from '../domain/focus.ts';
import { middleX, middleY } from '../domain/geometry.ts';
import {
	A_NAME,
	A_PIXELS,
	A_SIZE,
	type Form,
	type Kind,
	OfForm,
	assertKind,
	assertWritten,
	described,
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import { A_SPOT, type Spot } from '../domain/matrix.ts';
import { type Path, type Through, pathOf } from '../domain/path.ts';
import { pixelsToward } from '../domain/toward.ts';
import { trackOf } from '../domain/track.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	TIMING_FORM,
	type Target,
	type TimingScript,
	shownBox,
	timingOf
} from '../direction/move.ts';
import { type ObjectName, focusOn } from '../props/object.ts';
import { cameraOf, withEye } from '../scene.ts';
import { standing } from './object.ts';
import { type ThroughScript, throughFormOf, throughWritten } from './through.ts';

/** The places the eye passes on its way to its own, and how its path goes through them. */
export interface EyeToScript extends TimingScript, ThroughScript<EyePlace> {}

/** An object a film focuses the eye on, by its name. */
interface ObjectFocus {
	readonly object: ObjectName;
}

/**
 * Where a film focuses the eye: so far before it along where it looks, in pixels of a frame 1080 high; at a spot of the
 * world; on a block of the page, the first a selector matches or a box of the screen, at its middle; or on an object,
 * `{ object }` by its name, at its middle.
 */
export type FocusOn = number | Spot | Target | ObjectFocus;

/** How wide the eye opens as it focuses, `aperture`, in pixels of a frame 1080 high; left out, as wide as it stands. */
export interface FocusScript extends TimingScript {
	readonly aperture?: number;
}

/** Where a film focuses the eye, told apart by what it writes. */
type FocusAsked =
	| { readonly kind: 'distance'; readonly distance: number }
	| { readonly kind: 'world'; readonly spot: Spot }
	| { readonly kind: 'block'; readonly target: Target }
	| { readonly kind: 'object'; readonly name: ObjectName };

const TO_FORM: Form<EyeToScript> = { ...throughFormOf(AN_EYE_PLACE, 'a list of places of the eye'), ...TIMING_FORM };
const FOCUS_FORM: Form<FocusScript> = { aperture: A_PIXELS, ...TIMING_FORM };
const AN_OBJECT_FOCUS = new OfForm<ObjectFocus>({ object: needed(A_NAME) }, 'an object by its name: { object }');
const FOCUS_ON_SAID =
	'a distance before the eye in pixels of a frame 1080 high, more than 0; a spot { across, down, out }; a selector or a box of the screen; or an object, { object }';
// What a refusal names each move by
const EYE_TO = 'eye.to';
const EYE_FOCUS = 'eye.focus';
// The values of the eye each move sets: where it stands and looks; where it focuses, and how wide it is open where the
// film names it
const STANDING = ['at', 'aim'] as const satisfies readonly (keyof Eye)[];
const FOCUSED = ['focusing'] as const satisfies readonly (keyof Eye)[];
const FOCUSED_AND_OPENED = ['focusing', 'aperture'] as const satisfies readonly (keyof Eye)[];

/** Where a film focuses the eye, as it writes it, told apart by its kind, or by the names an object is written with. */
class FocusOnKind implements Kind<FocusOn> {
	is(written: unknown): written is FocusOn {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (typeof written === 'number' && A_SIZE.is(written)) return undefined;
		if (typeof written === 'string') return A_TARGET.faultOf(written, place);
		if (!isObjectOfValues(written)) return `${place} is ${described(written)}: it is ${FOCUS_ON_SAID}`;
		if ('object' in written) return AN_OBJECT_FOCUS.faultOf(written, place);
		if ('across' in written) return A_SPOT.faultOf(written, place);
		return A_TARGET.faultOf(written, place);
	}
}

const A_FOCUS_ON: Kind<FocusOn> = new FocusOnKind();

/** The eye to a place, through the places the film names on its way. */
export function to(place: EyePlace, script: EyeToScript = {}): Move {
	assertKind(place, AN_EYE_PLACE, `${EYE_TO}'s place`);
	assertWritten(script, TO_FORM, EYE_TO);
	const through = throughWritten(script, EYE_TO);
	return {
		part: 'eye',
		valueNames: STANDING,
		timing: timingOf(script),
		begin: (beginning) => sentAlong(viewpointOf(beginning.scene.eye), through, place)
	};
}

/**
 * The eye focused where the film names, from where it focused, and opened as wide as it names on the way, where it
 * names how wide.
 */
export function focus(on: FocusOn, script: FocusScript = {}): Move {
	assertKind(on, A_FOCUS_ON, `${EYE_FOCUS}'s focus`);
	assertWritten(script, FOCUS_FORM, EYE_FOCUS);
	const asked = askedOf(on);
	return {
		part: 'eye',
		valueNames: script.aperture === undefined ? FOCUSED : FOCUSED_AND_OPENED,
		timing: timingOf(script),
		begin: (beginning) => refocused(beginning, asked, script.aperture)
	};
}

/**
 * The eye's focus on its way from where it focused, where its last move took it, to what the film focuses it on, read
 * as the move begins and refused where that stands at the eye or behind it then; and the eye on its way to as wide as
 * the film opens it, where it names how wide.
 */
async function refocused(beginning: Beginning, asked: FocusAsked, aperture: number | undefined): Promise<Change> {
	const from = beginning.scene.eye.focusing.to;
	const to = await focusRead(beginning, asked);
	const camera = cameraOf(beginning.scene, beginning.format);
	if (focusDistanceOf(to, camera, beginning.format.frame) <= AT_THE_EYE) {
		throw new FilmError(
			`${EYE_FOCUS} focuses on what stands behind the eye, which it never sees: focus on what stands before it`
		);
	}
	if (aperture === undefined) return refocusing(from, to);
	return refocusingAndOpening(from, to, beginning.scene.eye.aperture, aperture);
}

/**
 * The eye on its way from where it stands, through the places on its way, to its own, each come to from where it
 * stands; refused where it could not see anywhere on the way.
 */
function sentAlong(setOffFrom: Viewpoint, through: Through<EyePlace>, place: EyePlace): Change {
	const keys = through.keys.map((key) => eyeSentTo(setOffFrom, key));
	const path = pathOf(setOffFrom, { ...through, keys }, eyeSentTo(setOffFrom, place), EYE_SPACE);
	return travelling(pathThatSees(path, EYE_TO));
}

/** The eye `progress` of the way along its path, where it focuses and how wide it is open kept as they stand. */
function travelling(path: Path<Viewpoint>): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, ...path.at(progress) });
}

/** What a film focuses the eye on, told apart: a distance, a spot of the world, a block of the page, an object. */
function askedOf(on: FocusOn): FocusAsked {
	if (typeof on === 'number') return { kind: 'distance', distance: on };
	if (typeof on === 'string') return { kind: 'block', target: on };
	if ('object' in on) return { kind: 'object', name: on.object };
	if ('across' in on) return { kind: 'world', spot: on };
	return { kind: 'block', target: on };
}

/**
 * Where the eye focuses on what a film names, read as the move begins: a distance, or a spot of the world, as it is; a
 * block of the page, at its middle as the page lays it out; an object, at its middle where it stands, refused where none
 * of its name stands.
 */
async function focusRead(beginning: Beginning, asked: FocusAsked): Promise<Focus> {
	switch (asked.kind) {
		case 'distance':
		case 'world':
			return asked;
		case 'block': {
			const block = await shownBox(beginning, asked.target, THE_FIRST, EYE_FOCUS);
			return { kind: 'page', point: { left: middleX(block), top: middleY(block) } };
		}
		case 'object': {
			const holders = { camera: cameraOf(beginning.scene, beginning.format), groups: beginning.scene.groups };
			return focusOn(standing(beginning, asked.name, EYE_FOCUS), holders, beginning.format.frame);
		}
	}
}

/** The eye's focus `progress` of the way from where it focused to where it focuses. */
function refocusing(from: Focus, to: Focus): Change {
	return (scene, progress) => withEye(scene, { ...scene.eye, focusing: trackOf(from, to, progress) });
}

/**
 * The eye's focus `progress` of the way from where it focused to where it focuses, and the eye opened so far of the
 * way from how wide it stood to how wide the film names, held between the two.
 */
function refocusingAndOpening(from: Focus, to: Focus, openedFrom: number, opened: number): Change {
	return (scene, progress) =>
		withEye(scene, {
			...scene.eye,
			focusing: trackOf(from, to, progress),
			aperture: pixelsToward(openedFrom, opened, progress)
		});
}
