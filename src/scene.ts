/**
 * What the stage draws on one frame: every prop's state at one moment.
 *
 * A scene is plain values, never changed in place: a move's change hands back a scene with its own prop set, and the
 * take keeps the one standing. `drawn` works out everything the stage needs from it — a caption's words, the
 * terminal's spinner — so the stage draws numbers and words and decides nothing. A prop that may be absent is
 * `null`; the compiler holds every prop to a drawn form here and to a drawer on the stage.
 */
import type { Format } from './domain/geometry.ts';
import { type Pose, wholePose } from './domain/camera.ts';
import { type Caption, type DrawnCaption, drawnCaption } from './props/caption.ts';
import type { Cursor } from './props/cursor.ts';
import type { Ending } from './props/ending.ts';
import type { Light } from './props/light.ts';
import { SCREEN_UP, type Screen } from './props/screen.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './props/terminal.ts';

export interface PropStates {
	camera: Pose;
	screen: Screen;
	light: Light | null;
	cursor: Cursor | null;
	caption: Caption | null;
	terminal: Terminal | null;
	ending: Ending | null;
}

export type PropName = keyof PropStates;

export type Scene = { readonly [Name in PropName]: PropStates[Name] };

/** What the stage is handed for each prop: its state, or what is worked out from it to draw. */
interface DrawnProps {
	camera: Pose;
	screen: Screen;
	light: Light | null;
	cursor: Cursor | null;
	caption: DrawnCaption | null;
	terminal: DrawnTerminal | null;
	ending: Ending | null;
}

export type DrawnScene = { readonly [Name in PropName]: DrawnProps[Name] };

/** The scene a film opens on: the whole screen, face-on, up; nothing over it. */
export function openingScene(format: Format): Scene {
	return {
		camera: wholePose(format),
		screen: SCREEN_UP,
		light: null,
		cursor: null,
		caption: null,
		terminal: null,
		ending: null
	};
}

export function withProp<Name extends PropName>(scene: Scene, name: Name, state: PropStates[Name]): Scene {
	return { ...scene, [name]: state };
}

/** The same scene seen from another pose. */
export function posed(scene: Scene, pose: Pose): Scene {
	return withProp(scene, 'camera', pose);
}

/** The scene as the stage draws it at a moment of the film. */
export function drawn(scene: Scene, moment: number): DrawnScene {
	return {
		camera: scene.camera,
		screen: scene.screen,
		light: scene.light,
		cursor: scene.cursor,
		caption: scene.caption === null ? null : drawnCaption(scene.caption),
		terminal: scene.terminal === null ? null : drawnTerminal(scene.terminal, moment),
		ending: scene.ending
	};
}
