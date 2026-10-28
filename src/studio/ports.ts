/**
 * What the studio needs of the world to shoot a film: a browser with the stage and the page open, footage to keep
 * frames in, and a track to keep sounds in. The adapters answer these; the studio names no browser and no file of its
 * own, and blends no image.
 */
import type { FilmInFormat } from '../direction/film.ts';
import type { ActContext, FilmedPage } from '../direction/page.ts';
import type { Sound } from '../direction/sound.ts';
import type { DrawnScene } from '../scene.ts';

/** The page the film is shot on. */
export interface Stage {
	readonly draw: (scene: DrawnScene) => Promise<void>;
	/** The screen laid flat at its own size, drawn so, for the page to be acted on as it stands. */
	readonly layFlat: (scene: DrawnScene) => Promise<void>;
	/** The stage back at the frame's size, after an act. */
	readonly standUp: () => Promise<void>;
	/**
	 * Why the stage, or the page in its frame, is no longer there, where one is not: a click that took the stage away,
	 * a page that refuses its frame, one that could not be reached; none where both are.
	 */
	readonly absence: () => Promise<Error | undefined>;
	/** The frame as the stage shows it now, as a JPEG. */
	readonly capture: () => Promise<Uint8Array>;
}

/**
 * A frame's images, each a JPEG: its own, and, where the camera crossed it fast, those of earlier poses along the
 * camera's way there, blended with it into the one image the frame is (`src/domain/shutter.ts`).
 */
export interface Exposures {
	readonly earlier: readonly Uint8Array[];
	readonly own: Uint8Array;
}

/** Which frames a take keeps, and where each goes. */
export interface Footage {
	/** Refuses a film too short to hold what the footage is to keep: a still past its end. */
	readonly expect: (frames: number) => void;
	readonly keeps: (shot: number) => boolean;
	readonly keep: (shot: number, exposures: Exposures) => Promise<void>;
	/** Whether nothing is left to keep once this many frames are shot. */
	readonly complete: (shot: number) => boolean;
}

/** Where the sounds a take's moves make go, each at the moment of the frame it is heard on. */
export interface Track {
	/** Refuses a sound that cannot be laid — a file that is not there, or holds no sound — before anything is shot. */
	readonly expect: (sounds: readonly Sound[]) => Promise<void>;
	readonly hear: (moment: number, sound: Sound) => void;
}

/** A browser with the stage and the filmed page open in it, for one take. */
export interface Opened extends AsyncDisposable {
	readonly stage: Stage;
	readonly page: FilmedPage;
	readonly act: ActContext;
}

/**
 * What the stage and the page are set as for a take: the film's format, where the stage stands, the film's look, the
 * colour scheme the page is asked for, and the blocks it blurs.
 */
export type Setting = Pick<FilmInFormat, 'format' | 'stage' | 'theme' | 'colourScheme' | 'blurred'>;

export interface Browser {
	readonly open: (setting: Setting, address: string, sharpness: number) => Promise<Opened>;
}
