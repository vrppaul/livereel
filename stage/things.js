// @ts-check
/**
 * A film's own things in the room (`src/props/thing.ts`): each built once by the film's module from the stage's own
 * three, never a copy of the film's, so its objects and the room's renderer agree, then set whole from its numbers and
 * how far it has come up every exposure, and drawn alone into a layer of its own, with a depth of its own, so its own
 * faces hide one another as the eye sees them.
 *
 * A thing in the world is drawn in the two parts the page's window parts it into: before the window, what of it stands
 * nearer the eye than the window's surface where the surface stands, and all of it the eye sees past the surface's
 * edges; behind it, what stands behind the surface, and a sliver before it. The surface is drawn as depth before the
 * part before it, so the thing hides behind it as its own faces hide one another, its edge on the page smoothed as a
 * thing's own edges are. The part behind is cut by the surface's plane a sliver before it, face by face, so a
 * see-through thing keeps its far faces and one that writes no depth is cut as well; over it the surface wipes what
 * stands nearer than the sliver, for a shader of the film's that three does not cut, and all past the surface's edges
 * is wiped. The sliver lies under the part before, so where the two meet in a pixel the part behind fills it and the
 * part before is laid over: two layers each covering a share of a pixel, laid one over the other, would leave the
 * pixel short of whole and dark. The part before is cut by the plane a sliver behind it, for a material that tests no
 * depth.
 *
 * The engine places a thing and the window alike: by the matrix that carries a point into the eye's own space, in
 * three's axes, the eye at its middle looking down its z, as three's camera space is. So three's camera stands where
 * it stands of itself, and only its projection is the room's: a perspective from the eye onto the box of the frame a
 * layer holds, the frame's picture plane as far before the eye as the engine says.
 *
 * A thing in a lit material is lit by the world's lights and reflects its soft boxes (`src/props/lighting.ts`): the
 * lights stand in a group the matrix each thing carries takes from the room into the eye's own space that sees it; the
 * soft boxes are drawn once into what three reads reflections from, and the room's turn turns it, so a glint stays
 * where its box stands in the room.
 *
 * Its module keeps no state and reads no clock: what it draws is a function of the numbers handed it, as a still at a
 * moment drawn twice is its check. What it throws loading, building or setting a thing is the film's, said so.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnThing } from '../src/props/thing.ts' */
/** @import { DrawnLight, DrawnLighting, DrawnSoftBox } from '../src/props/lighting.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */
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

/**
 * The page window's surface a thing in the world is parted by, in the eye's own space: its plane, which keeps the
 * eye's side; and the matrix that carries a square of one side about its middle onto the surface, and its reverse.
 * @typedef {{ readonly plane: THREE.Plane, readonly surface: THREE.Matrix4, readonly fromTheSurface: THREE.Matrix4 }} WindowSurface
 */

/**
 * How much of a thing is drawn: all of it; its part before the window's surface; or its part behind it, and whether
 * the eye sees any of the thing past the surface's edges, where that part is wiped.
 * @typedef {{ readonly kind: 'whole' }
 *   | { readonly kind: 'before', readonly window: WindowSurface }
 *   | { readonly kind: 'behind', readonly window: WindowSurface, readonly pastTheEdges: boolean }} ThingPart
 */

/**
 * Which of the window's parts a thing is drawn in, and whether the eye sees any of it past the surface's edges.
 * @typedef {{ readonly before: boolean, readonly behind: boolean, readonly pastTheEdges: boolean }} Sides
 */

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
// A box's middle stands half way across and down it
const HALVES = 2;
// Where a point stands on the window's plane, on neither side of it; a thing of nothing drawn, in neither part; how far
// from its middle the edges of a square of one side stand; a sight along the plane, which never meets it; and how far
// out of the eye's space a point stands at the eye, past which it stands behind the eye, which sees it not
const ON_THE_PLANE = 0;
/** @type {Sides} */
const IN_NEITHER_PART = { before: false, behind: false, pastTheEdges: false };
const HALF_A_SIDE = 0.5;
const ALONG_THE_PLANE = 0;
const AT_THE_EYE = 0;
// The renderer cutting nothing away, as it draws all but a thing's parts
/** @type {THREE.Plane[]} */
const NOTHING_CUT = [];
// What marks a sample of a layer the window's surface covers, as the part behind it is wiped
const ON_THE_SURFACE = 1;
// How far past the window's surface each part reaches, in pixels of the frame as far off as the surface: as far as a
// face leant up to 63° from the eye goes toward it across a pixel, so the part behind fills the pixels it meets the
// part before in
const SLIVER_IN_PIXELS = 2;
// A sample written clear, of no colour and no light, where colour is written at all
const CLEAR = `
void main() {
	gl_FragColor = vec4(0.0);
}`;
// The window's surface where the eye sees it, by three's own matrices; and a square covering the whole of a layer
const SEEN_FROM_THE_EYE = `
void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const OVER_THE_WHOLE_LAYER = `
void main() {
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
// How wide and high WebGL's own space is, from -1 to 1 either way: a square as large covers the whole of a layer
const WEBGL_SPAN = 2;
// A light's strength as three takes it: three shades a white face square to a light by its strength over π, so a
// strength of 1 lights it its whole colour; a light reaching endlessly, as strong however far it reaches
const STRENGTH_IN_THREES = Math.PI;
const REACHES_ENDLESSLY = 0;
const NO_FALLOFF = 0;
// The soft boxes' reflections: drawn unblurred, rough faces blurring them as they read them; looked for from so near
// the room's middle, the boxes a unit off, to twice as far as the farthest corner of one; and kept so many pixels a
// side, coarser, a leaning soft box's edge reflecting in steps: a cube of half floats, about 67 MB on the card with
// its smaller copies, kept while the boxes stand
const UNBLURRED = 0;
const NEAREST_REFLECTED = 0.1;
const PAST_THE_FARTHEST = 2;
const REFLECTIONS_SHARPNESS = 1024;
// The world's lights or soft boxes an exposure hands where the film's look has none
const NONE_HANDED = JSON.stringify([]);
// A quarter-turn, in radians: half a half-turn
const QUARTER_TURN = Math.PI / HALVES;
// A spot across a soft box, from its left edge, 0, to its right, 1; and its glow there, its tint along its middle,
// falling off as the square of a cosine to nothing at its sides
const ACROSS_A_SOFT_BOX = `
varying vec2 across;
void main() {
	across = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const A_SOFT_BOXES_GLOW = `
uniform vec3 tint;
varying vec2 across;
void main() {
	float fromItsMiddle = abs(across.x - 0.5) * 2.0;
	float glow = cos(fromItsMiddle * ${QUARTER_TURN});
	gl_FragColor = vec4(tint * glow * glow, 1.0);
}`;

/** The film's things: its module's builders, and each thing built, by its name, with the name it was built by. */
export class Things {
	constructor() {
		/** The builders of the film's module, by the name a thing is built by; none where it names none @type {Readonly<Record<string, ThingBuilder>>} */
		this.builders = {};
		/** Each thing built, by the object's name @type {Map<string, Standing>} */
		this.built = new Map();
		this.scene = new THREE.Scene();
		this.camera = new THREE.Camera();
		const square = new THREE.PlaneGeometry();
		this.surfaceAsDepth = placedSquare(square, surfaceAsDepthMaterial());
		this.surfaceMarking = placedSquare(square, surfaceMarkingMaterial());
		this.surfaceWiping = placedSquare(square, surfaceWipingMaterial());
		this.pastTheSurfaceWiping = pastTheSurfaceWiping();
		const lightsPlaced = new THREE.Group();
		lightsPlaced.matrixAutoUpdate = false;
		/** The world's lights as last handed, and the group in the room they shine from @type {{ readonly of: string, readonly group: THREE.Group }} */
		this.lights = { of: NONE_HANDED, group: lightsPlaced };
		/** The soft boxes as last handed, and what faces reflect of them, drawn into a target of the card's: nothing, where none stands @type {{ readonly of: string, readonly target: THREE.WebGLRenderTarget | null }} */
		this.reflections = { of: NONE_HANDED, target: null };
	}

	/**
	 * The world's light an exposure's things are lit by, made anew only where it is not the one made already, as it
	 * stands while the look does: its lights set where they stand and aim in the room, and its soft boxes drawn into
	 * what faces reflect, so boxes that stand still are drawn once for the whole film.
	 * @param {THREE.WebGLRenderer} renderer @param {DrawnLighting} lighting
	 */
	lit(renderer, lighting) {
		const lights = JSON.stringify(lighting.lights);
		if (lights !== this.lights.of) this.lights = { of: lights, group: shiningFrom(this.lights.group, lighting.lights) };
		const softBoxes = JSON.stringify(lighting.softBoxes);
		if (softBoxes === this.reflections.of) return;
		this.reflections.target?.dispose();
		const target = lighting.softBoxes.length === 0 ? null : reflectionsOf(renderer, lighting);
		this.reflections = { of: softBoxes, target };
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

	/**
	 * Which of the window's parts a posed thing in the world is drawn in, by the box round all of it in the eye's own
	 * space: behind, where any of it stands behind the window's plane; before, where any of it stands before the plane,
	 * or where the eye sees any of it past the surface's edges, as the part before holds all that. Each box of its
	 * parts is counted anew, as its module's `set` may move their points.
	 * @param {ThingObject} thing @param {WindowSurface} window @returns {Sides}
	 */
	sidesOf(thing, window) {
		const placed = this.posedAs(thing).placed;
		placed.traverse(boxCountedAnew);
		const around = new THREE.Box3().setFromObject(placed);
		if (around.isEmpty()) return IN_NEITHER_PART;
		const corners = cornersOf(around);
		const distances = corners.map((corner) => window.plane.distanceToPoint(corner));
		const pastTheEdges = !corners.every((corner) => isSeenOnTheSurface(corner, window));
		return {
			before: pastTheEdges || distances.some((distance) => distance >= ON_THE_PLANE),
			behind: distances.some((distance) => distance < ON_THE_PLANE),
			pastTheEdges
		};
	}

	/**
	 * A posed thing drawn into the layer the renderer draws into, which holds a box of the frame: all of it; or its
	 * part before the window's surface, hidden behind the surface drawn first as depth and cut a sliver behind it; or
	 * its part behind it, cut a sliver before it, what stands nearer than the sliver wiped, and all past the surface's
	 * edges, where the eye sees any of the thing there.
	 * @param {THREE.WebGLRenderer} renderer @param {ThingObject} thing @param {Box} drawn @param {Box} frame
	 * @param {ThingPart} part
	 */
	drawn(renderer, thing, drawn, frame, part) {
		const eyeDistance = thing.content.eyeDistance;
		this.camera.projectionMatrix.copy(projectionOnto(drawn, frame, eyeDistance));
		this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
		this.scene.clear();
		this.scene.add(this.posedAs(thing).placed, this.lights.group);
		this.litAsSeenBy(thing);
		switch (part.kind) {
			case 'whole':
				renderer.render(this.scene, this.camera);
				return;
			case 'before':
				renderer.render(placedOn(this.surfaceAsDepth, part.window.surface), this.camera);
				renderer.clippingPlanes = [cutASliverPast(part.window, part.kind, eyeDistance)];
				renderer.render(this.scene, this.camera);
				renderer.clippingPlanes = NOTHING_CUT;
				return;
			case 'behind':
				renderer.clippingPlanes = [cutASliverPast(part.window, part.kind, eyeDistance)];
				renderer.render(this.scene, this.camera);
				renderer.clippingPlanes = NOTHING_CUT;
				renderer.render(placedOn(this.surfaceWiping, aSliverBefore(part.window, eyeDistance)), this.camera);
				if (!part.pastTheEdges) return;
				renderer.render(placedOn(this.surfaceMarking, part.window.surface), this.camera);
				renderer.render(this.pastTheSurfaceWiping, this.camera);
				return;
		}
	}

	/**
	 * The world's light placed as the eye that sees a thing sees the room, by the matrix the thing carries: its lights
	 * carried into that eye's own space, and what faces reflect turned as the room is, so a glint stays where its soft
	 * box stands in the room.
	 * @param {ThingObject} thing
	 */
	litAsSeenBy(thing) {
		const room = matrixOf(thing.content.roomInTheEyesSpace);
		const lights = this.lights.group;
		lights.matrix.copy(room);
		lights.matrixWorldNeedsUpdate = true;
		const target = this.reflections.target;
		this.scene.environment = target === null ? null : target.texture;
		this.scene.environmentRotation.setFromRotationMatrix(room);
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

/**
 * A part's box counted anew from its points as they stand, where three draws it: an instanced or batched mesh's own,
 * round all its copies, or else its geometry's, which three keeps from the first count otherwise.
 * @param {THREE.Object3D} part
 */
function boxCountedAnew(part) {
	if (part instanceof THREE.InstancedMesh || part instanceof THREE.BatchedMesh) part.computeBoundingBox();
	else if (isDrawnPart(part)) part.geometry.computeBoundingBox();
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

/** A box's eight corners. @param {THREE.Box3} box */
function cornersOf(box) {
	return [box.min.x, box.max.x].flatMap((across) =>
		[box.min.y, box.max.y].flatMap((up) => [box.min.z, box.max.z].map((out) => new THREE.Vector3(across, up, out)))
	);
}

/**
 * Whether the eye sees a point on a line through the window's surface: its sight toward the point meets the plane
 * ahead, within the surface's edges; a sight running along the plane or away from it meets none.
 * @param {THREE.Vector3} point @param {WindowSurface} window
 */
function isSeenOnTheSurface(point, window) {
	const toward = window.plane.normal.dot(point);
	if (point.z >= AT_THE_EYE || toward >= ALONG_THE_PLANE) return false;
	const shareOfTheWay = -window.plane.constant / toward;
	const onTheSquare = point.clone().multiplyScalar(shareOfTheWay).applyMatrix4(window.fromTheSurface);
	return Math.abs(onTheSquare.x) <= HALF_A_SIDE && Math.abs(onTheSquare.y) <= HALF_A_SIDE;
}

/**
 * A square the window's surface is drawn by, in a material of its own, placed by a matrix of its own.
 * @param {THREE.PlaneGeometry} square @param {THREE.Material} material
 */
function placedSquare(square, material) {
	const placed = new THREE.Mesh(square, material);
	placed.matrixAutoUpdate = false;
	return placed;
}

/**
 * The group the world's lights shine from, the lights it held let go and those handed set in it.
 * @param {THREE.Group} group @param {readonly DrawnLight[]} lights
 */
function shiningFrom(group, lights) {
	for (const shining of group.children) if (shining instanceof THREE.SpotLight) shining.dispose();
	group.clear();
	for (const part of lights.flatMap(spotlightOf)) group.add(part);
	return group;
}

/**
 * A light of the world as three shines it, and the spot it aims at, each placed in the room by the engine's matrix: a
 * spotlight as strong however far it reaches, a white face square to it as bright as the light's strength says.
 * @param {DrawnLight} light @returns {THREE.Object3D[]}
 */
function spotlightOf(light) {
	const strength = light.strength * STRENGTH_IN_THREES;
	const angle = THREE.MathUtils.degToRad(light.angle);
	const spotlight = new THREE.SpotLight(light.colour, strength, REACHES_ENDLESSLY, angle, light.softness, NO_FALLOFF);
	return [placedBy(spotlight, light.standing), placedBy(spotlight.target, light.aimedAt)];
}

/** An object of three placed by the engine's matrix alone. @template {THREE.Object3D} Placed @param {Placed} object @param {Matrix} matrix @returns {Placed} */
function placedBy(object, matrix) {
	object.matrixAutoUpdate = false;
	object.matrix.copy(matrixOf(matrix));
	return object;
}

/**
 * What faces reflect of the soft boxes round the room, and are lit by: the boxes, each a glowing square on the dark,
 * drawn round the room's middle into a map three reads them from, sharp, rough faces blurring it as they read it; looked
 * for past the farthest corner of a box, so none is cut.
 * @param {THREE.WebGLRenderer} renderer @param {DrawnLighting} lighting
 */
function reflectionsOf(renderer, lighting) {
	const surroundings = new THREE.Scene();
	const square = new THREE.PlaneGeometry();
	surroundings.add(
		...lighting.softBoxes.map((softBox) => placedBy(new THREE.Mesh(square, glowingAs(softBox)), softBox.placing))
	);
	const generator = new THREE.PMREMGenerator(renderer);
	const far = lighting.softBoxesReach * PAST_THE_FARTHEST;
	const reflections = generator.fromScene(surroundings, UNBLURRED, NEAREST_REFLECTED, far, {
		size: REFLECTIONS_SHARPNESS
	});
	generator.dispose();
	surroundings.traverse(partLetGo);
	return reflections;
}

/**
 * A soft box's glow: its colour as bright as it is told along its middle, falling off softly to nothing at its sides.
 * @param {DrawnSoftBox} softBox
 */
function glowingAs(softBox) {
	return new THREE.ShaderMaterial({
		uniforms: { tint: { value: new THREE.Color(softBox.colour).multiplyScalar(softBox.brightness) } },
		vertexShader: ACROSS_A_SOFT_BOX,
		fragmentShader: A_SOFT_BOXES_GLOW,
		side: THREE.DoubleSide
	});
}

/** A square placed onto the window's surface, as it is drawn next. @param {THREE.Mesh} square @param {THREE.Matrix4} surface */
function placedOn(square, surface) {
	square.matrix.copy(surface);
	square.matrixWorldNeedsUpdate = true;
	return square;
}

/**
 * The window's surface drawn as depth alone, before a thing, so what stands behind it is hidden as it is drawn: by the
 * shader the surface is marked by, so the two parts cover the same samples at the surface's edges.
 */
function surfaceAsDepthMaterial() {
	return new THREE.ShaderMaterial({
		vertexShader: SEEN_FROM_THE_EYE,
		fragmentShader: CLEAR,
		side: THREE.DoubleSide,
		colorWrite: false
	});
}

/** The window's surface marking each sample it covers over a thing, leaving its colour and depth as they stand. */
function surfaceMarkingMaterial() {
	return new THREE.ShaderMaterial({
		vertexShader: SEEN_FROM_THE_EYE,
		fragmentShader: CLEAR,
		side: THREE.DoubleSide,
		colorWrite: false,
		depthTest: false,
		depthWrite: false,
		stencilWrite: true,
		stencilRef: ON_THE_SURFACE,
		stencilFunc: THREE.AlwaysStencilFunc,
		stencilZPass: THREE.ReplaceStencilOp
	});
}

/**
 * The window's surface drawn over a thing, wiping each sample where the thing stands nearer the eye than it: what of a
 * film's own shader that three does not cut stands before the surface.
 */
function surfaceWipingMaterial() {
	return new THREE.ShaderMaterial({
		vertexShader: SEEN_FROM_THE_EYE,
		fragmentShader: CLEAR,
		side: THREE.DoubleSide,
		depthFunc: THREE.GreaterDepth,
		depthWrite: false,
		blending: THREE.NoBlending
	});
}

/**
 * The window's surface moved a sliver toward the eye: so many pixels of the frame as far off as the surface stands,
 * along the plane's way toward the eye.
 * @param {WindowSurface} window @param {number} eyeDistance
 */
function aSliverBefore(window, eyeDistance) {
	return new THREE.Matrix4()
		.makeTranslation(window.plane.normal.clone().multiplyScalar(sliverOf(window, eyeDistance)))
		.multiply(window.surface);
}

/**
 * The window's plane a part of a thing is cut by: keeping the eye's side of it for the part before, the far side for
 * the part behind, moved a sliver into the side it cuts away, so the part reaches a sliver past the surface.
 * @param {WindowSurface} window @param {'before' | 'behind'} kept @param {number} eyeDistance
 */
function cutASliverPast(window, kept, eyeDistance) {
	const keeping = kept === 'before' ? window.plane.clone() : window.plane.clone().negate();
	keeping.constant += sliverOf(window, eyeDistance);
	return keeping;
}

/**
 * How far a sliver past the window's surface reaches, in the eye's own space: so many pixels of the frame as far off as
 * the surface stands.
 * @param {WindowSurface} window @param {number} eyeDistance
 */
function sliverOf(window, eyeDistance) {
	return (SLIVER_IN_PIXELS * window.plane.constant) / eyeDistance;
}

/** The whole of a layer wiped but for the samples the window's surface marked. */
function pastTheSurfaceWiping() {
	const whole = new THREE.Mesh(
		new THREE.PlaneGeometry(WEBGL_SPAN, WEBGL_SPAN),
		new THREE.ShaderMaterial({
			vertexShader: OVER_THE_WHOLE_LAYER,
			fragmentShader: CLEAR,
			depthTest: false,
			depthWrite: false,
			blending: THREE.NoBlending,
			stencilWrite: true,
			stencilRef: ON_THE_SURFACE,
			stencilFunc: THREE.NotEqualStencilFunc
		})
	);
	whole.frustumCulled = false;
	return whole;
}

/**
 * The projection that sees the eye's own space in perspective from the eye onto a layer holding a box of the frame:
 * the frame's middle straight before the eye, its picture plane as far before it as the eye stands, and a depth kept
 * from a pixel before the eye to far past the frame.
 * @param {Box} drawn @param {Box} frame @param {number} eyeDistance
 */
function projectionOnto(drawn, frame, eyeDistance) {
	const toTheNearest = NEAREST / eyeDistance;
	const leftOfTheMiddle = drawn.left - (frame.left + frame.width / HALVES);
	const topOverTheMiddle = frame.top + frame.height / HALVES - drawn.top;
	return new THREE.Matrix4().makePerspective(
		leftOfTheMiddle * toTheNearest,
		(leftOfTheMiddle + drawn.width) * toTheNearest,
		topOverTheMiddle * toTheNearest,
		(topOverTheMiddle - drawn.height) * toTheNearest,
		NEAREST,
		eyeDistance * FARTHEST_IN_EYE_DISTANCES
	);
}
