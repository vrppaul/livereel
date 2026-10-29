/**
 * A film's look of its own: the ground its screen stands on and its titles and ending come up on, the ink of the words
 * livereel writes over the frame and their font, the accent of its marks, the window's corners, the size of titles
 * and captions, and the agent's terminal. A value the film leaves out stays livereel's, so a film tunes one and keeps
 * the rest; the stage sets each the film gives in place of its own token (`stage/tokens.css`).
 */
import {
	A_COLOUR,
	A_FONT_FAMILY,
	A_PIXELS,
	A_SHARE,
	type Form,
	OneOf,
	Plain,
	assertWritten
} from '../domain/handed.ts';

export interface Theme {
	/** The ground's colour, in hex, as it stands at its edges. */
	readonly ground?: string;
	/** The colour the ground lightens to toward its top middle, in hex: the ground's own, for a ground of one colour. */
	readonly glow?: string;
	/** The colour of the words of titles, captions, notes and the ending, in hex. */
	readonly ink?: string;
	/** The colour of what stands back: a pin's label a later one quietened, the ending's line, in hex. */
	readonly quietInk?: string;
	/** The colour of pins' marks and a note's line, and of a pin's number on its mark, in hex. */
	readonly accent?: string;
	readonly accentInk?: string;
	/** The font of titles, captions and the ending, as CSS names a family; where the system has none, livereel's. */
	readonly font?: string;
	/** The font of the terminal and the ending's command, as CSS names a family. */
	readonly mono?: string;
	/** How far a title's letters stand, and a caption's, in pixels of a frame 1080 on its shorter side. */
	readonly titleSize?: number;
	readonly captionSize?: number;
	/** How round the page's window's corners are, in pixels of a frame 1080 on its shorter side: 0, square. */
	readonly windowCorner?: number;
	/** The colour of the faint edge round the page's window, in hex, its own alpha how faint. */
	readonly windowEdge?: string;
	/** How strong the window's shadow is, from 0, none, to 1, livereel's; and its colour, in hex. */
	readonly windowShadow?: number;
	readonly windowShadowColour?: string;
	/** The terminal's colour, and the colour of what is written in it, in hex. */
	readonly terminal?: string;
	readonly terminalInk?: string;
	/** Where the ground's glow stands, across and down the frame, each from 0 to 1. */
	readonly glowX?: number;
	readonly glowY?: number;
	/** How heavy a title's letters are, and a caption's, from 100, thinnest, to 900, as CSS weighs a font. */
	readonly titleWeight?: number;
	readonly captionWeight?: number;
	/** How large a note's, a callout's, a pin's and a key's letters are, in pixels of a frame 1080 on its shorter side. */
	readonly noteSize?: number;
	readonly calloutSize?: number;
	readonly pinSize?: number;
	readonly keysSize?: number;
	/** The cursor's colour and the colour of its edge, in hex. */
	readonly cursorFill?: string;
	readonly cursorEdge?: string;
	/** Where a caption stands: at the frame's foot, or its top. */
	readonly captionAt?: CaptionPlace;
	/** How words come up: rising out of a blur, rising sharp, or standing where they are as they appear. */
	readonly wordsMotion?: WordsMotion;
}

const CAPTION_PLACES = ['bottom', 'top'] as const;
type CaptionPlace = (typeof CAPTION_PLACES)[number];
const WORDS_MOTIONS = ['soft', 'sharp', 'still'] as const;
type WordsMotion = (typeof WORDS_MOTIONS)[number];

const A_SIZE = new Plain(isSize, 'a number of pixels, more than 0');
const A_WEIGHT = new Plain(isWeight, 'a weight from 100 to 900');
const A_CAPTION_PLACE = new OneOf(CAPTION_PLACES, 'where a caption stands: "bottom" or "top"');
const A_WORDS_MOTION = new OneOf(WORDS_MOTIONS, 'how words come up: "soft", "sharp" or "still"');
const NONE = 0;
const THINNEST = 100;
const HEAVIEST = 900;
const THEME_FORM: Form<Theme> = {
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
	captionAt: A_CAPTION_PLACE,
	wordsMotion: A_WORDS_MOTION
};
// A film that names no theme is shot in livereel's own look
const LIVEREELS_OWN: Theme = {};

/**
 * A film's theme, read as a film whose types nobody checked may hand it: livereel's own where it writes none; anything
 * but an object of the theme's values, or a value of another kind, refused by where it stands. A ground named without
 * a glow is a ground of one colour: livereel's glow belongs to livereel's ground alone.
 */
export function themeOf(written: unknown): Theme {
	if (written === undefined) return LIVEREELS_OWN;
	assertWritten(written, THEME_FORM, "the film's theme");
	if (written.ground !== undefined && written.glow === undefined) return { ...written, glow: written.ground };
	return written;
}

function isSize(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > NONE;
}

function isWeight(written: unknown): written is number {
	return typeof written === 'number' && written >= THINNEST && written <= HEAVIEST;
}
