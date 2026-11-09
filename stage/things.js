// @ts-check
/**
 * A film's own things in the room (`src/props/thing.ts`): each built once by the film's module from the stage's own
 * three, never a copy of the film's, so its objects and the room's renderer agree, then set whole from its numbers and
 * how far it has come up every exposure, and drawn alone into a layer of its own, with a depth of its own, so its own
 * faces hide one another as the eye sees them, and a thing in the world hides behind the page's window point by point.
 *
 * The engine places it, as it places the window: by the matrix that carries a point of it to the frame's pixels up from
 * its box's middle, seen from the eye, which keeps how far each point stands as the fourth value it divides by, written
 * in three's own axes on both sides so its faces turn as three's do. So no camera of three's stands here: the
 * projection carries that matrix's frame pixels onto the box of the frame a layer holds, and keeps a depth that grows
 * with how far a point stands from the eye, from a pixel before it to as far past the frame as the eye stands before
 * it, many times over; the window's plane is kept in the same depth (`depthRowOf`), so the two hide one another.
 *
 * Its module keeps no state and reads no clock: what it draws is a function of the numbers handed it, as a still at a
 * moment drawn twice is its check. What it throws loading, building or setting a thing is the film's, said so.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnThing } from '../src/props/thing.ts' */
/** @import { Box } from '../src/domain/geometry.ts' */
/** @import { ThingsLoaded } from '../src/adapters/browser/room.ts' */

/**
 * How a film's module builds a thing and sets it: `build` makes its three objects from the stage's three, once;
 * `set` sets them whole from its numbers and how far it has come up, from 0 to 1, every exposure, with the stage's
 * three for what it makes anew, a colour or a vector.
 * @typedef {{
 *   readonly build: (three: typeof THREE) => THREE.Object3D,
 *   readonly set: (built: THREE.Object3D, values: Readonly<Record<string, number>>, shown: number, three: typeof THREE) => void
 * }} ThingBuilder
 */

/** A thing among the objects a scene draws: its name, and what it shows. @typedef {DrawnObject & { readonly content: DrawnThing }} ThingObject */

/** How a thing stands built: the name it was built by, the group the engine's matrix places, and its own objects. @typedef {{ readonly made: string, readonly placed: THREE.Group, readonly built: THREE.Object3D }} Standing */

// The name a module's default export stands under, and what a builder holds; and what the film is told where its
// things module exports no builders there
const DEFAULT_EXPORT = 'default';
const BUILDS = 'build';
const SETS = 'set';
const NO_BUILDERS =
	"the film's things module exports no builders by default: export default { card: { build(three) {...}, set(built, values, shown, three) {...} } }";
// How near the eye the nearest depth a layer keeps stands, in the frame's pixels; and how many times as far past the
// frame as the eye stands before it the farthest stands
const NEAREST = 1;
const FARTHEST_IN_EYE_DISTANCES = 100;
// WebGL's clip space, from -1 to 1 each way: its left and bottom, its right and top, and its span; the depth it keeps
// runs from the near end to the far
const CLIP_FROM = -1;
const CLIP_TO = 1;
const CLIP_SPAN = CLIP_TO - CLIP_FROM;
const NEAR_END = CLIP_FROM;
const FAR_END = CLIP_TO;
// Where each column of a 4 × 4 matrix starts among its elements, as three keeps them a column at a time, and the rows
// of clip space's across, up and depth within a column; the fourth row, what a point is divided by, is kept as it is
const COLUMN_FIRST = 0;
const COLUMN_SECOND = 4;
const COLUMN_THIRD = 8;
const COLUMN_FOURTH = 12;
const ROW_ACROSS = 0;
const ROW_UP = 1;
const ROW_DEPTH = 2;
// A box's middle stands half way across and down it; and the frame's plane, where a thing's box lies
const HALVES = 2;
const ON_THE_FRAMES_PLANE = 0;

/** The film's things: its module's builders, and each thing built, by its name, with the name it was built by. */
export class Things {
	constructor() {
		/** The builders of the film's module, by the name a thing is built by; none where it names none @type {Readonly<Record<string, ThingBuilder>>} */
		this.builders = {};
		/** Each thing built, by the object's name @type {Map<string, Standing>} */
		this.built = new Map();
		this.scene = new THREE.Scene();
		this.camera = new THREE.Camera();
	}

	/**
	 * The film's module loaded, its default export the builders by name: the names it builds a thing by, or what the
	 * film is told where it fails to load or exports no builders.
	 * @param {string} address @returns {Promise<ThingsLoaded>}
	 */
	async loaded(address) {
		try {
			/** @type {unknown} */
			const module = await import(address);
			const builders = valueOf(module, DEFAULT_EXPORT);
			if (!areBuilders(builders)) return { kind: 'refused', said: NO_BUILDERS };
			this.builders = builders;
			return { kind: 'built', names: Object.keys(builders) };
		} catch (fault) {
			return { kind: 'refused', said: `the film's things module failed to load: ${String(fault)}` };
		}
	}

	/**
	 * A thing drawn into the layer the renderer draws into, which holds a box of the frame, set from its numbers and
	 * placed where its scene has it, over what depth the layer keeps; what the film is told where its module throws
	 * building or setting it, none where it draws.
	 * @param {THREE.WebGLRenderer} renderer @param {ThingObject} thing @param {Box} drawn @returns {string | null}
	 */
	drawn(renderer, thing, drawn) {
		const made = thing.content.made;
		/** @type {Standing} */
		let standing;
		try {
			standing = this.standingFor(thing);
			this.builderOf(made).set(standing.built, thing.content.values, thing.content.shown, THREE);
		} catch (fault) {
			return `the film's things module failed building or setting ${made}: ${String(fault)}`;
		}
		standing.placed.matrix.copy(placedAbout(thing));
		standing.placed.matrixWorldNeedsUpdate = true;
		this.camera.projectionMatrix.copy(projectionOnto(drawn, thing.content.eyeDistance));
		this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
		this.scene.clear();
		this.scene.add(standing.placed);
		renderer.render(this.scene, this.camera);
		return null;
	}

	/**
	 * The thing as it stands: its objects, built by its builder the first time it is drawn, or anew where it is built by
	 * another, the old ones let go, inside a group the engine's matrix places, so what its module turns or moves of them
	 * it does in the thing's own space.
	 * @param {ThingObject} thing @returns {Standing}
	 */
	standingFor(thing) {
		const made = thing.content.made;
		const standing = this.built.get(thing.name);
		if (standing !== undefined && standing.made === made) return standing;
		if (standing !== undefined) letGo(standing.built);
		const placed = new THREE.Group();
		placed.matrixAutoUpdate = false;
		const built = this.builderOf(made).build(THREE);
		placed.add(built);
		const madeNow = { made, placed, built };
		this.built.set(thing.name, madeNow);
		return madeNow;
	}

	/** @param {string} made */
	builderOf(made) {
		const builder = this.builders[made];
		if (builder === undefined) throw new Error(`the film's things module builds no ${made}`);
		return builder;
	}
}

/**
 * The row a projection keeps depth by, for an eye standing so far before the frame in its pixels: the point's out, how
 * far before the frame it stands, over its fourth value, `eyeDistance × (1 − w) / w`, grows as it nears, so the depth
 * is the reverse of it, set to meet the ends a pixel before the eye and far past the frame.
 * @param {number} eyeDistance @returns {{ readonly outward: number, readonly kept: number }}
 */
export function depthRowOf(eyeDistance) {
	const farthest = eyeDistance * FARTHEST_IN_EYE_DISTANCES;
	const squared = eyeDistance * eyeDistance;
	const outward = (NEAR_END - FAR_END) / (squared * (1 / NEAREST - 1 / farthest));
	return { outward, kept: NEAR_END - (outward * squared) / NEAREST + outward * eyeDistance };
}

/** Whether an object a scene draws is a thing. @param {DrawnObject} object @returns {object is ThingObject} */
export function isAThing(object) {
	return object.content.kind === 'thing';
}

/**
 * Whether a film's module exports builders: an object of them by name, not a list, each with a `build` and a `set`,
 * and one at least.
 * @param {unknown} exported @returns {exported is Readonly<Record<string, ThingBuilder>>}
 */
function areBuilders(exported) {
	if (typeof exported !== 'object' || exported === null || Array.isArray(exported)) return false;
	const builders = Object.values(exported);
	return (
		builders.length > 0 &&
		builders.every(
			(builder) => typeof valueOf(builder, BUILDS) === 'function' && typeof valueOf(builder, SETS) === 'function'
		)
	);
}

/** What an object holds by a name, as read from what a film hands; none where it is no object. @param {unknown} held @param {string} name */
function valueOf(held, name) {
	return typeof held === 'object' && held !== null ? /** @type {Record<string, unknown>} */ (held)[name] : undefined;
}

/** Each geometry and material of what a module built let go of, as it is built anew. @param {THREE.Object3D} built */
function letGo(built) {
	built.traverse(partLetGo);
}

/** A part's geometry and materials let go of, where it is a mesh. @param {THREE.Object3D} part */
function partLetGo(part) {
	if (!(part instanceof THREE.Mesh)) return;
	const mesh = /** @type {THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>} */ (part);
	mesh.geometry.dispose();
	for (const material of [mesh.material].flat()) material.dispose();
}

/**
 * The matrix that carries a point of a thing to the frame's pixels up from its top, its fourth value how far it
 * stands: its placing about its box's middle, then moved to that middle, as far for each point as it divides by, so
 * the move holds once divided.
 * @param {ThingObject} thing
 */
function placedAbout(thing) {
	const middleAcross = thing.box.left + thing.box.width / HALVES;
	const middleUp = -(thing.box.top + thing.box.height / HALVES);
	return new THREE.Matrix4()
		.makeTranslation(middleAcross, middleUp, ON_THE_FRAMES_PLANE)
		.multiply(matrixOf(thing.content.placing));
}

/**
 * The projection that carries the frame's pixels up from its top, each with how far it stands from the eye as the
 * fourth value it is divided by, onto a layer holding a box of the frame, and keeps a depth from a pixel before the eye
 * to far past the frame (`depthRowOf`).
 * @param {Box} drawn @param {number} eyeDistance
 */
function projectionOnto(drawn, eyeDistance) {
	const depth = depthRowOf(eyeDistance);
	const projection = new THREE.Matrix4();
	projection.elements[COLUMN_FIRST + ROW_ACROSS] = CLIP_SPAN / drawn.width;
	projection.elements[COLUMN_FOURTH + ROW_ACROSS] = CLIP_FROM - (CLIP_SPAN * drawn.left) / drawn.width;
	projection.elements[COLUMN_SECOND + ROW_UP] = CLIP_SPAN / drawn.height;
	projection.elements[COLUMN_FOURTH + ROW_UP] = CLIP_TO + (CLIP_SPAN * drawn.top) / drawn.height;
	projection.elements[COLUMN_THIRD + ROW_DEPTH] = depth.outward;
	projection.elements[COLUMN_FOURTH + ROW_DEPTH] = depth.kept;
	return projection;
}
