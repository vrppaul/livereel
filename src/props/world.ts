/**
 * How the world looks, a prop of its own beside the film's look (`src/props/look.ts`), which is how livereel's own
 * things look: the lights and soft boxes that light a film's own things and the window's body in a room
 * (`src/props/lighting.ts`), and the glow round the brightest light, as a lens blooms. A film opens on livereel's
 * world, which has none of them, with the values its `world` names, and changes it by moves as it goes (`world.to`): in
 * a play, the glow's strength and spread through the values between, the lights light by light where they are as many
 * as those they go to, and the soft boxes, or lights of another number, whole, half-way; in a cut, at once. The stage
 * is handed it as the room draws it (`DrawnWorld`).
 *
 * One table, `WORLD_KINDS`, says of each value what a film may write for it and how it moves (`src/domain/values.ts`),
 * so the film's world and a move's are checked by it and the world moved by it, and livereel's own values stand in
 * `LIVEREELS_WORLD`.
 */
import type { Size } from '../domain/geometry.ts';
import { A_GLOW_STRENGTH, A_SHARE } from '../domain/handed.ts';
import { amountToward, halfWay, namesOf, shareToward } from '../domain/toward.ts';
import { type KindsOf, ValueKind, asWritten } from '../domain/values.ts';
import {
	A_SOFT_BOXES,
	A_WORLD_LIGHTS,
	type DrawnBloom,
	type DrawnLighting,
	type SoftBox,
	type WorldLight,
	drawnBloom,
	drawnLighting,
	lightsToward
} from './lighting.ts';

export interface WorldLook {
	/**
	 * The world's lights, which light a film's own things in a lit material, and the soft boxes their glossy faces
	 * reflect: none in livereel's own world, a film of flat light.
	 */
	readonly lights: readonly WorldLight[];
	readonly softBoxes: readonly SoftBox[];
	/**
	 * The glow a room draws round light brighter than the page's white, as a lens blooms (`DrawnBloom` in
	 * `src/props/lighting.ts`): how strong, 0 none, as three's bloom takes its strength; and how far it spreads, from 0,
	 * nearest, to 1, widest.
	 */
	readonly bloom: number;
	readonly bloomRadius: number;
}

/** The world's look as a film writes it: any of its values, the rest as they stand. */
export type WorldScript = Partial<WorldLook>;

/**
 * The world as the stage draws it: its light, which the room lights a film's own things and the window's body by, and
 * the glow round its brightest light, none where it has none.
 */
export interface DrawnWorld {
	readonly lighting: DrawnLighting;
	readonly bloom: DrawnBloom | null;
}

/**
 * The kind of each value of the world, by its name: its lights light by light (`lightsToward`); its soft boxes changed
 * whole half-way, as the stage draws them anew at each change; its glow's strength never below none and its spread a
 * share between none and whole, on a curve that passes their ends; each held as written.
 */
export const WORLD_KINDS: KindsOf<WorldLook> = {
	lights: new ValueKind(A_WORLD_LIGHTS, asWritten, lightsToward),
	softBoxes: new ValueKind(A_SOFT_BOXES, asWritten, halfWay),
	bloom: new ValueKind(A_GLOW_STRENGTH, asWritten, amountToward),
	bloomRadius: new ValueKind(A_SHARE, asWritten, shareToward)
};

/** The names of the world's values, in the order a refusal says them. */
export const WORLD_NAMES = namesOf(WORLD_KINDS);

// A world with no light placed in it
const NONE_PLACED: readonly never[] = [];

/** livereel's own world: no light placed in it and no glow, a film of flat light. */
export const LIVEREELS_WORLD: WorldLook = { lights: NONE_PLACED, softBoxes: NONE_PLACED, bloom: 0, bloomRadius: 0.4 };

/** The world as the stage draws it on a frame of this size: its light where it stands, and its glow. */
export function drawnWorld(world: WorldLook, frame: Size): DrawnWorld {
	return {
		lighting: drawnLighting(world.lights, world.softBoxes, frame),
		bloom: drawnBloom(world.bloom, world.bloomRadius)
	};
}
