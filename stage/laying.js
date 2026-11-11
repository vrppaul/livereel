// @ts-check
/**
 * The world as the eye's lens sees it (`stage/room.js`): each field of it laid over the fields before, as light, linear
 * and premultiplied by how clear it is, in half floats past white; the room lays the whole over the exposure in the
 * screen's colours once.
 *
 * A film's light, its things, their glass and the window with its body, is laid in linear light, as three lays what is
 * seen through over what stands behind it. Markup is the browser's: a stylesheet's shadow, glow or fade is drawn for
 * the browser to lay in the screen's colours, and laid in linear light over a dark page it came out lighter than the
 * stylesheet drew it, a pane's faint shadow and glow 9 levels lighter and red, where the flat stage draws 13 all along
 * (a probe film, `r-glow` at 0.5 s, row 880 of a 3840 still, 2026-11-11): one level of red in the screen's colours
 * over a dark ground is about nine in linear light. So a field of markup, blurred as light by the lens as all else is,
 * is laid as the browser lays it: what lies under it and the field each turned into the screen's colours, the field
 * laid over by its clearness, and the sum turned back into light. The pass reads what lies under as it lays, so the
 * world is laid into two layers in turn: the one laid so far is read, the other written whole, and they change places.
 * Laid so, where no lens blurs it, markup reads as the browser's own sum.
 */
import { Camera, WebGLRenderTarget } from 'three';
import { SRGB_CURVES, WRITTEN, passOver, valuesSet } from './passes.js';
/** @import { RenderTargetOptions, WebGLRenderer } from 'three' */

/**
 * How a field is laid over the fields before it: in linear light, as three lays one thing over another; or as the
 * browser lays markup.
 * @typedef {'linearly' | 'asTheBrowser'} Laying
 */

// A field of markup laid as the browser lays it over what lies under it, both in the screen's colours, and the sum
// turned back into light, linear and premultiplied; clear where both are
const AS_THE_BROWSER_FRAGMENT = `
uniform sampler2D under;
uniform sampler2D field;
varying vec2 shareOfTheFrame;
${SRGB_CURVES}
void main() {
	vec4 below = inTheScreensColours(texture2D(under, shareOfTheFrame));
	vec4 over = inTheScreensColours(texture2D(field, shareOfTheFrame));
	vec4 laid = over + (1.0 - over.a) * below;
	gl_FragColor = laid.a > 0.0 ? vec4(decoded(laid.rgb / laid.a) * laid.a, laid.a) : vec4(0.0);
}`;

/** The world as the lens lays it, field over field: the layer laid so far, and what lays markup into the other. */
export class WorldSeen {
	/** @param {number} width @param {number} height @param {RenderTargetOptions} drawnAs */
	constructor(width, height, drawnAs) {
		/** The layer the world is laid in so far @type {WebGLRenderTarget} */
		this.seen = new WebGLRenderTarget(width, height, drawnAs);
		/** The layer a field of markup is laid into with all under it, then the one laid so far @type {WebGLRenderTarget} */
		this.next = new WebGLRenderTarget(width, height, drawnAs);
		// A field of markup as the lens lays it, alone, before it is laid over the rest
		this.markup = new WebGLRenderTarget(width, height, drawnAs);
		this.asTheBrowser = passOver(
			{ under: { value: null }, field: { value: this.markup.texture } },
			AS_THE_BROWSER_FRAGMENT,
			WRITTEN
		);
		// three draws nothing without a camera; the pass places its own points
		this.camera = new Camera();
	}

	/** Nothing laid yet. @param {WebGLRenderer} renderer */
	cleared(renderer) {
		renderer.setRenderTarget(this.seen);
		renderer.clear();
	}

	/**
	 * A field laid over all laid so far, as it is laid: drawn by `laid` into the layer the world is laid in so far, in
	 * linear light; or alone into a layer of its own, then laid over the rest as the browser lays it.
	 * @param {WebGLRenderer} renderer @param {Laying} laying @param {(target: WebGLRenderTarget) => void} laid
	 */
	fieldLaid(renderer, laying, laid) {
		switch (laying) {
			case 'linearly':
				laid(this.seen);
				return;
			case 'asTheBrowser':
				renderer.setRenderTarget(this.markup);
				renderer.clear();
				laid(this.markup);
				valuesSet(this.asTheBrowser.material, { under: this.seen.texture });
				renderer.setRenderTarget(this.next);
				renderer.render(this.asTheBrowser, this.camera);
				[this.seen, this.next] = [this.next, this.seen];
		}
	}
}
