/**
 * A film's look of its own: the ground its screen stands on and its titles and ending come up on, the ink of the words
 * livereel writes over the frame, and their font. A value the film leaves out stays livereel's, so a film tunes one
 * and keeps the rest; the stage sets each the film gives in place of its own token (`stage/tokens.css`).
 */
import { A_COLOUR, A_FONT_FAMILY, type Form, assertWritten } from '../domain/handed.ts';

export interface Theme {
	/** The ground's colour, in hex, as it stands at its edges. */
	readonly ground?: string;
	/** The colour the ground lightens to toward its top middle, in hex: the ground's own, for a ground of one colour. */
	readonly glow?: string;
	/** The colour of the words of titles, captions and the ending, in hex. */
	readonly ink?: string;
	/** The font of titles, captions and the ending, as CSS names a family; where the system has none, livereel's. */
	readonly font?: string;
}

const THEME_FORM: Form<Theme> = { ground: A_COLOUR, glow: A_COLOUR, ink: A_COLOUR, font: A_FONT_FAMILY };
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
