/**
 * A theme as a film writes it: any values of a look (`Look` in `src/props/look.ts`), the look a film opens on in
 * `defineFilm` and the look it moves to in `look.to`. A value it leaves out stays as the look has it, so a film tunes
 * one and keeps the rest. Where things stand on the frame is the format's (`Format` in `src/domain/geometry.ts`).
 */
import { A_COLOUR, A_FONT_FAMILY, A_PIXELS, A_SHARE, type Form, Plain, assertWritten } from '../domain/handed.ts';
import { A_WORDS_MOTION, type Theme } from '../props/look.ts';

const A_SIZE = new Plain(isSize, 'a number of pixels, more than 0');
const A_WEIGHT = new Plain(isWeight, 'a weight from 100 to 900');
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
	wordsMotion: A_WORDS_MOTION
};
// A film that names no theme opens on livereel's own look
const LIVEREELS_OWN: Theme = {};

/** A font a film names, and where it names it, so a font CSS reads as no family is refused by its place. */
export interface FontNamed {
	readonly place: string;
	readonly family: string;
}

/** Where a film's theme stands, as a refusal names it. */
export const THE_FILMS_THEME = "the film's theme";

/** A film's theme, as `defineFilm` reads it: livereel's own where the film writes none. */
export function themeOf(written: unknown): Theme {
	return written === undefined ? LIVEREELS_OWN : themeWritten(written, THE_FILMS_THEME);
}

/**
 * A theme read as a film whose types nobody checked may hand it: anything but an object of a look's values, or a value
 * of another kind, refused by where it stands. A ground named without a glow is a ground of one colour: the glow the
 * look has belongs to the ground it had.
 */
export function themeWritten(written: unknown, place: string): Theme {
	assertWritten(written, THEME_FORM, place);
	if (written.ground !== undefined && written.glow === undefined) return { ...written, glow: written.ground };
	return written;
}

/** The fonts a theme names, each by where it stands: none, where it names none. */
export function fontsNamedIn(theme: Theme, place: string): readonly FontNamed[] {
	return [
		...(theme.font === undefined ? [] : [{ place: `${place}'s font`, family: theme.font }]),
		...(theme.mono === undefined ? [] : [{ place: `${place}'s mono`, family: theme.mono }])
	];
}

function isSize(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written) && written > NONE;
}

function isWeight(written: unknown): written is number {
	return typeof written === 'number' && written >= THINNEST && written <= HEAVIEST;
}
