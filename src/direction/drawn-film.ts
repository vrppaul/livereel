/**
 * A film its own page draws: a page of the film's, a three.js world or any canvas, that draws whatever stands at a
 * moment of the film when asked, so livereel shoots it as it shoots a film of steps — at its rate, a still, a span or
 * the whole, made into a video — while every frame's picture is the page's own. A film of steps is livereel's to draw;
 * this one is for a film that outgrows its steps, written in plain JavaScript.
 *
 * The page answers livereel by one global, `globalThis.livereelDrawnFilm` (`DrawnFilmPage`): a promise settled once it
 * is ready to draw, how long the film is, and the frame drawn at a moment. It must draw a moment the same however it
 * was asked before, as any frame is shot alone, a still or a clip from its middle. The page draws at the frame's size,
 * as finely as it wants, and is shot at that size. No motion blur and no sound yet: a film of this kind shot so far
 * needs neither.
 */
import { FilmError } from '../domain/errors.ts';
import type { Size } from '../domain/geometry.ts';
import { A_FRAME } from '../domain/format.ts';
import { A_COUNT, type Form, anObject, assertWritten, needed } from '../domain/handed.ts';
import { FRAMES_PER_SECOND_WHERE_NONE_IS_NAMED } from './film.ts';
import { SITE_FORM, type Site, type SiteScript, siteOf } from './site.ts';

/** A drawn film's format: the frame it is shot at, which its page draws at. */
export interface DrawnFormat {
	readonly frame: Size;
}

/**
 * A film its own page draws, as its author writes it: where its page is (`address`), and the command that serves it
 * there, where the film starts one (`serve`), beside the rest.
 */
export interface DrawnScript extends SiteScript {
	/** The frames the film is shot at, by the film's own names. */
	readonly formats: Readonly<Record<string, DrawnFormat>>;
	/** How many frames make a second of the film: 60, where none is named. */
	readonly framesPerSecond?: number;
}

/** What the film's page answers livereel by, as `globalThis.livereelDrawnFilm`. */
export interface DrawnFilmPage {
	/** Settled once the page is ready to draw: its fonts, pictures and world in. */
	readonly ready: Promise<void>;
	/** How long the film is, in seconds, read once `ready` settles, so the page may set it then. */
	duration: number;
	/**
	 * The frame drawn at a moment of the film, in seconds from its start; settled once drawn, where it hands a promise.
	 */
	readonly at: (seconds: number) => void | Promise<void>;
}

/** A drawn film in one of its formats, as the studio shoots it. */
export interface DrawnFilmInFormat {
	readonly kind: 'drawn';
	readonly formatName: string;
	readonly format: DrawnFormat;
	readonly framesPerSecond: number;
	readonly site: Site;
}

const NO_FORMAT = 'a film has a format at least: the frame it is shot at';
// A drawn film's script, and its formats, as a film whose types nobody checked may hand them
const DRAWN_FILM_FORM: Form<DrawnScript> = {
	formats: needed(anObject<DrawnScript['formats']>("an object of the film's formats, by name")),
	...SITE_FORM,
	framesPerSecond: A_COUNT
};
const DRAWN_FORMAT_FORM: Form<DrawnFormat> = { frame: needed(A_FRAME) };

/**
 * A drawn film as `defineDrawnFilm` makes it, by which the command line knows a film file's default export for one: in
 * each of its formats, refused as it is defined where its script or a format is in no form of one.
 */
export class DrawnFilm {
	readonly formats: ReadonlyMap<string, DrawnFilmInFormat>;

	constructor(script: DrawnScript) {
		assertWritten(script, DRAWN_FILM_FORM, 'the film');
		const framesPerSecond = script.framesPerSecond ?? FRAMES_PER_SECOND_WHERE_NONE_IS_NAMED;
		const site = siteOf(script);
		const formats = new Map<string, DrawnFilmInFormat>();
		for (const [name, format] of Object.entries(script.formats)) {
			assertWritten(format, DRAWN_FORMAT_FORM, `the film's ${name} format`);
			formats.set(name, { kind: 'drawn', formatName: name, format, framesPerSecond, site });
		}
		if (formats.size === 0) throw new FilmError(NO_FORMAT);
		this.formats = formats;
	}
}

export function defineDrawnFilm(script: DrawnScript): DrawnFilm {
	return new DrawnFilm(script);
}
