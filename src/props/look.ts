/**
 * The film's look, a prop like any other: the ground the screen stands on and the titles and ending come up on, and
 * its glow, the ink of the words livereel writes over the frame, their fonts, sizes and weights and how they come up,
 * where a title and a caption's ground stand, the accent of the marks, the corners, edge and shadow of what stands on
 * the ground as a pane — the page's window and its screen, the code's pane and the agent's terminal alike — the colours
 * of the code by kind, the cursor, and the agent's terminal and the ending card, their colours and sizes. A film opens
 * on livereel's look with its theme's values, and changes it by moves as it goes: in a play, a colour, a size or a
 * shadow moves through the values between, and a font, which has none between, changes half-way; in a cut, at once. The stage is handed the whole look every frame and sets each value in place of
 * its token (`stage/tokens.css`).
 *
 * One table, `LOOK_KINDS`, says of each value what a film may write for it and how it moves, so a theme is checked by
 * it and a look moved by it, and livereel's own values stand in `LIVEREELS_LOOK`: a value of the look is its line in
 * the type, in the two tables and in the stage's (`LOOK_SET_AS` in `stage/stage.js`), and the compiler refuses one
 * left out of any.
 */
import { colourToward } from '../domain/colour.ts';
import { A_COLOUR, A_FONT_FAMILY, A_PIXELS, A_SHARE, A_SIZE, type Kind, OneOf, Plain } from '../domain/handed.ts';
import { between } from '../domain/time.ts';

// How words come up: rising out of a blur, rising sharp, or standing where they are as they appear
const WORDS_MOTIONS = ['soft', 'sharp', 'still'] as const;

type WordsMotion = (typeof WORDS_MOTIONS)[number];

const A_WORDS_MOTION = new OneOf(WORDS_MOTIONS, 'how words come up: "soft", "sharp" or "still"');

export interface Look {
	/** The ground's colour, in hex, as it stands at its edges. */
	readonly ground: string;
	/** The colour the ground lightens to where its glow stands, in hex: the ground's own, for a ground of one colour. */
	readonly glow: string;
	/** The colour of the words of titles, captions, notes and the ending, in hex. */
	readonly ink: string;
	/** The colour of what stands back: a pin's label a later one quietened, the ending's line, in hex. */
	readonly quietInk: string;
	/** The colour of pins' marks and a note's line, and of a pin's number on its mark, in hex. */
	readonly accent: string;
	readonly accentInk: string;
	/** The font of titles, captions and the ending, as CSS names a family; where the system has none, livereel's. */
	readonly font: string;
	/** The font of the terminal, the code and the ending's command, as CSS names a family. */
	readonly mono: string;
	/** How large a title's letters are, and a caption's, in pixels of a frame 1080 on its shorter side. */
	readonly titleSize: number;
	readonly captionSize: number;
	/**
	 * How far in from the frame's sides a title over the whole frame stands, and how far up from the frame's foot, or
	 * down from its top, the ground under a caption darkens, in pixels of a frame 1080 on its shorter side.
	 */
	readonly titleMargin: number;
	readonly captionGroundHeight: number;
	/**
	 * How round the corners of a pane are — the page's window, the code's pane, the agent's terminal — in pixels of a
	 * frame 1080 on its shorter side: 0, square.
	 */
	readonly paneCorner: number;
	/** The colour of the faint edge round a pane, in hex, its own alpha how faint. */
	readonly paneEdge: string;
	/** How strong a pane's shadow is, from 0, none, to 1, livereel's; its colour, in hex. */
	readonly paneShadow: number;
	readonly paneShadowColour: string;
	/**
	 * The colour of the terminal, of the code's pane, of the ending's command and of a key's cap, and of what is written
	 * on them, in hex.
	 */
	readonly terminal: string;
	readonly terminalInk: string;
	/**
	 * The colours of the code's pieces by kind, in hex: a comment, a string, a number, a word the language keeps, a
	 * function called, and a key of an object; livereel's are an editor's on a dark pane.
	 */
	readonly codeComment: string;
	readonly codeString: string;
	readonly codeNumber: string;
	readonly codeKeyword: string;
	readonly codeCall: string;
	readonly codeKey: string;
	/** Where the ground's glow stands, across and down the frame, each from 0 to 1. */
	readonly glowX: number;
	readonly glowY: number;
	/** How heavy a title's letters are, and a caption's, from 100, thinnest, to 900, as CSS weighs a font. */
	readonly titleWeight: number;
	readonly captionWeight: number;
	/**
	 * How large a note's, a callout's, a pin's and a key's letters are, the code's at most, the terminal's, and the
	 * ending's name's, line's and command's, in pixels of a frame 1080 on its shorter side.
	 */
	readonly noteSize: number;
	readonly calloutSize: number;
	readonly pinSize: number;
	readonly keysSize: number;
	readonly codeSize: number;
	readonly terminalSize: number;
	readonly endingNameSize: number;
	readonly endingLineSize: number;
	readonly endingCommandSize: number;
	/** The cursor's colour and the colour of its edge, in hex. */
	readonly cursorFill: string;
	readonly cursorEdge: string;
	/** How words come up: rising out of a blur, rising sharp, or standing where they are as they appear. */
	readonly wordsMotion: WordsMotion;
}

/** A film's theme: any values of a look, the rest as they stand. */
export type Theme = Partial<Look>;

/** Values of the look on their way: the look they start from, the look they go to, and the names of those that move. */
export interface LookMoving {
	readonly start: Look;
	readonly end: Look;
	readonly names: readonly (keyof Look)[];
}

/** A kind of the look's values: what a film may write for one, and the value a share of the way from one to another. */
class LookKind<Value> implements Kind<Value> {
	readonly accepted: Kind<Value>;
	readonly toward: (start: Value, end: Value, progress: number) => Value;

	constructor(accepted: Kind<Value>, toward: (start: Value, end: Value, progress: number) => Value) {
		this.accepted = accepted;
		this.toward = toward;
	}

	is(written: unknown): written is Value {
		return this.accepted.is(written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return this.accepted.faultOf(written, place);
	}
}

const THINNEST = 100;
const HEAVIEST = 900;
const A_WEIGHT = new Plain(isWeight, 'a weight from 100 to 900');
// The kinds of the look's values: a colour mixed on its way, a number through the numbers between, and what has none
// between, a font or a way of words, changed half-way
const COLOUR = new LookKind(A_COLOUR, colourToward);
const SIZE = new LookKind(A_SIZE, between);
const PIXELS = new LookKind(A_PIXELS, between);
const SHARE = new LookKind(A_SHARE, between);
const WEIGHT = new LookKind(A_WEIGHT, between);
const FAMILY = new LookKind(A_FONT_FAMILY, halfWay);
const WAY_OF_WORDS = new LookKind(A_WORDS_MOTION, halfWay);

/**
 * The kind of each value of the look, by its name: what a theme a film writes is checked by, value by value, and how
 * each moves as the look does.
 */
export const LOOK_KINDS: { readonly [Name in keyof Look]: LookKind<Look[Name]> } = {
	ground: COLOUR,
	glow: COLOUR,
	ink: COLOUR,
	quietInk: COLOUR,
	accent: COLOUR,
	accentInk: COLOUR,
	font: FAMILY,
	mono: FAMILY,
	titleSize: SIZE,
	captionSize: SIZE,
	titleMargin: PIXELS,
	captionGroundHeight: PIXELS,
	paneCorner: PIXELS,
	paneEdge: COLOUR,
	paneShadow: SHARE,
	paneShadowColour: COLOUR,
	terminal: COLOUR,
	terminalInk: COLOUR,
	codeComment: COLOUR,
	codeString: COLOUR,
	codeNumber: COLOUR,
	codeKeyword: COLOUR,
	codeCall: COLOUR,
	codeKey: COLOUR,
	glowX: SHARE,
	glowY: SHARE,
	titleWeight: WEIGHT,
	captionWeight: WEIGHT,
	noteSize: SIZE,
	calloutSize: SIZE,
	pinSize: SIZE,
	keysSize: SIZE,
	codeSize: SIZE,
	terminalSize: SIZE,
	endingNameSize: SIZE,
	endingLineSize: SIZE,
	endingCommandSize: SIZE,
	cursorFill: COLOUR,
	cursorEdge: COLOUR,
	wordsMotion: WAY_OF_WORDS
};

/** livereel's own look: a dark ground lit toward its top middle, light words, an amber accent. */
export const LIVEREELS_LOOK: Look = {
	ground: '#0b0e14',
	glow: '#182033',
	ink: '#f4f6fa',
	quietInk: '#8b95a7',
	accent: '#ffb224',
	accentInk: '#10141b',
	font: 'ui-sans-serif',
	mono: 'ui-monospace',
	titleSize: 92,
	captionSize: 56,
	titleMargin: 160,
	captionGroundHeight: 380,
	paneCorner: 24,
	paneEdge: '#ffffff1a',
	paneShadow: 1,
	paneShadowColour: '#000',
	terminal: '#10141c',
	terminalInk: '#f4f6fa',
	codeComment: '#8b949e',
	codeString: '#a5d6ff',
	codeNumber: '#79c0ff',
	codeKeyword: '#ff7b72',
	codeCall: '#d2a8ff',
	codeKey: '#7ee787',
	glowX: 0.5,
	glowY: 0.3,
	titleWeight: 700,
	captionWeight: 650,
	noteSize: 44,
	calloutSize: 20,
	pinSize: 26,
	keysSize: 44,
	codeSize: 26,
	terminalSize: 25,
	endingNameSize: 96,
	endingLineSize: 36,
	endingCommandSize: 38,
	cursorFill: '#111',
	cursorEdge: '#fff',
	wordsMotion: 'soft'
};

const LOOK_NAMES = Object.keys(LOOK_KINDS).filter(isOfTheLook);
// A value with none between its start and its end, as a font, changes half-way
const HALF_WAY = 0.5;

/**
 * A look with a theme's values in place of its own. A value a film wrote as `undefined` is one it left out, as every
 * value a film writes is read (`src/domain/handed.ts`), so it does not take the look's value's place.
 */
export function lookWith(look: Look, theme: Theme): Look {
	return Object.assign({}, look, Object.fromEntries(namedIn(theme).map((name) => [name, theme[name]])));
}

/** The names of the values a theme gives, not those it writes as `undefined`. */
export function namedIn(theme: Theme): readonly (keyof Look)[] {
	return LOOK_NAMES.filter((name) => theme[name] !== undefined);
}

/**
 * The look as it stands, with the values named `progress` of the way from one look to another, as each one's kind
 * moves: a colour mixed, a number between, a font or a way of words changed half-way. Every other value stays as the
 * look stands, so a move of other values at once keeps what it sets.
 */
export function lookToward(look: Look, moving: LookMoving, progress: number): Look {
	return Object.assign(
		{},
		look,
		Object.fromEntries(moving.names.map((name) => [name, valueToward(name, moving, progress)]))
	);
}

/** One value of the look `progress` of the way from one look to another, as its kind moves. */
function valueToward<Name extends keyof Look>(name: Name, moving: LookMoving, progress: number): Look[Name] {
	const kind: LookKind<Look[Name]> = LOOK_KINDS[name];
	return kind.toward(moving.start[name], moving.end[name], progress);
}

/** A value with none between, at its start for the first half of the way and at its end for the rest. */
function halfWay<Value>(start: Value, end: Value, progress: number): Value {
	return progress < HALF_WAY ? start : end;
}

function isWeight(written: unknown): written is number {
	return typeof written === 'number' && written >= THINNEST && written <= HEAVIEST;
}

/** Whether a name is one of the look's: every key of its table is, but `Object.keys` types each as a bare string. */
function isOfTheLook(name: string): name is keyof Look {
	return Object.hasOwn(LOOK_KINDS, name);
}
