// @ts-check
/**
 * The body of a piece of the page standing in the world, in the room's one scene (`DrawnBody` in `src/props/piece.ts`):
 * its walls, drawn back from its face and placed by the matrix the room stands the face's surface by (`stage/room.js`),
 * so the two stand as one wherever the eye goes; the shadow it casts on the plane it was lifted from; and the pit its
 * hole may be sunk into the page as, where the page's surface lays nothing (`stage/page-picture.js`).
 *
 * The walls are the page's matter, as a button rising stands as a column and a part lifted as a plate: matte and lit by
 * no light of the world's. They write depth, so behind the page's plane the page hides them, and they come up out of it
 * as the piece stands out. The room casts the shadow itself, as the stylesheet's is measured in the object's own
 * pixels: a button seen four times as large would cast it four times as far and as soft, spread too thin to show; the
 * stylesheet drops its own where the room draws a body (`stage/stage.css`).
 *
 * A pit is a hole in the screen, not in the page's picture: a shade fading the page leaves it, and nothing lies over
 * its mouth to hide it as the screen goes down, so its walls show as far as the screen has come up. In the window's
 * shade a piece's walls and its pit fade in light as the window's metal does (`Fading` in `body.js`), so a piece lying
 * on its faded page shows no pit lighter than the page round it.
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
import { Fading } from './body.js';
import { matrixOf, placedBy } from './matrices.js';
import { PAST_A_ROUNDED_BOX, PREMULTIPLIED, valuesSet } from './passes.js';
import { WORLD_PARTS } from './see-through.js';
/** @import { HSL, Object3D, Side } from 'three' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { DrawnObject } from '../src/props/object.ts' */
/** @import { DrawnBody, DrawnHole, DrawnPiece } from '../src/props/piece.ts' */
/** @import { Look } from '../src/props/look.ts' */
/** @import { Box, Corners, Size } from '../src/domain/geometry.ts' */
/** @import { BehindThePage } from './page-picture.js' */

/**
 * What walls are built of, in the frame's pixels: the size of the outline they are drawn back from and its corners, how
 * deep they are drawn back, their colour and their glow. A piece's are its figure's and its body's: not how high its
 * face stands, which moves the shadow alone, so a piece rising keeps its walls.
 * @typedef {{
 *   readonly width: number,
 *   readonly height: number,
 *   readonly corners: Corners,
 *   readonly depth: number,
 *   readonly walls: string,
 *   readonly glow: number
 * }} Measures
 */
/**
 * How walls of a kind are drawn: the side of their faces the eye sees, how dark they are, a share of their colour, at
 * their face and at their back, and whether a lid closes their back.
 * @typedef {{
 *   readonly seenFrom: Side,
 *   readonly face: number,
 *   readonly back: number,
 *   readonly floored: boolean
 * }} WallsKind
 */
/**
 * A pit sunk into the page as the room draws it, on the window's plane where the screen lies there, in the frame's
 * pixels as large as the screen shows there: its mouth, how round each of its corners is, how far it is open, as far as
 * its hole has come, and how deep it is; its walls' colour; their glow; how clear they are, from 0 to 1, as far as the
 * screen it is sunk into has come up; and how far the window's shade reaches it, from 0 to 1, wholly where its piece
 * stands in the shade, none where it stands in no shade.
 * @typedef {{
 *   readonly mouth: Box,
 *   readonly corners: Corners,
 *   readonly open: number,
 *   readonly depth: number,
 *   readonly walls: string,
 *   readonly glow: number,
 *   readonly clear: number,
 *   readonly shaded: number | null
 * }} SunkPit
 */

// The shadow of a piece with a body: as dark as 0.8 at its strongest; dropped toward its foot 14 of the page's pixels
// for a rise of 12; and soft for as far each way as the face stands high
const SHADOW_DARKEST = 0.8;
const SHADOW_DROP_PIXELS = 14;
const FACE_RISE_PIXELS = 12;
const SHADOW_DROP_A_HEIGHT = SHADOW_DROP_PIXELS / FACE_RISE_PIXELS;
const SHADOW_SOFT_A_HEIGHT = 1;
// A body's walls: seen from outside, as they stand out of the page; whole at the face and 0.35 of their colour at the
// back; no lid at either end, as the piece's face is their front: a lid there would show whole behind a face that
// fades. A pit's: seen from inside alone, so it stands open at its mouth; 0.6 of its colour at the mouth and 0.18 at
// its floor, deep in the window's shade; its floor a lid at its back. A piece lying on its plane stands in its pit,
// filling it
/** @type {WallsKind} */
const BODY_WALLS = { seenFrom: FrontSide, face: 1, back: 0.35, floored: false };
/** @type {WallsKind} */
const PIT_WALLS = { seenFrom: BackSide, face: 0.6, back: 0.18, floored: true };
// How light the light inside walls is, in their own hue
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
// The values a colour's three channels are kept in, one after another, for each point of the walls
const CHANNELS = 3;
// A shadow of no strength, which is drawn none; and the shadow's square, its depth unscaled
const NO_SHADOW = 0;
const UNSCALED = 1;
// How far depth's offset draws the shadow nearer than the page it lies on, in three's polygon offset steps, past the
// page's own (`PAGE_NEARER` in `room.js`); and when three draws it among what is seen through in the field of what
// writes depth: after the page, which is laid by its clearness there too at three's own order of none, and before the
// window's glass over the page (`GLASS_DRAWN_LAST` in `body.js`). Sorted by its middle's depth alone, it was laid first
// where the eye looked at the page aslant and its middle stood farther than the page's, and the page hid it
const SHADOW_NEARER = -2;
const LAID_AFTER_THE_PAGE = 0.5;
// The measures of walls built of nothing yet
const NONE_BUILT = '';
// Walls shown whole, opaque
const WHOLLY_SHOWN = 1;
// How far the window's shade reaches walls whose piece stands in no shade: not at all
const IN_NO_SHADE = 0;
/** What a piece of markup with no body brings into the world: nothing. @type {readonly Object3D[]} */
const NO_PARTS = [];
/**
 * The pits under the screen where it shows a film's own page, or under a hole with none.
 * @type {readonly SunkPit[]}
 */
const NO_PITS = [];

// The shadow's square, its points placed from its middle in the frame's pixels as its size has them
const SHADOW_VERTEX = `
uniform vec2 size;
varying vec2 fromTheMiddle;
void main() {
	fromTheMiddle = (uv - 0.5) * size;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
// The shadow: the piece's outline, its corners as round, as dark as its strength has it within it, soft for as far each
// way as it blurs, in the look's shadow colour, premultiplied. How far a point stands outside a box rounded at each
// corner is how far it stands outside one rounded at every corner as its own quarter's is
const SHADOW_FRAGMENT = `
uniform vec2 halfSize;
uniform vec4 corners;
uniform float blur;
uniform float darkness;
uniform vec3 colour;
varying vec2 fromTheMiddle;
${PAST_A_ROUNDED_BOX}
void main() {
	// Three's y runs up the outline, the corners' order down it
	float outside = pastABoxRoundedAtEach(vec2(fromTheMiddle.x, -fromTheMiddle.y), halfSize, corners);
	float shade = darkness * (1.0 - smoothstep(-blur, blur, outside));
	gl_FragColor = vec4(colour * shade, shade);
}`;

/**
 * The bodies of the pieces of markup standing in an exposure's world, each by its place among them, as the room keeps a
 * surface of each (`stage/room.js`): its walls and its shadow, as last built.
 */
export class PieceBodies {
	constructor() {
		/** @type {PieceBody[]} */
		this.bodies = [];
	}

	/**
	 * What an object of markup standing in the world brings into the world beside its surface, by its place among an
	 * exposure's: a piece with a body its walls, placed by its matrix, faded as far as the page has faded where the
	 * window's shade reaches the piece, and its shadow where it casts one, in the look's shadow colour; anything else
	 * nothing.
	 * @param {number} place @param {DrawnObject} object @param {Look} look @param {number} pageFaded how far the page has
	 * faded into what stands behind it @returns {readonly Object3D[]}
	 */
	posed(place, object, look, pageFaded) {
		const piece = object.content;
		if (piece.kind !== 'piece' || piece.body === null) return NO_PARTS;
		while (this.bodies.length <= place) this.bodies.push(new PieceBody());
		const body = bodyAt(this.bodies, place);
		const placing = matrixOf(object.inTheEyesSpace);
		body.walls.fading.fadedAsFarAs(pageFaded * (piece.shaded ?? IN_NO_SHADE));
		const walls = body.wallsPosed(piece, piece.body, placing);
		if (piece.body.shadow === NO_SHADOW) return [walls];
		return [walls, body.shadowPosed(piece, piece.body, placing, look.paneShadowColour)];
	}

	/** What every piece's walls fade into, as the room has laid the world before them. @param {BehindThePage} behind */
	behindSet(behind) {
		for (const body of this.bodies) body.walls.fading.behindSet(behind);
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
	 * are not what they were built of, placed by a matrix, its mouth's middle at its origin, as clear as the pit is, and
	 * faded as far as the page has faded where the window's shade reaches the pit.
	 * @param {number} place @param {SunkPit} pit @param {Matrix4} placing @param {number} pageFaded how far the page has
	 * faded into what stands behind it @returns {Object3D}
	 */
	posed(place, pit, placing, pageFaded) {
		while (this.pits.length <= place) this.pits.push(new Walls(PIT_WALLS));
		const { width, height } = pit.mouth;
		const measures = { width, height, corners: pit.corners, depth: pit.depth, walls: pit.walls, glow: pit.glow };
		const walls = wallsAt(this.pits, place);
		walls.shownAsFarAs(pit.clear);
		walls.fading.fadedAsFarAs(pageFaded * (pit.shaded ?? IN_NO_SHADE));
		return walls.posed(measures, placing);
	}

	/** What every pit's walls fade into, as the room has laid the world before them. @param {BehindThePage} behind */
	behindSet(behind) {
		for (const pit of this.pits) pit.fading.behindSet(behind);
	}
}

/**
 * The pits sunk into the page under the holes on the screen, where it shows the filmed page, which the holes are left
 * in, each where the screen lies on the window's plane, as large as it shows there; none where it shows a film's own
 * page.
 * @param {DrawnScene} scene @param {Size} screen @returns {readonly SunkPit[]}
 */
export function pitsSunkIn(scene, screen) {
	const filmed = scene.screen.filmed;
	if (filmed === null) return NO_PITS;
	const scale = filmed.box.width / screen.width;
	return scene.holes.flatMap((hole) => pitUnder(hole, filmed.box, scale));
}

/**
 * The pit a hole on the screen is sunk into the page as, where it has one: where it lies on the window's plane, the
 * screen lying there in a box at a scale.
 * @param {DrawnHole} hole @param {Box} screenBox @param {number} scale @returns {readonly SunkPit[]}
 */
function pitUnder(hole, screenBox, scale) {
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
			corners: cornersScaled(hole.corners, scale),
			open: hole.shown,
			depth: hole.pit.depth * scale,
			walls: hole.pit.walls,
			glow: hole.pit.glow,
			clear: hole.pit.clear,
			shaded: hole.pit.shaded
		}
	];
}

/**
 * A box's least round corner, which a shader that rounds a box as one radius rounds it by, so no square corner of the
 * box falls outside it.
 * @param {Corners} corners @returns {number}
 */
export function leastRound(corners) {
	return Math.min(corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft);
}

/**
 * Corners as round as a box drawn at a scale shows them.
 * @param {Corners} corners @param {number} scale @returns {Corners}
 */
function cornersScaled(corners, scale) {
	return {
		topLeft: corners.topLeft * scale,
		topRight: corners.topRight * scale,
		bottomRight: corners.bottomRight * scale,
		bottomLeft: corners.bottomLeft * scale
	};
}

/**
 * Walls of a kind drawn back from an outline: as last built, and the measures they were built of, built anew only as
 * those change. Their one material is given as a list, so three draws the groups of points they keep alone.
 */
class Walls {
	/** @param {WallsKind} kind */
	constructor(kind) {
		this.material = new MeshBasicMaterial({ vertexColors: true, side: kind.seenFrom });
		this.fading = new Fading(this.material);
		this.mesh = new Mesh(new BufferGeometry(), [this.material]);
		this.mesh.matrixAutoUpdate = false;
		this.mesh.layers.set(WORLD_PARTS.opaque);
		this.kind = kind;
		this.builtOf = NONE_BUILT;
	}

	/**
	 * The walls posed: built of their measures where those are not what they were built of, and placed by a matrix, their
	 * face at its origin.
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
	 * share, as the screen a pit is sunk into goes down, or a piece fades. Three compiles a material anew as it comes to
	 * be seen through, or stops, only when told.
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
	 * The walls posed for a piece: built of its figure, corners and body, placed by its matrix, its face at its own
	 * origin, and as clear as the body is, as far as the piece has not faded.
	 * @param {DrawnPiece} piece @param {DrawnBody} body @param {Matrix4} placing
	 */
	wallsPosed(piece, body, placing) {
		const { width, height } = piece.figure;
		const { walls, glow } = body;
		this.walls.shownAsFarAs(body.clear);
		return this.walls.posed({ width, height, corners: piece.corners, depth: body.thickness, walls, glow }, placing);
	}

	/**
	 * The shadow posed for a piece: its outline, as far behind its face as the face stands out, dropped toward its foot
	 * and soft as far as the face stands high, as dark as the body has it cast, in a colour.
	 * @param {DrawnPiece} piece @param {DrawnBody} body @param {Matrix4} placing @param {string} colour
	 */
	shadowPosed(piece, body, placing, colour) {
		const blur = body.height * SHADOW_SOFT_A_HEIGHT;
		const width = piece.figure.width + blur * HALVES;
		const height = piece.figure.height + blur * HALVES;
		const { corners } = piece;
		valuesSet(this.shadow.material, {
			size: new Vector2(width, height),
			halfSize: new Vector2(piece.figure.width / HALVES, piece.figure.height / HALVES),
			corners: new Vector4(corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft),
			blur,
			darkness: SHADOW_DARKEST * body.shadow,
			colour: new Color(colour)
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
 * Walls of a kind: an outline, its corners as the engine fits them, drawn back as deep as named, its face at its origin
 * toward three's z, no lid at its face and one at its back where the kind is floored; each point coloured as far toward
 * their back as it stands, from the share of their colour the kind has at the face to its share at the back, and the
 * light inside them (`glowOf`) added all over as strongly as their glow. One law for a piece's body and a pit, so a
 * change to it moves both.
 * @param {Measures} measures @param {WallsKind} kind
 */
function wallsOf(measures, kind) {
	const { width, height, depth } = measures;
	const outline = outlineOf(width, height, measures.corners);
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
 * The colour walls glow in, lit from within: their own hue, as saturated, at the light's lightness, so black or grey
 * walls glow grey-white and coloured ones in their colour.
 * @param {Color} walls
 */
function glowOf(walls) {
	const own = walls.getHSL(/** @type {HSL} */ ({}));
	return new Color().setHSL(own.h, own.s, GLOW_LIGHTNESS);
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
