/**
 * What the studio needs of the world to shoot a film: a browser with the stage and the page open, and footage to
 * keep frames in. The adapters answer these; the studio names no browser and no file of its own.
 */
import type { Format } from '#domain/geometry';
import type { ActContext, PageDriver, PageReader } from '#direction/page';
import type { DrawnScene } from '#scene';

/** The page the film is shot on. */
export interface Stage {
	readonly draw: (scene: DrawnScene) => Promise<void>;
	/** The screen laid flat at its own size, drawn so, for the page to be acted on as it stands. */
	readonly layFlat: (scene: DrawnScene) => Promise<void>;
	/** The stage back at the frame's size, after an act. */
	readonly standUp: () => Promise<void>;
	/** The frame as the stage shows it now, as a JPEG. */
	readonly capture: () => Promise<Uint8Array>;
}

/** Which frames a take keeps, and where each goes. */
export interface Footage {
	/** Refuses a film too short to hold what the footage is to keep: a still past its end. */
	readonly expect: (frames: number) => void;
	readonly keeps: (shot: number) => boolean;
	readonly keep: (shot: number, image: Uint8Array) => Promise<void>;
	/** Whether nothing is left to keep once this many frames are shot. */
	readonly complete: (shot: number) => boolean;
}

/** A browser with the stage and the filmed page open in it, for one take. */
export interface Opened extends AsyncDisposable {
	readonly stage: Stage;
	readonly reader: PageReader;
	readonly driver: PageDriver;
	readonly act: ActContext;
}

export interface Browser {
	readonly open: (format: Format, address: string, sharpness: number) => Promise<Opened>;
}
