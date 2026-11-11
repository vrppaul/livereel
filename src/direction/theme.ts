/**
 * A theme as a film writes it: any values of a look (`Look` in `src/props/look.ts`), the look a film opens on in
 * `defineFilm` and the look it moves to in `look.to`. A value it leaves out stays as the look has it, so a film tunes
 * one and keeps the rest. Where the words and the page's window stand on the frame is the format's (`Format` in
 * `src/domain/geometry.ts`). What a theme writes in CSS — a font, the ground's layers, as the look's kinds say
 * (`LOOK_KINDS`) — only a browser reads, so it is handed on with where it stands, and the browser refuses it before the
 * film is shot. A font the look names is one the machine has, or one whose file the film brings by the family it sets
 * (`defineFilm`'s `fonts`), which the browser lays before it reads the look's.
 */
import { A_PATH, RecordOf, assertWritten, namesGiven } from '../domain/handed.ts';
import { type CssKind, LOOK_KINDS, LOOK_NAMES, type Look, type Theme } from '../props/look.ts';

// A film that names no theme opens on livereel's own look, and brings no font of its own where it names none
const LIVEREELS_OWN: Theme = {};
const NO_FONTS: readonly FilmFont[] = [];

/** A font file the film brings, by its path from the film's file, and the family the look names it by. */
export interface FilmFont {
	readonly family: string;
	readonly file: string;
}

/** The font files a film brings, as it writes them: each path by the family it sets. */
export type FontsScript = Readonly<Record<string, string>>;

export const A_FONTS_SCRIPT = new RecordOf(
	A_PATH,
	"the film's font files by the family each sets: { 'Inter Tight': './InterTight.ttf' }"
);

/**
 * A value a film writes in CSS, where it writes it, and what CSS reads it as, so one CSS cannot read so is refused by
 * its place.
 */
export interface CssNamed {
	readonly place: string;
	readonly kind: CssKind;
	readonly value: string;
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
	assertWritten<Theme>(written, LOOK_KINDS, place);
	if (written.ground !== undefined && written.glow === undefined) return { ...written, glow: written.ground };
	return written;
}

/** The font files a film brings, each by the family it sets: none, where it names none. */
export function fontsOf(written: FontsScript | undefined): readonly FilmFont[] {
	if (written === undefined) return NO_FONTS;
	return Object.entries(written).map(([family, file]) => ({ family, file }));
}

/** What a theme writes in CSS, each value by where it stands, in the look's order: none, where it writes none. */
export function cssNamedIn(theme: Theme, place: string): readonly CssNamed[] {
	return namesGiven(theme, LOOK_NAMES).flatMap((name) => cssOfValue(theme, name, place));
}

/** A value a theme names, by where it stands, where the film writes it in CSS; none, where it is checked as written. */
function cssOfValue(theme: Theme, name: keyof Look, place: string): readonly CssNamed[] {
	const kind = LOOK_KINDS[name].css;
	const value = theme[name];
	// Every value written in CSS is a string: the type narrows to it
	if (kind === null || typeof value !== 'string') return [];
	return [{ place: `${place}'s ${name}`, kind, value }];
}
