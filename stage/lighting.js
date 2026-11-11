// @ts-check
/**
 * The world's light in the room (`src/props/lighting.ts`), which a film's things in a lit material and the window's
 * body are lit by: its lights in a group the matrix each carries takes from the room into the eye's own space that
 * sees it, and its soft boxes drawn once into what three reads reflections from, which the room's turn turns, so a
 * glint stays where its box stands in the room. Each is made anew only as the world changes it, as three keeps what it
 * learns of a light for as long as the page stands.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
/** @import { DrawnLight, DrawnLighting, DrawnSoftBox } from '../src/props/lighting.ts' */
/** @import { Matrix } from '../src/domain/matrix.ts' */

// A light's strength as three takes it: three shades a white face square to a light by its strength over π, so a
// strength of 1 a unit off lights it its whole colour there; a light reaching endlessly, falling off by the square of
// the distance
const STRENGTH_IN_THREES = Math.PI;
const REACHES_ENDLESSLY = 0;
const BY_THE_SQUARE = 2;
// The soft boxes' reflections: drawn unblurred, rough faces blurring them as they read them; looked for from so near
// the room's middle, the boxes a unit off, to twice as far as the farthest corner of one; and kept so many pixels a
// side, coarser, a leaning soft box's edge reflecting in steps: a cube of half floats, about 67 MB on the card with
// its smaller copies, kept while the boxes stand
const UNBLURRED = 0;
const NEAREST_REFLECTED = 0.1;
const PAST_THE_FARTHEST = 2;
const REFLECTIONS_SHARPNESS = 1024;
// The world's lights or soft boxes an exposure hands where the film's world has none
const NONE_HANDED = JSON.stringify([]);
// A quarter-turn, in radians: half a half-turn
const HALVES = 2;
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

/** The world's light as the room last made it: its lights, and what faces reflect of its soft boxes. */
export class WorldLighting {
	constructor() {
		const lightsPlaced = new THREE.Group();
		lightsPlaced.matrixAutoUpdate = false;
		/** The world's lights as last handed, and the group in the room they shine from @type {{ readonly of: string, readonly group: THREE.Group }} */
		this.lights = { of: NONE_HANDED, group: lightsPlaced };
		/** The soft boxes as last handed, and what faces reflect of them, drawn into a target of the card's: nothing, where none stands @type {{ readonly of: string, readonly target: THREE.WebGLRenderTarget | null }} */
		this.reflections = { of: NONE_HANDED, target: null };
	}

	/**
	 * The world's light an exposure is lit by, made anew only where it is not the one made already, as it stands while
	 * the world does: its lights set where they stand and aim in the room, and its soft boxes drawn into what faces
	 * reflect, so boxes that stand still are drawn once for the whole film.
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
	 * The world's light shining in a scene as an eye sees the room, by the matrix that carries the room into that eye's
	 * own space: its lights carried there, and what faces reflect turned as the room is.
	 * @param {THREE.Scene} scene @param {Matrix} roomInTheEyesSpace
	 */
	shiningIn(scene, roomInTheEyesSpace) {
		const room = matrixOf(roomInTheEyesSpace);
		const lights = this.lights.group;
		lights.matrix.copy(room);
		lights.matrixWorldNeedsUpdate = true;
		scene.add(lights);
		const target = this.reflections.target;
		scene.environment = target === null ? null : target.texture;
		scene.environmentRotation.setFromRotationMatrix(room);
	}
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
 * spotlight falling off by the square of the distance in the frame's pixels, a white face square to it a pixel off as
 * bright as the engine says.
 * @param {DrawnLight} light @returns {THREE.Object3D[]}
 */
function spotlightOf(light) {
	const strength = light.strengthAPixelOff * STRENGTH_IN_THREES;
	const angle = THREE.MathUtils.degToRad(light.angle);
	const spotlight = new THREE.SpotLight(
		light.colour,
		strength,
		REACHES_ENDLESSLY,
		angle,
		light.softness,
		BY_THE_SQUARE
	);
	// Shining in every part of the world the room draws apart, as three lights a face only by lights in its part
	spotlight.layers.enableAll();
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
	const boxes = lighting.softBoxes.map((softBox) =>
		placedBy(new THREE.Mesh(square, glowingAs(softBox)), softBox.placing)
	);
	surroundings.add(...boxes);
	const generator = new THREE.PMREMGenerator(renderer);
	const far = lighting.softBoxesReach * PAST_THE_FARTHEST;
	const reflections = generator.fromScene(surroundings, UNBLURRED, NEAREST_REFLECTED, far, {
		size: REFLECTIONS_SHARPNESS
	});
	generator.dispose();
	square.dispose();
	for (const box of boxes) box.material.dispose();
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
