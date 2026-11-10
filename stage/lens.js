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
 *   Where the near field hides the far one, the far field is carried on into the hole from round it.
 * The widest spreads are found per tile of the drawing and widened over the tiles they reach. Each sample's place on its
 * spiral is turned from pixel to pixel, so the samples' pattern draws no copies of an edge, and read from the field's
 * smaller copy whose pixels stand as far apart as the samples, so a wide disc is smooth.
 *
 * The scene's depth is read once, as it is split: each pixel by the nearest depth round it, as a pixel at the edge of
 * what the scene drew holds a share of the nearer thing's light while its one depth, of a single sample, may be the
 * farther one's or nothing's. The split writes beside the fields what every later pass reads of each pixel: whether the
 * near field holds it, how wide it spreads, and whether anything was drawn there; read off each sample's own depth
 * instead, a sharp thing's smoothed edge under a blurred page's depth spread the thing's colour over the page. The lens
 * reads the scene's light linear, premultiplied by how clear it is, and lays it over what is drawn of an exposure in
 * the screen's colours, as the browser's surfaces are laid.
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
import { LAID_OVER, SRGB_CURVES, WRITTEN, passOver, valuesOfTheBox, valuesSet } from './passes.js';
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
// The side of a tile the widest spreads are found over, in the drawing's pixels, and how many tiles a spread reaches
// past its own at most: a spread of 64 of the drawing's pixels reaches no farther
const TILE = 16;
const TILES_REACHED_AT_MOST = 12;
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
// A pixel's own spread where its own depth says nothing was drawn there: less than any spread
const NOTHING_DRAWN_HERE = -1;
// The most smaller copies a field keeps, one for each halving of a side of 65,536 pixels, more than a card holds; and a
// pixel filled so nearly whole the coarser copies would add nothing to see
const MOST_LEVELS = 16;
const WHOLLY_TAKEN = 0.999;
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
// The widest spreads per tile, near and far: found exactly, then widened and read smoothly between tiles
const TILES_FOUND = { type: HalfFloatType, depthBuffer: false, minFilter: NearestFilter, magFilter: NearestFilter };
const TILES_WIDENED = { type: HalfFloatType, depthBuffer: false, minFilter: LinearFilter, magFilter: LinearFilter };

// How the split reads the scene's depth: how far before the eye a stored depth stands, in the frame's pixels, as three's
// perspective stores it between the depth's near and far; how wide the engine's law spreads it, in the drawing's
// pixels; whether anything was drawn there, and whether it is the near field's; and the nearest depth round a pixel
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

// The parts the scene is split into at the focus: the near field's light, the far field's, and the measures every
// later pass reads of each pixel — by the nearest depth round it, whether the near field holds it, whole or none, how
// wide it spreads, in the drawing's pixels, and whether anything was drawn there, whole or none; and how wide its own
// depth spreads, less than none where its own depth says nothing was drawn. A sample's reach is read by the nearest
// depth round it, a pixel's own blur by its own: read by the nearest, a blurred page's pixel touching a sharp thing
// stood sharp, a line along the thing's edge
/** @typedef {'nearLight' | 'farLight' | 'measures'} SplitPart */
/** @type {{ readonly [Part in SplitPart]: number }} */
const SPLIT_PARTS = { nearLight: 0, farLight: 1, measures: 2 };
/** @type {readonly SplitPart[]} */
const SPLIT_PART_NAMES = ['nearLight', 'farLight', 'measures'];
const SPLIT_FRAGMENT = `
uniform sampler2D drawnLight;
uniform int part;
varying vec2 shareOfTheFrame;
${DEPTH_READ}
const float NOTHING_DRAWN_HERE = float(${NOTHING_DRAWN_HERE});
void main() {
	float nearest = nearestRound(shareOfTheFrame);
	bool near = isNear(nearest);
	bool drawn = isDrawn(nearest);
	if (part == ${SPLIT_PARTS.measures}) {
		float own = texture2D(depth, shareOfTheFrame).x;
		float ownSpread = isDrawn(own) ? spreadOf(own) : NOTHING_DRAWN_HERE;
		gl_FragColor = vec4(near ? 1.0 : 0.0, drawn ? spreadOf(nearest) : 0.0, drawn ? 1.0 : 0.0, ownSpread);
		return;
	}
	vec4 light = texture2D(drawnLight, shareOfTheFrame);
	gl_FragColor = near == (part == ${SPLIT_PARTS.nearLight}) ? light : vec4(0.0);
}`;

// How the passes after the split read its measures of a pixel
const MEASURES_READ = `
uniform sampler2D measures;
const float HALF_MARKED = ${HALF_MARKED};
bool isNearIn(vec4 measured) {
	return measured.r > HALF_MARKED;
}
bool isDrawnIn(vec4 measured) {
	return measured.b > HALF_MARKED;
}`;

// The widest near and far spread of each tile
const TILES_FOUND_FRAGMENT = `
${MEASURES_READ}
const int TILE = ${TILE};
void main() {
	ivec2 tile = ivec2(gl_FragCoord.xy);
	ivec2 size = textureSize(measures, ${FULL_SIZE});
	vec2 widest = vec2(0.0);
	for (int down = 0; down < TILE; down++) {
		for (int across = 0; across < TILE; across++) {
			ivec2 texel = tile * TILE + ivec2(across, down);
			if (texel.x >= size.x || texel.y >= size.y) continue;
			vec4 measured = texelFetch(measures, texel, ${FULL_SIZE});
			if (!isDrawnIn(measured)) continue;
			if (isNearIn(measured)) widest.x = max(widest.x, measured.g);
			else widest.y = max(widest.y, measured.g);
		}
	}
	gl_FragColor = vec4(widest, 0.0, 1.0);
}`;

// Each tile's widest spreads widened by those of the tiles round it whose reach comes to it
const TILES_WIDENED_FRAGMENT = `
uniform sampler2D tiles;
const int REACHED = ${TILES_REACHED_AT_MOST};
const float TILE = float(${TILE});
const float SPREADS_REACHED = float(${SPREADS_REACHED});
void main() {
	ivec2 tile = ivec2(gl_FragCoord.xy);
	ivec2 tilesThere = textureSize(tiles, ${FULL_SIZE});
	vec2 widest = texelFetch(tiles, tile, ${FULL_SIZE}).xy;
	for (int down = -REACHED; down <= REACHED; down++) {
		for (int across = -REACHED; across <= REACHED; across++) {
			ivec2 other = tile + ivec2(across, down);
			if (other.x < 0 || other.y < 0 || other.x >= tilesThere.x || other.y >= tilesThere.y) continue;
			vec2 spreads = texelFetch(tiles, other, ${FULL_SIZE}).xy;
			float away = (float(max(abs(down), abs(across))) - 1.0) * TILE;
			widest = max(widest, spreads * step(vec2(away), SPREADS_REACHED * spreads));
		}
	}
	gl_FragColor = vec4(widest, 0.0, 1.0);
}`;

// The near field laid over the far one, each blurred as its law has it, in the screen's colours
const LENS_FRAGMENT = `
uniform sampler2D nearField;
uniform sampler2D farField;
uniform sampler2D widened;
uniform vec4 drawnBox;
uniform vec4 shownBox;
uniform float pixelsOfAFramePixel;
uniform float coarsestLevel;
varying vec2 shareOfTheFrame;
${MEASURES_READ}
${SRGB_CURVES}
const int SAMPLES = ${SAMPLES};
const float SPREADS_REACHED = float(${SPREADS_REACHED});
const float SHARP_SPREAD = ${SHARP_SPREAD};
const float NEAR_BLURRED_FROM = float(${NEAR_BLURRED_FROM});
const float GOLDEN_ANGLE = ${GOLDEN_ANGLE};
const float WHOLE_TURN = ${WHOLE_TURN};
const vec3 NOISE = vec3(${NOISE.scale}, ${NOISE.across}, ${NOISE.down});
const float PIXEL_MIDDLE = ${PIXEL_MIDDLE};
const float PI = ${Math.PI};
const int MOST_LEVELS = ${MOST_LEVELS};
const float WHOLLY_TAKEN = ${WHOLLY_TAKEN};
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
// How far apart a disc's samples stand, in the drawing's pixels, a pixel at least
float gapFor(float radius) {
	return max(radius * sqrt(PI / float(SAMPLES)), 1.0);
}
// The far field round a pixel: each sample of it weighed by the pixel's Gaussian and by whether its own spread reaches
// the pixel, and counted for as much of it as the near field leaves, read from the same smaller copy, so a sample on
// the near field, or one whose copy mixes in the near field's emptiness, darkens nothing. Its light, and the share of
// the disc's weight it found there
struct Far {
	vec4 light;
	float found;
};
Far farBlurred(vec2 point, vec2 here, float spread, float turn) {
	if (spread < SHARP_SPREAD) return Far(texture2D(farField, here), 1.0 - texture2D(measures, here).r);
	float radius = SPREADS_REACHED * spread;
	float gap = gapFor(radius);
	float level = log2(gap);
	vec4 summed = vec4(0.0);
	float weighed = 0.0;
	float whole = 0.0;
	for (int taken = 0; taken < SAMPLES; taken++) {
		vec2 offset = spiralAt(taken, radius, turn);
		vec2 at = shareAt(point + offset / pixelsOfAFramePixel);
		vec4 measured = textureLod(measures, at, FULL_SIZE);
		float reaches = isDrawnIn(measured) ? SPREADS_REACHED * measured.g : radius;
		float covering = clamp((reaches - length(offset)) / gap + 1.0, 0.0, 1.0);
		float gaussian = exp(-dot(offset, offset) / (2.0 * spread * spread));
		float weight = gaussian * covering * within(at);
		summed += textureLod(farField, at, level) * weight;
		weighed += weight * (1.0 - textureLod(measures, at, level).r);
		whole += gaussian;
	}
	return Far(weighed > 0.0 ? summed / weighed : vec4(0.0), weighed / whole);
}
// The far field where the near field hides it, carried on from round it: each smaller copy of the far field in turn,
// the finest first, laid under those before it as far as the near field leaves it; so the far field goes on into the
// hole smoothly, with no sample's chance in it
vec4 filledBehind(vec2 here) {
	vec4 filled = vec4(0.0);
	float taken = 0.0;
	for (int level = 1; level <= MOST_LEVELS; level++) {
		if (float(level) > coarsestLevel || taken >= WHOLLY_TAKEN) break;
		float left = 1.0 - textureLod(measures, here, float(level)).r;
		filled += textureLod(farField, here, float(level)) * (1.0 - taken);
		taken += left * (1.0 - taken);
	}
	return filled;
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
	vec4 measured = textureLod(measures, here, FULL_SIZE);
	vec2 widest = texture2D(widened, here).xy;
	float turn = turnAt(gl_FragCoord.xy);
	Near near = nearBlurred(point, here, widest.x, turn);
	// Where the near field hides the far one, the far field is gathered from round it at the far field's widest spread
	// there, as it goes on to the near field's edge, and carried on into the hole for what of the pixel that leaves:
	// carried on alone, by copies coarser than the far field's blur, it drew a line where a sharp edge of it met the
	// near field; gathered alone, at the near field's spread, it met a sharp far field in a hard step
	float hiddenSpread = max(widest.y, NEAR_BLURRED_FROM);
	float farSpread = isNearIn(measured) ? hiddenSpread : measured.a >= 0.0 ? measured.a : widest.y;
	Far far = farBlurred(point, here, farSpread, turn);
	vec4 behind = isNearIn(measured) ? mix(filledBehind(here), far.light, min(far.found, 1.0)) : far.light;
	gl_FragColor = inTheScreensColours(near.light + (1.0 - min(near.cover, 1.0)) * behind);
}`;

// A field laid as it stands, where the eye blurs nothing, in the screen's colours
const LAID_AS_IT_STANDS_FRAGMENT = `
uniform sampler2D drawnLight;
uniform vec4 drawnBox;
uniform vec4 shownBox;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	vec2 point = shownBox.xy + vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y) * shownBox.zw;
	vec2 share = (point - drawnBox.xy) / drawnBox.zw;
	gl_FragColor = inTheScreensColours(texture2D(drawnLight, vec2(share.x, 1.0 - share.y)));
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
			measures: new WebGLRenderTarget(A_PIXEL, A_PIXEL, FIELD)
		};
		this.tilesFound = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_FOUND);
		this.tilesWidened = new WebGLRenderTarget(A_PIXEL, A_PIXEL, TILES_WIDENED);
		this.split = passOver(
			{
				drawnLight: { value: null },
				part: { value: SPLIT_PARTS.nearLight },
				depth: { value: null },
				depthRange: { value: new Vector2() },
				frameScale: { value: frameScale },
				pixelsOfOne: { value: pixelsOfOne },
				law: { value: new Vector2() },
				focusDistance: { value: FOCUSED_NOWHERE_YET }
			},
			SPLIT_FRAGMENT,
			WRITTEN
		);
		const measures = { measures: { value: this.parts.measures.texture } };
		this.found = passOver(measures, TILES_FOUND_FRAGMENT, WRITTEN);
		this.widening = passOver({ tiles: { value: this.tilesFound.texture } }, TILES_WIDENED_FRAGMENT, WRITTEN);
		this.lens = passOver(
			{
				...measures,
				nearField: { value: this.parts.nearLight.texture },
				farField: { value: this.parts.farLight.texture },
				widened: { value: this.tilesWidened.texture },
				drawnBox: { value: new Vector4() },
				shownBox: { value: new Vector4() },
				pixelsOfAFramePixel: { value: window.devicePixelRatio },
				coarsestLevel: { value: NO_SMALLER_COPY }
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
	 * eye's focus has each pixel, or as it stands where the eye is a pinhole.
	 * @param {WebGLRenderer} renderer @param {SceneField} field @param {Box} drawn @param {Box} shown
	 * @param {Sharpness} sharpness @param {WebGLRenderTarget} target
	 */
	laid(renderer, field, drawn, shown, sharpness, target) {
		const boxes = { drawnBox: valuesOfTheBox(drawn), shownBox: valuesOfTheBox(shown) };
		if (sharpness.aperture === A_PINHOLE) {
			valuesSet(this.asItStands.material, { drawnLight: field.light, ...boxes });
			this.drawnInto(renderer, this.asItStands, target);
			return;
		}
		this.sizedFor(field);
		const range = depthRangeOf(sharpness.focalLength * this.frameScale);
		valuesSet(this.split.material, {
			depth: field.depth,
			drawnLight: field.light,
			depthRange: new Vector2(range.near, range.far),
			law: new Vector2(
				(sharpness.aperture / A_DISCS_WIDTH_IN_SPREADS) * sharpness.focalLength,
				1 / sharpness.focusedAt
			),
			focusDistance: sharpness.focusedAt * this.frameScale
		});
		for (const part of SPLIT_PART_NAMES) {
			valuesSet(this.split.material, { part: SPLIT_PARTS[part] });
			this.drawnInto(renderer, this.split, this.parts[part]);
		}
		this.drawnInto(renderer, this.found, this.tilesFound);
		this.drawnInto(renderer, this.widening, this.tilesWidened);
		valuesSet(this.lens.material, {
			...boxes,
			coarsestLevel: Math.floor(Math.log2(Math.max(field.width, field.height)))
		});
		this.drawnInto(renderer, this.lens, target);
	}

	/** The lens's own layers sized to a field and its tiles. @param {SceneField} field */
	sizedFor(field) {
		for (const part of SPLIT_PART_NAMES) this.parts[part].setSize(field.width, field.height);
		const tilesAcross = Math.ceil(field.width / TILE);
		const tilesDown = Math.ceil(field.height / TILE);
		this.tilesFound.setSize(tilesAcross, tilesDown);
		this.tilesWidened.setSize(tilesAcross, tilesDown);
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
