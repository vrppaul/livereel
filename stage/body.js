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
 * Over the page lies glass: a smooth clear coat on nothing, as three draws one, so it shows what it reflects of the
 * world's light, more as the eye sees it more aslant, and the glint of a strip of light the slab keeps standing near
 * it (`NEAR_STRIP`), the slab's own light. It is laid over the page drawn before it as three lays a coat over what lies
 * under it: what it reflects added whole, the page under it dimmed by the share the coat reflects, as premultiplied
 * light is laid, and it writes no depth. It lies on the page's plane, drawn nearer by depth's offset, so it wins the
 * plane the page shares with it.
 *
 * Where the window's shade reaches the whole window (`BodyShade` in `src/props/window.ts`), the body is shaded as the
 * page is: its metal faded in light into what stands behind it as far as the page has faded (`WHAT_STANDS_BEHIND` in
 * `stage/page-picture.js`); and the page and its body blurred as one by the eye's lens, as wide as the shade's blur,
 * grown as the eye sees each point nearer or as wide on the frame at every point, as the shade has its blur seen, but
 * the part of the screen the blur leaves sharp, so the slab's rim and sides and the page's outline soften with the
 * page, as the claude-review promo's lens softened all of its slab. The lens blurs by depth (`stage/lens.js`), and the
 * slab stands at about one depth with the page, so the window is handed the lens as spreads of its own
 * (`WindowBlurred`): each pixel of a field holding the window whose depth falls within the slab, read back onto it,
 * spreads as wide as the shade blurs it there. Read off the depth, what stands before the slab keeps its own spread, as
 * the depth hides the slab there. The engine hands the page's picture unblurred then (`pictureBlur` in its window):
 * blurred in its picture, the page's outline stood sharp round a soft page, a bright line on beats 7–8 of the promo's
 * draft at film seconds 4 and 15.8 where the cut has none.
 */
import * as THREE from 'three';
import { matrixOf } from './matrices.js';
import { THE_PART_KEPT_SHARP, WHAT_STANDS_BEHIND, partKeptSharpValues } from './page-picture.js';
import {
	NOTHING_DRAWN,
	PAST_A_ROUNDED_BOX,
	PREMULTIPLIED,
	SRGB_CURVES,
	WRITTEN,
	compiledForCount,
	drawnInto,
	passOver,
	valuesOfTheBox,
	valuesSet
} from './passes.js';
/** @import { BlurSeen, BodyBlur, DrawnBody, DrawnWindow } from '../src/props/window.ts' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { Box, Size } from '../src/domain/geometry.ts' */
/** @import { BehindThePage } from './page-picture.js' */
/** @import { SceneField } from './lens.js' */

/**
 * A box of a piece or a pit the window's shade reaches, as the window's spreads read it: the matrix that carries the
 * eye's space onto it, its middle at the origin and its face toward three's z; its outline's half width, half height
 * and corner, and how far it reaches back from its face, in the frame's pixels; and the share the shade reaches it by.
 * @typedef {{
 *   readonly eyeToTheBox: THREE.Matrix4,
 *   readonly outline: THREE.Vector4,
 *   readonly shaded: number
 * }} ShadedBox
 */
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
// The strip of light standing near the glass, whose glint the glass catches as the slab's own light (`Slab.glint` in
// `src/props/body.ts`), as the claude-review promo lays one on its slabs' glass (`GLINT` in its `slab.js`): a long soft
// strip standing square to the glass and before it, in the slab's own frame, so it goes where the slab goes and its
// glint moves on the glass as the eye moves and grows as the eye comes near, as a near light's would. Its measures are
// the promo's in the page's widths, so it lies alike on a page of any size: how far before the glass it stands; where
// its middle line passes, left of the page's middle and above it; how far it leans from upright toward the left, in
// degrees, the promo's key light's lean; how wide it is, its light falling off as a bell across it; how long; and the
// share of its half-length its brightness holds before it fades to its end. The way along it, up and to the left
const NEAR_STRIP = {
	standsOff: 0.75,
	through: { across: -0.375, up: 0.625 },
	leans: 24,
	width: 0.0625,
	length: 3.5,
	holds: 0.6
};
const NEAR_STRIP_LEANS = THREE.MathUtils.degToRad(NEAR_STRIP.leans);
const ALONG_THE_NEAR_STRIP = { across: -Math.sin(NEAR_STRIP_LEANS), up: Math.cos(NEAR_STRIP_LEANS) };
// A glint of none, which the glass draws none of; and a page of no width, before the glass is first posed over one
const NO_GLINT = 0;
const NO_PAGE_YET = 0;
// How little of the eye's ray, reflected off the glass, may head away from it: a ray along the glass meets the strip
// nowhere, and is kept from dividing by none
const AWAY_FROM_THE_GLASS_LEAST = 1e-4;
// Where three writes a vertex's place, where the glass's point and the eye are carried into the slab's own frame
const THREES_PLACING = '#include <project_vertex>';
// A point of the glass and the eye, each in the slab's own frame, the glass on its plane, its face toward its z
const THE_GLASS_AND_THE_EYE = `
varying vec3 glassPoint;
varying vec3 eyePoint;`;
const THE_GLASS_AND_THE_EYE_SET = `
${THREES_PLACING}
glassPoint = transformed;
eyePoint = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;`;
// How bright the glint of the near strip shines at a point of the glass: as far as the eye's ray, reflected off the
// glass there, meets the strip where it stands before the glass, across its middle line as a bell, along it holding and
// then fading to its end; its measures grown by the page's width
const THE_NEAR_STRIPS_GLINT = `${THE_GLASS_AND_THE_EYE}
uniform float glint;
uniform float pageWidth;
const vec2 STRIP_THROUGH = vec2(float(${NEAR_STRIP.through.across}), float(${NEAR_STRIP.through.up}));
const vec2 STRIP_ALONG = vec2(float(${ALONG_THE_NEAR_STRIP.across}), float(${ALONG_THE_NEAR_STRIP.up}));
float nearStripsGlint() {
	vec3 away = reflect(normalize(glassPoint - eyePoint), vec3(0.0, 0.0, 1.0));
	float standsOff = float(${NEAR_STRIP.standsOff}) * pageWidth;
	float reachesIt = (standsOff - glassPoint.z) / max(away.z, float(${AWAY_FROM_THE_GLASS_LEAST}));
	vec2 met = glassPoint.xy + away.xy * reachesIt - STRIP_THROUGH * pageWidth;
	float across = dot(met, vec2(-STRIP_ALONG.y, STRIP_ALONG.x)) / (float(${NEAR_STRIP.width}) * pageWidth);
	float along = abs(dot(met, STRIP_ALONG)) / (float(${NEAR_STRIP.length}) * pageWidth);
	float fading = 1.0 - smoothstep(float(${NEAR_STRIP.holds}), 1.0, along);
	return glint * exp(-across * across) * fading;
}`;
// Where three writes a lit material's colour, and the glass's own: the light its coat reflects and the near strip's
// glint, premultiplied, and as opaque as the share of what lies under it the coat holds back, `Fcc` being how much the
// coat reflects as the eye sees it (three's physical material, where it lays a coat), none where it has no coat
const THREES_OUTPUT = '#include <opaque_fragment>';
const THE_GLASS_OUTPUT = `
#ifdef USE_CLEARCOAT
float heldBack = material.clearcoat * Fcc.g;
#else
float heldBack = 0.0;
#endif
gl_FragColor = vec4(outgoingLight + nearStripsGlint(), heldBack);`;
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
// What a material draws faded in light into what stands behind it as far as the shade fades it; as three drew it where
// the shade fades it none, so what is unshaded draws the same light as before
const THE_LIGHT_FADED = `
if (faded > 0.0) gl_FragColor.rgb = mix(gl_FragColor.rgb, behindAt().rgb, faded);`;
// Faded none
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
// A value of the spreads' pass before the spreads are first drawn, which sets every one
const SET_AS_DRAWN = 0;
// How far off a face of the slab a point read back off the depth still lies on it, in the frame's pixels: past the
// steps the depth a layer keeps reads a point by, two thirds of a pixel three frame heights from the eye (24 bits from
// a pixel before the eye to a hundred eye distances, `depthRangeOf` in `matrices.js`), and the offsets by depth the
// page and the glass are drawn nearer by
const ON_A_FACE = 2;
// The name of the count of the boxes of pieces and pits the shade reaches the spreads are compiled with, as their
// shader reads it
const SHADED = 'SHADED';
const NONE_SHADED = 0;
// How wide each pixel of a field spreads where its depth falls within the window's slab, on the page, in a pit sunk
// into it, on the rim, the sides or the back: none where nothing was drawn or what was drawn stands off the slab; else
// as wide as the shade blurs the window's plane, grown as the eye sees the point nearer, its spread a pixel away over
// how far before the eye the point stands, or as wide on the frame at every point, where the shade has its blur seen
// so; but over the part of the screen the blur leaves sharp, so far from it as the part is kept, the part softening by
// its share of the blur. A point of the field is read back into the eye's space by the field's projection undone, onto
// the slab by its placing undone, and onto the screen from the page's middle on the window's plane, down the plane
// where the slab's axes go up; the slab's outline is a rounded rectangle about the page's middle, its half width, half
// height and corner. Where a piece of the page or its pit the shade reaches stands, it spreads by the share the shade
// reaches it, kept from the blur as far as the piece has risen out of the shade, as the claude-review promo's lens kept
// a lifted part and its pit: each such box read back onto it by its own placing undone, its outline's half width, half
// height and corner about its middle, and how far it reaches back from its face. The slab is read only in a field
// that holds the window: a field of markup holds words standing on the slab's face, which the shade leaves sharp
const SPREADS_FRAGMENT = `
uniform sampler2D depth;
uniform mat4 fieldToTheEye;
uniform mat4 eyeToTheSlab;
uniform vec3 slabOutline;
uniform float thickness;
uniform bool slabReached;
uniform float spreadAPixelAway;
uniform bool seenOnTheFrame;
uniform float spreadOnTheFrame;
uniform bool keepsAPartSharp;
uniform vec2 pageMiddle;
uniform vec4 screenBox;
uniform float partSoftens;
#if ${SHADED} > 0
uniform mat4 eyeToTheShaded[${SHADED}];
uniform vec4 shadedOutlines[${SHADED}];
uniform float shadedShares[${SHADED}];
#endif
varying vec2 shareOfTheFrame;
const float NOTHING_DRAWN = float(${NOTHING_DRAWN});
const float ON_A_FACE = float(${ON_A_FACE});
${THE_PART_KEPT_SHARP}
${PAST_A_ROUNDED_BOX}
bool standsWithin(vec3 point, vec3 outline, float back) {
	return pastARoundedBox(point.xy, outline.xy, outline.z) <= ON_A_FACE
		&& point.z <= ON_A_FACE && point.z >= -back - ON_A_FACE;
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
	bool reached = slabReached && standsWithin(onTheSlab, slabOutline, thickness);
	float share = 1.0;
	#if ${SHADED} > 0
	for (int box = 0; box < ${SHADED}; box++) {
		vec4 outline = shadedOutlines[box];
		if (standsWithin((eyeToTheShaded[box] * vec4(inTheEyesSpace, 1.0)).xyz, outline.xyz, outline.w)) {
			reached = true;
			share = shadedShares[box];
		}
	}
	#endif
	if (!reached) {
		gl_FragColor = vec4(0.0);
		return;
	}
	if (keepsAPartSharp) {
		vec2 onThePlane = pageMiddle + vec2(onTheSlab.x, -onTheSlab.y);
		share *= mix(1.0, partSoftens, sharpAt((onThePlane - screenBox.xy) / screenBox.zw));
	}
	float spread = seenOnTheFrame ? spreadOnTheFrame : spreadAPixelAway / -inTheEyesSpace.z;
	gl_FragColor = vec4(share * spread, 0.0, 0.0, 0.0);
}`;
// Where the shade's blur is as wide as written, read off it: on the frame, at every point, as the engine names it
/** @type {BlurSeen} */
const SEEN_ON_THE_FRAME = 'on the frame';

/** The window's body: its slab of metal and the glass over the page, as last built. */
export class WindowBody {
	constructor() {
		this.metal = new THREE.MeshStandardMaterial({ metalness: WHOLLY_METAL });
		this.fading = new Fading(this.metal);
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
		// How bright the near strip's glint on the glass shines, and the page's width its measures grow by
		this.glinting = { glint: { value: NO_GLINT }, pageWidth: { value: NO_PAGE_YET } };
		this.glassCoat.onBeforeCompile = (shader) => glassCatchingTheNearStrip(shader, this.glinting);
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
	 * were built of, in the body's metal, faded as far as the shade fades it, and as much glass and glint as it has, the
	 * glass shown only where it has either, and placed where the engine places them in the eye's own space.
	 * @param {DrawnWindow} window @param {DrawnBody} body
	 * @returns {{ readonly slab: THREE.Group, readonly glass: THREE.Group }}
	 */
	posed(window, body) {
		this.builtFor(measuresOf(window, body));
		this.metal.color.set(body.metal);
		this.metal.roughness = body.roughness;
		this.fading.fadedAsFarAs(body.shade === null ? NONE_FADED : body.shade.fade);
		this.glassCoat.clearcoat = body.glass;
		this.glinting.glint.value = body.glint;
		this.glinting.pageWidth.value = window.reach.width;
		this.glass.visible = body.glass > NO_COAT || body.glint > NO_GLINT;
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
				slabReached: { value: true },
				eyeToTheShaded: { value: [] },
				shadedOutlines: { value: [] },
				shadedShares: { value: [] },
				spreadAPixelAway: { value: SET_AS_DRAWN },
				seenOnTheFrame: { value: false },
				spreadOnTheFrame: { value: SET_AS_DRAWN },
				keepsAPartSharp: { value: false },
				pageMiddle: { value: new THREE.Vector2() },
				screenBox: { value: new THREE.Vector4() },
				screenSize: { value: new THREE.Vector2() },
				sharpBox: { value: new THREE.Vector4() },
				sharpEdge: { value: SET_AS_DRAWN },
				partSoftens: { value: SET_AS_DRAWN }
			},
			SPREADS_FRAGMENT,
			WRITTEN
		);
		compiledForCount(this.pass.material, SHADED, NONE_SHADED);
	}

	/**
	 * How wide each pixel of a field spreads, in the drawing's pixels, where its depth falls within the window's slab,
	 * the window blurred whole by the shade as it reaches it, where the field holds the window, or within a box of a
	 * piece or a pit the shade reaches, by the share it reaches it: as many times the shade's blur as the eye sees the
	 * point nearer than the frame, the page standing on the frame seen at its own size, or the shade's blur at every
	 * point, where it is seen on the frame; but for the part of the screen the blur leaves sharp, its edge in the
	 * screen's pixels as the camera frames it. The field is seen from the scene's eye through a projection.
	 * @param {THREE.WebGLRenderer} renderer @param {SceneField} field @param {THREE.Matrix4} fieldToTheEye the field's
	 * projection undone @param {DrawnScene} scene @param {DrawnBody} body @param {BodyBlur} blur
	 * @param {{ readonly slab: boolean, readonly shaded: readonly ShadedBox[] }} reaching whether the field holds the
	 * window, and the boxes of pieces and pits the shade reaches
	 * @returns {THREE.Texture}
	 */
	spreadsOver(renderer, field, fieldToTheEye, scene, body, blur, reaching) {
		const window = scene.window;
		const outer = outerOutlineOf(measuresOf(window, body));
		const filmed = scene.screen.filmed;
		const sharp = filmed === null ? null : window.sharp;
		const spread = blur.width * this.pixelsOfOne;
		this.spreads.setSize(field.width, field.height);
		compiledForCount(this.pass.material, SHADED, reaching.shaded.length);
		valuesSet(this.pass.material, {
			depth: field.depth,
			fieldToTheEye,
			eyeToTheSlab: matrixOf(body.placing).invert(),
			slabOutline: new THREE.Vector3(outer.width / HALVES, outer.height / HALVES, outer.corner),
			thickness: body.thickness,
			slabReached: reaching.slab,
			eyeToTheShaded: reaching.shaded.map((box) => box.eyeToTheBox),
			shadedOutlines: reaching.shaded.map((box) => box.outline),
			shadedShares: reaching.shaded.map((box) => box.shaded),
			spreadAPixelAway: spread * scene.eye.distance,
			seenOnTheFrame: blur.seen === SEEN_ON_THE_FRAME,
			spreadOnTheFrame: spread,
			keepsAPartSharp: sharp !== null,
			pageMiddle: new THREE.Vector2(
				window.reach.left + window.reach.width / HALVES,
				window.reach.top + window.reach.height / HALVES
			),
			...(filmed === null || sharp === null
				? {}
				: keptSharpOfTheSpreads(filmed.box, sharp, scene.camera.pose.zoom, this.screenSize))
		});
		drawnInto(renderer, this.pass, this.spreads);
		return this.spreads.texture;
	}
}

/**
 * The part of the screen the shade's blur leaves sharp, as the window's spreads keep it: the screen's box on the
 * window's plane, the share of the page's blur the part softens by, and the part as the page's surface keeps it too.
 * @param {Box} screen @param {NonNullable<DrawnWindow['sharp']>} sharp @param {number} zoom
 * @param {THREE.Vector2} screenSize
 */
function keptSharpOfTheSpreads(screen, sharp, zoom, screenSize) {
	return {
		screenBox: valuesOfTheBox(screen),
		partSoftens: sharp.softens,
		...partKeptSharpValues(sharp, zoom, screenSize)
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
 * How far a material three draws fades in light into what stands behind it, as far as the window's shade fades what it
 * draws: the window's metal, as far as the shade fades the body, and a piece's walls and its pit, as far as the shade
 * reaches them (`stage/piece-body.js`); and what stands behind it, set as the room has laid the world before it, as it
 * sets the page's (`behindThePageSet` in `room.js`).
 */
export class Fading {
	/** @param {THREE.Material} material */
	constructor(material) {
		this.uniforms = {
			faded: { value: NONE_FADED },
			behindSoFar: { value: /** @type {THREE.Texture | null} */ (null) },
			filmsGround: { value: /** @type {THREE.Texture | null} */ (null) },
			layerOnTheFrame: { value: new THREE.Vector4() }
		};
		material.onBeforeCompile = (shader) => fadedIntoWhatStandsBehind(shader, this.uniforms);
	}

	/** Faded as far as a share, from 0 none to 1 whole. @param {number} share */
	fadedAsFarAs(share) {
		this.uniforms.faded.value = share;
	}

	/** What it fades into, as the room has laid it. @param {BehindThePage} behind */
	behindSet(behind) {
		this.uniforms.behindSoFar.value = behind.behindSoFar;
		this.uniforms.filmsGround.value = behind.filmsGround;
		this.uniforms.layerOnTheFrame.value = behind.layerOnTheFrame;
	}
}

/**
 * A material's shader written to fade its light into what stands behind it as far as the shade fades it, its values a
 * fading's own.
 * @param {THREE.WebGLProgramParametersWithUniforms} shader @param {Fading['uniforms']} uniforms
 */
function fadedIntoWhatStandsBehind(shader, uniforms) {
	Object.assign(shader.uniforms, uniforms);
	shader.fragmentShader = shader.fragmentShader
		.replace(THREES_DECLARATIONS, `${THREES_DECLARATIONS}\nuniform float faded;${SRGB_CURVES}${WHAT_STANDS_BEHIND}`)
		.replace(THREES_OUTPUT, `${THREES_OUTPUT}${THE_LIGHT_FADED}`);
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
 * The glass's shader written to catch the near strip's glint, its values the body's own, and to draw it as clear as its
 * coat lets through what lies under it.
 * @param {THREE.WebGLProgramParametersWithUniforms} shader @param {WindowBody['glinting']} glinting
 */
function glassCatchingTheNearStrip(shader, glinting) {
	Object.assign(shader.uniforms, glinting);
	shader.vertexShader = shader.vertexShader
		.replace(THREES_DECLARATIONS, `${THREES_DECLARATIONS}${THE_GLASS_AND_THE_EYE}`)
		.replace(THREES_PLACING, THE_GLASS_AND_THE_EYE_SET);
	shader.fragmentShader = shader.fragmentShader
		.replace(THREES_DECLARATIONS, `${THREES_DECLARATIONS}${THE_NEAR_STRIPS_GLINT}`)
		.replace(THREES_OUTPUT, THE_GLASS_OUTPUT);
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
