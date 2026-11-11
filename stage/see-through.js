// @ts-check
/**
 * What the eye sees through in the room's one scene (`stage/room.js`): the page where it fades or is still coming up
 * and a thing or markup stands in the world beside it, a film's things whose material writes no depth, and markup
 * standing in the world. The lens reads one depth a pixel, and what is seen through shows two things at a pixel,
 * itself and what stands behind it: drawn in the world with the rest, a thing of glass was blurred by the depth of
 * what stood behind it, and a fading page, which writes its depth, hid what of such a thing stood behind it and had
 * what stood behind it blurred as the page. So what is seen through is drawn as fields of its own, each blurred by the
 * lens by its own depth and laid over the last, over the field of what writes depth: drawn over that field's depth, so
 * what stands behind an opaque surface stays hidden, with a depth of its own, that of the nearest surface it holds,
 * which the lens blurs all of it by.
 *
 * A film's things seen through and markup stand in fields apart, as they are laid by two laws: a film's light in linear
 * light, as three lays one thing over another, and markup, the page seen through with it, as the browser lays it
 * (`stage/laying.js`). Of the two, the farther is laid first (`kindsFartherFirst` in `stage/room.js`). Within its field
 * markup is laid by its law too: drawn in the screen's colours, as the browser drew it, three lays its surfaces over one
 * another there as the browser lays them, and the field is turned into light once drawn, for the lens. The page lies
 * alone in its field with the window's glass over it, both drawn as light, the glass a film's light laid over the page
 * as three lays a coat, so its reflection past white stays whole for the glow; the field is laid as the browser lays
 * the page. Drawn with the page in its field, markup before it had the page under its faint shadow blurred by the
 * shadow's depth, not the page's: a title in focus before a page blurred by the focus left a band of the page sharp
 * under its shadow, cut hard where the shadow ends (a probe film, `w-titles` at 1.8 s, 2026-11-11).
 *
 * Nothing seen through writes depth, so it is laid in the order it is drawn, and three draws whole meshes, the farthest
 * first: a thing passing through the fading page would be laid wholly over the page or wholly under it. So where the
 * page is seen through, what is seen through beside it is cut at its plane, and drawn as fields behind the page; then
 * the page, and what stands before it. Drawn as one field, the nearest surface's depth was the page's where what stood
 * behind showed through it: a title in the world behind a half-faded page in focus was sharp where it was seen through
 * the page and blurred beside it (a probe film, `w-titles` at 1.3 s, 2026-11-11). A mesh's own faces three lays in the
 * order of its materials, so a box of six see-through materials lays a back face drawn after a front face over it; one
 * material drawn on both sides is laid its back faces first.
 *
 * Which field a part of the world is drawn in is told by three's layers, which a camera draws one or more of at a time:
 * the world's lights are in all of them, as three lights a part only by lights in its own.
 */
import { DepthTexture, DoubleSide, MeshBasicMaterial, Plane, Vector3, WebGLRenderTarget } from 'three';
import { sceneFieldOf } from './lens.js';
import { DEPTH_WRITTEN, SRGB_CURVES, WRITTEN, drawnInto, passOver, valuesSet } from './passes.js';
import { isDrawnPart, materialsOf } from './things.js';
/** @import { Camera, Matrix4, Object3D, RenderTargetOptions, Scene, WebGLRenderer } from 'three' */
/** @import { Laying } from './laying.js' */
/** @import { SceneField } from './lens.js' */

/**
 * The parts of the world the room draws apart, each a layer of three's: what writes depth; a film's things seen
 * through; markup standing in the world; the page where it is seen through, and the glass over it; the depth alone of
 * markup, where it is drawn; and the depth alone of the page seen through.
 * @typedef {'opaque' | 'thingsSeenThrough' | 'surfacesSeenThrough' | 'pageSeenThrough' | 'surfacesDepth' | 'pageDepth'} WorldPart
 */
/** @type {{ readonly [Part in WorldPart]: number }} */
export const WORLD_PARTS = {
	opaque: 0,
	thingsSeenThrough: 1,
	surfacesSeenThrough: 2,
	pageSeenThrough: 3,
	surfacesDepth: 4,
	pageDepth: 5
};
/**
 * What is seen through beside the page, cut at its plane where it is seen through, each kind in fields of its own: a
 * film's things, and markup.
 * @typedef {'thingsSeenThrough' | 'surfacesSeenThrough'} BesideThePage
 */
/** Every kind seen through beside the page. @type {readonly BesideThePage[]} */
export const BESIDE_THE_PAGE = ['thingsSeenThrough', 'surfacesSeenThrough'];
// What of a thing of the film's is seen through beside the page: its parts seen through, or nothing
/** @type {readonly BesideThePage[]} */
const THINGS_SEEN_THROUGH = ['thingsSeenThrough'];
/** @type {readonly BesideThePage[]} */
const NOTHING_SEEN_THROUGH = [];
/**
 * What a field of what is seen through holds: the page, with the window's glass over it, or a kind seen through beside
 * the page.
 * @typedef {'pageSeenThrough' | BesideThePage} SeenThroughHolding
 */
/**
 * How what each field holds is drawn into it, in the screen's colours or as light, and how the field is laid over what
 * lies under it, as the browser lays it or in linear light. Markup is drawn as the browser drew it, so three lays its
 * surfaces over one another as the browser lays them (`OBJECTS_SURFACE_FRAGMENT` in `stage/room.js`), and is laid so. A
 * film's things are its light. The page is laid as markup is: its fade is the stylesheet's, and laid in linear light
 * over what stood behind it, a half-faded page over a glass cube read 13.27 levels off the old room, which laid its
 * layers in the screen's colours, on average over 900 × 560 pixels of a 3840 still, and 1.79 laid so (a probe film,
 * `see` at 1.8 s, 2026-11-11); it is drawn as light, as the glass over it is drawn as a film's light. The share the
 * window's shade fades it by the page's surface lays in light itself, from what the room has laid behind it
 * (`stage/page-picture.js`): the field holds the page as clear as its screen has come up, and the browser's law lays
 * that alone.
 * @type {{ readonly [Holding in SeenThroughHolding]: { readonly inTheScreensColours: boolean, readonly laid: Laying } }}
 */
const DRAWN = {
	pageSeenThrough: { inTheScreensColours: false, laid: 'asTheBrowser' },
	thingsSeenThrough: { inTheScreensColours: false, laid: 'linearly' },
	surfacesSeenThrough: { inTheScreensColours: true, laid: 'asTheBrowser' }
};

/**
 * A field of what is seen through: what it holds, the planes that cut it, none where the page is not seen through or
 * it holds the page, and how it is laid over what lies under it.
 * @typedef {{
 *   readonly holding: SeenThroughHolding,
 *   readonly cut: readonly Plane[],
 *   readonly laid: Laying
 * }} SeenThroughField
 */

// A layer before it is first sized
const A_PIXEL = 1;
// The eye, where the room's camera stands, at the middle of its own space; and three points of the page's square, its
// middle and a step across and up from it, which its plane passes through
const THE_EYE = new Vector3();
const SQUARES_MIDDLE = new Vector3(0, 0, 0);
const ACROSS_THE_SQUARE = new Vector3(1, 0, 0);
const UP_THE_SQUARE = new Vector3(0, 1, 0);
// A point on the eye's side of a plane stands at more than none from it
const ON_ITS_PLANE = 0;
// No plane cuts what is drawn
const UNCUT = /** @type {Plane[]} */ ([]);

// The opaque field's depth written as it stands, over all the field holds, its light none
const DEPTH_COPIED_FRAGMENT = `
uniform sampler2D depth;
varying vec2 shareOfTheFrame;
void main() {
	gl_FragDepth = texture2D(depth, shareOfTheFrame).x;
	gl_FragColor = vec4(0.0);
}`;
// The layer's light, drawn in the screen's colours, turned into light, each premultiplied
const IN_LIGHT_FRAGMENT = `
uniform sampler2D drawn;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	gl_FragColor = inLinearLight(texture2D(drawn, shareOfTheFrame));
}`;

/** The layer each field of what is seen through is drawn into in turn, what draws its depth, and what turns its light. */
export class SeeThroughLayer {
	/**
	 * @param {RenderTargetOptions} drawnAs how the room draws three's layers, as the opaque field is drawn
	 * @param {RenderTargetOptions} turnedAs how the room holds light past white in a layer of a sample a pixel
	 */
	constructor(drawnAs, turnedAs) {
		this.layer = new WebGLRenderTarget(A_PIXEL, A_PIXEL, {
			...drawnAs,
			depthTexture: new DepthTexture(A_PIXEL, A_PIXEL)
		});
		// A field drawn in the screen's colours turned into light, as the lens reads it
		this.turned = new WebGLRenderTarget(A_PIXEL, A_PIXEL, turnedAs);
		this.intoLight = passOver({ drawn: { value: this.layer.texture } }, IN_LIGHT_FRAGMENT, WRITTEN);
		this.depthCopied = passOver({ depth: { value: null } }, DEPTH_COPIED_FRAGMENT, DEPTH_WRITTEN);
		// Depth alone, of either side of a face, drawn in place of a see-through thing's own material
		this.depthAlone = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide });
	}

	/**
	 * A field of what is seen through drawn into the layer from the world's scene, seen by its camera, over the opaque
	 * field's depth, cut as the field has it: the light of what it holds, in the colours it is drawn in, then its depth,
	 * its nearest surface's. The field as the lens reads it: its light, turned into light where it was drawn in
	 * the screen's colours, and its depth.
	 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {WebGLRenderTarget} opaque
	 * @param {SeenThroughField} field @returns {SceneField}
	 */
	drawn(renderer, world, seen, opaque, field) {
		renderer.setRenderTarget(this.layer);
		renderer.clear();
		valuesSet(this.depthCopied.material, { depth: opaque.depthTexture });
		drawnInto(renderer, this.depthCopied, this.layer);
		renderer.clippingPlanes = [...field.cut];
		partsDrawn(renderer, world, seen, [field.holding]);
		this.depthDrawn(renderer, world, seen, field.holding);
		renderer.clippingPlanes = UNCUT;
		if (!DRAWN[field.holding].inTheScreensColours) return sceneFieldOf(this.layer.texture, this.layer);
		this.turned.setSize(this.layer.width, this.layer.height);
		drawnInto(renderer, this.intoLight, this.turned);
		return sceneFieldOf(this.turned.texture, this.layer);
	}

	/**
	 * The depth alone of what a field holds drawn: the page's, its own surface of depth; a film's thing's in a material
	 * that writes depth alone, in place of its own; markup's, its own surface of depth.
	 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {SeenThroughHolding} holding
	 */
	depthDrawn(renderer, world, seen, holding) {
		switch (holding) {
			case 'pageSeenThrough':
				partsDrawn(renderer, world, seen, ['pageDepth']);
				return;
			case 'thingsSeenThrough':
				world.overrideMaterial = this.depthAlone;
				partsDrawn(renderer, world, seen, ['thingsSeenThrough']);
				world.overrideMaterial = null;
				return;
			case 'surfacesSeenThrough':
				partsDrawn(renderer, world, seen, ['surfacesDepth']);
		}
	}
}

/**
 * The fields what is seen through is drawn as, the lowest first, each kind beside the page in fields of its own, in
 * the order named: where the page is not seen through, a field of each; where it is, a field of each behind the page's
 * plane, then the page with its glass, then a field of each before it. Each field is one run of the lens more.
 * @param {Matrix4 | null} page the matrix that places the page's square, where the page is seen through
 * @param {readonly BesideThePage[]} beside the kinds seen through beside the page, in the order they are laid
 * @returns {readonly SeenThroughField[]}
 */
export function seenThroughFieldsOf(page, beside) {
	if (page === null) return beside.map((kind) => fieldOf(kind, UNCUT));
	const behind = new Plane().setFromCoplanarPoints(
		SQUARES_MIDDLE.clone().applyMatrix4(page),
		ACROSS_THE_SQUARE.clone().applyMatrix4(page),
		UP_THE_SQUARE.clone().applyMatrix4(page)
	);
	if (behind.distanceToPoint(THE_EYE) > ON_ITS_PLANE) behind.negate();
	const before = [behind.clone().negate()];
	return [
		...beside.map((kind) => fieldOf(kind, [behind])),
		fieldOf('pageSeenThrough', UNCUT),
		...beside.map((kind) => fieldOf(kind, before))
	];
}

/**
 * A field holding the page or a kind seen through beside it, cut by the planes named, laid as what it holds is.
 * @param {SeenThroughHolding} holding @param {readonly Plane[]} cut @returns {SeenThroughField}
 */
function fieldOf(holding, cut) {
	return { holding, cut, laid: DRAWN[holding].laid };
}

/**
 * Parts of the world's scene drawn, as the camera sees them: the camera set to see those parts alone, as every draw
 * with a camera sets the parts it sees.
 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {readonly WorldPart[]} parts
 */
export function partsDrawn(renderer, world, seen, parts) {
	seen.layers.disableAll();
	for (const part of parts) seen.layers.enable(WORLD_PARTS[part]);
	renderer.render(world, seen);
}

/**
 * Each part of a thing of the film's put in the part of the world it is drawn in: seen through where a material of it
 * writes no depth. A film's module may set its materials anew each exposure, so it is sorted each exposure.
 * @param {Object3D} thing
 */
export function sortedBySeeingThrough(thing) {
	thing.traverse((part) => part.layers.set(WORLD_PARTS[isSeenThrough(part) ? 'thingsSeenThrough' : 'opaque']));
}

/**
 * What of a thing of the film's is seen through beside the page: its parts seen through, where it has any.
 * @param {Object3D} thing @returns {readonly BesideThePage[]}
 */
export function seenThroughIn(thing) {
	/** @type {Object3D[]} */
	const parts = [];
	thing.traverse((part) => parts.push(part));
	return parts.some(isSeenThrough) ? THINGS_SEEN_THROUGH : NOTHING_SEEN_THROUGH;
}

/** Whether three draws a part seen through: a material of it writes no depth. @param {Object3D} part */
function isSeenThrough(part) {
	return isDrawnPart(part) && materialsOf(part).some((material) => !material.depthWrite);
}
