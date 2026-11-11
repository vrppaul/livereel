// @ts-check
/**
 * The page's picture as the room draws it (`stage/room.js`): a texture made straight from the picture the stage shows
 * (`show` in `stage/stage.js`), which three samples as densely as the picture holds the page, with smaller copies of
 * itself and as sharply at a slant as the card filters, so a window brought near the eye or leant toward it shows the
 * page as sharp as the picture was taken. Markup, which would reflow drawn denser, stays in the surfaces the browser
 * draws at the frame's own density: the window's, which holds the screen's own markup over the page — the sweep, the
 * holes, the light, the cursor, the dim — or a page of the film's own; and the surface of what lies over the page in
 * the window, apart — a callout, pins, an object inside the window — which the stage lays apart where a frame is drawn
 * as a room, as it lies over the faded screen whole, not faded with it.
 *
 * The picture is uploaded once each time the stage shows another, not each exposure as the surfaces are drawn. Where
 * the window shades the page with a blur, the picture is blurred as the stylesheet blurs it, a Gaussian whose deviation
 * is the shade's blur, nothing past the picture's edge, so the screen's ground shows there: drawn from the smaller copy
 * of the picture whose pixels stand no more than a share of the blur apart, across and then down, and kept while the
 * picture and the blur stand.
 *
 * The page's surface lays, as the browser lays them in the window's view: the screen's ground and the picture, cut to
 * the screen's rounded box and the view's, showing as far as the screen is clear less how clear its own markup is
 * there; over them that markup, as the window's surface holds it; and over all, what lies over the page.
 */
import { Camera, Color, LinearMipmapLinearFilter, Texture, Vector2, Vector4, WebGLRenderTarget } from 'three';
import { SRGB_CURVES, WRITTEN, passOver, valuesOfTheBox, valuesSet } from './passes.js';
/** @import { WebGLRenderer } from 'three' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { Box, Size } from '../src/domain/geometry.ts' */

/**
 * What the page's surface lays, as the shader takes it: the texture of what lies over the page and whether anything
 * does; the texture it samples the picture from and whether it draws one; the box of the window's plane both surfaces
 * are laid out over; where the screen lies on that plane and how round its corners are; the part of it the view shows
 * and how round its corners are; how clear the screen is; and its ground. Every box in the frame's pixels on the
 * window's plane.
 * @typedef {{
 *   readonly overThePage: Texture | null,
 *   readonly anythingOver: boolean,
 *   readonly picture: Texture | null,
 *   readonly pictured: boolean,
 *   readonly surfaceBox: Vector4,
 *   readonly screenBox: Vector4,
 *   readonly screenCorner: number,
 *   readonly shownBox: Vector4,
 *   readonly shownCorner: number,
 *   readonly shown: number,
 *   readonly ground: Vector4
 * }} PageLaid
 */

// A share of a surface so clear none of it is drawn there, nor its depth: under a level of the browser's eight bits
const EIGHT_BIT_LEVELS = 255;
const DRAWN_AT_LEAST = 1 / EIGHT_BIT_LEVELS;
// How far inside an edge its smoothing reaches, in pixels of the frame as the eye sees it, and the least a pixel's
// width is taken as, so a plane seen edge-on divides by no zero
const HALF_A_PIXEL = 0.5;
const NARROWEST_PIXEL = 1e-6;
// The ground the screen shows where the page draws none, a token of the stylesheet's (`tokens.css`); and a whole share,
// of the ground's clearness and of how far the screen shows
const SCREEN_GROUND = '--screen-ground';
const WHOLE = 1;
// A blur of none, which leaves the picture as it was taken; a texture's own copy, not a smaller one; and a corner not
// rounded
const UNBLURRED = 0;
const FULL_SIZE = 0;
const SQUARE = 0;
// How far apart, in deviations of the blur, the pixels of the smaller copy the blur is drawn from stand at most, and
// how many of those pixels it gathers either side of each, three deviations of the widest
const MOST_SPREAD_A_PIXEL = 2;
const GATHERED_EACH_SIDE = 6;
// Each smaller copy of a texture is half as large as the one before
const HALVING = 2;
// The ways the blur is drawn along, one after the other, across and down
const ACROSS = new Vector2(1, 0);
const DOWN = new Vector2(0, 1);
// One pixel: a layer's side before it is first sized, and a blur's spread before it is first set
const A_PIXEL = 1;
// The picture blurred across alone, and then down too, in the screen's colours as the picture is, the second with
// smaller copies of itself
const BLURRED_ACROSS_LAYER = { depthBuffer: false };
const BLURRED_LAYER = { depthBuffer: false, generateMipmaps: true, minFilter: LinearMipmapLinearFilter };

/**
 * The page's surface, all in the screen's colours, premultiplied, read back into linear light: the screen's ground and
 * the page's picture, where it draws one, showing as far as the screen is clear less how clear the window's surface is
 * there, as its markup over the page is as clear as the screen, cut to the screen's rounded box and the view's, each
 * edge smoothed over a pixel of the frame as the eye sees it; over them the window's surface; over all, what lies over
 * the page, where anything does. None drawn, nor its depth, where it is clear.
 */
export const PAGE_SURFACE_FRAGMENT = `
uniform sampler2D surface;
uniform sampler2D overThePage;
uniform bool anythingOver;
uniform sampler2D picture;
uniform bool pictured;
uniform vec4 surfaceBox;
uniform vec4 screenBox;
uniform float screenCorner;
uniform vec4 shownBox;
uniform float shownCorner;
uniform float shown;
uniform vec4 ground;
varying vec2 shareOfTheSurface;
${SRGB_CURVES}
float pastTheEdge(vec2 point, vec4 box, float corner) {
	vec2 halfSize = box.zw * 0.5;
	float rounding = min(corner, min(halfSize.x, halfSize.y));
	vec2 fromTheCorner = abs(point - box.xy - halfSize) - halfSize + rounding;
	return length(max(fromTheCorner, 0.0)) + min(max(fromTheCorner.x, fromTheCorner.y), 0.0) - rounding;
}
void main() {
	vec4 screen = texture2D(surface, shareOfTheSurface);
	vec4 under = vec4(0.0);
	if (pictured) {
		vec2 point = surfaceBox.xy + shareOfTheSurface * surfaceBox.zw;
		float past = max(pastTheEdge(point, screenBox, screenCorner), pastTheEdge(point, shownBox, shownCorner));
		float inside = clamp(${HALF_A_PIXEL} - past / max(fwidth(past), ${NARROWEST_PIXEL}), 0.0, 1.0);
		vec4 page = texture2D(picture, (point - screenBox.xy) / screenBox.zw);
		under = inside * max(shown - screen.a, 0.0) * (page + (1.0 - page.a) * ground);
	}
	vec4 over = anythingOver ? texture2D(overThePage, shareOfTheSurface) : vec4(0.0);
	vec4 drawn = over + (1.0 - over.a) * (screen + under);
	if (drawn.a < ${DRAWN_AT_LEAST}) discard;
	gl_FragColor = inLinearLight(drawn);
}`;

/**
 * The picture blurred along one way: each pixel of the layer drawn a Gaussian of the pixels of a copy of what it reads,
 * so many either side along the way, the copy's pixels a step apart, none past its edge.
 */
const BLURRED_ALONG_FRAGMENT = `
uniform sampler2D drawn;
uniform float level;
uniform vec2 pixelStep;
uniform float spread;
varying vec2 shareOfTheFrame;
void main() {
	vec4 gathered = vec4(0.0);
	float weights = 0.0;
	for (int along = -${GATHERED_EACH_SIDE}; along <= ${GATHERED_EACH_SIDE}; along++) {
		float weight = exp(-0.5 * float(along * along) / (spread * spread));
		vec2 at = shareOfTheFrame + pixelStep * float(along);
		bool onIt = all(greaterThanEqual(at, vec2(0.0))) && all(lessThanEqual(at, vec2(1.0)));
		gathered += weight * (onIt ? textureLod(drawn, at, level) : vec4(0.0));
		weights += weight;
	}
	gl_FragColor = gathered / weights;
}`;

/** The values a page's surface's material starts with, its own: nothing laid yet. */
export function pageSurfaceValues() {
	return {
		surface: { value: null },
		overThePage: { value: null },
		anythingOver: { value: false },
		picture: { value: null },
		pictured: { value: false },
		surfaceBox: { value: new Vector4() },
		screenBox: { value: new Vector4() },
		screenCorner: { value: SQUARE },
		shownBox: { value: new Vector4() },
		shownCorner: { value: SQUARE },
		shown: { value: WHOLE },
		ground: { value: new Vector4() }
	};
}

/** The page's picture the stage shows, as the room lays it under the window's surface. */
export class PagePicture {
	/**
	 * @param {WebGLRenderer} renderer @param {HTMLImageElement} shownBy the stage's picture of the page
	 * @param {Size} screen the screen's size, in its pixels
	 */
	constructor(renderer, shownBy, screen) {
		this.renderer = renderer;
		this.shownBy = shownBy;
		this.screen = screen;
		this.texture = new Texture();
		this.texture.flipY = false;
		this.texture.minFilter = LinearMipmapLinearFilter;
		this.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
		/** The address of the picture uploaded, none before the first @type {string | null} */
		this.uploaded = null;
		this.ground = screenGround();
		this.across = new WebGLRenderTarget(A_PIXEL, A_PIXEL, BLURRED_ACROSS_LAYER);
		this.blurred = new WebGLRenderTarget(A_PIXEL, A_PIXEL, BLURRED_LAYER);
		/** The blur the blurred picture was drawn with, of the picture uploaded; none before the first @type {number | null} */
		this.blurredBy = null;
		this.blurring = passOver(
			{
				drawn: { value: null },
				level: { value: FULL_SIZE },
				pixelStep: { value: new Vector2() },
				spread: { value: A_PIXEL }
			},
			BLURRED_ALONG_FRAGMENT,
			WRITTEN
		);
		// three draws nothing without a camera; the passes place their own points
		this.camera = new Camera();
	}

	/**
	 * What the page's surface of an exposure lays with the window's surface, both laid out over a box of the window's
	 * plane, and what lies over the page, where anything does: the page's picture, blurred as the window shades it, over
	 * the screen's ground, cut and as clear as the screen, where the screen shows the filmed page; nothing where it
	 * shows a page of the film's own, which stands on its ground in the window's surface (`stage.css`).
	 * @param {DrawnScene} scene @param {Box} surface @param {Texture | null} overThePage @returns {PageLaid}
	 */
	laidWith(scene, surface, overThePage) {
		const filmed = scene.screen.filmed;
		const laid = {
			overThePage,
			anythingOver: overThePage !== null,
			surfaceBox: valuesOfTheBox(surface),
			shownBox: valuesOfTheBox(scene.window.reach),
			shownCorner: scene.window.corner,
			shown: scene.window.pageShown,
			ground: this.ground
		};
		if (filmed === null) {
			return { ...laid, picture: null, pictured: false, screenBox: new Vector4(), screenCorner: SQUARE };
		}
		const screenBox = valuesOfTheBox(filmed.box);
		return { ...laid, picture: this.seenBlurred(scene), pictured: true, screenBox, screenCorner: filmed.corner };
	}

	/**
	 * The picture as an exposure shows it: uploaded anew where the stage shows another, and blurred as the window shades
	 * the page, its blur in the picture's pixels, as many as the stylesheet's in the screen's, which the camera's zoom
	 * scales (`[data-shaded] .page` in `stage.css`).
	 * @param {DrawnScene} scene
	 */
	seenBlurred(scene) {
		this.uploadedAnew();
		const shade = scene.window.shade;
		const inTheScreen = shade === null ? UNBLURRED : shade.blur / scene.camera.pose.zoom;
		const spread = (inTheScreen * this.shownBy.naturalWidth) / this.screen.width;
		if (spread <= UNBLURRED) return this.texture;
		if (this.blurredBy !== spread) this.blurredAnew(spread);
		this.blurredBy = spread;
		return this.blurred.texture;
	}

	/** The picture the stage shows uploaded, where it is another than the one uploaded last. */
	uploadedAnew() {
		const address = this.shownBy.src;
		if (this.uploaded === address) return;
		this.texture.image = this.shownBy;
		this.texture.needsUpdate = true;
		this.uploaded = address;
		this.blurredBy = null;
	}

	/**
	 * The picture blurred by a deviation in its own pixels: from its smaller copy whose pixels stand no farther apart than
	 * the most a pixel spreads, across into one layer, then down into another as large.
	 * @param {number} spread
	 */
	blurredAnew(spread) {
		const level = Math.max(FULL_SIZE, Math.ceil(Math.log2(spread / MOST_SPREAD_A_PIXEL)));
		const shrunk = HALVING ** level;
		const width = Math.ceil(this.shownBy.naturalWidth / shrunk);
		const height = Math.ceil(this.shownBy.naturalHeight / shrunk);
		const spreadThere = spread / shrunk;
		this.across.setSize(width, height);
		this.blurred.setSize(width, height);
		this.blurredAlong(this.texture, level, ACROSS.clone().divideScalar(width), spreadThere, this.across);
		this.blurredAlong(this.across.texture, FULL_SIZE, DOWN.clone().divideScalar(height), spreadThere, this.blurred);
	}

	/**
	 * A texture's copy at a level blurred along a way, a step a pixel, into a layer.
	 * @param {Texture} drawn @param {number} level @param {Vector2} pixelStep @param {number} spread
	 * @param {WebGLRenderTarget} into
	 */
	blurredAlong(drawn, level, pixelStep, spread, into) {
		valuesSet(this.blurring.material, { drawn, level, pixelStep, spread });
		this.renderer.setRenderTarget(into);
		this.renderer.render(this.blurring, this.camera);
	}
}

/**
 * The screen's ground as the stylesheet draws it, in the screen's colours, opaque: three reads a colour into linear
 * light, so it is written back.
 * @returns {Vector4}
 */
function screenGround() {
	const token = getComputedStyle(document.documentElement).getPropertyValue(SCREEN_GROUND).trim();
	const colour = new Color(token).convertLinearToSRGB();
	return new Vector4(colour.r, colour.g, colour.b, WHOLE);
}
