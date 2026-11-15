// @ts-check
/**
 * The eye's lens over the world the room draws as one scene (`stage/room.js`): each pixel blurred by how far what it
 * shows stands from the focus, read off the scene's depth by the engine's own law (`src/domain/focus.ts`), which the
 * scene's eye hands as a spread per nearness and the focus's nearness (`LensLaw`), or none where the eye is open none;
 * or by a spread of its own a field is handed for each of its pixels, whichever is wider: the window's shade blurring
 * the whole window (`stage/body.js`). A pixel's own spread never puts it in the near field, which the law alone tells.
 *
 * A lens blurs what stands before its focus over what stands behind it, so the scene is split at the focus into two
 * fields: the far field, each pixel blurred by its own spread, so a sharp edge does not bleed into the blurred ground
 * beside it; and the near field, blurred as one round each pixel by the widest near spread that reaches it, so a near
 * blur reaches past its own edge. The far field shows through the near as far as the near leaves the pixel uncovered,
 * not by how clear the near is: what the near holds is already all the scene showed there, and a half-faded page
 * crossing from the far field into the near, laid over itself by its clearness, would draw a line where it crossed.
 *
 * One depth a pixel cannot hold what the near field hides, and what is carried into its hole is a guess: so the room
 * draws what stands before all the rest while the near field holds any of it as a world of its own
 * (`apartBeforeTheRest`), and only what is blurred near among the rest's depths, the near part of a page leant across
 * the focus or a cube through it, leaves a hole to fill. A sample that spreads is read from copies of the far field's
 * light that reaches as far as the copy's pixels stand apart, as a copy mixes each pixel's light with its neighbours':
 * read from copies of all of it, a sharp cube's green edge would spread green over a page blurred beside it. How each
 * field is laid over the fields before it is the room's (`stage/laying.js`).
 */
import {
	DataTexture,
	HalfFloatType,
	LinearFilter,
	LinearMipmapLinearFilter,
	NearestFilter,
	Vector2,
	Vector4,
	WebGLRenderTarget
} from 'three';
import { depthRangeOf } from './matrices.js';
import {
	LAID_OVER,
	NOTHING_DRAWN,
	WRITTEN,
	WRITTEN_INTO_SEVERAL,
	drawnInto,
	passOver,
	valuesOfTheBox,
	valuesSet
} from './passes.js';
/** @import { Box3, WebGLRenderer, Texture, DepthTexture } from 'three' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { DrawnEye } from '../src/domain/eye.ts' */
/** @import { LensLaw } from '../src/domain/focus.ts' */

/**
 * A field of the world the lens blurs: its light, linear and premultiplied, its depth, and its size in the drawing's
 * pixels.
 * @typedef {{
 *   readonly light: Texture,
 *   readonly depth: DepthTexture,
 *   readonly width: number,
 *   readonly height: number
 * }} SceneField
 */

// How many samples a pixel gathers, on a golden-angle spiral, and how many spreads of its Gaussian they reach, as far
// past the frame's edge as the room draws the world
const SAMPLES = 96;
export const SPREADS_REACHED = 3;
// A spread under half a pixel of the drawing is drawn sharp, its own pixel alone
const SHARP_SPREAD = 0.5;
// What stands before the focus is the near field's from a spread of a whole pixel of the drawing: what stands before it
// sharper stays with the far field, each pixel there blurred by its own spread, where the near field's would blur it as
// wide as the widest near spread round it, and an in-focus page a hair nearer than the focus with it. What reaches it
// standing before all the rest is a world of its own (`apartBeforeTheRest`)
const NEAR_BLURRED_FROM = 1;
// None of what stands in the world stands apart, and how many that is; and the place of the nearest of it, nearest
// first
/** @type {readonly never[]} */
const NOTHING_APART = [];
const NONE_APART = 0;
const THE_NEAREST = 0;
// How much of a pixel on a straight edge of the near field its blur covers: half
const EDGE_COVER = 0.5;
// The side of a tile the widest spreads are found over, in the drawing's pixels; and the ways they are widened along,
// one after the other, the rows then the columns
const TILE = 16;
const ALONG_THE_ROWS = new Vector2(1, 0);
const ALONG_THE_COLUMNS = new Vector2(0, 1);
// The spiral's turn between samples, the golden angle, π(3 − √5), and a whole turn, in radians
const GOLDEN_ANGLE = 2.399963229728653;
const HALF_TURN = Math.PI;
const WHOLE_TURN = HALF_TURN + HALF_TURN;
// Interleaved gradient noise (Jimenez, 2014): a number from 0 to 1 at each pixel, near none of its neighbours', from a
// pixel's place across and down, which turns each pixel's spiral apart from its neighbours', so the samples' pattern
// draws no copies of an edge
const NOISE = { scale: 52.9829189, across: 0.06711056, down: 0.00583715 };
// Where a pixel's middle stands in it, a texture at its full size, and what the split marks as so: whole, or none, half
// telling them apart
const PIXEL_MIDDLE = 0.5;
const FULL_SIZE = 0;
const HALF_MARKED = 0.5;
// A pixel's own far spread where the far field has no depth of its own there, nothing drawn or the near field's; and
// the spread of the nearest depth round a pixel where nothing was drawn round it: less than any spread
const NO_FAR_DEPTH_HERE = -1;
const NOTHING_DRAWN_ROUND = -1;
// How far apart the pixels of the drawing itself stand, the finest copy of a field: one mixes no pixel with another
const THE_DRAWINGS_OWN_SPACING = 1;
// The most smaller copies a field keeps, one for each halving of a side of 65,536 pixels, more than a card holds; a
// pixel filled so nearly whole the coarser copies would add nothing to see; and how much of the far field a pixel of a
// smaller copy holds for it to be taken whole, as the far field there: a pixel of it
const MOST_LEVELS = 16;
const WHOLLY_TAKEN = 0.999;
const A_PIXELS_WORTH = 1;
// How many times shorter a side of each smaller copy is than the one before's
const SMALLER_A_COPY = 2;
// A pass's target before it is first sized, and a field's smaller copies before it is first sized
const A_PIXEL = 1;
const NO_SMALLER_COPY = 0;
// The law of an eye open none, which spreads no depth at all; and a pixel's four values where it spreads none of its
// own
const NO_LAW = new Vector2(0, 0);
const NO_SPREAD_A_PIXEL = [0, 0, 0, 0];
// A field as large as the scene's layer, in half floats, with smaller copies for wide spreads
const FIELD = {
	type: HalfFloatType,
	depthBuffer: false,
	generateMipmaps: true,
	minFilter: LinearMipmapLinearFilter,
	magFilter: LinearFilter
};
// The widest spreads per tile, near and far: found exactly, widened along the rows as exactly, then along the columns
// and read smoothly between tiles
const TILES_FOUND = { type: HalfFloatType, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter };
const TILES_WIDENED = { type: HalfFloatType, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter };

// How the tiles and the split read the scene's depth: how near the eye a stored depth stands, one over how far before
// it, in film pixels, three's perspective storing it between the depth's near and far, in the frame's pixels (three's
// own reading, its view's depth negative before the eye); how wide the engine's law, its spread per nearness and the
// focus's nearness, spreads it, in the drawing's pixels; how wide a pixel of the field spreads, by that law or by a
// spread of its own the field is handed, whichever is wider; whether anything was drawn there, and whether it is the
// near field's, nearer than the focus by the law; and the nearest depth round a pixel
const DEPTH_READ = `
#include <packing>
uniform sampler2D depth;
uniform sampler2D ownSpreads;
uniform vec2 depthRange;
uniform float frameScale;
uniform float pixelsOfOne;
uniform vec2 law;
const float NOTHING_DRAWN = float(${NOTHING_DRAWN});
const float NEAR_BLURRED_FROM = float(${NEAR_BLURRED_FROM});
float nearnessOf(float stored) {
	return frameScale / -perspectiveDepthToViewZ(stored, depthRange.x, depthRange.y);
}
float spreadOf(float stored) {
	return law.x * abs(law.y - nearnessOf(stored)) * pixelsOfOne;
}
float spreadAt(vec2 share, float stored) {
	return max(spreadOf(stored), texture2D(ownSpreads, share).r);
}
bool isDrawn(float stored) {
	return stored < NOTHING_DRAWN;
}
bool isNear(float stored) {
	return isDrawn(stored) && nearnessOf(stored) > law.y && spreadOf(stored) >= NEAR_BLURRED_FROM;
}
float nearestRound(vec2 share) {
	vec2 texel = 1.0 / vec2(textureSize(depth, ${FULL_SIZE}));
	float nearest = NOTHING_DRAWN;
	for (int down = -1; down <= 1; down++) {
		for (int across = -1; across <= 1; across++) {
			nearest = min(nearest, texture2D(depth, share + vec2(float(across), float(down)) * texel).x);
		}
	}
	return nearest;
}`;

// How far apart the samples of a gather of a radius stand, in the drawing's pixels, and so the pixels of the smaller
// copy it reads them from, so a wide disc is smooth: as far as each of its samples' share of the disc is wide, a radius
// times √(π / samples), no nearer than the drawing's own
const SAMPLES_APART_PER_RADIUS = Math.sqrt(Math.PI / SAMPLES);
const SAMPLES_APART = `
const int SAMPLES = ${SAMPLES};
const float SPREADS_REACHED = float(${SPREADS_REACHED});
const float SAMPLES_APART_PER_RADIUS = ${SAMPLES_APART_PER_RADIUS};
const float THE_DRAWINGS_OWN_SPACING = float(${THE_DRAWINGS_OWN_SPACING});
float gapFor(float radius) {
	return max(radius * SAMPLES_APART_PER_RADIUS, THE_DRAWINGS_OWN_SPACING);
}`;

// The parts the scene is split into at the focus: the near field's light, the far field's, the far field's light its
// copies hold, and the measures every later pass reads of each pixel — by the nearest depth round it, whether the near
// field holds it, whole or none, and how wide it spreads, in the drawing's pixels, less than none where nothing was
// drawn round it; whether the far field's copies hold its light, whole or none; and how wide its own depth spreads,
// less than none where the far field has no depth of its own there. Each pixel is read by the nearest depth round it,
// as a pixel at the edge of what the scene drew holds a share of the nearer thing's light while its one depth may be
// the farther one's or nothing's. A sample's reach is read by the nearest depth round it, a pixel's own blur by its
// own: read by the nearest, a blurred page's pixel touching a sharp thing stood sharp, a line along the thing's edge.
// One pass writes every part, each into its own layer of the split, by its place there: written a pass a part, each
// pass read the nine depths round each pixel anew
/** @typedef {'nearLight' | 'farLight' | 'spreadingLight' | 'measures'} SplitPart */
/** @type {{ readonly [Part in SplitPart]: number }} */
const SPLIT_PARTS = { nearLight: 0, farLight: 1, spreadingLight: 2, measures: 3 };
const SPLIT_FRAGMENT = `
uniform sampler2D drawnLight;
uniform sampler2D widened;
varying vec2 shareOfTheFrame;
layout(location = ${SPLIT_PARTS.nearLight}) out vec4 nearLight;
layout(location = ${SPLIT_PARTS.farLight}) out vec4 farLight;
layout(location = ${SPLIT_PARTS.spreadingLight}) out vec4 spreadingLight;
layout(location = ${SPLIT_PARTS.measures}) out vec4 measures;
${DEPTH_READ}
${SAMPLES_APART}
const float NO_FAR_DEPTH_HERE = float(${NO_FAR_DEPTH_HERE});
const float NOTHING_DRAWN_ROUND = float(${NOTHING_DRAWN_ROUND});
const int TILE = ${TILE};
// Whether the far field's copies hold a far pixel's light: all but what was drawn reaching less far than the pixels of
// the coarsest copy a far blur round it reads stand apart, where that copy is coarser than the drawing
bool spreads(bool drawn, float spread) {
	float widestFar = texelFetch(widened, ivec2(gl_FragCoord.xy) / TILE, ${FULL_SIZE}).y;
	float apart = gapFor(SPREADS_REACHED * widestFar);
	return !drawn || apart <= THE_DRAWINGS_OWN_SPACING || SPREADS_REACHED * spread >= apart;
}
void main() {
	float nearest = nearestRound(shareOfTheFrame);
	bool near = isNear(nearest);
	bool drawn = isDrawn(nearest);
	float spread = drawn ? spreadAt(shareOfTheFrame, nearest) : NOTHING_DRAWN_ROUND;
	bool spreading = !near && spreads(drawn, spread);
	float own = texture2D(depth, shareOfTheFrame).x;
	float ownSpread = isDrawn(own) && !near ? spreadAt(shareOfTheFrame, own) : NO_FAR_DEPTH_HERE;
	vec4 light = texture2D(drawnLight, shareOfTheFrame);
	nearLight = near ? light : vec4(0.0);
	farLight = near ? vec4(0.0) : light;
	spreadingLight = spreading ? light : vec4(0.0);
	measures = vec4(near ? 1.0 : 0.0, spread, spreading ? 1.0 : 0.0, ownSpread);
}`;

// How the passes after the split read its measures of a pixel
const MEASURES_READ = `
uniform sampler2D measures;
const float HALF_MARKED = ${HALF_MARKED};
const float NOTHING_DRAWN_ROUND = float(${NOTHING_DRAWN_ROUND});
bool isNearIn(vec4 measured) {
	return measured.r > HALF_MARKED;
}
bool isDrawnIn(vec4 measured) {
	return measured.g > NOTHING_DRAWN_ROUND;
}
bool isSpreadingIn(vec4 measured) {
	return measured.b > HALF_MARKED;
}
// What the split measured of the pixel a point falls in, a share of the field across and up, unblended with its
// neighbours: blended, a sample between a sharp thing's pixel and a blurred page's would take a reach between theirs,
// and carry the thing's colour into the page
vec4 measuredAt(vec2 share) {
	ivec2 size = textureSize(measures, ${FULL_SIZE});
	return texelFetch(measures, clamp(ivec2(share * vec2(size)), ivec2(0), size - 1), ${FULL_SIZE});
}`;

// The far field made whole: where the near field hides it, carried on into the hole from what of it stands nearest,
// read from its smaller copies, the finest first, each taken whole once it holds a pixel's worth of the far field, as
// the far field there, and laid under those before it for what they leave. Every pass after reads the far field so,
// with no hole in it. Gathered round each pixel with the hole left out, a pixel inside the near field's edge would find
// half its disc and take the rest from coarse copies, which mix in what stands far off along the edge, where a pixel
// outside it finds all its disc: the near field's edge would draw a hard line over the far field; and laid under one
// another by the share each holds, the copies would do the same
const FAR_FIELD_WHOLE_FRAGMENT = `
uniform sampler2D farLight;
uniform float coarsestLevel;
varying vec2 shareOfTheFrame;
${MEASURES_READ}
const int MOST_LEVELS = ${MOST_LEVELS};
const float WHOLLY_TAKEN = ${WHOLLY_TAKEN};
const float A_PIXELS_WORTH = float(${A_PIXELS_WORTH});
const float FULL_SIZE = float(${FULL_SIZE});
void main() {
	if (!isNearIn(textureLod(measures, shareOfTheFrame, FULL_SIZE))) {
		gl_FragColor = textureLod(farLight, shareOfTheFrame, FULL_SIZE);
		return;
	}
	vec4 filled = vec4(0.0);
	float taken = 0.0;
	for (int level = 1; level <= MOST_LEVELS; level++) {
		if (float(level) > coarsestLevel || taken >= WHOLLY_TAKEN) break;
		float farShare = 1.0 - textureLod(measures, shareOfTheFrame, float(level)).r;
		if (farShare <= 0.0) continue;
		float side = exp2(float(level));
		float known = min(farShare * side * side, A_PIXELS_WORTH);
		filled += textureLod(farLight, shareOfTheFrame, float(level)) / farShare * known * (1.0 - taken);
		taken += known * (1.0 - taken);
	}
	gl_FragColor = filled;
}`;

// The widest near and far spread of each tile, each pixel read by the nearest depth round it, as the split reads it, so
// the tiles find the spreads the split measures; found before the split, which reads them
const TILES_FOUND_FRAGMENT = `
${DEPTH_READ}
const int TILE = ${TILE};
const float PIXEL_MIDDLE = ${PIXEL_MIDDLE};
void main() {
	ivec2 tile = ivec2(gl_FragCoord.xy);
	ivec2 size = textureSize(depth, ${FULL_SIZE});
	vec2 widest = vec2(0.0);
	for (int down = 0; down < TILE; down++) {
		for (int across = 0; across < TILE; across++) {
			ivec2 texel = tile * TILE + ivec2(across, down);
			if (texel.x >= size.x || texel.y >= size.y) continue;
			vec2 share = (vec2(texel) + PIXEL_MIDDLE) / vec2(size);
			float nearest = nearestRound(share);
			if (!isDrawn(nearest)) continue;
			if (isNear(nearest)) widest.x = max(widest.x, spreadAt(share, nearest));
			else widest.y = max(widest.y, spreadAt(share, nearest));
		}
	}
	gl_FragColor = vec4(widest, 0.0, 1.0);
}`;

// Each tile's widest spreads widened by those of the tiles along one way, a row or a column, whose reach comes to it,
// however far: a tile's reach grows with its spread, so widened along the rows and then the columns, each tile takes
// the widest of those whose reach comes to it across and down at once, as a square round each reaches
const TILES_WIDENED_FRAGMENT = `
uniform sampler2D tiles;
uniform ivec2 along;
const float TILE = float(${TILE});
const float SPREADS_REACHED = float(${SPREADS_REACHED});
void main() {
	ivec2 tile = ivec2(gl_FragCoord.xy);
	ivec2 tilesThere = textureSize(tiles, ${FULL_SIZE});
	int tilesAlong = along.x * tilesThere.x + along.y * tilesThere.y;
	int place = along.x * tile.x + along.y * tile.y;
	vec2 widest = vec2(0.0);
	for (int other = 0; other < tilesAlong; other++) {
		vec2 spreads = texelFetch(tiles, tile + along * (other - place), ${FULL_SIZE}).xy;
		float away = (float(abs(other - place)) - 1.0) * TILE;
		widest = max(widest, spreads * step(vec2(away), SPREADS_REACHED * spreads));
	}
	gl_FragColor = vec4(widest, 0.0, 1.0);
}`;

// The near field laid over the far one, each blurred as its law has it, in linear light
const LENS_FRAGMENT = `
uniform sampler2D nearField;
uniform sampler2D farField;
uniform sampler2D farLight;
uniform sampler2D spreadingLight;
uniform sampler2D widened;
uniform vec4 drawnBox;
uniform vec4 shownBox;
uniform float pixelsOfAFramePixel;
varying vec2 shareOfTheFrame;
${MEASURES_READ}
${SAMPLES_APART}
const float SHARP_SPREAD = ${SHARP_SPREAD};
const float EDGE_COVER = ${EDGE_COVER};
const float GOLDEN_ANGLE = ${GOLDEN_ANGLE};
const float WHOLE_TURN = ${WHOLE_TURN};
const vec3 NOISE = vec3(${NOISE.scale}, ${NOISE.across}, ${NOISE.down});
const float PIXEL_MIDDLE = ${PIXEL_MIDDLE};
const float FULL_SIZE = float(${FULL_SIZE});
vec2 shareAt(vec2 point) {
	vec2 share = (point - drawnBox.xy) / drawnBox.zw;
	return vec2(share.x, 1.0 - share.y);
}
float within(vec2 share) {
	vec2 inside = step(vec2(0.0), share) * step(share, vec2(1.0));
	return inside.x * inside.y;
}
float turnAt(vec2 pixel) {
	return WHOLE_TURN * fract(NOISE.x * fract(dot(pixel, NOISE.yz)));
}
vec2 spiralAt(int taken, float radius, float turn) {
	float along = sqrt((float(taken) + PIXEL_MIDDLE) / float(SAMPLES)) * radius;
	float bearing = float(taken) * GOLDEN_ANGLE + turn;
	return vec2(cos(bearing), sin(bearing)) * along;
}
// The far field's light at a sample, read as coarsely as the gather's samples stand apart: made whole where the near
// field hides it; where it spreads, from the copies of what spreads, for as much of each pixel of a copy as that holds;
// and where it stays out of those copies, from the far field as split, no coarser than the sample's own reach would
// read it, for as much of each pixel of that copy as the far field holds
vec4 farSampled(vec2 at, vec4 measured, float reaches, float level) {
	if (isNearIn(measured)) return textureLod(farField, at, level);
	if (isSpreadingIn(measured)) return textureLod(spreadingLight, at, level) / textureLod(measures, at, level).b;
	float ownLevel = min(level, log2(gapFor(reaches)));
	return textureLod(farLight, at, ownLevel) / (1.0 - textureLod(measures, at, ownLevel).r);
}
// The far field round a pixel: each sample of it weighed by the pixel's Gaussian and by whether its own spread reaches
// the pixel, its reach softened over the gap between samples but no farther than it reaches, so a sharp thing's light
// reaches no pixel beside it; one carried on into the near field's hole reaches it as far as the gather does. Its own
// light where it is sharp: as split, or made whole where the near field hides it
vec4 farBlurred(vec2 point, vec2 here, vec4 measuredHere, float spread, float turn) {
	if (spread < SHARP_SPREAD) return isNearIn(measuredHere) ? texture2D(farField, here) : texture2D(farLight, here);
	float radius = SPREADS_REACHED * spread;
	float gap = gapFor(radius);
	float level = log2(gap);
	vec4 summed = vec4(0.0);
	float weighed = 0.0;
	for (int taken = 0; taken < SAMPLES; taken++) {
		vec2 offset = spiralAt(taken, radius, turn);
		vec2 at = shareAt(point + offset / pixelsOfAFramePixel);
		vec4 measured = measuredAt(at);
		float reaches = isDrawnIn(measured) && !isNearIn(measured) ? SPREADS_REACHED * measured.g : radius;
		float softened = clamp(reaches, THE_DRAWINGS_OWN_SPACING, gap);
		float covering = clamp((reaches - length(offset)) / softened + 1.0, 0.0, 1.0);
		float weight = exp(-dot(offset, offset) / (2.0 * spread * spread)) * covering * within(at);
		summed += farSampled(at, measured, reaches, level) * weight;
		weighed += weight;
	}
	return weighed > 0.0 ? summed / weighed : vec4(0.0);
}
// The near field round a pixel, blurred as one by the widest near spread that reaches it: its light, and how much of
// the pixel it covers
struct Near {
	vec4 light;
	float cover;
};
Near nearBlurred(vec2 point, vec2 here, float spread, float turn) {
	if (spread < SHARP_SPREAD) return Near(texture2D(nearField, here), texture2D(measures, here).r);
	float radius = SPREADS_REACHED * spread;
	float level = log2(gapFor(radius));
	Near summed = Near(vec4(0.0), 0.0);
	float weighed = 0.0;
	for (int taken = 0; taken < SAMPLES; taken++) {
		vec2 offset = spiralAt(taken, radius, turn);
		vec2 at = shareAt(point + offset / pixelsOfAFramePixel);
		float weight = exp(-dot(offset, offset) / (2.0 * spread * spread));
		summed.light += textureLod(nearField, at, level) * within(at) * weight;
		summed.cover += textureLod(measures, at, level).r * within(at) * weight;
		weighed += weight;
	}
	return Near(summed.light / weighed, summed.cover / weighed);
}
void main() {
	vec2 point = shownBox.xy + vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y) * shownBox.zw;
	vec2 here = shareAt(point);
	vec4 measured = measuredAt(here);
	vec2 widest = texture2D(widened, here).xy;
	float turn = turnAt(gl_FragCoord.xy);
	Near near = nearBlurred(point, here, widest.x, turn);
	// Where the far field has no depth of its own, it is blurred as widely as the far field round it; and where the near
	// field hides it, as much wider, up to the near field's blur, as the near field covers the pixel past its edge, so
	// what was carried on into the hole from round it is softer the less of it shows, and goes on from the far field at
	// the edge as it stands
	float hidden = clamp((near.cover - EDGE_COVER) / (1.0 - EDGE_COVER), 0.0, 1.0) * widest.x;
	vec4 far = farBlurred(point, here, measured, measured.a >= 0.0 ? measured.a : max(widest.y, hidden), turn);
	gl_FragColor = near.light + (1.0 - min(near.cover, 1.0)) * far;
}`;

// A field laid as it stands, where the eye blurs nothing, in linear light
const LAID_AS_IT_STANDS_FRAGMENT = `
uniform sampler2D drawnLight;
uniform vec4 drawnBox;
uniform vec4 shownBox;
varying vec2 shareOfTheFrame;
void main() {
	vec2 point = shownBox.xy + vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y) * shownBox.zw;
	vec2 share = (point - drawnBox.xy) / drawnBox.zw;
	gl_FragColor = texture2D(drawnLight, vec2(share.x, 1.0 - share.y));
}`;

/** The lens: the passes over the frame that read a field of the world's scene and its depth. */
export class Lens {
	/**
	 * @param {number} pixelsOfOne the drawing's pixels of a film pixel
	 * @param {number} frameScale the frame's pixels of a film pixel
	 * @param {number} pixelsOfAFramePixel the drawing's pixels of a pixel of the frame, the page's device scale
	 */
	constructor(pixelsOfOne, frameScale, pixelsOfAFramePixel) {
		this.pixelsOfOne = pixelsOfOne;
		this.frameScale = frameScale;
		// A field's spreads of its own where it is handed none: none at any pixel
		this.noSpreadsOfTheirOwn = new DataTexture(new Uint8Array(NO_SPREAD_A_PIXEL), A_PIXEL, A_PIXEL);
		this.noSpreadsOfTheirOwn.needsUpdate = true;
		// The scene split at the focus, each part a layer of it in its place
		this.parts = new WebGLRenderTarget(A_PIXEL, A_PIXEL, { ...FIELD, count: Object.keys(SPLIT_PARTS).length });
		this.tilesFound = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_FOUND);
		this.tilesWidenedAlongTheRows = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_FOUND);
		this.tilesWidened = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_WIDENED);
		this.found = passOver(depthReadValues(pixelsOfOne, frameScale), TILES_FOUND_FRAGMENT, WRITTEN);
		this.split = passOver(
			{
				...depthReadValues(pixelsOfOne, frameScale),
				drawnLight: { value: null },
				widened: { value: this.tilesWidened.texture }
			},
			SPLIT_FRAGMENT,
			WRITTEN_INTO_SEVERAL
		);
		this.farFieldWhole = new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD);
		const measures = { measures: { value: partOf(this.parts, 'measures') } };
		const farLight = { farLight: { value: partOf(this.parts, 'farLight') } };
		this.madeWhole = passOver(
			{ ...measures, ...farLight, coarsestLevel: { value: NO_SMALLER_COPY } },
			FAR_FIELD_WHOLE_FRAGMENT,
			WRITTEN
		);
		this.widening = passOver(
			{ tiles: { value: null }, along: { value: ALONG_THE_ROWS } },
			TILES_WIDENED_FRAGMENT,
			WRITTEN
		);
		this.lens = passOver(
			{
				...measures,
				...farLight,
				spreadingLight: { value: partOf(this.parts, 'spreadingLight') },
				nearField: { value: partOf(this.parts, 'nearLight') },
				farField: { value: this.farFieldWhole.texture },
				widened: { value: this.tilesWidened.texture },
				drawnBox: { value: new Vector4() },
				shownBox: { value: new Vector4() },
				pixelsOfAFramePixel: { value: pixelsOfAFramePixel }
			},
			LENS_FRAGMENT,
			LAID_OVER
		);
		this.asItStands = passOver(
			{ drawnLight: { value: null }, drawnBox: { value: new Vector4() }, shownBox: { value: new Vector4() } },
			LAID_AS_IT_STANDS_FRAGMENT,
			LAID_OVER
		);
	}

	/**
	 * What of all that stands in the world is drawn as a world apart before the rest, each by the box it stands in, in
	 * the eye's own space, the eye seeing down three's −z: the most of what stands nearest the eye whose every point
	 * stands nearer than every point of all the rest, so it is laid over the rest exactly, wherever the focus stands; the
	 * nearest of it while any of it stands in the near field, and each farther one while all of it does; nearest first.
	 * Parted so, a cube before a page stays apart while the focus is pulled through it, and joins the rest only where
	 * nothing of it is blurred near, where the two drawings agree: parted by whether all of it stood in the near field,
	 * it would join the rest while its near face was still blurred wide, and the fill's guess of what it hid would come
	 * back at once, from one frame to the next. And a window whose near corner alone is blurred stays with the rest
	 * behind a title blurred before it: taken apart with the title, what the title's blur hides of the window would be
	 * guessed, and the page under the title's shadow, drawn in one field with it, blurred as the title. What stands among
	 * the rest's depths, a cube through a page, is never apart. Nothing is where the eye blurs nothing, nor all that
	 * stands.
	 * @template {{ readonly box: Box3 }} Standing
	 * @param {DrawnEye} eye @param {readonly Standing[]} standing @returns {readonly Standing[]}
	 */
	apartBeforeTheRest(eye, standing) {
		const lens = eye.lens;
		if (lens === null) return NOTHING_APART;
		const nearestFirst = standing
			.filter((each) => !each.box.isEmpty())
			.toSorted((first, second) => second.box.max.z - first.box.max.z);
		let apart = NONE_APART;
		let farthestSoFar = Infinity;
		for (const [count, next] of nearestFirst.entries()) {
			if (farthestSoFar >= next.box.max.z) apart = count;
			const blurredNear = count === THE_NEAREST ? next.box.max.z : next.box.min.z;
			if (!this.standsInTheNearField(lens, blurredNear)) break;
			farthestSoFar = Math.min(farthestSoFar, next.box.min.z);
		}
		return nearestFirst.slice(0, apart);
	}

	/**
	 * Whether a point of the world stands in the near field, by how far it stands along the eye's sight in its own space:
	 * nearer than the focus and spreading a whole pixel of the drawing or more, as the split reads a pixel (`isNear`).
	 * @param {LensLaw} lens @param {number} along
	 */
	standsInTheNearField(lens, along) {
		const nearness = this.frameScale / -along;
		return lens.perNearness * (nearness - lens.inFocus) * this.pixelsOfOne >= NEAR_BLURRED_FROM;
	}

	/**
	 * A field of the world's scene, holding a box of the frame, laid over the frame's box of the target blurred at each
	 * pixel by the eye's lens or by a spread of its own the field is handed, whichever is wider, or as it stands where
	 * the eye has no lens, open none, and the field no spreads of its own; the field's depth read as the eye that saw it,
	 * so far before the frame, stored it.
	 * @param {WebGLRenderer} renderer @param {SceneField} field @param {Box} drawn @param {Box} shown
	 * @param {DrawnEye} eye @param {WebGLRenderTarget} target @param {Texture | null} ownSpreads how wide each pixel of
	 * the field spreads of its own, in the drawing's pixels, as the field lies; none where none does
	 */
	laid(renderer, field, drawn, shown, eye, target, ownSpreads) {
		const boxes = { drawnBox: valuesOfTheBox(drawn), shownBox: valuesOfTheBox(shown) };
		if (eye.lens === null && ownSpreads === null) {
			valuesSet(this.asItStands.material, { drawnLight: field.light, ...boxes });
			drawnInto(renderer, this.asItStands, target);
			return;
		}
		this.sizedFor(field);
		const range = depthRangeOf(eye.distance);
		const depthRead = {
			depth: field.depth,
			ownSpreads: ownSpreads ?? this.noSpreadsOfTheirOwn,
			depthRange: new Vector2(range.near, range.far),
			law: eye.lens === null ? NO_LAW : new Vector2(eye.lens.perNearness, eye.lens.inFocus)
		};
		valuesSet(this.found.material, depthRead);
		drawnInto(renderer, this.found, this.tilesFound);
		valuesSet(this.widening.material, { tiles: this.tilesFound.texture, along: ALONG_THE_ROWS });
		drawnInto(renderer, this.widening, this.tilesWidenedAlongTheRows);
		valuesSet(this.widening.material, { tiles: this.tilesWidenedAlongTheRows.texture, along: ALONG_THE_COLUMNS });
		drawnInto(renderer, this.widening, this.tilesWidened);
		valuesSet(this.split.material, { ...depthRead, drawnLight: field.light });
		drawnInto(renderer, this.split, this.parts);
		valuesSet(this.madeWhole.material, { coarsestLevel: Math.floor(Math.log2(Math.max(field.width, field.height))) });
		drawnInto(renderer, this.madeWhole, this.farFieldWhole);
		valuesSet(this.lens.material, boxes);
		drawnInto(renderer, this.lens, target);
	}

	/** The lens's own layers sized to a field and its tiles. @param {SceneField} field */
	sizedFor(field) {
		for (const layer of [this.parts, this.farFieldWhole]) layer.setSize(field.width, field.height);
		const tilesAcross = Math.ceil(field.width / TILE);
		const tilesDown = Math.ceil(field.height / TILE);
		for (const tiles of [this.tilesFound, this.tilesWidenedAlongTheRows, this.tilesWidened]) {
			tiles.setSize(tilesAcross, tilesDown);
		}
	}
}

/**
 * The values a pass that reads the scene's depth takes (`DEPTH_READ`): the drawing's pixels of a film pixel and the
 * frame's scale, set once; the depth, the spreads of its own, its range and the lens's law set as each field is laid.
 * @param {number} pixelsOfOne @param {number} frameScale
 */
function depthReadValues(pixelsOfOne, frameScale) {
	return {
		depth: { value: null },
		ownSpreads: { value: null },
		depthRange: { value: new Vector2() },
		frameScale: { value: frameScale },
		pixelsOfOne: { value: pixelsOfOne },
		law: { value: new Vector2() }
	};
}

/**
 * The least side of a layer the lens reads a field from, no shorter than asked, that halves evenly down to the coarsest
 * smaller copy a blur of the widest spread reads, the coarser of the two its samples' gap falls between: a whole number
 * of that copy's pixels, in the drawing's. The card makes each copy half the one before, rounded down, and read from
 * copies of sides that do not halve evenly, a blur's light followed where the frame fell among their pixels: a window
 * blurred wide in the frame's middle read 154.9 or 178.2 thousandths of linear light by where the frame fell, 162.4
 * unblurred, and 161.8 wherever it fell with the sides halving evenly.
 * @param {number} side @param {number} widestSpread
 */
export function sideHalvedEvenly(side, widestSpread) {
	const gap = Math.max(SPREADS_REACHED * widestSpread * SAMPLES_APART_PER_RADIUS, THE_DRAWINGS_OWN_SPACING);
	const coarsestPixel = SMALLER_A_COPY ** Math.ceil(Math.log2(gap));
	return Math.ceil(side / coarsestPixel) * coarsestPixel;
}

/**
 * A field of the world as the lens reads it: its light, and the depth and size of the layer it was drawn in.
 * @param {Texture} light @param {WebGLRenderTarget} drawnIn @returns {SceneField}
 */
export function sceneFieldOf(light, drawnIn) {
	if (drawnIn.depthTexture === null) throw new Error("the room's world keeps no depth");
	return { light, depth: drawnIn.depthTexture, width: drawnIn.width, height: drawnIn.height };
}

/**
 * A part of the scene as the split wrote it, the layer of its place.
 * @param {WebGLRenderTarget} split @param {SplitPart} part
 */
function partOf(split, part) {
	const layer = split.textures[SPLIT_PARTS[part]];
	if (layer === undefined) throw new Error(`the lens's split holds no ${part}`);
	return layer;
}
