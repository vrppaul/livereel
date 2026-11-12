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
 * frame's, drawn face-on into a texture as many times as densely as the eye magnifies it (`DrawnObject.magnified`), so
 * brought near it is as sharp as the page beside it; one that would ask more than the world's own layer holds, part by
 * part by how far the eye sees each part from, each only as far as the frame shows it, each painted and drawn into a
 * texture of its own in turn, as one element is laid out at one density at a time; and stood where the engine's matrix
 * places its box, a piece's body standing with it (`stage/piece-body.js`); all seen in perspective from the eye and lit
 * as it sees the room (`stage/lighting.js`), hiding one another by depth alone; but what stands before all the rest
 * while the eye's focus blurs it near, a world of its own drawn apart and laid over the rest (`worldBuilt`). The eye's
 * lens blurs each pixel of the world by how far what it shows stands from the focus, or, where the window's shade blurs
 * the whole window, as wide as the shade blurs the window there where that is wider (`stage/lens.js`, `WindowBlurred`
 * in `stage/body.js`); its fields are laid over one another each by its law (`stage/laying.js`) and the whole over the
 * ground; over that the cursor, on the page's plane where the eye sees it but over whatever stands nearer, unblurred,
 * as the reference promo drew its pointer over its world past its lens (`pointer.js` of the film): laid in the world, a
 * piece lifted off the page and its shadow lay over it, grey and soft (beats 5–6's draft at 4.4 s, 2026-11-11); then
 * the film's things on the frame, sharp, then the frame's surface.
 *
 * The window's surface is drawn from a picture of it as sharp as the browser draws a page face-on, and filtered as it
 * shrinks into the distance: the browser draws a layer leant in 3D at about one of its pixels a page's pixel, however
 * close the eye comes, so text near the eye of a window leant back came out soft (SSIM 0.79–0.85 at 4–9×, probed
 * 2026-11-02). It reaches as far past the frame as the camera's picture does on its plane, as the eye may see the plane
 * past the frame's edge, and is drawn less densely where its texture would pass the graphics card's largest. It holds
 * the screen's own markup over the page; what lies over the page in the window, a callout, pins, an object in it,
 * stands in a surface of its own laid out alike; the page's surface lays the screen's ground and the page's picture
 * under the one, as dense as the picture was taken, and the other over all (`stage/page-picture.js`). The cursor stands
 * in a third surface laid out alike, which the room lays over the world. The world is drawn as far past the frame as
 * the lens's blur gathers at its edges, to a step, so the layers it is drawn into keep their size while the blur
 * gathers alike, and a little farther, so each side of them halves evenly down to the coarsest copy the lens reads.
 *
 * The exposures are added up in linear light, as a shutter gathers the light of each moment: a glint that moves draws a
 * streak as bright as its light, where averaged in the screen's colours it went dark. Where the world asks, the frame
 * glows round its light past the page's white, as a lens blooms, once over the light its exposures gathered: three's
 * own bloom (`UnrealBloomPass`), the reference promo's, its spread a share of a frame 1080 high however large the frame
 * is drawn; the glow lies over all the frame, what stands on it too. One texture of each surface serves every exposure,
 * uploaded anew for each in turn, so the card holds one each, not one each for each exposure: sixteen exposures of a
 * 3840 × 2160 frame would hold 2 GB. A texture last drawn from a surface the canvas has not painted anew since, as it
 * names what it paints anew, is kept as it stands: a frame of one exposure whose window stands still draws the window's
 * texture no more.
 *
 * three.js keeps no camera of its own: every point is placed by the matrices the engine hands the stage, and the
 * world's camera takes the projection alone. The script is a module, three's being modules alone, which the page loads
 * only where the film is drawn as a room (`src/adapters/browser/room.ts`); it answers under `window.room`.
 */
import {
	Box3,
	Camera,
	DepthTexture,
	DoubleSide,
	ExternalTexture,
	HalfFloatType,
	Matrix3,
	Matrix4,
	Mesh,
	NoBlending,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	Vector2,
	Vector3,
	Vector4,
	WebGLRenderTarget,
	WebGLRenderer
} from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { WindowBlurred, WindowBody } from './body.js';
import { Lens, SPREADS_REACHED, sceneFieldOf, sideHalvedEvenly } from './lens.js';
import { WorldLighting } from './lighting.js';
import { matrixOf, placedBy, projectionOnto } from './matrices.js';
import { PAGE_SURFACE_FRAGMENT, PagePicture, compiledForThePits, pageSurfaceValues } from './page-picture.js';
import { PagePits, PieceBodies, pitsSunkIn } from './piece-body.js';
import { ADDED, LAID_OVER, PREMULTIPLIED, SRGB_CURVES, passOver, valuesSet } from './passes.js';
import { FrameShown } from './shown.js';
import { WorldSeen } from './laying.js';
import {
	BESIDE_THE_PAGE,
	SeeThroughLayer,
	WORLD_PARTS,
	partsDrawn,
	seenThroughFieldsOf,
	seenThroughIn,
	sortedBySeeingThrough
} from './see-through.js';
import { Things, isAThing } from './things.js';
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { MagnifiedPart } from '../src/domain/matrix.ts' */
/** @import { DrawnWindow } from '../src/props/window.ts' */
/** @import { DrawnBloom } from '../src/props/lighting.ts' */
/** @import { ThingObject } from './things.js' */
/** @import { BesideThePage, SeenThroughField, WorldPart } from './see-through.js' */
/** @import { SceneField } from './lens.js' */
/** @import { Laying } from './laying.js' */
/** @import { BehindThePage, PageLaid } from './page-picture.js' */
/** @import { SunkPit } from './piece-body.js' */
/** @import { Size } from '../src/domain/geometry.ts' */
/** @import { Texture } from 'three' */
/** @import { DrawnEye } from '../src/domain/eye.ts' */
/** @import { Transform } from '../src/domain/stance.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Layout, StageApi, SurfaceApart } from '../src/adapters/browser/stage.ts' */
/** @import { Object3D, RenderItem } from 'three' */
/** @import { Composed, RoomApi, ThingsLoaded } from '../src/adapters/browser/room.ts' */

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
/**
 * What such a canvas fires once it has painted: it names the children it painted anew, whose rendering changed.
 * @typedef {Event & { readonly changedElements: readonly Element[] }} CanvasPaintEvent
 */
/**
 * The surfaces of an exposure, one over the other in the order named: what lies over the page in the window, and the
 * cursor over the world, stand apart where a frame is drawn as a room
 * @typedef {'ground' | 'window' | 'over-the-page' | 'over-the-world' | 'frame'} SurfaceName
 */
/** The surfaces laid flat over the frame, as it stands @typedef {'ground' | 'frame'} FlatSurfaceName */

// The surfaces of an exposure, the lowest first, and the attribute each is marked with in the stage's markup
/** @type {readonly SurfaceName[]} */
const SURFACES = ['ground', 'window', 'over-the-page', 'over-the-world', 'frame'];
const SURFACE = 'data-surface';
// The stage's picture of the page in the window's surface, which the room lays under it itself (`page-picture.js`)
const PICTURE = '[data-part="picture"]';
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
// layers anew more often as the blur grows. It is for speed alone: the blur's light is the same at any step, the
// layers' sides halving evenly to the copies the lens reads (`sideHalvedEvenly`)
const REACH_STEP = 128;
// A plane the eye sees edge-on, carried onto a line; and the fourth value of a point of the frame seen back onto the
// plane where it sees no point of it before the eye
const EDGE_ON = 0;
const BEHIND_THE_EYE = 0;
// The window's surfaces drawn as densely as the page's device scale draws them, however near the eye sees the window;
// and the pixel the browser may round a texture's side up by
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
// the look being the first exposure's (`apply` in `stage.js`); with smaller copies of itself where the room shrinks
// it, as it shrinks the window, what lies over its page and the cursor alone, which are laid out over the page's
// plane; and in what scene it holds anything to draw: what lies over the page only where the scene says anything does,
// the cursor's surface only where the scene has a cursor
/**
 * @type {{ readonly [Name in SurfaceName]: {
 *   readonly eachExposure: boolean,
 *   readonly shrinks: boolean,
 *   readonly onThePage: boolean,
 *   readonly holdsAnything: (scene: DrawnScene) => boolean
 * } }}
 */
const SURFACE_TEXTURES = {
	ground: { eachExposure: false, shrinks: false, onThePage: false, holdsAnything: () => true },
	window: { eachExposure: true, shrinks: true, onThePage: true, holdsAnything: () => true },
	'over-the-page': { eachExposure: true, shrinks: true, onThePage: true, holdsAnything: (scene) => scene.overThePage },
	'over-the-world': {
		eachExposure: true,
		shrinks: true,
		onThePage: true,
		holdsAnything: (scene) => scene.cursor !== null
	},
	frame: { eachExposure: true, shrinks: false, onThePage: false, holdsAnything: () => true }
};
// The surfaces laid out over the page's plane, the window's, what lies over its page and the cursor's
const ON_THE_PAGE = SURFACES.filter((name) => SURFACE_TEXTURES[name].onThePage);
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
// A surface of markup in the world is drawn part by part as far as the eye sees each from: the nearest part reaching
// from the eye, and its texture drawn with the frame's paint; each after it at its place among them, the one after the
// one before
const FROM_THE_EYE = 0;
const NEAREST = 0;
const ONE_MORE = 1;
// A frame the room drew, and one it could not, as the card dropped its canvas
/** @type {Composed} */
const DRAWN = { kind: 'drawn' };
/** @type {Composed} */
const LOST = { kind: 'lost' };
// An edge of a box of the frame as a cut through the eye, keeping what stands inward of it, toward the box's middle,
// and outward on the far side: none of a point carried across or down, all of how far it is seen from, as named; a
// cut through the eye stands no distance from it; and a point on the edge is kept
const INWARD = 1;
const OUTWARD = -1;
const NONE_OF_IT = 0;
const ALL_OF_IT = 1;
const THROUGH_THE_EYE = 0;
const ON_THE_EDGE = 0;
// A blur of none, which the eye's focus draws sharp; a box of no size; and a list of which nothing stands
const SHARP = 0;
const NO_SIZE = 0;
const NONE_STANDING = 0;
// A field of the world no pixel of which spreads of its own, but by the eye's lens
const NO_SPREADS_OF_THEIR_OWN = null;
// What writes depth is laid as a film's light is, in linear light; and markup standing in the world is seen through
// beside the page whole, round its letters and in its shadows
/** @type {Laying} */
const WHAT_WRITES_DEPTH_LAID = 'linearly';
/** @type {readonly BesideThePage[]} */
const MARKUP_BESIDE_THE_PAGE = ['surfacesSeenThrough'];
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
	...PREMULTIPLIED,
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

// A surface drawn from markup, the page's, an object's or the cursor's: placed where the plane's share of it falls, the
// texture's rows from its top; cut by three's clipping planes where its material asks
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
// The cursor's surface: its texture as the browser drew it, in the screen's colours, premultiplied by how clear it is,
// so three lays it over the world laid as the browser lays it; none drawn where it is clear. The page's lays the
// window's surface over the page's picture (`page-picture.js`)
const CURSORS_SURFACE_FRAGMENT = `
uniform sampler2D surface;
varying vec2 shareOfTheSurface;
void main() {
	vec4 drawn = texture2D(surface, shareOfTheSurface);
	if (drawn.a < ${DRAWN_AT_LEAST}) discard;
	gl_FragColor = drawn;
}`;
// A part of an object's surface: its texture drawn as the cursor's, laid over what its field holds (`see-through.js`),
// none drawn, nor its depth, where it is clear; cut where its material asks; and drawn only where the eye sees the
// surface from farther than the part before it reaches and no farther than it reaches itself, so no pixel of the
// surface is laid by two parts. How far the eye sees a point of the plane from goes evenly across it: so much for its
// share across the surface, so much for its share down, so much at its top left corner
const MARKUP_PART_FRAGMENT = `
#include <clipping_planes_pars_fragment>
uniform sampler2D surface;
uniform vec3 seenFromAlong;
uniform vec2 seenFromWithin;
varying vec2 shareOfTheSurface;
void main() {
	#include <clipping_planes_fragment>
	float seenFrom = dot(vec3(shareOfTheSurface, 1.0), seenFromAlong);
	if (seenFrom <= seenFromWithin.x || seenFrom > seenFromWithin.y) discard;
	vec4 drawn = texture2D(surface, shareOfTheSurface);
	if (drawn.a < ${DRAWN_AT_LEAST}) discard;
	gl_FragColor = drawn;
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
		/** The element it was last drawn from, none before the first @type {Element | null} */
		this.drawnOf = null;
	}

	/**
	 * The element as the canvas last painted it, at the page's device scale, premultiplied by its clearness as the
	 * browser lays layers over one another, and its smaller copies made anew where the room shrinks it: three's texture
	 * of it. Kept as it stands where it was last drawn from this element and the canvas, as it says, has not painted the
	 * element anew since: the texture holds what it shows.
	 * @param {Element} element @param {ReadonlySet<Element>} repainted what the canvas painted anew as it last painted
	 */
	drawnFrom(element, repainted) {
		if (this.drawnOf === element && !repainted.has(element)) return this.texture;
		this.drawnOf = element;
		const context = this.context;
		this.renderer.state.bindTexture(context.TEXTURE_2D, this.source);
		context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
		context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		context.texElementImage2D(context.TEXTURE_2D, context.RGBA8, element);
		if (this.shrinks) context.generateMipmap(context.TEXTURE_2D);
		return this.texture;
	}
}

/**
 * The room: the canvas each exposure's surfaces are laid in, the stage's and those it lays markup standing in the world
 * in apart, the world's one scene, and what composes a frame.
 */
class Room {
	/** @param {Layout} layout @param {Things} things @param {WorldLighting} lighting @param {StageApi} stage */
	constructor(layout, things, lighting, stage) {
		/** The frame's box, in its own pixels @type {Box} */
		this.frameBox = { left: NOWHERE, top: NOWHERE, ...layout.format.frame };
		this.canvas = roomCanvas();
		/**
		 * Each exposure's surfaces, by name, in the order the stage's exposures stand
		 * @type {ReadonlyMap<SurfaceName, Element>[]}
		 */
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
		/**
		 * The texture each surface is drawn into, for every exposure in turn
		 * @type {ReadonlyMap<SurfaceName, SurfaceTexture>}
		 */
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
		// The world, but what stands before all the rest while the eye's focus blurs it near, which is a world of its own,
		// drawn and blurred apart and laid over it
		this.world = new Scene();
		this.beforeTheRest = new Scene();
		// The page as it writes depth, where it is drawn whole; and where it is seen through, its light and its depth apart
		this.page = surfaceInTheWorld(PAGE_LAID, 'opaque', PAGE_SURFACE_FRAGMENT, pageSurfaceValues());
		this.pageSeenThrough = surfaceInTheWorld(
			PAGE_SEEN_THROUGH,
			'pageSeenThrough',
			PAGE_SURFACE_FRAGMENT,
			pageSurfaceValues()
		);
		this.pageDepth = surfaceInTheWorld(PAGE_DEPTH_ALONE, 'pageDepth', PAGE_SURFACE_FRAGMENT, pageSurfaceValues());
		this.pageSurfaces = [this.page, this.pageSeenThrough, this.pageDepth];
		// The cursor's surface, on the page's plane, laid over all the world drawn
		this.cursor = surfaceDrawn(LAID_OVER, CURSORS_SURFACE_FRAGMENT, { surface: { value: null } });
		/** The screen's size, in its pixels @type {Size} */
		this.screen = layout.format.screen;
		this.pagePicture = new PagePicture(
			this.renderer,
			pictureIn(surfaceOf(surfacesAt(this.exposureSurfaces, FIRST), 'window')),
			this.screen
		);
		// The pits sunk into the page under the holes pieces of it leave, which stand with the window
		this.pagePits = new PagePits();
		// The stage, which hands the surfaces it lays markup standing in the world in apart as it draws
		this.stage = stage;
		/** The surfaces the canvas painted anew for the frame composed last @type {ReadonlySet<Element>} */
		this.repainted = new Set();
		/**
		 * Each part of each surface of markup in the world as the world draws it, by the surface's place among an
		 * exposure's, then the part's among the surface's, nearest the eye first
		 * @type {MarkupInTheWorld[][]}
		 */
		this.markup = [];
		/**
		 * The light of each part of a surface of markup in the world by the surface's place among what stands in the
		 * world, in the order the scene lays it, as the exposure drawn last set it
		 * @type {Map<Object3D, number>}
		 */
		this.laidAt = new Map();
		// How far past its box anything an object shows draws, in the frame's pixels
		this.reachPastTheBox = reachPastTheBox() * layout.frameScale;
		// The bodies of the pieces of the page standing in the world, which stand with their surfaces of markup
		this.pieceBodies = new PieceBodies();
		this.worldLayer = new WebGLRenderTarget(drawnWidth, drawnHeight, {
			...THREES_LAYER,
			depthTexture: new DepthTexture(drawnWidth, drawnHeight)
		});
		this.seeThrough = new SeeThroughLayer(THREES_LAYER, PAST_WHITE);
		this.lens = new Lens(this.pixelsOfOne, layout.frameScale, window.devicePixelRatio);
		this.windowBlurred = new WindowBlurred(this.pixelsOfOne, layout.format.screen);
		// The world as the eye's lens sees it, each field laid over the ones before (`laying.js`); then laid over the
		// exposure in the screen's colours once
		this.worldSeen = new WorldSeen(drawnWidth, drawnHeight, PAST_WHITE);
		this.worldLaying = passOver({ drawn: { value: null } }, LINEAR_LAID_FRAGMENT, LAID_OVER);
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
	 * far past the frame as the lens's blur of any of them gathers, and a surface over the nearest part shown of each
	 * object of markup standing in the world where the stage laid it; the surfaces of those it has painted, each exposure
	 * drawn, the farther parts of its markup with it, and added into the frame at an equal weight; the frame glowing
	 * round its light past white where the world asks, and shown on the canvas once the card has drawn it. Refused, with
	 * what the film is told, where its things module throws building or setting a thing; lost where the card has
	 * dropped the canvas, as it was handed the frame or as it drew it. A card out of memory may say so only after the
	 * frame it failed in is composed (the probe of beats 7–8, 2026-11-12), which its capture then refuses (`canvasLost`,
	 * read by `roomCaptured` in `src/adapters/browser/room.ts`).
	 * @param {readonly DrawnScene[]} scenes @returns {Promise<Composed>}
	 */
	async compose(scenes) {
		if (this.canvasLost()) return LOST;
		const gathered = this.gatheredFor(scenes);
		const standings = this.surfacesLaidOut(scenes, gathered);
		this.repainted = await paintedOf(this.canvas);
		const first = surfacesAt(this.exposureSurfaces, FIRST);
		for (const name of SURFACES.filter((each) => !SURFACE_TEXTURES[each].eachExposure)) {
			textureOf(this.textures, name).drawnFrom(surfaceOf(first, name), this.repainted);
		}
		for (const layer of [this.worldLayer, this.seeThrough.layer]) sizedTo(layer, gathered);
		this.renderer.setRenderTarget(this.frame);
		this.renderer.clear();
		valuesSet(this.weighed.material, { weight: WHOLE / scenes.length });
		for (const [place, standing] of standings.entries()) {
			const scene = scenesAt(scenes, place);
			// Each exposure's farther parts are painted in turn, as one element is laid out for one part at a time
			await this.markupDrawn(standing.markup);
			const composed = this.exposureDrawn(surfacesAt(this.exposureSurfaces, place), standing, scene, gathered);
			if (composed !== DRAWN) return composed;
		}
		const bloom = scenesAt(scenes, FIRST).world.bloom;
		if (bloom !== null) this.bloomed(bloom);
		this.shown.shown(this.renderer);
		return this.canvasLost() ? LOST : DRAWN;
	}

	/**
	 * Each exposure's surfaces laid out for a frame, hidden where the frame paints them not: the window's over as much of
	 * its plane as the box the world is drawn over shows, and each object of markup standing in the world over its
	 * nearest part shown. Where each exposure's page's surface and markup stand.
	 * @param {readonly DrawnScene[]} scenes @param {Box} gathered @returns {readonly ExposureStanding[]}
	 */
	surfacesLaidOut(scenes, gathered) {
		const pagePlacings = scenes.map((scene) => pagePlacingOf(scene, gathered));
		for (const [place, surfaces] of this.exposureSurfaces.entries()) {
			for (const [name, surface] of surfaces) surface.toggleAttribute(HIDDEN, !isPainted(name, place, scenes));
		}
		for (const [place, placing] of pagePlacings.entries()) {
			const surfaces = surfacesAt(this.exposureSurfaces, place);
			const density = this.densityOf(placing.box, AS_THE_PAGE);
			for (const name of ON_THE_PAGE) laidOutAs(surfaceOf(surfaces, name), placing.box, density);
		}
		return pagePlacings.map((placing, place) => ({
			placing,
			markup: this.stage.laidApart(place).map((apart) => this.markupLaidOut(apart, scenesAt(scenes, place), gathered))
		}));
	}

	/** Whether the graphics card has dropped the room's canvas, which draws nothing after. */
	canvasLost() {
		return this.renderer.getContext().isContextLost();
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
	 * An exposure drawn and added into the frame: its ground; the world as one scene, through the eye's lens; the cursor
	 * over it, where the scene has one; the film's things on the frame; the frame's surface. Refused, with what the film
	 * is told, where its module throws building or setting a thing; lost where the card dropped the canvas as the module
	 * built or set one, as the film's own three draws on the card: drawn on, the stage's tab crashed (a thing losing the
	 * context on purpose, in software, 2026-11-12).
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {ExposureStanding} standing @param {DrawnScene} scene
	 * @param {Box} gathered @returns {Composed}
	 */
	exposureDrawn(surfaces, standing, scene, gathered) {
		const things = thingsIn(scene);
		const refused = this.thingsPosed(things);
		if (refused !== null) return { kind: 'refused', said: refused };
		if (this.canvasLost()) return LOST;
		this.lighting.lit(this.renderer, scene.world.lighting);
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.clear();
		this.flatLaid('ground', surfaces);
		const inTheWorld = things.filter((thing) => thing.standsIn === 'world');
		const pits = pitsSunkIn(scene, this.screen);
		const pageLaid = this.pageLaid(surfaces, standing, scene, pits);
		const pageMatrix = surfaceMatrixOf(scene.window.pageSurface.inTheEyesSpace, standing.placing);
		const worlds = this.worldBuilt(scene, pageLaid, pageMatrix, standing, inTheWorld, pits);
		this.worldSeen.cleared(this.renderer);
		this.worldDrawn(scene, worlds, gathered);
		valuesSet(this.worldLaying.material, { drawn: this.worldSeen.seen.texture });
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.worldLaying, this.camera);
		if (SURFACE_TEXTURES['over-the-world'].holdsAnything(scene)) this.cursorLaid(surfaces, pageMatrix, scene);
		const onTheFrame = things.filter((thing) => thing.standsIn === 'frame');
		if (onTheFrame.length > NONE_STANDING) this.onTheFrameLaid(onTheFrame, scene);
		this.flatLaid('frame', surfaces);
		this.renderer.setRenderTarget(this.frame);
		this.renderer.render(this.weighed, this.camera);
		return DRAWN;
	}

	/**
	 * What an exposure's page's surface lays, as its material takes it: the window's surface drawn anew; what lies over
	 * the page, drawn anew where anything does; the page's picture under them; and the mouths of the pits sunk into the
	 * page (`page-picture.js`).
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {ExposureStanding} standing @param {DrawnScene} scene
	 * @param {readonly SunkPit[]} pits @returns {PageSurfaceLaid}
	 */
	pageLaid(surfaces, standing, scene, pits) {
		const surface = textureOf(this.textures, 'window').drawnFrom(surfaceOf(surfaces, 'window'), this.repainted);
		const overThePage = scene.overThePage
			? textureOf(this.textures, 'over-the-page').drawnFrom(surfaceOf(surfaces, 'over-the-page'), this.repainted)
			: null;
		return { surface, ...this.pagePicture.laidWith(scene, standing.placing.box, overThePage, pits) };
	}

	/**
	 * The cursor laid over all the world drawn of an exposure: its surface drawn anew, stood where the matrix places the
	 * window's surfaces, laid out over the same box of the page's plane, seen from the eye over the frame, and laid in
	 * the screen's colours whatever stands nearer the eye.
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {Matrix4} pageMatrix @param {DrawnScene} scene
	 */
	cursorLaid(surfaces, pageMatrix, scene) {
		const surface = surfaceOf(surfaces, 'over-the-world');
		valuesSet(this.cursor.material, {
			surface: textureOf(this.textures, 'over-the-world').drawnFrom(surface, this.repainted)
		});
		placedBy(this.cursor, pageMatrix);
		seenThrough(this.worldCamera, projectionOnto(this.frameBox, this.frameBox, scene.eye.distance));
		this.worldCamera.layers.enableAll();
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.cursor, this.worldCamera);
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
		if (SURFACE_TEXTURES[name].eachExposure) texture.drawnFrom(surfaceOf(surfaces, name), this.repainted);
		valuesSet(this.flatLaying.material, { surface: texture.texture });
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.render(this.flatLaying, this.camera);
	}

	/**
	 * The world built as the scenes the room draws it from: the page's surface on the plane the engine lays it on; the
	 * window's body and glass; the film's posed things in the world; and the surface of each object of markup standing
	 * there. What of the window, the things and the objects of markup stands nearer the eye than all the rest while the
	 * eye's focus blurs it near (`apartBeforeTheRest`) is a world of its own, drawn and blurred apart and laid over the
	 * rest, which is drawn without it: one depth a pixel cannot hold what a near thing hides, and the lens, reading one,
	 * carried what stood round its hole on into it, so a sharp edge behind a blurred cube ended where the cube's blur
	 * began (a probe film, d at 1 s, 2026-11-11). Parted by what stands, each whole, no surface is cut: parted by a plane
	 * at the focus, a page crossing it was cut in two, and laid by its clearness on both sides drew a line where it was
	 * cut, or a band where the two sides lay over one another. Each world is built by `worldApartBuilt`; the worlds the
	 * room draws, the rest first, none that holds nothing.
	 * @param {DrawnScene} scene @param {PageSurfaceLaid} pageLaid @param {Matrix4} pageMatrix the matrix that places the
	 * page's square @param {ExposureStanding} standing @param {readonly ThingObject[]} things
	 * @param {readonly SunkPit[]} pits @returns {readonly WorldApart[]}
	 */
	worldBuilt(scene, pageLaid, pageMatrix, standing, things, pits) {
		const window = scene.window;
		const eye = scene.eye;
		this.world.clear();
		this.beforeTheRest.clear();
		for (const page of this.pageSurfaces) {
			compiledForThePits(page.material, pageLaid);
			valuesSet(page.material, pageLaid);
			placedBy(page, pageMatrix);
		}
		const body = window.body === null ? null : this.body.posed(window, window.body);
		// Where the window has a body, it stands within its slab; where it has none, the page draws its shadow past its
		// edge, on its plane, so it stands on all of the page's surface
		const windowStanding = { box: boxHolding(body === null ? [this.page] : [body.slab]) };
		const windowBuilt = { drawn: window, pageMatrix, body, pits: this.pitsPosed(pits, window) };
		const posed = things.map((thing) => this.things.posedAs(thing).placed);
		for (const placed of posed) sortedBySeeingThrough(placed);
		/** @type {readonly StandingApart[]} */
		const standingApart = [
			...posed.map((placed) => standingOf([placed], seenThroughIn(placed))),
			...standing.markup.map((markup, place) =>
				standingOf(
					[...this.markupAdded(place, markup), ...this.pieceBodies.posed(place, markup.object, scene.look)],
					MARKUP_BESIDE_THE_PAGE
				)
			)
		];
		const apart = this.lens.apartBeforeTheRest(eye, [windowStanding, ...standingApart]);
		const windowApart = apart.includes(windowStanding);
		const before = standingApart.filter((each) => apart.includes(each));
		const rest = standingApart.filter((each) => !apart.includes(each));
		const worlds = [
			this.worldApartBuilt(this.world, windowApart ? null : windowBuilt, rest, eye),
			this.worldApartBuilt(this.beforeTheRest, windowApart ? windowBuilt : null, before, eye)
		];
		return worlds.filter((world) => world !== null);
	}

	/**
	 * A world the room draws apart built in its scene: what stands there, and the window where it stands there. What
	 * writes depth is drawn apart from what is seen through, where that has something of the world behind it to show
	 * (`see-through.js`); markup is seen through, round its letters and in its shadows. A page seen through with nothing
	 * of its world but its own body standing round it shows what is laid under it, which this world's lens does not blur,
	 * and its body's rim under its edge, on its own plane: it is drawn with what writes depth, so its edge and the rim
	 * under it blur as one, where blurred apart they left a light band round a blurred page, and the lens runs once. The
	 * world, the parts drawn with what writes depth and the fields of what is seen through it is drawn with; none where
	 * it holds nothing.
	 * @param {Scene} world @param {WindowBuilt | null} window @param {readonly StandingApart[]} standing
	 * @param {DrawnEye} eye @returns {WorldApart | null}
	 */
	worldApartBuilt(world, window, standing, eye) {
		if (window === null && standing.length === NONE_STANDING) return null;
		// three takes a part out of the scene it stood in as it adds it to another
		for (const each of standing) world.add(...each.parts);
		const pageSeen = window === null ? null : this.windowAdded(world, window, standing.length > NONE_STANDING);
		const beside = kindsFartherFirst(standing);
		const [first, ...others] = beside;
		// Where the eye blurs nothing and the page is not seen through, nothing parts a film's things seen through from
		// what writes depth but how they are laid: drawn after it into its layer, three lays them over it in linear light,
		// as their field would be laid, where they are laid first
		const holdsTheWindow = window !== null;
		if (eye.lens === null && pageSeen === null && first === 'thingsSeenThrough') {
			return {
				scene: world,
				writingDepth: ['opaque', first],
				seenThroughFields: seenThroughFieldsOf(null, others),
				holdsTheWindow
			};
		}
		return {
			scene: world,
			writingDepth: ['opaque'],
			seenThroughFields: seenThroughFieldsOf(pageSeen, beside),
			holdsTheWindow
		};
	}

	/**
	 * The window added to a world, its page seen through where it fades and anything else stands beside it there, and
	 * the pits sunk into its page: the matrix that places the page's square where it is seen through, none where it is
	 * not.
	 * @param {Scene} world @param {WindowBuilt} window @param {boolean} besideThePage
	 */
	windowAdded(world, window, besideThePage) {
		const pageSeenThrough = window.drawn.pageShown < WHOLLY_SHOWN && besideThePage;
		world.add(...(pageSeenThrough ? [this.pageSeenThrough, this.pageDepth] : [this.page]));
		if (window.body !== null) bodyAdded(world, window.body, pageSeenThrough);
		for (const pit of window.pits) world.add(pit);
		return pageSeenThrough ? window.pageMatrix : null;
	}

	/**
	 * The pits sunk into the window's page posed, each by its place among them under its mouth, where the screen lies on
	 * the window's plane.
	 * @param {readonly SunkPit[]} pits @param {DrawnWindow} window @returns {readonly Object3D[]}
	 */
	pitsPosed(pits, window) {
		const middle = middleOf(window.box);
		return pits.map((pit, place) =>
			this.pagePits.posed(place, pit, fromTheMiddleOf(window.pageSurface.inTheEyesSpace, { box: pit.mouth, middle }))
		);
	}

	/**
	 * The world drawn over the box of the frame the lens's blur gathers, seen from the eye, each world apart laid over
	 * the one before, the rest first.
	 * @param {DrawnScene} scene @param {readonly WorldApart[]} worlds @param {Box} gathered
	 */
	worldDrawn(scene, worlds, gathered) {
		seenThrough(this.worldCamera, projectionOnto(gathered, this.frameBox, scene.eye.distance));
		for (const world of worlds) this.worldApartDrawn(scene, world, gathered);
	}

	/**
	 * A world apart drawn, lit as the eye sees the room, each field of it laid through the lens over the one before, the
	 * lowest first: what writes depth, drawn into the world's layer; then each field of what is seen through, drawn over
	 * that depth into one layer, one field at a time, each laid before the next is drawn. The page, in whichever field it
	 * stands, reads what the room has laid so far as what stands behind it.
	 * @param {DrawnScene} scene @param {WorldApart} world @param {Box} gathered
	 */
	worldApartDrawn(scene, world, gathered) {
		this.lighting.shiningIn(world.scene, scene.eye.roomInTheEyesSpace);
		this.renderer.setRenderTarget(this.worldLayer);
		this.renderer.clear();
		this.behindThePageSet(gathered);
		partsDrawn(this.renderer, world.scene, this.worldCamera, world.writingDepth);
		const opaque = sceneFieldOf(this.worldLayer.texture, this.worldLayer);
		const opaqueSpreads = this.windowSpreadsOver(opaque, scene, world.holdsTheWindow);
		this.worldSeen.fieldLaid(this.renderer, WHAT_WRITES_DEPTH_LAID, (target) =>
			this.lens.laid(this.renderer, opaque, gathered, this.frameBox, scene.eye, target, opaqueSpreads)
		);
		for (const field of world.seenThroughFields) {
			this.behindThePageSet(gathered);
			const drawnField = this.seeThrough.drawn(this.renderer, world.scene, this.worldCamera, this.worldLayer, field);
			const spreads = this.windowSpreadsOver(drawnField, scene, field.holding === 'pageSeenThrough');
			this.worldSeen.fieldLaid(this.renderer, field.laid, (target) =>
				this.lens.laid(this.renderer, drawnField, gathered, this.frameBox, scene.eye, target, spreads)
			);
		}
	}

	/**
	 * How wide the window's shade blurs the whole window at each pixel of a field that holds the window, its page or its
	 * body, as the lens takes it, where the shade blurs the window's body, which the room blurs the page with; none where
	 * it blurs none of it, or the field holds none of the window.
	 * @param {SceneField} field @param {DrawnScene} scene @param {boolean} holdsTheWindow @returns {Texture | null}
	 */
	windowSpreadsOver(field, scene, holdsTheWindow) {
		const body = scene.window.body;
		if (!holdsTheWindow || body === null || body.shade === null || body.shade.blur === null) {
			return NO_SPREADS_OF_THEIR_OWN;
		}
		const toTheEye = this.worldCamera.projectionMatrixInverse;
		return this.windowBlurred.spreadsOver(this.renderer, field, toTheEye, scene, body, body.shade.blur);
	}

	/**
	 * What the page's surface and the window's body read of what stands behind them, where the shade fades them
	 * (`page-picture.js`, `body.js`), set as the room has laid the world so far: that world, the film's ground, and where
	 * a pixel of the layers the world is drawn into over the box the lens gathers stands on the frame.
	 * @param {Box} gathered
	 */
	behindThePageSet(gathered) {
		const frame = this.frameBox;
		/** @type {BehindThePage} */
		const behind = {
			behindSoFar: this.worldSeen.seen.texture,
			filmsGround: textureOf(this.textures, 'ground').texture,
			layerOnTheFrame: new Vector4(
				gathered.width / this.worldLayer.width / frame.width,
				gathered.height / this.worldLayer.height / frame.height,
				(gathered.left - frame.left) / frame.width,
				(frame.top + frame.height - gathered.top - gathered.height) / frame.height
			)
		};
		for (const page of this.pageSurfaces) valuesSet(page.material, behind);
		this.body.behindSet(behind);
	}

	/**
	 * An object of markup standing in the world laid out where the stage laid it apart, part by part as the engine
	 * magnifies it (`DrawnObject.magnified`), each part a surface over its box and as far past it as anything it shows
	 * draws, as many times as densely as the eye magnifies the part, so the eye sees none of its pixels larger than the
	 * frame's, or as densely as the card holds it. One that asks no more pixels drawn whole, at the density of its
	 * nearest part, than the box the world is drawn over holds is laid over all of that as one part; one that asks
	 * more, each part over what that box shows of it as far as the eye sees it from within the part, none where it shows
	 * none. Its element laid in the canvas, where it is not yet, over its nearest part shown. A surface that fits is not
	 * cut, as its texels and their smaller copies would stand elsewhere and draw its letters otherwise: beats 3-4's
	 * lifted lines, magnified 1.1 times and cut at the frame's edge, came out at SSIM 0.9976 against the uncut (draft,
	 * 2 s, 2026-11-12), where cutting saves less than the world's own layer holds.
	 * @param {SurfaceApart} apart @param {DrawnScene} scene @param {Box} gathered @returns {MarkupStanding}
	 */
	markupLaidOut(apart, scene, gathered) {
		const object = objectNamed(scene[apart.list], apart.name);
		const stretches = stretchesOf(object.magnified);
		const grown = clearRound(grownBy(object.box, this.reachPastTheBox));
		const times = Math.max(AS_THE_PAGE, ...stretches.map((stretch) => stretch.times));
		const whole = { nearest: FROM_THE_EYE, reaches: Infinity, times };
		const parts = fitsIn(grown, this.densityOf(grown, whole.times), gathered)
			? [this.markupPartOver(object, grown, whole)]
			: stretches.flatMap((stretch) => this.markupPartShown(object, grown, gathered, stretch));
		if (apart.element.parentElement !== this.canvas) this.canvas.append(apart.element);
		const [nearest] = parts;
		if (nearest !== undefined) laidOutAs(apart.element, nearest.placing.box, nearest.density);
		return { object, element: apart.element, parts, laidAt: placeInTheWorld(scene, apart) };
	}

	/**
	 * A part of an object of markup standing in the world, as far as the eye sees it from, over what the box the world is
	 * drawn over shows of its grown box within that stretch; none where it shows none of it.
	 * @param {DrawnObject} object @param {Box} grown @param {Box} gathered @param {MagnifiedStretch} stretch
	 * @returns {readonly MarkupPart[]}
	 */
	markupPartShown(object, grown, gathered, stretch) {
		const shown = shownOf(grown, entriesOf(object.transform), middleOf(object.box), gathered, stretch);
		return shown === null ? [] : [this.markupPartOver(object, clearRound(shown), stretch)];
	}

	/**
	 * A part of an object of markup standing in the world laid over a box on its plane, as many times as densely as the
	 * eye magnifies it, or as the card holds it.
	 * @param {DrawnObject} object @param {Box} box @param {MagnifiedStretch} stretch @returns {MarkupPart}
	 */
	markupPartOver(object, box, stretch) {
		const placing = { box, middle: middleOf(object.box) };
		return { placing, density: this.densityOf(box, stretch.times), stretch, entries: entriesOf(object.transform) };
	}

	/**
	 * The parts of an exposure's markup standing in the world drawn into their textures: the nearest of each as the
	 * canvas painted it with the frame; each farther one once its element is laid out over it and the canvas has
	 * painted it so, all the objects' parts at the same place among their own in one paint.
	 * @param {readonly MarkupStanding[]} markup
	 */
	async markupDrawn(markup) {
		for (const [place, standing] of markup.entries()) {
			if (standing.parts.length > NONE_STANDING) {
				this.markupPartAt(place, NEAREST).texture.drawnFrom(standing.element, this.repainted);
			}
		}
		const mostParts = Math.max(NONE_STANDING, ...markup.map((standing) => standing.parts.length));
		for (let part = NEAREST + ONE_MORE; part < mostParts; part += ONE_MORE) {
			const laying = markup.flatMap((standing, place) => partLaying(standing, place, part));
			for (const { element, laid } of laying) laidOutAs(element, laid.placing.box, laid.density);
			const repainted = await paintedOf(this.canvas);
			for (const { place, element } of laying) this.markupPartAt(place, part).texture.drawnFrom(element, repainted);
		}
	}

	/**
	 * An object of markup standing in the world added to the world, by its place among the exposure's: each part of its
	 * surface, drawn into a texture of its own, stood where the engine's matrix places the object's box's middle, its
	 * light and its depth apart, as what is seen through is drawn, its light laid at the object's place in the scene's
	 * order. The parts of the world it stands as.
	 * @param {number} place @param {MarkupStanding} markup @returns {readonly Object3D[]}
	 */
	markupAdded(place, markup) {
		/** @type {Object3D[]} */
		const added = [];
		for (const [partPlace, part] of markup.parts.entries()) {
			const inTheWorld = this.markupPartAt(place, partPlace);
			const matrix = surfaceMatrixOf(markup.object.inTheEyesSpace, part.placing);
			const values = { surface: inTheWorld.texture.texture, ...seenFromValuesOf(part) };
			for (const surface of [inTheWorld.light, inTheWorld.depth]) {
				valuesSet(surface.material, values);
				placedBy(surface, matrix);
				this.world.add(surface);
				added.push(surface);
			}
			this.laidAt.set(inTheWorld.light, markup.laidAt);
		}
		return added;
	}

	/**
	 * A part of a surface of markup in the world as the world draws it, by the surface's place among an exposure's and
	 * the part's among the surface's: made the first time one stands there.
	 * @param {number} place @param {number} part @returns {MarkupInTheWorld}
	 */
	markupPartAt(place, part) {
		while (this.markup.length <= place) this.markup.push([]);
		const parts = markupAt(this.markup, place);
		while (parts.length <= part) parts.push(markupInTheWorld(this.renderer));
		return markupAt(parts, part);
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
	 * lens's blur gathers there, from the softest point the frame shows of its window or of an object in it, or of the
	 * window's slab the shade blurs whole, rounded up to a step of the drawing's pixels; grown about the frame till each
	 * side halves evenly down to the coarsest copy the lens reads of it (`sideHalvedEvenly`), so the blur's light is the
	 * same wherever the frame falls in it; and no longer a side than the graphics card's largest texture, a power of
	 * two, past which a blur by the frame's edge gathers nothing. The frame itself where the eye's focus blurs none.
	 * @param {readonly DrawnScene[]} scenes @returns {Box}
	 */
	gatheredFor(scenes) {
		const softest = Math.max(
			SHARP,
			...scenes.map((scene) => scene.window.softestOutOfFocus ?? SHARP),
			...scenes.flatMap(objectsIn).map((object) => object.softestOutOfFocus ?? SHARP),
			...scenes.map((scene) => scene.window.body?.shade?.blur?.softest ?? SHARP)
		);
		if (softest === SHARP) return this.frameBox;
		const widestSpread = softest * this.pixelsOfOne;
		const reach = Math.ceil((SPREADS_REACHED * widestSpread) / REACH_STEP) * REACH_STEP;
		const largest = this.renderer.capabilities.maxTextureSize;
		const across = Math.min(sideHalvedEvenly(this.drawnSize.x + reach + reach, widestSpread), largest);
		const down = Math.min(sideHalvedEvenly(this.drawnSize.y + reach + reach, widestSpread), largest);
		return grownTo(this.frameBox, across / window.devicePixelRatio, down / window.devicePixelRatio);
	}

	/**
	 * How densely a surface of a box is drawn, in times the page's device scale: as many as asked, or fewer, where its
	 * texture would pass the graphics card's largest on a side.
	 * @param {Box} box @param {number} asked
	 */
	densityOf(box, asked) {
		const largestSide = this.renderer.capabilities.maxTextureSize - ROUNDED_UP;
		return Math.min(asked, largestSide / (Math.max(box.width, box.height) * window.devicePixelRatio));
	}
}

/**
 * Where a surface drawn from markup stands on its plane, the page's on the window's or an object's on its own: its box
 * there, in the frame's pixels, and the middle of the box the engine's matrix carries into the eye's own space, the
 * window's view's or the object's.
 * @typedef {{ readonly box: Box, readonly middle: Vector2 }} SurfacePlacing
 */
/**
 * An object of markup standing in the world as the room lays it: the object, the surface's element, the parts of the
 * surface the world draws, nearest the eye first, and its place among what stands in the world in the order the scene
 * lays it.
 * @typedef {{
 *   readonly object: DrawnObject,
 *   readonly element: Element,
 *   readonly parts: readonly MarkupPart[],
 *   readonly laidAt: number
 * }} MarkupStanding
 */
/**
 * A part of an object of markup by how far the eye sees it from: farther than the nearest, no farther than it
 * reaches, and how many times the eye magnifies it there (`MagnifiedPart` in `src/domain/matrix.ts`).
 * @typedef {{ readonly nearest: number, readonly reaches: number, readonly times: number }} MagnifiedStretch
 */
/**
 * A part of a surface of markup in the world as the room lays it: where it stands on the object's plane, how densely
 * it is drawn, how far the eye sees it from, and every entry of the matrix that places it about the object's middle.
 * @typedef {{
 *   readonly placing: SurfacePlacing,
 *   readonly density: number,
 *   readonly stretch: MagnifiedStretch,
 *   readonly entries: Matrix
 * }} MarkupPart
 */
/**
 * A point of a box on a plane as a cut keeps it: where it stands on the plane from the middle the matrix carries the
 * plane about, and where the matrix carries it before it is seen, across, down and how far it is seen from.
 * @typedef {{ readonly onThePlane: Vector2, readonly carried: Vector3 }} PointCut
 */
/**
 * What the page's surface lays, as its material takes it: the window's surface, and with it what lies over the page
 * and the page's picture under it (`page-picture.js`).
 * @typedef {PageLaid & { readonly surface: Texture }} PageSurfaceLaid
 */
/**
 * What stands in an exposure's world drawn from markup: the page's surface, and each object's.
 * @typedef {{ readonly placing: SurfacePlacing, readonly markup: readonly MarkupStanding[] }} ExposureStanding
 */
/**
 * The window as an exposure's world is built of it: as drawn, the matrix that places the page's square, its body as
 * posed, none where it has none, and the pits sunk into its page, as posed.
 * @typedef {{
 *   readonly drawn: DrawnWindow,
 *   readonly pageMatrix: Matrix4,
 *   readonly body: BodyPosed | null,
 *   readonly pits: readonly Object3D[]
 * }} WindowBuilt
 */
/**
 * The window's body as posed: its slab, and the glass over the page.
 * @typedef {ReturnType<WindowBody['posed']>} BodyPosed
 */
/**
 * A thing or an object of markup standing in the world, as the room parts the world: its parts in the world's scene,
 * what of it is seen through beside the page, markup always, and the box all its parts stand in.
 * @typedef {{
 *   readonly parts: readonly Object3D[],
 *   readonly seenThrough: readonly BesideThePage[],
 *   readonly box: Box3
 * }} StandingApart
 */
/**
 * A world the room draws apart: the scene it is drawn from, the parts of it drawn with what writes depth, the fields
 * of what is seen through it is drawn with, and whether the window stands in it.
 * @typedef {{
 *   readonly scene: Scene,
 *   readonly writingDepth: readonly WorldPart[],
 *   readonly seenThroughFields: readonly SeenThroughField[],
 *   readonly holdsTheWindow: boolean
 * }} WorldApart
 */
/**
 * A part of a surface of markup standing in the world as the world draws it: its texture, its light and its depth.
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
	return fromTheMiddleOf(inTheEyesSpace, placing).multiply(new Matrix4().makeScale(box.width, box.height, UNSCALED));
}

/**
 * The matrix that carries a point, in the frame's pixels from the middle of a box on a plane, into the eye's own
 * space: the plane the engine's matrix carries from the middle it names into that space.
 * @param {Matrix} inTheEyesSpace @param {SurfacePlacing} placing
 */
function fromTheMiddleOf(inTheEyesSpace, placing) {
	const box = placing.box;
	const fromTheMiddle = new Vector3(
		box.left + box.width * HALF - placing.middle.x,
		placing.middle.y - (box.top + box.height * HALF),
		ON_ITS_PLANE
	);
	return matrixOf(inTheEyesSpace).multiply(new Matrix4().makeTranslation(fromTheMiddle));
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

/** A box's four corners, going round it. @param {Box} box */
function cornersOf(box) {
	const right = box.left + box.width;
	const bottom = box.top + box.height;
	return [
		new Vector2(box.left, box.top),
		new Vector2(right, box.top),
		new Vector2(right, bottom),
		new Vector2(box.left, bottom)
	];
}

/**
 * Whether a surface laid over a box at a density holds no more pixels than another box of the frame does at the
 * page's own. @param {Box} box @param {number} density @param {Box} within
 */
function fitsIn(box, density, within) {
	return box.width * density * box.height * density <= within.width * within.height;
}

/**
 * Each part of an object of markup as the engine magnifies it, nearest the eye first, with how far the part before it
 * reaches, which it stands farther than: the eye, for the first.
 * @param {readonly MagnifiedPart[]} magnified @returns {readonly MagnifiedStretch[]}
 */
function stretchesOf(magnified) {
	return magnified.map((part, place) => ({
		nearest: magnified[place - ONE_MORE]?.reaches ?? FROM_THE_EYE,
		reaches: part.reaches,
		times: part.times
	}));
}

/**
 * The part of a box on a plane a box of the frame shows, within a stretch of how far the eye sees it from: the least
 * box round it, on the plane, in the frame's pixels; none where it shows none. The box's corners, carried by the
 * plane's matrix about its middle, are cut at each edge of the frame's box through the eye and at each end of the
 * stretch, as the engine cuts what the frame shows of a plane (`carriedWithin` in `src/domain/matrix.ts`), each point
 * keeping where it stands on the plane.
 * @param {Box} box @param {Matrix} entries @param {Vector2} middle @param {Box} shown
 * @param {MagnifiedStretch} stretch @returns {Box | null}
 */
function shownOf(box, entries, middle, shown, stretch) {
	const corners = cornersOf(box).map((corner) => pointCutOf(entries, corner.sub(middle)));
	const edges = [...edgesOf(shown, middle), fartherThan(stretch.nearest), nearerThan(stretch.reaches)];
	const kept = edges.reduce(cutAt, corners);
	if (kept.length === NONE_STANDING) return null;
	return boxOfPoints(kept.map((point) => point.onThePlane.clone().add(middle)));
}

/**
 * A point of a plane as a matrix carries it about the plane's middle, out none, before it is seen.
 * @param {Matrix} entries @param {Vector2} onThePlane @returns {PointCut}
 */
function pointCutOf(entries, onThePlane) {
	const carried = new Vector3(
		entries.m11 * onThePlane.x + entries.m21 * onThePlane.y + entries.m41,
		entries.m12 * onThePlane.x + entries.m22 * onThePlane.y + entries.m42,
		entries.m14 * onThePlane.x + entries.m24 * onThePlane.y + entries.m44
	);
	return { onThePlane, carried };
}

/**
 * The edges of a box of the frame, from the middle a matrix carries a plane about, as cuts through the eye: how far
 * inside each a carried point stands is so much of its across, its down, how far it is seen from, and none more.
 * @param {Box} box @param {Vector2} middle @returns {readonly Vector4[]}
 */
function edgesOf(box, middle) {
	const left = box.left - middle.x;
	const top = box.top - middle.y;
	return [
		new Vector4(INWARD, NONE_OF_IT, -left, THROUGH_THE_EYE),
		new Vector4(NONE_OF_IT, INWARD, -top, THROUGH_THE_EYE),
		new Vector4(OUTWARD, NONE_OF_IT, left + box.width, THROUGH_THE_EYE),
		new Vector4(NONE_OF_IT, OUTWARD, top + box.height, THROUGH_THE_EYE)
	];
}

/** The edge that keeps what is seen from no nearer than a distance. @param {number} distance */
function fartherThan(distance) {
	return new Vector4(NONE_OF_IT, NONE_OF_IT, INWARD, -distance);
}

/** The edge that keeps what is seen from no farther than a distance. @param {number} distance */
function nearerThan(distance) {
	return new Vector4(NONE_OF_IT, NONE_OF_IT, OUTWARD, distance);
}

/**
 * A polygon of points going round cut at an edge: each point inside it kept, and where a side crosses it, the point
 * it crosses at, so what is kept goes round too.
 * @param {readonly PointCut[]} points @param {Vector4} edge @returns {readonly PointCut[]}
 */
function cutAt(points, edge) {
	/** @type {PointCut[]} */
	const kept = [];
	for (const [place, point] of points.entries()) {
		const next = points[(place + ONE_MORE) % points.length] ?? point;
		const inside = insideOf(edge, point);
		const nextInside = insideOf(edge, next);
		const isKept = inside >= ON_THE_EDGE;
		if (isKept) kept.push(point);
		if (isKept !== nextInside >= ON_THE_EDGE) kept.push(pointBetween(point, next, inside / (inside - nextInside)));
	}
	return kept;
}

/**
 * How far inside an edge a point stands: none on it, less than none past it.
 * @param {Vector4} edge @param {PointCut} point
 */
function insideOf(edge, point) {
	return edge.dot(new Vector4(point.carried.x, point.carried.y, point.carried.z, ALL_OF_IT));
}

/**
 * A point a share of the way from one to another, on the plane and as it is carried, as a side between them is cut.
 * @param {PointCut} start @param {PointCut} end @param {number} share @returns {PointCut}
 */
function pointBetween(start, end, share) {
	return {
		onThePlane: start.onThePlane.clone().lerp(end.onThePlane, share),
		carried: start.carried.clone().lerp(end.carried, share)
	};
}

/**
 * The values a part of a surface of markup is cut to how far the eye sees it from by (`MARKUP_PART_FRAGMENT`): how far
 * it sees a point of the surface from, so much for its share across, so much for its share down, so much at its top
 * left corner, the plane's matrix dividing the point by its across, down and own entries; and the stretch it draws.
 * @param {MarkupPart} part
 */
function seenFromValuesOf(part) {
	const { box, middle } = part.placing;
	const { m14, m24, m44 } = part.entries;
	const corner = m14 * (box.left - middle.x) + m24 * (box.top - middle.y) + m44;
	return {
		seenFromAlong: new Vector3(m14 * box.width, m24 * box.height, corner),
		seenFromWithin: new Vector2(part.stretch.nearest, part.stretch.reaches)
	};
}

/**
 * An exposure's object of markup, by its place among the exposure's, as its part at a place among its own is laid
 * out: none where it has no part there.
 * @param {MarkupStanding} standing @param {number} place @param {number} part
 */
function partLaying(standing, place, part) {
	const laid = standing.parts[part];
	return laid === undefined ? [] : [{ place, element: standing.element, laid }];
}

/** The least box the points stand in. @param {readonly Vector2[]} points @returns {Box} */
function boxOfPoints(points) {
	const left = Math.min(...points.map((point) => point.x));
	const top = Math.min(...points.map((point) => point.y));
	const right = Math.max(...points.map((point) => point.x));
	const bottom = Math.max(...points.map((point) => point.y));
	return { left, top, width: right - left, height: bottom - top };
}

/**
 * The part of one box inside another, of a size of none or less where they do not meet.
 * @param {Box} first
 * @param {Box} second
 * @returns {Box}
 */
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

/**
 * A box grown about its middle to a size.
 * @param {Box} box
 * @param {number} width
 * @param {number} height
 * @returns {Box}
 */
function grownTo(box, width, height) {
	return { left: box.left - (width - box.width) * HALF, top: box.top - (height - box.height) * HALF, width, height };
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
 * Whether the canvas paints a surface of an exposure for a frame of these exposures' scenes: one the frame has, and of
 * a surface drawn once a frame, the first exposure's alone, where its scene has it hold anything.
 * @param {SurfaceName} name @param {number} place @param {readonly DrawnScene[]} scenes
 */
function isPainted(name, place, scenes) {
	const scene = scenes[place];
	const drawn = SURFACE_TEXTURES[name];
	return scene !== undefined && (drawn.eachExposure || place === FIRST) && drawn.holdsAnything(scene);
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

/**
 * The canvas painted, what the stage drew in it with it: once it says it has, the children it painted anew, whose
 * rendering changed since it last painted (a probe of 2026-11-11: a frame of the window standing still repainted its
 * surface in 29 of 301 paints).
 * @param {PaintingCanvas} canvas @returns {Promise<ReadonlySet<Element>>}
 */
function paintedOf(canvas) {
	const painted = new Promise((resolve) =>
		canvas.addEventListener(PAINTED, (event) => resolve(new Set(repaintedBy(event))), { once: true })
	);
	canvas.requestPaint();
	return painted;
}

/**
 * The children a canvas's paint names as painted anew: HTML-in-Canvas's `CanvasPaintEvent` names them.
 * @param {Event} event @returns {readonly Element[]}
 */
function repaintedBy(event) {
	if (!namesWhatItPainted(event)) {
		throw new Error("the room's canvas names nothing it painted anew: the browser's HTML-in-Canvas lacks it");
	}
	return event.changedElements;
}

/** @param {Event} event @returns {event is CanvasPaintEvent} */
function namesWhatItPainted(event) {
	return 'changedElements' in event && Array.isArray(event.changedElements);
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
 * A surface drawn from markup as the world draws it, the page's or an object's, drawn nearer than what shares its
 * plane, in a part of the world.
 * @param {typeof PAGE_LAID | typeof PAGE_SEEN_THROUGH | typeof PAGE_DEPTH_ALONE | typeof MARKUP_SEEN_THROUGH
 *   | typeof MARKUP_DEPTH_ALONE} laid
 * @param {WorldPart} part @param {string} fragmentShader @param {Record<string, { value: unknown }>} uniforms
 */
function surfaceInTheWorld(laid, part, fragmentShader, uniforms) {
	const surface = surfaceDrawn(laid, fragmentShader, uniforms);
	surface.layers.set(WORLD_PARTS[part]);
	return surface;
}

/**
 * A surface drawn from markup: a square the room places, drawn whichever side faces the eye, as a window turned half
 * round shows the page mirrored, laid as named.
 * @param {typeof PAGE_LAID | typeof PAGE_SEEN_THROUGH | typeof PAGE_DEPTH_ALONE | typeof MARKUP_SEEN_THROUGH
 *   | typeof MARKUP_DEPTH_ALONE | typeof LAID_OVER} laid
 * @param {string} fragmentShader @param {Record<string, { value: unknown }>} uniforms
 */
function surfaceDrawn(laid, fragmentShader, uniforms) {
	const material = new ShaderMaterial({
		uniforms,
		vertexShader: SURFACE_IN_THE_WORLD_VERTEX,
		fragmentShader,
		side: DoubleSide,
		...laid
	});
	const surface = new Mesh(new PlaneGeometry(), material);
	surface.matrixAutoUpdate = false;
	surface.frustumCulled = false;
	return surface;
}

/**
 * three's camera seeing through a projection the room hands it, and nothing else.
 * @param {Camera} camera
 * @param {Matrix4} projection
 */
function seenThrough(camera, projection) {
	camera.projectionMatrix.copy(projection);
	camera.projectionMatrixInverse.copy(projection).invert();
}

/**
 * The window's body, as posed, added to a world: its glass in the page's part of the world, as it lies over the page,
 * seen through or with what writes depth.
 * @param {Scene} world @param {BodyPosed} body @param {boolean} pageSeenThrough
 */
function bodyAdded(world, body, pageSeenThrough) {
	const pagesPart = WORLD_PARTS[pageSeenThrough ? 'pageSeenThrough' : 'opaque'];
	body.glass.traverse((part) => part.layers.set(pagesPart));
	world.add(body.slab, body.glass);
}

/**
 * The least box all that parts of the world hold stands in, in the eye's own space, as each stands placed: a box round
 * each part's own, so a part stands within it, if it does not fill it.
 * @param {readonly Object3D[]} parts
 */
function boxHolding(parts) {
	const box = new Box3();
	for (const part of parts) box.expandByObject(part);
	return box;
}

/**
 * A thing or an object of markup as the room parts the world, by its parts and what of it is seen through.
 * @param {readonly Object3D[]} parts @param {readonly BesideThePage[]} seenThrough @returns {StandingApart}
 */
function standingOf(parts, seenThrough) {
	return { parts, seenThrough, box: boxHolding(parts) };
}

/**
 * The kinds seen through beside the page that stand in a world, the farther first, by the middle of the box all of
 * each stands in: so of two kinds one wholly before the other is laid over it. Two kinds that stand in among each other
 * are laid one wholly over the other.
 * @param {readonly StandingApart[]} standing @returns {readonly BesideThePage[]}
 */
function kindsFartherFirst(standing) {
	return BESIDE_THE_PAGE.map((kind) => ({ kind, holding: standing.filter((each) => each.seenThrough.includes(kind)) }))
		.filter(({ holding }) => holding.length > NONE_STANDING)
		.map(({ kind, holding }) => ({
			kind,
			middle: holding.reduce((box, each) => box.union(each.box), new Box3()).getCenter(new Vector3())
		}))
		.toSorted((first, second) => first.middle.z - second.middle.z)
		.map(({ kind }) => kind);
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
 * The object of a name in a list a scene draws: the stage laid it in its surface as it drew the scene, so one missing
 * is the room's fault.
 * @param {readonly DrawnObject[]} objects @param {string} name
 */
function objectNamed(objects, name) {
	const object = objects.find((each) => each.name === name);
	if (object === undefined) throw new Error(`the room lays ${name} in the world, which its scene does not draw`);
	return object;
}

/**
 * The place of an object of markup standing in the world among all that stands there, in the order the scene lays it:
 * the stage laid it apart as it drew the scene, so one missing is the stage's fault or the room's.
 * @param {DrawnScene} scene @param {SurfaceApart} apart
 */
function placeInTheWorld(scene, apart) {
	const place = scene.laidInTheWorld.findIndex((laid) => laid.list === apart.list && laid.name === apart.name);
	if (place === NOWHERE_LAID) throw new Error(`the room lays ${apart.name} in the world, where the scene lays none`);
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
		light: surfaceInTheWorld(MARKUP_SEEN_THROUGH, 'surfacesSeenThrough', MARKUP_PART_FRAGMENT, markupPartValues()),
		depth: surfaceInTheWorld(MARKUP_DEPTH_ALONE, 'surfacesDepth', MARKUP_PART_FRAGMENT, markupPartValues())
	};
}

/**
 * The values a part of a surface of markup's material starts with, its own: no texture yet, and how far the eye sees
 * it from set as each exposure stands it.
 */
function markupPartValues() {
	return {
		surface: { value: null },
		seenFromAlong: { value: new Vector3() },
		seenFromWithin: { value: new Vector2() }
	};
}

/**
 * The picture of the page the stage shows in an exposure's window's surface (`show` in `stage.js`).
 * @param {Element} surface
 */
function pictureIn(surface) {
	const picture = surface.querySelector(PICTURE);
	if (!(picture instanceof HTMLImageElement)) throw new Error("the room's window shows no picture of the page");
	return picture;
}

/**
 * How far past its box anything an object shows draws at most, in pixels of a frame 1080 high: the stylesheet's token,
 * registered as a length so the browser works it out to pixels.
 */
function reachPastTheBox() {
	return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue(REACH_PAST_THE_BOX));
}

/**
 * What the room holds of markup in the world at a place: a surface's parts, or one part.
 * @template Held @param {readonly Held[]} markup @param {number} place @returns {Held}
 */
function markupAt(markup, place) {
	const inTheWorld = markup[place];
	if (inTheWorld === undefined) throw new Error(`the room has drawn no markup ${place + 1} in the world`);
	return inTheWorld;
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
	laidOut = new Room(layout, things, lighting, window.stage);
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
	},
	canvasLost: () => {
		if (laidOut === null) throw new Error('the room is asked of its canvas before it is laid out');
		return laidOut.canvasLost();
	}
};
window.room = ROOM_API;
