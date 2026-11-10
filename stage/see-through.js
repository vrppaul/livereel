// @ts-check
/**
 * What the eye sees through in the room's one scene (`stage/room.js`): the page where it fades or is still coming up
 * and a film's thing stands in the world to be seen through it, and a film's things whose material writes no depth. The lens reads one depth a pixel, and what is seen through shows
 * two things at a pixel, itself and what stands behind it: drawn in the world with the rest, a thing of glass was
 * blurred by the depth of what stood behind it, and a fading page, which writes its depth, hid what of such a thing
 * stood behind it and had what stood behind it blurred as the page. So the world is drawn as two fields, each blurred
 * by the lens by its own depth and laid over the last: what writes depth; and over it what is seen through, drawn over
 * the first field's depth, so what stands behind an opaque surface stays hidden, with a depth of its own, that of the
 * nearest surface it holds, which the lens blurs all of it by.
 *
 * Nothing in the see-through field writes depth, so it is laid in the order it is drawn, and three draws whole meshes,
 * the farthest first: a thing passing through the fading page would be laid wholly over the page or wholly under it. So
 * its things are drawn twice, cut at the page's plane: what stands behind the page, then the page, then what stands
 * before it. A mesh's own faces three lays in the order of its materials, so a box of six see-through materials lays a
 * back face drawn after a front face over it; one material drawn on both sides is laid its back faces first.
 *
 * Which field a part of the world is drawn in is told by three's layers, which a camera draws one or more of at a time:
 * the world's lights are in all of them, as three lights a part only by lights in its own.
 */
import { Camera, DepthTexture, DoubleSide, MeshBasicMaterial, Plane, Vector3, WebGLRenderTarget } from 'three';
import { DEPTH_WRITTEN, passOver, valuesSet } from './passes.js';
import { isDrawnPart, materialsOf } from './things.js';
/** @import { Matrix4, Object3D, RenderTargetOptions, Scene, WebGLRenderer } from 'three' */

/**
 * The parts of the world the room draws apart, each a layer of three's: what writes depth; a film's things seen
 * through; the page where it is seen through, and the glass over it; and the page's depth alone, where it is.
 * @typedef {'opaque' | 'thingsSeenThrough' | 'pageSeenThrough' | 'pageDepth'} WorldPart
 */
/** @type {{ readonly [Part in WorldPart]: number }} */
export const WORLD_PARTS = { opaque: 0, thingsSeenThrough: 1, pageSeenThrough: 2, pageDepth: 3 };

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

/** The see-through field: its layer, and what draws its depth. */
export class SeeThroughField {
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
	 * The see-through field drawn into its layer from the world's scene, seen by its camera: over the opaque field's
	 * depth, its things, cut at the page's plane where the page is seen through, so the page lies between what stands
	 * behind it and what stands before it; then its own depth, its nearest surface's.
	 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {WebGLRenderTarget} opaque
	 * @param {Matrix4 | null} page the matrix that places the page's square, where the page is seen through
	 */
	drawn(renderer, world, seen, opaque, page) {
		renderer.setRenderTarget(this.layer);
		renderer.clear();
		valuesSet(this.depthCopied.material, { depth: opaque.depthTexture });
		renderer.render(this.depthCopied, this.camera);
		if (page === null) partDrawn(renderer, world, seen, 'thingsSeenThrough');
		else seenThroughThePage(renderer, world, seen, page);
		world.overrideMaterial = this.depthAlone;
		partDrawn(renderer, world, seen, 'thingsSeenThrough');
		world.overrideMaterial = null;
		partDrawn(renderer, world, seen, 'pageDepth');
	}
}

/**
 * A part of the world's scene drawn, as the camera sees it: the camera set to see that part alone, as every draw with
 * a camera sets the parts it sees.
 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {WorldPart} part
 */
export function partDrawn(renderer, world, seen, part) {
	seen.layers.set(WORLD_PARTS[part]);
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

/** Whether a part of a thing of the film's is seen through. @param {Object3D} thing */
export function hasAPartSeenThrough(thing) {
	/** @type {Object3D[]} */
	const parts = [];
	thing.traverse((part) => parts.push(part));
	return parts.some(isSeenThrough);
}

/**
 * The see-through things drawn behind the page's plane, then the page and its glass, then the things before it.
 * @param {WebGLRenderer} renderer @param {Scene} world @param {Camera} seen @param {Matrix4} page
 */
function seenThroughThePage(renderer, world, seen, page) {
	const behind = new Plane().setFromCoplanarPoints(
		SQUARES_MIDDLE.clone().applyMatrix4(page),
		ACROSS_THE_SQUARE.clone().applyMatrix4(page),
		UP_THE_SQUARE.clone().applyMatrix4(page)
	);
	if (behind.distanceToPoint(THE_EYE) > ON_ITS_PLANE) behind.negate();
	renderer.clippingPlanes = [behind];
	partDrawn(renderer, world, seen, 'thingsSeenThrough');
	renderer.clippingPlanes = UNCUT;
	partDrawn(renderer, world, seen, 'pageSeenThrough');
	renderer.clippingPlanes = [behind.clone().negate()];
	partDrawn(renderer, world, seen, 'thingsSeenThrough');
	renderer.clippingPlanes = UNCUT;
}

/** Whether three draws a part seen through: a material of it writes no depth. @param {Object3D} part */
function isSeenThrough(part) {
	return isDrawnPart(part) && materialsOf(part).some((material) => !material.depthWrite);
}
