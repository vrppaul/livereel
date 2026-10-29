/**
 * A theme as a film writes it: any values of a look (`Look` in `src/props/look.ts`), the look a film opens on in
 * `defineFilm` and the look it moves to in `look.to`. A value it leaves out stays as the look has it, so a film tunes
 * one and keeps the rest. Where the words and the page's window stand on the frame is the format's (`Format` in
 * `src/domain/geometry.ts`).
 */
import { assertWritten } from '../domain/handed.ts';
import { LOOK_KINDS, type Theme } from '../props/look.ts';

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
	assertWritten<Theme>(written, LOOK_KINDS, place);
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
