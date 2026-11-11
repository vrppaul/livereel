/**
 * How the world looks, a prop of its own beside the film's look (`src/props/look.ts`), which is how livereel's own
 * things look: the lights and soft boxes that light a film's own things and the window's body in a room
 * (`src/props/lighting.ts`), the glow round the brightest light, as a lens blooms, and a grain over the ground
 * (`src/props/grain.ts`). A film opens on livereel's world, which has none of them, with the values its `world` names,
 * and changes it by moves as it goes (`world.to`): in a play, the glow's strength and spread and the grain's levels
 * through the values between, the lights light by light where they are as many as those they go to, and the soft
 * boxes, or lights of another number, whole, half-way; in a cut, at once. The stage is handed it as it draws it
 * (`DrawnWorld`): the room its light and glow, and either stage its grain.
 *
 * One table, `WORLD_KINDS`, says of each value what a film may write for it, how the world holds it and how it moves
 * (`src/domain/values.ts`), so the film's world and a move's are checked by it and the world moved by it, and
 * livereel's own values stand in `LIVEREELS_WORLD`.
 */
import type { Size } from '../domain/geometry.ts';
import { A_GLOW_STRENGTH, A_SHARE } from '../domain/handed.ts';
import { amountToward, halfWay, namesOf, shareToward } from '../domain/toward.ts';
import { type KindsOf, ValueKind, asWritten } from '../domain/values.ts';
import { A_GRAIN, type GrainScript, drawnGrain, levelsOf } from './grain.ts';
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
	/** How many levels of 255 the grain over the ground moves a colour either way: 0 where the film turns it off. */
	readonly grain: number;
}

/** The world's values as a film writes them, every one: the grain turned off or of so many levels, any other as held. */
type WorldWritten = { readonly [Name in keyof WorldLook]: Name extends 'grain' ? GrainScript : WorldLook[Name] };

/** The world's look as a film writes it: any of its values, the rest as they stand. */
export type WorldScript = Partial<WorldWritten>;

/**
 * The world as the stage draws it: its light, which the room lights a film's own things and the window's body by; the
 * glow round its brightest light, none where it has none; and how far the grain over the ground spreads a colour, in
 * shares of a colour's whole (`drawnGrain` in `src/props/grain.ts`), none where it has none.
 */
export interface DrawnWorld {
	readonly lighting: DrawnLighting;
	readonly bloom: DrawnBloom | null;
	readonly grain: number | null;
}

/**
 * The kind of each value of the world, by its name: its lights light by light (`lightsToward`); its soft boxes changed
 * whole half-way, as the stage draws them anew at each change; its glow's strength and its grain's levels never below
 * none and its glow's spread a share between none and whole, on a curve that passes their ends; the grain held as its
 * levels, every other value as written.
 */
export const WORLD_KINDS: KindsOf<WorldLook, WorldWritten> = {
	lights: new ValueKind(A_WORLD_LIGHTS, asWritten, lightsToward),
	softBoxes: new ValueKind(A_SOFT_BOXES, asWritten, halfWay),
	bloom: new ValueKind(A_GLOW_STRENGTH, asWritten, amountToward),
	bloomRadius: new ValueKind(A_SHARE, asWritten, shareToward),
	grain: new ValueKind(A_GRAIN, levelsOf, amountToward)
};

/** The names of the world's values, in the order a refusal says them. */
export const WORLD_NAMES = namesOf(WORLD_KINDS);

// A world with no light placed in it, and no grain
const NONE_PLACED: readonly never[] = [];
const NO_GRAIN = 0;

/** livereel's own world: no light placed in it, no glow and no grain, a film of flat light. */
export const LIVEREELS_WORLD: WorldLook = {
	lights: NONE_PLACED,
	softBoxes: NONE_PLACED,
	bloom: 0,
	bloomRadius: 0.4,
	grain: NO_GRAIN
};

/** The world as the stage draws it on a frame of this size: its light where it stands, its glow and its grain. */
export function drawnWorld(world: WorldLook, frame: Size): DrawnWorld {
	return {
		lighting: drawnLighting(world.lights, world.softBoxes, frame),
		bloom: drawnBloom(world.bloom, world.bloomRadius),
		grain: drawnGrain(world.grain)
	};
}
