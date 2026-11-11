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
 * light, as three lays one thing over another, and markup as the browser lays it (`stage/laying.js`). Of the two, the
 * farther is laid first (`kindsFartherFirst` in `stage/room.js`).
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
import { Camera, DepthTexture, DoubleSide, MeshBasicMaterial, Plane, Vector3, WebGLRenderTarget } from 'three';
import { DEPTH_WRITTEN, passOver, valuesSet } from './passes.js';
import { isDrawnPart, materialsOf } from './things.js';
/** @import { Matrix4, Object3D, RenderTargetOptions, Scene, WebGLRenderer } from 'three' */
/** @import { Laying } from './laying.js' */

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
// How each kind beside the page is laid over what lies under it: a film's things in linear light, markup as the
// browser lays it
/** @type {{ readonly [Kind in BesideThePage]: Laying }} */
const LAID = { thingsSeenThrough: 'linearly', surfacesSeenThrough: 'asTheBrowser' };
// The page seen through laid as a film's light is, in linear light: alone over the ground, the room lays it in the
// screen's colours as it lays the world over the exposure, a half-faded page within a level of the old room's laying
// at the same spot (a probe film, `w-fade` at 1.2 s, 2026-11-11). The first kind beside the page before it shares its
// field where it is laid alike
/** @type {Laying} */
const THE_PAGE_LAID = 'linearly';

/**
 * A field of what is seen through: whether it holds the page, which kind beside the page it holds, none or one, the
 * planes that cut that, none where the page is not seen through, and how the field is laid over what lies under it.
 * @typedef {{
 *   readonly withThePage: boolean,
 *   readonly beside: readonly BesideThePage[],
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

/** The layer each field of what is seen through is drawn into in turn, and what draws its depth. */
export class SeeThroughLayer {
	/** @param {RenderTargetOptions} drawnAs how the room draws three's layers, as the opaque field is drawn */
	constructor(drawnAs) {
		this.layer = new WebGLRenderTarget(A_PIXEL, A_PIXEL, {
			...drawnAs,
			depthTexture: new DepthTexture(A_PIXEL, A_PIXEL)
		});
		this.depthCopied = passOver({ depth: { value: null } }, DEPTH_COPIED_FRAGMENT, DEPTH_WRITTEN);
		// Depth alone, of either side of a face, drawn in place of a see-through thing's own material
		this.depthAlone = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide });
		// three draws nothing without a camera; the depth's pass places its own points
		this.camera = new Camera();
	}

	/**
	 * A field of what is seen through drawn into the layer from the world's scene, seen by its camera, over the opaque
	 * field's depth: its light, the page's first where it holds the page, then what it holds beside the page, cut as the
	 * field has it; then its own depth, its nearest surface's.
	 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {WebGLRenderTarget} opaque
	 * @param {SeenThroughField} field
	 */
	drawn(renderer, world, seen, opaque, field) {
		renderer.setRenderTarget(this.layer);
		renderer.clear();
		valuesSet(this.depthCopied.material, { depth: opaque.depthTexture });
		renderer.render(this.depthCopied, this.camera);
		if (field.withThePage) partsDrawn(renderer, world, seen, ['pageSeenThrough']);
		renderer.clippingPlanes = [...field.cut];
		partsDrawn(renderer, world, seen, field.beside);
		renderer.clippingPlanes = UNCUT;
		if (field.withThePage) partsDrawn(renderer, world, seen, ['pageDepth']);
		renderer.clippingPlanes = [...field.cut];
		for (const kind of field.beside) this.depthDrawn(renderer, world, seen, kind);
		renderer.clippingPlanes = UNCUT;
	}

	/**
	 * The depth alone of a kind seen through beside the page drawn: a film's thing's in a material that writes depth
	 * alone, in place of its own; markup's, its own surface of depth.
	 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {BesideThePage} kind
	 */
	depthDrawn(renderer, world, seen, kind) {
		switch (kind) {
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
 * plane, then the page and, before it, the first kind where it is laid as the page is, in linear light, and a field of
 * each other kind. Each field is one run of the lens more.
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
	const [first] = beside;
	const withThePage = first !== undefined && LAID[first] === THE_PAGE_LAID ? [first] : [];
	const thePage = { withThePage: true, beside: withThePage, cut: before, laid: THE_PAGE_LAID };
	const besideBefore = beside.slice(withThePage.length).map((kind) => fieldOf(kind, before));
	return [...beside.map((kind) => fieldOf(kind, [behind])), thePage, ...besideBefore];
}

/**
 * A field of a kind seen through beside the page alone, cut by the planes named, laid as its kind is.
 * @param {BesideThePage} kind @param {readonly Plane[]} cut @returns {SeenThroughField}
 */
function fieldOf(kind, cut) {
	return { withThePage: false, beside: [kind], cut, laid: LAID[kind] };
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
