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
import type { Format } from '../domain/geometry.ts';
import type { MotionBlur } from '../domain/shutter.ts';
import { type MotionBlurScript, motionBlurOf } from './blur.ts';
import type { ActContext } from './page.ts';
import { type FilmSound, type LivereelSoundsScript, type Music, livereelSoundsOf } from './sound.ts';
import type { Step } from './steps.ts';

/** A page served for as long as a take lasts, at its address; the film's own handles may come with it. */
export interface Serving extends AsyncDisposable {
	readonly address: string;
}

export interface Script<Served extends Serving, Name extends string> {
	/** The frames the film is shot in, each with the screen its page is laid out on, by the film's own names. */
	readonly formats: Readonly<Record<Name, Format>>;
	/** The page served, or found served elsewhere (`atAddress`), with any handles of the film's own. */
	readonly serve: () => Served | Promise<Served>;
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
}

/** A film whose page is served: what the studio shoots. */
export interface ServedFilm extends AsyncDisposable {
	readonly address: string;
	readonly ready: (context: ActContext) => Promise<void>;
	readonly steps: (whole: Pose) => readonly Step[];
}

/** A film in one of its formats, and what it says of its sounds and of its blur. */
export interface FilmInFormat {
	readonly formatName: string;
	readonly format: Format;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly serve: () => Promise<ServedFilm>;
}

export interface Film {
	/** The film in each of its formats, by the film's name for the format, in the order the film gives them. */
	readonly formats: ReadonlyMap<string, FilmInFormat>;
}

const NO_FORMAT = 'a film has a format at least: the frame it is shot in, and the screen its page is laid out on';
// A film that says nothing of livereel's sounds keeps every one of them
const EVERY_LIVEREEL_SOUND: LivereelSoundsScript = {};
// A film that says nothing of its blur is blurred as livereel blurs
const LIVEREELS_BLUR: MotionBlurScript = {};

export class ScriptedFilm<Served extends Serving, Name extends string> implements Film {
	readonly script: Script<Served, Name>;
	readonly sound: FilmSound;
	readonly motionBlur: MotionBlur | null;
	readonly formats: ReadonlyMap<string, FilmInFormat>;

	constructor(script: Script<Served, Name>) {
		this.script = script;
		this.sound = soundOfFilm(script);
		this.motionBlur = motionBlurOf(script.motionBlur ?? LIVEREELS_BLUR);
		this.formats = new Map(namesOf(script.formats).map((name) => [name, this.inFormat(name)]));
		if (this.formats.size === 0) throw new FilmError(NO_FORMAT);
	}

	private inFormat(name: Name): FilmInFormat {
		return {
			formatName: name,
			format: this.script.formats[name],
			sound: this.sound,
			motionBlur: this.motionBlur,
			serve: () => this.served(name)
		};
	}

	private async served(name: Name): Promise<ServedFilm> {
		return servedFilm(this.script, await this.script.serve(), name);
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
	return new ServedElsewhere(address);
}

/**
 * What a film says of its sounds: every one of livereel's where it says nothing of them, none where it turns them off,
 * and no music where it gives none. Music at a volume that is no level — not a number, endless, below none — is
 * refused, as is a keyboard livereel has not.
 */
function soundOfFilm<Served extends Serving, Name extends string>(script: Script<Served, Name>): FilmSound {
	const music = script.music ?? null;
	if (music !== null && !(Number.isFinite(music.volume) && music.volume >= 0)) {
		throw new FilmError(`the music's volume is ${music.volume}: it is 0 or more, 1 as loud as the file`);
	}
	const sounds = script.sounds ?? EVERY_LIVEREEL_SOUND;
	return { livereels: sounds.enabled === false ? null : livereelSoundsOf(sounds), music };
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
		steps: (whole) => script.steps(served, whole, formatName),
		[Symbol.asyncDispose]: () => served[Symbol.asyncDispose]()
	};
}
