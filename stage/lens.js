// @ts-check
/**
 * The eye's lens over the world the room draws as one scene (`stage/room.js`): each pixel blurred by how far what it
 * shows stands from the focus, read off the scene's depth by the engine's own law (`src/domain/focus.ts`), a disc
 * `aperture × focal length × |1/focus − 1/distance|` across on a frame 1080 high, blurred as a Gaussian of a quarter of
 * that.
 *
 * A lens blurs what stands before its focus over what stands behind it, so the scene is split at the focus into two
 * fields:
 * - the far field, what stands at the focus or behind it, and where nothing was drawn: each pixel blurred by its own
 *   spread, each sample weighed by whether its own spread reaches the pixel, so a sharp edge does not bleed into the
 *   blurred ground beside it, and a blurred edge spreads over nothing as far as its own spread; where nothing was
 *   drawn, by the widest far spread round it, so the blur there follows what spreads into it;
 * - the near field, what stands before the focus blurred past a pixel: blurred as one round each pixel by the widest
 *   near spread that reaches it, so a near blur reaches past its own edge, and laid over the far field, which shows
 *   through it as much as the near field leaves of the pixel uncovered, blurred alike. Not as much as it is clear: what
 *   it holds is already all the scene showed there, what stood behind it seen through it, and a half-faded page
 *   crossing from the far field into the near laid over itself by its clearness drew a line along where it crossed.
 *   Where the near field hides the far one, the far field is first made whole, carried on into the hole from what of
 *   it stands nearest, and blurred there the wider the more the near field covers, so it goes on from the far field at
 *   the near field's edge as it stands there.
 * The widest spreads are found per tile of the drawing and widened over every tile they reach. Each sample's place on
 * its spiral is turned from pixel to pixel, so the samples' pattern draws no copies of an edge, and read from the
 * field's smaller copy whose pixels stand as far apart as the samples, so a wide disc is smooth. A copy mixes each
 * pixel's light with its neighbours' as far as its pixels stand apart, so a sample that spreads is read from copies of
 * the far field's light that reaches as far as the widest far blur round it reads them apart, for the share of each
 * copy's pixel that light holds: read from copies of all of it, a sharp cube's green edge mixed into a page blurred
 * beside it spread green over the page 30 pixels of a 3840 still (2026-11-10). A sample whose light reaches less far is
 * read from the far field as it was split, no coarser than its own reach.
 *
 * The split reads each pixel by the nearest depth round it, as a pixel at the edge of what the scene drew holds a share
 * of the nearer thing's light while its one depth, of a single sample, may be the farther one's or nothing's. It writes
 * beside the fields what every later pass reads of each pixel: whether the near field holds it, how wide it spreads,
 * where anything was drawn, and whether the far field's copies hold its light; read off each sample's own depth
 * instead, a sharp thing's smoothed edge under a blurred page's depth spread the thing's colour over the page. The lens
 * reads the scene's light linear, premultiplied by how clear it is, and lays it so over what the fields before it laid,
 * as three's one layer lays what is seen through over what stands behind it: the room turns the world into the
 * screen's colours once all its fields are laid. Each field turned into them as it was laid, a glass over a page and a
 * page half faded over what stood behind it came out in another tone than in one layer (2026-11-10).
 */
import {
	Camera,
	HalfFloatType,
	LinearFilter,
	LinearMipmapLinearFilter,
	NearestFilter,
	Vector2,
	Vector4,
	WebGLRenderTarget
} from 'three';
import { depthRangeOf } from './matrices.js';
import { LAID_OVER, WRITTEN, passOver, valuesOfTheBox, valuesSet } from './passes.js';
/** @import { WebGLRenderer, Texture, DepthTexture, Mesh, PlaneGeometry, ShaderMaterial } from 'three' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Sharpness } from '../src/domain/focus.ts' */

/**
 * A field of the world the lens blurs: its light, linear and premultiplied, its depth, and its size in the drawing's
 * pixels.
 * @typedef {{ readonly light: Texture, readonly depth: DepthTexture, readonly width: number, readonly height: number }} SceneField
 */

// How many samples a pixel gathers, on a golden-angle spiral, and how many spreads of its Gaussian they reach, as far
// past the frame's edge as the room draws the world
const SAMPLES = 96;
export const SPREADS_REACHED = 3;
// A disc's spread along each axis, which a Gaussian blurs as its deviation, is a quarter of the disc's width
const A_DISCS_WIDTH_IN_SPREADS = 4;
// An eye open none, a pinhole, draws all sharp
const A_PINHOLE = 0;
// A spread under half a pixel of the drawing is drawn sharp, its own pixel alone
const SHARP_SPREAD = 0.5;
// What stands before the focus is the near field's from a spread of a whole pixel of the drawing: what stands before
// it sharper stays with the far field, each pixel there blurred by its own spread, where the near field's would blur it
// as wide as the widest near spread round it, and an in-focus page a hair nearer than the focus with it
const NEAR_BLURRED_FROM = 1;
// How much of a pixel on a straight edge of the near field its blur covers: half
const EDGE_COVER = 0.5;
// The side of a tile the widest spreads are found over, in the drawing's pixels; and the ways they are widened along,
// one after the other, the rows then the columns
const TILE = 16;
const ALONG_THE_ROWS = new Vector2(1, 0);
const ALONG_THE_COLUMNS = new Vector2(0, 1);
// The depth a layer keeps where nothing was drawn, the farthest it holds
const NOTHING_DRAWN = 1;
// The spiral's turn between samples, the golden angle, π(3 − √5), and a whole turn, in radians
const GOLDEN_ANGLE = 2.399963229728653;
const HALF_TURN = Math.PI;
const WHOLE_TURN = HALF_TURN + HALF_TURN;
// Interleaved gradient noise (Jimenez, 2014): a number from 0 to 1 at each pixel, near none of its neighbours', from a
// pixel's place across and down, which turns each pixel's spiral apart from its neighbours'
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
// A pass's target before it is first sized, its focus before a field is first laid, and a field's smaller copies
// before it is first sized
const A_PIXEL = 1;
const FOCUSED_NOWHERE_YET = 0;
const NO_SMALLER_COPY = 0;
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

// How the tiles and the split read the scene's depth: how far before the eye a stored depth stands, in the frame's
// pixels, as three's perspective stores it between the depth's near and far; how wide the engine's law spreads it, in
// the drawing's pixels; whether anything was drawn there, and whether it is the near field's; and the nearest depth
// round a pixel
const DEPTH_READ = `
uniform sampler2D depth;
uniform vec2 depthRange;
uniform float frameScale;
uniform float pixelsOfOne;
uniform vec2 law;
uniform float focusDistance;
const float NOTHING_DRAWN = float(${NOTHING_DRAWN});
const float NEAR_BLURRED_FROM = float(${NEAR_BLURRED_FROM});
float distanceOf(float stored) {
	return depthRange.x * depthRange.y / (depthRange.y - stored * (depthRange.y - depthRange.x));
}
float spreadOf(float stored) {
	return law.x * abs(law.y - frameScale / distanceOf(stored)) * pixelsOfOne;
}
bool isDrawn(float stored) {
	return stored < NOTHING_DRAWN;
}
bool isNear(float stored) {
	return isDrawn(stored) && distanceOf(stored) < focusDistance && spreadOf(stored) >= NEAR_BLURRED_FROM;
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
// copy it reads them from: no nearer than the drawing's own
const SAMPLES_APART = `
const int SAMPLES = ${SAMPLES};
const float SPREADS_REACHED = float(${SPREADS_REACHED});
const float PI = ${Math.PI};
const float THE_DRAWINGS_OWN_SPACING = float(${THE_DRAWINGS_OWN_SPACING});
float gapFor(float radius) {
	return max(radius * sqrt(PI / float(SAMPLES)), THE_DRAWINGS_OWN_SPACING);
}`;

// The parts the scene is split into at the focus: the near field's light, the far field's, the far field's light its
// copies hold, and the measures every later pass reads of each pixel — by the nearest depth round it, whether the near
// field holds it, whole or none, and how wide it spreads, in the drawing's pixels, less than none where nothing was
// drawn round it; whether the far field's copies hold its light, whole or none; and how wide its own depth spreads, less
// than none where the far field has no depth of its own there. A sample's reach is read by the nearest depth round it,
// a pixel's own blur by its own: read by the nearest, a blurred page's pixel touching a sharp thing stood sharp, a line
// along the thing's edge
/** @typedef {'nearLight' | 'farLight' | 'spreadingLight' | 'measures'} SplitPart */
/** @type {{ readonly [Part in SplitPart]: number }} */
const SPLIT_PARTS = { nearLight: 0, farLight: 1, spreadingLight: 2, measures: 3 };
/** @type {readonly SplitPart[]} */
const SPLIT_PART_NAMES = ['nearLight', 'farLight', 'spreadingLight', 'measures'];
const SPLIT_FRAGMENT = `
uniform sampler2D drawnLight;
uniform sampler2D widened;
uniform int part;
varying vec2 shareOfTheFrame;
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
	float spread = drawn ? spreadOf(nearest) : NOTHING_DRAWN_ROUND;
	bool spreading = !near && spreads(drawn, spread);
	if (part == ${SPLIT_PARTS.measures}) {
		float own = texture2D(depth, shareOfTheFrame).x;
		float ownSpread = isDrawn(own) && !near ? spreadOf(own) : NO_FAR_DEPTH_HERE;
		gl_FragColor = vec4(near ? 1.0 : 0.0, spread, spreading ? 1.0 : 0.0, ownSpread);
		return;
	}
	bool held = part == ${SPLIT_PARTS.nearLight} ? near : part == ${SPLIT_PARTS.farLight} ? !near : spreading;
	gl_FragColor = held ? texture2D(drawnLight, shareOfTheFrame) : vec4(0.0);
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
// neighbours: blended, a sample between a sharp cube's pixel and a blurred page's took a reach between theirs, and
// carried the cube's green 13 pixels of a 3840 still into the page (2026-11-10)
vec4 measuredAt(vec2 share) {
	ivec2 size = textureSize(measures, ${FULL_SIZE});
	return texelFetch(measures, clamp(ivec2(share * vec2(size)), ivec2(0), size - 1), ${FULL_SIZE});
}`;

// The far field made whole: where the near field hides it, carried on into the hole from what of it stands nearest,
// read from its smaller copies, the finest first, each taken whole once it holds a pixel's worth of the far field, as
// the far field there, and laid under those before it for what they leave. Every pass after reads the far field so,
// with no hole in it. Gathered round each pixel with the hole left out, a pixel inside the near field's edge found
// half its disc and took the rest from coarse copies, which mixed in what stood far off along the edge, where a pixel
// outside it found all its disc: the near field's edge drew a hard line over the far field (a blurred cube over a dark
// block beside a white page, 2026-11-10); and laid under one another by the share each holds, the copies did the same
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
			float nearest = nearestRound((vec2(texel) + PIXEL_MIDDLE) / vec2(size));
			if (!isDrawn(nearest)) continue;
			if (isNear(nearest)) widest.x = max(widest.x, spreadOf(nearest));
			else widest.y = max(widest.y, spreadOf(nearest));
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
	// what was carried on into the hole from round it is softer the less of it shows, and goes on from the far field
	// at the edge as it stands
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
	/** @param {number} pixelsOfOne @param {number} frameScale */
	constructor(pixelsOfOne, frameScale) {
		this.frameScale = frameScale;
		// three draws nothing without a camera; every pass here places its own points
		this.camera = new Camera();
		/** Each part of the scene split at the focus, by its name @type {{ readonly [Part in SplitPart]: WebGLRenderTarget }} */
		this.parts = {
			nearLight: new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD),
			farLight: new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD),
			spreadingLight: new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD),
			measures: new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD)
		};
		this.tilesFound = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_FOUND);
		this.tilesWidenedAlongTheRows = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_FOUND);
		this.tilesWidened = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_WIDENED);
		this.found = passOver(depthReadValues(pixelsOfOne, frameScale), TILES_FOUND_FRAGMENT, WRITTEN);
		this.split = passOver(
			{
				...depthReadValues(pixelsOfOne, frameScale),
				drawnLight: { value: null },
				widened: { value: this.tilesWidened.texture },
				part: { value: SPLIT_PARTS.nearLight }
			},
			SPLIT_FRAGMENT,
			WRITTEN
		);
		this.farFieldWhole = new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD);
		const measures = { measures: { value: this.parts.measures.texture } };
		const farLight = { farLight: { value: this.parts.farLight.texture } };
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
				spreadingLight: { value: this.parts.spreadingLight.texture },
				nearField: { value: this.parts.nearLight.texture },
				farField: { value: this.farFieldWhole.texture },
				widened: { value: this.tilesWidened.texture },
				drawnBox: { value: new Vector4() },
				shownBox: { value: new Vector4() },
				pixelsOfAFramePixel: { value: window.devicePixelRatio }
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
	 * A field of the world's scene, holding a box of the frame, laid over the frame's box of the target blurred as the
	 * eye's focus has each pixel, or as it stands where the eye is a pinhole; the field's depth read as the eye that saw
	 * it, so far before the frame, stored it.
	 * @param {WebGLRenderer} renderer @param {SceneField} field @param {Box} drawn @param {Box} shown
	 * @param {Sharpness} sharpness @param {number} eyeDistance @param {WebGLRenderTarget} target
	 */
	laid(renderer, field, drawn, shown, sharpness, eyeDistance, target) {
		const boxes = { drawnBox: valuesOfTheBox(drawn), shownBox: valuesOfTheBox(shown) };
		if (sharpness.aperture === A_PINHOLE) {
			valuesSet(this.asItStands.material, { drawnLight: field.light, ...boxes });
			this.drawnInto(renderer, this.asItStands, target);
			return;
		}
		this.sizedFor(field);
		const range = depthRangeOf(eyeDistance);
		const depthRead = {
			depth: field.depth,
			depthRange: new Vector2(range.near, range.far),
			law: new Vector2(
				(sharpness.aperture / A_DISCS_WIDTH_IN_SPREADS) * sharpness.focalLength,
				1 / sharpness.focusedAt
			),
			focusDistance: sharpness.focusedAt * this.frameScale
		};
		valuesSet(this.found.material, depthRead);
		this.drawnInto(renderer, this.found, this.tilesFound);
		valuesSet(this.widening.material, { tiles: this.tilesFound.texture, along: ALONG_THE_ROWS });
		this.drawnInto(renderer, this.widening, this.tilesWidenedAlongTheRows);
		valuesSet(this.widening.material, { tiles: this.tilesWidenedAlongTheRows.texture, along: ALONG_THE_COLUMNS });
		this.drawnInto(renderer, this.widening, this.tilesWidened);
		valuesSet(this.split.material, { ...depthRead, drawnLight: field.light });
		for (const part of SPLIT_PART_NAMES) {
			valuesSet(this.split.material, { part: SPLIT_PARTS[part] });
			this.drawnInto(renderer, this.split, this.parts[part]);
		}
		valuesSet(this.madeWhole.material, { coarsestLevel: Math.floor(Math.log2(Math.max(field.width, field.height))) });
		this.drawnInto(renderer, this.madeWhole, this.farFieldWhole);
		valuesSet(this.lens.material, boxes);
		this.drawnInto(renderer, this.lens, target);
	}

	/** The lens's own layers sized to a field and its tiles. @param {SceneField} field */
	sizedFor(field) {
		for (const part of SPLIT_PART_NAMES) this.parts[part].setSize(field.width, field.height);
		this.farFieldWhole.setSize(field.width, field.height);
		const tilesAcross = Math.ceil(field.width / TILE);
		const tilesDown = Math.ceil(field.height / TILE);
		for (const tiles of [this.tilesFound, this.tilesWidenedAlongTheRows, this.tilesWidened]) {
			tiles.setSize(tilesAcross, tilesDown);
		}
	}

	/**
	 * A pass drawn into a target.
	 * @param {WebGLRenderer} renderer @param {Mesh<PlaneGeometry, ShaderMaterial>} pass @param {WebGLRenderTarget} target
	 */
	drawnInto(renderer, pass, target) {
		renderer.setRenderTarget(target);
		renderer.render(pass, this.camera);
	}
}

/**
 * The values a pass that reads the scene's depth takes (`DEPTH_READ`): the drawing's pixels of a pixel of a frame 1080
 * high and the frame's scale, set once; the depth, its range, the law and the focus set as each field is laid.
 * @param {number} pixelsOfOne @param {number} frameScale
 */
function depthReadValues(pixelsOfOne, frameScale) {
	return {
		depth: { value: null },
		depthRange: { value: new Vector2() },
		frameScale: { value: frameScale },
		pixelsOfOne: { value: pixelsOfOne },
		law: { value: new Vector2() },
		focusDistance: { value: FOCUSED_NOWHERE_YET }
	};
}
