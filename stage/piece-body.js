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
 * the piece's shadow is strong and as much as what it stands in lets the face show, and dropped toward its foot and
 * soft as far as the face stands high, as the promo's column cast it: the stylesheet's shadow of an object standing out
 * is measured in the object's own pixels, so a button seen four times as large cast it four times as far and as soft,
 * spread too thin to show (the asking beats' Story button at 26.6 s). The stylesheet drops the markup's shadow where
 * the room draws a body, as it would lie on the face's own plane over the walls (`stage/stage.css`). It is laid over
 * what lies there in linear light, as three lays a film's light, writing no depth, nearer by depth's offset than the
 * page it lies on.
 *
 * A piece's hole may be sunk into the page as a pit: its outline drawn back behind the window's plane as deep as the
 * film names, seen from inside alone, so it stands open at its mouth, where the page's surface lays nothing and writes
 * no depth (`stage/page-picture.js`). Its walls are the body's matter too, of the body's colour darker the deeper, and
 * lit from within by the same law, written once for both. A piece lying on its plane stands in its pit, as the promo's
 * plates fill the pits they left (`story-parts.js`). It is a hole in the screen, not in the page's picture: a shade
 * fading the page leaves it, as the promo's pits stand dark in a faded page, and nothing lies over its mouth to hide it
 * as the screen goes down, so its walls are laid over what lies behind them as far as the screen has come up, as the
 * window's body stands as thick.
 */
import {
	BackSide,
	BufferGeometry,
	Color,
	ExtrudeGeometry,
	Float32BufferAttribute,
	FrontSide,
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
/** @import { HSL, Object3D, Side } from 'three' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { Corners, DrawnBody, DrawnHole, DrawnPiece } from '../src/props/piece.ts' */
/** @import { Look } from '../src/props/look.ts' */
/** @import { Box, Size } from '../src/domain/geometry.ts' */

/**
 * What walls are built of, in the frame's pixels: the size of the outline they are drawn back from and its corners, how
 * deep they are drawn back, their colour and their glow. A piece's are its figure's and its body's: not how high its
 * face stands, which moves the shadow alone, so a piece rising keeps its walls.
 * @typedef {{ readonly width: number, readonly height: number, readonly corners: Corners, readonly depth: number, readonly walls: string, readonly glow: number }} Measures
 */
/**
 * How walls of a kind are drawn: the side of their faces the eye sees, how dark they are, a share of their colour, at
 * their face and at their back, and whether a lid closes their back.
 * @typedef {{ readonly seenFrom: Side, readonly face: number, readonly back: number, readonly floored: boolean }} WallsKind
 */
/**
 * A pit sunk into the page as the room draws it, on the window's plane where the screen lies there, in the frame's
 * pixels as large as the screen shows there: its mouth, how round its corners are, how far it is open, as far as its
 * hole has come, and how deep it is; its walls' colour; their glow; and how far the screen it is sunk into has come
 * up, from 0 to 1, which its walls show as far as.
 * @typedef {{
 *   readonly mouth: Box,
 *   readonly corner: number,
 *   readonly open: number,
 *   readonly depth: number,
 *   readonly walls: string,
 *   readonly glow: number,
 *   readonly shown: number
 * }} SunkPit
 */

// The shadow of a piece with a body, as the promo's column cast it (`lift.js` SHADOW, LIFT): as dark as 0.8 at its
// strongest; dropped toward its foot 14 of the page's pixels for a rise of 12; and soft for as far each way as the face
// stands high
const SHADOW_DARKEST = 0.8;
const COLUMNS_DROP = 14;
const COLUMNS_RISE = 12;
const SHADOW_DROP_A_HEIGHT = COLUMNS_DROP / COLUMNS_RISE;
const SHADOW_SOFT_A_HEIGHT = 1;
// A body's walls: seen from outside, as they stand out of the page; whole at the face and 0.35 of their colour at the
// back, as both the promo's walls darken; no lid at either end, as the piece's face is their front: a lid there showed
// whole behind a face that fades. A pit's: seen from inside alone, so it stands open at its mouth; 0.6 of its colour at
// the mouth and 0.18 at its floor, deep in the window's shade (`story-parts.js` PIT); its floor a lid at its back
/** @type {WallsKind} */
const BODY_WALLS = { seenFrom: FrontSide, face: 1, back: 0.35, floored: false };
/** @type {WallsKind} */
const PIT_WALLS = { seenFrom: BackSide, face: 0.6, back: 0.18, floored: true };
// How light the light inside walls is, in their own hue, as the promo's story parts are lit (`story-parts.js` GLOW)
const GLOW_LIGHTNESS = 0.6;
// The groups three cuts an extrusion's points into: its two lids, the back's points first, then its sides; and the one
// material walls are drawn in, which each group kept names
const LIDS = 0;
const SIDES = 1;
const LIDS_IN_A_GROUP = 2;
const THE_WALLS_MATERIAL = 0;
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
// Walls shown whole, opaque
const WHOLLY_SHOWN = 1;
/** What a piece of markup with no body brings into the world: nothing. @type {readonly Object3D[]} */
const NO_PARTS = [];
/** The pits under the screen where it shows a page of the film's own, or under a hole with none. @type {readonly SunkPit[]} */
const NO_PITS = [];

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
	 * of its plane with a shadow of some strength, as strong as what it stands in lets it show, as the stylesheet fades
	 * the face and the shadow it drops for this one, in the look's shadow colour; anything else nothing.
	 * @param {number} place @param {DrawnObject} object @param {Look} look @returns {readonly Object3D[]}
	 */
	posed(place, object, look) {
		const piece = object.content;
		if (piece.kind !== 'piece' || piece.body === null) return NO_PARTS;
		while (this.bodies.length <= place) this.bodies.push(new PieceBody());
		const body = bodyAt(this.bodies, place);
		const placing = matrixOf(object.inTheEyesSpace);
		const walls = body.wallsPosed(piece, piece.body, placing);
		const strength = (object.effects?.shadow ?? NO_SHADOW) * object.held;
		if (strength === NO_SHADOW || piece.body.height <= ON_ITS_PLANE) return [walls];
		return [walls, body.shadowPosed(piece, piece.body, placing, { strength, colour: look.paneShadowColour })];
	}
}

/**
 * The pits sunk into the page under the holes pieces of it leave, each by its place among an exposure's: its walls, as
 * last built.
 */
export class PagePits {
	constructor() {
		/** @type {Walls[]} */
		this.pits = [];
	}

	/**
	 * A pit posed by its place among an exposure's: its walls seen from inside, built of its mouth and depth where those
	 * are not what they were built of, placed by a matrix, its mouth's middle at its origin, and shown as far as the
	 * screen it is sunk into has come up.
	 * @param {number} place @param {SunkPit} pit @param {Matrix4} placing @returns {Object3D}
	 */
	posed(place, pit, placing) {
		while (this.pits.length <= place) this.pits.push(new Walls(PIT_WALLS));
		const { width, height } = pit.mouth;
		const corners = { topLeft: pit.corner, topRight: pit.corner, bottomRight: pit.corner, bottomLeft: pit.corner };
		const measures = { width, height, corners, depth: pit.depth, walls: pit.walls, glow: pit.glow };
		const walls = wallsAt(this.pits, place);
		walls.shownAsFarAs(pit.shown);
		return walls.posed(measures, placing);
	}
}

/**
 * The pits sunk into the page under the holes on the screen, where it shows the filmed page, which the holes are left
 * in, each where the screen lies on the window's plane, as large as it shows there, and shown as far as the screen
 * has come up; none where it shows a page of the film's own.
 * @param {DrawnScene} scene @param {Size} screen @returns {readonly SunkPit[]}
 */
export function pitsSunkIn(scene, screen) {
	const filmed = scene.screen.filmed;
	if (filmed === null) return NO_PITS;
	const scale = filmed.box.width / screen.width;
	return scene.holes.flatMap((hole) => pitUnder(hole, filmed.box, scale, scene.screen.shown));
}

/**
 * The pit a hole on the screen is sunk into the page as, where it has one: where it lies on the window's plane, the
 * screen lying there in a box at a scale, come up so far.
 * @param {DrawnHole} hole @param {Box} screenBox @param {number} scale @param {number} screenShown
 * @returns {readonly SunkPit[]}
 */
function pitUnder(hole, screenBox, scale, screenShown) {
	if (hole.pit === null) return NO_PITS;
	const mouth = {
		left: screenBox.left + hole.box.left * scale,
		top: screenBox.top + hole.box.top * scale,
		width: hole.box.width * scale,
		height: hole.box.height * scale
	};
	return [
		{
			mouth,
			corner: hole.corner * scale,
			open: hole.shown,
			depth: hole.pit.depth * scale,
			walls: hole.pit.walls,
			glow: hole.pit.glow,
			shown: screenShown
		}
	];
}

/**
 * Walls of a kind drawn back from an outline: as last built, and the measures they were built of, built anew only as
 * those change. Their one material is given as a list, so three draws the groups of points they keep alone.
 */
class Walls {
	/** @param {WallsKind} kind */
	constructor(kind) {
		this.material = new MeshBasicMaterial({ vertexColors: true, side: kind.seenFrom });
		this.mesh = new Mesh(new BufferGeometry(), [this.material]);
		this.mesh.matrixAutoUpdate = false;
		this.mesh.layers.set(WORLD_PARTS.opaque);
		this.kind = kind;
		this.builtOf = NONE_BUILT;
	}

	/**
	 * The walls posed: built of their measures where those are not what they were built of, and placed by a matrix,
	 * their face at its origin.
	 * @param {Measures} measures @param {Matrix4} placing
	 */
	posed(measures, placing) {
		const builtOf = JSON.stringify(measures);
		if (builtOf !== this.builtOf) {
			this.mesh.geometry.dispose();
			this.mesh.geometry = wallsOf(measures, this.kind);
			this.builtOf = builtOf;
		}
		placedBy(this.mesh, placing);
		return this.mesh;
	}

	/**
	 * The walls shown as far as a share: opaque where wholly shown, else laid over what lies behind them as far as the
	 * share, as the screen a pit is sunk into goes down. Three compiles a material anew as it comes to be seen through,
	 * or stops, only when told.
	 * @param {number} shown
	 */
	shownAsFarAs(shown) {
		const seenThrough = shown < WHOLLY_SHOWN;
		if (this.material.transparent !== seenThrough) {
			this.material.transparent = seenThrough;
			this.material.needsUpdate = true;
		}
		this.material.opacity = shown;
	}
}

/** One piece's walls and shadow. */
class PieceBody {
	constructor() {
		this.walls = new Walls(BODY_WALLS);
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
	 * The walls posed for a piece: built of its figure, corners and body, and placed by its matrix, its face at its own
	 * origin.
	 * @param {DrawnPiece} piece @param {DrawnBody} body @param {Matrix4} placing
	 */
	wallsPosed(piece, body, placing) {
		const { width, height } = piece.figure;
		const { walls, glow } = body;
		return this.walls.posed({ width, height, corners: piece.corners, depth: body.thickness, walls, glow }, placing);
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
 * Walls of a kind: an outline, its corners as CSS rounds them, drawn back as deep as named, its face at their origin
 * toward three's z, no lid at its face and one at its back where the kind is floored; each point coloured as far toward
 * their back as it stands, from the share of their colour the kind has at the face to its share at the back, and the
 * light inside them (`glowOf`) added all over as strongly as their glow. One law for a piece's body and a pit, so a
 * change to it moves both.
 * @param {Measures} measures @param {WallsKind} kind
 */
function wallsOf(measures, kind) {
	const { width, height, depth } = measures;
	const outline = outlineOf(width, height, cornersAsCssDraws(width, height, measures.corners));
	const geometry = new ExtrudeGeometry(outline, { depth, bevelEnabled: false, curveSegments: CORNER_SEGMENTS });
	keptOfTheExtrusion(geometry, kind.floored);
	geometry.translate(UNMOVED, UNMOVED, -depth);
	const colour = new Color(measures.walls);
	const face = colour.clone().multiplyScalar(kind.face);
	const back = colour.clone().multiplyScalar(kind.back);
	const glow = glowOf(colour).multiplyScalar(measures.glow);
	const position = geometry.getAttribute('position');
	const colours = new Float32Array(position.count * CHANNELS);
	const shade = new Color();
	for (let point = 0; point < position.count; point++) {
		const towardTheFace = (position.getZ(point) + depth) / depth;
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
 * An extrusion cut to the groups of its points three draws in the walls' one material: its sides, and the lid at its
 * back, which three builds first of the two lids, where it is floored; never the lid at its face.
 * @param {ExtrudeGeometry} geometry @param {boolean} floored
 */
function keptOfTheExtrusion(geometry, floored) {
	const lids = geometry.groups[LIDS];
	const sides = geometry.groups[SIDES];
	if (lids === undefined || sides === undefined) throw new Error('three built walls with no lids or no sides');
	geometry.clearGroups();
	if (floored) geometry.addGroup(lids.start, lids.count / LIDS_IN_A_GROUP, THE_WALLS_MATERIAL);
	geometry.addGroup(sides.start, sides.count, THE_WALLS_MATERIAL);
}

/**
 * The colour walls glow in, lit from within: their own hue, as saturated, at the light's lightness, so black
 * or grey walls glow grey-white and coloured ones in their colour, as the promo's story parts glow (`walls.js` of the
 * film, `glowOf`).
 * @param {Color} walls
 */
function glowOf(walls) {
	const own = walls.getHSL(/** @type {HSL} */ ({}));
	return new Color().setHSL(own.h, own.s, GLOW_LIGHTNESS);
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

/** @param {readonly Walls[]} pits @param {number} place */
function wallsAt(pits, place) {
	const walls = pits[place];
	if (walls === undefined) throw new Error(`the room has built no pit ${place + 1} in the page`);
	return walls;
}
