/**
 * An outline: a ring round a part of the page's screen, its source, standing on the frame round where the camera
 * showed that part as it came, as a piece of the page does (`src/props/piece.ts`), but drawn from no picture: a line in
 * the accent's colour, solid or dashed, a little clear of its box. It is what an object shows (`src/props/object.ts`),
 * so it travels, grows and turns as any object does: it marks a block or an area of the page, or rings what stands
 * apart.
 */
import type { Box } from '../domain/geometry.ts';
import type { Stroke } from './stroke.ts';

/** An outline: the part of the screen it was drawn round, in the screen's pixels, and the line it is drawn in. */
export interface Outline {
	readonly kind: 'outline';
	readonly source: Box;
	readonly line: Stroke;
}

/** An outline as the stage draws it: its line, and how far it has come up and not gone in its own way, fading whole. */
export interface DrawnOutline {
	readonly kind: 'outline';
	readonly line: Stroke;
	readonly shown: number;
}

/** An outline as the stage draws it, as far as it has come up and not gone. */
export function drawnOutline(outline: Outline, shown: number): DrawnOutline {
	return { kind: 'outline', line: outline.line, shown };
}
