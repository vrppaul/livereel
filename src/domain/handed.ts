/**
 * What a film hands livereel, read as it may come. A film runs with its types stripped and checked by nobody, so what
 * livereel reads off it is checked as it enters: `defineFilm`, the steps it gives, and every function a film calls
 * check what they are handed against its kind, or an object against its form, the kind of each value by its name. A
 * value of another kind, a list for an object, a name the form has not (`enable` for `enabled`) or a value the form
 * needs left out is refused by where it stands, down to the item or the name at fault, as it was written, so a value
 * meant one way is never read another.
 *
 * A kind lives beside the type it checks (`A_POSE` in the camera's module); only the kinds every part writes are
 * here. A kind checks what makes a value one of its kind — a number is finite, a count whole and 1 or more, a path not
 * empty; a bound beyond that is the film's to choose, and is checked only where livereel has a reason for it, where
 * that reason lives (a step's seconds, the blur's shutter).
 */
import { FilmError } from './errors.ts';

/** What a film hands over as an object, each of its values read as it may come. */
export type Handed = Readonly<Record<string, unknown>>;

/** A kind of value a film writes: whether a value is one, and what is wrong with one that is not, where it stands. */
export interface Kind<Value = unknown> {
	readonly is: (written: unknown) => written is Value;
	readonly faultOf: (written: unknown, place: string) => string | undefined;
}

/** A kind a film must give, never leave out. */
export class Needed<Value = unknown> {
	readonly kind: Kind<Value>;

	constructor(kind: Kind<Value>) {
		this.kind = kind;
	}
}

/**
 * The kind of each value a script names, by its name: the compiler holds a form to every name of its script, each to
 * a kind of its type, and needed where the script must give it.
 */
export type Form<Script> = {
	readonly [Name in keyof Script]-?: Partial<Pick<Script, Name>> extends Pick<Script, Name>
		? Kind<NonNullable<Script[Name]>>
		: Needed<Script[Name]>;
};

/** A kind told by a test of its own, said as one: a number, a function, a selector. */
export class Plain<Value> implements Kind<Value> {
	readonly test: (written: unknown) => written is Value;
	readonly said: string;

	constructor(test: (written: unknown) => written is Value, said: string) {
		this.test = test;
		this.said = said;
	}

	is(written: unknown): written is Value {
		return this.test(written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return this.test(written) ? undefined : refusalOf(written, place, this.said);
	}
}

/** A kind whose values are objects of a form, its names and theirs alone; a fault is named down to the value. */
export class OfForm<Value> implements Kind<Value> {
	readonly form: Form<Value>;
	readonly said: string;

	constructor(form: Form<Value>, said: string) {
		this.form = form;
		this.said = said;
	}

	is(written: unknown): written is Value {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (!isObjectOfValues(written)) return refusalOf(written, place, this.said);
		return formFaultOf(written, this.form, place);
	}
}

/** A kind whose values are lists, every item of one kind; a fault is named down to the item. */
export class ListOf<Value> implements Kind<readonly Value[]> {
	readonly item: Kind<Value>;
	readonly said: string;

	constructor(item: Kind<Value>, said: string) {
		this.item = item;
		this.said = said;
	}

	is(written: unknown): written is readonly Value[] {
		return this.faultOf(written, '') === undefined;
	}

	faultOf(written: unknown, place: string): string | undefined {
		if (!Array.isArray(written)) return refusalOf(written, place, this.said);
		const items: readonly unknown[] = written;
		return items.map((item, index) => this.item.faultOf(item, `${place}[${index}]`)).find(isSaid);
	}
}

/** A kind of one value of a few, by its name: a line's kind, a keyboard, where the stage stands. */
export class OneOf<Name extends string> implements Kind<Name> {
	readonly names: readonly Name[];
	readonly said: string;

	constructor(names: readonly Name[], said: string) {
		this.names = names;
		this.said = said;
	}

	is(written: unknown): written is Name {
		return this.names.some((name) => name === written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return this.is(written) ? undefined : refusalOf(written, place, this.said);
	}
}

/** A kind of one value alone, by its name, said as it is written: a step's `kind`. */
export class Literal<Name extends string> extends OneOf<Name> {
	constructor(name: Name) {
		super([name], JSON.stringify(name));
	}
}

export const A_NUMBER = new Plain(isNumber, 'a number');
/** A number where an endless one means no bound at all, as `zoomAtMost`, or as far as it goes, as a scroll's pixels. */
export const A_NUMBER_OR_ENDLESS = new Plain(isNumberOrEndless, 'a number, or Infinity for no bound');
/** How a refusal says a function, the kind a film's own functions are of. */
export const A_FUNCTION_SAID = 'a function';
export const A_COUNT = new Plain(isCount, 'a whole count, 1 or more');
export const A_STRING = new Plain(isString, 'a string');
export const A_SELECTOR = new Plain(isWords, 'a selector: a string that names blocks of the page');
export const A_PATH = new Plain(isWords, "a file's path, from the film's file");
export const AN_ADDRESS = new Plain(isWords, 'an address, a string');
export const A_FONT_FAMILY = new Plain(isWords, "a font's family, as CSS names one: 'Inter', or 'Inter, sans-serif'");
/** A colour a film gives its words or its ground, in the one form checked here rather than in a browser: hex. */
export const A_COLOUR = new Plain(isHexColour, 'a colour in hex: #rgb, #rgba, #rrggbb or #rrggbbaa');
/** A length a film sizes or spaces something by, in pixels: none at least. */
export const A_PIXELS = new Plain(isPixels, 'a number of pixels, 0 or more');
/** How large letters are, in pixels: more than none, as letters of no size are not there. */
export const A_SIZE = new Plain(isSize, 'a number of pixels, more than 0');
/** A share of something a film gives, from none of it to the whole. */
export const A_SHARE = new Plain(isShare, 'a number from 0 to 1');

// None of a length or of a share, and the whole of a share
const NONE = 0;
const WHOLE = 1;
// A colour in hex, its alpha optional, in short digits or long
const HEX_COLOUR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** A kind a film must give, never leave out. */
export function needed<Value>(kind: Kind<Value>): Needed<Value> {
	return new Needed(kind);
}

/**
 * A kind told by what a value is at its top alone, as a function or an object: what a function does and gives is
 * checked where it is called, what is in an object by its own reader, so the kind stands for the type it is given.
 */
export class Shallow<Value> implements Kind<Value> {
	readonly top: (written: unknown) => boolean;
	readonly said: string;

	constructor(top: (written: unknown) => boolean, said: string) {
		this.top = top;
		this.said = said;
	}

	is(written: unknown): written is Value {
		return this.top(written);
	}

	faultOf(written: unknown, place: string): string | undefined {
		return this.top(written) ? undefined : refusalOf(written, place, this.said);
	}
}

/** A function of the film's own, of the signature it is typed with. */
export function aFunction<Signature extends (...given: never[]) => unknown>(said: string): Shallow<Signature> {
	return new Shallow<Signature>(isCallable, said);
}

/** An object the film hands over, of the type it is typed with. */
export function anObject<Value extends object>(said: string): Shallow<Value> {
	return new Shallow<Value>(isObjectOfValues, said);
}

/** What a film hands over as one value, refused by its place where it is of another kind. */
export function assertKind<Value>(written: unknown, kind: Kind<Value>, place: string): asserts written is Value {
	const fault = kind.faultOf(written, place);
	if (fault !== undefined) throw new FilmError(fault);
}

/**
 * What a film hands over as an object of named values, checked against its form: anything but an object, a name the
 * form has not, a value of another kind, or a value the form needs left out, is refused where it stands.
 */
export function assertWritten<Script>(written: unknown, form: Form<Script>, place: string): asserts written is Script {
	if (!isObjectOfValues(written)) {
		throw new FilmError(`${place} is handed ${described(written)} for an object of ${Object.keys(form).join(', ')}`);
	}
	const fault = formFaultOf(written, form, place);
	if (fault !== undefined) throw new FilmError(fault);
}

/** Whether what a film hands over is an object of named values: not `null`, not a list. */
export function isObjectOfValues(written: unknown): written is Handed {
	return typeof written === 'object' && written !== null && !Array.isArray(written);
}

/** An object a film hands over, refused where it names a value its form has not, by the place it stands at. */
export function refuseNamesBeyond(written: Handed, form: readonly string[], place: string): void {
	const fault = namesBeyondFaultOf(written, form, place);
	if (fault !== undefined) throw new FilmError(fault);
}

/**
 * What a film handed over, as a refusal says it: a string quoted; a BigInt with its `n`; a function, a promise or an
 * object of a class by what it is; a list or an object as its JSON, each function and BigInt in it said so, and one
 * that holds itself by what it is; anything else as JavaScript writes it (`NaN`, `null`, `undefined`).
 */
export function described(written: unknown): string {
	if (typeof written === 'string') return JSON.stringify(written);
	if (typeof written === 'bigint') return `${written}n`;
	if (typeof written === 'function') return A_FUNCTION_SAID;
	if (written instanceof Promise) return A_PROMISE_SAID;
	if (!isObjectOfValues(written) && !Array.isArray(written)) return String(written);
	if (!isPlain(written)) return `${A_CLASS_SAID} ${written.constructor.name}`;
	return isCircular(written, []) ? A_CIRCLE_SAID : JSON.stringify(written, describedWithin);
}

// How a refusal says what JSON cannot write: a function, a promise, an object of a class, and one that holds itself
const A_PROMISE_SAID = 'a promise';
const A_CLASS_SAID = 'an object of the class';
const A_CIRCLE_SAID = 'an object that holds itself';

function refusalOf(written: unknown, place: string, said: string): string {
	return `${place} is ${described(written)}: it is ${said}`;
}

function formFaultOf<Script>(written: Handed, form: Form<Script>, place: string): string | undefined {
	const names = Object.keys(form);
	const beyond = namesBeyondFaultOf(written, names, place);
	if (beyond !== undefined) return beyond;
	return fieldsOf(form)
		.map(([name, field]) => fieldFaultOf(written[name], field, `${place}'s ${name}`))
		.find(isSaid);
}

function namesBeyondFaultOf(written: Handed, form: readonly string[], place: string): string | undefined {
	const beyond = Object.keys(written).filter((name) => !form.includes(name));
	if (beyond.length === 0) return undefined;
	return `${place} names ${beyond.join(', ')}: it names ${form.join(', ')}, or fewer`;
}

/** What is wrong with a value of a form, where it stands: none where it is left out and the form does not need it. */
function fieldFaultOf(written: unknown, field: Kind | Needed, place: string): string | undefined {
	if (field instanceof Needed) return field.kind.faultOf(written, place);
	return written === undefined ? undefined : field.faultOf(written, place);
}

/** A form's kinds, each with its name. */
function fieldsOf<Script>(form: Form<Script>): [string, Kind | Needed][] {
	return Object.entries<Kind | Needed>(form);
}

/** A value JSON writes as a refusal says it: a function and a BigInt by what they are. */
function describedWithin(_name: string, value: unknown): unknown {
	if (typeof value === 'function') return A_FUNCTION_SAID;
	if (typeof value === 'bigint') return `${value}n`;
	return value;
}

/** Whether an object a film hands over holds itself, as JSON cannot write it: met again on its way down. */
function isCircular(written: unknown, above: readonly object[]): boolean {
	if (typeof written !== 'object' || written === null) return false;
	if (above.includes(written)) return true;
	return Object.values(written).some((inner) => isCircular(inner, [...above, written]));
}

/** Whether an object is a plain one or a list, as a film writes it, not one of a class. */
function isPlain(written: object): boolean {
	const prototype: unknown = Object.getPrototypeOf(written);
	return prototype === Object.prototype || prototype === Array.prototype || prototype === null;
}

function isSaid(fault: string | undefined): fault is string {
	return fault !== undefined;
}

/** Whether a value is a number a film places or times something by: finite, as a pose or a moment must be. */
function isNumber(written: unknown): written is number {
	return typeof written === 'number' && Number.isFinite(written);
}

/** Whether a value is a number, or an endless one where it stands for no bound; never `NaN`. */
function isNumberOrEndless(written: unknown): written is number {
	return typeof written === 'number' && !Number.isNaN(written);
}

function isCount(written: unknown): written is number {
	return isNumber(written) && Number.isInteger(written) && written >= 1;
}

function isPixels(written: unknown): written is number {
	return isNumber(written) && written >= NONE;
}

function isSize(written: unknown): written is number {
	return isNumber(written) && written > NONE;
}

function isShare(written: unknown): written is number {
	return isNumber(written) && written >= NONE && written <= WHOLE;
}

function isString(written: unknown): written is string {
	return typeof written === 'string';
}

/** Whether what a film hands over is a string with something in it. */
function isWords(written: unknown): written is string {
	return isString(written) && written.length > 0;
}

function isHexColour(written: unknown): written is string {
	return isString(written) && HEX_COLOUR.test(written);
}

function isCallable(written: unknown): boolean {
	return typeof written === 'function';
}
