/**
 * A film's look of its own: the ground its screen stands on and its titles and ending come up on, the ink of the words
 * livereel writes over the frame and their font, the accent of its marks, the window's corners, the size of titles
 * and captions, and the agent's terminal. A value the film leaves out stays livereel's, so a film tunes one and keeps
 * the rest; the stage sets each the film gives in place of its own token (`stage/tokens.css`).
 */
import { A_COLOUR, A_FONT_FAMILY, type Form, Plain, assertWritten } from '../domain/handed.ts';

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
	/** The terminal's colour, and the colour of what is written in it, in hex. */
	readonly terminal?: string;
	readonly terminalInk?: string;
}

const A_PIXELS = new Plain(isPixels, 'a number of pixels, 0 or more');
const THEME_FORM: Form<Theme> = {
	ground: A_COLOUR,
	glow: A_COLOUR,
	ink: A_COLOUR,
	quietInk: A_COLOUR,
	accent: A_COLOUR,
	accentInk: A_COLOUR,
	font: A_FONT_FAMILY,
	mono: A_FONT_FAMILY,
	titleSize: A_PIXELS,
	captionSize: A_PIXELS,
	windowCorner: A_PIXELS,
	terminal: A_COLOUR,
	terminalInk: A_COLOUR
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

function isPixels(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written >= 0;
}
