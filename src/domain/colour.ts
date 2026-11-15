/**
 * Colours a film writes in hex, mixed on their way from one to another: each channel and the alpha moved as far as the
 * way has gone, so a ground fades from dark to light through the colours between. A colour stands as it was written at
 * either end of its way; between them it is written whole, `#rrggbbaa`, as is a colour read off the page, or, for a
 * colour three reads, which has no alpha, `#rrggbb`.
 */
import { between } from './toward.ts';

/** A colour's red, green, blue and alpha, each from 0 to 255. */
export interface Channels {
	readonly red: number;
	readonly green: number;
	readonly blue: number;
	readonly alpha: number;
}

const HASH = '#';
const HEX = 16;
// Written out long, a channel takes two digits, red first and alpha last; a short form, #rgb or #rgba, writes each
// digit once, and a colour with no alpha is wholly opaque
const DIGITS_OF_A_CHANNEL = 2;
const RED = 0;
const GREEN = 2;
const BLUE = 4;
const ALPHA = 6;
const SHORT_WITH_ALPHA = 4;
const EVERY_DIGIT = /./g;
const THE_DIGIT_TWICE = '$&$&';
const LONG_WITH_ALPHA = 8;
const OPAQUE = 255;
// A channel below 16 is written with a leading zero
const NO_DIGIT = '0';
// How far along a colour's way is: not yet on it, and arrived
const NOT_ON_ITS_WAY = 0;
const ARRIVED = 1;
// Light from none to whole, as a channel holds it in linear light; and sRGB's curve: straight, at this slope, below
// this share of a channel, a power curve above it, offset so far
const NO_LIGHT = 0;
const WHOLE_LIGHT = 1;
const SRGB = { straightBelow: 0.04045, slope: 12.92, offset: 0.055, power: 2.4 };

/** A colour `progress` of the way from one to another. */
export function colourToward(start: string, end: string, progress: number): string {
	if (progress <= NOT_ON_ITS_WAY || start === end) return start;
	if (progress >= ARRIVED) return end;
	return hexOf(channelsToward(start, end, progress));
}

/** A colour with no alpha `progress` of the way from one to another, written with none, as three reads a colour. */
export function opaqueColourToward(start: string, end: string, progress: number): string {
	if (progress <= NOT_ON_ITS_WAY || start === end) return start;
	if (progress >= ARRIVED) return end;
	const channels = channelsToward(start, end, progress);
	return HASH + [channels.red, channels.green, channels.blue].map(twoDigits).join('');
}

/** The channels of a colour `progress` of the way from one to another. */
function channelsToward(start: string, end: string, progress: number): Channels {
	const from = channelsOf(start);
	const to = channelsOf(end);
	return {
		red: between(from.red, to.red, progress),
		green: between(from.green, to.green, progress),
		blue: between(from.blue, to.blue, progress),
		alpha: between(from.alpha, to.alpha, progress)
	};
}

/** A colour's channels, from any form of hex a film writes: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. */
function channelsOf(colour: string): Channels {
	const digits = longDigitsOf(colour);
	return {
		red: channelAt(digits, RED),
		green: channelAt(digits, GREEN),
		blue: channelAt(digits, BLUE),
		alpha: digits.length === LONG_WITH_ALPHA ? channelAt(digits, ALPHA) : OPAQUE
	};
}

/** A colour's digits written out long: a short form's each twice. */
function longDigitsOf(colour: string): string {
	const digits = colour.slice(HASH.length);
	return digits.length > SHORT_WITH_ALPHA ? digits : digits.replaceAll(EVERY_DIGIT, THE_DIGIT_TWICE);
}

function channelAt(digits: string, first: number): number {
	return Number.parseInt(digits.slice(first, first + DIGITS_OF_A_CHANNEL), HEX);
}

/** A colour written whole in hex, `#rrggbbaa`. */
export function hexOf(channels: Channels): string {
	return HASH + [channels.red, channels.green, channels.blue, channels.alpha].map(twoDigits).join('');
}

/** A colour drawn whole, written in hex with no alpha, `#rrggbb`, as three reads one: its alpha left out. */
export function opaqueHexOf(channels: Channels): string {
	return HASH + [channels.red, channels.green, channels.blue].map(twoDigits).join('');
}

/**
 * The colour some colours mix to as light mixes, each weighing the same: their channels in sRGB taken into linear
 * light, averaged there and taken back, drawn whole.
 */
export function meanInLinearLight(colours: readonly Channels[]): Channels {
	return {
		red: meanChannel(colours.map((colour) => colour.red)),
		green: meanChannel(colours.map((colour) => colour.green)),
		blue: meanChannel(colours.map((colour) => colour.blue)),
		alpha: OPAQUE
	};
}

/** Channels in sRGB, from 0 to 255, averaged in linear light and taken back to sRGB. */
function meanChannel(channels: readonly number[]): number {
	const linear = channels.map(linearOf).reduce((sum, channel) => sum + channel, NO_LIGHT) / channels.length;
	return srgbOf(linear);
}

/** A channel in sRGB, from 0 to 255, in linear light, from 0 to 1. */
function linearOf(channel: number): number {
	const share = channel / OPAQUE;
	return share <= SRGB.straightBelow
		? share / SRGB.slope
		: ((share + SRGB.offset) / (WHOLE_LIGHT + SRGB.offset)) ** SRGB.power;
}

/** A channel in linear light, from 0 to 1, in sRGB, from 0 to 255. */
function srgbOf(linear: number): number {
	const share =
		linear <= SRGB.straightBelow / SRGB.slope
			? linear * SRGB.slope
			: (WHOLE_LIGHT + SRGB.offset) * linear ** (WHOLE_LIGHT / SRGB.power) - SRGB.offset;
	return Math.round(share * OPAQUE);
}

function twoDigits(channel: number): string {
	return Math.round(channel).toString(HEX).padStart(DIGITS_OF_A_CHANNEL, NO_DIGIT);
}
