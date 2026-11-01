/**
 * How a line livereel draws round what stands over the page, or out from it, is drawn: an outline's ring, the edge of
 * a hole a piece of the page leaves, the lines from a piece to its source. One word for all three, so a film says it
 * alike wherever it draws one.
 */
import { type Kind, OneOf } from '../domain/handed.ts';

/** The ways a line is drawn: whole, or in dashes. */
const STROKES = ['solid', 'dashed'] as const;

export type Stroke = (typeof STROKES)[number];

export const A_STROKE: Kind<Stroke> = new OneOf(STROKES, 'how a line is drawn: "solid" or "dashed"');
