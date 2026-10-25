/**
 * The skill names everything a film can call, and nothing a film cannot: every function livereel exports and every
 * move of every prop, and no move that is not there.
 *
 * An agent writes a film from the skill alone, so a function the skill leaves out is one no agent uses, a move added
 * to the package without a line in the skill is half done, and a move the skill names that the package lacks is a
 * film that will not run. A name counts as named where it stands in the skill's code, inline or in a block.
 *
 * Run in the repository's root, as pre-commit runs it: `node -C source scripts/check-skill.ts`. It prints each name
 * the skill leaves out and each it names that is not there, a line each, and exits 1; it prints nothing and exits 0
 * when the skill and the package agree.
 */
import { readFileSync } from 'node:fs';
import * as livereel from 'livereel';

const SKILL = 'skills/reel/SKILL.md';
const DISAGREE = 1;
// What the skill writes as code: a fenced block, or a span between backticks, which may run on to the next line
const CODE = /```[\s\S]*?```|`[^`]+`/g;
const SPECIAL = /[.*+?^${}()|[\]\\]/g;

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
	return new RegExp(`\\b${name.replace(SPECIAL, '\\$&')}\\b`).test(code);
}

/** Every move the skill's code names by its prop, as `light.on`; a member of something else, `context.page.x`, aside. */
function movesNamedIn(code: string, props: readonly string[]): string[] {
	const named = new RegExp(`(?<![\\w.])(?:${props.join('|')})\\.[A-Za-z]+`, 'g');
	return [...new Set(code.match(named))];
}

const code = (readFileSync(SKILL, 'utf8').match(CODE) ?? []).join('\n');
const exported = callable(livereel);
const leftOut = exported.filter((name) => !isNamedIn(code, name));
const notThere = movesNamedIn(code, propsOf(livereel)).filter((name) => !exported.includes(name));
for (const name of leftOut) process.stdout.write(`${SKILL} does not name ${name}\n`);
for (const name of notThere) process.stdout.write(`${SKILL} names ${name}, which livereel does not have\n`);
if (leftOut.length > 0 || notThere.length > 0) process.exitCode = DISAGREE;
