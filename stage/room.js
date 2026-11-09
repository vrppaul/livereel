// @ts-check
/**
 * The stage drawn as a room: each exposure's surfaces — its ground, its window and all in it, what stands on its frame
 * — laid in a canvas apart, drawn there by the stage's markup as the flat stage draws them but for the window, which
 * stands face-on, and composed in WebGL. The window is placed as the engine's matrix sees it, from a picture of it as
 * sharp as the browser draws a page face-on, and filtered as it shrinks into the distance: the browser draws a layer
 * leant in 3D at about one of its pixels a page's pixel, however close the eye comes, so text near the eye of a window
 * leant back came out soft (SSIM 0.79–0.85 at 4–9×, probed 2026-11-02).
 *
 * The browser draws each surface into a texture through HTML-in-Canvas (`texElementImage2D`), once the canvas has
 * painted what the stage drew. The textures hold the browser's own colours, premultiplied, and are laid over one
 * another, and the exposures summed, as the flat stage's layers are, so a frame drawn as a room is the flat one but
 * for where the window stands and how it is filtered. The window's surface reaches as far past the frame as the
 * camera's picture does on its plane, as the eye may see the plane past the frame's edge, and is drawn less densely
 * where its texture would pass the graphics card's largest. One texture of each surface serves every exposure,
 * uploaded anew for each in turn, so the card holds three, not three for each exposure: sixteen exposures of a
 * 3840 × 2160 frame would hold 2 GB.
 *
 * Where the eye's focus blurs the window, the room blurs each point of it by how far it stands from the focus, as the
 * engine hands the blur of every point of the frame (`OutOfFocusAt` in `src/domain/focus.ts`), and the stylesheet draws
 * the window unblurred: the window is drawn alone, as far past the frame as the blur gathers at its edges, as the flat
 * stage's blur gathers the page past the frame's edge into it, then blurred across the frame and down it as a Gaussian
 * of its own spread at each point, and laid over the ground. A spread past a few pixels is sampled from the window's
 * smaller copies of itself, so a blur takes as many samples however wide it spreads.
 *
 * A film's own things (`stage/things.js`) are laid in each exposure over the window, under what stands on the frame:
 * each drawn alone in three's linear light, with its own edges smoothed, a thing in the world hidden where the window's
 * opaque surface stands nearer the eye, written back in the screen's colours, and laid over as one blur of its own
 * softens it.
 *
 * three.js keeps no camera here: every point is placed by the matrices the engine hands the stage, and the stage
 * decides nothing. The script is a module, three's being modules alone, which the page loads only where the film is
 * drawn as a room (`src/adapters/browser/room.ts`); it answers under `window.room`.
 */
import {
	BufferAttribute,
	BufferGeometry,
	Camera,
	CustomBlending,
	DoubleSide,
	ExternalTexture,
	HalfFloatType,
	LinearFilter,
	LinearMipmapLinearFilter,
	Matrix3,
	Matrix4,
	Mesh,
	NoBlending,
	OneFactor,
	OneMinusSrcAlphaFactor,
	PlaneGeometry,
	ShaderMaterial,
	Vector2,
	Vector3,
	SRGBColorSpace,
	Vector4,
	WebGLRenderTarget,
	WebGLRenderer
} from 'three';
import { matrixOf } from './matrices.js';
import { Things, depthRowOf, isAThing } from './things.js';
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { ThingObject } from './things.js' */
/** @import { OutOfFocusAt } from '../src/domain/focus.ts' */
/** @import { Transform } from '../src/domain/stance.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Layout } from '../src/adapters/browser/stage.ts' */
/** @import { RoomApi, ThingsLoaded } from '../src/adapters/browser/room.ts' */

/**
 * WebGL 2 as Chrome gives it with HTML-in-Canvas: an element laid in the canvas drawn into a texture, as the canvas
 * last painted it, at the page's device scale.
 * @typedef {WebGL2RenderingContext & {
 *   readonly texElementImage2D: (target: GLenum, internalFormat: GLenum, element: Element) => void
 * }} ElementDrawing
 */
/**
 * A canvas whose children it draws, which paints them on asking and tells when it has.
 * @typedef {HTMLCanvasElement & { readonly requestPaint: () => void }} PaintingCanvas
 */
/** The surfaces of an exposure, one over the other in the order named @typedef {'ground' | 'window' | 'frame'} SurfaceName */

// The surfaces of an exposure, the lowest first, and the attribute each is marked with in the stage's markup
/** @type {readonly SurfaceName[]} */
const SURFACES = ['ground', 'window', 'frame'];
const SURFACE = 'data-surface';
// The attribute a surface of an exposure a frame has none of is hidden by, so the canvas paints it not
const HIDDEN = 'hidden';
// The custom properties a surface is laid out by in the room, its box on the frame and how densely it is drawn
const SURFACE_LEFT = '--surface-left';
const SURFACE_TOP = '--surface-top';
const SURFACE_WIDTH = '--surface-width';
const SURFACE_HEIGHT = '--surface-height';
const SURFACE_DENSITY = '--surface-density';
// Where the frame's box stands from its own top left corner
const NOWHERE = 0;
// How clear round the window's surface is laid past what the frame shows of it, in the frame's pixels
const EDGE_CLEAR = 2;
// A plane the eye sees edge-on, carried onto a line; and the fourth value of a point of the frame seen back onto the
// plane where it sees no point of it before the eye
const EDGE_ON = 0;
const BEHIND_THE_EYE = 0;
// A surface drawn as densely as the page's device scale draws it, and the pixel the browser may round its texture's
// side up by
const AS_THE_PAGE = 1;
const ROUNDED_UP = 1;
// The canvas's class, and the attribute that has it draw what is laid in it
const ROOM = 'room';
const LAYS_OUT_ITS_CHILDREN = 'layoutsubtree';
// What the canvas fires once it has painted what is laid in it
const PAINTED = 'paint';
// The anisotropic filtering the card is asked for, where it has it, as sharp as it filters at a slant
const ANISOTROPY = 'EXT_texture_filter_anisotropic';
// A surface cleared to nothing, and the frame's ground cleared to nothing before its exposures are added up
const NOTHING = 0x000000;
const CLEAR = 0;
// A frame's whole light, which its exposures share alike
const WHOLE = 1;
// The first exposure of a frame, whose surfaces drawn once a frame serve every exposure of it
const FIRST = 0;
// How each surface's texture is drawn: anew for each exposure, or once a frame, as every exposure's ground is alike,
// the look being the first exposure's (`apply` in `stage.js`); and with smaller copies of itself where the room
// shrinks it, as it shrinks the window alone
/** @type {{ readonly [Name in SurfaceName]: { readonly eachExposure: boolean, readonly shrinks: boolean } }} */
const SURFACE_TEXTURES = {
	ground: { eachExposure: false, shrinks: false },
	window: { eachExposure: true, shrinks: true },
	frame: { eachExposure: true, shrinks: false }
};
// A surface's corners, each a share of the frame across and down from its top left, on its own plane; the two
// triangles that cover it, a corner at a time; and the values each corner is given as
const TOP_LEFT = [0, 0];
const TOP_RIGHT = [1, 0];
const BOTTOM_LEFT = [0, 1];
const BOTTOM_RIGHT = [1, 1];
const ON_ITS_PLANE = 0;
const SURFACE_TRIANGLES = new Float32Array(
	[TOP_LEFT, TOP_RIGHT, BOTTOM_LEFT, BOTTOM_LEFT, TOP_RIGHT, BOTTOM_RIGHT].flatMap((corner) => [
		...corner,
		ON_ITS_PLANE
	])
);
const CORNER_VALUES = 3;
// How wide and high WebGL's own space is, from -1 to 1 either way: a plane as large covers the whole frame
const WEBGL_SPAN = 2;
// Half of a box's width or height, which its middle stands at
const HALF = 0.5;
// A surface that stands as the frame does, not moved: its ground, what stands on its frame
const UNMOVED = new Matrix4();
// The entries a flat matrix leaves out, as one that leaves a point on the frame's plane, out none, its fourth value its
// own, has them
const NONE = 0;
const ITS_OWN = 1;
const STAYS_ON_ITS_PLANE = {
	m13: NONE,
	m14: NONE,
	m23: NONE,
	m24: NONE,
	m31: NONE,
	m32: NONE,
	m33: ITS_OWN,
	m34: NONE,
	m43: NONE,
	m44: ITS_OWN
};
// How a surface is laid over what is drawn under it, as the browser lays a layer: by how clear it is, its colours
// premultiplied by it; and how an exposure is added into the frame
const LAID_OVER = {
	blending: CustomBlending,
	blendSrc: OneFactor,
	blendDst: OneMinusSrcAlphaFactor,
	blendSrcAlpha: OneFactor,
	blendDstAlpha: OneMinusSrcAlphaFactor,
	depthTest: false,
	depthWrite: false,
	transparent: true
};
const ADDED = {
	blending: CustomBlending,
	blendSrc: OneFactor,
	blendDst: OneFactor,
	blendSrcAlpha: OneFactor,
	blendDstAlpha: OneFactor,
	depthTest: false,
	depthWrite: false,
	transparent: true
};
// What is drawn written as it is, over whatever stood there
const WRITTEN = { blending: NoBlending, depthTest: false, depthWrite: false };

// How the window is blurred where the eye's focus blurs it: across the frame, then down it, as a Gaussian of the spread
// the engine hands for each point, from so many samples on each side of the point, an eighth of the spread apart, out
// to three spreads; a pixel apart at least, so a spread of under eight pixels reaches past three, its far samples
// weighing nothing. Samples more than a pixel apart are taken from the window's smaller copies of itself, each standing
// for the pixels round it, so a blur costs as many samples however wide it spreads. A quarter of the spread apart left
// a ripple of one or two levels in eight bits, as far apart as the samples, down a window leant far back (probed
// 2026-11-04); an eighth left none.
const SAMPLES_A_SPREAD = 8;
const SPREADS_REACHED = 3;
const SAMPLES_EACH_SIDE = SAMPLES_A_SPREAD * SPREADS_REACHED;
const SAMPLED_AT_LEAST_APART = 1;
// The least a spread is taken as, squared, so a point the focus draws sharp weighs its own pixel alone: one beside it
// weighs e to the minus half a million
const SHARPEST_VARIANCE = 0.000001;
// The ways a blur goes, in the frame's pixels across and down
const ACROSS = new Vector2(1, 0);
const DOWN = new Vector2(0, 1);
// The window drawn alone to be blurred, and that blurred across, each with its smaller copies made as it is drawn; the
// blurred one in half floats, so a wide blur's soft slopes are not stepped before it is blurred down
const FOCUS_LAYER = {
	depthBuffer: false,
	generateMipmaps: true,
	minFilter: LinearMipmapLinearFilter,
	magFilter: LinearFilter
};
const BLURRED_LAYER = { ...FOCUS_LAYER, type: HalfFloatType };
// A thing drawn alone, with a depth of its own so its faces hide one another, its light added up linear as three's
// materials give it and kept in the screen's colours, so a thing laid over the surfaces is laid as the browser lays one;
// each pixel sampled at four points, so its edges and the window's cut are smoothed as the browser smooths the page's
const SAMPLES_A_PIXEL = 4;
const THING_LAYER = { depthBuffer: true, colorSpace: SRGBColorSpace, samples: SAMPLES_A_PIXEL };
// The surface an exposure's things are laid before: what stands on the frame, over the window, which hides what of a
// thing in the world stands behind it point by point
/** @type {SurfaceName} */
const THINGS_LAID_BEFORE = 'frame';
// How opaque the window's surface stands where it hides what stands behind it: more than half
const HIDES_AT_LEAST = '0.5';
// The window's depth written alone, its colours left as they stand, nearer hiding farther
const DEPTH_ONLY = { colorWrite: false, depthTest: true, depthWrite: true, blending: NoBlending };
// A surface drawn with no depth kept: the window as it is laid over the ground
const NO_DEPTH_ROW = new Vector2(0, 0);
// A film that names no things module builds no things
/** @type {ThingsLoaded} */
const NO_THINGS = { kind: 'built', names: [] };
// No way across or down the frame a thing's blur changes by: one softness for all of it
const EVENLY = 0;
// sRGB's curve, as IEC 61966-2-1 writes it: straight below its knee, a power of a gamma above it, scaled and offset to
// meet the straight part there
const SRGB = { lowSlope: '12.92', scale: '1.055', gamma: '2.4', offset: '0.055', knee: '0.0031308' };

// A surface placed on the frame by its matrix about a middle, the frame's pixels down from its top: the point a share
// of the surface's box across and down from its top left, on the frame's plane, carried about the middle as the matrix
// has it, then seen as far across and down as its fourth value takes it, as the browser draws a matrix3d(); drawn into
// what holds a box of the frame, the frame itself or as far past it as a blur gathers; its depth kept by the row a
// thing's depth is kept by (`depthRowOf` in `stage/things.js`), none where nothing is hidden by it
const PLACED_VERTEX = `
uniform mat4 placing;
uniform vec2 middle;
uniform vec2 boxCorner;
uniform vec2 boxSize;
uniform vec4 drawnBox;
uniform vec2 depthRow;
varying vec2 shareOfTheSurface;
void main() {
	shareOfTheSurface = position.xy;
	vec4 placed = placing * vec4(boxCorner + position.xy * boxSize - middle, 0.0, 1.0);
	vec2 inTheDrawn = middle * placed.w + placed.xy - drawnBox.xy * placed.w;
	float depth = depthRow.x * placed.z + depthRow.y * placed.w;
	gl_Position = vec4(2.0 * inTheDrawn.x / drawnBox.z - placed.w, placed.w - 2.0 * inTheDrawn.y / drawnBox.w, depth, placed.w);
}`;
const PLACED_FRAGMENT = `
uniform sampler2D surface;
varying vec2 shareOfTheSurface;
void main() {
	gl_FragColor = texture2D(surface, shareOfTheSurface);
}`;
// The window's depth alone, where its surface stands more opaque than clear, so a thing behind it is hidden there and
// seen past its edge, where the plane shows nothing
const DEPTH_FRAGMENT = `
uniform sampler2D surface;
varying vec2 shareOfTheSurface;
void main() {
	if (texture2D(surface, shareOfTheSurface).a < ${HIDES_AT_LEAST}) discard;
	gl_FragColor = vec4(0.0);
}`;
// A layer holding a box of the frame laid over another box of it as it stands, unblurred
const LAID_LAYER_FRAGMENT = `
uniform sampler2D drawn;
uniform vec4 drawnBox;
uniform vec4 shownBox;
varying vec2 shareOfTheFrame;
void main() {
	vec2 point = shownBox.xy + vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y) * shownBox.zw;
	vec2 share = (point - drawnBox.xy) / drawnBox.zw;
	gl_FragColor = texture2D(drawn, vec2(share.x, 1.0 - share.y));
}`;
// An exposure added into the frame at its weight, and the frame drawn on the canvas: over the whole of either
const OVER_THE_WHOLE_VERTEX = `
varying vec2 shareOfTheFrame;
void main() {
	shareOfTheFrame = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const WEIGHED_FRAGMENT = `
uniform sampler2D drawn;
uniform float weight;
varying vec2 shareOfTheFrame;
void main() {
	gl_FragColor = texture2D(drawn, shareOfTheFrame) * weight;
}`;
const SHOWN_FRAGMENT = `
uniform sampler2D drawn;
varying vec2 shareOfTheFrame;
void main() {
	gl_FragColor = texture2D(drawn, shareOfTheFrame);
}`;
// A thing's layer, read back linear, written in the screen's colours as the surfaces are, its colours premultiplied by
// how clear it is as theirs are: each colour encoded as sRGB encodes it, on its own before it is premultiplied
const ENCODED_FRAGMENT = `
uniform sampler2D drawn;
varying vec2 shareOfTheFrame;
vec3 encoded(vec3 linear) {
	vec3 low = linear * ${SRGB.lowSlope};
	vec3 high = ${SRGB.scale} * pow(linear, vec3(1.0 / ${SRGB.gamma})) - ${SRGB.offset};
	return mix(high, low, step(linear, vec3(${SRGB.knee})));
}
void main() {
	vec4 read = texture2D(drawn, shareOfTheFrame);
	vec3 own = read.a > 0.0 ? read.rgb / read.a : vec3(0.0);
	gl_FragColor = vec4(encoded(own) * read.a, read.a);
}`;
// What is drawn of a box of the frame blurred one way at each point of another, the frame's pixels down from its top:
// as soft as the engine's blur has the point, the size of an even number held to its farthest, and to the softest the
// window is drawn, as `outOfFocusAtThePoint` in `src/domain/focus.ts` reads it, in pixels of a frame 1080 high and so
// many of the drawing's for each; sampled along the way, each sample weighed by the Gaussian of that spread and taken
// from the smaller copy whose pixels stand as far apart as the samples, halved so many times, and none past the box
// drawn
const BLURRED_FRAGMENT = `
uniform sampler2D drawn;
uniform vec4 drawnBox;
uniform vec4 shownBox;
uniform vec2 way;
uniform vec4 blur;
uniform float atMost;
uniform float pixelsOfOne;
uniform float pixelsOfAFramePixel;
varying vec2 shareOfTheFrame;
const int SAMPLES_EACH_SIDE = ${SAMPLES_EACH_SIDE};
const float SAMPLES_A_SPREAD = float(${SAMPLES_A_SPREAD});
const float SAMPLED_AT_LEAST_APART = float(${SAMPLED_AT_LEAST_APART});
const float SHARPEST_VARIANCE = ${SHARPEST_VARIANCE};
vec4 drawnAt(vec2 point, float halvings) {
	vec2 share = (point - drawnBox.xy) / drawnBox.zw;
	vec2 within = step(vec2(0.0), share) * step(share, vec2(1.0));
	return textureLod(drawn, vec2(share.x, 1.0 - share.y), halvings) * within.x * within.y;
}
void main() {
	vec2 point = shownBox.xy + vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y) * shownBox.zw;
	float spread = min(abs(min(blur.x + blur.y * point.x + blur.z * point.y, blur.w)), atMost) * pixelsOfOne;
	float apart = max(SAMPLED_AT_LEAST_APART, spread / SAMPLES_A_SPREAD);
	float halvings = log2(apart);
	float twiceTheVariance = 2.0 * max(spread * spread, SHARPEST_VARIANCE);
	vec4 summed = vec4(0.0);
	float weighed = 0.0;
	for (int taken = -SAMPLES_EACH_SIDE; taken <= SAMPLES_EACH_SIDE; taken++) {
		float along = float(taken) * apart;
		float weight = exp(-along * along / twiceTheVariance);
		summed += drawnAt(point + way * along / pixelsOfAFramePixel, halvings) * weight;
		weighed += weight;
	}
	gl_FragColor = summed / weighed;
}`;

/**
 * A surface's texture: the card's own, drawn anew from the surface's element as the canvas last painted it, filtered
 * between its pixels; one the room shrinks also as smaller copies of itself where it shrinks into the distance, and as
 * sharply at a slant as the card filters, where it can.
 */
class SurfaceTexture {
	/** @param {WebGLRenderer} renderer @param {boolean} shrinks */
	constructor(renderer, shrinks) {
		this.renderer = renderer;
		this.shrinks = shrinks;
		this.context = elementDrawingOf(renderer);
		this.source = this.context.createTexture();
		this.texture = new ExternalTexture(this.source);
		const context = this.context;
		this.renderer.state.bindTexture(context.TEXTURE_2D, this.source);
		const shrunk = shrinks ? context.LINEAR_MIPMAP_LINEAR : context.LINEAR;
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, shrunk);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
		context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
		const anisotropic = context.getExtension(ANISOTROPY);
		if (shrinks && anisotropic !== null) {
			const sharpest = Number(context.getParameter(anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT));
			context.texParameterf(context.TEXTURE_2D, anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, sharpest);
		}
	}

	/**
	 * The element as the canvas last painted it, at the page's device scale, premultiplied by its clearness as the
	 * browser lays layers over one another, and its smaller copies made anew where the room shrinks it.
	 * @param {Element} element
	 */
	drawnFrom(element) {
		const context = this.context;
		this.renderer.state.bindTexture(context.TEXTURE_2D, this.source);
		context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
		context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		context.texElementImage2D(context.TEXTURE_2D, context.RGBA8, element);
		if (this.shrinks) context.generateMipmap(context.TEXTURE_2D);
	}
}

/** The room: the canvas each exposure's surfaces are laid in, and what composes a frame from them in WebGL. */
class Room {
	/** @param {Layout} layout @param {Things} things */
	constructor(layout, things) {
		/** The frame's box, in its own pixels @type {Box} */
		this.frameBox = { left: NOWHERE, top: NOWHERE, ...layout.format.frame };
		this.canvas = roomCanvas();
		/** Each exposure's surfaces, by name, in the order the stage's exposures stand @type {ReadonlyMap<SurfaceName, Element>[]} */
		this.exposureSurfaces = [...document.querySelectorAll('[data-exposure]')].map((exposure) =>
			surfacesLaidIn(exposure, this.canvas)
		);
		this.renderer = new WebGLRenderer({
			canvas: this.canvas,
			antialias: false,
			preserveDrawingBuffer: true,
			alpha: false
		});
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(layout.format.frame.width, layout.format.frame.height, false);
		this.renderer.autoClear = false;
		this.renderer.setClearColor(NOTHING, CLEAR);
		const drawn = this.renderer.getDrawingBufferSize(new Vector2());
		this.exposure = new WebGLRenderTarget(drawn.width, drawn.height, { depthBuffer: false });
		this.frame = new WebGLRenderTarget(drawn.width, drawn.height, { type: HalfFloatType, depthBuffer: false });
		/** The texture each surface is drawn into, for every exposure in turn @type {ReadonlyMap<SurfaceName, SurfaceTexture>} */
		this.textures = new Map(
			SURFACES.map((name) => [name, new SurfaceTexture(this.renderer, SURFACE_TEXTURES[name].shrinks)])
		);
		this.placed = placedSurfaceOf(PLACED_FRAGMENT, LAID_OVER);
		this.windowDepth = placedSurfaceOf(DEPTH_FRAGMENT, DEPTH_ONLY);
		this.layerLaying = overTheWholeOf(laidLayerMaterial());
		this.weighed = overTheWholeOf(weighedMaterial(this.exposure));
		this.shown = overTheWholeOf(shownMaterial(this.frame));
		// How many of the drawing's pixels a pixel of a frame 1080 high takes, as the engine's blur is measured in them
		this.pixelsOfOne = layout.frameScale * window.devicePixelRatio;
		/** The frame's size in the drawing's pixels @type {Vector2} */
		this.drawnSize = drawn;
		this.focusLayer = new WebGLRenderTarget(drawn.width, drawn.height, FOCUS_LAYER);
		this.blurredAcross = new WebGLRenderTarget(drawn.width, drawn.height, BLURRED_LAYER);
		this.blurringAcross = overTheWholeOf(blurredMaterial(ACROSS, WRITTEN, this.pixelsOfOne));
		this.blurringDown = overTheWholeOf(blurredMaterial(DOWN, LAID_OVER, this.pixelsOfOne));
		// three draws nothing without a camera; every point here is placed by the room's own shaders, not by it
		this.camera = new Camera();
		this.things = things;
		this.thingLayer = new WebGLRenderTarget(drawn.width, drawn.height, THING_LAYER);
		this.encoding = overTheWholeOf(encodedMaterial(this.thingLayer));
	}

	/**
	 * One frame composed from its exposures: the window's surface of each laid out as far as its scene reaches, and as
	 * far past the frame as a blur of any of them gathers, the surfaces of those it has painted, and each exposure drawn,
	 * its surfaces laid over one another, the window where its scene places it, the film's things among them, and added
	 * into the frame at an equal weight; the frame shown on the canvas once the card has drawn it. What the film is told
	 * where its things module throws building or setting a thing, none where the frame is drawn.
	 * @param {readonly DrawnScene[]} scenes @returns {Promise<string | null>}
	 */
	async compose(scenes) {
		const gathered = this.gatheredFor(scenes);
		const exposurePlacings = scenes.map((scene) => placingsOf(scene, this.frameBox, gathered));
		for (const [place, surfaces] of this.exposureSurfaces.entries()) {
			for (const [name, surface] of surfaces) surface.toggleAttribute(HIDDEN, !isPainted(name, place, scenes.length));
		}
		for (const [place, placings] of exposurePlacings.entries()) {
			const windowBox = placingOfThe(placings, 'window').box;
			laidOutAs(surfaceOf(surfacesAt(this.exposureSurfaces, place), 'window'), windowBox, this.densityOf(windowBox));
		}
		await paintedOf(this.canvas);
		const first = surfacesAt(this.exposureSurfaces, FIRST);
		for (const name of SURFACES.filter((each) => !SURFACE_TEXTURES[each].eachExposure)) {
			textureOf(this.textures, name).drawnFrom(surfaceOf(first, name));
		}
		sizedTo(this.focusLayer, gathered);
		sizedTo(this.thingLayer, gathered);
		sizedTo(this.blurredAcross, acrossTheFrame(gathered, this.frameBox));
		this.renderer.setRenderTarget(this.frame);
		this.renderer.clear();
		valuesSet(this.weighed.material, { weight: WHOLE / scenes.length });
		for (const [place, placings] of exposurePlacings.entries()) {
			const things = thingsIn(scenesAt(scenes, place));
			const refused = this.exposureDrawn(surfacesAt(this.exposureSurfaces, place), placings, things, gathered);
			if (refused !== null) return refused;
		}
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.shown, this.camera);
		return null;
	}

	/**
	 * An exposure drawn and added into the frame: each of its surfaces laid over those under it, where its scene places
	 * it, as the eye's focus blurs it, those drawn anew for each exposure drawn into their textures first; its things
	 * laid over the window, each as the eye's focus blurs it, and what stands on the frame over them. What the film is
	 * told where its module throws building or setting a thing, none where all are drawn.
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {ReadonlyMap<SurfaceName, Placing>} placings
	 * @param {readonly ThingObject[]} things @param {Box} gathered @returns {string | null}
	 */
	exposureDrawn(surfaces, placings, things, gathered) {
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.clear();
		for (const name of SURFACES) {
			if (name === THINGS_LAID_BEFORE) {
				const refused = this.thingsLaid(things, placingOfThe(placings, 'window'), gathered);
				if (refused !== null) return refused;
			}
			const texture = textureOf(this.textures, name);
			if (SURFACE_TEXTURES[name].eachExposure) texture.drawnFrom(surfaceOf(surfaces, name));
			const placing = placingOfThe(placings, name);
			if (placing.outOfFocusAt === null) this.laidOver(texture, placing);
			else this.blurredOver(texture, placing, placing.outOfFocusAt, gathered);
		}
		this.renderer.setRenderTarget(this.frame);
		this.renderer.render(this.weighed, this.camera);
		return null;
	}

	/**
	 * An exposure's things laid over what is drawn of it, each in turn; what the film is told where its module throws,
	 * none where all are drawn.
	 * @param {readonly ThingObject[]} things @param {Placing} window @param {Box} gathered @returns {string | null}
	 */
	thingsLaid(things, window, gathered) {
		for (const thing of things) {
			const refused = this.thingLaid(thing, window, gathered);
			if (refused !== null) return refused;
		}
		return null;
	}

	/**
	 * A thing laid over what is drawn of an exposure: drawn alone where it stands, as far past the frame as the blur
	 * gathers, hidden where the window stands nearer the eye if it stands in the world, in the screen's colours, then
	 * laid over as the eye's focus blurs it, by one softness for all of it, or unblurred where sharp. What the film is
	 * told where its module throws, none where it draws.
	 * @param {ThingObject} thing @param {Placing} window @param {Box} gathered @returns {string | null}
	 */
	thingLaid(thing, window, gathered) {
		this.renderer.setRenderTarget(this.thingLayer);
		this.renderer.clear();
		if (thing.content.inTheWorld) this.windowDepthDrawn(window, thing.content.eyeDistance, gathered);
		const refused = this.things.drawn(this.renderer, thing, gathered);
		if (refused !== null) return refused;
		this.renderer.setRenderTarget(this.focusLayer);
		this.renderer.render(this.encoding, this.camera);
		const spread = thing.content.outOfFocus;
		if (spread === null) this.layerLaidOver(this.focusLayer, gathered);
		else this.layerBlurredOver(this.focusLayer, evenlySoft(spread), gathered);
		return null;
	}

	/**
	 * The window's depth drawn into the thing's layer where its surface stands opaque, kept as the thing's depth is, so
	 * what of a thing stands behind the window there is hidden.
	 * @param {Placing} window @param {number} eyeDistance @param {Box} gathered
	 */
	windowDepthDrawn(window, eyeDistance, gathered) {
		const depth = depthRowOf(eyeDistance);
		placedAs(this.windowDepth, textureOf(this.textures, 'window'), window, gathered);
		valuesSet(this.windowDepth.material, { depthRow: new Vector2(depth.outward, depth.kept) });
		this.renderer.render(this.windowDepth, this.camera);
	}

	/**
	 * What a layer holds of the box of the frame a blur gathers laid over what is drawn of an exposure, unblurred.
	 * @param {WebGLRenderTarget} layer @param {Box} gathered
	 */
	layerLaidOver(layer, gathered) {
		valuesSet(this.layerLaying.material, {
			drawn: layer.texture,
			drawnBox: valuesOfTheBox(gathered),
			shownBox: valuesOfTheBox(this.frameBox)
		});
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.layerLaying, this.camera);
	}

	/** A surface laid over what is drawn of an exposure, where it stands. @param {SurfaceTexture} texture @param {Placing} placing */
	laidOver(texture, placing) {
		placedAs(this.placed, texture, placing, this.frameBox);
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.placed, this.camera);
	}

	/**
	 * A surface laid over what is drawn of an exposure blurred as the eye's focus blurs each point of it: drawn alone
	 * where it stands, as far past the frame as the blur gathers, blurred across the frame as far up and down past it,
	 * then down the frame and laid over.
	 * @param {SurfaceTexture} texture @param {Placing} placing @param {OutOfFocusAt} blur @param {Box} gathered
	 */
	blurredOver(texture, placing, blur, gathered) {
		placedAs(this.placed, texture, placing, gathered);
		this.renderer.setRenderTarget(this.focusLayer);
		this.renderer.clear();
		this.renderer.render(this.placed, this.camera);
		this.layerBlurredOver(this.focusLayer, blur, gathered);
	}

	/**
	 * What a layer holds of the box of the frame a blur gathers blurred across the frame as far up and down past it,
	 * then down the frame and laid over what is drawn of an exposure.
	 * @param {WebGLRenderTarget} layer @param {OutOfFocusAt} blur @param {Box} gathered
	 */
	layerBlurredOver(layer, blur, gathered) {
		const across = acrossTheFrame(gathered, this.frameBox);
		valuesSet(this.blurringAcross.material, blurredValues(layer, gathered, across, blur));
		this.renderer.setRenderTarget(this.blurredAcross);
		this.renderer.render(this.blurringAcross, this.camera);
		valuesSet(this.blurringDown.material, blurredValues(this.blurredAcross, across, this.frameBox, blur));
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.blurringDown, this.camera);
	}

	/**
	 * The box of the frame the window and the things are drawn into for a frame's exposures: as far past each edge of
	 * the frame as a blur of any of them gathers there, from the softest point of its window the frame shows or its
	 * softest thing, in whole pixels of the drawing, and no farther than the graphics card's largest texture leaves room
	 * for, past which a blur by the frame's edge gathers nothing; the frame itself where the eye's focus blurs none.
	 * @param {readonly DrawnScene[]} scenes @returns {Box}
	 */
	gatheredFor(scenes) {
		const softest = Math.max(
			NONE,
			...scenes.map((scene) => scene.window.outOfFocusAt?.atMost ?? NONE),
			...scenes.flatMap(thingsIn).map((thing) => thing.content.outOfFocus ?? NONE)
		);
		if (softest === NONE) return this.frameBox;
		const apart = Math.max(SAMPLED_AT_LEAST_APART, (softest * this.pixelsOfOne) / SAMPLES_A_SPREAD);
		const roomLeft = (this.renderer.capabilities.maxTextureSize - Math.max(this.drawnSize.x, this.drawnSize.y)) * HALF;
		const reach = Math.min(Math.ceil(SAMPLES_EACH_SIDE * apart), Math.floor(roomLeft));
		return grownBy(this.frameBox, reach / window.devicePixelRatio);
	}

	/**
	 * How densely a surface of a box is drawn: at the page's device scale, or less, where its texture would pass the
	 * graphics card's largest on a side.
	 * @param {Box} box
	 */
	densityOf(box) {
		const largestSide = this.renderer.capabilities.maxTextureSize - ROUNDED_UP;
		return Math.min(AS_THE_PAGE, largestSide / (Math.max(box.width, box.height) * window.devicePixelRatio));
	}
}

/**
 * Where a surface stands on the frame: its box on its own plane, in the frame's pixels, and the matrix that carries it
 * about a middle; and how soft the eye's focus draws each point of it, none where it draws it as it stands.
 * @typedef {{
 *   readonly box: Box,
 *   readonly matrix: Matrix4,
 *   readonly middle: Vector2,
 *   readonly outOfFocusAt: OutOfFocusAt | null
 * }} Placing
 */

/**
 * Where each surface of an exposure stands, as its scene places it: the ground and what stands on the frame where the
 * frame stands, sharp; the window by the engine's matrix about its view's middle, blurred by the eye's focus as the
 * engine has it, over as much of its plane as the frame shows of what stands there, the frame's own box, and as far
 * past it as a blur gathers there and as the camera's picture reaches, where the eye may see it leant or from aside,
 * and a little clear round it, so the plane's edge falls inside its texture and is filtered as the browser smooths an
 * edge, not cut stepped by its triangles.
 * @param {DrawnScene} scene @param {Box} frame @param {Box} gathered @returns {ReadonlyMap<SurfaceName, Placing>}
 */
function placingsOf(scene, frame, gathered) {
	const view = scene.window.box;
	const entries = entriesOf(scene.window.transform);
	const middle = new Vector2(view.left + view.width * HALF, view.top + view.height * HALF);
	const standing = boxAround(gathered, scene.window.reach);
	const asTheWindow = {
		box: clearRound(seenOf(standing, entries, middle, gathered)),
		matrix: matrixOf(entries),
		middle,
		outOfFocusAt: scene.window.outOfFocusAt
	};
	const asTheFrame = { box: frame, matrix: UNMOVED, middle: new Vector2(), outOfFocusAt: null };
	return new Map([
		['ground', asTheFrame],
		['window', asTheWindow],
		['frame', asTheFrame]
	]);
}

/**
 * The part of a box on the window's plane a box of the frame shows: its corners seen back onto the plane, through the
 * matrix that carries it about its middle; the whole box where a corner sees past the plane's horizon, where nothing of
 * it stands before the eye, or where the eye sees the plane edge-on.
 * @param {Box} standing @param {Matrix} entries @param {Vector2} middle @param {Box} shown @returns {Box}
 */
function seenOf(standing, entries, middle, shown) {
	// How a point of the plane, out none, is carried onto the frame: across, down and its fourth value, by those alone
	const carried = new Matrix3().set(
		entries.m11,
		entries.m21,
		entries.m41,
		entries.m12,
		entries.m22,
		entries.m42,
		entries.m14,
		entries.m24,
		entries.m44
	);
	if (carried.determinant() === EDGE_ON) return standing;
	const seenBack = carried.invert();
	const corners = cornersOf(shown).map((corner) =>
		new Vector3(corner.x - middle.x, corner.y - middle.y, ITS_OWN).applyMatrix3(seenBack)
	);
	if (corners.some((corner) => corner.z <= BEHIND_THE_EYE)) return standing;
	const onThePlane = corners.map(
		(corner) => new Vector2(corner.x / corner.z + middle.x, corner.y / corner.z + middle.y)
	);
	const seen = boxWithin(boxOfPoints(onThePlane), standing);
	return seen.width > NONE && seen.height > NONE ? seen : standing;
}

/** A box's four corners. @param {Box} box */
function cornersOf(box) {
	const right = box.left + box.width;
	const bottom = box.top + box.height;
	return [
		new Vector2(box.left, box.top),
		new Vector2(right, box.top),
		new Vector2(box.left, bottom),
		new Vector2(right, bottom)
	];
}

/** The least box the points stand in. @param {readonly Vector2[]} points @returns {Box} */
function boxOfPoints(points) {
	const left = Math.min(...points.map((point) => point.x));
	const top = Math.min(...points.map((point) => point.y));
	const right = Math.max(...points.map((point) => point.x));
	const bottom = Math.max(...points.map((point) => point.y));
	return { left, top, width: right - left, height: bottom - top };
}

/** The part of one box inside another, of a size of none or less where they do not meet. @param {Box} first @param {Box} second @returns {Box} */
function boxWithin(first, second) {
	const left = Math.max(first.left, second.left);
	const top = Math.max(first.top, second.top);
	const right = Math.min(first.left + first.width, second.left + second.width);
	const bottom = Math.min(first.top + first.height, second.top + second.height);
	return { left, top, width: right - left, height: bottom - top };
}

/**
 * A box with a margin clear round it, to whole pixels outward: what the surface holds is drawn where the frame has it,
 * so a surface standing a share of a pixel off would draw every letter that share apart from where flat draws it.
 * @param {Box} box @returns {Box}
 */
function clearRound(box) {
	const left = Math.floor(box.left - EDGE_CLEAR);
	const top = Math.floor(box.top - EDGE_CLEAR);
	const right = Math.ceil(box.left + box.width + EDGE_CLEAR);
	const bottom = Math.ceil(box.top + box.height + EDGE_CLEAR);
	return { left, top, width: right - left, height: bottom - top };
}

/**
 * The part of a box gathered past the frame a blur across the frame is drawn over: as wide as the frame, which the
 * blur down it is drawn over, and as high as the box, which it gathers from.
 * @param {Box} gathered @param {Box} frame @returns {Box}
 */
function acrossTheFrame(gathered, frame) {
	return { left: frame.left, top: gathered.top, width: frame.width, height: gathered.height };
}

/**
 * A layer sized to hold a box of the frame in the drawing's pixels, the box's own whole number of them: three makes it
 * anew only where that size is not the one it has.
 * @param {WebGLRenderTarget} layer @param {Box} box
 */
function sizedTo(layer, box) {
	layer.setSize(Math.round(box.width * window.devicePixelRatio), Math.round(box.height * window.devicePixelRatio));
}

/** A box grown on every side by so many pixels. @param {Box} box @param {number} pixels @returns {Box} */
function grownBy(box, pixels) {
	return {
		left: box.left - pixels,
		top: box.top - pixels,
		width: box.width + pixels + pixels,
		height: box.height + pixels + pixels
	};
}

/** The least box both boxes stand in. @param {Box} first @param {Box} second @returns {Box} */
function boxAround(first, second) {
	const left = Math.min(first.left, second.left);
	const top = Math.min(first.top, second.top);
	const right = Math.max(first.left + first.width, second.left + second.width);
	const bottom = Math.max(first.top + first.height, second.top + second.height);
	return { left, top, width: right - left, height: bottom - top };
}

/**
 * A surface laid out over a box of the frame, as densely as named: the stylesheet stands it there, what it holds where
 * the frame has it.
 * @param {Element} surface @param {Box} box @param {number} density
 */
function laidOutAs(surface, box, density) {
	if (!(surface instanceof HTMLElement)) throw new Error("the room's surface is no element of the page's");
	surface.style.setProperty(SURFACE_LEFT, String(box.left));
	surface.style.setProperty(SURFACE_TOP, String(box.top));
	surface.style.setProperty(SURFACE_WIDTH, String(box.width));
	surface.style.setProperty(SURFACE_HEIGHT, String(box.height));
	surface.style.setProperty(SURFACE_DENSITY, String(density));
}

/** @param {ReadonlyMap<SurfaceName, Placing>} placings @param {SurfaceName} name */
function placingOfThe(placings, name) {
	const placing = placings.get(name);
	if (placing === undefined) throw new Error(`the room places no ${name} surface`);
	return placing;
}

/**
 * Whether the canvas paints a surface of an exposure for a frame of so many exposures: one the frame has, and of a
 * surface drawn once a frame, the first exposure's alone.
 * @param {SurfaceName} name @param {number} place @param {number} exposures
 */
function isPainted(name, place, exposures) {
	return place < exposures && (SURFACE_TEXTURES[name].eachExposure || place === FIRST);
}

/**
 * Every entry of the engine's matrix: a flat one's with those of one that leaves a point on the frame's plane where it
 * stands.
 * @param {Transform} transform @returns {Matrix}
 */
function entriesOf(transform) {
	return transform.kind === 'flat' ? { ...STAYS_ON_ITS_PLANE, ...transform.matrix } : transform.matrix;
}

/** The room's canvas, laid over the stage, drawing what is laid in it. @returns {PaintingCanvas} */
function roomCanvas() {
	const canvas = document.createElement('canvas');
	canvas.classList.add(ROOM);
	canvas.setAttribute(LAYS_OUT_ITS_CHILDREN, '');
	document.body.append(canvas);
	if (!isPainting(canvas))
		throw new Error("the room's canvas draws nothing laid in it: the browser lacks HTML-in-Canvas");
	return canvas;
}

/** @param {HTMLCanvasElement} canvas @returns {canvas is PaintingCanvas} */
function isPainting(canvas) {
	return 'requestPaint' in canvas;
}

/**
 * An exposure's surfaces, by name, laid in the room's canvas, each a child of its own there, as the canvas draws only
 * its own children into a texture.
 * @param {Element} exposure @param {PaintingCanvas} canvas @returns {ReadonlyMap<SurfaceName, Element>}
 */
function surfacesLaidIn(exposure, canvas) {
	const surfaces = new Map(SURFACES.map((name) => [name, surfaceIn(exposure, name)]));
	canvas.append(...surfaces.values());
	return surfaces;
}

/** A surface of an exposure in the stage's markup, by its name. @param {Element} exposure @param {SurfaceName} name */
function surfaceIn(exposure, name) {
	const surface = exposure.querySelector(`[${SURFACE}="${name}"]`);
	if (surface === null) throw new Error(`the stage's exposure has no ${name} surface`);
	return surface;
}

/** The canvas painted, what the stage drew in it with it: once it says it has. @param {PaintingCanvas} canvas */
function paintedOf(canvas) {
	const painted = new Promise((resolve) => canvas.addEventListener(PAINTED, resolve, { once: true }));
	canvas.requestPaint();
	return painted;
}

/** The WebGL a renderer draws with, with HTML-in-Canvas. @param {WebGLRenderer} renderer @returns {ElementDrawing} */
function elementDrawingOf(renderer) {
	const context = renderer.getContext();
	if (!(context instanceof WebGL2RenderingContext) || !('texElementImage2D' in context)) {
		throw new Error("the room's WebGL draws no element: the browser lacks HTML-in-Canvas");
	}
	return /** @type {ElementDrawing} */ (context);
}

/**
 * The plane a surface is drawn on over the frame, placed by its own matrix about its own middle, laid over what is
 * drawn under it as the browser lays a layer, by how clear it is; drawn whichever side faces the eye, as a window
 * turned half round shows the page mirrored, and the frame's down runs against WebGL's up, which turns every surface's
 * side over. With a fragment that draws its depth alone, the window's plane hides what of a thing stands behind it.
 * @param {string} fragment @param {typeof LAID_OVER | typeof DEPTH_ONLY} laid
 */
function placedSurfaceOf(fragment, laid) {
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(SURFACE_TRIANGLES, CORNER_VALUES));
	const material = new ShaderMaterial({
		uniforms: {
			surface: { value: null },
			placing: { value: new Matrix4() },
			middle: { value: new Vector2() },
			boxCorner: { value: new Vector2() },
			boxSize: { value: new Vector2() },
			drawnBox: { value: new Vector4() },
			depthRow: { value: NO_DEPTH_ROW }
		},
		vertexShader: PLACED_VERTEX,
		fragmentShader: fragment,
		side: DoubleSide,
		...laid
	});
	return standingAlone(new Mesh(geometry, material));
}

/** A layer of a box of the frame laid over another, unblurred. */
function laidLayerMaterial() {
	return new ShaderMaterial({
		uniforms: { drawn: { value: null }, drawnBox: { value: new Vector4() }, shownBox: { value: new Vector4() } },
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: LAID_LAYER_FRAGMENT,
		...LAID_OVER
	});
}

/** A drawing over the whole frame, by a material. @param {ShaderMaterial} material */
function overTheWholeOf(material) {
	return standingAlone(new Mesh(new PlaneGeometry(WEBGL_SPAN, WEBGL_SPAN), material));
}

/** An exposure drawn, added into the frame at its weight. @param {WebGLRenderTarget} exposure */
function weighedMaterial(exposure) {
	return new ShaderMaterial({
		uniforms: { drawn: { value: exposure.texture }, weight: { value: WHOLE } },
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: WEIGHED_FRAGMENT,
		...ADDED
	});
}

/** A thing's layer written in the screen's colours, over all it is written into. @param {WebGLRenderTarget} layer */
function encodedMaterial(layer) {
	return new ShaderMaterial({
		uniforms: { drawn: { value: layer.texture } },
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: ENCODED_FRAGMENT,
		...WRITTEN
	});
}

/** The things among the objects a scene draws, those standing and those pushed off. @param {DrawnScene} scene */
function thingsIn(scene) {
	return [...scene.objects, ...scene.leaving].filter(isAThing);
}

/**
 * A blur as soft at every point of the frame, as a thing is blurred by its point nearest the focus.
 * @param {number} spread @returns {OutOfFocusAt}
 */
function evenlySoft(spread) {
	return { atTheCorner: spread, across: EVENLY, down: EVENLY, farthest: spread, atMost: spread };
}

/** @param {readonly DrawnScene[]} scenes @param {number} place */
function scenesAt(scenes, place) {
	const scene = scenes[place];
	if (scene === undefined) throw new Error(`the room has no exposure ${place + 1}: the frame has ${scenes.length}`);
	return scene;
}

/** The frame, its exposures added up, drawn on the canvas as it is. @param {WebGLRenderTarget} frame */
function shownMaterial(frame) {
	return new ShaderMaterial({
		uniforms: { drawn: { value: frame.texture } },
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: SHOWN_FRAGMENT,
		...WRITTEN
	});
}

/**
 * What is drawn blurred one way, as the eye's focus blurs each point, laid as named over what it is drawn into.
 * @param {Vector2} way @param {typeof WRITTEN | typeof LAID_OVER} laid @param {number} pixelsOfOne
 */
function blurredMaterial(way, laid, pixelsOfOne) {
	return new ShaderMaterial({
		uniforms: {
			drawn: { value: null },
			drawnBox: { value: new Vector4() },
			shownBox: { value: new Vector4() },
			way: { value: way },
			blur: { value: new Vector4() },
			atMost: { value: NONE },
			pixelsOfOne: { value: pixelsOfOne },
			pixelsOfAFramePixel: { value: window.devicePixelRatio }
		},
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: BLURRED_FRAGMENT,
		...laid
	});
}

/**
 * The values a blur is drawn by: what a layer holds of a box of the frame, blurred over another box of it as the eye's
 * focus blurs each point.
 * @param {WebGLRenderTarget} layer @param {Box} drawn @param {Box} shown @param {OutOfFocusAt} blur
 */
function blurredValues(layer, drawn, shown, blur) {
	return {
		drawn: layer.texture,
		drawnBox: valuesOfTheBox(drawn),
		shownBox: valuesOfTheBox(shown),
		blur: new Vector4(blur.atTheCorner, blur.across, blur.down, blur.farthest),
		atMost: blur.atMost
	};
}

/** A box as a shader takes it: its left, top, width and height. @param {Box} box */
function valuesOfTheBox(box) {
	return new Vector4(box.left, box.top, box.width, box.height);
}

/**
 * A mesh three draws as it stands, wherever its points fall: its shader places them, not three's camera.
 * @template {Mesh} Drawn @param {Drawn} mesh
 */
function standingAlone(mesh) {
	mesh.frustumCulled = false;
	mesh.matrixAutoUpdate = false;
	return mesh;
}

/**
 * The plane a surface is drawn on set to draw a texture, placed so, into what holds a box of the frame.
 * @param {Mesh<BufferGeometry, ShaderMaterial>} plane @param {SurfaceTexture} texture @param {Placing} placing
 * @param {Box} drawn
 */
function placedAs(plane, texture, placing, drawn) {
	valuesSet(plane.material, {
		surface: texture.texture,
		placing: placing.matrix,
		middle: placing.middle,
		boxCorner: new Vector2(placing.box.left, placing.box.top),
		boxSize: new Vector2(placing.box.width, placing.box.height),
		drawnBox: valuesOfTheBox(drawn)
	});
}

/**
 * A material's values set, and sent to the card as it is next drawn: three sends a material's values only as it takes
 * up the material, not when it draws it again.
 * @param {ShaderMaterial} material @param {Readonly<Record<string, unknown>>} values
 */
function valuesSet(material, values) {
	for (const [name, value] of Object.entries(values)) {
		const uniform = material.uniforms[name];
		if (uniform === undefined) throw new Error(`the room's material has no value named ${name}`);
		uniform.value = value;
	}
	material.uniformsNeedUpdate = true;
}

/**
 * An exposure's surfaces, by its place among the stage's exposures: the room lays every exposure the stage has.
 * @param {readonly ReadonlyMap<SurfaceName, Element>[]} exposures @param {number} place
 */
function surfacesAt(exposures, place) {
	const surfaces = exposures[place];
	if (surfaces === undefined)
		throw new Error(`the room has no exposure ${place + 1}: the stage draws ${exposures.length}`);
	return surfaces;
}

/** @param {ReadonlyMap<SurfaceName, SurfaceTexture>} textures @param {SurfaceName} name */
function textureOf(textures, name) {
	const texture = textures.get(name);
	if (texture === undefined) throw new Error(`the room has no texture for the ${name} surface`);
	return texture;
}

/** @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {SurfaceName} name */
function surfaceOf(surfaces, name) {
	const surface = surfaces.get(name);
	if (surface === undefined) throw new Error(`the room's exposure has no ${name} surface`);
	return surface;
}

/** The room laid out once, as the stage is: none before. @type {Room | null} */
let laidOut = null;

/**
 * The room laid out, and the film's things module loaded where it names one: the names it builds a thing by, or what
 * the film is told.
 * @param {Layout} layout @param {string | null} address @returns {Promise<ThingsLoaded>}
 */
async function roomLaidOut(layout, address) {
	const things = new Things();
	const loaded = address === null ? NO_THINGS : await things.loaded(address);
	laidOut = new Room(layout, things);
	return loaded;
}

/** @type {RoomApi} */
const ROOM_API = {
	setup: roomLaidOut,
	compose: (scenes) => {
		if (laidOut === null) throw new Error('the room composes a frame before it is laid out');
		return laidOut.compose(scenes);
	}
};
window.room = ROOM_API;
