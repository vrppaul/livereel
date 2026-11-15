// @ts-check
/**
 * The room's frame shown on its canvas (`stage/room.js`), in the screen's colours, in the part of the canvas the frame
 * is handed on from (`Layout.handedIn`): the whole canvas, as drawn, where the frame is handed on as sharp as it is
 * drawn, as a still keeps it; or its top left corner, as many of the drawing's pixels as the frame has of its own,
 * where the frame is handed on at its own size, as a video keeps it: scaled down by Lanczos's filter of three lobes in
 * the screen's colours, across and then down, as ffmpeg scales the flat stage's frames (`scale=…:flags=lanczos`,
 * `src/adapters/video/video.ts`). The canvas keeps the drawing's size, as the browser paints the markup laid in it as
 * densely as the canvas is drawn. Chrome's own scaling as it captures, a box of 2 × 2, would draw small text softer.
 */
import { Camera, HalfFloatType, WebGLRenderTarget } from 'three';
import { SRGB_CURVES, WRITTEN, passOver } from './passes.js';
/** @import { Mesh, PlaneGeometry, ShaderMaterial, Texture, Vector2, WebGLRenderer } from 'three' */
/** @import { Box } from '../src/domain/geometry.ts' */

/**
 * A pass that shows the frame, and what it draws into: a layer of its own, or the canvas.
 * @typedef {{
 *   readonly pass: Mesh<PlaneGeometry, ShaderMaterial>,
 *   readonly into: WebGLRenderTarget | null
 * }} ShowingPass
 */
/**
 * Lanczos's filter for a frame scaled down by a whole number: the first of the drawing's pixels it weighs, from the
 * first a pixel of the frame covers, and the weight of each from there on, adding up to whole.
 * @typedef {{ readonly first: number, readonly weights: readonly number[] }} Filter
 */
/**
 * A way a frame is scaled along, as GLSL steps along it, how a pass along it reads a pixel, and what it writes.
 * @typedef {{ readonly along: string, readonly read: string, readonly written: string }} Way
 */
/**
 * The part of what a pass draws into it draws in, in the pixels of what it draws into: its corner nearest their origin,
 * and its size.
 * @typedef {{ readonly corner: readonly number[], readonly size: readonly number[] }} Part
 */

// Lanczos's filter: how many lobes it reaches on each side of a pixel's middle, in the pixels it scales to
const LOBES = 3;
// Where a pixel's middle stands in it; the filter's middle, where it weighs a pixel whole; and a frame shown as drawn
const HALF = 0.5;
const AT_ITS_MIDDLE = 0;
const WHOLE = 1;
const AS_DRAWN = 1;
// The ways a frame is scaled, one after the other, as GLSL steps along them
const ACROSS = 'ivec2(1, 0)';
const DOWN = 'ivec2(0, 1)';
// What a pixel scaled across reads of the drawing: its light in the screen's colours, between black and white, as a
// captured frame holds it. What it is scaled across into: half floats, which keep a sum the filter's lobes below none
// carry past black or white until it is scaled down too and held between them
const READ_FROM_THE_DRAWING = 'clamp(encoded(drawn.rgb), 0.0, 1.0)';
const READ_AS_SCALED = 'drawn.rgb';
const WRITTEN_PAST_THE_ENDS = 'summed';
const WRITTEN_HELD = 'clamp(summed, 0.0, 1.0)';
const SCALED_ACROSS = { depthBuffer: false, type: HalfFloatType };
// What three draws into where it draws on the canvas itself; and where a layer of its own is drawn from, its corner
const THE_CANVAS = null;
const NO_CORNER = [0, 0];

// The frame as drawn, its linear light in the screen's colours, as the canvas shows it
const AS_DRAWN_FRAGMENT = `
uniform sampler2D drawn;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	gl_FragColor = vec4(encoded(texture2D(drawn, shareOfTheFrame).rgb), 1.0);
}`;

/** The passes that show the room's frame on its canvas. */
export class FrameShown {
	/**
	 * @param {Texture} frame the frame as the room drew it, in linear light
	 * @param {Vector2} drawnSize the frame's size as drawn, in the drawing's pixels
	 * @param {Box} handedIn the part of the canvas the frame is handed on from, in the drawing's pixels from its top left
	 */
	constructor(frame, drawnSize, handedIn) {
		// three draws nothing without a camera; every pass here places its own points
		this.camera = new Camera();
		const scaledBy = drawnSize.x / handedIn.width;
		/** @type {readonly ShowingPass[]} */
		this.passes =
			scaledBy === AS_DRAWN
				? [{ pass: passOver({ drawn: { value: frame } }, AS_DRAWN_FRAGMENT, WRITTEN), into: THE_CANVAS }]
				: scaledPasses(frame, drawnSize, handedIn, scaledBy);
	}

	/** The frame shown on the canvas. @param {WebGLRenderer} renderer */
	shown(renderer) {
		for (const { pass, into } of this.passes) {
			renderer.setRenderTarget(into);
			renderer.render(pass, this.camera);
		}
	}
}

/**
 * The frame scaled down by the filter: across, into a layer as wide as the frame handed on and as high as the drawing;
 * then down, into the canvas's part it is handed on from, its corner nearest the drawing's origin, the bottom left.
 * @param {Texture} frame @param {Vector2} drawnSize @param {Box} handedIn @param {number} scaledBy
 * @returns {readonly ShowingPass[]}
 */
function scaledPasses(frame, drawnSize, handedIn, scaledBy) {
	const filter = filterOf(scaledBy);
	const scaledAcross = new WebGLRenderTarget(handedIn.width, drawnSize.y, SCALED_ACROSS);
	const across = { along: ACROSS, read: READ_FROM_THE_DRAWING, written: WRITTEN_PAST_THE_ENDS };
	const down = { along: DOWN, read: READ_AS_SCALED, written: WRITTEN_HELD };
	const acrossInto = { corner: NO_CORNER, size: [handedIn.width, drawnSize.y] };
	const downInto = {
		corner: [handedIn.left, drawnSize.y - handedIn.top - handedIn.height],
		size: [handedIn.width, handedIn.height]
	};
	return [
		{ pass: scalingPass(frame, filter, scaledBy, across, acrossInto), into: scaledAcross },
		{ pass: scalingPass(scaledAcross.texture, filter, scaledBy, down, downInto), into: THE_CANVAS }
	];
}

/** Lanczos's filter for a frame scaled down by a whole number. @param {number} scaledBy @returns {Filter} */
function filterOf(scaledBy) {
	const middle = (scaledBy - WHOLE) * HALF;
	const reach = LOBES * scaledBy;
	const first = Math.floor(middle - reach) + WHOLE;
	const last = Math.ceil(middle + reach) - WHOLE;
	const weighed = Array.from({ length: last - first + WHOLE }, (_, tap) => lanczos((first + tap - middle) / scaledBy));
	const whole = weighed.reduce((sum, weight) => sum + weight, AT_ITS_MIDDLE);
	return { first, weights: weighed.map((weight) => weight / whole) };
}

/** Lanczos's filter at so far from its middle, in the pixels it scales to. @param {number} away */
function lanczos(away) {
	if (away === AT_ITS_MIDDLE) return WHOLE;
	const turned = Math.PI * away;
	return (LOBES * Math.sin(turned) * Math.sin(turned / LOBES)) / (turned * turned);
}

/**
 * A pass that scales a frame down along one way into the part of what it draws into named, from its corner and as
 * large, drawing nothing outside it: each pixel the weighed sum of the pixels of what it scales along that way from the
 * first the filter weighs, one past the edge read at the edge; each pixel read, and the sum written, as the way names.
 * @param {Texture} source @param {Filter} filter @param {number} scaledBy @param {Way} way @param {Part} into
 */
function scalingPass(source, filter, scaledBy, way, into) {
	const { along, read, written } = way;
	const taps = filter.weights.length;
	const fragment = `
uniform sampler2D source;
uniform float weights[${taps}];
uniform ivec2 corner;
uniform ivec2 size;
${SRGB_CURVES}
void main() {
	ivec2 along = ${along};
	ivec2 shown = ivec2(gl_FragCoord.xy) - corner;
	if (any(greaterThanEqual(shown, size)) || any(lessThan(shown, ivec2(0)))) discard;
	ivec2 last = textureSize(source, 0) - 1;
	ivec2 first = shown + along * (shown * ${scaledBy - WHOLE} + ${filter.first});
	vec3 summed = vec3(0.0);
	for (int tap = 0; tap < ${taps}; tap++) {
		vec4 drawn = texelFetch(source, clamp(first + along * tap, ivec2(0), last), 0);
		summed += ${read} * weights[tap];
	}
	gl_FragColor = vec4(${written}, 1.0);
}`;
	const uniforms = { source: { value: source }, weights: { value: [...filter.weights] } };
	return passOver({ ...uniforms, corner: { value: into.corner }, size: { value: into.size } }, fragment, WRITTEN);
}
