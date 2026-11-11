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
 * the world's light, more as the eye sees it more aslant. It is laid over the page drawn before it as three lays a coat
 * over what lies under it: what it reflects added whole, the page under it dimmed by the share the coat reflects, as
 * premultiplied light is laid, and it writes no depth. It lies on the page's plane, drawn nearer by depth's offset, so
 * it wins the plane the page shares with it.
 *
 * Where the window's shade reaches the whole window (`BodyShade` in `src/props/window.ts`), the body is shaded as the
 * page is: its metal faded in light into what stands behind it as far as the page has faded (`WHAT_STANDS_BEHIND` in
 * `stage/page-picture.js`); and the page and its body blurred as one by the eye's lens, as wide as the shade's blur,
 * grown as the eye sees each point nearer, but the part of the screen the blur leaves sharp, so the slab's rim and
 * sides and the page's outline soften with the page, as the claude-review promo's lens softened all of its slab. The
 * lens blurs by depth (`stage/lens.js`), and the slab stands at about one depth with the page, so the window is handed
 * the lens as spreads of its own (`WindowBlurred`): each pixel of a field holding the window whose depth falls within
 * the slab, read back onto it, spreads as wide as the shade blurs it there. Read off the depth, what stands before the
 * slab keeps its own spread, as the depth hides the slab there. The page's picture is laid unblurred then
 * (`blurredWithTheWindow`): blurred in its picture, the page's outline stood sharp round a soft page, a bright line on
 * beats 7–8 of the promo's draft at film seconds 4 and 15.8 where the cut has none.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
import { THE_PART_KEPT_SHARP, WHAT_STANDS_BEHIND } from './page-picture.js';
import { PREMULTIPLIED, SRGB_CURVES, WRITTEN, drawnInto, passOver, valuesOfTheBox, valuesSet } from './passes.js';
/** @import { BodyShade, DrawnBody, DrawnWindow } from '../src/props/window.ts' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { Box, Size } from '../src/domain/geometry.ts' */
/** @import { BehindThePage } from './page-picture.js' */
/** @import { SceneField } from './lens.js' */

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

/**
 * A rounded rectangle about its middle: its width, its height, and how round its corners are.
 * @typedef {{ readonly width: number, readonly height: number, readonly corner: number }} Outline
 */

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
// Where three writes a lit material's colour, and the glass's own: the light its coat reflects, premultiplied, and as
// opaque as the share of what lies under it the coat holds back, `Fcc` being how much the coat reflects as the eye sees
// it (three's physical material, where it lays a coat)
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
// Where three's own declarations of a fragment shader stand, which a body's own come after
const THREES_DECLARATIONS = '#include <common>';
// The metal faded in light into what stands behind it as far as the shade fades the body; as three lit it where the
// shade fades it none, so a body unshaded draws the same light as before
const THE_METAL_FADED = `
if (faded > 0.0) gl_FragColor.rgb = mix(gl_FragColor.rgb, behindAt().rgb, faded);`;
// A body faded none
const NONE_FADED = 0;
// What the spreads the shade blurs the body by are drawn into: one value a pixel, in half floats, read pixel by pixel,
// unblended with the pixel beside, which may be another thing's; and their size before they are first drawn
const SPREADS_LAYER = {
	type: THREE.HalfFloatType,
	depthBuffer: false,
	minFilter: THREE.NearestFilter,
	magFilter: THREE.NearestFilter
};
const A_PIXEL = 1;
// A value of the spreads' pass before the spreads are first drawn, which sets every one; and the share of the blur
// the part of the screen it leaves sharp softens by where that part is wholly sharp
const SET_AS_DRAWN = 0;
const SOFTENS_NONE = 0;
// The depth a layer keeps where nothing was drawn, the farthest it holds
const NOTHING_DRAWN = 1;
// How far off a face of the slab a point read back off the depth still lies on it, in the frame's pixels: past the
// steps the depth a layer keeps reads a point by, two thirds of a pixel three frame heights from the eye (24 bits from
// a pixel before the eye to a hundred eye distances, `depthRangeOf` in `matrices.js`), and the offsets by depth the
// page and the glass are drawn nearer by
const ON_A_FACE = 2;
// How wide each pixel of a field spreads where its depth falls within the window's slab, on the page, in a pit sunk
// into it, on the rim, the sides or the back: none where nothing was drawn or what was drawn stands off the slab; else
// as wide as the shade blurs the window's plane, grown as the eye sees the point nearer, its spread a pixel away over
// how far before the eye the point stands, but over the part of the screen the blur leaves sharp, so far from it as
// the part is kept, the part softening by its share of the blur. A point of the field is read back into the eye's space
// by the field's projection undone, onto the slab by its placing undone, and onto the screen from the page's middle on
// the window's plane, down the plane where the slab's axes go up; the slab's outline is a rounded rectangle about the
// page's middle, its half width, half height and corner
const SPREADS_FRAGMENT = `
uniform sampler2D depth;
uniform mat4 fieldToTheEye;
uniform mat4 eyeToTheSlab;
uniform vec3 slabOutline;
uniform float thickness;
uniform float spreadAPixelAway;
uniform bool keepsAPartSharp;
uniform vec2 pageMiddle;
uniform vec4 screenBox;
uniform vec2 screenSize;
uniform float partSoftens;
varying vec2 shareOfTheFrame;
const float NOTHING_DRAWN = float(${NOTHING_DRAWN});
const float ON_A_FACE = float(${ON_A_FACE});
${THE_PART_KEPT_SHARP}
float pastTheOutline(vec2 point, vec3 outline) {
	vec2 fromTheCorner = abs(point) - outline.xy + outline.z;
	return length(max(fromTheCorner, 0.0)) + min(max(fromTheCorner.x, fromTheCorner.y), 0.0) - outline.z;
}
void main() {
	float stored = texture2D(depth, shareOfTheFrame).x;
	if (stored >= NOTHING_DRAWN) {
		gl_FragColor = vec4(0.0);
		return;
	}
	vec4 seen = fieldToTheEye * vec4(vec3(shareOfTheFrame, stored) * 2.0 - 1.0, 1.0);
	vec3 inTheEyesSpace = seen.xyz / seen.w;
	vec3 onTheSlab = (eyeToTheSlab * vec4(inTheEyesSpace, 1.0)).xyz;
	bool withinTheSlab = pastTheOutline(onTheSlab.xy, slabOutline) <= ON_A_FACE && onTheSlab.z <= ON_A_FACE
		&& onTheSlab.z >= -thickness - ON_A_FACE;
	if (!withinTheSlab) {
		gl_FragColor = vec4(0.0);
		return;
	}
	float share = 1.0;
	if (keepsAPartSharp) {
		vec2 onThePlane = pageMiddle + vec2(onTheSlab.x, -onTheSlab.y);
		share = mix(1.0, partSoftens, sharpAt((onThePlane - screenBox.xy) / screenBox.zw * screenSize));
	}
	gl_FragColor = vec4(share * spreadAPixelAway / -inTheEyesSpace.z, 0.0, 0.0, 0.0);
}`;

/** The window's body: its slab of metal and the glass over the page, as last built. */
export class WindowBody {
	constructor() {
		// How far the metal has faded into what stands behind it, and what stands behind it, as the page's surface reads
		// it (`BehindThePage`)
		this.fading = {
			faded: { value: NONE_FADED },
			behindSoFar: { value: /** @type {THREE.Texture | null} */ (null) },
			filmsGround: { value: /** @type {THREE.Texture | null} */ (null) },
			layerOnTheFrame: { value: new THREE.Vector4() }
		};
		this.metal = new THREE.MeshStandardMaterial({ metalness: WHOLLY_METAL });
		this.metal.onBeforeCompile = (shader) => fadedIntoWhatStandsBehind(shader, this.fading);
		this.glassCoat = new THREE.MeshPhysicalMaterial({
			...GLASS_UNDER_ITS_COAT,
			clearcoatRoughness: GLASS_COAT_ROUGHNESS,
			...PREMULTIPLIED,
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
		/**
		 * The faces of the slab and of the glass, and the measures they were last built of, said whole
		 * @type {THREE.Mesh[]}
		 */
		this.faces = [];
		this.builtOf = NONE_BUILT;
	}

	/**
	 * The slab and its glass posed for a window: built round the page it shows, where their measures are not those they
	 * were built of, in the body's metal, faded as far as the shade fades it, and as much glass as it has, the glass
	 * shown only where it has some, and placed where the engine places them in the eye's own space.
	 * @param {DrawnWindow} window @param {DrawnBody} body
	 * @returns {{ readonly slab: THREE.Group, readonly glass: THREE.Group }}
	 */
	posed(window, body) {
		this.builtFor(measuresOf(window, body));
		this.metal.color.set(body.metal);
		this.metal.roughness = body.roughness;
		this.fading.faded.value = body.shade === null ? NONE_FADED : body.shade.fade;
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
	 * What the metal fades into, set as the room has laid the world so far, as it sets the page's (`behindThePageSet` in
	 * `room.js`).
	 * @param {BehindThePage} behind
	 */
	behindSet(behind) {
		this.fading.behindSoFar.value = behind.behindSoFar;
		this.fading.filmsGround.value = behind.filmsGround;
		this.fading.layerOnTheFrame.value = behind.layerOnTheFrame;
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
 * The spreads the window's shade blurs the whole window by, its page and its body, as the eye's lens takes them
 * (`Lens.laid` in `stage/lens.js`), read off the depth of a field the window is drawn in.
 */
export class WindowBlurred {
	/**
	 * @param {number} pixelsOfOne the drawing's pixels of a pixel of a frame 1080 high
	 * @param {Size} screen the screen's size, in its pixels
	 */
	constructor(pixelsOfOne, screen) {
		this.pixelsOfOne = pixelsOfOne;
		this.screenSize = new THREE.Vector2(screen.width, screen.height);
		this.spreads = new THREE.WebGLRenderTarget(A_PIXEL, A_PIXEL, SPREADS_LAYER);
		this.pass = passOver(
			{
				depth: { value: null },
				fieldToTheEye: { value: new THREE.Matrix4() },
				eyeToTheSlab: { value: new THREE.Matrix4() },
				slabOutline: { value: new THREE.Vector3() },
				thickness: { value: SET_AS_DRAWN },
				spreadAPixelAway: { value: SET_AS_DRAWN },
				keepsAPartSharp: { value: false },
				pageMiddle: { value: new THREE.Vector2() },
				screenBox: { value: new THREE.Vector4() },
				screenSize: { value: this.screenSize },
				sharpBox: { value: new THREE.Vector4() },
				sharpEdge: { value: SET_AS_DRAWN },
				partSoftens: { value: SET_AS_DRAWN }
			},
			SPREADS_FRAGMENT,
			WRITTEN
		);
	}

	/**
	 * How wide each pixel of a field spreads, in the drawing's pixels, where its depth falls within the window's slab,
	 * the window blurred whole by the shade as it reaches it: as many times the shade's blur as the eye sees the point
	 * nearer than the frame, the page standing on the frame seen at its own size; but for the part of the screen the
	 * blur leaves sharp, its edge in the screen's pixels as the camera frames it. The field is seen from the scene's eye
	 * through a projection.
	 * @param {THREE.WebGLRenderer} renderer @param {SceneField} field @param {THREE.Matrix4} fieldToTheEye the field's
	 * projection undone @param {DrawnScene} scene @param {DrawnBody} body @param {BodyShade} shade
	 * @returns {THREE.Texture}
	 */
	spreadsOver(renderer, field, fieldToTheEye, scene, body, shade) {
		const window = scene.window;
		const outer = outerOutlineOf(measuresOf(window, body));
		const filmed = scene.screen.filmed;
		const sharp = filmed === null ? null : window.sharp;
		this.spreads.setSize(field.width, field.height);
		valuesSet(this.pass.material, {
			depth: field.depth,
			fieldToTheEye,
			eyeToTheSlab: matrixOf(body.placing).invert(),
			slabOutline: new THREE.Vector3(outer.width / HALVES, outer.height / HALVES, outer.corner),
			thickness: body.thickness,
			spreadAPixelAway: shade.blur * this.pixelsOfOne * scene.eye.distance,
			keepsAPartSharp: sharp !== null,
			pageMiddle: new THREE.Vector2(
				window.reach.left + window.reach.width / HALVES,
				window.reach.top + window.reach.height / HALVES
			),
			...(filmed === null || sharp === null ? {} : sharpPartValues(filmed.box, sharp, shade, scene.camera.pose.zoom))
		});
		drawnInto(renderer, this.pass, this.spreads);
		return this.spreads.texture;
	}
}

/**
 * The part of the screen the shade's blur leaves sharp, as the window's spreads keep it: the screen's box on the
 * window's plane, the part's box and edge in the screen's pixels, the edge as the camera's zoom frames it, and the
 * share of the blur the part softens by.
 * @param {Box} screen @param {NonNullable<DrawnWindow['sharp']>} sharp @param {BodyShade} shade @param {number} zoom
 */
function sharpPartValues(screen, sharp, shade, zoom) {
	return {
		screenBox: valuesOfTheBox(screen),
		sharpBox: valuesOfTheBox(sharp.box),
		sharpEdge: sharp.edge / zoom,
		partSoftens: (sharp.blur ?? SOFTENS_NONE) / shade.blur
	};
}

/**
 * A body's measures as it stands round the page a window shows: the page's size and corners, and the body's rim and
 * thickness.
 * @param {DrawnWindow} window @param {DrawnBody} body @returns {Measures}
 */
function measuresOf(window, body) {
	return {
		width: window.reach.width,
		height: window.reach.height,
		corner: window.corner,
		rim: body.rim,
		thickness: body.thickness
	};
}

/** The outline round a body's rim, the page's grown by the rim. @param {Measures} measures @returns {Outline} */
function outerOutlineOf(measures) {
	return {
		width: measures.width + measures.rim * HALVES,
		height: measures.height + measures.rim * HALVES,
		corner: measures.corner + measures.rim
	};
}

/**
 * The metal's shader written to fade its light into what stands behind it as far as the shade fades the body, its
 * values the body's own.
 * @param {THREE.WebGLProgramParametersWithUniforms} shader @param {WindowBody['fading']} fading
 */
function fadedIntoWhatStandsBehind(shader, fading) {
	Object.assign(shader.uniforms, fading);
	shader.fragmentShader = shader.fragmentShader
		.replace(THREES_DECLARATIONS, `${THREES_DECLARATIONS}\nuniform float faded;${SRGB_CURVES}${WHAT_STANDS_BEHIND}`)
		.replace(THREES_OUTPUT, `${THREES_OUTPUT}${THE_METAL_FADED}`);
}

/**
 * A body's faces in its metal, the page's middle at their origin, the page's face toward three's z: its sides, the
 * page's outline grown by the rim and drawn back as deep as the body is thick; its back, that outline at their foot,
 * facing away; and its rim, the outline round the page and a pixel under it, on the page's plane, facing the eye.
 * @param {Measures} measures @param {THREE.Material} metal
 */
function facesOf(measures, metal) {
	const outer = outerOutlineOf(measures);
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
