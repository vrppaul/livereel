/**
 * The world's light, a part of the world's look (`world.lights`, `world.softBoxes` in `src/props/world.ts`): lights
 * standing in the room that light a film's own things in a lit material, and soft boxes round it, glowing panels the
 * things' faces reflect and are lit by, so every glint on them comes from a light the film placed. livereel's own world
 * has neither, as a film of flat light has none to place.
 *
 * A light stands at a spot of the room and aims at another, as the eye does, in pixels of a frame 1080 high from the
 * frame's middle, `out` toward whoever watches; it shines in a cone, as strong however far it reaches, so its strength
 * is how bright it stands on a white face square to it: the frame's pixels make a falloff by distance mean nothing a
 * film could tune. A soft box stands round the room's middle, as far off as reflections take it, seen from there as
 * wide and high as the angles it spans: only its direction counts, as for anything a face reflects from afar.
 *
 * Everything is handed in the room, in three's axes, as it stands while the world does: each thing carries the room
 * into the eye's own space that sees it (`DrawnThing` in `src/props/thing.ts`), so the eye moving moves none of it.
 *
 * Light brighter than the page's white, a glint off the window's metal or glass or off a thing, may glow round itself,
 * as a lens blooms (`world.bloom`): none in livereel's own world either.
 */
import { type Size, frameScaleOf } from '../domain/geometry.ts';
import {
	A_BRIGHTNESS,
	AN_OPAQUE_COLOUR,
	A_NUMBER,
	A_SHARE,
	type Kind,
	ListOf,
	OfForm,
	Plain,
	needed
} from '../domain/handed.ts';
import {
	A_SPOT,
	type Matrix,
	type Spot,
	chained,
	inThreesAxes,
	lengthOf,
	radians,
	rotationX,
	rotationY,
	rotationZ,
	scaledBy,
	scalingAlong,
	translation,
	wayBetween
} from '../domain/matrix.ts';

/**
 * A light in the room: its colour, in hex; how bright a white face square to it stands, 1 its whole colour; the spot
 * it stands at and the spot it aims at, each in pixels of a frame 1080 high from the frame's middle; how far its cone
 * opens from its middle, in degrees; and how softly the cone's edge falls off, from 0, sharp, to 1, from its middle.
 */
export interface WorldLight {
	readonly colour: string;
	readonly strength: number;
	readonly at: Spot;
	readonly aim: Spot;
	readonly angle: number;
	readonly softness: number;
}

/**
 * A soft box round the room: its colour, in hex; how bright its middle glows, 1 its whole colour, falling off softly to
 * nothing at its sides; the way it stands from the room's middle, turned `round` the upright from straight toward the
 * eye at rest, toward the frame's right for more degrees, and `up` from level, toward the frame's top; how wide and
 * high it spans seen from there, in degrees; and how far it turns round its own middle, clockwise for more degrees as
 * seen from beyond it, looking at the room's middle.
 */
export interface SoftBox {
	readonly colour: string;
	readonly brightness: number;
	readonly round: number;
	readonly up: number;
	readonly width: number;
	readonly height: number;
	readonly lean: number;
}

/**
 * A light as the stage draws it: its colour, strength, angle and softness as written; and the matrices that carry the
 * room's middle to the spot it stands at and the spot it aims at, in the room in three's axes, in the frame's pixels.
 */
export interface DrawnLight {
	readonly colour: string;
	readonly strength: number;
	readonly angle: number;
	readonly softness: number;
	readonly standing: Matrix;
	readonly aimedAt: Matrix;
}

/**
 * A soft box as the stage draws it: its colour and brightness as written, and the matrix that carries a square of one
 * side, facing along three's z, about its middle onto the box, a unit from the room's middle, in three's axes.
 */
export interface DrawnSoftBox {
	readonly colour: string;
	readonly brightness: number;
	readonly placing: Matrix;
}

/**
 * The world's light as the stage draws it: its lights and soft boxes, and how far from the room's middle the farthest
 * corner of a soft box stands, in its units, so the stage looks for them that far.
 */
export interface DrawnLighting {
	readonly lights: readonly DrawnLight[];
	readonly softBoxes: readonly DrawnSoftBox[];
	readonly softBoxesReach: number;
}

/**
 * The glow the room draws round a frame's brightest light, once over the light its exposures gathered, as a lens
 * blooms: how strong, as three's bloom takes its strength, which names no share of the light, its glow gathered from
 * several spreads of the light added up; how far it spreads, from 0, nearest, to 1, widest, the same share of the
 * frame however large it is shot; and the light it glows round, past which alone light blooms, in shares of the
 * page's white.
 */
export interface DrawnBloom {
	readonly strength: number;
	readonly radius: number;
	readonly threshold: number;
}

// Light brighter than the page's own white alone blooms: the glints on the window's edges, its glass and a film's
// things, never a page's letters and buttons, which must be read (the reference promo's threshold)
const BRIGHTER_THAN_THE_PAGE = 1.01;
// How far a cone may open from its middle, in degrees: short of a quarter-turn, past which it is no cone
const WIDEST_CONE = 90;
// How far a soft box may span seen from the room's middle, in degrees: short of a half-turn, which no panel spans
const WIDEST_SPAN = 180;
// How far up or down a soft box may stand from level, in degrees: straight up or down at most
const STRAIGHT_UP = 90;
// Nothing, below which no angle opens and no light aims
const NONE = 0;
// A soft box's square stands a unit from the room's middle, its face toward it, flat along the eye's sight; where
// none stands, the unit is as far as any reaches
const A_UNIT_OUT: Spot = { across: 0, down: 0, out: 1 };
const FLAT_ALONG_ITS_FACE = 1;
const A_UNIT = 1;
// A side of a square, and the half of it its edge stands from its middle
const HALVES = 2;

/**
 * The kind of a light, as a film writes it: of a light's form, and aiming away from where it stands, as a light aiming
 * at its own spot shines no way at all.
 */
class LightKind implements Kind<WorldLight> {
	readonly form: OfForm<WorldLight>;

	constructor(form: OfForm<WorldLight>) {
		this.form = form;
	}

	is(written: unknown): written is WorldLight {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (!this.form.is(written)) return this.form.faultOf(written, place);
		if (lengthOf(wayBetween(written.at, written.aim)) > NONE) return undefined;
		return `${place} aims at the spot it stands at: it aims away from where it stands`;
	}
}

const A_CONE = new Plain(isACone, 'how far its cone opens from its middle, in degrees, more than 0 and less than 90');
const A_SPAN = new Plain(
	isASpan,
	"how far it spans seen from the room's middle, in degrees, more than 0 and less than 180"
);
const AN_ELEVATION = new Plain(isAnElevation, 'how far up from level it stands, in degrees, from -90 to 90');

/** The world's lights, as a film writes them. */
export const A_WORLD_LIGHTS = new ListOf(
	new LightKind(
		new OfForm<WorldLight>(
			{
				colour: needed(AN_OPAQUE_COLOUR),
				strength: needed(A_BRIGHTNESS),
				at: needed(A_SPOT),
				aim: needed(A_SPOT),
				angle: needed(A_CONE),
				softness: needed(A_SHARE)
			},
			'a light: { colour, strength, at, aim, angle, softness }'
		)
	),
	'a list of lights'
);

/** The world's soft boxes, as a film writes them. */
export const A_SOFT_BOXES = new ListOf(
	new OfForm<SoftBox>(
		{
			colour: needed(AN_OPAQUE_COLOUR),
			brightness: needed(A_BRIGHTNESS),
			round: needed(A_NUMBER),
			up: needed(AN_ELEVATION),
			width: needed(A_SPAN),
			height: needed(A_SPAN),
			lean: needed(A_NUMBER)
		},
		'a soft box: { colour, brightness, round, up, width, height, lean }'
	),
	'a list of soft boxes'
);

/**
 * The world's light as the stage draws it on a frame of this size: each light where it stands and aims, each soft box
 * where it glows, and how far the farthest corner of one stands.
 */
export function drawnLighting(
	lights: readonly WorldLight[],
	softBoxes: readonly SoftBox[],
	frame: Size
): DrawnLighting {
	const scale = frameScaleOf(frame);
	return {
		lights: lights.map((light) => drawnLight(light, scale)),
		softBoxes: softBoxes.map(drawnSoftBox),
		softBoxesReach: Math.max(A_UNIT, ...softBoxes.map(cornerReachOf))
	};
}

/** The glow round a frame's brightest light as the room draws it, of this strength and spread: none of no strength. */
export function drawnBloom(strength: number, radius: number): DrawnBloom | null {
	return strength > NONE ? { strength, radius, threshold: BRIGHTER_THAN_THE_PAGE } : null;
}

/** A light as the stage draws it, its spots in the frame's pixels, so many times a frame 1080 high's. */
function drawnLight(light: WorldLight, scale: number): DrawnLight {
	return {
		colour: light.colour,
		strength: light.strength,
		angle: light.angle,
		softness: light.softness,
		standing: inThreesAxes(translation(scaledBy(light.at, scale))),
		aimedAt: inThreesAxes(translation(scaledBy(light.aim, scale)))
	};
}

/**
 * A soft box as the stage draws it: a square grown to the box's span a unit off, turned round its own middle, carried
 * a unit out toward the eye at rest, then turned up and round the room's middle, so its face keeps toward it.
 */
function drawnSoftBox(box: SoftBox): DrawnSoftBox {
	const placing = chained([
		rotationY(box.round),
		rotationX(box.up),
		translation(A_UNIT_OUT),
		rotationZ(box.lean),
		scalingAlong(sideSpanning(box.width), sideSpanning(box.height), FLAT_ALONG_ITS_FACE)
	]);
	return { colour: box.colour, brightness: box.brightness, placing: inThreesAxes(placing) };
}

/** How far from the room's middle a soft box's corners stand: a unit off, and half its sides across and up. */
function cornerReachOf(box: SoftBox): number {
	return Math.hypot(A_UNIT, sideSpanning(box.width) / HALVES, sideSpanning(box.height) / HALVES);
}

/** How long a side a unit off spans so many degrees, seen from its middle's front. */
function sideSpanning(degrees: number): number {
	return HALVES * Math.tan(radians(degrees / HALVES));
}

function isACone(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE && written < WIDEST_CONE;
}

function isASpan(written: unknown): written is number {
	return A_NUMBER.is(written) && written > NONE && written < WIDEST_SPAN;
}

function isAnElevation(written: unknown): written is number {
	return A_NUMBER.is(written) && Math.abs(written) <= STRAIGHT_UP;
}
