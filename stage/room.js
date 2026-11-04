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
	WebGLRenderTarget,
	WebGLRenderer
} from 'three';
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { Transform } from '../src/domain/stance.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { Layout } from '../src/adapters/browser/stage.ts' */
/** @import { RoomApi } from '../src/adapters/browser/room.ts' */

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
// The entries of the engine's matrix a column at a time, as CSS names them and WebGL takes them; and those a flat
// matrix leaves out, as one that leaves a point on the frame's plane, out none, its fourth value its own, has them
/** @type {readonly (keyof Matrix)[]} */
const ENTRIES = [
	'm11',
	'm12',
	'm13',
	'm14',
	'm21',
	'm22',
	'm23',
	'm24',
	'm31',
	'm32',
	'm33',
	'm34',
	'm41',
	'm42',
	'm43',
	'm44'
];
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

// A surface placed on the frame by its matrix about a middle, the frame's pixels down from its top: the point a share
// of the surface's box across and down from its top left, on the frame's plane, carried about the middle as the matrix
// has it, then seen as far across and down as its fourth value takes it, as the browser draws a matrix3d()
const PLACED_VERTEX = `
uniform mat4 placing;
uniform vec2 middle;
uniform vec2 boxCorner;
uniform vec2 boxSize;
uniform vec2 frame;
varying vec2 shareOfTheSurface;
void main() {
	shareOfTheSurface = position.xy;
	vec4 placed = placing * vec4(boxCorner + position.xy * boxSize - middle, 0.0, 1.0);
	vec2 onTheFrame = middle * placed.w + placed.xy;
	gl_Position = vec4(2.0 * onTheFrame.x / frame.x - placed.w, placed.w - 2.0 * onTheFrame.y / frame.y, 0.0, placed.w);
}`;
const PLACED_FRAGMENT = `
uniform sampler2D surface;
varying vec2 shareOfTheSurface;
void main() {
	gl_FragColor = texture2D(surface, shareOfTheSurface);
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
	/** @param {Layout} layout */
	constructor(layout) {
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
		this.placed = placedSurfaceOf(layout.format.frame.width, layout.format.frame.height);
		this.weighed = overTheWholeOf(weighedMaterial(this.exposure));
		this.shown = overTheWholeOf(shownMaterial(this.frame));
		// three draws nothing without a camera; every point here is placed by the room's own shaders, not by it
		this.camera = new Camera();
	}

	/**
	 * One frame composed from its exposures: the window's surface of each laid out as far as its scene reaches, the
	 * surfaces of those it has painted, and each exposure drawn, its surfaces laid over one another, the window where its
	 * scene places it, and added into the frame at an equal weight; the frame shown on the canvas once the card has
	 * drawn it.
	 * @param {readonly DrawnScene[]} scenes
	 */
	async compose(scenes) {
		const exposurePlacings = scenes.map((scene) => placingsOf(scene, this.frameBox));
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
		this.renderer.setRenderTarget(this.frame);
		this.renderer.clear();
		valuesSet(this.weighed.material, { weight: WHOLE / scenes.length });
		for (const [place, placings] of exposurePlacings.entries()) {
			this.exposureDrawn(surfacesAt(this.exposureSurfaces, place), placings);
		}
		this.renderer.setRenderTarget(null);
		this.renderer.render(this.shown, this.camera);
	}

	/**
	 * An exposure drawn and added into the frame: each of its surfaces laid over those under it, where its scene places
	 * it, those drawn anew for each exposure drawn into their textures first.
	 * @param {ReadonlyMap<SurfaceName, Element>} surfaces @param {ReadonlyMap<SurfaceName, Placing>} placings
	 */
	exposureDrawn(surfaces, placings) {
		this.renderer.setRenderTarget(this.exposure);
		this.renderer.clear();
		for (const name of SURFACES) {
			const texture = textureOf(this.textures, name);
			if (SURFACE_TEXTURES[name].eachExposure) texture.drawnFrom(surfaceOf(surfaces, name));
			placedAs(this.placed, texture, placingOfThe(placings, name));
			this.renderer.render(this.placed, this.camera);
		}
		this.renderer.setRenderTarget(this.frame);
		this.renderer.render(this.weighed, this.camera);
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
 * about a middle.
 * @typedef {{ readonly box: Box, readonly matrix: Matrix4, readonly middle: Vector2 }} Placing
 */

/**
 * Where each surface of an exposure stands, as its scene places it: the ground and what stands on the frame where the
 * frame stands; the window by the engine's matrix about its view's middle, over as much of its plane as the frame
 * shows of what stands there, the frame's own box and as far past it as the camera's picture reaches, where the eye
 * may see it leant or from aside, and a little clear round it, so the plane's edge falls inside its texture and is
 * filtered as the browser smooths an edge, not cut stepped by its triangles.
 * @param {DrawnScene} scene @param {Box} frame @returns {ReadonlyMap<SurfaceName, Placing>}
 */
function placingsOf(scene, frame) {
	const view = scene.window.box;
	const entries = entriesOf(scene.window.transform);
	const middle = new Vector2(view.left + view.width * HALF, view.top + view.height * HALF);
	const standing = boxAround(frame, pictureReachOf(view, scene.camera.cut));
	const asTheWindow = {
		box: clearRound(seenOf(standing, entries, middle, frame)),
		matrix: new Matrix4().fromArray(ENTRIES.map((entry) => entries[entry])),
		middle
	};
	const asTheFrame = { box: frame, matrix: UNMOVED, middle: new Vector2() };
	return new Map([
		['ground', asTheFrame],
		['window', asTheWindow],
		['frame', asTheFrame]
	]);
}

/**
 * The part of a box on the window's plane the frame shows: the frame's corners seen back onto the plane, through the
 * matrix that carries it about its middle; the whole box where a corner sees past the plane's horizon, where nothing of
 * it stands before the eye, or where the eye sees the plane edge-on.
 * @param {Box} standing @param {Matrix} entries @param {Vector2} middle @param {Box} frame @returns {Box}
 */
function seenOf(standing, entries, middle, frame) {
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
	const corners = cornersOf(frame).map((corner) =>
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
 * How far the camera's picture reaches on the window's plane: the view's box, past each edge as far as its cut stands
 * out, as a window on the frame's edge shows the screen past it.
 * @param {Box} view @param {DrawnScene['camera']['cut']} cut @returns {Box}
 */
function pictureReachOf(view, cut) {
	return {
		left: view.left + cut.left,
		top: view.top + cut.top,
		width: view.width - cut.left - cut.right,
		height: view.height - cut.top - cut.bottom
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
 * side over.
 * @param {number} frameWidth @param {number} frameHeight
 */
function placedSurfaceOf(frameWidth, frameHeight) {
	const geometry = new BufferGeometry();
	geometry.setAttribute('position', new BufferAttribute(SURFACE_TRIANGLES, CORNER_VALUES));
	const material = new ShaderMaterial({
		uniforms: {
			surface: { value: null },
			placing: { value: new Matrix4() },
			middle: { value: new Vector2() },
			boxCorner: { value: new Vector2() },
			boxSize: { value: new Vector2() },
			frame: { value: new Vector2(frameWidth, frameHeight) }
		},
		vertexShader: PLACED_VERTEX,
		fragmentShader: PLACED_FRAGMENT,
		side: DoubleSide,
		...LAID_OVER
	});
	return standingAlone(new Mesh(geometry, material));
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

/** The frame, its exposures added up, drawn on the canvas as it is. @param {WebGLRenderTarget} frame */
function shownMaterial(frame) {
	return new ShaderMaterial({
		uniforms: { drawn: { value: frame.texture } },
		vertexShader: OVER_THE_WHOLE_VERTEX,
		fragmentShader: SHOWN_FRAGMENT,
		blending: NoBlending,
		depthTest: false,
		depthWrite: false
	});
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
 * The plane a surface is drawn on set to draw a texture, placed so.
 * @param {Mesh<BufferGeometry, ShaderMaterial>} plane @param {SurfaceTexture} texture @param {Placing} placing
 */
function placedAs(plane, texture, placing) {
	valuesSet(plane.material, {
		surface: texture.texture,
		placing: placing.matrix,
		middle: placing.middle,
		boxCorner: new Vector2(placing.box.left, placing.box.top),
		boxSize: new Vector2(placing.box.width, placing.box.height)
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

/** @type {RoomApi} */
const ROOM_API = {
	setup: (layout) => {
		laidOut = new Room(layout);
	},
	compose: (scenes) => {
		if (laidOut === null) throw new Error('the room composes a frame before it is laid out');
		return laidOut.compose(scenes);
	}
};
window.room = ROOM_API;
