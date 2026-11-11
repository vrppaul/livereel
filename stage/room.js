// @ts-check
/**
 * The stage drawn as a room: each exposure's surfaces — its ground, its window and all in it, what stands on its frame
 * — laid in a canvas apart, drawn there by the stage's markup as the flat stage draws them but for the window, which
 * stands face-on, and composed in WebGL. The browser draws each surface into a texture through HTML-in-Canvas
 * (`texElementImage2D`), once the canvas has painted what the stage drew, in the screen's colours, premultiplied.
 *
 * An exposure is its ground; over it the world, one three.js scene with one depth: the page's surface on a plane where
 * the engine's matrix places it in the eye's own space, its texture read back into linear light; the window's body and
 * glass round it (`stage/body.js`); the film's things in the world (`stage/things.js`); each object of markup standing
 * in the world, a title, code, the terminal or a piece, on a surface of its own the stage lays it in apart from the
 * frame's, drawn face-on into a texture and stood where the engine's matrix places its box; all seen in perspective from
 * the eye and lit as it sees the room (`stage/lighting.js`), hiding one another by depth alone. The eye's lens blurs
 * each pixel of the world by how far what it shows stands from the focus (`stage/lens.js`), its fields laid over one
 * another in linear light and the whole laid over the ground; over that stand the film's things on the frame, sharp,
 * then the frame's surface.
 *
 * The page's surface is drawn from a picture of it as sharp as the browser draws a page face-on, and filtered as it
 * shrinks into the distance: the browser draws a layer leant in 3D at about one of its pixels a page's pixel, however
 * close the eye comes, so text near the eye of a window leant back came out soft (SSIM 0.79–0.85 at 4–9×, probed
 * 2026-11-02). It reaches as far past the frame as the camera's picture does on its plane, as the eye may see the plane
 * past the frame's edge, and is drawn less densely where its texture would pass the graphics card's largest. The world
 * is drawn as far past the frame as the lens's blur gathers at its edges, to a step, so the layers it is drawn into
 * keep their size while the blur gathers alike.
 *
 * The exposures are added up in linear light, as a shutter gathers the light of each moment: a glint that moves draws a
 * streak as bright as its light, where averaged in the screen's colours it went dark. Where the world asks, the frame
 * glows round its light past the page's white, as a lens blooms, once over the light its exposures gathered: three's
 * own bloom (`UnrealBloomPass`), the reference promo's, its spread a share of a frame 1080 high however large the frame
 * is drawn; the glow lies over all the frame, what stands on it too. One texture of each surface serves every exposure,
 * uploaded anew for each in turn, so the card holds three, not three for each exposure: sixteen exposures of a 3840 ×
 * 2160 frame would hold 2 GB.
 *
 * three.js keeps no camera of its own: every point is placed by the matrices the engine hands the stage, and the
 * world's camera takes the projection alone. The script is a module, three's being modules alone, which the page loads
 * only where the film is drawn as a room (`src/adapters/browser/room.ts`); it answers under `window.room`.
 */
import {
	Camera,
	CustomBlending,
	DepthTexture,
	DoubleSide,
	ExternalTexture,
	HalfFloatType,
	Matrix3,
	Matrix4,
	Mesh,
	NoBlending,
	OneFactor,
	OneMinusSrcAlphaFactor,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	Vector2,
	Vector3,
	WebGLRenderTarget,
	WebGLRenderer
} from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { WindowBody } from './body.js';
import { Lens, SPREADS_REACHED } from './lens.js';
import { WorldLighting } from './lighting.js';
import { matrixOf, projectionOnto } from './matrices.js';
import { ADDED, LAID_OVER, SRGB_CURVES, passOver, valuesSet } from './passes.js';
import { FrameShown } from './shown.js';
import { SeeThroughField, WORLD_PARTS, hasAPartSeenThrough, partsDrawn, sortedBySeeingThrough } from './see-through.js';
import { Things, isAThing } from './things.js';
/** @import { DrawnScene, ObjectList } from '../src/scene.ts' */
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnWindow } from '../src/props/window.ts' */
/** @import { DrawnBloom } from '../src/props/lighting.ts' */
/** @import { ThingObject } from './things.js' */
/** @import { SceneField } from './lens.js' */
/** @import { WorldPart } from './see-through.js' */
/** @import { Transform } from '../src/domain/stance.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Layout } from '../src/adapters/browser/stage.ts' */
/** @import { Object3D, RenderItem } from 'three' */
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
/** The surfaces laid flat over the frame, as it stands @typedef {Exclude<SurfaceName, 'window'>} FlatSurfaceName */

// The surfaces of an exposure, the lowest first, and the attribute each is marked with in the stage's markup
/** @type {readonly SurfaceName[]} */
const SURFACES = ['ground', 'window', 'frame'];
const SURFACE = 'data-surface';
// The class every surface takes, the name a surface of markup standing in the world is marked by, and the class of the
// holder the stage lays its object in
const SURFACE_CLASS = 'surface';
const IN_THE_WORLD = 'world';
const OBJECTS_HOLDER = 'objects';
// The place none stands at among what stands in the world
const NOWHERE_LAID = -1;
// The token of how far past its box anything an object shows draws (`tokens.css`)
const REACH_PAST_THE_BOX = '--reach-past-the-box';
// A surface of markup in the world drawn with smaller copies of itself, as it shrinks into the distance as the window
// does
const SHRINKS = true;
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
// The step the world's reach past the frame is rounded up to, in the drawing's pixels. three makes a layer anew as its
// size changes, and the world's layer, the see-through layer and the lens's own are sized to the box the world is drawn
// over, which grew a little each frame as the eye's focus opened: the room drew a frame of 3840 × 2160, the page fading
// as the focus opens, in 366 ms by its steps' clock, and with the reach to a step of 256 in 278 ms, of 128 in 261, of
// 64 in 261 (2026-11-11). A step wider draws the world over more pixels than the blur reads; one narrower makes the
// layers anew more often as the blur grows
const REACH_STEP = 128;
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
// Half of a box's width or height, which its middle stands at
const HALF = 0.5;
// The entries a flat matrix leaves out, as the identity has them: none of one axis carried into another, and out and
// the fourth value each kept its own
const CARRIES_NONE = 0;
const KEEPS_ITS_OWN = 1;
const STAYS_ON_ITS_PLANE = {
	m13: CARRIES_NONE,
	m14: CARRIES_NONE,
	m23: CARRIES_NONE,
	m24: CARRIES_NONE,
	m31: CARRIES_NONE,
	m32: CARRIES_NONE,
	m33: KEEPS_ITS_OWN,
	m34: CARRIES_NONE,
	m43: CARRIES_NONE,
	m44: KEEPS_ITS_OWN
};
// A point of the frame as a matrix carries it, its fourth value its own; and a square on the plane a matrix carries,
// out of it by none, its depth unscaled
const ITS_OWN_FOURTH_VALUE = 1;
const ON_ITS_PLANE = 0;
const UNSCALED = 1;
// A page shown whole, which nothing is seen through
const WHOLLY_SHOWN = 1;
// A blur of none, which the eye's focus draws sharp; a box of no size; and a list of which nothing stands
const SHARP = 0;
const NO_SIZE = 0;
const NONE_STANDING = 0;
// What the world and what stands on the frame are drawn into: their light linear, premultiplied, in half floats, which
// keep it past white; each pixel sampled at four points, so their edges are smoothed as the browser smooths the
// page's; the world's depth kept for the lens
const SAMPLES_A_PIXEL = 4;
const THREES_LAYER = { type: HalfFloatType, samples: SAMPLES_A_PIXEL, depthBuffer: true };
// What an exposure and the frame are drawn into and laid from: in half floats, which keep light past white
const PAST_WHITE = { depthBuffer: false, type: HalfFloatType };
// The glow round light past the page's white drawn by three's bloom in no time of its own, and over all the frame,
// which no stencil masks; its strength, spread and threshold none until a frame's world sets them
const NO_TIME_PASSING = 0;
const UNMASKED = false;
const SET_BY_EACH_FRAME = 0;
// What the card is made to finish its work by: one pixel read back, of a target nothing is drawn into, its four bytes,
// from its corner
const ONE_PIXEL = 1;
const BYTES_A_PIXEL = 4;
const ITS_CORNER = 0;
// A film that names no things module builds no things
/** @type {ThingsLoaded} */
const NO_THINGS = { kind: 'built', names: [] };
// The page's surface drawn nearer than what lies on its plane, the body's rim under its edge and the slab's back under
// a page on the window's back, by depth's offset, in three's polygon offset steps; and a surface of markup standing in
// the world nearer still, as such an object stands over the window it shares a plane with
const PAGE_NEARER = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 };
const MARKUP_NEARER = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
// A share of a surface so clear none of it is drawn there, nor its depth, the clear past the page's rounded corners and
// round what markup draws: under a level of the browser's eight bits
const EIGHT_BIT_LEVELS = 255;
const DRAWN_AT_LEAST = 1 / EIGHT_BIT_LEVELS;
// The page's surface laid in the world over what it hides, by how clear it is, its colours premultiplied, its depth
// written where it is drawn
const PAGE_LAID = {
	blending: CustomBlending,
	blendSrc: OneFactor,
	blendDst: OneMinusSrcAlphaFactor,
	blendSrcAlpha: OneFactor,
	blendDstAlpha: OneMinusSrcAlphaFactor,
	transparent: true,
	depthWrite: true,
	...PAGE_NEARER
};
// The page seen through laid so too, but writing no depth, as nothing seen through does; and its depth alone
const PAGE_SEEN_THROUGH = { ...PAGE_LAID, depthWrite: false };
const PAGE_DEPTH_ALONE = { blending: NoBlending, colorWrite: false, depthWrite: true, ...PAGE_NEARER };
// A surface of markup standing in the world laid as the page seen through is, and its depth alone, each cut at a
// fading page's plane as a thing seen through is (`see-through.js`)
const MARKUP_SEEN_THROUGH = { ...PAGE_SEEN_THROUGH, ...MARKUP_NEARER, clipping: true };
const MARKUP_DEPTH_ALONE = { ...PAGE_DEPTH_ALONE, ...MARKUP_NEARER, clipping: true };

// A surface drawn from markup in the world, the page's or an object's: its texture where the plane's share of it falls,
// the texture's rows from its top, read back from the screen's colours into linear light, premultiplied by how clear it
// is; none drawn, nor its depth, where it is clear; cut by three's clipping planes where its material asks
const SURFACE_IN_THE_WORLD_VERTEX = `
#include <clipping_planes_pars_vertex>
varying vec2 shareOfTheSurface;
void main() {
	shareOfTheSurface = vec2(uv.x, 1.0 - uv.y);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	// Where three's clipping planes cut it, which reads the point in the eye's space as mvPosition
	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	#include <clipping_planes_vertex>
}`;
const SURFACE_IN_THE_WORLD_FRAGMENT = `
#include <clipping_planes_pars_fragment>
uniform sampler2D surface;
varying vec2 shareOfTheSurface;
${SRGB_CURVES}
void main() {
	#include <clipping_planes_fragment>
	vec4 drawn = texture2D(surface, shareOfTheSurface);
	if (drawn.a < ${DRAWN_AT_LEAST}) discard;
	gl_FragColor = vec4(decoded(drawn.rgb / drawn.a) * drawn.a, drawn.a);
}`;
// A surface laid flat over the whole frame, as it stands, its texture's rows from its top
const FLAT_SURFACE_FRAGMENT = `
uniform sampler2D surface;
varying vec2 shareOfTheFrame;
void main() {
	gl_FragColor = texture2D(surface, vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y));
}`;
// What three draws in linear light, the world through the eye's lens and what stands on the frame, laid over the
// exposure in the screen's colours
const LINEAR_LAID_FRAGMENT = `
uniform sampler2D drawn;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	gl_FragColor = inTheScreensColours(texture2D(drawn, shareOfTheFrame));
}`;
// An exposure, drawn in the screen's colours, added into the frame at its weight as linear light, as the canvas shows
// it, opaque, what is clear in it over nothing
const WEIGHED_FRAGMENT = `
uniform sampler2D drawn;
uniform float weight;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	gl_FragColor = vec4(decoded(texture2D(drawn, shareOfTheFrame).rgb) * weight, weight);
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

/**
 * A surface an object of markup standing in the world is laid in: its element, a child of the room's canvas, which the
 * canvas draws into a texture of its own; the holder of the frame's size the stage lays the object in, so it stands
 * where the frame has it; and the object's list and name.
 * @typedef {{ readonly element: HTMLElement, readonly holder: HTMLElement, readonly list: ObjectList, readonly name: string }} WorldSurface
 */

/**
 * The surfaces an exposure's markup standing in the world is laid in, one for each object, made as the stage first lays
 * an object in one and let go once a frame lays nothing in it.
 */
class WorldSurfaces {
	/** @param {PaintingCanvas} canvas */
	constructor(canvas) {
		this.canvas = canvas;
		/** Each surface, by its object's list and name @type {Map<string, WorldSurface>} */
		this.surfaces = new Map();
		/** The surfaces the stage has laid an object in since the frame before @type {Set<WorldSurface>} */
		this.laid = new Set();
	}

	/**
	 * The holder an object of a list and a name is laid in, its surface made the first time.
	 * @param {ObjectList} list @param {string} name
	 */
	holderFor(list, name) {
		const key = `${list} ${name}`;
		const surface = this.surfaces.get(key) ?? worldSurfaceIn(this.canvas, list, name);
		this.surfaces.set(key, surface);
		this.laid.add(surface);
		return surface.holder;
	}

	/** The surfaces the stage laid an object in this frame, the rest let go. @returns {readonly WorldSurface[]} */
	laidThisFrame() {
		const laid = [...this.laid];
		for (const [key, surface] of this.surfaces) {
			if (this.laid.has(surface)) continue;
			surface.element.remove();
			this.surfaces.delete(key);
		}
		this.laid.clear();
		return laid;
	}
}

/** The room: the canvas each exposure's surfaces are laid in, the world's one scene, and what composes a frame. */
class Room {
	/** @param {Layout} layout @param {Things} things @param {WorldLighting} lighting */
	constructor(layout, things, lighting) {
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
		this.renderer.setTransparentSort(this.laidSeenThrough.bind(this));
		/** The frame's size in the drawing's pixels @type {Vector2} */
		this.drawnSize = this.renderer.getDrawingBufferSize(new Vector2());
		const { x: drawnWidth, y: drawnHeight } = this.drawnSize;
		this.exposure = new WebGLRenderTarget(drawnWidth, drawnHeight, PAST_WHITE);
		this.frame = new WebGLRenderTarget(drawnWidth, drawnHeight, PAST_WHITE);
		/** The texture each surface is drawn into, for every exposure in turn @type {ReadonlyMap<SurfaceName, SurfaceTexture>} */
		this.textures = new Map(
			SURFACES.map((name) => [name, new SurfaceTexture(this.renderer, SURFACE_TEXTURES[name].shrinks)])
		);
		this.flatLaying = passOver({ surface: { value: null } }, FLAT_SURFACE_FRAGMENT, LAID_OVER);
		this.weighed = passOver(
			{ drawn: { value: this.exposure.texture }, weight: { value: WHOLE } },
			WEIGHED_FRAGMENT,
			ADDED
		);
		this.shown = new FrameShown(this.frame.texture, this.drawnSize, inTheDrawingsPixels(layout.handedIn));
		// How many of the drawing's pixels a pixel of a frame 1080 high takes, as the engine's blur is measured in them
		this.pixelsOfOne = layout.frameScale * window.devicePixelRatio;
		// three draws nothing without a camera: the passes place their own points; the world's camera takes the
		// projection alone, the engine placing every point in the eye's own space
		this.camera = new Camera();
		this.worldCamera = new Camera();
		this.things = things;
		this.lighting = lighting;
		this.body = new WindowBody();
		this.world = new Scene();
		// The page as it writes depth, where it is drawn whole; and where it is seen through, its light and its depth apart
		this.page = surfaceInTheWorld(PAGE_LAID, 'opaque');
		this.pageSeenThrough = surfaceInTheWorld(PAGE_SEEN_THROUGH, 'pageSeenThrough');
		this.pageDepth = surfaceInTheWorld(PAGE_DEPTH_ALONE, 'surfacesDepth');
		/** The surfaces markup standing in the world is laid in, each exposure's apart @type {WorldSurfaces[]} */
		this.worldSurfaces = this.exposureSurfaces.map(() => new WorldSurfaces(this.canvas));
		/**
		 * Each surface of markup in the world as the world draws it, by its place among an exposure's
		 * @type {MarkupInTheWorld[]}
		 */
		this.markup = [];
		/**
		 * The light of each surface of markup in the world by its place among what stands in the world, in the order the
		 * scene lays it, as the exposure drawn last set it
		 * @type {Map<Object3D, number>}
		 */
		this.laidAt = new Map();
		// How far past its box anything an object shows draws, in the frame's pixels
		this.reachPastTheBox = reachPastTheBox() * layout.frameScale;
		window.stage.layApart((exposure, list, name) =>
			worldSurfacesAt(this.worldSurfaces, exposure).holderFor(list, name)
		);
		this.worldLayer = new WebGLRenderTarget(drawnWidth, drawnHeight, {
			...THREES_LAYER,
			depthTexture: new DepthTexture(drawnWidth, drawnHeight)
		});
		this.seeThrough = new SeeThroughField(THREES_LAYER);
		this.lens = new Lens(this.pixelsOfOne, layout.frameScale);
		// The world as the eye's lens sees it, each field laid over the one before in linear light, as three's one layer
		// lays what is seen through over what stands behind it; then laid over the exposure in the screen's colours once
		this.worldSeen = new WebGLRenderTarget(drawnWidth, drawnHeight, PAST_WHITE);
		this.worldLaying = passOver({ drawn: { value: this.worldSeen.texture } }, LINEAR_LAID_FRAGMENT, LAID_OVER);
		this.onTheFrame = new Scene();
		this.onTheFrameLayer = new WebGLRenderTarget(drawnWidth, drawnHeight, THREES_LAYER);
		this.onTheFrameLaying = passOver(
			{ drawn: { value: this.onTheFrameLayer.texture } },
			LINEAR_LAID_FRAGMENT,
			LAID_OVER
		);
		// The glow measured on a frame 1080 high, as the reference promo measured it on one so high, so it spreads over the
		// same share of any frame drawn at any density, three's bloom gathering it from copies halved from that size; its
		// strength, spread and threshold set as each frame's world has them
		const frame = layout.format.frame;
		const measuredOn = new Vector2(frame.width / layout.frameScale, frame.height / layout.frameScale);
		this.bloom = new UnrealBloomPass(measuredOn, SET_BY_EACH_FRAME, SET_BY_EACH_FRAME, SET_BY_EACH_FRAME);
		// A pixel read back waits for the card to finish all it was asked, as Chrome's WebGL `finish` does not
		this.finishing = new WebGLRenderTarget(ONE_PIXEL, ONE_PIXEL);
		this.renderer.initRenderTarget(this.finishing);
		this.readBack = new Uint8Array(BYTES_A_PIXEL);
	}

	/** Once the graphics card has done all the room asked of it. */
	finished() {
		this.renderer.readRenderTargetPixels(this.finishing, ITS_CORNER, ITS_CORNER, ONE_PIXEL, ONE_PIXEL, this.readBack);
	}

	/**
	 * One frame composed from its exposures: the window's surface of each laid out as far as its scene reaches, and as
	 * far past the frame as the lens's blur of any of them gathers, and a surface over each object of markup standing in
	 * the world where the stage laid it; the surfaces of those it has painted, each exposure drawn and added into the
	 * frame at an equal weight; the frame glowing round its light past white where the world asks, and shown on the
	 * canvas once the card has drawn it. What the film is told where its things module throws building or setting a
	 * thing, none where the frame is drawn.
	 * @param {readonly DrawnScene[]} scenes @returns {Promise<string | null>}
	 */
	async compose(scenes) {
		const gathered = this.gatheredFor(scenes);
		const pagePlacings = scenes.map((scene) => pagePlacingOf(scene, gathered));
		for (const [place, surfaces] of this.exposureSurfaces.entries()) {
			for (const [name, surface] of surfaces) surface.toggleAttribute(HIDDEN, !isPainted(name, place, scenes.length));
		}
		for (const [place, placing] of pagePlacings.entries()) {
			const surface = surfaceOf(surfacesAt(this.exposureSurfaces, place), 'window');
			laidOutAs(surface, placing.box, this.densityOf(placing.box));
		}
		const standings = pagePlacings.map((placing, place) => ({
			placing,
			markup: worldSurfacesAt(this.worldSurfaces, place)
				.laidThisFrame()
				.map((surface) => this.markupLaidOut(surface, scenesAt(scenes, place)))
		}));
		// An exposure the frame has none of lays no markup: its surfaces are let go
		for (const surfaces of this.worldSurfaces.slice(scenes.length)) surfaces.laidThisFrame();
		await paintedOf(this.canvas);
		const first = surfacesAt(this.exposureSurfaces, FIRST);
		for (const name of SURFACES.filter((each) => !SURFACE_TEXTURES[each].eachExposure)) {
			textureOf(this.textures, name).drawnFrom(surfaceOf(first, name));
		}
		for (const layer of [this.worldLayer, this.seeThrough.layer]) sizedTo(layer, gathered);
		this.renderer.setRenderTarget(this.frame);
		this.renderer.clear();
		valuesSet(this.weighed.material, { weight: WHOLE / scenes.length });
		for (const [place, standing] of standings.entries()) {
			const scene = scenesAt(scenes, place);
			const refused = this.exposureDrawn(surfacesAt(this.exposureSurfaces, place), standing, scene, gathered);
			if (refused !== null) return refused;
		}
		const bloom = scenesAt(scenes, FIRST).world.bloom;
		if (bloom !== null) this.bloomed(bloom);
		this.shown.shown(this.renderer);
		return null;
	}

	/**
	 * The frame's light past the page's white glowing round itself, as strong and as wide as the world has it: the
	 * world being the first exposure's, as the look's ground is.
	 * @param {DrawnBloom} bloom
	 */
	bloomed(bloom) {
		this.bloom.strength = bloom.strength;
		this.bloom.radius = bloom.radius;
		this.bloom.threshold = bloom.threshold;
		this.bloom.render(this.renderer, this.frame, this.frame, NO_TIME_PASSING, UNMASKED);
	}

	/**
	 * An exposure drawn and added into the frame: its ground; the world as one scene, through the eye's lens; the film's
	 * things on the frame; the frame's surface. What the film is told where its module throws building or setting a
	 * thing, none where all are drawn.
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {ExposureStanding} standing @param {DrawnScene} scene
	 * @param {Box} gathered @returns {string | null}
	 */
	exposureDrawn(surfaces, standing, scene, gathered) {
		const things = thingsIn(scene);
		const refused = this.thingsPosed(things);
		if (refused !== null) return refused;
		this.lighting.lit(this.renderer, scene.world.lighting);
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.clear();
		this.flatLaid('ground', surfaces);
		const pageTexture = textureOf(this.textures, 'window');
		pageTexture.drawnFrom(surfaceOf(surfaces, 'window'));
		const fields = this.worldDrawn(scene, pageTexture, standing, things.filter(standsInTheWorld), gathered);
		this.renderer.setRenderTarget(this.worldSeen);
		this.renderer.clear();
		for (const field of fields) {
			this.lens.laid(this.renderer, field, gathered, this.frameBox, scene.eye, this.worldSeen);
		}
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.worldLaying, this.camera);
		const onTheFrame = things.filter((thing) => !standsInTheWorld(thing));
		if (onTheFrame.length > NONE_STANDING) this.onTheFrameLaid(onTheFrame, scene);
		this.flatLaid('frame', surfaces);
		this.renderer.setRenderTarget(this.frame);
		this.renderer.render(this.weighed, this.camera);
		return null;
	}

	/**
	 * An exposure's things posed, each in turn; what the film is told where its module throws building or setting one,
	 * none where all stand.
	 * @param {readonly ThingObject[]} things @returns {string | null}
	 */
	thingsPosed(things) {
		for (const thing of things) {
			const refused = this.things.posed(thing);
			if (refused !== null) return refused;
		}
		return null;
	}

	/**
	 * A surface laid flat over what is drawn of an exposure, as the frame stands: drawn anew from its element first
	 * where it is drawn for each exposure.
	 * @param {FlatSurfaceName} name @param {ReadonlyMap<SurfaceName, Element>} surfaces
	 */
	flatLaid(name, surfaces) {
		const texture = textureOf(this.textures, name);
		if (SURFACE_TEXTURES[name].eachExposure) texture.drawnFrom(surfaceOf(surfaces, name));
		valuesSet(this.flatLaying.material, { surface: texture.texture });
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.flatLaying, this.camera);
	}

	/**
	 * The world drawn as one scene, over the box of the frame the lens's blur gathers: the page's surface on the plane
	 * the engine lays it on; the window's body and glass; the film's posed things in the world; and the surface of each
	 * object of markup standing there; seen from the eye, lit as it sees the room. What writes depth is drawn into the
	 * world's layer, and what is seen through, where it has something of the world behind it to show, into a field of its
	 * own over it (`see-through.js`). Markup is seen through, round its letters and in its shadows, so it stands in that
	 * field. A page seen through with nothing of the world but its own body standing round it shows the ground behind it,
	 * which the lens does not blur, and its body's rim under its edge, on its own plane: it is drawn with what writes
	 * depth, so its edge and the rim under it blur as one, where blurred apart they left a light band round a blurred
	 * page, and the lens runs once. The fields the lens lays, the lowest first.
	 * @param {DrawnScene} scene @param {SurfaceTexture} pageTexture @param {ExposureStanding} standing
	 * @param {readonly ThingObject[]} things @param {Box} gathered @returns {readonly SceneField[]}
	 */
	worldDrawn(scene, pageTexture, standing, things, gathered) {
		const window = scene.window;
		seenThrough(this.worldCamera, projectionOnto(gathered, this.frameBox, scene.eye.distance));
		this.world.clear();
		const pageMatrix = surfaceMatrixOf(window.pageSurface.inTheEyesSpace, standing.placing);
		const standsBesideThePage = things.length + standing.markup.length > NONE_STANDING;
		const pageSeenThrough = window.pageShown < WHOLLY_SHOWN && standsBesideThePage;
		const pages = pageSeenThrough ? [this.pageSeenThrough, this.pageDepth] : [this.page];
		for (const page of pages) {
			valuesSet(page.material, { surface: pageTexture.texture });
			placedBy(page, pageMatrix);
			this.world.add(page);
		}
		this.bodyAdded(window, pageSeenThrough);
		const posed = things.map((thing) => this.things.posedAs(thing).placed);
		for (const placed of posed) {
			sortedBySeeingThrough(placed);
			this.world.add(placed);
		}
		const thingsSeenThrough = posed.some(hasAPartSeenThrough);
		for (const [place, markup] of standing.markup.entries()) this.markupAdded(place, markup);
		this.lighting.shiningIn(this.world, scene.eye.roomInTheEyesSpace);
		this.renderer.setRenderTarget(this.worldLayer);
		this.renderer.clear();
		partsDrawn(this.renderer, this.world, this.worldCamera, ['opaque']);
		const opaque = fieldOf(this.worldLayer);
		if (!pageSeenThrough && !thingsSeenThrough && standing.markup.length === NONE_STANDING) return [opaque];
		const seenThroughPage = pageSeenThrough ? pageMatrix : null;
		this.seeThrough.drawn(this.renderer, this.world, this.worldCamera, this.worldLayer, seenThroughPage);
		return [opaque, fieldOf(this.seeThrough.layer)];
	}

	/**
	 * The window's body posed and added to the world, where it has one: its glass in the page's part of the world, as it
	 * lies over the page, seen through or with what writes depth.
	 * @param {DrawnWindow} window @param {boolean} pageSeenThrough
	 */
	bodyAdded(window, pageSeenThrough) {
		if (window.body === null) return;
		const body = this.body.posed(window, window.body);
		const pagesPart = WORLD_PARTS[pageSeenThrough ? 'pageSeenThrough' : 'opaque'];
		body.glass.traverse((part) => part.layers.set(pagesPart));
		this.world.add(body.slab, body.glass);
	}

	/**
	 * An object of markup standing in the world laid out where the stage laid it: its surface over its box and as far
	 * past it as anything it shows draws, as densely as the card holds it.
	 * @param {WorldSurface} surface @param {DrawnScene} scene @returns {MarkupStanding}
	 */
	markupLaidOut(surface, scene) {
		const object = objectNamed(scene[surface.list], surface.name);
		const box = clearRound(grownBy(object.box, this.reachPastTheBox));
		laidOutAs(surface.element, box, this.densityOf(box));
		const laidAt = placeInTheWorld(scene, surface);
		return { object, element: surface.element, placing: { box, middle: middleOf(object.box) }, laidAt };
	}

	/**
	 * An object of markup standing in the world added to the world, by its place among the exposure's: its surface
	 * drawn into a texture of its own and stood where the engine's matrix places the object's box's middle, its light
	 * and its depth apart, as what is seen through is drawn, its light laid at its place in the scene's order.
	 * @param {number} place @param {MarkupStanding} markup
	 */
	markupAdded(place, markup) {
		while (this.markup.length <= place) this.markup.push(markupInTheWorld(this.renderer));
		const inTheWorld = markupAt(this.markup, place);
		inTheWorld.texture.drawnFrom(markup.element);
		const matrix = surfaceMatrixOf(markup.object.inTheEyesSpace, markup.placing);
		for (const surface of [inTheWorld.light, inTheWorld.depth]) {
			valuesSet(surface.material, { surface: inTheWorld.texture.texture });
			placedBy(surface, matrix);
			this.world.add(surface);
		}
		this.laidAt.set(inTheWorld.light, markup.laidAt);
	}

	/**
	 * Two things three draws seen through, laid one over the other: markup standing in the world in the order the scene
	 * lays it, as it writes no depth, where three would lay two on one plane by which middle stands nearer the eye;
	 * anything else as three lays it.
	 * @param {RenderItem} first @param {RenderItem} second
	 */
	laidSeenThrough(first, second) {
		const firstPlace = this.laidAt.get(first.object);
		const secondPlace = this.laidAt.get(second.object);
		if (firstPlace === undefined || secondPlace === undefined) return laidAsThreeLaysThem(first, second);
		return firstPlace - secondPlace;
	}

	/**
	 * The film's things on the frame drawn alone, as the eye at rest sees them, lit as it sees the room, and laid sharp
	 * over what is drawn of the exposure.
	 * @param {readonly ThingObject[]} things @param {DrawnScene} scene
	 */
	onTheFrameLaid(things, scene) {
		this.onTheFrame.clear();
		for (const thing of things) this.onTheFrame.add(this.things.posedAs(thing).placed);
		this.lighting.shiningIn(this.onTheFrame, scene.eye.roomInTheRestingEyesSpace);
		seenThrough(this.worldCamera, projectionOnto(this.frameBox, this.frameBox, scene.eye.distance));
		// What stands on the frame is drawn whole, seen through or not, as nothing of the world stands behind it there
		this.worldCamera.layers.enableAll();
		this.renderer.setRenderTarget(this.onTheFrameLayer);
		this.renderer.clear();
		this.renderer.render(this.onTheFrame, this.worldCamera);
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.onTheFrameLaying, this.camera);
	}

	/**
	 * The box of the frame the world is drawn into for a frame's exposures: as far past each edge of the frame as the
	 * lens's blur gathers there, from the softest point the frame shows of its window or of an object in it, rounded up
	 * to a step of the drawing's pixels, and no farther than the graphics card's largest texture leaves room for, past
	 * which a blur by the frame's edge gathers nothing; the frame itself where the eye's focus blurs none.
	 * @param {readonly DrawnScene[]} scenes @returns {Box}
	 */
	gatheredFor(scenes) {
		const softest = Math.max(
			SHARP,
			...scenes.map((scene) => scene.window.softestOutOfFocus ?? SHARP),
			...scenes.flatMap(objectsIn).map((object) => object.softestOutOfFocus ?? SHARP)
		);
		if (softest === SHARP) return this.frameBox;
		const roomLeft = (this.renderer.capabilities.maxTextureSize - Math.max(this.drawnSize.x, this.drawnSize.y)) * HALF;
		const gathers = Math.ceil((SPREADS_REACHED * softest * this.pixelsOfOne) / REACH_STEP) * REACH_STEP;
		const reach = Math.min(gathers, Math.floor(roomLeft));
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
 * Where a surface drawn from markup stands on its plane, the page's on the window's or an object's on its own: its box
 * there, in the frame's pixels, and the middle of the box the engine's matrix carries into the eye's own space, the
 * window's view's or the object's.
 * @typedef {{ readonly box: Box, readonly middle: Vector2 }} SurfacePlacing
 */
/**
 * An object of markup standing in the world as the room lays it: the object, the surface's element, where the surface
 * stands on the object's plane, and its place among what stands in the world in the order the scene lays it.
 * @typedef {{
 *   readonly object: DrawnObject,
 *   readonly element: Element,
 *   readonly placing: SurfacePlacing,
 *   readonly laidAt: number
 * }} MarkupStanding
 */
/**
 * What stands in an exposure's world drawn from markup: the page's surface, and each object's.
 * @typedef {{ readonly placing: SurfacePlacing, readonly markup: readonly MarkupStanding[] }} ExposureStanding
 */
/**
 * A surface of markup standing in the world as the world draws it: its texture, its light and its depth.
 * @typedef {{
 *   readonly texture: SurfaceTexture,
 *   readonly light: Mesh<PlaneGeometry, ShaderMaterial>,
 *   readonly depth: Mesh<PlaneGeometry, ShaderMaterial>
 * }} MarkupInTheWorld
 */

/**
 * Where the page's surface of an exposure stands: over as much of the plane the page lies on as the box the world is
 * drawn over shows of what stands there, as far as the camera's picture reaches, where the eye may see it leant or from
 * aside, and a little clear round it, so the plane's edge falls inside its texture and is filtered as the browser
 * smooths an edge, not cut stepped by its triangles.
 * @param {DrawnScene} scene @param {Box} gathered @returns {SurfacePlacing}
 */
function pagePlacingOf(scene, gathered) {
	const entries = entriesOf(scene.window.pageSurface.transform);
	const middle = middleOf(scene.window.box);
	const standing = boxAround(gathered, scene.window.reach);
	return { box: clearRound(seenOf(standing, entries, middle, gathered)), middle };
}

/** Where a box's middle stands. @param {Box} box */
function middleOf(box) {
	return new Vector2(box.left + box.width * HALF, box.top + box.height * HALF);
}

/**
 * The matrix that carries a square of one side about its middle onto a surface in the eye's own space: the box it is
 * drawn over, on the plane the engine's matrix carries from the middle it names into that space.
 * @param {Matrix} inTheEyesSpace @param {SurfacePlacing} placing
 */
function surfaceMatrixOf(inTheEyesSpace, placing) {
	const box = placing.box;
	const fromTheMiddle = new Vector3(
		box.left + box.width * HALF - placing.middle.x,
		placing.middle.y - (box.top + box.height * HALF),
		ON_ITS_PLANE
	);
	return matrixOf(inTheEyesSpace)
		.multiply(new Matrix4().makeTranslation(fromTheMiddle))
		.multiply(new Matrix4().makeScale(box.width, box.height, UNSCALED));
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
		new Vector3(corner.x - middle.x, corner.y - middle.y, ITS_OWN_FOURTH_VALUE).applyMatrix3(seenBack)
	);
	if (corners.some((corner) => corner.z <= BEHIND_THE_EYE)) return standing;
	const onThePlane = corners.map(
		(corner) => new Vector2(corner.x / corner.z + middle.x, corner.y / corner.z + middle.y)
	);
	const seen = boxWithin(boxOfPoints(onThePlane), standing);
	return seen.width > NO_SIZE && seen.height > NO_SIZE ? seen : standing;
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
 * A layer sized to hold a box of the frame in the drawing's pixels, the box's own whole number of them: three makes it
 * anew only where that size is not the one it has.
 * @param {WebGLRenderTarget} layer @param {Box} box
 */
function sizedTo(layer, box) {
	layer.setSize(Math.round(box.width * window.devicePixelRatio), Math.round(box.height * window.devicePixelRatio));
}

/** A box of the frame in the drawing's pixels. @param {Box} box @returns {Box} */
function inTheDrawingsPixels(box) {
	const density = window.devicePixelRatio;
	return { left: box.left * density, top: box.top * density, width: box.width * density, height: box.height * density };
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
 * A surface drawn from markup as the world draws it, the page's or an object's: a square the room places, drawn
 * whichever side faces the eye, as a window turned half round shows the page mirrored, laid as named, drawn nearer than
 * what shares its plane, in a part of the world.
 * @param {typeof PAGE_LAID | typeof PAGE_SEEN_THROUGH | typeof PAGE_DEPTH_ALONE | typeof MARKUP_SEEN_THROUGH | typeof MARKUP_DEPTH_ALONE} laid
 * @param {WorldPart} part
 */
function surfaceInTheWorld(laid, part) {
	const material = new ShaderMaterial({
		uniforms: { surface: { value: null } },
		vertexShader: SURFACE_IN_THE_WORLD_VERTEX,
		fragmentShader: SURFACE_IN_THE_WORLD_FRAGMENT,
		side: DoubleSide,
		...laid
	});
	const surface = new Mesh(new PlaneGeometry(), material);
	surface.matrixAutoUpdate = false;
	surface.frustumCulled = false;
	surface.layers.set(WORLD_PARTS[part]);
	return surface;
}

/** A mesh placed by a matrix of the room's alone. @param {Mesh} mesh @param {Matrix4} matrix */
function placedBy(mesh, matrix) {
	mesh.matrix.copy(matrix);
	mesh.matrixWorldNeedsUpdate = true;
}

/** three's camera seeing through a projection the room hands it, and nothing else. @param {Camera} camera @param {Matrix4} projection */
function seenThrough(camera, projection) {
	camera.projectionMatrix.copy(projection);
	camera.projectionMatrixInverse.copy(projection).invert();
}

/** A layer of the world as the lens reads it: its light, and its depth. @param {WebGLRenderTarget} layer @returns {SceneField} */
function fieldOf(layer) {
	if (layer.depthTexture === null) throw new Error("the room's world keeps no depth");
	return { light: layer.texture, depth: layer.depthTexture, width: layer.width, height: layer.height };
}

/** The objects a scene draws, those standing and those pushed off. @param {DrawnScene} scene */
function objectsIn(scene) {
	return [...scene.objects, ...scene.leaving];
}

/** The things among the objects a scene draws. @param {DrawnScene} scene */
function thingsIn(scene) {
	return objectsIn(scene).filter(isAThing);
}

/**
 * The object of a name in a list a scene draws: the stage laid it in its surface as it drew the scene, so one missing is
 * the room's fault.
 * @param {readonly DrawnObject[]} objects @param {string} name
 */
function objectNamed(objects, name) {
	const object = objects.find((each) => each.name === name);
	if (object === undefined) throw new Error(`the room lays ${name} in the world, which its scene does not draw`);
	return object;
}

/**
 * A surface an object of markup standing in the world is laid in, laid in the canvas: a surface of the stage's, marked
 * as standing in the world, holding a holder of objects.
 * @param {PaintingCanvas} canvas @param {ObjectList} list @param {string} name @returns {WorldSurface}
 */
function worldSurfaceIn(canvas, list, name) {
	const element = document.createElement('div');
	element.classList.add(SURFACE_CLASS);
	element.setAttribute(SURFACE, IN_THE_WORLD);
	const holder = document.createElement('div');
	holder.classList.add(OBJECTS_HOLDER);
	element.append(holder);
	canvas.append(element);
	return { element, holder, list, name };
}

/**
 * The place of an object of markup standing in the world among all that stands there, in the order the scene lays it:
 * the stage laid it in its surface as it drew the scene, so one missing is the room's fault.
 * @param {DrawnScene} scene @param {WorldSurface} surface
 */
function placeInTheWorld(scene, surface) {
	const place = scene.laidInTheWorld.findIndex((laid) => laid.list === surface.list && laid.name === surface.name);
	if (place === NOWHERE_LAID) throw new Error(`the room lays ${surface.name} in the world, where the scene lays none`);
	return place;
}

/**
 * Two things three draws seen through as three lays them one over the other: by their order, then the farther first.
 * @param {RenderItem} first @param {RenderItem} second
 */
function laidAsThreeLaysThem(first, second) {
	return (
		first.groupOrder - second.groupOrder ||
		first.renderOrder - second.renderOrder ||
		second.z - first.z ||
		first.id - second.id
	);
}

/**
 * A surface of markup standing in the world as the world draws it: its texture, filtered as it shrinks into the
 * distance; its light, seen through, and its depth, where it is drawn.
 * @param {WebGLRenderer} renderer @returns {MarkupInTheWorld}
 */
function markupInTheWorld(renderer) {
	return {
		texture: new SurfaceTexture(renderer, SHRINKS),
		light: surfaceInTheWorld(MARKUP_SEEN_THROUGH, 'surfacesSeenThrough'),
		depth: surfaceInTheWorld(MARKUP_DEPTH_ALONE, 'surfacesDepth')
	};
}

/**
 * How far past its box anything an object shows draws at most, in pixels of a frame 1080 high: the stylesheet's token,
 * registered as a length so the browser works it out to pixels.
 */
function reachPastTheBox() {
	return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(REACH_PAST_THE_BOX));
}

/** @param {readonly MarkupInTheWorld[]} markup @param {number} place */
function markupAt(markup, place) {
	const inTheWorld = markup[place];
	if (inTheWorld === undefined) throw new Error(`the room has drawn no surface ${place + 1} of markup in the world`);
	return inTheWorld;
}

/** @param {readonly WorldSurfaces[]} exposures @param {number} place */
function worldSurfacesAt(exposures, place) {
	const surfaces = exposures[place];
	if (surfaces === undefined) throw new Error(`the room has no exposure ${place + 1} to lay markup in`);
	return surfaces;
}

/** Whether a thing stands in the world, where the eye sees it, not on the frame. @param {ThingObject} thing */
function standsInTheWorld(thing) {
	return thing.rides === 'world';
}

/** @param {readonly DrawnScene[]} scenes @param {number} place */
function scenesAt(scenes, place) {
	const scene = scenes[place];
	if (scene === undefined) throw new Error(`the room has no exposure ${place + 1}: the frame has ${scenes.length}`);
	return scene;
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
	const lighting = new WorldLighting();
	const things = new Things();
	const loaded = address === null ? NO_THINGS : await things.loaded(address);
	laidOut = new Room(layout, things, lighting);
	return loaded;
}

/** @type {RoomApi} */
const ROOM_API = {
	setup: roomLaidOut,
	compose: (scenes) => {
		if (laidOut === null) throw new Error('the room composes a frame before it is laid out');
		return laidOut.compose(scenes);
	},
	finish: () => {
		if (laidOut === null) throw new Error('the room is waited on to draw before it is laid out');
		laidOut.finished();
	}
};
window.room = ROOM_API;
