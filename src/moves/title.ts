/**
 * Titles: words that come up one after another, shown by an object (`src/moves/object.ts`): over the whole frame on
 * the film's ground, a title card, or in a place the film names (`src/domain/place.ts`), beside the page's window or
 * alone, in place of the title of its name on the screen, and go. A title is the object named `title`, or one the
 * film names `as`, so several stand at once. Any title slides in from past a side of the frame, pushing the one of its
 * name standing off past the side across, moves to a place, leans, or leaves past a side, its ground with it where it
 * has one. A title may set its letters' own size, and how far apart its letters and lines stand, each in place of the
 * look's; one that sets no size takes, in a place, its size by the width of the place, and its words wrap by it there,
 * so a title moving to a place of another size takes that size as it sets off, where it reads from, and travels whole:
 * its lines change once, where they would break anew on every frame of the way.
 *
 * A title stands beside a part instead where the film names one: a block of the page, or an object, a piece lifted off
 * the page among them. It stands on the frame, as large as its letters are set wherever the eye stands, off a point of
 * that part's side as the eye sees the point on each frame (`src/domain/placement.ts`), so it rides with the part as
 * the eye, the window, the camera and the part itself move. Its box is a frame wide and high, off that point, its words
 * reading from its near edge and breaking only where the film breaks them. Handed into the world, it stands there
 * beside the part, where the eye saw it, and the eye moves past it.
 */
import { FilmError } from '../domain/errors.ts';
import { type Box, HALVES, type Point, type Size, boxOf, frameScaleOf } from '../domain/geometry.ts';
import {
	A_LETTER_SPACING,
	A_LINE_HEIGHT,
	A_NAME,
	A_PIXELS,
	A_SHARE,
	A_SIZE,
	type Form,
	OfForm,
	OneOf,
	assertKind,
	assertWritten,
	needed
} from '../domain/handed.ts';
import {
	AN_ALIGNMENT,
	A_PLACE,
	type Alignment,
	type Place,
	alignmentIn,
	wordsPlaced,
	wordsResized
} from '../domain/place.ts';
import { A_TARGET, type Beginning, type Move, type Target } from '../direction/move.ts';
import type { ObjectName } from '../props/object.ts';
import type { TitleType, TitleWords, WordsDown } from '../props/title.ts';
import { A_WORDING, type Said, type Wording, saidOf } from '../props/words.ts';
import {
	type Coming,
	HIDE_FORM,
	type HideScript,
	NESTED_FORM,
	type NestedScript,
	type PlaceReading,
	type PointAsked,
	SHOWN_STANDING_OUT_FORM,
	SHOW_FORM,
	type ShowScript,
	type ShownKind,
	type ShownStandingOutScript,
	objectHide,
	objectMovesOf,
	objectShow,
	objectShowBeside
} from './object.ts';
import {
	A_WORDS_GOING,
	A_WORDS_SCRIPT,
	WORDS_COME_AND_GO_ON,
	type WordsComing,
	type WordsGoingScript,
	type WordsScript,
	comingUpAt,
	refuseWordsBroughtWhole,
	refuseWordsTakenWhole,
	setOffGoing,
	wordsComing
} from './words.ts';

/**
 * Where a title stands: `at` a place on the frame, or over the whole of it, on its ground, where none is named; how it
 * reads there, `align`, the place's own way where none is named; how large its letters are, `size`, in film pixels,
 * over the whole frame and in a place alike, where none is named the look's `titleSize`, and in a place a share of it
 * no larger than its width lets a long word stand; how far apart its letters stand past where its font sets them,
 * `letterSpacing`, and how far below one line's foot the next's stands, `lineHeight`, each in times its letters' size,
 * the look's `titleLetterSpacing` and `titleLineHeight` where none is named; the side it slides in `from`, past the
 * frame's edge, rather than coming up in its place, or the way it comes up there, `enter`; how its words come up there,
 * `words`, the theme's way where none is named; which title it is, `as`; and what it stands `inside`, the page's
 * window, its place then a box in the window's shares, or the `group` it stands in. Or the part it stands `beside`, in
 * place of a place and of what it stands in, reading from that part. And how it stands out as it comes up, `effects`.
 */
export interface TitleScript extends ShowScript, NestedScript, ShownStandingOutScript {
	readonly at?: Place;
	readonly beside?: BesideScript;
	readonly align?: Alignment;
	readonly size?: number;
	readonly letterSpacing?: number;
	readonly lineHeight?: number;
	readonly words?: WordsScript;
}

/**
 * A part a title stands beside, as a film writes it: the block a selector matches, or a box of the screen, `part`, or
 * an object by its name, `object`; the `side` of it its words stand on, its right or its top; how far `along` that side
 * the point they stand off lies, a share of it from its top or its left, its middle where none is named; and how far
 * off that point they stand, `gap`, in film pixels.
 */
interface BesideScript {
	readonly part?: Target;
	readonly object?: ObjectName;
	readonly side: BesideSide;
	readonly along?: number;
	readonly gap: number;
}

const BESIDE_SIDES = ['right', 'top'] as const;

type BesideSide = (typeof BESIDE_SIDES)[number];

/**
 * How words stand on a side of a part: the point of the part's box they stand off, in shares of it, by how far along
 * that side it lies; their box, in the frame's pixels from that point, a frame wide and high, by how far off the point
 * they stand; and where they stand down their box.
 */
interface StandingBeside {
	readonly pointAlong: (along: number) => Point;
	readonly boxOff: (gap: number, frame: Size) => Box;
	readonly down: WordsDown;
}

/**
 * How a title goes: as an object goes, and how many of its words are on their way at once, `words`, where they go in
 * place.
 */
export interface TitleHideScript extends HideScript {
	readonly words?: WordsGoingScript;
}

/**
 * A title's words as `show` reads them: what they say, their place, none over the whole frame, how they read, none for
 * the place's own way, how it sets its letters, each none for the look's, and how they come up.
 */
interface Setting {
	readonly said: Said;
	readonly place: Place | null;
	readonly align: Alignment | null;
	readonly type: TitleType;
	readonly coming: WordsComing;
}

const TITLE = 'title' satisfies ShownKind;
const A_BESIDE: OfForm<BesideScript> = new OfForm<BesideScript>(
	{
		part: A_TARGET,
		object: A_NAME,
		side: needed(new OneOf(BESIDE_SIDES, 'the side of a part words stand on: "right" or "top"')),
		along: A_SHARE,
		gap: needed(A_PIXELS)
	},
	'a part to stand beside: { part, side, along, gap }, a selector or a box of the screen, or { object, side, along, gap }, an object by its name'
);
const TITLE_FORM: Form<TitleScript> = {
	at: A_PLACE,
	beside: A_BESIDE,
	align: AN_ALIGNMENT,
	size: A_SIZE,
	letterSpacing: A_LETTER_SPACING,
	lineHeight: A_LINE_HEIGHT,
	words: A_WORDS_SCRIPT,
	...SHOW_FORM,
	...NESTED_FORM,
	...SHOWN_STANDING_OUT_FORM
};
// Words over the whole frame on their ground stand centred
const OVER_THE_WHOLE: Alignment = 'center';
const TITLE_HIDE_FORM: Form<TitleHideScript> = { words: A_WORDS_GOING, ...HIDE_FORM };
// What a refusal names the moves that bring a title and take it away by
const TITLE_SHOW = 'title.show';
const TITLE_HIDE = 'title.hide';
// A title reads a place as words do, and sets off toward one as `settingOff` has it
const TITLE_READING: PlaceReading<typeof TITLE> = { placed: wordsPlaced, settingOff };
// Words beside a part read from it; the point they stand off lies the middle of its side where the film names none;
// the right side's points lie at the box's right edge, the top's at its top edge; words over a part read from the
// point, at none across from it
const READ_FROM_THE_PART: Alignment = 'start';
const MIDDLE_OF_THE_SIDE = 0.5;
const AT_ITS_RIGHT = 1;
const AT_ITS_TOP = 0;
const FROM_THE_POINT = 0;
// Words to a part's right read from `gap` right of the point, their middle level with it; words over its top read
// from the point, their foot `gap` above it
const STANDING_BESIDE: { readonly [Side in BesideSide]: StandingBeside } = {
	right: {
		pointAlong: (along) => ({ left: AT_ITS_RIGHT, top: along }),
		boxOff: (gap, frame) => ({ left: gap, top: -frame.height / HALVES, ...frame }),
		down: 'middle'
	},
	top: {
		pointAlong: (along) => ({ left: along, top: AT_ITS_TOP }),
		boxOff: (gap, frame) => ({ left: FROM_THE_POINT, top: -gap - frame.height, ...frame }),
		down: 'foot'
	}
};
// Words in a place, or over the whole frame, stand in the middle of their box down it
const IN_THE_MIDDLE: WordsDown = 'middle';

/**
 * A title coming up, its words in the way the film names, typed by a person where it has them typed, each key heard,
 * or in the theme's; over the whole frame its ground first, or in its place; or whole, in a way of livereel's or from
 * past a side of the frame where the film names one, naming no way for its words; words that come up in place come up
 * at an even pace unless the film names a curve. Beside a part, it comes up off the part's point in the same ways.
 */
export function show(text: Wording, script: TitleScript = {}): Move {
	assertKind(text, A_WORDING, "title.show's text");
	assertWritten(script, TITLE_FORM, TITLE_SHOW);
	refuseWordsBroughtWhole(script, TITLE_SHOW);
	const said = saidOf(text);
	const coming = wordsComing(said, script.words);
	const type: TitleType = {
		size: script.size ?? null,
		letterSpacing: script.letterSpacing ?? null,
		lineHeight: script.lineHeight ?? null
	};
	const setting: Setting = { said, place: script.at ?? null, align: script.align ?? null, type, coming };
	const beside = script.beside;
	const showing =
		beside === undefined
			? objectShow(TITLE, TITLE_SHOW, script, setting.place, WORDS_COME_AND_GO_ON, (beginning) =>
					titleComing(setting, beginning)
				)
			: objectShowBeside(TITLE, TITLE_SHOW, script, pointAskedBy(script, beside), WORDS_COME_AND_GO_ON, (beginning) =>
					titleBeside(setting, beside, beginning)
				);
	return { ...showing, sounds: coming.sounds };
}

/**
 * The point of a part a title stands beside asks for, by the side its words stand on and how far along it; refused
 * where the script names a place, what it stands in or how it reads as well, each of which the part sets, or names
 * both a part of the page and an object, or neither.
 */
function pointAskedBy(script: TitleScript, beside: BesideScript): PointAsked {
	if (script.at !== undefined || script.inside !== undefined || script.group !== undefined) {
		throw new FilmError(
			`${TITLE_SHOW} stands a title beside a part, on the frame off it: name no place, window, world or group as well`
		);
	}
	if (script.align !== undefined) {
		throw new FilmError(`${TITLE_SHOW} reads a title beside a part from that part: name no align`);
	}
	const share = STANDING_BESIDE[beside.side].pointAlong(beside.along ?? MIDDLE_OF_THE_SIDE);
	const { part, object } = beside;
	if (part !== undefined && object === undefined) return { kind: 'part', target: part, share };
	if (object !== undefined && part === undefined) return { kind: 'object', name: object, share };
	throw new FilmError(`${TITLE_SHOW}'s beside names one part to stand beside: a part of the page, or an object`);
}

/**
 * A title's words and their box beside a part as their move begins: reading from the part, a frame wide and high off
 * the point they stand off, in the frame's pixels, as far off it as the film names in film pixels.
 */
function titleBeside(setting: Setting, beside: BesideScript, beginning: Beginning): Coming {
	const { said, type } = setting;
	const standing = STANDING_BESIDE[beside.side];
	const comingUp = comingUpAt(setting.coming, said, beginning.scene.look);
	const frame = beginning.format.frame;
	const words: TitleWords = {
		kind: TITLE,
		...said,
		...type,
		align: READ_FROM_THE_PART,
		down: standing.down,
		onGround: false,
		comingUp
	};
	return { content: words, box: standing.boxOff(beside.gap * frameScaleOf(frame), frame) };
}

const TITLE_MOVES = objectMovesOf(TITLE, TITLE_READING);

/**
 * The title carried to another place, through the boxes between, reading as it did, growing to `scale` and coming
 * `depth` toward the eye on the way where the film names them.
 */
export const to = TITLE_MOVES.to;

/**
 * The title, on the frame or beside a part, handed into the world where the eye sees it as the move begins, square to
 * the eye, as far before it as the frame or the part's point, its words going on as they stood, so the eye moves past
 * it from then on.
 */
export const intoTheWorld = TITLE_MOVES.intoTheWorld;

/**
 * The title leant back from its top edge by `tilt`, swung about its middle by `turn`, rolled in its own plane by
 * `roll` and turned over by `over`, its ground with it.
 */
export const lean = TITLE_MOVES.lean;

/**
 * The title standing out as the film names, its ground with it: ringed, glowing, casting a shadow, blurred, grown or
 * brought toward the eye where it stands.
 */
export const effects = TITLE_MOVES.effects;

/**
 * The title going, and its ground with it, its words one after another at an even pace unless the film names a curve,
 * as many on their way at once as it names or as they came; or whole, in a way of livereel's or sliding out past a side
 * of the frame, naming no pace for its words; once gone, there is none.
 */
export function hide(script: TitleHideScript = {}): Move {
	assertWritten(script, TITLE_HIDE_FORM, TITLE_HIDE);
	refuseWordsTakenWhole(script, TITLE_HIDE);
	const { words, ...hiding } = script;
	return objectHide(TITLE, TITLE_HIDE, hiding, {
		curve: WORDS_COME_AND_GO_ON,
		shownAsItGoes: (title) => setOffGoing(title, words, TITLE_HIDE)
	});
}

/**
 * A title's words and their box as their move begins: over the whole frame on their ground, or in their place, read as
 * the film says or in the way of the place, a format's own read as the place it names.
 */
function titleComing(setting: Setting, beginning: Beginning): Coming {
	const { said, place, type } = setting;
	const comingUp = comingUpAt(setting.coming, said, beginning.scene.look);
	const format = beginning.format;
	if (place === null) {
		const align = setting.align ?? OVER_THE_WHOLE;
		const card: TitleWords = { kind: TITLE, ...said, ...type, align, down: IN_THE_MIDDLE, onGround: true, comingUp };
		return { content: card, box: boxOf(format.frame) };
	}
	const align = setting.align ?? alignmentIn(format, place);
	const placed: TitleWords = { kind: TITLE, ...said, ...type, align, down: IN_THE_MIDDLE, onGround: false, comingUp };
	return { content: placed, box: TITLE_READING.placed(format, place, placed) };
}

/**
 * Where a title sets off from, carried to a box: words in a place at the size of the box they go to, keeping where they
 * read from, so their lines change once, where they would break anew on every frame of the way; a title card from its
 * box, growing or shrinking along the way.
 */
function settingOff(standing: Box, end: Box, title: TitleWords): Box {
	return title.onGround ? standing : wordsResized(standing, end, title.align);
}
