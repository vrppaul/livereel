/**
 * The documents a film is written from name everything a film can call, and nothing a film cannot: every function
 * livereel exports and every move of every prop, and no move that is not there.
 *
 * An agent writes a film from the skill, and a person from the README, so a function either leaves out is one its
 * reader never uses, a move added to the package without a line in both is half done, and a move either names that
 * the package lacks is a film that will not run. A name counts as named where it stands in a document's code, inline
 * or in a block.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-film-documents.ts`. It prints
 * each name a document leaves out and each it names that is not there, a line each, and exits 1; it prints nothing
 * and exits 0 when the documents and the package agree.
 */
import { readFileSync } from 'node:fs';
import * as livereel from 'livereel';
import { reported } from './disagreements.ts';

const DOCUMENTS = ['skills/reel/SKILL.md', 'README.md'];
// What a document writes as code: a fenced block, or a span between backticks, which may run on to the next line
const CODE = /```[\s\S]*?```|`[^`]+`/g;
const SPECIAL = /[.*+?^${}()|[\]\\]/g;
// A name stands alone where no word or member access runs into it: `sound.play` names no step `play`
const STANDS_ALONE = '(?<![\\w.])';

/** Every function a film can call: those exported, and those of each prop's moves, by its prop's name. */
function callable(exported: object): string[] {
	return Object.entries(exported).flatMap(([name, value]: [string, unknown]) => namesIn(name, value));
}

function namesIn(name: string, value: unknown): string[] {
	if (typeof value === 'function') return [name];
	if (typeof value !== 'object' || value === null) return [];
	return Object.entries(value)
		.filter(([, member]: [string, unknown]) => typeof member === 'function')
		.map(([member]) => `${name}.${member}`);
}

/** The props whose moves livereel exports under the prop's name: `camera`, `light`, the `page`. */
function propsOf(exported: object): string[] {
	return Object.entries(exported)
		.filter(([, value]: [string, unknown]) => typeof value === 'object' && value !== null)
		.map(([name]) => name);
}

function isNamedIn(code: string, name: string): boolean {
	return new RegExp(`${STANDS_ALONE}${name.replace(SPECIAL, '\\$&')}\\b`).test(code);
}

/** Every move a document's code names by its prop, as `light.on`; a member of something else, `context.page.x`, aside. */
function movesNamedIn(code: string, props: readonly string[]): string[] {
	const named = new RegExp(`${STANDS_ALONE}(?:${props.join('|')})\\.[A-Za-z]+`, 'g');
	return [...new Set(code.match(named))];
}

/** Where a document and the package disagree, a line each: a name it leaves out, a move it names that is not there. */
function disagreementsOf(document: string, exported: readonly string[], props: readonly string[]): string[] {
	const code = (readFileSync(document, 'utf8').match(CODE) ?? []).join('\n');
	const leftOut = exported.filter((name) => !isNamedIn(code, name));
	const notThere = movesNamedIn(code, props).filter((name) => !exported.includes(name));
	return [
		...leftOut.map((name) => `${document} does not name ${name}`),
		...notThere.map((name) => `${document} names ${name}, which livereel does not have`)
	];
}

const exported = callable(livereel);
const props = propsOf(livereel);
reported(DOCUMENTS.flatMap((document) => disagreementsOf(document, exported, props)));
