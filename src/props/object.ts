/**
 * An object on the frame: something that stands in a box, leans, comes up and goes, and shows what it holds, its
 * content — a title's words, a pane of code, an agent's terminal, the ending card, a caption or the keys of a shortcut.
 * Where it stands, how it leans and how far it has come and gone are the object's, alike for every content, so a move
 * that carries, leans or slides one is written once (`src/moves/object.ts`); what it shows, how that comes up in its
 * box and what lights in it are its content's. Each of where it stands, how it leans and what it shows is set by its
 * own moves, so moves of one object that set different values share a step.
 *
 * What an object shows sets the layer it is drawn on: a caption stands over every other object, as words said over a
 * film do, and keys over the caption's ground; within a layer the one that came last stands over the rest.
 */
import { type Angle, isFaceOn } from '../domain/camera.ts';
import type { Box } from '../domain/geometry.ts';
import { type Kind, Plain } from '../domain/handed.ts';
import { type Caption, type DrawnCaption, drawnCaption } from './caption.ts';
import { type Code, type DrawnCode, drawnCode } from './code.ts';
import { type DrawnEnding, type Ending, drawnEnding } from './ending.ts';
import { type CaptionStanding, type DrawnKeys, type Keys, drawnKeys } from './keys.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './terminal.ts';
import { type DrawnTitleWords, type TitleWords, drawnTitleWords } from './title.ts';

/** The name an object is known by: one a film gives, or its kind's own. */
export type ObjectName = string;

/** The name a film gives an object: any with something in it. */
export const AN_OBJECT_NAME: Kind<ObjectName> = new Plain(isSomeName, 'a name, a string with something in it');

/** What an object shows. */
export type Content = TitleWords | Code | Terminal | Ending | Caption | Keys;

/** What an object shows, as the stage draws it. */
export type DrawnContent = DrawnTitleWords | DrawnCode | DrawnTerminal | DrawnEnding | DrawnCaption | DrawnKeys;

/**
 * An object: its box in the frame's pixels, how it leans, how far it has come up and how far it has gone, each from 0
 * to 1, and what it shows.
 */
export interface FrameObject {
	readonly box: Box;
	readonly angle: Angle;
	readonly shown: number;
	readonly gone: number;
	readonly content: Content;
}

/** Objects by name, in the order they first came. */
export type Objects = ReadonlyMap<ObjectName, FrameObject>;

/**
 * An object as the stage draws it: the name it is known by, its box, how it leans — none face-on, which the stage draws
 * with no transform at all — the layer it is drawn on, the higher over the lower, and its content as drawn.
 */
export interface DrawnObject {
	readonly name: ObjectName;
	readonly box: Box;
	readonly angle: Angle | null;
	readonly layer: number;
	readonly content: DrawnContent;
}

// The layer an object is drawn on by what it shows: a caption over every other, keys over the caption's ground
const LAYER_OF: { readonly [Kind in Content['kind']]: number } = {
	words: 0,
	code: 0,
	terminal: 0,
	ending: 0,
	caption: 1,
	keys: 2
};

/** An object as the stage draws it at a moment of the film, among the objects standing on the frame. */
export function drawnObject(name: ObjectName, object: FrameObject, moment: number, standing: Objects): DrawnObject {
	const angle = isFaceOn(object.angle) ? null : object.angle;
	const layer = LAYER_OF[object.content.kind];
	return { name, box: object.box, angle, layer, content: drawnContent(object, moment, standing) };
}

/**
 * What an object shows, drawn as far as the object has come up and gone, at a moment of the film, among the objects
 * standing on the frame.
 */
function drawnContent(object: FrameObject, moment: number, standing: Objects): DrawnContent {
	const content = object.content;
	switch (content.kind) {
		case 'words':
			return drawnTitleWords(content, object.shown, object.gone);
		case 'code':
			return drawnCode(content, object.shown, object.gone);
		case 'terminal':
			return drawnTerminal(content, moment, standingShare(object));
		case 'ending':
			return drawnEnding(content, standingShare(object));
		case 'caption':
			return drawnCaption(content, object.shown, object.gone);
		case 'keys':
			return drawnKeys(content, standingShare(object), captionAmong(standing));
	}
}

/** How much of an object stands, for what shows it whole as one, fading: as far as it has come up and not yet gone. */
function standingShare(object: FrameObject): number {
	return object.shown * (1 - object.gone);
}

/** The caption among the objects standing on the frame, as keys find it, its moves letting one alone stand; or none. */
function captionAmong(standing: Objects): CaptionStanding | null {
	for (const object of standing.values()) {
		if (object.content.kind === 'caption') return { caption: object.content, shown: object.shown, gone: object.gone };
	}
	return null;
}

function isSomeName(written: unknown): written is ObjectName {
	return typeof written === 'string' && written !== '';
}
