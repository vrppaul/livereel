// @ts-check
/**
 * A film's own things in the room (`src/props/thing.ts`): each built once by the film's module from the stage's own
 * three, never a copy of the film's, so its objects and the room's renderer agree, then set whole from its numbers and
 * how far it has come up every exposure, and placed where the engine places it: by the matrix that carries a point of
 * it into the eye's own space, in three's axes, as the window is placed. One in the world stands in the room's one
 * scene with the window, its body and every other thing there, and the depth they share hides each behind another.
 *
 * Its module keeps no state and reads no clock: what it draws is a function of the numbers handed it, as a still at a
 * moment drawn twice is its check. What it throws loading, building or setting a thing is the film's, said so.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnThing } from '../src/props/thing.ts' */
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

/** The film's things: its module's builders, and each thing built, by its name, with the name it was built by. */
export class Things {
	constructor() {
		/** The builders of the film's module, by the name a thing is built by; none where it names none @type {Readonly<Record<string, ThingBuilder>>} */
		this.builders = {};
		/** Each thing built, by the object's name @type {Map<string, Standing>} */
		this.built = new Map();
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
	 * A thing posed for an exposure: built the first time, set from its numbers and how far it has come up, and placed
	 * where its scene has it; what the film is told where its module throws building or setting it, none where it
	 * stands.
	 * @param {ThingObject} thing @returns {string | null}
	 */
	posed(thing) {
		const made = thing.content.made;
		/** @type {Standing} */
		let standing;
		try {
			standing = this.standingFor(thing);
			this.builderOf(made).set(standing.built, thing.content.values, thing.content.shown, THREE);
		} catch (fault) {
			return `the film's things module failed building or setting ${made}: ${String(fault)}`;
		}
		standing.placed.matrix.copy(matrixOf(thing.content.inTheEyesSpace));
		standing.placed.matrixWorldNeedsUpdate = true;
		return null;
	}

	/** A thing as it was last posed. @param {ThingObject} thing @returns {Standing} */
	posedAs(thing) {
		const standing = this.built.get(thing.name);
		if (standing === undefined) throw new Error(`the room draws the thing ${thing.name} before it poses it`);
		return standing;
	}

	/**
	 * The thing as it stands: its objects, built by its builder the first time it is posed, or anew where it is built by
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

/** A part's geometry and materials let go of, where three draws it. @param {THREE.Object3D} part */
function partLetGo(part) {
	if (!isDrawnPart(part)) return;
	part.geometry.dispose();
	for (const material of [/** @type {THREE.Material | THREE.Material[]} */ (part.material)].flat()) material.dispose();
}

/**
 * Whether three draws a part, of a geometry and materials of its own: a mesh, lines or points.
 * @param {THREE.Object3D} part @returns {part is THREE.Mesh | THREE.Line | THREE.Points}
 */
function isDrawnPart(part) {
	return part instanceof THREE.Mesh || part instanceof THREE.Line || part instanceof THREE.Points;
}
