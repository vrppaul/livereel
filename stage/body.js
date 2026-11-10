// @ts-check
/**
 * The body of the page's window in the room (`DrawnBody` in `src/props/window.ts`): a slab of metal round the page, as
 * a tablet is made — its sides flat and square to the page, only its corners round, a rim round the page on its front
 * and a back behind — standing round the page in the room's one scene, lit by the world's light as the eye sees the
 * room (`stage/lighting.js`). It is open in front, where the page lies, and each face is drawn on its outer side alone,
 * so a page that fades shows what stands behind the window through it, as it does with no body.
 *
 * Its rim reaches a pixel under the page, so the page's smoothed edge lies over metal, not over the ground between the
 * two. Its sides face straight out from its corners' arcs, where their own faces would cut each round into facets a
 * soft box glides over in steps. Its faces are built anew only as its measures change, as the window lifts or travels;
 * standing, it is built once.
 *
 * Over the page lies glass: a smooth clear coat on nothing, as three draws one, so all it shows is what it reflects of
 * the world's light, more as the eye sees it more aslant. Its clearness is what the coat lets through: three dims what
 * lies under a coat by the share it reflects, so the glass is drawn as clear as that share leaves it, over the page
 * drawn before it, and writes no depth. It lies on the page's plane, drawn nearer by depth's offset, so it wins the
 * plane the page shares with it.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
/** @import { DrawnBody, DrawnWindow } from '../src/props/window.ts' */

/**
 * The body's measures, as its faces are built from them, in the frame's pixels: the page's width, height and corners,
 * the rim and the thickness.
 * @typedef {{
 *   readonly width: number,
 *   readonly height: number,
 *   readonly corner: number,
 *   readonly rim: number,
 *   readonly thickness: number
 * }} Measures
 */

/** A rounded rectangle about its middle: its width, its height, and how round its corners are. @typedef {{ readonly width: number, readonly height: number, readonly corner: number }} Outline */

// How finely a corner is cut, in straight lines a quarter-turn
const CORNER_SEGMENTS = 16;
// How far the rim reaches under the page, in the frame's pixels
const RIM_UNDER_THE_PAGE = 1;
// The body is metal through and through; the glass is a smooth clear coat over a face of no colour that reflects
// nothing of its own, so the coat alone shows: no specular of its own, and no metal, which three would have reflect
// wholly at a grazing angle
const WHOLLY_METAL = 1;
const GLASS_UNDER_ITS_COAT = { color: 0x000000, metalness: 0, specularIntensity: 0 };
const GLASS_COAT_ROUGHNESS = 0.03;
// How far depth's offset draws the glass nearer than the page it lies on, in three's polygon offset steps, past the
// page's own (`PAGE_NEARER` in `room.js`); and the glass drawn after all else see-through, the page under it first
const GLASS_NEARER = -2;
const GLASS_DRAWN_LAST = 1;
// A coat of none, which is no coat: three would draw the black face under it whole
const NO_COAT = 0;
// Where three writes a lit material's colour, and the glass's own: the light its coat reflects, as clear as the share
// of what lies under it the coat lets through, `Fcc` being how much the coat reflects as the eye sees it (three's
// physical material, where it lays a coat)
const THREES_OUTPUT = '#include <opaque_fragment>';
const THE_GLASS_OUTPUT = `
#ifdef USE_CLEARCOAT
gl_FragColor = vec4( outgoingLight, material.clearcoat * Fcc.g );
#else
${THREES_OUTPUT}
#endif`;
// No turn, a quarter-turn, a half-turn and a whole one, in radians, as a corner's arc runs from the one before; a side
// and the half of it its edge stands from its middle
const NO_TURN = 0;
const HALVES = 2;
const QUARTER_TURN = Math.PI / HALVES;
const HALF_TURN = Math.PI;
const THREE_QUARTERS = HALF_TURN + QUARTER_TURN;
const WHOLE_TURN = HALF_TURN * HALVES;
// What three draws an extruded outline in: its two lids, then its sides
const EXTRUDED_SIDES = 1;
// A corner of no roundness; and how far a point of an outline with such corners stands out of the rectangle inside
// its arcs, which it stands on, so it faces as its own face does
const SQUARE = 0;
const ON_THE_RECTANGLE = 0;
// Where the page's plane stands, which the rim lies on and the sides go back from
const ON_THE_PAGES_PLANE = 0;
// The measures of a body built of nothing yet
const NONE_BUILT = '';

/** The window's body: its slab of metal and the glass over the page, as last built. */
export class WindowBody {
	constructor() {
		this.metal = new THREE.MeshStandardMaterial({ metalness: WHOLLY_METAL });
		this.glassCoat = new THREE.MeshPhysicalMaterial({
			...GLASS_UNDER_ITS_COAT,
			clearcoatRoughness: GLASS_COAT_ROUGHNESS,
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: GLASS_NEARER,
			polygonOffsetUnits: GLASS_NEARER
		});
		this.glassCoat.onBeforeCompile = asClearAsItsCoatLetsThrough;
		this.slab = new THREE.Group();
		this.slab.matrixAutoUpdate = false;
		this.glass = new THREE.Group();
		this.glass.matrixAutoUpdate = false;
		/** The faces of the slab and of the glass, and the measures they were last built of, said whole @type {THREE.Mesh[]} */
		this.faces = [];
		this.builtOf = NONE_BUILT;
	}

	/**
	 * The slab and its glass posed for a window: built round the page it shows, where their measures are not those they
	 * were built of, in the body's metal and as much glass as it has, the glass shown only where it has some, and placed
	 * where the engine places them in the eye's own space.
	 * @param {DrawnWindow} window @param {DrawnBody} body
	 * @returns {{ readonly slab: THREE.Group, readonly glass: THREE.Group }}
	 */
	posed(window, body) {
		this.builtFor({
			width: window.reach.width,
			height: window.reach.height,
			corner: window.corner,
			rim: body.rim,
			thickness: body.thickness
		});
		this.metal.color.set(body.metal);
		this.metal.roughness = body.roughness;
		this.glassCoat.clearcoat = body.glass;
		this.glass.visible = body.glass > NO_COAT;
		const placing = matrixOf(body.placing);
		for (const part of [this.slab, this.glass]) {
			part.matrix.copy(placing);
			part.matrixWorldNeedsUpdate = true;
		}
		return { slab: this.slab, glass: this.glass };
	}

	/**
	 * The slab and the glass built of a body's measures, their faces of the measures they were built of let go; as they
	 * stand, where they are the same.
	 * @param {Measures} measures
	 */
	builtFor(measures) {
		const builtOf = JSON.stringify(measures);
		if (builtOf === this.builtOf) return;
		for (const face of this.faces) face.geometry.dispose();
		const slabFaces = facesOf(measures, this.metal);
		const pane = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectangle(measures), CORNER_SEGMENTS), this.glassCoat);
		pane.renderOrder = GLASS_DRAWN_LAST;
		this.faces = [...slabFaces, pane];
		this.slab.clear();
		this.slab.add(...slabFaces);
		this.glass.clear();
		this.glass.add(pane);
		this.builtOf = builtOf;
	}
}

/**
 * A body's faces in its metal, the page's middle at their origin, the page's face toward three's z: its sides, the
 * page's outline grown by the rim and drawn back as deep as the body is thick; its back, that outline at their foot,
 * facing away; and its rim, the outline round the page and a pixel under it, on the page's plane, facing the eye.
 * @param {Measures} measures @param {THREE.Material} metal
 */
function facesOf(measures, metal) {
	const outer = {
		width: measures.width + measures.rim * HALVES,
		height: measures.height + measures.rim * HALVES,
		corner: measures.corner + measures.rim
	};
	const page = {
		width: measures.width - RIM_UNDER_THE_PAGE * HALVES,
		height: measures.height - RIM_UNDER_THE_PAGE * HALVES,
		corner: Math.max(SQUARE, measures.corner - RIM_UNDER_THE_PAGE)
	};
	const sides = new THREE.ExtrudeGeometry(roundedRectangle(outer), {
		depth: measures.thickness,
		bevelEnabled: false,
		curveSegments: CORNER_SEGMENTS
	});
	sidesFacingOut(sides, outer);
	sides.translate(ON_THE_PAGES_PLANE, ON_THE_PAGES_PLANE, -measures.thickness);
	const back = new THREE.ShapeGeometry(roundedRectangle(outer), CORNER_SEGMENTS)
		.rotateY(HALF_TURN)
		.translate(ON_THE_PAGES_PLANE, ON_THE_PAGES_PLANE, -measures.thickness);
	const ring = roundedRectangle(outer);
	ring.holes.push(roundedRectangle(page));
	const rim = new THREE.ShapeGeometry(ring, CORNER_SEGMENTS);
	return [new THREE.Mesh(sides, metal), new THREE.Mesh(back, metal), new THREE.Mesh(rim, metal)];
}

/**
 * An extruded outline's sides alone drawn, each point facing straight out from the outline inside its corners' arcs:
 * along a straight side as its face does, round a corner turning smoothly.
 * @param {THREE.ExtrudeGeometry} geometry @param {Outline} outline
 */
function sidesFacingOut(geometry, outline) {
	const sides = geometry.groups[EXTRUDED_SIDES];
	if (sides === undefined) throw new Error("three's extruded outline has no sides");
	geometry.setDrawRange(sides.start, sides.count);
	const insideTheArcs = {
		across: outline.width / HALVES - outline.corner,
		up: outline.height / HALVES - outline.corner
	};
	const position = geometry.getAttribute('position');
	const normal = geometry.getAttribute('normal');
	const facing = new THREE.Vector3();
	for (let vertex = sides.start; vertex < sides.start + sides.count; vertex++) {
		const across = position.getX(vertex);
		const up = position.getY(vertex);
		facing.set(
			across - THREE.MathUtils.clamp(across, -insideTheArcs.across, insideTheArcs.across),
			up - THREE.MathUtils.clamp(up, -insideTheArcs.up, insideTheArcs.up),
			ON_THE_PAGES_PLANE
		);
		if (facing.lengthSq() === ON_THE_RECTANGLE) continue;
		facing.normalize();
		normal.setXYZ(vertex, facing.x, facing.y, facing.z);
	}
}

/**
 * The glass's shader written to draw it as clear as its coat lets through what lies under it.
 * @param {THREE.WebGLProgramParametersWithUniforms} shader
 */
function asClearAsItsCoatLetsThrough(shader) {
	shader.fragmentShader = shader.fragmentShader.replace(THREES_OUTPUT, THE_GLASS_OUTPUT);
}

/** A rounded rectangle about its middle, its corners drawn as arcs. @param {Outline} outline */
function roundedRectangle(outline) {
	const right = outline.width / HALVES - outline.corner;
	const top = outline.height / HALVES - outline.corner;
	const shape = new THREE.Shape();
	shape.absarc(right, top, outline.corner, NO_TURN, QUARTER_TURN);
	shape.absarc(-right, top, outline.corner, QUARTER_TURN, HALF_TURN);
	shape.absarc(-right, -top, outline.corner, HALF_TURN, THREE_QUARTERS);
	shape.absarc(right, -top, outline.corner, THREE_QUARTERS, WHOLE_TURN);
	return shape;
}
