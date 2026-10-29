/**
 * The film's look, a prop like any other: the ground the screen stands on and the titles and ending come up on, and
 * its glow, the ink of the words livereel writes over the frame, their fonts, sizes and weights and how they come up,
 * the accent of the marks, the window's corners, edge and shadow, the cursor, and the agent's terminal. A film opens on
 * livereel's look with its theme's values, and changes it by moves as it goes: in a play, a colour, a size or a shadow
 * moves through the values between, and a font, which has none between, changes half-way; in a cut, at once. The
 * stage is handed the whole look every frame and sets each value in place of its token (`stage/tokens.css`).
 */
import { colourToward } from '../domain/colour.ts';
import { A_COLOUR, A_FONT_FAMILY, A_PIXELS, A_SHARE, type Form, OneOf, Plain } from '../domain/handed.ts';
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
	/** The font of the terminal and the ending's command, as CSS names a family. */
	readonly mono: string;
	/** How large a title's letters are, and a caption's, in pixels of a frame 1080 on its shorter side. */
	readonly titleSize: number;
	readonly captionSize: number;
	/** How round the page's window's corners are, in pixels of a frame 1080 on its shorter side: 0, square. */
	readonly windowCorner: number;
	/** The colour of the faint edge round the page's window, in hex, its own alpha how faint. */
	readonly windowEdge: string;
	/** How strong the window's shadow is, from 0, none, to 1, livereel's; and its colour, in hex. */
	readonly windowShadow: number;
	readonly windowShadowColour: string;
	/** The terminal's colour, and the colour of what is written in it, in hex. */
	readonly terminal: string;
	readonly terminalInk: string;
	/** Where the ground's glow stands, across and down the frame, each from 0 to 1. */
	readonly glowX: number;
	readonly glowY: number;
	/** How heavy a title's letters are, and a caption's, from 100, thinnest, to 900, as CSS weighs a font. */
	readonly titleWeight: number;
	readonly captionWeight: number;
	/** How large a note's, a callout's, a pin's and a key's letters are, in pixels of a frame 1080 on its shorter side. */
	readonly noteSize: number;
	readonly calloutSize: number;
	readonly pinSize: number;
	readonly keysSize: number;
	/** The cursor's colour and the colour of its edge, in hex. */
	readonly cursorFill: string;
	readonly cursorEdge: string;
	/** How words come up: rising out of a blur, rising sharp, or standing where they are as they appear. */
	readonly wordsMotion: WordsMotion;
}

/** A film's theme: any values of a look, the rest as they stand. */
export type Theme = Partial<Look>;

const A_SIZE = new Plain(isSize, 'a number of pixels, more than 0');
const A_WEIGHT = new Plain(isWeight, 'a weight from 100 to 900');
const NONE = 0;
const THINNEST = 100;
const HEAVIEST = 900;

/** A theme as a film hands it, each value's kind by its name. */
export const THEME_FORM: Form<Theme> = {
	ground: A_COLOUR,
	glow: A_COLOUR,
	ink: A_COLOUR,
	quietInk: A_COLOUR,
	accent: A_COLOUR,
	accentInk: A_COLOUR,
	font: A_FONT_FAMILY,
	mono: A_FONT_FAMILY,
	titleSize: A_SIZE,
	captionSize: A_SIZE,
	windowCorner: A_PIXELS,
	windowEdge: A_COLOUR,
	windowShadow: A_SHARE,
	windowShadowColour: A_COLOUR,
	terminal: A_COLOUR,
	terminalInk: A_COLOUR,
	glowX: A_SHARE,
	glowY: A_SHARE,
	titleWeight: A_WEIGHT,
	captionWeight: A_WEIGHT,
	noteSize: A_SIZE,
	calloutSize: A_SIZE,
	pinSize: A_SIZE,
	keysSize: A_SIZE,
	cursorFill: A_COLOUR,
	cursorEdge: A_COLOUR,
	wordsMotion: A_WORDS_MOTION
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
	windowCorner: 24,
	windowEdge: '#ffffff1a',
	windowShadow: 1,
	windowShadowColour: '#000',
	terminal: '#10141c',
	terminalInk: '#f4f6fa',
	glowX: 0.5,
	glowY: 0.3,
	titleWeight: 700,
	captionWeight: 650,
	noteSize: 44,
	calloutSize: 20,
	pinSize: 26,
	keysSize: 44,
	cursorFill: '#111',
	cursorEdge: '#fff',
	wordsMotion: 'soft'
};

// A value with none between its start and its end, as a font, changes half-way
const HALF_WAY = 0.5;

/**
 * A look with a theme's values in place of its own. A value a film wrote as `undefined` is one it left out, as every
 * value a film writes is read (`src/domain/handed.ts`), so it does not take the look's value's place.
 */
export function lookWith(look: Look, theme: Theme): Look {
	return Object.assign({}, look, Object.fromEntries(Object.entries(theme).filter(isGiven)));
}

/**
 * A look `progress` of the way from one to another: a colour mixed, a number between, a font or a way of words
 * changed half-way.
 */
export function lookToward(start: Look, end: Look, progress: number): Look {
	const named = progress < HALF_WAY ? start : end;
	return {
		ground: colourToward(start.ground, end.ground, progress),
		glow: colourToward(start.glow, end.glow, progress),
		ink: colourToward(start.ink, end.ink, progress),
		quietInk: colourToward(start.quietInk, end.quietInk, progress),
		accent: colourToward(start.accent, end.accent, progress),
		accentInk: colourToward(start.accentInk, end.accentInk, progress),
		font: named.font,
		mono: named.mono,
		titleSize: between(start.titleSize, end.titleSize, progress),
		captionSize: between(start.captionSize, end.captionSize, progress),
		windowCorner: between(start.windowCorner, end.windowCorner, progress),
		windowEdge: colourToward(start.windowEdge, end.windowEdge, progress),
		windowShadow: between(start.windowShadow, end.windowShadow, progress),
		windowShadowColour: colourToward(start.windowShadowColour, end.windowShadowColour, progress),
		terminal: colourToward(start.terminal, end.terminal, progress),
		terminalInk: colourToward(start.terminalInk, end.terminalInk, progress),
		glowX: between(start.glowX, end.glowX, progress),
		glowY: between(start.glowY, end.glowY, progress),
		titleWeight: between(start.titleWeight, end.titleWeight, progress),
		captionWeight: between(start.captionWeight, end.captionWeight, progress),
		noteSize: between(start.noteSize, end.noteSize, progress),
		calloutSize: between(start.calloutSize, end.calloutSize, progress),
		pinSize: between(start.pinSize, end.pinSize, progress),
		keysSize: between(start.keysSize, end.keysSize, progress),
		cursorFill: colourToward(start.cursorFill, end.cursorFill, progress),
		cursorEdge: colourToward(start.cursorEdge, end.cursorEdge, progress),
		wordsMotion: named.wordsMotion
	};
}

function isSize(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > NONE;
}

function isWeight(written: unknown): written is number {
	return typeof written === 'number' && written >= THINNEST && written <= HEAVIEST;
}

/** Whether a value of a theme was given, not written as `undefined`. */
function isGiven(entry: readonly [string, unknown]): boolean {
	return entry[1] !== undefined;
}
