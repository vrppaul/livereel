/**
 * An object on the frame: something that stands in a box, leans, comes up and goes, and shows what it holds, its
 * content — a title's words, a pane of code, an agent's terminal or the ending card. Where it stands, how it leans and
 * how far it has come and gone are the object's, alike for every content, so a move that carries, leans or slides one
 * is written once (`src/moves/object.ts`); what it shows, how that comes up in its box and what lights in it are its
 * content's. Each of where it stands, how it leans and what it shows is set by its own moves, so moves of one object
 * that set different values share a step.
 */
import { type Angle, isFaceOn } from '../domain/camera.ts';
import type { Box } from '../domain/geometry.ts';
import { type Kind, Plain } from '../domain/handed.ts';
import { type Code, type DrawnCode, drawnCode } from './code.ts';
import { type DrawnEnding, type Ending, drawnEnding } from './ending.ts';
import { type DrawnTerminal, type Terminal, drawnTerminal } from './terminal.ts';
import { type DrawnTitleWords, type TitleWords, drawnTitleWords } from './title.ts';

/** The name an object is known by: one a film gives, or its kind's own. */
export type ObjectName = string;

/** The name a film gives an object: any with something in it. */
export const AN_OBJECT_NAME: Kind<ObjectName> = new Plain(isSomeName, 'a name, a string with something in it');

/** What an object shows. */
export type Content = TitleWords | Code | Terminal | Ending;

/** What an object shows, as the stage draws it. */
export type DrawnContent = DrawnTitleWords | DrawnCode | DrawnTerminal | DrawnEnding;

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

/**
 * An object as the stage draws it: the name it is known by, its box, how it leans — none face-on, which the stage draws
 * with no transform at all — and its content as drawn.
 */
export interface DrawnObject {
	readonly name: ObjectName;
	readonly box: Box;
	readonly angle: Angle | null;
	readonly content: DrawnContent;
}

/** An object as the stage draws it at a moment of the film. */
export function drawnObject(name: ObjectName, object: FrameObject, moment: number): DrawnObject {
	const angle = isFaceOn(object.angle) ? null : object.angle;
	return { name, box: object.box, angle, content: drawnContent(object, moment) };
}

/** What an object shows, drawn as far as the object has come up and gone, at a moment of the film. */
function drawnContent(object: FrameObject, moment: number): DrawnContent {
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
	}
}

/** How much of an object stands, for what shows it whole as one, fading: as far as it has come up and not yet gone. */
function standingShare(object: FrameObject): number {
	return object.shown * (1 - object.gone);
}

function isSomeName(written: unknown): written is ObjectName {
	return typeof written === 'string' && written !== '';
}
