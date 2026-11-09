/**
 * A film as its author writes it, and as the studio shoots it.
 *
 * An author writes a script, typed by the names of its formats; the studio sees a film in one of its formats, with
 * those names closed over, so one studio shoots every film. A film is made by `defineFilm`, and the command line knows
 * a film file's default export for one by it. One script serves every format: framings by selector fit any frame, and
 * the steps are told which format they are shot in, for the poses a film gives in numbers.
 */
import type { Pose } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { AN_ANGLE_OF_VIEW, focalLengthOf } from '../domain/eye.ts';
import { FORMAT_FORM, type Format } from '../domain/format.ts';
import {
	A_COUNT,
	A_FUNCTION_SAID,
	A_PATH,
	type Form,
	OfForm,
	OneOf,
	Plain,
	SELECTORS,
	aFunction,
	anObject,
	assertWritten,
	described,
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import { assertOwnPlaces, assertPlacesOf } from '../domain/place.ts';
import { assertNearerThanTheEye } from '../domain/stance.ts';
import { leavesRoom } from '../domain/split.ts';
import { namesOf } from '../domain/toward.ts';
import { LIVEREELS_LOOK, type Look, type Theme, lookWith } from '../props/look.ts';
import { type MotionBlurScript, motionBlurOf } from './blur.ts';
import type { ActContext } from './page.ts';
import { type FilmSound, type LivereelSoundsScript, type Music, livereelSoundsOf, musicOf } from './sound.ts';
import { type FilmSet, SET_FORM, type SetScript, setOf } from './set.ts';
import { SITE_FORM, type Site, type SiteScript, siteOf } from './site.ts';
import { type Step, depthsIn, placesIn, stepsOf } from './steps.ts';
import { type CssNamed, THE_FILMS_THEME, cssNamedIn, themeOf } from './theme.ts';

// Where the stage a film is shot on stands: apart from the app, or inside it, on its own address
const STAGES = ['apart', 'inside'] as const;

export type StagePlace = (typeof STAGES)[number];

// The colour schemes a page may be asked for
const COLOUR_SCHEMES = ['light', 'dark'] as const;

export type ColourScheme = (typeof COLOUR_SCHEMES)[number];

// How the page changes: by the film's acts and moves of the page and what the page does in answer, then standing as
// it is, so once two captures come out alike a frame drawn as the one before is that frame; or of itself too, as an
// animation, a video or live data does, so it is captured every frame
const PAGE_KINDS = ['static', 'dynamic'] as const;

export type PageKind = (typeof PAGE_KINDS)[number];

// How the stage draws a frame: as the browser draws a page, the window and each object flat or leant on layers of its
// own; or as a room, the window drawn in WebGL as a plane at the place the eye sees it, from a picture of it as the
// browser draws it face-on
const DRAWINGS = ['flat', 'room'] as const;

export type Drawing = (typeof DRAWINGS)[number];

/** The eye a film is seen through: how many degrees it sees across the frame's shorter side. */
interface EyeScript {
	readonly angleOfView?: number;
}

/**
 * A film of steps as its author writes it: where its page is (`address`), and the command that serves it there, where
 * the film starts one (`serve`), beside the rest.
 */
export interface Script<Name extends string> extends SiteScript {
	/** The frames the film is shot in, each with the screen its page is laid out on, by the film's own names. */
	readonly formats: Readonly<Record<Name, Format>>;
	/**
	 * Where the stage a dynamic page is framed live in stands: `apart` from the app, where none is named, the page
	 * framed as it comes; or `inside` the app, on its own address, for a dynamic page that signs in or refuses to be
	 * framed. A static page stands in a tab of its own, on no stage's frame.
	 */
	readonly stage?: StagePlace;
	/** Wait until the page stands as the first frame shows it; for a film shot on its set, as its scenario starts on it. */
	readonly ready: (context: ActContext) => Promise<void>;
	/**
	 * The app's states shot once ahead of the film by `livereel set`, its scenario marking each, and where the film's
	 * targets stand in each, so the film is shot from their pictures, with no app served, and an act shows a state by
	 * `context.set.show(name)`; the live page where none is named.
	 */
	readonly set?: SetScript;
	/**
	 * The steps, handed the whole screen's pose and the name of the format they are shot in. The name is not inferred
	 * from here, so steps that take fewer names than `formats` has are refused by the compiler.
	 */
	readonly steps: (whole: Pose, formatName: NoInfer<Name>) => readonly Step[];
	/**
	 * livereel's sounds: files of the film's in place of those it gives, a path each from the film's file, and its keys
	 * on one of livereel's keyboards (`membrane` where none is named) or in a file of its own, one or the other; or
	 * `{ enabled: false }` for none.
	 */
	readonly sounds?: LivereelSoundsScript;
	readonly music?: Music;
	/** How a fast move is blurred, livereel's way save the values given, or `{ enabled: false }` for no blur. */
	readonly motionBlur?: MotionBlurScript;
	/** The look the film opens on, livereel's save the values given; `look.to` changes it as the film goes. */
	readonly theme?: Theme;
	/** How many frames make a second of the film: 60, where none is named. */
	readonly framesPerSecond?: number;
	/**
	 * The eye the film is seen through: `angleOfView`, the degrees it sees across the frame's shorter side, 24 where
	 * none is named; the narrower, the farther it stands, and the less what comes toward it, or leans, grows.
	 */
	readonly eye?: EyeScript;
	/** The colour scheme the page is asked for: `light`, where none is named, or `dark`. */
	readonly colourScheme?: ColourScheme;
	/** The blocks the page blurs wherever it shows them, by selector: an address, a key, a name no film should show. */
	readonly blurred?: readonly string[];
	/**
	 * How the page changes: `static`, where none is named, by the film's acts and moves of the page and the page's
	 * answer to them, so it stands in a tab of its own, the stage shows a picture of it taken as it changes, and a
	 * frame like the one before is not captured again once it stands still; or `dynamic`, of itself too, so it stands
	 * live in the stage's frame, captured every frame.
	 */
	readonly page?: PageKind;
	/**
	 * How the stage draws a frame: `flat`, where none is named, as the browser draws a page, the window and each object
	 * on layers of its own, a leant one drawn as soft as the browser draws a layer in 3D; or `room`, the window drawn in
	 * WebGL as a plane where the eye sees it, from a picture of it as dense as the page's device scale, for a static
	 * page.
	 */
	readonly drawing?: Drawing;
	/**
	 * The film's own things, a JavaScript module by its path from the film's file, whose default export builds each
	 * thing `thing.show` names in three.js and sets it from its numbers (`src/props/thing.ts`): drawn in a room alone.
	 */
	readonly things?: string;
}

/**
 * A film in one of its formats, where its page is and the set it is shot on where it names one, where its stage
 * stands, the look it opens on and what its theme writes in CSS, how its page is asked to look and what it blurs, what
 * it says of its sounds and of its blur, and its own code: its wait for the page, and its steps in this format.
 */
export interface FilmInFormat {
	/** A film of steps, beside a film its own page draws (`src/direction/drawn-film.ts`). */
	readonly kind: 'steps';
	readonly formatName: string;
	readonly format: Format;
	readonly stage: StagePlace;
	readonly look: Look;
	readonly css: readonly CssNamed[];
	readonly colourScheme: ColourScheme;
	readonly blurred: readonly string[];
	readonly page: PageKind;
	readonly drawing: Drawing;
	/** The film's things module, its path from the film's file; none where the film builds no thing. */
	readonly things: string | null;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly framesPerSecond: number;
	/** How far before its eye the picture plane stands, in pixels of a frame 1080 high, for the angle it sees. */
	readonly focalLength: number;
	readonly site: Site;
	readonly set: FilmSet | null;
	readonly ready: (context: ActContext) => Promise<void>;
	readonly steps: (whole: Pose) => readonly Step[];
}

export interface Film {
	/** The film in each of its formats, by the film's name for the format, in the order the film gives them. */
	readonly formats: ReadonlyMap<string, FilmInFormat>;
}

const NO_FORMAT = 'a film has a format at least: the frame it is shot in, and the screen its page is laid out on';
const LEAVES_NO_ROOM =
	'leaves the words or the window no room on its frame: a share further from 0 and 1, or narrower margins';
/** Any film's script, its formats' names aside. */
type AnyScript = Script<string>;
const AN_OBJECT_SAID = 'an object';
// The stage stands apart from the app where a film names none: its page framed as it comes
const STAGE_WHERE_NONE_IS_NAMED: StagePlace = 'apart';
const A_STAGE = new OneOf(
	STAGES,
	`"apart", or "inside" the app's own address for a dynamic page that signs in or refuses to be framed`
);
// The page is asked for the light colour scheme where a film names none, and blurs nothing where it names nothing
const COLOUR_SCHEME_WHERE_NONE_IS_NAMED: ColourScheme = 'light';
const NOTHING_BLURRED: readonly string[] = [];
const A_COLOUR_SCHEME = new OneOf(COLOUR_SCHEMES, '"light" or "dark"');
// A stage inside the app frames a page that signs in or refuses a frame; a static page stands in a tab of its own,
// framed by nothing
const INSIDE_FOR_A_DYNAMIC_PAGE =
	'the film\'s stage is "inside", which frames a dynamic page live: a static page is filmed in a tab of its own, ' +
	'signed in as it signs in and refused no frame, so leave the stage out, or give page: "dynamic"';
// The page changes only by the film where a film names none: what most pages do, and the quicker to shoot
const PAGE_WHERE_NONE_IS_NAMED: PageKind = 'static';
const A_PAGE_KIND = new OneOf(
	PAGE_KINDS,
	'"static", changed by the film, or "dynamic" for a page that changes of itself, as an animation or live data does'
);
// The stage draws as the browser draws a page where a film names no drawing: the quicker, in software too
const DRAWING_WHERE_NONE_IS_NAMED: Drawing = 'flat';
const A_DRAWING = new OneOf(
	DRAWINGS,
	'"flat", drawn by the browser as it draws a page, or "room", the window drawn in WebGL as a plane where the eye sees it'
);
// A film's things stand in the world, which the room draws in WebGL; flat draws CSS, and no three.js
const THINGS_IN_A_ROOM =
	'the film names its things, which stand in the world the room draws in WebGL: name drawing: "room", or leave ' +
	'the things out of a flat film';
// A film's things are a module the browser loads as it is written: JavaScript, not TypeScript
const A_SCRIPT_PATH = new Plain(isScriptPath, "a JavaScript module's path, from the film's file, ending in .js");
const SCRIPT_EXTENSION = '.js';
// The room draws the page from its picture: a dynamic page stands live in the stage's frame, and the browser hands
// WebGL a frame of another site blank
const ROOM_FOR_A_STATIC_PAGE =
	'the film\'s drawing is "room", which draws the page from its picture: a dynamic page stands live in a frame of ' +
	'its own site, which WebGL is given blank, so leave the page out for a static one, or the drawing for a flat one';
// A set's pictures change only as the film's acts show another state, as a static page does
const SET_FOR_A_STATIC_PAGE =
	'the film names a set, whose pictures change only as its acts show another state: leave page: "dynamic" out, or ' +
	'film the live page, without the set';
// So many frames make a second where a film names no rate: a fast move runs smooth at it, where at 30 it steps (the
// claude-review promo's dive shot both ways, 2026-11-08)
export const FRAMES_PER_SECOND_WHERE_NONE_IS_NAMED = 60;
// The eye sees so many degrees across the frame's shorter side where a film names none: a long lens, as the
// claude-review promo's, which grows what nears it little
const ANGLE_OF_VIEW_WHERE_NONE_IS_NAMED = 24;
// A film's sounds, music, blur and theme are objects, what is in each read by its own reader, in its own words, first
const FILM_FORM: Form<AnyScript> = {
	formats: needed(anObject<AnyScript['formats']>("an object of the film's formats, by name")),
	...SITE_FORM,
	stage: A_STAGE,
	ready: needed(aFunction<AnyScript['ready']>(A_FUNCTION_SAID)),
	set: new OfForm<SetScript>(SET_FORM, "the film's set: { scenario, targets, sharpness }"),
	steps: needed(aFunction<AnyScript['steps']>(A_FUNCTION_SAID)),
	sounds: anObject<LivereelSoundsScript>(AN_OBJECT_SAID),
	music: anObject<Music>(AN_OBJECT_SAID),
	motionBlur: anObject<MotionBlurScript>(AN_OBJECT_SAID),
	theme: anObject<Theme>(AN_OBJECT_SAID),
	framesPerSecond: A_COUNT,
	eye: new OfForm<EyeScript>({ angleOfView: AN_ANGLE_OF_VIEW }, "the film's eye: { angleOfView }"),
	colourScheme: A_COLOUR_SCHEME,
	blurred: SELECTORS,
	page: A_PAGE_KIND,
	drawing: A_DRAWING,
	things: A_SCRIPT_PATH
};

export class ScriptedFilm<Name extends string> implements Film {
	readonly script: Script<Name>;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly look: Look;
	readonly css: readonly CssNamed[];
	readonly stage: StagePlace;
	readonly colourScheme: ColourScheme;
	readonly blurred: readonly string[];
	readonly page: PageKind;
	readonly drawing: Drawing;
	readonly things: string | null;
	readonly framesPerSecond: number;
	readonly focalLength: number;
	readonly site: Site;
	readonly set: FilmSet | null;
	readonly formats: ReadonlyMap<string, FilmInFormat>;

	constructor(script: Script<Name>) {
		if (!isObjectOfValues(script)) {
			throw new FilmError(`the film is ${described(script)}: it is an object of ${Object.keys(FILM_FORM).join(', ')}`);
		}
		this.script = script;
		this.sound = { livereels: livereelSoundsOf(script.sounds), music: musicOf(script.music) };
		this.motionBlur = motionBlurOf(script.motionBlur);
		const theme = themeOf(script.theme);
		this.look = lookWith(LIVEREELS_LOOK, theme);
		this.css = cssNamedIn(theme, THE_FILMS_THEME);
		refuseUnlikeAFilm(script);
		this.site = siteOf(script);
		this.set = setOf(script.set);
		const staging = stagingOf(script);
		this.stage = staging.stage;
		this.page = staging.page;
		this.drawing = staging.drawing;
		this.things = staging.things;
		this.colourScheme = script.colourScheme ?? COLOUR_SCHEME_WHERE_NONE_IS_NAMED;
		this.blurred = script.blurred ?? NOTHING_BLURRED;
		this.framesPerSecond = script.framesPerSecond ?? FRAMES_PER_SECOND_WHERE_NONE_IS_NAMED;
		this.focalLength = focalLengthOf(script.eye?.angleOfView ?? ANGLE_OF_VIEW_WHERE_NONE_IS_NAMED);
		this.formats = new Map(namesOf(script.formats).map((name) => [name, this.inFormat(name)]));
		if (this.formats.size === 0) throw new FilmError(NO_FORMAT);
	}

	private inFormat(name: Name): FilmInFormat {
		return {
			kind: 'steps',
			formatName: name,
			format: this.script.formats[name],
			stage: this.stage,
			look: this.look,
			css: this.css,
			colourScheme: this.colourScheme,
			blurred: this.blurred,
			page: this.page,
			drawing: this.drawing,
			things: this.things,
			sound: this.sound,
			motionBlur: this.motionBlur,
			framesPerSecond: this.framesPerSecond,
			focalLength: this.focalLength,
			site: this.site,
			set: this.set,
			ready: this.script.ready,
			steps: (whole) =>
				checkedSteps(stepsOf(this.script.steps(whole, name)), this.script.formats[name], name, this.focalLength)
		};
	}
}

export function defineFilm<Name extends string>(script: Script<Name>): Film {
	return new ScriptedFilm(script);
}

/** How a film's page is shown: where the stage stands, how the page changes, and how the stage draws a frame. */
interface Staging {
	readonly stage: StagePlace;
	readonly page: PageKind;
	readonly drawing: Drawing;
	readonly things: string | null;
}

/**
 * How a film's page is shown, livereel's way where the film names nothing; refused where the two cannot go together:
 * a stage inside the app for a static page, which stands in a tab of its own, the room for a dynamic page, which
 * stands live in a frame the room cannot draw, or a set for a dynamic page, as a set's pictures change only by the
 * film's acts.
 */
function stagingOf(script: Pick<AnyScript, 'stage' | 'page' | 'drawing' | 'set' | 'things'>): Staging {
	const stage = script.stage ?? STAGE_WHERE_NONE_IS_NAMED;
	const page = script.page ?? PAGE_WHERE_NONE_IS_NAMED;
	const drawing = script.drawing ?? DRAWING_WHERE_NONE_IS_NAMED;
	if (stage === 'inside' && page === 'static') throw new FilmError(INSIDE_FOR_A_DYNAMIC_PAGE);
	if (drawing === 'room' && page === 'dynamic') throw new FilmError(ROOM_FOR_A_STATIC_PAGE);
	if (script.set !== undefined && page === 'dynamic') throw new FilmError(SET_FOR_A_STATIC_PAGE);
	return { stage, page, drawing, things: thingsDrawnIn(drawing, script.things) };
}

/** The film's things module, where it names one; refused in a film not drawn as a room, which alone draws things. */
function thingsDrawnIn(drawing: Drawing, things: string | undefined): string | null {
	if (things === undefined) return null;
	if (drawing !== 'room') throw new FilmError(THINGS_IN_A_ROOM);
	return things;
}

/** Whether a film names a module the browser loads as it is written: a path ending in `.js`. */
function isScriptPath(written: unknown): written is string {
	return A_PATH.is(written) && written.endsWith(SCRIPT_EXTENSION);
}

/**
 * A film's script, as a film whose types nobody checked may hand it, refused by its place where it is in no form of
 * one: a name a film has not, its formats, each a frame a video holds, a screen, a split that leaves the words and
 * the window room, and places of its own that each name a place, and its functions.
 */
function refuseUnlikeAFilm(written: unknown): void {
	assertWritten(written, FILM_FORM, 'the film');
	for (const [name, format] of Object.entries(written.formats)) {
		const where = `the film's ${name} format`;
		assertWritten(format, FORMAT_FORM, where);
		if (!leavesRoom(format)) throw new FilmError(`${where}'s split ${LEAVES_NO_ROOM}`);
		assertOwnPlaces(format, where);
	}
}

/**
 * A film's steps in a format, refused before anything is shot where a move names a place the format has not, or brings
 * something nearer than its eye of this focal length rests.
 */
function checkedSteps(
	steps: readonly Step[],
	format: Format,
	formatName: string,
	focalLength: number
): readonly Step[] {
	assertPlacesOf(format, placesIn(steps), `the film's ${formatName} format`);
	assertNearerThanTheEye(depthsIn(steps), focalLength);
	return steps;
}
