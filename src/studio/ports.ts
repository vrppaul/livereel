/**
 * What the studio needs of the world to shoot a film: a browser with the stage and the page open, footage to keep
 * frames in, and a track to keep sounds in. The adapters answer these; the studio names no browser and no file of its
 * own, and blends no image.
 */
import type { FilmInFormat } from '../direction/film.ts';
import type { ActContext, FilmedPage } from '../direction/page.ts';
import type { Sound } from '../direction/sound.ts';
import type { DrawnScene } from '../scene.ts';

/**
 * The page the film is shot on, and the filmed page on it, one of two kinds: live in its frame, as the stage shows a
 * dynamic page, or a picture of it taken in a tab of its own, as it shows a static one.
 */
export type Stage = FramedStage | PicturedStage;

/** What a stage of either kind does: a frame drawn and captured, and whether it and its page are still there. */
interface DrawingStage {
	/**
	 * How many exposures of a frame the stage draws at once, laid over one another so each weighs the same, to be
	 * captured as the frame: one where it draws one at a time, to be captured each and blended by the footage.
	 */
	readonly exposuresAtOnce: number;
	/** The frame drawn as these exposures of it, as many as the stage draws at once at most. */
	readonly draw: (exposures: readonly DrawnScene[]) => Promise<void>;
	/**
	 * Why the stage, or the page in its frame, is no longer there, where one is not: a click that took the stage away,
	 * a page that refuses its frame, one that could not be reached; none where both are.
	 */
	readonly absence: () => Promise<Error | undefined>;
	/** The frame as the stage shows it now, as a JPEG. */
	readonly capture: () => Promise<Uint8Array>;
}

/** The stage with the page live in its frame, which every frame shows as it is. */
export interface FramedStage extends DrawingStage {
	readonly kind: 'framed';
	/** The screen laid flat at its own size, so the page is acted on as it stands. */
	readonly layFlat: (scene: DrawnScene) => Promise<void>;
	/** The stage back as it was before an act. */
	readonly standUp: () => Promise<void>;
}

/** The stage showing a picture of the page, which stands in a tab of its own and is acted on there. */
export interface PicturedStage extends DrawingStage {
	readonly kind: 'pictured';
	/**
	 * A picture of the page taken anew and shown, as the page stands now, as sharp as a camera at this zoom shows it;
	 * whether it came out as the last one did.
	 */
	readonly retakePage: (zoom: number) => Promise<boolean>;
	/**
	 * Whether the page changed its document of itself since the take last asked, as when a timer of its own runs out or
	 * an answer comes in, so its picture may no longer show it.
	 */
	readonly changedOfItself: () => boolean;
}

/**
 * The filmed page's own time — its timers, its animation frames, its date — kept to the film's: it stands between
 * frames, is run on as far as the film goes, and runs as the wall's only while the film's own code waits on the page.
 */
export interface PageTime {
	/** The film begun where the page's time stands: its moment 0, however far the waits before it ran the page on. */
	readonly begin: () => void;
	/**
	 * The page's time run on to a moment of its own since the film began, as far as the speed the film sets took it, its
	 * timers due by then run; where a wait ran it on past that moment, it stands until the film catches up, so what the
	 * page set runs out as far into the film as it said.
	 */
	readonly runTo: (moment: number) => Promise<void>;
	/** Work that waits on the page done with the page's time running as the wall's, as the page needs to answer it. */
	readonly running: (work: () => Promise<void>) => Promise<void>;
}

/**
 * A frame's images, each a JPEG: its own, and, where anything on it moved fast, those of the scene as it stood at
 * earlier moments of the frame's time, blended with it into the one image the frame is (`src/domain/shutter.ts`).
 * Where the stage drew every exposure at once, laid over one another, its own is the whole frame already, and none is
 * earlier.
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

/** A browser with the stage and the filmed page open in it, for one take, the page's time standing. */
export interface Opened extends AsyncDisposable {
	readonly stage: Stage;
	readonly page: FilmedPage;
	readonly act: ActContext;
	readonly time: PageTime;
}

/**
 * What the stage and the page are set as for a take: the film's format, where the stage stands, the colour scheme the
 * page is asked for, the blocks it blurs, every font the film names, in its theme or its looks' moves, which the
 * browser reads before anything is shot, whether the page changes of itself, which decides how it is shown, and how a
 * fast move is blurred in the take, which says how many exposures a frame is made of at most.
 */
export type Setting = Pick<
	FilmInFormat,
	'format' | 'stage' | 'colourScheme' | 'blurred' | 'fonts' | 'page' | 'motionBlur'
>;

export interface Browser {
	readonly open: (setting: Setting, address: string, sharpness: number) => Promise<Opened>;
}
