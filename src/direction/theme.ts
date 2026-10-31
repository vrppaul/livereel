/**
 * A theme as a film writes it: any values of a look (`Look` in `src/props/look.ts`), the look a film opens on in
 * `defineFilm` and the look it moves to in `look.to`. A value it leaves out stays as the look has it, so a film tunes
 * one and keeps the rest. Where the words and the page's window stand on the frame is the format's (`Format` in
 * `src/domain/geometry.ts`). What a theme writes in CSS — a font, the ground's layers, as the look's kinds say
 * (`LOOK_KINDS`) — only a browser reads, so it is handed on with where it stands, and the browser refuses it before the
 * film is shot.
 */
import { assertWritten } from '../domain/handed.ts';
import { type CssKind, LOOK_KINDS, type Look, type Theme, namedIn } from '../props/look.ts';

// A film that names no theme opens on livereel's own look
const LIVEREELS_OWN: Theme = {};

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

/** What a theme writes in CSS, each value by where it stands, in the look's order: none, where it writes none. */
export function cssNamedIn(theme: Theme, place: string): readonly CssNamed[] {
	return namedIn(theme).flatMap((name) => cssOfValue(theme, name, place));
}

/** A value a theme names, by where it stands, where the film writes it in CSS; none, where it is checked as written. */
function cssOfValue(theme: Theme, name: keyof Look, place: string): readonly CssNamed[] {
	const kind = LOOK_KINDS[name].css;
	const value = theme[name];
	// Every value written in CSS is a string: the type narrows to it
	if (kind === null || typeof value !== 'string') return [];
	return [{ place: `${place}'s ${name}`, kind, value }];
}
