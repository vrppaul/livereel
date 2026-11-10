/**
 * The film's look, a prop like any other: the ground the screen stands on and the titles and ending come up on, its
 * glow and the layers a film lays over them in CSS, the ink of the words livereel writes over the frame, their fonts,
 * sizes and weights and how they come up, where a title and a caption's ground stand, the accent of the marks, the
 * corners, edge and shadow of what stands on the ground as a pane — the page's window and its screen, the code's pane
 * and the agent's terminal alike — the body of the page's window in a room, the colours of the code by kind, the
 * cursor, and the agent's terminal and the ending card, their colours and sizes. How the world looks, its light and
 * the glow round it, is a prop of its own (`src/props/world.ts`). A film opens on livereel's look with its theme's
 * values, and changes it by moves as it goes: in a play, a colour, a size or a shadow moves through the values between,
 * a font, which has none between, changes half-way, and the ground's layers fade into new ones; in a cut, at once. The
 * stage is handed the whole look every frame and sets each value in place of its token (`stage/tokens.css`), the
 * ground's layers part by part; the window's body it is handed with the window (`DrawnBody` in `src/props/window.ts`).
 *
 * One table, `LOOK_KINDS`, says of each value what a film may write for it, how the look holds it, how it moves
 * (`src/domain/values.ts`) and what CSS reads it as, so a theme is checked by it and a look moved by it, and livereel's
 * own values stand in `LIVEREELS_LOOK`: a value of the look is its line in the type, in the two tables and in the
 * stage's (`LOOK_TOKENS` in `stage/stage.js`; the ground's layers apart in `LAYERS_SET_AS`, the window's body in the
 * room), and the compiler refuses one left out of any.
 */
import { colourToward, opaqueColourToward } from '../domain/colour.ts';
import { type Fraction, WHOLE, fractionOf } from '../domain/fraction.ts';
import {
	A_COLOUR,
	AN_OPAQUE_COLOUR,
	A_FONT_FAMILY,
	A_GROUND_LAYERS,
	A_LINE_HEIGHT,
	A_PIXELS,
	A_SHARE,
	A_SIZE,
	type Kind,
	Plain
} from '../domain/handed.ts';
import { amountToward, between, halfWay, namesOf, shareToward, type Toward } from '../domain/toward.ts';
import { ValueKind, asWritten } from '../domain/values.ts';
import { A_WORDS_WAY, type WordsWay } from './words.ts';

export interface Look {
	/** The ground's colour, in hex, as it stands at its edges. */
	readonly ground: string;
	/** The colour the ground lightens to where its glow stands, in hex: the ground's own, for a ground of one colour. */
	readonly glow: string;
	/**
	 * Layers laid over the ground and its glow, as a film writes them in CSS (`GroundLayers`): a grid of dots, lines,
	 * a gradient; `none`, none.
	 */
	readonly groundLayers: GroundLayers;
	/** The colour of the words of titles, captions, notes and the ending, in hex. */
	readonly ink: string;
	/** The colour of what stands back: a pin's label a later one quietened, the ending's line, in hex. */
	readonly quietInk: string;
	/** The colour of pins' marks and a note's line, and of a pin's number on its mark, in hex. */
	readonly accent: string;
	readonly accentInk: string;
	/** The font of titles, captions and the ending, as CSS names a family; where the system has none, livereel's. */
	readonly font: string;
	/** The font of the terminal, the code and the ending's command, as CSS names a family. */
	readonly mono: string;
	/** How large a title's letters are, and a caption's, in pixels of a frame 1080 on its shorter side. */
	readonly titleSize: number;
	readonly captionSize: number;
	/**
	 * How far in from the frame's sides a title over the whole frame stands, and how far up from the frame's foot, or
	 * down from its top, the ground under a caption darkens, in pixels of a frame 1080 on its shorter side.
	 */
	readonly titleMargin: number;
	readonly captionGroundHeight: number;
	/**
	 * How round the corners of a pane are — the page's window, the code's pane, the agent's terminal — in pixels of a
	 * frame 1080 on its shorter side: 0, square.
	 */
	readonly paneCorner: number;
	/** The colour of the faint edge round a pane, in hex, its own alpha how faint. */
	readonly paneEdge: string;
	/** How strong a pane's shadow is, from 0, none, to 1, livereel's; its colour, in hex. */
	readonly paneShadow: number;
	readonly paneShadowColour: string;
	/**
	 * The body of the page's window in a room, a slab of metal round the page (`DrawnBody` in `src/props/window.ts`):
	 * how thick it is, 0 none, and how far its rim reaches past the page all round, each in pixels of a frame 1080 on
	 * its shorter side; the metal's colour, in hex with no alpha, and how rough it is, from 0, a mirror, to 1, matte;
	 * and how much of the world's light the glass over the page reflects, from 0, none, to 1, a whole coat of it.
	 */
	readonly windowThickness: number;
	readonly windowRim: number;
	readonly windowMetal: string;
	readonly windowRoughness: number;
	readonly windowGlass: number;
	/**
	 * The colour of the terminal, of the code's pane, of the ending's command and of a key's cap, and of what is written
	 * on them, in hex.
	 */
	readonly terminal: string;
	readonly terminalInk: string;
	/**
	 * The colours of the code's pieces by kind, in hex: a comment, a string, a number, a word the language keeps, a
	 * function called, and a key of an object; livereel's are an editor's on a dark pane.
	 */
	readonly codeComment: string;
	readonly codeString: string;
	readonly codeNumber: string;
	readonly codeKeyword: string;
	readonly codeCall: string;
	readonly codeKey: string;
	/** Where the ground's glow stands, across and down the frame, each from 0 to 1. */
	readonly glowX: number;
	readonly glowY: number;
	/** How heavy a title's letters are, and a caption's, from 100, thinnest, to 900, as CSS weighs a font. */
	readonly titleWeight: number;
	readonly captionWeight: number;
	/**
	 * How large a note's, a callout's, a pin's and a key's letters are, the code's at most, the terminal's, and the
	 * ending's name's, line's and command's, in pixels of a frame 1080 on its shorter side.
	 */
	readonly noteSize: number;
	readonly calloutSize: number;
	readonly pinSize: number;
	readonly keysSize: number;
	readonly codeSize: number;
	readonly terminalSize: number;
	readonly endingNameSize: number;
	readonly endingLineSize: number;
	readonly endingCommandSize: number;
	/** How tall a line of code stands, in times its letters' size: the step its lines scroll by. */
	readonly codeLineHeight: number;
	/** The cursor's colour and the colour of its edge, in hex. */
	readonly cursorFill: string;
	readonly cursorEdge: string;
	/**
	 * How words come up where a film names no way of their own (`src/props/words.ts`): a title's, a caption's, a
	 * callout's and a note's, each read as it comes.
	 */
	readonly words: WordsWay;
}

/**
 * The ground's layers as they stand: those going and those coming, each as CSS's `background` writes them, the first
 * layer over the rest, the last alone with a colour of its own, over the ground's, and their lengths in pixels of a
 * frame 1080 on its shorter side; and how far the coming have come in over the going. Layers a film writes stand
 * whole: both alike, come.
 */
export interface GroundLayers {
	readonly going: string;
	readonly coming: string;
	readonly come: Fraction;
}

/** A value of the look as a film writes it: the ground's layers as CSS writes them, any other as the look holds it. */
type Written<Held> = Held extends GroundLayers ? string : Held;

/** The look's values as a film writes them, every one. */
type LookWritten = { readonly [Name in keyof Look]: Written<Look[Name]> };

/** A film's theme: any values of a look, as a film writes them, the rest as they stand. */
export type Theme = Partial<LookWritten>;

/** What CSS reads a value of the look a film writes in it as: a list of font families, or layers over the ground. */
export type CssKind = 'font family' | 'ground layers';

/**
 * A kind of the look's values, as of any table's, and what CSS reads one as, where a film writes it in CSS, which only
 * a browser checks; none, where it is checked here.
 */
class LookKind<Value, Held> extends ValueKind<Value, Held> {
	readonly css: CssKind | null;

	constructor(accepted: Kind<Value>, held: (written: Value) => Held, toward: Toward<Held>, css: CssKind | null) {
		super(accepted, held, toward);
		this.css = css;
	}
}

const THINNEST = 100;
const HEAVIEST = 900;
const A_WEIGHT = new Plain(isWeight, 'a weight from 100 to 900');
// A value checked here, never written in CSS a browser must read
const CHECKED_HERE = null;
// The kinds of the look's values: a colour mixed on its way, one three reads mixed with no alpha, as it reads none, a
// number through the numbers between, pixels never below none and a share between none and whole on a curve that
// passes its ends, a font or a way of words, which have none between, changed half-way, each held as written; and the
// ground's layers, held whole as written and faded into new ones, those going under those coming. A font and the
// ground's layers are the film's CSS
const COLOUR = new LookKind(A_COLOUR, asWritten, colourToward, CHECKED_HERE);
const OPAQUE_COLOUR = new LookKind(AN_OPAQUE_COLOUR, asWritten, opaqueColourToward, CHECKED_HERE);
const SIZE = new LookKind(A_SIZE, asWritten, between, CHECKED_HERE);
const LINE_HEIGHT = new LookKind(A_LINE_HEIGHT, asWritten, between, CHECKED_HERE);
const PIXELS = new LookKind(A_PIXELS, asWritten, amountToward, CHECKED_HERE);
const SHARE = new LookKind(A_SHARE, asWritten, shareToward, CHECKED_HERE);
const WEIGHT = new LookKind(A_WEIGHT, asWritten, between, CHECKED_HERE);
const FAMILY = new LookKind(A_FONT_FAMILY, asWritten, halfWay, 'font family');
const LAYERS = new LookKind(A_GROUND_LAYERS, standingWhole, fadingInto, 'ground layers');
const WAY_OF_WORDS = new LookKind(A_WORDS_WAY, asWritten, halfWay, CHECKED_HERE);
// CSS's word for no layers at all
const NO_LAYERS = 'none';

/**
 * The kind of each value of the look, by its name: what a theme a film writes is checked by, value by value, how the
 * look holds it and how it moves, and which a browser reads as CSS before the film is shot.
 */
export const LOOK_KINDS: { readonly [Name in keyof Look]: LookKind<LookWritten[Name], Look[Name]> } = {
	ground: COLOUR,
	glow: COLOUR,
	groundLayers: LAYERS,
	ink: COLOUR,
	quietInk: COLOUR,
	accent: COLOUR,
	accentInk: COLOUR,
	font: FAMILY,
	mono: FAMILY,
	titleSize: SIZE,
	captionSize: SIZE,
	titleMargin: PIXELS,
	captionGroundHeight: PIXELS,
	paneCorner: PIXELS,
	paneEdge: COLOUR,
	paneShadow: SHARE,
	paneShadowColour: COLOUR,
	windowThickness: PIXELS,
	windowRim: PIXELS,
	windowMetal: OPAQUE_COLOUR,
	windowRoughness: SHARE,
	windowGlass: SHARE,
	terminal: COLOUR,
	terminalInk: COLOUR,
	codeComment: COLOUR,
	codeString: COLOUR,
	codeNumber: COLOUR,
	codeKeyword: COLOUR,
	codeCall: COLOUR,
	codeKey: COLOUR,
	glowX: SHARE,
	glowY: SHARE,
	titleWeight: WEIGHT,
	captionWeight: WEIGHT,
	noteSize: SIZE,
	calloutSize: SIZE,
	pinSize: SIZE,
	keysSize: SIZE,
	codeSize: SIZE,
	terminalSize: SIZE,
	endingNameSize: SIZE,
	endingLineSize: SIZE,
	endingCommandSize: SIZE,
	codeLineHeight: LINE_HEIGHT,
	cursorFill: COLOUR,
	cursorEdge: COLOUR,
	words: WAY_OF_WORDS
};

/** livereel's own look: a dark ground lit toward its top middle, light words, an amber accent. */
export const LIVEREELS_LOOK: Look = {
	ground: '#0b0e14',
	glow: '#182033',
	groundLayers: standingWhole(NO_LAYERS),
	ink: '#f4f6fa',
	quietInk: '#8b95a7',
	accent: '#ffb224',
	accentInk: '#10141b',
	font: 'ui-sans-serif',
	mono: 'ui-monospace',
	titleSize: 92,
	captionSize: 56,
	titleMargin: 160,
	captionGroundHeight: 380,
	paneCorner: 24,
	paneEdge: '#ffffff1a',
	paneShadow: 1,
	paneShadowColour: '#000',
	windowThickness: 0,
	windowRim: 6,
	windowMetal: '#454b56',
	windowRoughness: 0.45,
	windowGlass: 0.4,
	terminal: '#10141c',
	terminalInk: '#f4f6fa',
	codeComment: '#8b949e',
	codeString: '#a5d6ff',
	codeNumber: '#79c0ff',
	codeKeyword: '#ff7b72',
	codeCall: '#d2a8ff',
	codeKey: '#7ee787',
	glowX: 0.5,
	glowY: 0.3,
	titleWeight: 700,
	captionWeight: 650,
	noteSize: 44,
	calloutSize: 20,
	pinSize: 26,
	keysSize: 44,
	codeSize: 26,
	terminalSize: 25,
	endingNameSize: 96,
	endingLineSize: 36,
	endingCommandSize: 38,
	codeLineHeight: 1.6,
	cursorFill: '#111',
	cursorEdge: '#fff',
	words: 'rise'
};

/** The names of the look's values, in the order a refusal says them. */
export const LOOK_NAMES = namesOf(LOOK_KINDS);

/** The ground's layers a film writes, standing whole: those going and those coming alike, come in. */
function standingWhole(layers: string): GroundLayers {
	return { going: layers, coming: layers, come: WHOLE };
}

/**
 * The ground's layers `progress` of the way from those standing to others: those standing going under, those to come
 * coming in over them as far.
 */
function fadingInto(start: GroundLayers, end: GroundLayers, progress: number): GroundLayers {
	return { going: start.coming, coming: end.coming, come: fractionOf(progress) };
}

function isWeight(written: unknown): written is number {
	return typeof written === 'number' && written >= THINNEST && written <= HEAVIEST;
}
