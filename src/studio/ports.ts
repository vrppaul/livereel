/**
 * What the studio needs of the world to shoot a film: the film's page served, or its set kept, a browser with the
 * stage and the page open, footage to keep frames in, and a track to keep sounds in. The adapters answer these; the
 * studio names no process, browser or file of its own, and blends no image.
 */
import type { Box, Size } from '../domain/geometry.ts';
import type { FilmInFormat, PageKind } from '../direction/film.ts';
import type { ActContext, FilmedPage, MeasuredPage, OwnPage, PageShown } from '../direction/page.ts';
import type { Site } from '../direction/site.ts';
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
	 * Once the frame last drawn is drawn to its end: a stage that draws on the graphics card returns from `draw` with the
	 * card's work queued, which its capture would otherwise wait on.
	 */
	readonly drawingFinished: () => Promise<void>;
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
	readonly kind: Extract<PageShown, 'framed'>;
	/** The screen laid flat at its own size, so the page is acted on as it stands. */
	readonly layFlat: (scene: DrawnScene) => Promise<void>;
	/** The stage back as it was before an act. */
	readonly standUp: () => Promise<void>;
}

/** The stage showing a picture of the page, which stands in a tab of its own and is acted on there. */
export interface PicturedStage extends DrawingStage {
	readonly kind: Extract<PageShown, 'pictured'>;
	/**
	 * A picture of the page taken anew and shown, as the page stands now, as sharp as a camera at this zoom shows it;
	 * whether it came out as the last one did.
	 */
	readonly retakePage: (zoom: number) => Promise<boolean>;
	/**
	 * A picture of a part of the screen, in its pixels, taken as the page stands now, as sharp as a camera at this zoom
	 * shows it, and held apart from the page's picture, which may be retaken, until it is let go: its number, by which a
	 * drawn piece names it.
	 */
	readonly holdPicture: (part: Box, zoom: number) => Promise<number>;
	/** A picture of a part of the screen the stage holds let go, by its number: no frame drawn after names it. */
	readonly letGo: (number: number) => Promise<void>;
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
	/** Refuses a film too short to hold what the footage is to keep: a still or a clip past its end. */
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

/**
 * A browser with the stage and the filmed page open in it, for one take, the page's time standing; and each page of
 * the film's own the stage laid, by its key, which a move measures blocks on while the screen shows it; and the names
 * the film's things module builds a thing by, none where the stage draws no things; and the film's own pictures the
 * stage laid, by their paths, each as large as its file decoded.
 */
export interface Opened extends AsyncDisposable {
	readonly stage: Stage;
	readonly page: FilmedPage;
	readonly ownPages: ReadonlyMap<string, MeasuredPage>;
	readonly act: ActContext;
	readonly time: PageTime;
	readonly thingsBuilt: readonly string[];
	readonly filmsPictures: ReadonlyMap<string, Size>;
}

/**
 * What the stage and the page are set as for a take: the film's format, where the stage stands, the colour scheme the
 * page is asked for, the blocks it blurs, all the film writes in CSS, in its theme or its looks' moves, which the
 * browser reads before anything is shot, once it has laid the film's own font files, how the stage draws a frame, flat
 * or as a room, and the film's things module the room loads, how a fast move is blurred in the take, which says how
 * many exposures a frame is made of at most, the pages and the pictures of the film's own its moves show, which the
 * stage lays before anything is shot, each picture by its path from the film's file, and how its frames are handed to
 * the footage.
 */
export type Setting = Pick<
	FilmInFormat,
	'format' | 'stage' | 'colourScheme' | 'blurred' | 'css' | 'fonts' | 'drawing' | 'things' | 'motionBlur'
> & {
	readonly ownPages: readonly OwnPage[];
	readonly pictures: readonly string[];
	readonly framesHanded: FramesHanded;
};

/**
 * How a take's frames are handed to its footage where the stage draws them sharper than the frame: scaled down to the
 * frame's own size, as a video keeps them, by a stage that can scale its frame without a change of look, the room; or
 * as sharp as they are drawn, as a still keeps its frame to be looked at closely, and as the flat stage hands every
 * frame, whose text the browser would draw anew, not scale, at the frame's own size.
 */
export type FramesHanded = 'scaled' | 'sharp';

/**
 * The page a take films, which decides how it is shown: the live page at its address, as what serves it answers there,
 * static, changed by the film alone, or dynamic, changing of itself too; or the film's set, its states shot ahead,
 * shown one at a time as the film's acts name them, which changes as a static page does.
 */
export type Filmed =
	| { readonly kind: Extract<PageKind, 'static'>; readonly address: string }
	| { readonly kind: Extract<PageKind, 'dynamic'>; readonly address: string }
	| { readonly kind: 'set'; readonly set: SetShot };

export interface Browser {
	readonly open: (setting: Setting, filmed: Filmed, sharpness: number) => Promise<Opened>;
}

/**
 * Where a target of the film stood in a state of its set, where it matched any block: every block it matched, in the
 * page's order, and the ground behind the first, in hex.
 */
export interface TargetShot {
	readonly target: string;
	readonly boxes: readonly Box[];
	readonly ground: string;
}

/** A state of a set as its scenario marked it: its name, and where the set's targets stood, those that matched. */
export interface StateNoted {
	readonly name: string;
	readonly targets: readonly TargetShot[];
}

/** A state of a set as a take shows it: as it was marked, and the address of its picture. */
export interface StateShot extends StateNoted {
	readonly picture: string;
}

/** A state of a set as the browser took it: as it was marked, and its picture, a PNG. */
export interface StateTaken extends StateNoted {
	readonly picture: Uint8Array;
}

/**
 * A film's set as it is written: the screen its states were laid out on, how many of a picture's pixels a page's pixel
 * took, the targets it shot, and its states in the order its scenario marked them.
 */
export interface SetNoted {
	readonly screen: Size;
	readonly sharpness: number;
	readonly targets: readonly string[];
	readonly states: readonly StateNoted[];
}

/** A film's set as a take shows it: as it was written, each state's picture at an address the browser loads. */
export interface SetShot extends Omit<SetNoted, 'states'> {
	readonly states: readonly [StateShot, ...StateShot[]];
}

/** What the app is opened as for its set to be shot: the film's format, how the page is asked to look, how sharp. */
export type SetSetting = Pick<FilmInFormat, 'format' | 'colourScheme' | 'blurred'> & { readonly sharpness: number };

/**
 * The app opened in a browser for its set to be shot: as the film's `ready` is handed it, the set's scenario the same
 * but for the set, and each state taken off it.
 */
export interface OpenedForSet extends AsyncDisposable {
	readonly act: ActContext;
	/** The app pictured as it stands now, as the state of this name, with where each of these targets stands. */
	readonly taken: (name: string, targets: readonly string[]) => Promise<StateTaken>;
}

/** A browser the app is opened in for its set to be shot. */
export interface SetBrowser {
	readonly openForSet: (setting: SetSetting, address: string) => Promise<OpenedForSet>;
}

/** Where a film's set is kept, in one of its formats. */
export interface SetFolder {
	/** The set shot before, as a take shows it; refused where none was, or what it holds is not whole. */
	readonly read: () => Promise<SetShot>;
	/** A set begun, kept apart from the one shot before until it is written whole. */
	readonly taking: () => Promise<SetTaking>;
}

/**
 * A set being shot: its states' pictures kept as they are taken, apart from the set shot before, which it stands in
 * place of only once it is written whole; let go unwritten, all of it is thrown away and that one stays as it was.
 */
export interface SetTaking extends AsyncDisposable {
	readonly keep: (name: string, picture: Uint8Array) => Promise<void>;
	readonly write: (set: SetNoted) => Promise<void>;
}

/** A drawn film's page open in a browser for one take, ready to draw, at the frame's size. */
export interface OpenedDrawnPage extends AsyncDisposable {
	/** How long the film is, in seconds, as its page says. */
	readonly duration: number;
	/** The page drawn at a moment of the film, settled. */
	readonly drawAt: (seconds: number) => Promise<void>;
	/** The frame as the page drew it last, as a JPEG. */
	readonly capture: () => Promise<Uint8Array>;
}

/** A browser a drawn film's page is opened in. */
export interface DrawnBrowser {
	readonly openDrawn: (address: string, frame: Size) => Promise<OpenedDrawnPage>;
}

/** A film's page served for as long as a take lasts, at its address. */
export interface ServedPage extends AsyncDisposable {
	readonly address: string;
}

/**
 * What serves a film's page for a take: the film's command run until the page answers at its address, and stopped as
 * the page served is disposed of; nothing started where someone else serves the page.
 */
export interface PageServer {
	readonly serve: (site: Site) => Promise<ServedPage>;
}
