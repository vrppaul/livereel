/**
 * Pieces of the page, shown by an object (`src/moves/object.ts`): a block, the first few blocks a selector matches, or
 * a box of the screen lifted off the page onto the frame, over where the camera shows it as it is lifted, cut to the
 * part the camera shows there (`src/moves/source.ts`); then carried, grown, brought near, turned and put away as any
 * object is, and taken back over its source as the camera shows it then, face-on and as large as it was. It does not
 * follow the camera between, until it is carried onto a block of the page: it lies on the page then, and the camera
 * frames it as it frames the page; lifted into the world riding its block, it stands on the page there from the start,
 * carried as the camera frames the page, as the film scrolls its block and as a fade from its page lays that page. A
 * piece is drawn from the page's picture, so a page framed live, which has none, is refused; and it stands over its
 * source only on a window that faces the frame, where the source shows as a box.
 * Lifted `picture: 'held'`, it is drawn from a picture of its source alone, which the take holds as it is lifted, as
 * sharp as the page's picture is where the page stands still: it shows what the page showed there then, as the page
 * changes under it. So it alone is lifted off a page of the film's own, which the filmed page's picture is not of: the
 * take pictures its source on the page's copy apart, as the page stands at the moment it is lifted.
 * Lifted inside the world, it stands there over its source on the window's plane, wherever the eye stands, and the eye
 * moves past it as it moves past the window, the eye's focus blurring it as it stands off it; carried onto a block of
 * the page from there, it sets off from where it stands, while it lies on the window's plane. There alone it may have
 * a body (`src/props/piece.ts`), which the room draws in its one scene: the frame, a group and the window are drawn
 * flat over everything there, so a body anywhere else is refused.
 *
 * Lifted, it may leave a hole: the ground the page draws behind its block, read as it is lifted, or a colour the film
 * names, where a box of the screen, with no block behind it, needs one; reaching past the piece as far as the film
 * names, a socket its body comes up out of; sunk into the page as a pit with walls of its body's colour, which a piece
 * with no body cannot give; and draw lines from itself to its source. A piece of one block lifted alone has its
 * corners, and its hole's, as round as the page draws the block's, read off it as it is lifted: the page knows how it
 * draws a block, so the film never copies it. A stretch of the page, with air round its blocks, several blocks or a box
 * of the screen, has no corners of its own: they are as round as the film names, square where it names none. A body's
 * walls are of the colour the page shows along the piece's edge as it is lifted, as the claude-review promo reads a
 * thing's walls off its picture, where the film names none. Every move of it takes the piece named `piece`, or the one
 * the film names `as`.
 *
 * It may empty a block of the filmed page, which then stands as the page draws it hidden until the piece goes; wiped
 * away while it lies on the page, it and the block go behind one edge, set off from the near side of either, as the
 * claude-review promo's band runs along a review row from its line number, the line lying on its code cut as it passes.
 *
 * Lifted naming a block of its source whose letters it carries, it lands them letter on letter on the letters of a
 * block it is carried onto, as the claude-review promo lands a terminal's diff line on the review's row: grown as far
 * as a letter of the block steps against one of its own, so its letters stand as large as theirs and column on
 * column, its first letter where theirs starts, its middle on theirs. Where letters start is read off the block's
 * first laid-out letter, or, in a blank line of code, off its content box, so it lands as its neighbours do; how far
 * one steps, off the font they are set in. Only the film knows which of its source's letters are the block's: the
 * diff's sign stands in a terminal's line and in a column of its own on the review. Its letters are measured as it is
 * lifted, off the page it is lifted off as it stands then, as its picture is taken; the block's as it lands.
 */
import { type Camera, boxOnTheFrame } from '../domain/camera.ts';
import { FilmError } from '../domain/errors.ts';
import {
	type Box,
	type Corners,
	FRAME_SIDES,
	type FrameSide,
	type Size,
	boxAround,
	cornersAlike,
	cornersFitting,
	frameScaleOf,
	middleY,
	sharesIn
} from '../domain/geometry.ts';
import {
	AN_OPAQUE_COLOUR,
	A_COLOUR,
	A_COUNT,
	A_PIXELS,
	A_SELECTOR,
	A_SHARE,
	A_SIZE,
	type Form,
	type Kind,
	Literal,
	OfForm,
	OneOf,
	Plain,
	assertKind,
	assertWritten,
	needed
} from '../domain/handed.ts';
import type { Place } from '../domain/place.ts';
import { ON_THE_PAGE, ON_THE_PAGE_IN_THE_WORLD, cameraOnItsPage } from '../domain/placement.ts';
import {
	A_TARGET,
	type Beginning,
	type Change,
	type Move,
	THE_FIRST,
	type Target,
	refuseOffTheScreen,
	refuseWhereLive,
	shownBox,
	timingOf
} from '../direction/move.ts';
import type { Rounding } from '../direction/page.ts';
import { figureOnThePage } from '../props/lifted.ts';
import type { ObjectName } from '../props/object.ts';
import {
	type Body,
	type Emptied,
	FOLLOWING_THE_PAGE,
	type Hole,
	type InTheShade,
	type Piece,
	type PiecePicture,
	type Pit,
	figureIn
} from '../props/piece.ts';
import { THE_FILMED_PAGE, pageShownBy } from '../props/screen.ts';
import { holdersIn } from '../scene.ts';
import { A_STROKE, type Stroke } from '../props/stroke.ts';
import {
	type Coming,
	type EffectsScript,
	GOES_AS_IT_STANDS,
	GROUPED_FORM,
	type GroupedScript,
	HIDE_FORM,
	type HideScript,
	NAMED_FORM,
	type NamedScript,
	type ObjectLeanScript,
	type OntoScript,
	READ_AS_THE_WINDOW,
	SHOWN_STANDING_OUT_FORM,
	type ShowingOf,
	type ShownKind,
	type ShownStandingOutScript,
	TAKEN_FORM,
	THE_STEPS_CURVE,
	type TakenScript,
	type ToScript,
	contentMove,
	objectBack,
	objectEffects,
	objectHide,
	objectLean,
	objectOnto,
	objectShow,
	objectShowRiding,
	objectTo,
	showing,
	standingOfKind
} from './object.ts';
import {
	BORN_ON_THE_FRAME,
	NO_AIR,
	NO_PLACE,
	ONE_BLOCK,
	type Taking,
	cameraFrontOn,
	overItsSource,
	sourceOf
} from './source.ts';
import { NO_SHEEN, type Sheen, THE_FIGURE, type Wipe } from '../props/way.ts';
import { IN_PLACE_SHOW_FORM, type InPlaceShowScript } from './way.ts';

/**
 * What fills the part of the screen a piece is lifted off: the ground the page draws behind its block, `'page'`, where
 * the film names none, or a colour in hex; the line round its edge, where the film names one; how far past the piece's
 * edge it reaches each way, in the page's pixels, none where the film names none; and the pit it is sunk into the page
 * as, where the film names one.
 */
export interface HoleScript {
	readonly ground?: string;
	readonly line?: Stroke;
	readonly reach?: number;
	readonly pit?: PitScript;
}

/**
 * A hole's pit as a film writes it: how deep it is sunk into the page, in the page's pixels; and how strongly a light
 * in its walls' own hue shows in it, from 0 to 1, none where the film names none. Its walls are the piece's body's
 * colour.
 */
export interface PitScript {
	readonly depth: number;
	readonly glow?: number;
}

/**
 * A piece's body as a film writes it: how thick it is back from its face, in the page's pixels, as its corners are;
 * its walls' colour, in hex with no alpha, the colour the page shows along the piece's edge where the film names none;
 * and how strongly a light in their own hue shows through them, from 0 to 1, none where the film names none.
 */
export interface BodyScript {
	readonly thickness: number;
	readonly walls?: string;
	readonly glow?: number;
}

/**
 * How a piece lifted into the world stands in the window's shade, as a film writes it: reached by it as the page is
 * while it lies on the page, and none from the height its face clears the shade at, `clearAt`, in pixels of a frame
 * 1080 high, as `effects({ depth })` brings it out.
 */
export interface ShadeScript {
	readonly clearAt: number;
}

/**
 * How a piece is lifted: off the first `every` blocks a selector matches, together, with `air` clear round them, in the
 * page's pixels; how round the corners of a stretch of the page it lifts are, `corner`, a radius in the page's pixels,
 * which one block lifted alone refuses, as it is as round as the page draws it; the hole it leaves and the line the
 * lines from it to its source are drawn in, where the film names them; the `picture` it is drawn from, the page's as
 * it changes, `'following'`, where the film names none, or one of its source held as it is lifted, `'held'`; how it
 * comes up; which piece; the world it stands `inside`, which the eye moves through, or the group it stands in, if
 * either; its `body` in the world, if the film names one; whether it `rides` its block in the world, `'its block'`,
 * standing on the page there, carried as the camera frames the page, by the film's scrolls of every block whose scroll
 * carries its source and where a fade from the page lays it; the block whose `letters` it carries, a selector, which
 * it lands on a block's letters, if the film names one; how it stands out as it comes up, `effects`; and whether it
 * stands in the window's `shade` in the world, and to what height, where the film names it.
 */
export interface PieceScript extends InPlaceShowScript, NamedScript, GroupedScript, ShownStandingOutScript {
	readonly every?: number;
	readonly air?: number;
	readonly corner?: number;
	readonly hole?: HoleScript;
	readonly lines?: Stroke;
	readonly picture?: PiecePicture['kind'];
	readonly inside?: 'world';
	readonly body?: BodyScript;
	readonly rides?: 'its block';
	readonly letters?: string;
	readonly shade?: ShadeScript;
}

/** How a piece goes: as any object does, and with the sheen a wipe trails, where the film names one. */
export interface PieceHideScript extends HideScript {
	readonly sheen?: SheenScript;
}

/**
 * The light a piece wiped away trails behind the wipe's edge, over the page it leaves, as a film writes it: its
 * `colour`, in hex with no alpha, the look's accent where the film names none; and how far it trails, `width`, in
 * pixels of a frame 1080 high, as all a piece shows is drawn: on the page, the page's own pixels in a frame 1080 high.
 */
export interface SheenScript {
	readonly colour?: string;
	readonly width?: number;
}

/**
 * How a hole is filled, as a piece is made: with the ground the page draws behind a block a selector names, or a
 * colour.
 */
type Filling =
	{ readonly kind: 'behind'; readonly selector: string } | { readonly kind: 'colour'; readonly colour: string };

/**
 * A hole as a piece is made: how it is filled, the line round its edge, if any, how far past the piece it reaches, and
 * its pit, if any, whose walls are its piece's body's as the piece is lifted.
 */
interface HoleAsked {
	readonly filling: Filling;
	readonly line: Stroke | null;
	readonly reach: number;
	readonly pit: Omit<Pit, 'walls'> | null;
}

/** Whether each side of a part of the screen stands on a side of another part. */
type SidesStanding = { readonly [Side in FrameSide]: boolean };

/**
 * How round a piece's corners are, as it is made: as the page draws its one block, read off it as it is lifted; or as
 * round as the film names each, square where it names none.
 */
type CornersAsked =
	{ readonly kind: 'its block'; readonly block: string } | { readonly kind: 'named'; readonly radius: number };

/**
 * The colour of a body's walls, as a piece is made: the colour its picture shows along its edge as it is lifted, or the
 * colour the film names.
 */
type WallsAsked = { readonly kind: 'its edge' } | { readonly kind: 'named'; readonly colour: string };

/** A piece's body as it is made: as the film writes it, its walls' colour still to read where it names none. */
interface BodyAsked extends Omit<Body, 'walls'> {
	readonly walls: WallsAsked;
}

/**
 * What a piece is lifted with, as it is made: how its source is taken, how many blocks, with how much air round them
 * and where it is born; how round its corners are, the hole it leaves, if any, its lines, if any, the kind of picture
 * it is drawn from, its body, if any, the block whose letters it carries, if any, and the window's shade it stands in,
 * as the film writes it, if it does.
 */
interface Lifting extends Taking {
	readonly corners: CornersAsked;
	readonly hole: HoleAsked | null;
	readonly lines: Stroke | null;
	readonly picture: PiecePicture['kind'];
	readonly body: BodyAsked | null;
	readonly letters: string | null;
	readonly shade: ShadeScript | null;
}

const PIECE = 'piece' satisfies ShownKind;
const PIECE_HIDE = 'piece.hide';
const SHEEN_FORM: Form<SheenScript> = { colour: AN_OPAQUE_COLOUR, width: A_PIXELS };
const PIECE_HIDE_FORM: Form<PieceHideScript> = {
	...HIDE_FORM,
	sheen: new OfForm(SHEEN_FORM, 'a sheen: { colour, width }')
};
// How far a sheen trails where the film names no width: as far as the claude-review promo's band running along a line
// of its review trails its edge, 0.03 of the review's 1600 pixels (into-review.js SHEEN); and in the look's accent
// where it names no colour
const SHEEN_TRAILS = 48;
const ACCENTED = null;
// The move that empties a block, as its refusals name it
const PIECE_EMPTIES = 'piece.empties';
// What a piece lies in where it lies on the page, carried there from the frame or from the world, so it shares the
// screen's pixels with a block of the page; not a ride, whose box stands in its page's pixels as the ride began, laid
// where that page lies now
const LYING_ON_THE_PAGE = [ON_THE_PAGE, ON_THE_PAGE_IN_THE_WORLD];
// A piece lifted empties no block
const EMPTIES_NONE = null;
// The length of a figure a wipe from each of its edges crosses
const LENGTH_ACROSS_FROM: { readonly [Edge in FrameSide]: keyof Size } = {
	left: 'width',
	right: 'width',
	top: 'height',
	bottom: 'height'
};
// The corners of a stretch of the page where the film names none: square, as its box
const SQUARE = 0;
// A body's walls where the film names no colour: of the colour the piece's picture shows along its edge
const OF_ITS_EDGE: WallsAsked = { kind: 'its edge' };
// How near, in the page's pixels, an edge of a piece stands to an edge of what the camera shows to stand on it
const ON_THE_EDGE = 0.5;
// The word a film names the ground the page draws behind a block by, for a hole
const PAGES_GROUND = 'page';
const A_HOLE_GROUND: Kind<string> = new Plain(
	(written): written is string => written === PAGES_GROUND || A_COLOUR.is(written),
	`the ground the page draws behind the block, "${PAGES_GROUND}", or a colour in hex`
);
const PIT_FORM: Form<PitScript> = { depth: needed(A_PIXELS), glow: A_SHARE };
const HOLE_FORM: Form<HoleScript> = {
	ground: A_HOLE_GROUND,
	line: A_STROKE,
	reach: A_PIXELS,
	pit: new OfForm(PIT_FORM, 'a pit: { depth, glow }')
};
// A hole reaching no farther than its piece's edge where the film names no reach
const NO_REACH = 0;
const PIECE_PICTURES = ['following', 'held'] as const satisfies readonly PiecePicture['kind'][];
const A_PIECE_PICTURE: Kind<PiecePicture['kind']> = new OneOf(
	PIECE_PICTURES,
	`what a piece is drawn from: "following", the page's picture as it changes, or "held", a picture of its source held as it is lifted`
);
const BODY_FORM: Form<BodyScript> = { thickness: needed(A_PIXELS), walls: AN_OPAQUE_COLOUR, glow: A_SHARE };
// A body's walls, or a pit's, lit from within by no light where the film names none
const NO_GLOW = 0;
// A piece that carries no letters where the film names no block of them, and lands as large as a block holds it
const CARRIES_NONE = null;
// A piece the window's shade reaches none of where the film lifts it into no shade
const IN_NO_SHADE = null;
const SHADE_FORM: Form<ShadeScript> = { clearAt: needed(A_SIZE) };
const PIECE_FORM: Form<PieceScript> = {
	every: A_COUNT,
	air: A_PIXELS,
	corner: A_PIXELS,
	hole: new OfForm(HOLE_FORM, 'a hole: { ground, line, reach, pit }'),
	lines: A_STROKE,
	picture: A_PIECE_PICTURE,
	// A piece stands inside the world alone: it lies in the window only where it is carried onto the page (`onto`)
	inside: new Literal('world'),
	body: new OfForm(BODY_FORM, 'a body: { thickness, walls, glow }'),
	// The page finds the blocks that carry a piece's source, so the film names none, and none by a selector it mistypes
	rides: new Literal('its block'),
	letters: A_SELECTOR,
	shade: new OfForm(SHADE_FORM, "the window's shade it stands in: { clearAt }"),
	...IN_PLACE_SHOW_FORM,
	...NAMED_FORM,
	...GROUPED_FORM,
	...SHOWN_STANDING_OUT_FORM
};
/**
 * A piece of the page lifted off a target, a selector's first `every` blocks together or a box of the screen, over
 * where the camera shows it, cut to the part it shows, its corners as round as its one block's or as the film names,
 * leaving the hole and drawing the lines the film names, drawn from the picture the film names: in place of any piece
 * of its name, in its own way, fading up whole, or in a way of livereel's the film names, with the body the film names;
 * in the world, riding its block wherever the camera, the window, the film's scrolls and a fade take it, where the film
 * asks. A hole over a box of the screen, which has no block to read the ground behind, is refused unless the film
 * names its colour; a pit on a piece with no body, whose colour its walls take, is refused; and a corner named for one
 * block lifted alone, which the page draws.
 */
export function show(target: Target, script: PieceScript = {}): Move {
	assertKind(target, A_TARGET, "piece.show's target");
	assertWritten(script, PIECE_FORM, 'piece.show');
	const taking = takingOf(script);
	const body = script.body === undefined ? null : bodyAsked(script.body, script.inside);
	const lifting: Lifting = {
		...taking,
		corners: cornersAsked(target, taking, script.corner),
		hole: script.hole === undefined ? null : holeAsked(target, script.hole, body),
		lines: script.lines ?? null,
		picture: script.picture ?? FOLLOWING_THE_PAGE.kind,
		body,
		letters: script.letters ?? CARRIES_NONE,
		shade: script.shade === undefined ? IN_NO_SHADE : shadeAsked(script.shade, script.inside)
	};
	return { ...pieceComing(target, script, lifting), holdsThePage: lifting.picture === 'held' };
}

/**
 * The window's shade a piece stands in as the film names it: refused anywhere but inside the world, where it stands
 * over the page it was lifted off as the window does.
 */
function shadeAsked(shade: ShadeScript, inside: PieceScript['inside']): ShadeScript {
	if (inside !== 'world') {
		throw new FilmError(
			"piece.show lifts a piece into the window's shade inside the world alone, where it stands over the page it was lifted off: lift it inside: 'world'"
		);
	}
	return shade;
}

/**
 * How a piece stands in the window's shade on a frame, as the film names it: the height it clears the shade at counted
 * in the frame's own pixels, as its depth is, where the film writes it in pixels of a frame 1080 high.
 */
function inTheShadeIn(shade: ShadeScript | null, frame: Size): InTheShade | null {
	if (shade === null) return IN_NO_SHADE;
	return { clearAt: shade.clearAt * frameScaleOf(frame) };
}

/**
 * How a piece's source is taken off its target as the film names it: off its first block where it names no more, with
 * no air round them where it names none, born on the frame where it names nothing to stand inside.
 */
function takingOf(script: PieceScript): Taking {
	return {
		every: script.every ?? ONE_BLOCK,
		air: script.air ?? NO_AIR,
		bornIn: script.inside ?? BORN_ON_THE_FRAME
	};
}

/**
 * How round a piece's corners are as the film lifts it: as the page draws its block, where it lifts one block alone,
 * and a corner it names for one is refused; as round as it names else, square where it names none.
 */
function cornersAsked(target: Target, taking: Taking, corner: number | undefined): CornersAsked {
	if (!isOneBlockAlone(target, taking)) return { kind: 'named', radius: corner ?? SQUARE };
	if (corner !== undefined) {
		throw new FilmError(
			`piece.show lifts ${target} alone, as round as the page draws it: drop corner, which rounds a stretch of the page only, lifted with air or off several blocks`
		);
	}
	return { kind: 'its block', block: target };
}

/** Whether a piece is lifted off one block alone: a selector's first block, with no air round it. */
function isOneBlockAlone(target: Target, taking: Taking): target is string {
	return typeof target === 'string' && taking.every === ONE_BLOCK && taking.air === NO_AIR;
}

/**
 * A piece coming up lifted off a target as the film asks: riding its block, the blocks that carry its source, where the
 * film asks so, standing where it comes up else.
 */
function pieceComing(target: Target, script: PieceScript, lifting: Lifting): Move {
	if (script.rides === undefined) {
		return objectShow(PIECE, 'piece.show', script, NO_PLACE, THE_STEPS_CURVE, (beginning) =>
			lifted(beginning, target, lifting)
		);
	}
	return objectShowRiding(PIECE, 'piece.show', script, target, lifting.every, NO_PLACE, THE_STEPS_CURVE, (beginning) =>
		lifted(beginning, target, lifting)
	);
}

/**
 * The piece carried to a place, as large as the place holds its source, growing to `scale` and coming `depth` toward
 * the eye on the way where the film names them.
 */
export function to(place: Place, script: ToScript = {}): Move {
	return objectTo(PIECE, 'piece.to', place, script, READ_AS_THE_WINDOW);
}

/**
 * The piece carried onto the first block a selector matches, or a box of the screen, as large as the block holds its
 * source, in its middle, or with the letters it carries on the block's, to lie on the page there: it lands on the block
 * wherever the camera goes on its way, and keeps that place on the screen after. One standing off the page in the world
 * falls onto it as it travels, on the curve `fall` names.
 */
export function onto(target: Target, script: OntoScript = {}): Move {
	assertKind(target, A_TARGET, "piece.onto's target");
	return objectOnto(PIECE, 'piece.onto', script, (beginning, piece) => landedOn(beginning, target, piece.content));
}

/**
 * The box a piece lies in on the block a target names, as the move begins: the block's, which holds its source as large
 * as it can, in its middle; or, where the piece carries letters, the one that lays them on the block's.
 */
async function landedOn(beginning: Beginning, target: Target, piece: Piece): Promise<Box> {
	if (piece.firstLetter === CARRIES_NONE) return shownBox(beginning, target, THE_FIRST, 'piece.onto');
	return letterOnLetter(piece.source, piece.firstLetter, await firstLetterLandedOn(beginning, target));
}

/**
 * Where the first letter of the block a piece lands its letters on stands on the screen, read as the move begins:
 * refused for a box of the screen, which holds no letters, a block that lays out none, and one standing wholly off the
 * screen.
 */
async function firstLetterLandedOn(beginning: Beginning, target: Target): Promise<Box> {
	if (typeof target !== 'string') {
		throw new FilmError(
			"piece.onto lands the piece's letters on a block's letters, and a box of the screen holds none: name the block by its selector"
		);
	}
	const named = `piece.onto's ${target}`;
	const letter = await beginning.page.letterAtTheStart(target);
	if (letter === null) throw new FilmError(`${named} lays out no letters, as it is hidden: show it first`);
	refuseOffTheScreen(letter, target, beginning.format.screen, named);
	return letter;
}

/**
 * The box a piece's source lies in with the letters it carries on a block's: grown as far as a letter of the block
 * steps against one of its own, so each of its letters stands as large as theirs and over the same column, its first
 * letter where theirs starts, its middle on theirs.
 */
function letterOnLetter(source: Box, carried: Box, onto: Box): Box {
	const growth = onto.width / carried.width;
	return {
		left: onto.left - (carried.left - source.left) * growth,
		top: middleY(onto) - (middleY(carried) - source.top) * growth,
		width: source.width * growth,
		height: source.height * growth
	};
}

/** The piece leant back from its top edge by `tilt`, swung about its middle by `turn` and rolled by `roll`. */
export function lean(script: ObjectLeanScript): Move {
	return objectLean(PIECE, 'piece.lean', script);
}

/**
 * The piece standing out as the film names: ringed, glowing, casting a shadow, blurred, grown or brought toward the eye
 * where it stands, lifting off the page.
 */
export function effects(script: EffectsScript): Move {
	return objectEffects(PIECE, 'piece.effects', script);
}

/**
 * The piece taken back over its source as the camera shows it then, on the page it rides where that page lies then,
 * face-on by its nearest whole turns, as large as its source shows there and on the frame's plane.
 */
export function back(script: TakenScript = {}): Move {
	return objectBack(PIECE, 'piece.back', script, overItsSourceNow);
}

/**
 * The box of the frame a piece's source stands in as a move begins, as the camera shows it on the page the piece rides
 * where that page lies then; refused as the picture the piece is drawn from asks.
 */
function overItsSourceNow(beginning: Beginning, piece: ShowingOf<'piece'>): Box {
	const camera = cameraOverItsPicture(beginning, piece.content.picture.kind, 'piece.back');
	const onItsPage = cameraOnItsPage(piece.inside, holdersIn(beginning.scene, camera));
	return boxOnTheFrame(onItsPage, beginning.format.frame, piece.content.source);
}

/**
 * The scene's camera as a move of a piece over its source begins, refused as the picture the piece is drawn from asks:
 * one following the page's picture where the stage shows no picture of the filmed page, and told to hold its own where
 * the screen shows a page of the film's own, which the filmed page's picture is not of; one holding its picture where
 * the stage shows the page live; and either where its window does not face the frame front on.
 */
function cameraOverItsPicture(beginning: Beginning, picture: PiecePicture['kind'], move: string): Camera {
	refuseWhereLive(beginning, move);
	refuseFollowingOverOwnPage(beginning, picture, move);
	return cameraFrontOn(beginning, overItsSource(move));
}

/**
 * A piece following the filmed page's picture refused while the screen shows a page of the film's own in its place; one
 * holding its picture, taken of whichever page the screen shows, never.
 */
function refuseFollowingOverOwnPage(beginning: Beginning, picture: PiecePicture['kind'], move: string): void {
	switch (picture) {
		case 'held':
			return;
		case 'following':
			if (beginning.scene.screen.shows.kind === THE_FILMED_PAGE.kind) return;
			throw new FilmError(
				`${move} follows the filmed page's picture, and the screen shows the film's own page: lift it holding a picture of its source, picture: 'held'`
			);
	}
}

/**
 * The piece emptying a block of the filmed page from the move's moment: the block stands as the page draws it hidden,
 * the ground the page draws behind it over its box, both read as the move begins, until the piece goes, and a wipe
 * takes it away with the piece. Refused while the screen shows a page of the film's own, which the block is not of.
 */
export function empties(block: string, script: TakenScript = {}): Move {
	assertKind(block, A_SELECTOR, "piece.empties's block");
	assertWritten(script, TAKEN_FORM, PIECE_EMPTIES);
	const name = script.as ?? PIECE;
	return contentMove(name, timingOf(script), (beginning) => emptying(beginning, name, block));
}

/** The piece of a name with a block of the filmed page emptied, read as the move begins. */
async function emptying(beginning: Beginning, name: ObjectName, block: string): Promise<Change> {
	const piece = standingOfKind(beginning, name, PIECE_EMPTIES, PIECE);
	if (beginning.scene.screen.shows.kind !== THE_FILMED_PAGE.kind) {
		throw new FilmError(
			`${PIECE_EMPTIES} reads ${block} off the filmed page, and the screen shows the film's own page: show the filmed page first`
		);
	}
	const emptied: Emptied = {
		box: await shownBox(beginning, block, THE_FIRST, PIECE_EMPTIES),
		ground: await beginning.page.groundBehind(block)
	};
	return showing(name, () => ({ ...piece.content, emptied }));
}

/**
 * The piece going where it stands, or sliding out past a side of the frame; once gone, there is none. Wiped away, it
 * may trail a sheen behind the wipe's edge, as far as the film names across its figure as it stands as it sets off; a
 * sheen in any other way of going is refused as the move is made. A wipe crosses it and the block it emptied as one.
 */
export function hide(script: PieceHideScript = {}): Move {
	assertWritten(script, PIECE_HIDE_FORM, PIECE_HIDE);
	const { sheen, ...going } = script;
	if (sheen !== undefined && going.leave !== 'wipe') {
		throw new FilmError(`${PIECE_HIDE} names a sheen, which trails a wipe's edge: leave: 'wipe'`);
	}
	return objectHide(PIECE, PIECE_HIDE, going, GOES_AS_IT_STANDS, (named, piece, frame) =>
		named.kind === 'wipe' ? pieceWiped(named, piece, sheen, frame) : named
	);
}

/**
 * A piece's wipe as it sets off: trailing the sheen the film names, if any, and crossing the piece and the block it
 * emptied, if any, as one.
 */
function pieceWiped(wipe: Wipe, piece: ShowingOf<'piece'>, sheen: SheenScript | undefined, frame: Size): Wipe {
	const emptied = piece.content.emptied;
	return {
		...wipe,
		sheen: sheen === undefined ? NO_SHEEN : sheenAcross(piece, wipe.edge, sheen, frame),
		crossing: emptied === null ? THE_FIGURE : crossingWith(piece, emptied.box)
	};
}

/**
 * What a piece's wipe crosses as the piece lies on the page, in shares of its figure: its figure and a block it
 * emptied, as one box; refused while it stands off the page, where the block's edge and its own could not be one.
 */
function crossingWith(piece: ShowingOf<'piece'>, block: Box): Box {
	if (!LYING_ON_THE_PAGE.some((holder) => holder.kind === piece.inside.kind)) {
		throw new FilmError(
			`${PIECE_HIDE} would wipe the ${PIECE} across the block it emptied while it stands off the page: carry it onto the page first, piece.onto`
		);
	}
	const figure = figureOnThePage(piece, piece.content);
	return sharesIn(boxAround([figure, block]), figure);
}

/**
 * The sheen a piece trails as the film names it, as far across its figure as the piece stands as it sets off: its
 * width in pixels of a frame 1080 high, as all an object shows is drawn, a share of the figure's length across a wipe
 * from an edge.
 */
function sheenAcross(piece: ShowingOf<'piece'>, edge: FrameSide, sheen: SheenScript, frame: Size): Sheen {
	const figure = figureIn(piece.content.source, piece.box);
	const width = (sheen.width ?? SHEEN_TRAILS) * frameScaleOf(frame);
	return { colour: sheen.colour ?? ACCENTED, trail: width / figure[LENGTH_ACROSS_FROM[edge]] };
}

/**
 * The hole a film names, reaching as far as it names past the piece, none where it names no reach, sunk as the pit it
 * names, of the piece's body's colour; filled with a colour it names, or with the ground behind the block a selector
 * names, refused for a box of the screen, which names no block.
 */
function holeAsked(target: Target, hole: HoleScript, body: BodyAsked | null): HoleAsked {
	const ground = hole.ground ?? PAGES_GROUND;
	const shaped = {
		line: hole.line ?? null,
		reach: hole.reach ?? NO_REACH,
		pit: hole.pit === undefined ? null : pitAsked(hole.pit, body)
	};
	if (ground !== PAGES_GROUND) return { filling: { kind: 'colour', colour: ground }, ...shaped };
	if (typeof target !== 'string') {
		throw new FilmError(
			"piece.show's hole over a box of the screen finds no block to read the ground behind: name its colour, hole: { ground: '#rrggbb' }"
		);
	}
	return { filling: { kind: 'behind', selector: target }, ...shaped };
}

/**
 * A pit as the film names it, lit from within by none where it names no glow, its walls to be its piece's body's
 * colour; refused on a piece with no body.
 */
function pitAsked(pit: PitScript, body: BodyAsked | null): Omit<Pit, 'walls'> {
	if (body === null) {
		throw new FilmError(
			"piece.show sinks a hole's pit with walls of the piece's body's colour: give the piece a body, body: { thickness }"
		);
	}
	return { depth: pit.depth, glow: pit.glow ?? NO_GLOW };
}

/**
 * A body as the film names it, its walls of the colour it names or of its edge's, lit from within by none where it
 * names no glow; refused but inside the world, as the frame, a group and the window are drawn flat over everything in
 * the room.
 */
function bodyAsked(body: BodyScript, inside: PieceScript['inside']): BodyAsked {
	if (inside !== 'world') {
		throw new FilmError(
			"piece.show draws a piece's body inside the world alone, as the frame, a group and the window are drawn flat over everything: lift it inside: 'world'"
		);
	}
	const walls: WallsAsked = body.walls === undefined ? OF_ITS_EDGE : { kind: 'named', colour: body.walls };
	return { thickness: body.thickness, walls, glow: body.glow ?? NO_GLOW };
}

/**
 * A piece of the page over a target, cut to the part of it the camera shows, its corners as round as its block's as
 * the page draws it now or as the film names, the hole it leaves filled as the page draws it now and as round, drawn
 * from the picture the film names, with the body it names, its walls of the colour of its edge now where it names
 * none, carrying the letters of the block it names as they stand now, and the box of the frame it shows there.
 */
async function lifted(beginning: Beginning, target: Target, lifting: Lifting): Promise<Coming> {
	const camera = cameraOverItsPicture(beginning, lifting.picture, 'piece.show');
	const { source, shown, box, whole } = await sourceOf(beginning, camera, target, lifting, 'piece.show');
	const uncut = sidesStandingOn(source, whole);
	const ownCorners = cornersFitting(squareWhereCut(await cornersTaken(beginning, lifting.corners), uncut), source);
	// The window's corner as the look rounds it on the frame, in the page's pixels as the camera shows them there
	const windowCorner =
		(beginning.scene.look.paneCorner * frameScaleOf(beginning.format.frame) * source.width) / box.width;
	const body = lifting.body === null ? null : await bodyTaken(beginning, lifting.body, source, edgeSides(uncut));
	const hole = lifting.hole === null ? null : await holeOf(beginning, lifting.hole, ownCorners, body);
	const picture = await pictureOf(beginning, lifting.picture, source);
	const liftedOff = pageShownBy(beginning.scene.screen.shows);
	const piece: Piece = {
		kind: PIECE,
		source,
		liftedOff,
		corners: cornersOf(ownCorners, sidesStandingOn(source, shown), windowCorner),
		hole,
		lines: lifting.lines,
		picture,
		body,
		firstLetter: lifting.letters === CARRIES_NONE ? CARRIES_NONE : await firstLetterCarried(beginning, lifting.letters),
		emptied: EMPTIES_NONE,
		inTheShade: inTheShadeIn(lifting.shade, beginning.format.frame)
	};
	return { content: piece, box };
}

/**
 * Where the first letter of the block a piece carries the letters of stands on the screen, as the page it is lifted off
 * stands; refused where the block lays out none.
 */
async function firstLetterCarried(beginning: Beginning, block: string): Promise<Box> {
	const letter = await beginning.page.letterAtTheStart(block);
	if (letter === null) {
		throw new FilmError(`piece.show's letters, ${block}, lays out none, as it is hidden: name a block it shows`);
	}
	return letter;
}

/** The picture a piece is drawn from: the page's, or one of its source the take holds now, as the page stands. */
async function pictureOf(beginning: Beginning, kind: PiecePicture['kind'], source: Box): Promise<PiecePicture> {
	switch (kind) {
		case 'following':
			return FOLLOWING_THE_PAGE;
		case 'held':
			return { kind: 'held', number: await beginning.holdPicture(source) };
	}
}

/**
 * How round a piece's own corners are as it is lifted: as the page draws its block now, refused where it writes a
 * radius no length reads; or alike as the film names.
 */
async function cornersTaken(beginning: Beginning, asked: CornersAsked): Promise<Corners> {
	switch (asked.kind) {
		case 'its block':
			return cornersRead(await beginning.page.roundingOf(asked.block), asked.block);
		case 'named':
			return cornersAlike(asked.radius);
	}
}

/** A block's corners as the page reads them, refused where it writes a radius no length reads, as a `calc()`. */
function cornersRead(rounding: Rounding, block: string): Corners {
	if (!('unread' in rounding)) return rounding;
	throw new FilmError(
		`piece.show reads how round ${block} is drawn, and its border radius ${rounding.unread} is no length it reads: lift it with air and name its corner`
	);
}

/**
 * A piece's body as it is lifted off a part of the screen: its walls of the colour the film names, or of the colour the
 * page shows along the part's edge now, on the sides named.
 */
async function bodyTaken(
	beginning: Beginning,
	asked: BodyAsked,
	source: Box,
	sides: readonly FrameSide[]
): Promise<Body> {
	switch (asked.walls.kind) {
		case 'its edge':
			return { ...asked, walls: await beginning.edgeColour(source, sides) };
		case 'named':
			return { ...asked, walls: asked.walls.colour };
	}
}

/**
 * How round each corner of a piece is: as its own, and as the window, where it is rounder, at a corner that stands on
 * a corner of what the camera shows, which the window rounds.
 */
function cornersOf(own: Corners, onWhatIsShown: SidesStanding, windowCorner: number): Corners {
	const { left, top, right, bottom } = onWhatIsShown;
	return {
		topLeft: left && top ? Math.max(own.topLeft, windowCorner) : own.topLeft,
		topRight: right && top ? Math.max(own.topRight, windowCorner) : own.topRight,
		bottomRight: right && bottom ? Math.max(own.bottomRight, windowCorner) : own.bottomRight,
		bottomLeft: left && bottom ? Math.max(own.bottomLeft, windowCorner) : own.bottomLeft
	};
}

/**
 * A piece's own corners where the camera cut its blocks: square at a corner either side of which was cut, as a cut
 * runs straight through a block, as drawn at the others.
 */
function squareWhereCut(own: Corners, uncut: SidesStanding): Corners {
	const { left, top, right, bottom } = uncut;
	return {
		topLeft: left && top ? own.topLeft : SQUARE,
		topRight: right && top ? own.topRight : SQUARE,
		bottomRight: right && bottom ? own.bottomRight : SQUARE,
		bottomLeft: left && bottom ? own.bottomLeft : SQUARE
	};
}

/**
 * The sides of a piece its edge is read on for its walls' colour: those the camera did not cut, where the blocks' own
 * edge is; every side where it cut them all.
 */
function edgeSides(uncut: SidesStanding): readonly FrameSide[] {
	const whole = FRAME_SIDES.filter((side) => uncut[side]);
	return whole.length > 0 ? whole : FRAME_SIDES;
}

/** Which sides of a part of the screen stand on the same sides of a part round it. */
function sidesStandingOn(part: Box, around: Box): SidesStanding {
	return {
		left: standsOn(part.left, around.left),
		top: standsOn(part.top, around.top),
		right: standsOn(part.left + part.width, around.left + around.width),
		bottom: standsOn(part.top + part.height, around.top + around.height)
	};
}

/** Whether an edge of a piece stands on an edge of another part. */
function standsOn(edge: number, otherEdge: number): boolean {
	return Math.abs(edge - otherEdge) < ON_THE_EDGE;
}

/**
 * A hole as it is filled, with its colour or the ground the page draws behind its block as the move begins, its
 * corners as round as its piece's own, its pit's walls its piece's body's.
 */
async function holeOf(beginning: Beginning, asked: HoleAsked, corners: Corners, body: Body | null): Promise<Hole> {
	const { filling, pit: pitShaped, ...shaped } = asked;
	// A pit is asked for a piece with a body alone (pitAsked)
	const pit = pitShaped === null || body === null ? null : { ...pitShaped, walls: body.walls };
	switch (filling.kind) {
		case 'colour':
			return { ...shaped, pit, ground: filling.colour, corners };
		case 'behind':
			return { ...shaped, pit, ground: await beginning.page.groundBehind(filling.selector), corners };
	}
}
