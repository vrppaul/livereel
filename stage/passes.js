// @ts-check
/**
 * What the room's passes over a whole layer share (`stage/room.js`, `stage/lens.js`, `stage/see-through.js`): a square
 * over all a layer holds and the one camera it is drawn by, how a pass lays what it draws over what stands there,
 * sRGB's curve and the distance past a rounded box in GLSL, the depth a layer keeps where nothing was drawn, and a
 * material's values set; and the blend premultiplied light is laid by, a pass's, the page's surface's and the window's
 * glass's (`stage/body.js`). The room holds light in two ways: linear, as three adds it up, in half floats past white,
 * and in the screen's colours, as the browser draws a page; light passes between the two by one rule each way, written
 * here once.
 */
import {
	AlwaysDepth,
	Camera,
	CustomBlending,
	GLSL3,
	Mesh,
	NoBlending,
	OneFactor,
	OneMinusSrcAlphaFactor,
	PlaneGeometry,
	ShaderMaterial,
	Vector4
} from 'three';
/** @import { WebGLRenderTarget, WebGLRenderer } from 'three' */
/** @import { Box } from '../src/domain/geometry.ts' */

// How wide and high WebGL's own space is, from -1 to 1 either way: a square as large covers the whole of a layer
const WEBGL_SPAN = 2;

/**
 * Light laid over what stands under it as the browser lays a layer, its colours premultiplied: added whole, what stands
 * under it dimmed by how opaque it is. A pass, the page's surface in the world and the window's glass lay so.
 */
export const PREMULTIPLIED = {
	blending: CustomBlending,
	blendSrc: OneFactor,
	blendDst: OneMinusSrcAlphaFactor,
	blendSrcAlpha: OneFactor,
	blendDstAlpha: OneMinusSrcAlphaFactor
};

/** What a pass draws laid over what stands under it, as the browser lays a layer, premultiplied. */
export const LAID_OVER = {
	...PREMULTIPLIED,
	depthTest: false,
	depthWrite: false,
	transparent: true
};

/** What a pass draws added to what stands under it, as an exposure's light is added into the frame. */
export const ADDED = {
	blending: CustomBlending,
	blendSrc: OneFactor,
	blendDst: OneFactor,
	blendSrcAlpha: OneFactor,
	blendDstAlpha: OneFactor,
	depthTest: false,
	depthWrite: false,
	transparent: true
};

/** What a pass draws written as it is, over whatever stood there. */
export const WRITTEN = { blending: NoBlending, depthTest: false, depthWrite: false };

/**
 * What a pass draws written so into each layer of a target of several, each of its shader's outputs into the layer of
 * its place, as GLSL 3 names them.
 */
export const WRITTEN_INTO_SEVERAL = { ...WRITTEN, glslVersion: GLSL3 };

/** A pass that writes the depth its shader works out, over whatever depth stood there, and no light. */
export const DEPTH_WRITTEN = {
	blending: NoBlending,
	colorWrite: false,
	depthTest: true,
	depthFunc: AlwaysDepth,
	depthWrite: true
};

// A pass's square over the whole of a layer, each point of it a share of the layer across and up from its bottom left
const OVER_THE_WHOLE_VERTEX = `
varying vec2 shareOfTheFrame;
void main() {
	shareOfTheFrame = uv;
	gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// sRGB's curve, as IEC 61966-2-1 writes it: straight below its knee, a power of a gamma above it, scaled and offset to
// meet the straight part there; and the most a half float holds
const SRGB = { lowSlope: '12.92', scale: '1.055', gamma: '2.4', offset: '0.055', knee: '0.0031308' };
const LARGEST_HALF_FLOAT = '65504.0';

/**
 * sRGB's curve both ways, past white as below it, so light brighter than white keeps its share: light encoded in the
 * screen's colours, and back. And three's linear light, premultiplied by how clear it is, written in the screen's
 * colours as the browser's surfaces are, premultiplied as theirs are: each colour encoded on its own before it is
 * premultiplied. Here three's light enters the screen's colours, so it is held to light that can be: a film's own
 * shader may write a colour below none or no number at all, which three's bloom would spread over the whole frame;
 * such a pixel is drawn clear, its light held between none and the most a half float keeps, its clearness between none
 * and whole. And the screen's colours, premultiplied, turned back into light, linear and premultiplied: clear where
 * they are.
 */
export const SRGB_CURVES = `
vec3 encoded(vec3 linear) {
	vec3 low = linear * ${SRGB.lowSlope};
	vec3 high = ${SRGB.scale} * pow(linear, vec3(1.0 / ${SRGB.gamma})) - ${SRGB.offset};
	return mix(high, low, step(linear, vec3(${SRGB.knee})));
}
vec3 decoded(vec3 screens) {
	vec3 low = screens / ${SRGB.lowSlope};
	vec3 high = pow((screens + ${SRGB.offset}) / ${SRGB.scale}, vec3(${SRGB.gamma}));
	return mix(high, low, step(screens, vec3(${SRGB.knee} * ${SRGB.lowSlope})));
}
vec4 inTheScreensColours(vec4 drawn) {
	vec4 read = any(isnan(drawn)) ? vec4(0.0) : drawn;
	float clearness = clamp(read.a, 0.0, 1.0);
	vec3 light = clamp(read.rgb, 0.0, ${LARGEST_HALF_FLOAT});
	vec3 own = clearness > 0.0 ? light / clearness : vec3(0.0);
	return vec4(encoded(own) * clearness, clearness);
}
vec4 inLinearLight(vec4 screens) {
	return screens.a > 0.0 ? vec4(decoded(screens.rgb / screens.a) * screens.a, screens.a) : vec4(0.0);
}`;

/**
 * How far a point stands outside a box with round corners, all as round, both about the box's middle: Inigo Quilez's
 * distance to a rounded box, below none inside it. The page's surface cuts the screen and the pits' mouths by it, the
 * window's spreads find the slab by it, and a piece's shadow fades out past its outline by it.
 */
export const PAST_A_ROUNDED_BOX = `
float pastARoundedBox(vec2 fromTheMiddle, vec2 halfSize, float corner) {
	vec2 fromTheCorner = abs(fromTheMiddle) - halfSize + corner;
	return length(max(fromTheCorner, 0.0)) + min(max(fromTheCorner.x, fromTheCorner.y), 0.0) - corner;
}`;

/**
 * The depth a layer keeps where nothing was drawn, the farthest it holds, as the lens and the window's spreads read it.
 */
export const NOTHING_DRAWN = 1;

// three draws nothing without a camera; a pass places its own points, so one camera serves every pass
const PASSES_SEEN_BY = new Camera();

/**
 * A pass over the whole of the layer it draws into, by its values and its fragment shader, laid as named, wherever its
 * points fall: its shader places them, not three's camera.
 * @param {Record<string, { value: unknown }>} uniforms @param {string} fragmentShader
 * @param {typeof WRITTEN | typeof WRITTEN_INTO_SEVERAL | typeof LAID_OVER | typeof ADDED | typeof DEPTH_WRITTEN} laid
 */
export function passOver(uniforms, fragmentShader, laid) {
	const material = new ShaderMaterial({ uniforms, vertexShader: OVER_THE_WHOLE_VERTEX, fragmentShader, ...laid });
	const pass = new Mesh(new PlaneGeometry(WEBGL_SPAN, WEBGL_SPAN), material);
	pass.frustumCulled = false;
	pass.matrixAutoUpdate = false;
	return pass;
}

/**
 * A pass drawn into a target.
 * @param {WebGLRenderer} renderer @param {Mesh<PlaneGeometry, ShaderMaterial>} pass @param {WebGLRenderTarget} target
 */
export function drawnInto(renderer, pass, target) {
	renderer.setRenderTarget(target);
	renderer.render(pass, PASSES_SEEN_BY);
}

/**
 * A material compiled for as many of something as a count its shader sizes a list by, under a name it reads: GLSL sizes
 * a list by a count it is compiled with, so three compiles it anew, only as that count changes, set before the
 * material is first drawn.
 * @param {ShaderMaterial} material @param {string} name @param {number} count
 */
export function compiledForCount(material, name, count) {
	if (material.defines[name] === count) return;
	material.defines = { ...material.defines, [name]: count };
	material.needsUpdate = true;
}

/** A box of the frame as a shader takes it: its left, top, width and height. @param {Box} box */
export function valuesOfTheBox(box) {
	return new Vector4(box.left, box.top, box.width, box.height);
}

/**
 * A material's values set, and sent to the card as it is next drawn: three sends a material's values only as it takes
 * up the material, not when it draws it again.
 * @param {ShaderMaterial} material @param {Readonly<Record<string, unknown>>} values
 */
export function valuesSet(material, values) {
	for (const [name, value] of Object.entries(values)) {
		const uniform = material.uniforms[name];
		if (uniform === undefined) throw new Error(`the room's material has no value named ${name}`);
		uniform.value = value;
	}
	material.uniformsNeedUpdate = true;
}
