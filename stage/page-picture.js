// @ts-check
/**
 * The page's picture as the room draws it (`stage/room.js`): a texture made straight from the picture the stage shows
 * (`show` in `stage/stage.js`), which three samples as densely as the picture holds the page, with smaller copies of
 * itself and as sharply at a slant as the card filters, so a window brought near the eye or leant toward it shows the
 * page as sharp as the picture was taken. Markup, which would reflow drawn denser, stays in the surfaces the browser
 * draws at the frame's own density: the window's, which holds the screen's own markup over the page — the sweep, the
 * holes, the light, the dim — or a page of the film's own; the surface of what lies over the page in the window, apart
 * — a callout, pins, an object inside the window — which the stage lays apart where a frame is drawn as a room, as it
 * lies over the faded screen whole, not faded with it; and the cursor's, which the room lays over all the world it
 * draws (`cursorLaid` in `stage/room.js`).
 *
 * The picture is uploaded once each time the stage shows another, not each exposure as the surfaces are drawn. Where
 * the window shades the page with a blur, the picture is blurred by a Gaussian whose deviation is the shade's blur,
 * nothing past the picture's edge, so the screen's ground shows there: drawn from the smaller copy of the picture whose
 * pixels stand no more than a share of the blur apart, across and then down, and kept while the picture and the blur
 * stand. It is blurred in linear light, as the eye's lens blurs the world (`stage/lens.js`), from a copy of the picture
 * read as light, its smaller copies made in light too, uploaded only where a blur reads it. Blurred in the screen's
 * colours, as the stylesheet blurs it, a page's light words would spread dark over a dark page. Over a part of the
 * screen the blur leaves sharp the picture is laid unblurred, or blurred apart by as much as the part softens,
 * softening into the page's past the part's edge as the flat stage's mask has it (`.sharp-part` in `stage.css`): never
 * a sharp picture faded into a blurred one, which reads as two pictures at once. Where the shade reaching the whole
 * window blurs the window's body, the engine hands the picture's blur as none (`pictureBlur` in `src/props/window.ts`),
 * and the eye's lens blurs the page with its body as one (`stage/body.js`): blurred apart, the page's outline would
 * stand sharp round a soft page, a bright line.
 *
 * The page's surface lays, as the browser lays them in the window's view: the screen's ground and the picture, cut to
 * the screen's rounded box and the view's, showing as far as the screen is clear less how clear its own markup is
 * there; over them that markup, as the window's surface holds it; and over all, what lies over the page. Over the mouth
 * of each pit sunk into the page (`stage/piece-body.js`) it lays none of the screen, as far as the pit's hole has come,
 * and writes no depth where it lays nothing, so the pit drawn behind the window's plane shows through it. GLSL sizes a
 * list by a count it is compiled with, so the surface is compiled anew, by three, as the number of pits changes.
 *
 * Where the window's shade fades the page, the screen's pane, its picture and its markup over it, is faded in light
 * into what stands behind it: the surface lays the pane as far as the screen shows it less the fade, as the stylesheet
 * draws it, and adds the light of what stands behind it by the share faded, the world the room has laid so far laid
 * over the film's ground, read where the eye sees the pixel. Left to show through, the faded share would be laid over
 * the ground in the screen's colours, and a dark page faded into a dark ground would go too dark. What the room has
 * laid so far is read as the eye's lens blurred it, and the lens blurs it again with the page, by the page's depth.
 * Where the shade reaches the page alone, the window's edge and shadow, or its body, keep as they stand; where it
 * reaches the whole window, they fade with the page: the edge and shadow as the stylesheet fades them (`.view-shadow`
 * in `stage.css`), the body into the same light of what stands behind it (`stage/body.js`). A page of the film's own,
 * which the window's surface draws, fades in the screen's colours.
 */
import {
	Color,
	HalfFloatType,
	LinearMipmapLinearFilter,
	SRGBColorSpace,
	Texture,
	Vector2,
	Vector4,
	WebGLRenderTarget
} from 'three';
import { PAST_A_ROUNDED_BOX, SRGB_CURVES, WRITTEN, drawnInto, passOver, valuesOfTheBox, valuesSet } from './passes.js';
/** @import { WebGLRenderer } from 'three' */
/** @import { DrawnScene } from '../src/scene.ts' */
/** @import { Box, Corners, Size } from '../src/domain/geometry.ts' */
/** @import { SunkPit } from './piece-body.js' */

/**
 * What the page's surface lays, as the shader takes it: the texture of what lies over the page and whether anything
 * does; the texture it samples the picture from and whether it draws one; the box of the window's plane both surfaces
 * are laid out over; where the screen lies on that plane and how round its corners are; the part of it the view shows
 * and how round its corners are; how clear the screen is, and how much of it has faded into what stands behind it; its
 * ground; and the mouth of each pit sunk into the page, how round its corners are, and how far it is open, as far as
 * its hole has come. Every box and corner in the frame's pixels on the window's plane.
 * @typedef {{
 *   readonly overThePage: Texture | null,
 *   readonly anythingOver: boolean,
 *   readonly picture: Texture | null,
 *   readonly pictured: boolean,
 *   readonly surfaceBox: Vector4,
 *   readonly screenBox: Vector4,
 *   readonly screenCorner: number,
 *   readonly shownBox: Vector4,
 *   readonly shownCorner: number,
 *   readonly shown: number,
 *   readonly faded: number,
 *   readonly ground: Vector4,
 *   readonly mouths: readonly Vector4[],
 *   readonly mouthCorners: readonly Vector4[],
 *   readonly mouthsOpen: readonly number[]
 * } & SharpPartLaid} PageLaid
 */

/**
 * What the page's surface lays of the part of the screen the shade's blur leaves sharp, as the shader takes it: whether
 * it lays one; the picture laid over the part, unblurred or as far as the part softens; how large the screen is, in its
 * pixels; and the part's box and how far past it the page softens into the blur, in the screen's pixels.
 * @typedef {{
 *   readonly keepsAPartSharp: boolean,
 *   readonly sharpPicture: Texture | null,
 *   readonly screenSize: Vector2,
 *   readonly sharpBox: Vector4,
 *   readonly sharpEdge: number
 * }} SharpPartLaid
 */

/**
 * What the page's surface, and the window's body, read of what stands behind them, as the room hands it before each
 * field of the world it draws: the world the room has laid so far, as light, premultiplied, over the frame; the film's
 * ground, in the screen's colours, over the frame, its rows from its top; and where a pixel of the layer the surface is
 * drawn into stands on the frame, in shares of it: how far a pixel reaches across and up, and where the layer's bottom
 * left corner stands.
 * @typedef {{
 *   readonly behindSoFar: Texture,
 *   readonly filmsGround: Texture,
 *   readonly layerOnTheFrame: Vector4
 * }} BehindThePage
 */

// A share of a surface so clear none of it is drawn there, nor its depth: under a level of the browser's eight bits
const EIGHT_BIT_LEVELS = 255;
const DRAWN_AT_LEAST = 1 / EIGHT_BIT_LEVELS;
// How far inside an edge its smoothing reaches, in pixels of the frame as the eye sees it, and the least a pixel's
// width is taken as, so a plane seen edge-on divides by no zero
const HALF_A_PIXEL = 0.5;
const NARROWEST_PIXEL = 1e-6;
// The ground the screen shows where the page draws none, a token of the stylesheet's (`tokens.css`); and a whole share,
// of the ground's clearness and of how far the screen shows
const SCREEN_GROUND = '--screen-ground';
const WHOLE = 1;
// None of the page faded into what stands behind it
const NONE_FADED = 0;
// A blur of none, which leaves the picture as it was taken; a texture's own copy, not a smaller one; and a corner not
// rounded
const UNBLURRED = 0;
const FULL_SIZE = 0;
const SQUARE = 0;
// How far apart, in deviations of the blur, the pixels of the smaller copy the blur is drawn from stand at most, and
// how many of those pixels it gathers either side of each, three deviations of the widest
const MOST_SPREAD_A_PIXEL = 2;
const GATHERED_EACH_SIDE = 6;
// Each smaller copy of a texture is half as large as the one before
const HALVING = 2;
// The ways the blur is drawn along, one after the other, across and down
const ACROSS = new Vector2(1, 0);
const DOWN = new Vector2(0, 1);
// One pixel: a layer's side before it is first sized, and a blur's spread before it is first set
const A_PIXEL = 1;
// No part of the screen kept sharp in the shade's blur, as the page's surface lays it: no picture laid over a part of
// no size with no edge
const NO_EDGE = 0;
const NO_PART_KEPT_SHARP = {
	keepsAPartSharp: false,
	sharpPicture: null,
	screenSize: new Vector2(),
	sharpBox: new Vector4(),
	sharpEdge: NO_EDGE
};
// The picture blurred across alone, as light, in half floats, which keep a dark page's light as finely as the screen's
// colours do; and then down too, in the screen's colours as the page's surface lays the picture, with smaller copies of
// itself
const BLURRED_ACROSS_LAYER = { depthBuffer: false, type: HalfFloatType };
const BLURRED_LAYER = { depthBuffer: false, generateMipmaps: true, minFilter: LinearMipmapLinearFilter };
// What a pass of the blur writes: the light it gathers, as it is, or written in the screen's colours
const WRITTEN_AS_LIGHT = false;
const WRITTEN_IN_THE_SCREENS_COLOURS = true;
// The name of the count of pits sunk into the page the page's surface is compiled with, as its shader reads it
export const PITS = 'PITS';

/**
 * What stands behind a pixel as the eye sees it, as light, premultiplied: the world the room has laid so far over the
 * film's ground (`BehindThePage`), which the page's surface and the window's body fade into as far as the shade fades
 * them (`stage/body.js`). It reads the screen's colours by `SRGB_CURVES`, which a shader holds before it.
 */
export const WHAT_STANDS_BEHIND = `
uniform sampler2D behindSoFar;
uniform sampler2D filmsGround;
uniform vec4 layerOnTheFrame;
vec4 behindAt() {
	vec2 shareOfTheFrame = gl_FragCoord.xy * layerOnTheFrame.xy + layerOnTheFrame.zw;
	vec4 world = inTheScreensColours(texture2D(behindSoFar, shareOfTheFrame));
	vec4 filmsGroundThere = texture2D(filmsGround, vec2(shareOfTheFrame.x, 1.0 - shareOfTheFrame.y));
	return inLinearLight(world + (1.0 - world.a) * filmsGroundThere);
}`;

/**
 * How much of the part of the screen the shade's blur leaves sharp shows at a point of the screen, in shares of it
 * across and down: whole over the part, none from as far past each side of it as its edge, across and down apart and
 * one in the other, as the flat stage's mask has it (`--sharp-across`, `--sharp-down` in `tokens.css`); the part's box
 * and edge in the screen's pixels, and the screen's size (`partKeptSharpValues`). The page's surface lays the part's
 * own picture so far over the page's (`SharpPartLaid`); where the room blurs the whole window through the lens, the
 * body's spreads keep the part so far from the blur (`body.js`).
 */
export const THE_PART_KEPT_SHARP = `
uniform vec4 sharpBox;
uniform float sharpEdge;
uniform vec2 screenSize;
float sharpAt(vec2 shareOfTheScreen) {
	vec2 onTheScreen = shareOfTheScreen * screenSize;
	vec2 past = max(max(sharpBox.xy - onTheScreen, onTheScreen - sharpBox.xy - sharpBox.zw), 0.0);
	vec2 kept = clamp(1.0 - past / sharpEdge, 0.0, 1.0);
	return kept.x * kept.y;
}`;

/**
 * The values `THE_PART_KEPT_SHARP` reads of the part of the screen the shade's blur leaves sharp: its box and its edge
 * in the screen's pixels, the edge as narrow as the camera's zoom frames the screen larger, as the blur is
 * (`seenBlurred`), and the screen's size.
 * @param {NonNullable<DrawnScene['window']['sharp']>} sharp @param {number} zoom @param {Vector2} screenSize
 */
export function partKeptSharpValues(sharp, zoom, screenSize) {
	return { sharpBox: valuesOfTheBox(sharp.box), sharpEdge: sharp.edge / zoom, screenSize };
}

/**
 * The page's surface, all in the screen's colours, premultiplied, read back into linear light: the screen's ground and
 * the page's picture, where it draws one, showing as far as the screen is clear less how clear the window's surface is
 * there, as its markup over the page is as clear as the screen, cut to the screen's rounded box and the view's; over
 * them the window's surface; all of it as far as no pit's mouth is open there; over all, what lies over the page, where
 * anything does. Each edge smoothed over a pixel of the frame as the eye sees it; none drawn, nor its depth, where it
 * is clear. Where the page has faded, the light of what stands behind it added by the share faded, under the screen's
 * pane alone, where anything of the surface's own is drawn: a page faded whole draws nothing, as what stands behind it
 * shows as it stands.
 */
export const PAGE_SURFACE_FRAGMENT = `
uniform sampler2D surface;
uniform sampler2D overThePage;
uniform bool anythingOver;
uniform sampler2D picture;
uniform bool pictured;
uniform vec4 surfaceBox;
uniform vec4 screenBox;
uniform float screenCorner;
uniform vec4 shownBox;
uniform float shownCorner;
uniform float shown;
uniform float faded;
uniform vec4 ground;
uniform bool keepsAPartSharp;
uniform sampler2D sharpPicture;
#if ${PITS} > 0
uniform vec4 mouths[${PITS}];
uniform vec4 mouthCorners[${PITS}];
uniform float mouthsOpen[${PITS}];
#endif
varying vec2 shareOfTheSurface;
${SRGB_CURVES}
${WHAT_STANDS_BEHIND}
${PAST_A_ROUNDED_BOX}
// How far a point stands past the edge of a box, by its left, top, width and height, its corners as round as named or
// as half its shorter side, as CSS rounds a box no further
float pastTheEdge(vec2 point, vec4 box, float corner) {
	vec2 halfSize = box.zw * 0.5;
	return pastARoundedBox(point - box.xy - halfSize, halfSize, min(corner, min(halfSize.x, halfSize.y)));
}
// How far a point stands past the edge of a pit's mouth, by its left, top, width and height, each corner as round as
// named, top left, top right, bottom right and bottom left, as the engine fits them to the mouth
float pastTheMouth(vec2 point, vec4 mouth, vec4 corners) {
	vec2 halfSize = mouth.zw * 0.5;
	return pastABoxRoundedAtEach(point - mouth.xy - halfSize, halfSize, corners);
}
// How much of a pixel stands inside an edge it stands so far past, the edge smoothed over a pixel of the frame
float insideTheEdge(float past) {
	return clamp(${HALF_A_PIXEL} - past / max(fwidth(past), ${NARROWEST_PIXEL}), 0.0, 1.0);
}
// How far open the pits' mouths stand at a point of the window's plane: the most any mouth that holds it is open
float openAt(vec2 point) {
	float open = 0.0;
#if ${PITS} > 0
	for (int pit = 0; pit < ${PITS}; pit++) {
		open = max(open, insideTheEdge(pastTheMouth(point, mouths[pit], mouthCorners[pit])) * mouthsOpen[pit]);
	}
#endif
	return open;
}
${THE_PART_KEPT_SHARP}
void main() {
	vec4 screen = texture2D(surface, shareOfTheSurface);
	vec2 point = surfaceBox.xy + shareOfTheSurface * surfaceBox.zw;
	float onThePane = 0.0;
	vec4 under = vec4(0.0);
	if (pictured) {
		float past = max(pastTheEdge(point, screenBox, screenCorner), pastTheEdge(point, shownBox, shownCorner));
		vec2 shareOfTheScreen = (point - screenBox.xy) / screenBox.zw;
		vec4 page = texture2D(picture, shareOfTheScreen);
		if (keepsAPartSharp) {
			page = mix(page, texture2D(sharpPicture, shareOfTheScreen), sharpAt(shareOfTheScreen));
		}
		onThePane = insideTheEdge(past);
		under = onThePane * max(shown - screen.a, 0.0) * (page + (1.0 - page.a) * ground);
	}
	vec4 over = anythingOver ? texture2D(overThePage, shareOfTheSurface) : vec4(0.0);
	float underWhatIsOver = (1.0 - over.a) * (1.0 - openAt(point));
	vec4 drawn = over + underWhatIsOver * (screen + under);
	if (drawn.a < ${DRAWN_AT_LEAST}) discard;
	vec4 light = inLinearLight(drawn);
	if (faded > 0.0) light += underWhatIsOver * onThePane * faded * behindAt();
	gl_FragColor = light;
}`;

/**
 * The picture blurred along one way, as light: each pixel of the layer drawn a Gaussian of the pixels of a copy of what
 * it reads, so many either side along the way, the copy's pixels a step apart, none past its edge; written as light or
 * in the screen's colours.
 */
const BLURRED_ALONG_FRAGMENT = `
uniform sampler2D drawn;
uniform float level;
uniform vec2 pixelStep;
uniform float spread;
uniform bool intoTheScreensColours;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	vec4 gathered = vec4(0.0);
	float weights = 0.0;
	for (int along = -${GATHERED_EACH_SIDE}; along <= ${GATHERED_EACH_SIDE}; along++) {
		float weight = exp(-0.5 * float(along * along) / (spread * spread));
		vec2 at = shareOfTheFrame + pixelStep * float(along);
		bool onIt = all(greaterThanEqual(at, vec2(0.0))) && all(lessThanEqual(at, vec2(1.0)));
		gathered += weight * (onIt ? textureLod(drawn, at, level) : vec4(0.0));
		weights += weight;
	}
	vec4 blurred = gathered / weights;
	gl_FragColor = intoTheScreensColours ? inTheScreensColours(blurred) : blurred;
}`;

/** The values a page's surface's material starts with, its own: nothing laid yet. */
export function pageSurfaceValues() {
	return {
		surface: { value: null },
		overThePage: { value: null },
		anythingOver: { value: false },
		picture: { value: null },
		pictured: { value: false },
		surfaceBox: { value: new Vector4() },
		screenBox: { value: new Vector4() },
		screenCorner: { value: SQUARE },
		shownBox: { value: new Vector4() },
		shownCorner: { value: SQUARE },
		shown: { value: WHOLE },
		faded: { value: NONE_FADED },
		behindSoFar: { value: null },
		filmsGround: { value: null },
		layerOnTheFrame: { value: new Vector4() },
		ground: { value: new Vector4() },
		keepsAPartSharp: { value: false },
		sharpPicture: { value: null },
		screenSize: { value: new Vector2() },
		sharpBox: { value: new Vector4() },
		sharpEdge: { value: NO_EDGE },
		mouths: { value: [] },
		mouthCorners: { value: [] },
		mouthsOpen: { value: [] }
	};
}

/**
 * A picture blurred by a deviation in its own pixels, a Gaussian in linear light with nothing past the picture's edge:
 * drawn from the smaller copy of the picture read as light whose pixels stand no farther apart than the most a pixel
 * spreads, across into one layer as light, then down into another as large, in the screen's colours; and kept while the
 * picture's upload and the blur stand. The page's picture is blurred by one as the window's shade blurs the page, and
 * by another as far as the part the blur leaves sharp softens, each kept apart, as both may stand at once.
 */
class BlurredPicture {
	/** @param {WebGLRenderer} renderer */
	constructor(renderer) {
		this.renderer = renderer;
		this.across = new WebGLRenderTarget(A_PIXEL, A_PIXEL, BLURRED_ACROSS_LAYER);
		this.blurred = new WebGLRenderTarget(A_PIXEL, A_PIXEL, BLURRED_LAYER);
		/** Which upload of the picture the layers hold, none before the first @type {number | null} */
		this.uploadBlurred = null;
		/** The deviation the layers hold the picture blurred by, none before the first @type {number | null} */
		this.spreadBlurred = null;
		this.blurring = passOver(
			{
				drawn: { value: null },
				level: { value: FULL_SIZE },
				pixelStep: { value: new Vector2() },
				spread: { value: A_PIXEL },
				intoTheScreensColours: { value: WRITTEN_AS_LIGHT }
			},
			BLURRED_ALONG_FRAGMENT,
			WRITTEN
		);
	}

	/**
	 * The picture blurred by a deviation in its own pixels, drawn anew where it was uploaded anew or the blur changed.
	 * @param {Texture} light the picture read as light @param {HTMLImageElement} image the picture's image, as large as
	 * it was taken @param {number} spread @returns {Texture}
	 */
	of(light, image, spread) {
		if (this.uploadBlurred !== light.version || this.spreadBlurred !== spread) {
			this.blurredAnew(light, image, spread);
			this.uploadBlurred = light.version;
			this.spreadBlurred = spread;
		}
		return this.blurred.texture;
	}

	/**
	 * The picture blurred anew by a deviation in its own pixels: from its smaller copy read as light whose pixels stand
	 * no farther apart than the most a pixel spreads, across into one layer as light, then down into another as large, in
	 * the screen's colours.
	 * @param {Texture} light @param {HTMLImageElement} image @param {number} spread
	 */
	blurredAnew(light, image, spread) {
		const level = Math.max(FULL_SIZE, Math.ceil(Math.log2(spread / MOST_SPREAD_A_PIXEL)));
		const shrunk = HALVING ** level;
		const width = Math.ceil(image.naturalWidth / shrunk);
		const height = Math.ceil(image.naturalHeight / shrunk);
		const spreadThere = spread / shrunk;
		this.across.setSize(width, height);
		this.blurred.setSize(width, height);
		this.blurredAlong(light, level, ACROSS.clone().divideScalar(width), spreadThere, this.across, WRITTEN_AS_LIGHT);
		this.blurredAlong(
			this.across.texture,
			FULL_SIZE,
			DOWN.clone().divideScalar(height),
			spreadThere,
			this.blurred,
			WRITTEN_IN_THE_SCREENS_COLOURS
		);
	}

	/**
	 * A texture's copy at a level blurred along a way, a step a pixel, into a layer, written as light or in the screen's
	 * colours.
	 * @param {Texture} drawn @param {number} level @param {Vector2} pixelStep @param {number} spread
	 * @param {WebGLRenderTarget} into @param {boolean} intoTheScreensColours
	 */
	blurredAlong(drawn, level, pixelStep, spread, into, intoTheScreensColours) {
		valuesSet(this.blurring.material, { drawn, level, pixelStep, spread, intoTheScreensColours });
		drawnInto(this.renderer, this.blurring, into);
	}
}

/** The page's picture the stage shows, as the room lays it under the window's surface. */
export class PagePicture {
	/**
	 * @param {WebGLRenderer} renderer @param {HTMLImageElement} shownBy the stage's picture of the page
	 * @param {Size} screen the screen's size, in its pixels
	 */
	constructor(renderer, shownBy, screen) {
		this.shownBy = shownBy;
		this.screenSize = new Vector2(screen.width, screen.height);
		this.texture = new Texture();
		this.texture.flipY = false;
		this.texture.minFilter = LinearMipmapLinearFilter;
		this.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
		// The picture read as light, which the card turns out of the screen's colours as it samples it and makes its
		// smaller copies of, for the blur alone: three uploads it the first time a blur reads it
		this.light = new Texture();
		this.light.flipY = false;
		this.light.colorSpace = SRGBColorSpace;
		this.light.minFilter = LinearMipmapLinearFilter;
		/** The address of the picture uploaded, none before the first @type {string | null} */
		this.uploaded = null;
		this.ground = screenGround();
		// The picture blurred as the window's shade blurs the page, and as far as the part its blur leaves sharp softens
		this.pageBlurred = new BlurredPicture(renderer);
		this.partBlurred = new BlurredPicture(renderer);
	}

	/**
	 * What the page's surface of an exposure lays with the window's surface, both laid out over a box of the window's
	 * plane, and what lies over the page, where anything does: the page's picture, blurred as the window shades it, over
	 * the screen's ground, cut and as clear as the screen, where the screen shows the filmed page; nothing where it shows
	 * a page of the film's own, which stands on its ground in the window's surface (`stage.css`); and the mouths of the
	 * pits sunk into the page, open as far as each has come.
	 * @param {DrawnScene} scene @param {Box} surface @param {Texture | null} overThePage
	 * @param {readonly SunkPit[]} pits @returns {PageLaid}
	 */
	laidWith(scene, surface, overThePage, pits) {
		const filmed = scene.screen.filmed;
		const laid = {
			overThePage,
			anythingOver: overThePage !== null,
			surfaceBox: valuesOfTheBox(surface),
			shownBox: valuesOfTheBox(scene.window.reach),
			shownCorner: scene.window.corner,
			shown: scene.window.pageShown,
			faded: scene.window.pageFaded,
			ground: this.ground,
			mouths: pits.map((pit) => valuesOfTheBox(pit.mouth)),
			mouthCorners: pits.map((pit) => cornersInOrder(pit.corners)),
			mouthsOpen: pits.map((pit) => pit.open)
		};
		if (filmed === null) {
			return {
				...laid,
				picture: null,
				pictured: false,
				screenBox: new Vector4(),
				screenCorner: SQUARE,
				...NO_PART_KEPT_SHARP
			};
		}
		this.uploadedAnew();
		const zoom = scene.camera.pose.zoom;
		const blur = scene.window.shade?.pictureBlur ?? UNBLURRED;
		return {
			...laid,
			picture: this.seenBlurred(this.pageBlurred, blur, zoom),
			pictured: true,
			screenBox: valuesOfTheBox(filmed.box),
			screenCorner: filmed.corner,
			...(blur > UNBLURRED ? this.sharpPartLaid(scene.window.sharp, zoom) : NO_PART_KEPT_SHARP)
		};
	}

	/**
	 * What the page's surface lays of the part of the screen the shade's blur leaves sharp, over a picture it blurs: the
	 * picture, unblurred or blurred as far as the part softens, laid over the page's there, the screen's size, the part
	 * and its edge, the edge in the screen's pixels as the blur is (`seenBlurred`); none where the blur leaves none.
	 * @param {DrawnScene['window']['sharp']} sharp @param {number} zoom @returns {SharpPartLaid}
	 */
	sharpPartLaid(sharp, zoom) {
		if (sharp === null) return NO_PART_KEPT_SHARP;
		return {
			keepsAPartSharp: true,
			sharpPicture: this.seenBlurred(this.partBlurred, sharp.blur ?? UNBLURRED, zoom),
			...partKeptSharpValues(sharp, zoom, this.screenSize)
		};
	}

	/**
	 * The picture uploaded as an exposure shows it, blurred by so many film pixels, in the picture's pixels as many as
	 * the stylesheet's in the screen's, which the camera's zoom scales (`[data-shaded] .page`,
	 * `[data-sharp-softened] .sharp-part` in `stage.css`): by the blur it is handed, or unblurred where it blurs none.
	 * @param {BlurredPicture} blurred @param {number} blur @param {number} zoom @returns {Texture}
	 */
	seenBlurred(blurred, blur, zoom) {
		const spread = ((blur / zoom) * this.shownBy.naturalWidth) / this.screenSize.width;
		if (spread <= UNBLURRED) return this.texture;
		return blurred.of(this.light, this.shownBy, spread);
	}

	/** The picture the stage shows uploaded, as it is and as light, where it is another than the one uploaded last. */
	uploadedAnew() {
		const address = this.shownBy.src;
		if (this.uploaded === address) return;
		for (const texture of [this.texture, this.light]) {
			texture.image = this.shownBy;
			texture.needsUpdate = true;
		}
		this.uploaded = address;
	}
}

/**
 * The screen's ground as the stylesheet draws it, in the screen's colours, opaque: three reads a colour into linear
 * light, so it is written back.
 * @returns {Vector4}
 */
function screenGround() {
	const token = getComputedStyle(document.documentElement).getPropertyValue(SCREEN_GROUND).trim();
	const colour = new Color(token).convertLinearToSRGB();
	return new Vector4(colour.r, colour.g, colour.b, WHOLE);
}

/**
 * A box's corners as the page's shader reads them: top left, top right, bottom right and bottom left.
 * @param {Corners} corners @returns {Vector4}
 */
function cornersInOrder(corners) {
	return new Vector4(corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft);
}
