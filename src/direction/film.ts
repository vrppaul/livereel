/**
 * A film as its author writes it, and as the studio shoots it.
 *
 * An author writes a script, typed by what its own server hands back (an agent to play, a count to say) and by the
 * names of its formats; the studio sees a film in one of its formats, with those types closed over, so one studio
 * shoots every film. A film is made by `defineFilm`, and the command line knows a film file's default export for one
 * by it. One script serves every format: framings by selector fit any frame, and the steps are told which format they
 * are shot in, for the poses a film gives in numbers.
 */
import type { Pose } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import { FORMAT_FORM, type Format } from '../domain/format.ts';
import {
	AN_ADDRESS,
	A_FUNCTION_SAID,
	A_SELECTOR,
	type Form,
	type Kind,
	ListOf,
	OneOf,
	Plain,
	aFunction,
	anObject,
	assertKind,
	assertWritten,
	described,
	isObjectOfValues,
	needed
} from '../domain/handed.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import { assertOwnPlaces, assertPlacesOf } from '../domain/place.ts';
import { leavesRoom } from '../domain/split.ts';
import { LIVEREELS_LOOK, type Look, type Theme, lookWith } from '../props/look.ts';
import { type MotionBlurScript, motionBlurOf } from './blur.ts';
import type { ActContext } from './page.ts';
import { type FilmSound, type LivereelSoundsScript, type Music, livereelSoundsOf, musicOf } from './sound.ts';
import { type Step, placesIn, stepsOf } from './steps.ts';
import { type FontNamed, THE_FILMS_THEME, fontsNamedIn, themeOf } from './theme.ts';

/** A page served for as long as a take lasts, at its address; the film's own handles may come with it. */
export interface Serving extends AsyncDisposable {
	readonly address: string;
}

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

export interface Script<Served extends Serving, Name extends string> {
	/** The frames the film is shot in, each with the screen its page is laid out on, by the film's own names. */
	readonly formats: Readonly<Record<Name, Format>>;
	/** The page served, or found served elsewhere (`atAddress`), with any handles of the film's own. */
	readonly serve: () => Served | Promise<Served>;
	/**
	 * Where the stage a dynamic page is framed live in stands: `apart` from the app, where none is named, the page
	 * framed as it comes; or `inside` the app, on its own address, for a dynamic page that signs in or refuses to be
	 * framed. A static page stands in a tab of its own, on no stage's frame.
	 */
	readonly stage?: StagePlace;
	/** Wait until the page stands as the first frame shows it. */
	readonly ready: (context: ActContext, served: Served) => Promise<void>;
	/**
	 * The steps, handed the whole screen's pose and the name of the format they are shot in. The name is not inferred
	 * from here, so steps that take fewer names than `formats` has are refused by the compiler.
	 */
	readonly steps: (served: Served, whole: Pose, formatName: NoInfer<Name>) => readonly Step[];
	/**
	 * livereel's sounds: files of the film's in place of those it gives, a path each from the film's file, and its keys
	 * on one of livereel's keyboards (`membrane` where none is named) or in a file of its own, one or the other; or
	 * `{ enabled: false }` for none.
	 */
	readonly sounds?: LivereelSoundsScript;
	readonly music?: Music;
	/** How a fast camera is blurred, livereel's way save the values given, or `{ enabled: false }` for no blur. */
	readonly motionBlur?: MotionBlurScript;
	/** The look the film opens on, livereel's save the values given; `look.to` changes it as the film goes. */
	readonly theme?: Theme;
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
}

/** A film whose page is served: what the studio shoots. */
export interface ServedFilm extends AsyncDisposable {
	readonly address: string;
	readonly ready: (context: ActContext) => Promise<void>;
	readonly steps: (whole: Pose) => readonly Step[];
}

/**
 * A film in one of its formats, where its stage stands, the look it opens on and the fonts its theme names, how its
 * page is asked to look and what it blurs, and what it says of its sounds and of its blur.
 */
export interface FilmInFormat {
	readonly formatName: string;
	readonly format: Format;
	readonly stage: StagePlace;
	readonly look: Look;
	readonly fonts: readonly FontNamed[];
	readonly colourScheme: ColourScheme;
	readonly blurred: readonly string[];
	readonly page: PageKind;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly serve: () => Promise<ServedFilm>;
}

export interface Film {
	/** The film in each of its formats, by the film's name for the format, in the order the film gives them. */
	readonly formats: ReadonlyMap<string, FilmInFormat>;
}

const NO_FORMAT = 'a film has a format at least: the frame it is shot in, and the screen its page is laid out on';
const LEAVES_NO_ROOM =
	'leaves the words or the window no room on its frame: a share further from 0 and 1, or narrower margins';
/** Any film's script, its server and its formats' names aside. */
type AnyScript = Script<Serving, string>;
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
const SELECTORS = new ListOf(A_SELECTOR, 'a list of selectors');
// A film's sounds, music, blur and theme are objects, what is in each read by its own reader, in its own words, first
const FILM_FORM: Form<AnyScript> = {
	formats: needed(anObject<AnyScript['formats']>("an object of the film's formats, by name")),
	serve: needed(aFunction<AnyScript['serve']>(A_FUNCTION_SAID)),
	stage: A_STAGE,
	ready: needed(aFunction<AnyScript['ready']>(A_FUNCTION_SAID)),
	steps: needed(aFunction<AnyScript['steps']>(A_FUNCTION_SAID)),
	sounds: anObject<LivereelSoundsScript>(AN_OBJECT_SAID),
	music: anObject<Music>(AN_OBJECT_SAID),
	motionBlur: anObject<MotionBlurScript>(AN_OBJECT_SAID),
	theme: anObject<Theme>(AN_OBJECT_SAID),
	colourScheme: A_COLOUR_SCHEME,
	blurred: SELECTORS,
	page: A_PAGE_KIND
};
const A_SERVING: Kind<Serving> = new Plain(
	isServing,
	'a page served, as atAddress gives one: { address }, disposed of'
);

export class ScriptedFilm<Served extends Serving, Name extends string> implements Film {
	readonly script: Script<Served, Name>;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly look: Look;
	readonly fonts: readonly FontNamed[];
	readonly stage: StagePlace;
	readonly colourScheme: ColourScheme;
	readonly blurred: readonly string[];
	readonly page: PageKind;
	readonly formats: ReadonlyMap<string, FilmInFormat>;

	constructor(script: Script<Served, Name>) {
		if (!isObjectOfValues(script)) {
			throw new FilmError(`the film is ${described(script)}: it is an object of ${Object.keys(FILM_FORM).join(', ')}`);
		}
		this.script = script;
		this.sound = { livereels: livereelSoundsOf(script.sounds), music: musicOf(script.music) };
		this.motionBlur = motionBlurOf(script.motionBlur);
		const theme = themeOf(script.theme);
		this.look = lookWith(LIVEREELS_LOOK, theme);
		this.fonts = fontsNamedIn(theme, THE_FILMS_THEME);
		refuseUnlikeAFilm(script);
		this.stage = script.stage ?? STAGE_WHERE_NONE_IS_NAMED;
		this.colourScheme = script.colourScheme ?? COLOUR_SCHEME_WHERE_NONE_IS_NAMED;
		this.blurred = script.blurred ?? NOTHING_BLURRED;
		this.page = script.page ?? PAGE_WHERE_NONE_IS_NAMED;
		if (this.stage === 'inside' && this.page === 'static') throw new FilmError(INSIDE_FOR_A_DYNAMIC_PAGE);
		this.formats = new Map(namesOf(script.formats).map((name) => [name, this.inFormat(name)]));
		if (this.formats.size === 0) throw new FilmError(NO_FORMAT);
	}

	private inFormat(name: Name): FilmInFormat {
		return {
			formatName: name,
			format: this.script.formats[name],
			stage: this.stage,
			look: this.look,
			fonts: this.fonts,
			colourScheme: this.colourScheme,
			blurred: this.blurred,
			page: this.page,
			sound: this.sound,
			motionBlur: this.motionBlur,
			serve: () => this.served(name)
		};
	}

	/**
	 * The film served for a take. What `serve` gives in no form of a page served is refused; whatever it started is
	 * stopped first where it can be, so nothing is left running.
	 */
	private async served(name: Name): Promise<ServedFilm> {
		const served = await this.script.serve();
		const fault = A_SERVING.faultOf(served, "what the film's serve gives");
		if (fault !== undefined) {
			await disposedIfItCan(served);
			throw new FilmError(fault);
		}
		return servedFilm(this.script, served, name);
	}
}

/** A page served by someone else, at an address: nothing to stop after. */
class ServedElsewhere implements Serving {
	readonly address: string;

	constructor(address: string) {
		this.address = address;
	}

	/** Nothing was started, so nothing is stopped. */
	[Symbol.asyncDispose](): Promise<void> {
		return Promise.resolve();
	}
}

export function defineFilm<Served extends Serving, Name extends string>(script: Script<Served, Name>): Film {
	return new ScriptedFilm(script);
}

export function atAddress(address: string): Serving {
	assertKind(address, AN_ADDRESS, "atAddress's address");
	return new ServedElsewhere(address);
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
 * The names of a film's formats, in the order it gives them. Every key is one, but `Object.keys` types each as a bare
 * string: the guard keeps them all and tells the compiler they are the film's names.
 */
function namesOf<Name extends string>(formats: Readonly<Record<Name, Format>>): Name[] {
	return Object.keys(formats).filter((name) => isFormatOf(formats, name));
}

function isFormatOf<Name extends string>(formats: Readonly<Record<Name, Format>>, name: string): name is Name {
	return Object.hasOwn(formats, name);
}

function servedFilm<Served extends Serving, Name extends string>(
	script: Script<Served, Name>,
	served: Served,
	formatName: Name
): ServedFilm {
	return {
		address: served.address,
		ready: (context) => script.ready(context, served),
		steps: (whole) =>
			placedSteps(stepsOf(script.steps(served, whole, formatName)), script.formats[formatName], formatName),
		[Symbol.asyncDispose]: () => served[Symbol.asyncDispose]()
	};
}

/** A film's steps in a format, refused where a move names a place the format has not, before anything is shot. */
function placedSteps(steps: readonly Step[], format: Format, formatName: string): readonly Step[] {
	assertPlacesOf(format, placesIn(steps), `the film's ${formatName} format`);
	return steps;
}

/** Whether what a film's `serve` gives is a page served: its address, and a way to stop it once the take ends. */
function isServing(written: unknown): written is Serving {
	return isDisposable(written) && 'address' in written && AN_ADDRESS.is(written.address);
}

function isDisposable(written: unknown): written is AsyncDisposable {
	return (
		typeof written === 'object' &&
		written !== null &&
		Symbol.asyncDispose in written &&
		typeof written[Symbol.asyncDispose] === 'function'
	);
}

/** What a film's `serve` gave, stopped where it says how to be. */
async function disposedIfItCan(written: unknown): Promise<void> {
	if (isDisposable(written)) await written[Symbol.asyncDispose]();
}
