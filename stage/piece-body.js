// @ts-check
/**
 * The body of a piece of the page standing in the world, in the room's one scene (`DrawnBody` in
 * `src/props/piece.ts`): its walls, the piece's outline with its four corners drawn back from its face as thick as the
 * engine hands, and the shadow it casts on the plane it was lifted from. The stage draws the face itself, in a surface
 * of markup of its own the room stands where the piece's matrix places it (`stage/room.js`); the walls stand by the
 * same matrix behind it, so the two stand as one wherever the eye goes, and the room's lens blurs them by depth as all
 * else.
 *
 * The walls are the page's matter, as the promo drew a button rising as a column and a part lifted as a plate: matte
 * and lit by no light of the world's, their colour the film's at the face darkening toward the back, a light in their
 * own hue showing through as faintly as the film names. They write depth, so standing behind the page's plane, as a
 * piece on the plane it was lifted from stands, the page hides them, and they come up out of it as the piece stands
 * out. They are built anew only as their own measures change: a piece standing, or rising with its walls whole, keeps
 * the walls it has.
 *
 * The shadow lies as far behind the face as the face stands out, on the plane the piece was lifted from, as dark as
 * the piece's shadow is strong, and dropped toward its foot and soft as far as the face stands high, as the promo's
 * column cast it: the stylesheet's shadow of an object standing out is measured in the object's own pixels, so a
 * button seen four times as large cast it four times as far and as soft, spread too thin to show (the asking beats'
 * Story button at 26.6 s). The stylesheet drops the markup's shadow where the room draws a body, as it would lie on the
 * face's own plane over the walls (`stage/stage.css`). It is laid over what lies there in linear light, as three lays a
 * film's light, writing no depth, nearer by depth's offset than the page it lies on.
 */
import {
	BufferGeometry,
	Color,
	ExtrudeGeometry,
	Float32BufferAttribute,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	PlaneGeometry,
	ShaderMaterial,
	Shape,
	Vector2,
	Vector4
} from 'three';
import { matrixOf, placedBy } from './matrices.js';
import { PREMULTIPLIED, valuesSet } from './passes.js';
import { WORLD_PARTS } from './see-through.js';
/** @import { Object3D } from 'three' */
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { Corners, DrawnBody, DrawnPiece } from '../src/props/piece.ts' */
/** @import { Look } from '../src/props/look.ts' */

/**
 * What a piece's walls are built of, in the frame's pixels: its figure's size, its corners, and its body's thickness,
 * colour and glow; not how high its face stands, which moves the shadow alone, so a piece rising keeps its walls.
 * @typedef {{ readonly width: number, readonly height: number, readonly corners: Corners, readonly thickness: number, readonly walls: string, readonly glow: number }} Measures
 */

// The shadow of a piece with a body, as the promo's column cast it (`lift.js` SHADOW, LIFT): as dark as 0.8 at its
// strongest; dropped toward its foot 14 of the page's pixels for a rise of 12; and soft for as far each way as the face
// stands high
const SHADOW_DARKEST = 0.8;
const COLUMNS_DROP = 14;
const COLUMNS_RISE = 12;
const SHADOW_DROP_A_HEIGHT = COLUMNS_DROP / COLUMNS_RISE;
const SHADOW_SOFT_A_HEIGHT = 1;
// How dark the walls are at the back, a share of their colour at the face, as both the promo's walls darken
const BACK_SHADE = 0.35;
// How finely a corner is cut, in straight lines a quarter-turn
const CORNER_SEGMENTS = 16;
// The walls and the shadow moved neither across nor down from the piece's middle, but the shadow dropped
const UNMOVED = 0;
// A value of the shadow's before it is first set
const NOT_YET_SET = null;
// No turn, a quarter-turn, a half-turn, three quarters and a whole one, in radians, as a corner's arc runs from the one
// before; and the half of a side its edge stands from its middle
const HALVES = 2;
const NO_TURN = 0;
const QUARTER_TURN = Math.PI / HALVES;
const HALF_TURN = Math.PI;
const THREE_QUARTERS = HALF_TURN + QUARTER_TURN;
const WHOLE_TURN = HALF_TURN * HALVES;
// A corner's radius shrunk none, as CSS shrinks corners only where two on a side reach past it
const UNSHRUNK = 1;
// The values a colour's three channels are kept in, one after another, for each point of the walls
const CHANNELS = 3;
// A shadow of no strength, and a face standing no higher than its plane, which cast none; and the shadow's square, its
// depth unscaled
const NO_SHADOW = 0;
const ON_ITS_PLANE = 0;
const UNSCALED = 1;
// How far depth's offset draws the shadow nearer than the page it lies on, in three's polygon offset steps, past the
// page's own (`PAGE_NEARER` in `room.js`); and when three draws it among what is seen through in the field of what
// writes depth: after the page, which is laid by its clearness there too at three's own order of none, and before the
// window's glass over the page (`GLASS_DRAWN_LAST` in `body.js`). Sorted by its middle's depth alone, it was laid
// first where the eye looked at the page aslant and its middle stood farther than the page's, and the page hid it
const SHADOW_NEARER = -2;
const LAID_AFTER_THE_PAGE = 0.5;
// The measures of walls built of nothing yet
const NONE_BUILT = '';
/** What a piece of markup with no body brings into the world: nothing. @type {readonly Object3D[]} */
const NO_PARTS = [];

// The shadow's square, its points placed from its middle in the frame's pixels as its size has them
const SHADOW_VERTEX = `
uniform vec2 size;
varying vec2 fromTheMiddle;
void main() {
	fromTheMiddle = (uv - 0.5) * size;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// The shadow: the piece's outline, its corners as round, as dark as its strength has it within it, soft for as far
// each way as it blurs, in the look's shadow colour, premultiplied. How far a point stands outside a box rounded at
// each corner is Inigo Quilez's distance to a rounded box, the corner's radius picked by the quarter the point is in
const SHADOW_FRAGMENT = `
uniform vec2 halfSize;
uniform vec4 corners;
uniform float blur;
uniform float darkness;
uniform vec3 colour;
varying vec2 fromTheMiddle;
float outsideTheOutline(vec2 point) {
	vec2 side = corners.xy;
	if (point.x < 0.0) side = corners.zw;
	float radius = side.x;
	if (point.y < 0.0) radius = side.y;
	vec2 past = abs(point) - halfSize + radius;
	return min(max(past.x, past.y), 0.0) + length(max(past, 0.0)) - radius;
}
void main() {
	float shade = darkness * (1.0 - smoothstep(-blur, blur, outsideTheOutline(fromTheMiddle)));
	gl_FragColor = vec4(colour * shade, shade);
}`;

/**
 * The bodies of the pieces of markup standing in an exposure's world, each by its place among them, as the room keeps
 * a surface of each (`stage/room.js`): its walls and its shadow, as last built.
 */
export class PieceBodies {
	constructor() {
		/** @type {PieceBody[]} */
		this.bodies = [];
	}

	/**
	 * What an object of markup standing in the world brings into the world beside its surface, by its place among an
	 * exposure's: a piece with a body its walls, placed by its matrix, and its shadow where it casts one, standing out
	 * of its plane with a shadow of some strength, in the look's shadow colour; anything else nothing.
	 * @param {number} place @param {DrawnObject} object @param {Look} look @returns {readonly Object3D[]}
	 */
	posed(place, object, look) {
		const piece = object.content;
		if (piece.kind !== 'piece' || piece.body === null) return NO_PARTS;
		while (this.bodies.length <= place) this.bodies.push(new PieceBody());
		const body = bodyAt(this.bodies, place);
		const placing = matrixOf(object.inTheEyesSpace);
		const walls = body.wallsPosed(piece, piece.body, placing);
		const strength = object.effects?.shadow ?? NO_SHADOW;
		if (strength === NO_SHADOW || piece.body.height <= ON_ITS_PLANE) return [walls];
		return [walls, body.shadowPosed(piece, piece.body, placing, { strength, colour: look.paneShadowColour })];
	}
}

/** One piece's walls and shadow, the walls as last built, and the measures they were built of. */
class PieceBody {
	constructor() {
		this.walls = new Mesh(new BufferGeometry(), new MeshBasicMaterial({ vertexColors: true }));
		this.walls.matrixAutoUpdate = false;
		this.walls.layers.set(WORLD_PARTS.opaque);
		this.builtOf = NONE_BUILT;
		this.shadow = new Mesh(
			new PlaneGeometry(),
			new ShaderMaterial({
				uniforms: {
					size: { value: NOT_YET_SET },
					halfSize: { value: NOT_YET_SET },
					corners: { value: NOT_YET_SET },
					blur: { value: NOT_YET_SET },
					darkness: { value: NOT_YET_SET },
					colour: { value: NOT_YET_SET }
				},
				vertexShader: SHADOW_VERTEX,
				fragmentShader: SHADOW_FRAGMENT,
				...PREMULTIPLIED,
				transparent: true,
				depthWrite: false,
				polygonOffset: true,
				polygonOffsetFactor: SHADOW_NEARER,
				polygonOffsetUnits: SHADOW_NEARER
			})
		);
		this.shadow.matrixAutoUpdate = false;
		this.shadow.renderOrder = LAID_AFTER_THE_PAGE;
		this.shadow.layers.set(WORLD_PARTS.opaque);
	}

	/**
	 * The walls posed for a piece: built of its figure, corners and body where those are not what they were built of,
	 * and placed by its matrix, its face at its own origin.
	 * @param {DrawnPiece} piece @param {DrawnBody} body @param {Matrix4} placing
	 */
	wallsPosed(piece, body, placing) {
		/** @type {Measures} */
		const measures = {
			width: piece.figure.width,
			height: piece.figure.height,
			corners: piece.corners,
			thickness: body.thickness,
			walls: body.walls,
			glow: body.glow
		};
		const builtOf = JSON.stringify(measures);
		if (builtOf !== this.builtOf) {
			this.walls.geometry.dispose();
			this.walls.geometry = wallsOf(measures);
			this.builtOf = builtOf;
		}
		placedBy(this.walls, placing);
		return this.walls;
	}

	/**
	 * The shadow posed for a piece: its outline, as far behind its face as the face stands out, dropped toward its foot
	 * and soft as far as the face stands high, as dark as its strength has it, in a colour.
	 * @param {DrawnPiece} piece @param {DrawnBody} body @param {Matrix4} placing
	 * @param {{ readonly strength: number, readonly colour: string }} cast
	 */
	shadowPosed(piece, body, placing, cast) {
		const blur = body.height * SHADOW_SOFT_A_HEIGHT;
		const width = piece.figure.width + blur * HALVES;
		const height = piece.figure.height + blur * HALVES;
		const corners = cornersAsCssDraws(piece.figure.width, piece.figure.height, piece.corners);
		valuesSet(this.shadow.material, {
			size: new Vector2(width, height),
			halfSize: new Vector2(piece.figure.width / HALVES, piece.figure.height / HALVES),
			corners: new Vector4(corners.topRight, corners.bottomRight, corners.topLeft, corners.bottomLeft),
			blur,
			darkness: SHADOW_DARKEST * cast.strength,
			colour: new Color(cast.colour)
		});
		const under = placing
			.clone()
			.multiply(new Matrix4().makeTranslation(UNMOVED, -body.height * SHADOW_DROP_A_HEIGHT, -body.height))
			.multiply(new Matrix4().makeScale(width, height, UNSCALED));
		placedBy(this.shadow, under);
		return this.shadow;
	}
}

/**
 * A piece's walls: its outline drawn back from its face as thick as its body is, its face at their origin toward
 * three's z, each point coloured as far toward its back as it stands, its body's colour at the face, darkening toward
 * the back, and that colour added all over as strongly as the body's glow, a light in their own hue, as the promo's
 * diff lines glow.
 * @param {Measures} measures
 */
function wallsOf(measures) {
	const { thickness } = measures;
	const outline = outlineOf(
		measures.width,
		measures.height,
		cornersAsCssDraws(measures.width, measures.height, measures.corners)
	);
	const geometry = new ExtrudeGeometry(outline, {
		depth: thickness,
		bevelEnabled: false,
		curveSegments: CORNER_SEGMENTS
	});
	geometry.translate(UNMOVED, UNMOVED, -thickness);
	const face = new Color(measures.walls);
	const back = face.clone().multiplyScalar(BACK_SHADE);
	const glow = face.clone().multiplyScalar(measures.glow);
	const position = geometry.getAttribute('position');
	const colours = new Float32Array(position.count * CHANNELS);
	const shade = new Color();
	for (let point = 0; point < position.count; point++) {
		const towardTheFace = (position.getZ(point) + thickness) / thickness;
		shade
			.copy(back)
			.lerp(face, towardTheFace)
			.add(glow)
			.toArray(colours, point * CHANNELS);
	}
	geometry.setAttribute('color', new Float32BufferAttribute(colours, CHANNELS));
	return geometry;
}

/**
 * A box's corners as CSS rounds them: each as named, all shrunk alike where two on a side reach past it, so they meet
 * there.
 * @param {number} width @param {number} height @param {Corners} corners @returns {Corners}
 */
function cornersAsCssDraws(width, height, corners) {
	const shrunk = Math.min(
		UNSHRUNK,
		width / (corners.topLeft + corners.topRight),
		width / (corners.bottomLeft + corners.bottomRight),
		height / (corners.topLeft + corners.bottomLeft),
		height / (corners.topRight + corners.bottomRight)
	);
	return {
		topLeft: corners.topLeft * shrunk,
		topRight: corners.topRight * shrunk,
		bottomRight: corners.bottomRight * shrunk,
		bottomLeft: corners.bottomLeft * shrunk
	};
}

/**
 * A box's outline about its middle, up toward three's y, each corner drawn as an arc as round as named.
 * @param {number} width @param {number} height @param {Corners} corners
 */
function outlineOf(width, height, corners) {
	const right = width / HALVES;
	const top = height / HALVES;
	const shape = new Shape();
	shape.absarc(right - corners.topRight, top - corners.topRight, corners.topRight, NO_TURN, QUARTER_TURN);
	shape.absarc(corners.topLeft - right, top - corners.topLeft, corners.topLeft, QUARTER_TURN, HALF_TURN);
	shape.absarc(corners.bottomLeft - right, corners.bottomLeft - top, corners.bottomLeft, HALF_TURN, THREE_QUARTERS);
	shape.absarc(right - corners.bottomRight, corners.bottomRight - top, corners.bottomRight, THREE_QUARTERS, WHOLE_TURN);
	return shape;
}

/** @param {readonly PieceBody[]} bodies @param {number} place */
function bodyAt(bodies, place) {
	const body = bodies[place];
	if (body === undefined) throw new Error(`the room has built no body for piece ${place + 1} in the world`);
	return body;
}
