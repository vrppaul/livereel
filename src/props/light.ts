/** The light: one block of the page lit, the rest dimmed. How far the light reaches past the block is its look. */
import type { Box } from '../domain/geometry.ts';

/** A block in the light, the rest of the page dimmed by `dim` as far as `strength` goes, both from 0 to 1. */
export interface Light {
	readonly box: Box;
	readonly strength: number;
	readonly dim: number;
}

// How hard the rest of the page is dimmed around a block in the light
export const LIGHT_DIM = 0.62;
